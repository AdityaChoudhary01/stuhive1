import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  recipient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true,
    index: true 
  },
  actor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User" 
  },
  type: { 
    type: String, 
    required: true, 
    // 🚀 UPDATED: Added 'PURCHASE' to the allowed types
    enum: ['REQUEST_FULFILLED', 'FEATURED', 'MILESTONE', 'SYSTEM', 'PURCHASE'] 
  },
  message: { 
    type: String, 
    required: true 
  },
  link: { 
    type: String 
  },
  isRead: { 
    type: Boolean, 
    default: false 
  },
}, { timestamps: true });

export default mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);