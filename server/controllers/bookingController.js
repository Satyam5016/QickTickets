import { inngest } from "../inngest/index.js";
import Booking from "../models/Booking.js";
import Show from "../models/Show.js";
import Stripe from "stripe";

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

const FOOD_MENU = [
  { id: "classic-popcorn", name: "Classic Popcorn", price: 8 },
  { id: "cheese-popcorn", name: "Cheese Popcorn", price: 10 },
  { id: "soft-drink", name: "Soft Drink", price: 5 },
  { id: "nachos", name: "Nachos", price: 7 },
  { id: "combo-for-two", name: "Combo for Two", price: 18 },
  { id: "family-combo", name: "Family Combo", price: 28 },
];

const COUPONS = {
  FIRST50: {
    code: "FIRST50",
    label: "First booking offer",
    discountType: "percent",
    discountValue: 50,
    maxDiscount: 100,
    minOrderAmount: 1,
  },
  WEEKEND20: {
    code: "WEEKEND20",
    label: "Weekend offer",
    discountType: "percent",
    discountValue: 20,
    maxDiscount: 75,
    minOrderAmount: 20,
    weekendOnly: true,
  },
  STUDENT15: {
    code: "STUDENT15",
    label: "Student discount",
    discountType: "percent",
    discountValue: 15,
    maxDiscount: 50,
    minOrderAmount: 15,
  },
};

const getSeatCategory = (seatId) => {
  const row = seatId?.[0]?.toUpperCase();
  if (["A", "B"].includes(row)) return "Regular";
  if (["C", "D"].includes(row)) return "Premium";
  if (["E", "F", "G", "H"].includes(row)) return "Recliner";
  return "VIP";
};

const getSeatCategoryPrices = (showData) => ({
  Regular: Number(showData.seatCategoryPrices?.Regular || showData.showPrice || 0),
  Premium: Number(showData.seatCategoryPrices?.Premium || showData.showPrice || 0),
  Recliner: Number(showData.seatCategoryPrices?.Recliner || showData.showPrice || 0),
  VIP: Number(showData.seatCategoryPrices?.VIP || showData.showPrice || 0),
});

const getValidatedFoodItems = (selectedFoodItems = []) => {
  if (!Array.isArray(selectedFoodItems)) return [];

  return selectedFoodItems
    .map((item) => {
      const menuItem = FOOD_MENU.find((food) => food.id === item.id);
      const quantity = Number(item.quantity);

      if (!menuItem || !Number.isInteger(quantity) || quantity <= 0 || quantity > 10) {
        return null;
      }

      return {
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity,
      };
    })
    .filter(Boolean);
};

const roundMoney = (value) => Math.round(value * 100) / 100;

const calculateCouponDiscount = async ({ code, subtotal, userId, showDateTime }) => {
  const normalizedCode = String(code || "").trim().toUpperCase();
  if (!normalizedCode) {
    return { discountAmount: 0, coupon: null };
  }

  const coupon = COUPONS[normalizedCode];
  if (!coupon) {
    return { error: "Invalid promo code." };
  }

  if (subtotal < coupon.minOrderAmount) {
    return { error: `Minimum order amount for ${coupon.code} is ${coupon.minOrderAmount}.` };
  }

  if (coupon.weekendOnly) {
    const day = new Date(showDateTime).getDay();
    if (![0, 6].includes(day)) {
      return { error: `${coupon.code} is valid only for weekend shows.` };
    }
  }

  if (coupon.code === "FIRST50") {
    const previousPaidBooking = await Booking.exists({ user: userId, isPaid: true });
    if (previousPaidBooking) {
      return { error: "FIRST50 is only valid for your first paid booking." };
    }
  }

  const rawDiscount = coupon.discountType === "percent"
    ? subtotal * (coupon.discountValue / 100)
    : coupon.discountValue;
  const discountAmount = roundMoney(Math.min(rawDiscount, coupon.maxDiscount || rawDiscount, subtotal));

  return {
    discountAmount,
    coupon: {
      code: coupon.code,
      label: coupon.label,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    },
  };
};

/**
 * Utility to check if selected seats are free
 */
const checkSeatsAvailability = async (showId, selectedSeats) => {
  const showData = await Show.findById(showId);
  if (!showData) return false;

  const occupiedSeats = showData.occupiedSeats || {};
  const anyTaken = selectedSeats.some((seat) => occupiedSeats[seat]);
  return !anyTaken;
};

/**
 * Create booking + Stripe checkout session
 */
export const createBooking = async (req, res) => {
  try {
    const { userId } = req.auth(); // Clerk userId
    const { showId, selectedSeats, selectedFoodItems, promoCode } = req.body;
    const origin = req.headers.origin || process.env.FRONTEND_URL;

    if (!userId) {
      return res.json({ success: false, message: "Please login to book tickets." });
    }

    if (!Array.isArray(selectedSeats) || selectedSeats.length === 0) {
      return res.json({ success: false, message: "Please select at least one seat." });
    }

    // 1) Validate seat availability
    const ok = await checkSeatsAvailability(showId, selectedSeats);
    if (!ok) {
      return res.json({
        success: false,
        message: "Selected seats are not available.",
      });
    }

    // 2) Create booking in DB
    const showData = await Show.findById(showId).populate("movie");
    if (!showData) {
      return res.json({ success: false, message: "Show not found." });
    }

    const seatCategoryPrices = getSeatCategoryPrices(showData);
    const bookedSeatDetails = selectedSeats.map((seat) => {
      const category = getSeatCategory(seat);
      return {
        seat,
        category,
        price: seatCategoryPrices[category],
      };
    });
    const foodItems = getValidatedFoodItems(selectedFoodItems);
    const seatsAmount = bookedSeatDetails.reduce((total, seat) => total + seat.price, 0);
    const foodAmount = foodItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const subtotal = seatsAmount + foodAmount;
    const couponResult = await calculateCouponDiscount({
      code: promoCode,
      subtotal,
      userId,
      showDateTime: showData.showDateTime,
    });

    if (couponResult.error) {
      return res.json({ success: false, message: couponResult.error });
    }

    const discountAmount = couponResult.discountAmount;
    const amount = Math.max(0, roundMoney(subtotal - discountAmount));

    const booking = await Booking.create({
      user: userId,
      show: showId,
      amount,
      bookedSeats: selectedSeats,
      bookedSeatDetails,
      foodItems,
      seatsAmount,
      foodAmount,
      discountAmount,
      coupon: couponResult.coupon,
      isPaid: false,
    });

    // 3) Lock seats
    selectedSeats.forEach((seat) => {
      showData.occupiedSeats[seat] = userId;
    });
    showData.markModified("occupiedSeats");
    await showData.save();

    // 4) Create Stripe Checkout session
    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `${showData.movie.title} Tickets${foodItems.length ? " + Food" : ""}` },
            unit_amount: Math.floor(booking.amount * 100), // in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/loading/my-bookings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/my-bookings`,
      payment_intent_data: {
        metadata: { bookingId: booking._id.toString() },
      },
    });

    booking.paymentLink = session.url;
    booking.stripeSessionId = session.id;
    await booking.save();

    // 5) Schedule seat release if unpaid
    await inngest.send({
      name: "app/checkpayment",
      data: { bookingId: booking._id.toString() },
    });

    return res.json({ success: true, url: session.url });
  } catch (error) {
    console.error("Booking error:", error);
    return res.json({ success: false, message: error.message });
  }
};

export const validateCoupon = async (req, res) => {
  try {
    const { userId } = req.auth();
    const { showId, selectedSeats, selectedFoodItems, promoCode } = req.body;

    if (!userId) {
      return res.json({ success: false, message: "Please login to apply a promo code." });
    }

    if (!Array.isArray(selectedSeats) || selectedSeats.length === 0) {
      return res.json({ success: false, message: "Please select seats before applying a promo code." });
    }

    const showData = await Show.findById(showId);
    if (!showData) {
      return res.json({ success: false, message: "Show not found." });
    }

    const seatCategoryPrices = getSeatCategoryPrices(showData);
    const seatsAmount = selectedSeats.reduce((total, seat) => total + seatCategoryPrices[getSeatCategory(seat)], 0);
    const foodItems = getValidatedFoodItems(selectedFoodItems);
    const foodAmount = foodItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const subtotal = seatsAmount + foodAmount;

    const couponResult = await calculateCouponDiscount({
      code: promoCode,
      subtotal,
      userId,
      showDateTime: showData.showDateTime,
    });

    if (couponResult.error) {
      return res.json({ success: false, message: couponResult.error });
    }

    res.json({
      success: true,
      message: `${couponResult.coupon.code} applied.`,
      discountAmount: couponResult.discountAmount,
      coupon: couponResult.coupon,
      totalAfterDiscount: Math.max(0, roundMoney(subtotal - couponResult.discountAmount)),
    });
  } catch (error) {
    console.error("Coupon validation error:", error);
    res.json({ success: false, message: error.message });
  }
};

/**
 * Get occupied seats for a show
 */
export const getOccupiedSeats = async (req, res) => {
  try {
    const { showId } = req.params;
    const showData = await Show.findById(showId);
    if (!showData) {
      return res.json({ success: false, message: "Show not found." });
    }

    const occupiedSeats = Object.keys(showData.occupiedSeats || {});
    res.json({ success: true, occupiedSeats });
  } catch (error) {
    console.error("Get occupied seats error:", error);
    res.json({ success: false, message: error.message });
  }
};
