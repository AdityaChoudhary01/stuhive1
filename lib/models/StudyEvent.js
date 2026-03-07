import mongoose from "mongoose";

const StudyEventSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    // SEO Friendly Slug
    slug: {
      type: String,
      unique: true,
      sparse: true,
    },

    examDate: {
      type: Date,
      required: true,
    },

    category: {
      type: String,
      enum: ["University", "School", "Competitive Exams", "General"],
      default: "University",
    },

    // 📚 Study Resources
    resources: [
      {
        resourceId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },

        resourceType: {
          type: String,
          required: true,
          enum: ["Note", "Blog", "Collection"],
        },

        addedAt: {
          type: Date,
          default: Date.now,
        },

        // ✔ Completion checkbox
        isDone: {
          type: Boolean,
          default: false,
        },

        // ⏱ When the resource was completed
        completedAt: {
          type: Date,
        },

        // ⏳ Estimated study time (minutes)
        estimatedTime: {
          type: Number,
          default: 60,
        },
      },
    ],

    // 📊 Progress tracking
    progress: {
      type: Number,
      default: 0,
    },

    // 🌍 Public roadmap
    isPublic: {
      type: Boolean,
      default: false,
    },

    // 🔁 Clone counter
    clones: {
      type: Number,
      default: 0,
    },

    // ✔ Fully completed roadmap
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);


// 🚀 INDEXES
StudyEventSchema.index({ isPublic: 1, createdAt: -1 });
StudyEventSchema.index({ user: 1, createdAt: -1 });


// 🚀 SLUG GENERATION
StudyEventSchema.pre("save", function (next) {
  if (!this.slug && this.title) {
    let baseSlug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.slug = `${baseSlug}-${randomSuffix}`;
  }

  next();
});


// 🚀 AUTO CALCULATE PROGRESS
StudyEventSchema.pre("save", function (next) {
  if (this.resources && this.resources.length > 0) {
    const completed = this.resources.filter((r) => r.isDone).length;
    this.progress = Math.round((completed / this.resources.length) * 100);

    if (this.progress === 100) {
      this.isCompleted = true;
    }
  }

  next();
});


// Singleton Pattern (Important for Next.js)
export default mongoose.models.StudyEvent ||
  mongoose.model("StudyEvent", StudyEventSchema);