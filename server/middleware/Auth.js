import { clerkClient } from "@clerk/express";

export const protectAdmin = async (req, res, next) => {
    try {
        const { userId } = req.auth();
        if (!userId) {
            return res.json({ success: false, message: "not authorized" });
        }

        const user = await clerkClient.users.getUser(userId);
        const primaryEmail = user.emailAddresses.find(
            (email) => email.id === user.primaryEmailAddressId
        )?.emailAddress;
        const adminEmails = (process.env.ADMIN_EMAILS || "")
            .split(",")
            .map((email) => email.trim().toLowerCase())
            .filter(Boolean);
        const isAdmin =
            user.privateMetadata?.role === "admin" ||
            adminEmails.includes(primaryEmail?.toLowerCase());

        if (!isAdmin) {
            return res.json({ success: false, message: "not authorized" });
        }

        next();
    } catch (error) {
        return res.json({ success: false, message: "not authorized" });
    }
}
