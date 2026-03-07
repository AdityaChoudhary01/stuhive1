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
  
  // 🚀 SEO-friendly Slug Field
  // FIXED: Removed 'index: true' because 'unique: true' automatically creates an index.
  slug: { type: String, unique: true }, 

  // 🚀 Categorization field for School/Competitive/University
  category: { 
    type: String, 
    enum: ['University', 'School', 'Competitive Exams', 'Other'], 
    default: 'University' 
  },

  // 💰 MARKETPLACE FIELDS
  isPaid: { type: Boolean, default: false },
  price: { type: Number, default: 0, min: 0 },
  previewPages: { type: Number, default: 3 }, // Number of pages to show before buying

  description: { 
    type: String, 
    required: true, 
    trim: true,
    minlength: [20, 'Description must be at least 20 characters long'] 
  },
  
  // Dynamic labels based on the category:
  university: { type: String, required: true, trim: true }, // Acts as: University / Board / Exam Body
  course: { type: String, required: true, trim: true },     // Acts as: Degree / Class / Exam Name
  subject: { type: String, required: true, trim: true },    // Acts as: Subject / Paper
  year: { type: String, required: true },                   // Acts as: Year of Study / Target Year
  
  // ✅ R2 STORAGE FIELDS
  fileName: { type: String, required: true },    
  fileType: { type: String, required: true },    
  fileSize: { type: Number, required: true },    
  fileKey: { type: String, required: true },     
  thumbnailKey: { type: String, default: null }, 
  
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
// Combined Text Index for Search
NoteSchema.index({ title: 'text', description: 'text', subject: 'text', university: 'text' });

// --- MIDDLEWARE (Hooks) ---
NoteSchema.pre('save', function(next) {
  if (this.isModified('title') || !this.slug) {
    let baseSlug = this.title
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
      .replace(/(^-|-$)+/g, '');   // Remove leading/trailing hyphens

    // Ensure slug isn't empty after cleaning (e.g., title was just emojis)
    if (!baseSlug) baseSlug = 'resource';

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    this.slug = `${baseSlug}-${randomSuffix}`;
  }
  next();
});

// Singleton Pattern (Critical for Next.js)
const Note = mongoose.models.Note || mongoose.model('Note', NoteSchema, 'StuHive_notes');

export default Note;