import mongoose from "mongoose";

const showSchema = new mongoose.Schema(
  {
    movie: { type: String, required: true, ref: 'Movie' },
    city: { type: String, default: "Mumbai" },
    theater: { type: String, default: "QuickTickets Cinema" },
    screen: { type: String, default: "Screen 1" },
    showDateTime: { type: Date, required: true },
    showPrice: { type: Number, required: true },
    seatCategoryPrices: {
      Regular: { type: Number, default: 0 },
      Premium: { type: Number, default: 0 },
      Recliner: { type: Number, default: 0 },
      VIP: { type: Number, default: 0 },
    },
    occupiedSeats: { type: Object, default: {} }
  },
  { minimize: false }
);

const Show = mongoose.model("Show", showSchema);

export default Show;
