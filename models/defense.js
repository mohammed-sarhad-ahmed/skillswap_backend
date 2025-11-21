import mongoose from "mongoose";

const defenseSchema = new mongoose.Schema(
  {
    reportId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Report",
      required: true,
      unique: true,
    },
    reportedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    defenseText: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },
    defenseImage: {
      type: String,
      required: false,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

defenseSchema.index({ reportId: 1 });
defenseSchema.index({ reportedUserId: 1 });

export const DefenseModel = mongoose.model("Defense", defenseSchema);
