import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// ----------------------------
// SUB-SCHEMAS
// ----------------------------
// Line 7 ke baad (SubscriptionSchema se pehle)

const GSTINDetailsSchema = new mongoose.Schema({
  gstin: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    match: [/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, 'Invalid GSTIN format']
  },
  email: { type: String },
  mobile: { type: String },
  directors: [{ type: String }],
  legalName: { type: String, required: false },
  tradeName: { type: String },
  businessType: { type: String },
  address: { type: String },
  gstStatus: { type: String, enum: ['Active', 'Cancelled'], default: 'Active' },
  verifiedAt: { type: Date, default: Date.now }
}, { _id: false });

const AgreementSchema = new mongoose.Schema({
  legalName: { type: String, required: false },
  tradeName: { type: String },
  gstin: { type: String, required: true },
  signature: { type: String },
  ipAddress: { type: String },
  userAgent: { type: String },
  signedAt: { type: Date, default: Date.now },
  agreementText: { type: String },
  termsAccepted: { type: Boolean, default: true }
}, { _id: false });

const SubscriptionSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
  },
  planType: {
    type: String,
    required: true,
    enum: ['monthly', 'yearly', 'promotional'],
  },
  razorpaySubscriptionId: {
    type: String,
    unique: true,
    sparse: true,
  },
  usageLimit: {
    type: Number,
    required: true,
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  purchasedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  serviceKey: {
  type: String,
  required: false,
},

subcategory: {
  type: String,
  required: false,
},

}, { _id: false });

// Line 52 ke baad add karo - SubscriptionSchema ke neeche

const PromotionSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
  },
  multiplier: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
  }
}, { _id: false });

const UsedServiceSchema = new mongoose.Schema({
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
  },
  serviceName: {
    type: String,
    required: true,
  },
  subcategory: {
    type: String,
  },
  usageTimestamps: {
    type: [Date],
    default: [],
  },
  usageCount: {
    type: Number,
    required: true,
    default: 0,
  },
}, { _id: false });

// ----------------------------
// MAIN USER SCHEMA
// ----------------------------
const LimitedServiceUsageSchema = new mongoose.Schema({
  serviceKey: { type: String },
  month: { type: Number },
  count: { type: Number, default: 0 },
  limit: { type: Number, default: 15 }
}, { _id: false });

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a name'],
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please add a valid email',
      ],
    },
    avatar: {
      type: String,
      default: '',
    },
    mobile: {
      type: String,
      unique: true,
      sparse: true,
    },
    gstinDetails: {
      type: GSTINDetailsSchema,
      required: false,
    },
    isBusinessUser: {
      type: Boolean,
      default: false
    },

   gstinConsentGiven: {
    type: Boolean,
    default: false
  },
  gstinConsentGivenAt: {
    type: Date
  },
  agreementSigned: {
    type: Boolean,
    default: false
  },
  agreement: {
    type: AgreementSchema
  },
  isActive: {
    type: Boolean,
    default: false
  },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    isSubscribedToNewsletter: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
      minlength: 6,
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin', 'superadmin','business'],
      default: 'user',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },

    agreementOtpExpires: Date,
    agreementOtp: String,
    // Email Verification
    emailVerificationToken: String,
    emailVerificationExpires: Date,

    // OTPs
    emailOtp: String,
    emailOtpExpires: Date,
    mobileOtp: String,
    mobileOtpExpires: Date,

    // Password Reset
    resetPasswordToken: String,
    resetPasswordExpire: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,

    // API Key Fields
    apiKey: {
      type: String,
      unique: true,
      sparse: true,
    },
    apiKeyCreatedAt: Date,
    apiKeyLastUsed: Date,
    apiEnabled: {
      type: Boolean,
      default: false,
    },
    apiUsageCount: {
      type: Number,
      default: 0,
    },
    apiAccessLimit: { type: Number, default: 5000 }, // Monthly limit
apiKeyHistory: {
  type: [String],
  default: []
},
lastIp: { type: String },
suspiciousActivity: { type: Boolean, default: false },
apiKeySuspended: { type: Boolean, default: false },
totalVerifications: {
  type: Number,
  default: 0
},
usedVerifications: {
  type: Number,
  default: 0
},


    promotedCategories: {
      type: [String],
      default: [],
    },
    promotions: {
    type: [PromotionSchema],
    default: [],
},

    activeSubscriptions: {
      type: [SubscriptionSchema],
      default: [],
    },
   limitedServiceUsage: {
  type: [LimitedServiceUsageSchema],
  default: []
},



    usedServices: [UsedServiceSchema],
  },
  { timestamps: true }
);

// ✅ NEW METHOD: Generate Agreement OTP
UserSchema.methods.getAgreementOtp = function () {
  // OTP generation logic (e.g., 6 digit random number)
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); 
    this.mobileOtp = otp;
  this.agreementOtp = otp;
  this.mobileOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  this.agreementOtpExpires = Date.now() + 5 * 60 * 1000; // 5 min validity

  return otp;
};

// ----------------------------
// MIDDLEWARES
// ----------------------------

// Ensure either email or mobile is provided
UserSchema.pre('save', function (next) {
  if (this.googleId) return next();
  if (!this.email && !this.mobile) {
    return next(new Error('Either email or mobile number is required.'));
  }
  next();
});

// Ensure password is provided for standard email registration
UserSchema.pre('save', function (next) {
  if (this.googleId || this.isModified('password')) return next();
  if (this.email && !this.password && this.isNew) {
    return next(new Error('Password is required for email registration.'));
  }
  next();
});

// Encrypt password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ----------------------------
// METHODS
// ----------------------------

// Match password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate Email OTP
UserSchema.methods.getEmailOtp = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.emailOtp = otp;
  this.emailOtpExpires = Date.now() + 10 * 60 * 1000; // 10 min
  return otp;
};

// Generate Mobile OTP
UserSchema.methods.getMobileOtp = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.mobileOtp = otp;
  this.mobileOtpExpires = Date.now() + 10 * 60 * 1000; // 10 min
  return otp;
};

// Generate Password Reset Token
UserSchema.methods.getPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(20).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 15 * 60 * 1000; // 15 min
  return resetToken;
};

// ✅ Generate Email Verification Token (missing earlier)
UserSchema.methods.getEmailVerificationToken = function () {
  const verificationToken = crypto.randomBytes(20).toString('hex');

  this.emailVerificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');

  this.emailVerificationExpires = Date.now() + 15 * 60 * 1000; // 15 min validity

  return verificationToken;
};

// ----------------------------
// EXPORT MODEL
// ----------------------------
const User = mongoose.model('User', UserSchema);
export default User;
