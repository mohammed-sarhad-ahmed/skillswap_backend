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
    exchangeType: {
      type: String,
      enum: ["mutual", "one-way"],
      required: true,
    },
    justWantToLearn: {
      type: Boolean,
      default: false,
    },
    userATeaching: {
      skill: {
        type: String,
        trim: true,
        default: "",
      },
    },
    userBTeaching: {
      skill: {
        type: String,
        required: true,
        trim: true,
      },
    },
    userAWeeklyStructure: [
      {
        weekNumber: {
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
        content: [
          {
            id: String,
            type: {
              type: String,
              enum: ["document", "appointment", "assignment"],
              default: "document",
            },
            // Document fields
            title: String,
            fileType: String,
            fileUrl: String,
            uploadDate: String,
            uploadedBy: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
            size: String,
            description: String,
            // Appointment fields
            appointmentId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Appointment",
            },
            // Assignment fields - FIXED: Make assignment optional and remove required validation
            assignment: {
              title: { type: String, trim: true },
              description: { type: String, trim: true },
              dueDate: Date,
              maxPoints: { type: Number, default: 100 },
              instructions: String,
              attachments: [
                {
                  fileName: String,
                  fileUrl: String,
                  fileType: String,
                  uploadedAt: { type: Date, default: Date.now },
                },
              ],
              submissions: [
                {
                  studentId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                  },
                  submittedAt: { type: Date, default: Date.now },
                  files: [
                    {
                      fileName: String,
                      fileUrl: String,
                      fileType: String,
                      size: String,
                    },
                  ],
                  grade: {
                    points: Number,
                    maxPoints: Number,
                    feedback: String,
                    gradedAt: Date,
                    gradedBy: {
                      type: mongoose.Schema.Types.ObjectId,
                      ref: "User",
                    },
                  },
                  status: {
                    type: String,
                    enum: ["submitted", "graded", "late"],
                    default: "submitted",
                  },
                },
              ],
              createdAt: { type: Date, default: Date.now },
              createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            },
            createdAt: {
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
    userBWeeklyStructure: [
      {
        weekNumber: {
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
        content: [
          {
            id: String,
            type: {
              type: String,
              enum: ["document", "appointment", "assignment"],
              default: "document",
            },
            // Document fields
            title: String,
            fileType: String,
            fileUrl: String,
            uploadDate: String,
            uploadedBy: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
            size: String,
            description: String,
            // Appointment fields
            appointmentId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Appointment",
            },
            // Assignment fields - FIXED: Make assignment optional and remove required validation
            assignment: {
              title: { type: String, trim: true },
              description: { type: String, trim: true },
              dueDate: Date,
              maxPoints: { type: Number, default: 100 },
              instructions: String,
              attachments: [
                {
                  fileName: String,
                  fileUrl: String,
                  fileType: String,
                  uploadedAt: { type: Date, default: Date.now },
                },
              ],
              submissions: [
                {
                  studentId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                  },
                  submittedAt: { type: Date, default: Date.now },
                  files: [
                    {
                      fileName: String,
                      fileUrl: String,
                      fileType: String,
                      size: String,
                    },
                  ],
                  grade: {
                    points: Number,
                    maxPoints: Number,
                    feedback: String,
                    gradedAt: Date,
                    gradedBy: {
                      type: mongoose.Schema.Types.ObjectId,
                      ref: "User",
                    },
                  },
                  status: {
                    type: String,
                    enum: ["submitted", "graded", "late"],
                    default: "submitted",
                  },
                },
              ],
              createdAt: { type: Date, default: Date.now },
              createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            },
            createdAt: {
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
      userA: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
      userB: {
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
    startDate: {
      type: Date,
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

// Pre-save middleware to handle exchange type logic and initialize weekly structures
courseSchema.pre("save", function (next) {
  this.exchangeType = this.justWantToLearn ? "one-way" : "mutual";

  if (this.justWantToLearn) {
    this.userATeaching.skill = "";
  }

  // Initialize weekly structures if they don't exist
  if (
    this.isNew &&
    (!this.userAWeeklyStructure || this.userAWeeklyStructure.length === 0)
  ) {
    this.initializeWeeklyStructures();
  }

  next();
});

// Create weekly structures when course is created
courseSchema.methods.initializeWeeklyStructures = function () {
  // Helper function to create empty weekly structure
  const createEmptyWeeklyStructure = (duration, skill = "") => {
    const structure = [];
    for (let i = 1; i <= duration; i++) {
      structure.push({
        weekNumber: i,
        title: skill ? `Week ${i} - ${skill}` : `Week ${i}`,
        description: "No content added yet",
        content: [],
        completed: false,
      });
    }
    return structure;
  };

  // UserA's teaching structure (only if mutual exchange)
  if (!this.justWantToLearn && this.userATeaching.skill) {
    this.userAWeeklyStructure = createEmptyWeeklyStructure(
      this.duration,
      this.userATeaching.skill
    );
  } else if (this.justWantToLearn) {
    this.userAWeeklyStructure = [];
  }

  // UserB's teaching structure (always created)
  this.userBWeeklyStructure = createEmptyWeeklyStructure(
    this.duration,
    this.userBTeaching.skill
  );
};

// Calculate progress based on completed weeks
courseSchema.methods.updateProgress = function () {
  if (this.justWantToLearn) {
    // For one-way: userA (student) progress is based on userB's teaching completion
    const userBCompletedWeeks = this.userBWeeklyStructure.filter(
      (week) => week.completed
    ).length;
    this.progress.userA = Math.round(
      (userBCompletedWeeks / this.duration) * 100
    );
    this.progress.userB = 0; // Teacher doesn't have learning progress in one-way
  } else {
    // For mutual exchange
    // UserA's learning progress = how many of UserB's weeks they completed
    const userACompletedWeeksInUserBStructure =
      this.userBWeeklyStructure.filter((week) => week.completed).length;

    // UserB's learning progress = how many of UserA's weeks they completed
    const userBCompletedWeeksInUserAStructure =
      this.userAWeeklyStructure.filter((week) => week.completed).length;

    this.progress.userA = Math.round(
      (userACompletedWeeksInUserBStructure / this.duration) * 100
    );
    this.progress.userB = Math.round(
      (userBCompletedWeeksInUserAStructure / this.duration) * 100
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
