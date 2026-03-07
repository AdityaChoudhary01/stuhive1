import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: false 
  },
  
  // ✅ R2 Storage Fields
  avatar: {
    type: String,
    default: "" // Full public URL for easy display
  },
  avatarKey: {
    type: String,
    default: "" // Key for R2 management/deletion
  },

  bio: {
    type: String,
    default: "",
    maxLength: [300, "Bio cannot exceed 300 characters"]
  },
  
  university: {
    type: String,
    default: ""
  },
  location: {
    type: String,
    default: ""
  },
  
  // 📚 Bookmarks
  savedNotes: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Note' 
  }],

  // 💰 MARKETPLACE WALLET & ACCESS
  purchasedNotes: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Note' 
  }],
  walletBalance: { 
    type: Number, 
    default: 0 // Seller's earnings (80% cut)
  },
  payoutDetails: {
    upiId: { type: String, default: "" },
    bankName: { type: String, default: "" },
    accountNumber: { type: String, default: "" },
    ifscCode: { type: String, default: "" }
  },

  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  lastSeen: { type: Date, default: Date.now },
  showLastSeen: { type: Boolean, default: true },
  
  // Community Features
  following: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }], 
  followers: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }], 

  // Stats
  noteCount: { 
    type: Number, 
    default: 0 
  },
  blogCount: { 
    type: Number, 
    default: 0 
  },
  hivePoints: {
    type: Number,
    default: 0,
    index: true 
  },

  // 🚀 GAMIFICATION SYSTEM (Updated for Expiration Logic)
  badges: {
    // Standard text badges (e.g., "Top Seller", "Expert")
    list: [{ type: String }],
    
    // Dynamic Streak Badge
    consistentLearner: {
      earnedAt: { type: Date, default: null },
      isActive: { type: Boolean, default: false }
    }
  },

},
 {
   timestamps: true 
});

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare passwords
UserSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false; 
  return await bcrypt.compare(enteredPassword, this.password);
};

// Singleton Pattern (Critical for Next.js)
const User = mongoose.models.User || mongoose.model('User', UserSchema, 'StuHive_users');

export default User;