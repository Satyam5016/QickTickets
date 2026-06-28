import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    movie: { type: String, required: true, ref: "Movie" },
    user: { type: String, required: true, ref: "User" },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 300 },
  },
  { timestamps: true }
);

reviewSchema.index({ movie: 1, user: 1 }, { unique: true });

export default mongoose.model("Review", reviewSchema);
