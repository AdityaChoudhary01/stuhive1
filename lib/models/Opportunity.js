import mongoose from "mongoose";

const OpportunitySchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  category: { 
    type: String, 
    enum: ['Latest Jobs', 'Admit Card', 'Result', 'Admission', 'Syllabus', 'Answer Key'], 
    required: true 
  },
  organization: { type: String, required: true },
  advtNo: { type: String }, // e.g., "CEN 04/2025"
  shortDescription: { type: String },

  // --- DYNAMIC TABLE DATA ---
  importantDates: [{ event: String, date: String }],
  applicationFee: [{ category: String, amount: String }],
  feeMode: { type: String }, // e.g., "Debit Card, Credit Card, Net Banking"
  
  ageLimit: {
    minimumAge: String,
    maximumAge: String,
    asOnDate: String, 
    extraDetails: String 
  },
  
  // Advanced Category-wise Vacancies
  vacancyDetails: [{
    postName: String,
    ur: String, ews: String, obc: String, sc: String, st: String,
    totalPost: String,
    eligibility: String
  }],
  
  howToApply: [{ step: String }],
  selectionProcess: [{ step: String }],
  
  importantLinks: [{ label: String, url: String }],
  faqs: [{ question: String, answer: String }],

  isPublished: { type: Boolean, default: false }
}, { timestamps: true });

OpportunitySchema.index({ category: 1, isPublished: 1, createdAt: -1 });

export default mongoose.models.Opportunity || mongoose.model("Opportunity", OpportunitySchema);