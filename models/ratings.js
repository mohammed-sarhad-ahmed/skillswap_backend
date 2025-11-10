import mongoose from "mongoose";

const ratingSchema = new mongoose.Schema({
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Appointment",
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  review: {
    type: String,
    maxlength: 500,
    default: "No review provided.",
  },
  // ADD THESE 3 NEW FIELDS:
  reply: {
    type: String,
    maxlength: 500,
  },
  repliedAt: {
    type: Date,
  },
  edited: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to ensure one rating per session per student
ratingSchema.index({ session: 1, student: 1 }, { unique: true });

// Index for efficient querying of teacher ratings
ratingSchema.index({ teacher: 1, createdAt: -1 });

export default mongoose.model("Rating", ratingSchema);
