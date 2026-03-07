import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  note: { type: mongoose.Schema.Types.ObjectId, ref: 'Note', required: true },
  amount: { type: Number, required: true },
  adminFee: { type: Number, required: true }, // 20%
  sellerEarnings: { type: Number, required: true }, // 80%
  razorpayOrderId: { type: String, required: true },
  razorpayPaymentId: { type: String },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' }
}, { timestamps: true });

export default mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);