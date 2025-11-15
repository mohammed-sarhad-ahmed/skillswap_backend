import mongoose from "mongoose";
import { type } from "os";

const { Schema, model } = mongoose;

const AppointmentSchema = new Schema(
  {
    title: {
      type: String,
      default: "Course Session",
    },
    description: String,
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
    },
    week: Number,
    teacher: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    student: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    proposedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "ongoing", "completed", "canceled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

export default model("Appointment", AppointmentSchema);
