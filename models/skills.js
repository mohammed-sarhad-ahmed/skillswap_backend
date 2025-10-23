import mongoose from "mongoose";

const { Schema } = mongoose;

const SkillSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  category: {
    type: String,
    trim: true,
    default: "General", // e.g. "Languages", "Programming", etc.
  },
  level: {
    type: String,
    enum: ["Beginner", "Intermediate", "Advanced", "Expert"],
    required: true,
  },
  experience: {
    type: Number, // years of experience (for teaching)
    min: 0,
    max: 100,
  },
  description: {
    type: String,
    trim: true,
    maxlength: 300,
  },
  certifications: [
    {
      type: String,
      trim: true,
    },
  ],
});

export default mongoose.model("Skill", SkillSchema);
