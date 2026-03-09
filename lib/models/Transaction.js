import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // 🚀 UPDATED: Removed required: true to allow Bundle purchases
  note: { type: mongoose.Schema.Types.ObjectId, ref: 'Note' },
  
  // 🚀 ADDED: Reference to the Collection model for Bundle purchases
  bundle: { type: mongoose.Schema.Types.ObjectId, ref: 'Collection' },

  amount: { type: Number, required: true },
  adminFee: { type: Number, required: true }, // 20%
  sellerEarnings: { type: Number, required: true }, // 80%
  razorpayOrderId: { type: String, required: true },
  razorpayPaymentId: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'failed'], 
    default: 'pending' 
  }
}, { timestamps: true });

export default mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);