import mongoose from 'mongoose';

const UniversitySchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  
  // 🚀 SEO Rich Content (Admin Controlled)
  description: { type: String, default: "" }, // About the university & study materials
  logo: { type: String, default: "" }, // URL for university logo
  coverImage: { type: String, default: "" }, // Hero background image
  location: { type: String, default: "" }, // e.g., "Mumbai, Maharashtra"
  website: { type: String, default: "" }, // Official university URL
  
  // SEO Overrides
  metaTitle: { type: String, default: "" },
  metaDescription: { type: String, default: "" },
  keywords: { type: [String], default: [] },
  
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true 
});

const University = mongoose.models.University || mongoose.model('University', UniversitySchema, 'StuHive_universities');
export default University;