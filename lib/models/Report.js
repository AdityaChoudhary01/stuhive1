import mongoose from 'mongoose';

const ReportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetNote: { type: mongoose.Schema.Types.ObjectId, ref: 'Note' },
  targetBundle: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection' },
  reason: { 
    type: String, 
    enum: ['Empty Content', 'Incorrect Subject', 'Copyright/Plagiarism', 'Poor Quality', 'Spam'], 
    required: true 
  },
  details: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'investigating', 'resolved', 'dismissed'], 
    default: 'pending' 
  }
}, { timestamps: true });

export default mongoose.models.Report || mongoose.model('Report', ReportSchema, 'StuHive_reports');