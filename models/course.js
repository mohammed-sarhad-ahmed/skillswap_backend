import mongoose from "mongoose";

const courseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Course title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    userA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "active", "completed", "rejected", "cancelled"],
      default: "pending",
    },
    duration: {
      type: Number,
      required: true,
      min: 1,
      max: 52,
    },
    // Exchange type based on justWantToLearn
    exchangeType: {
      type: String,
      enum: ["mutual", "one-way"],
      required: true,
    },
    // New field from your controller
    justWantToLearn: {
      type: Boolean,
      default: false,
    },
    // What userA will teach userB
    userATeaching: {
      skill: {
        type: String,
        trim: true,
        default: "",
      },
      level: {
        type: String,
        enum: ["Beginner", "Intermediate", "Advanced", "Expert", ""],
        default: "",
      },
    },
    // What userB will teach userA
    userBTeaching: {
      skill: {
        type: String,
        required: true,
        trim: true,
      },
      level: {
        type: String,
        enum: ["Beginner", "Intermediate", "Advanced", "Expert", ""],
        default: "",
      },
    },
    // Weekly structure for userA's teaching
    userAWeeklyStructure: [
      {
        week: {
          type: Number,
          required: true,
        },
        title: {
          type: String,
          required: true,
          trim: true,
        },
        description: {
          type: String,
          trim: true,
        },
        materials: [
          {
            name: String,
            fileUrl: String,
            uploadedAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
        completed: {
          type: Boolean,
          default: false,
        },
      },
    ],
    // Weekly structure for userB's teaching (only for mutual exchange)
    userBWeeklyStructure: [
      {
        week: {
          type: Number,
          required: true,
        },
        title: {
          type: String,
          required: true,
          trim: true,
        },
        description: {
          type: String,
          trim: true,
        },
        materials: [
          {
            name: String,
            fileUrl: String,
            uploadedAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
        completed: {
          type: Boolean,
          default: false,
        },
      },
    ],
    progress: {
      userAProgress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      userBProgress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      overallProgress: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
    },
    proposedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    proposedAt: {
      type: Date,
      default: Date.now,
    },
    acceptedAt: Date,
    completedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Pre-save middleware to handle exchange type logic
courseSchema.pre("save", function (next) {
  // Set exchangeType based on justWantToLearn
  this.exchangeType = this.justWantToLearn ? "one-way" : "mutual";

  // Clear userA teaching data if it's a one-way exchange
  if (this.justWantToLearn) {
    this.userATeaching.skill = "";
    this.userATeaching.level = "";
  }

  next();
});

// Create weekly structures when course is accepted
courseSchema.methods.initializeWeeklyStructures = function () {
  // UserA's teaching structure (only if mutual exchange)
  if (!this.justWantToLearn && this.userATeaching.skill) {
    this.userAWeeklyStructure = [];
    for (let i = 1; i <= this.duration; i++) {
      this.userAWeeklyStructure.push({
        week: i,
        title: `Week ${i} - ${this.userATeaching.skill}`,
        description: "",
        materials: [],
        completed: false,
      });
    }
  } else if (this.justWantToLearn) {
    // For one-way learning, userA is the learner, so they don't have teaching structure
    this.userAWeeklyStructure = [];
  }

  // UserB's teaching structure (always exists since userB is teaching in both cases)
  this.userBWeeklyStructure = [];
  for (let i = 1; i <= this.duration; i++) {
    this.userBWeeklyStructure.push({
      week: i,
      title: `Week ${i} - ${this.userBTeaching.skill}`,
      description: "",
      materials: [],
      completed: false,
    });
  }
};

// Calculate progress based on completed weeks
courseSchema.methods.updateProgress = function () {
  // UserA progress - in one-way exchange, userA is learning from userB
  if (this.justWantToLearn) {
    // For one-way: userA progress is based on userB's teaching completion
    const userBCompletedWeeks = this.userBWeeklyStructure.filter(
      (week) => week.completed
    ).length;
    this.progress.userAProgress = Math.round(
      (userBCompletedWeeks / this.duration) * 100
    );
    this.progress.userBProgress = 0; // userB doesn't learn in one-way
  } else {
    // For mutual exchange: both users teach and learn
    const userACompletedWeeks = this.userAWeeklyStructure.filter(
      (week) => week.completed
    ).length;
    const userBCompletedWeeks = this.userBWeeklyStructure.filter(
      (week) => week.completed
    ).length;

    this.progress.userAProgress = Math.round(
      (userACompletedWeeks / this.duration) * 100
    );
    this.progress.userBProgress = Math.round(
      (userBCompletedWeeks / this.duration) * 100
    );
  }

  // Overall progress
  if (this.justWantToLearn) {
    this.progress.overallProgress = this.progress.userAProgress;
  } else {
    this.progress.overallProgress = Math.round(
      (this.progress.userAProgress + this.progress.userBProgress) / 2
    );
  }
};

// Virtual for user relationship context
courseSchema.virtual("userARelationship").get(function () {
  if (this.justWantToLearn) {
    return "learner";
  } else {
    return this.proposedBy.toString() === this.userA.toString()
      ? "proposer"
      : "recipient";
  }
});

courseSchema.virtual("userBRelationship").get(function () {
  if (this.justWantToLearn) {
    return "teacher";
  } else {
    return this.proposedBy.toString() === this.userB.toString()
      ? "proposer"
      : "recipient";
  }
});

// Index for efficient queries
courseSchema.index({ userA: 1, status: 1 });
courseSchema.index({ userB: 1, status: 1 });
courseSchema.index({ proposedBy: 1 });
courseSchema.index({ "userATeaching.skill": 1 });
courseSchema.index({ "userBTeaching.skill": 1 });

// Ensure virtual fields are included in JSON output
courseSchema.set("toJSON", { virtuals: true });
courseSchema.set("toObject", { virtuals: true });

const Course = mongoose.model("Course", courseSchema);

export default Course;
