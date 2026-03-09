import mongoose from 'mongoose';

const CollectionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true 
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 150
  },
  // 🚀 Categorization field
  category: { 
    type: String, 
    enum: ['University', 'School', 'Competitive Exams', 'Other'], 
    default: 'University',
    index: true
  },
  university: {
    type: String,
    default: "",
    index: true
  },
  slug: {
    type: String,
    unique: true,
    index: true
  },
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'private',
    index: true 
  },
  description: {
    type: String,
    default: "",
    maxlength: 300
  },
  notes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Note'
  }],
  
  // 🚀 PREMIUM BUNDLE PACK FEATURES
  isPremium: { 
    type: Boolean, 
    default: false,
    index: true // Indexed for quick filtering on the marketplace
  },
  price: { 
    type: Number, 
    default: 0 
  },
  purchasedBy: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }],

  // 🛡️ FRAUD PROTECTION & RETENTION
  // If true, the bundle is hidden from the public explore page but remains 
  // accessible in the "Library" of users who already purchased it.
  isArchived: {
    type: Boolean,
    default: false,
    index: true
  }

}, {
  timestamps: true
});

// ✅ Compound index: Ensures user can't have two collections with the same name
CollectionSchema.index({ user: 1, name: 1 });

/**
 * 🚀 AUTO-GENERATE SLUG
 */
CollectionSchema.pre('save', async function (next) {
  if (!this.isModified('name') && this.slug) return next();

  let generatedSlug = this.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') 
    .replace(/(^-|-$)+/g, '');   

  // Ensure slug isn't empty (e.g. if name was only special characters)
  if (!generatedSlug) generatedSlug = 'collection';

  const CollectionModel = mongoose.models.Collection || mongoose.model('Collection', CollectionSchema);
  
  // Check for uniqueness
  const existing = await CollectionModel.findOne({ slug: generatedSlug });
  
  if (existing && existing._id.toString() !== this._id.toString()) {
    // Append a unique random suffix if slug exists
    generatedSlug = `${generatedSlug}-${Math.random().toString(36).substring(2, 7)}`;
  }

  this.slug = generatedSlug;
  next();
});

const Collection = mongoose.models.Collection || mongoose.model('Collection', CollectionSchema, 'StuHive_collections');

export default Collection;