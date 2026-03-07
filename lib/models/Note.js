import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  // Rating is 0 for replies, 1-5 for actual reviews
  rating: { type: Number, required: false, min: 0, max: 5, default: 0 }, 
  comment: { type: String, required: true },
  parentReviewId: { type: mongoose.Schema.Types.ObjectId, default: null } 
}, {
  timestamps: true
});

const NoteSchema = new mongoose.Schema({
  title: { type: String, required: true },
  
  // 🚀 SEO-friendly Slug Field (Indexed directly here to avoid duplicate warnings)
  slug: { type: String, unique: true, index: true }, 

  // 🚀 NEW: Categorization field for School/Competitive/University
  category: { 
    type: String, 
    enum: ['University', 'School', 'Competitive Exams', 'Other'], 
    default: 'University' 
  },

  description: { 
    type: String, 
    required: true, 
    trim: true,
    minlength: [20, 'Description must be at least 20 characters long'] 
  },
  
  // 🚀 Dynamic labels based on the category:
  university: { type: String, required: true, trim: true }, // Acts as: University / Board / Exam Body
  course: { type: String, required: true, trim: true },     // Acts as: Degree / Class / Exam Name
  subject: { type: String, required: true, trim: true },    // Acts as: Subject / Paper
  year: { type: String, required: true },                   // Acts as: Year of Study / Target Year
  
  // ✅ R2 STORAGE FIELDS
  fileName: { type: String, required: true },    // Original name (e.g. Math_Notes.pdf)
  fileType: { type: String, required: true },    // MIME type
  fileSize: { type: Number, required: true },    // Bytes
  fileKey: { type: String, required: true },     // ✅ Path in R2 (e.g. notes/user_id/timestamp.pdf)
  thumbnailKey: { type: String, default: null },  // ✅ Path in R2 for the WebP preview
  
  // Legacy field
  filePath: { type: String, required: false }, 

  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  uploadDate: { type: Date, default: Date.now },
  reviews: [reviewSchema],
  
  // Stats
  rating: { type: Number, required: true, default: 0 },
  numReviews: { type: Number, required: true, default: 0 },
  downloadCount: { type: Number, required: true, default: 0 },
  viewCount: { type: Number, required: true, default: 0 },
  isFeatured: { type: Boolean, required: true, default: false }
}, {
  timestamps: true 
});

// --- INDEXES ---

// Full-text search index for the Discovery Engine
NoteSchema.index({ title: 'text', description: 'text', subject: 'text', university: 'text' });

// --- MIDDLEWARE (Hooks) ---

// 🚀 Pre-save hook to auto-generate the SEO slug
NoteSchema.pre('save', function(next) {
  // Only generate a new slug if the title was modified OR if the slug doesn't exist yet
  if (this.isModified('title') || !this.slug) {
    // 1. Convert "B.Tech DBMS Notes 2026" to "b-tech-dbms-notes-2026"
    let baseSlug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-') // Replace spaces and special chars with hyphens
      .replace(/(^-|-$)+/g, '');   // Trim hyphens from start and end

    // 2. Add a random 4-digit number to guarantee uniqueness 
    // This prevents index collisions if two users upload "Math Notes"
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.slug = `${baseSlug}-${randomSuffix}`;
  }
  next();
});

const Note = mongoose.models.Note || mongoose.model('Note', NoteSchema, 'StuHive_notes');

export default Note;