
import mongoose from "mongoose";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: false,
    trim: true,
  },

  // optional but unique (sparse index)
  email: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
  },

  phone: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
  },

  password: {
    type: String,
    required: true,
    trim: true,
    minlength: 6,
  },

  role: {
    type: String,
    enum: ["user", "admin", "superAdmin"],
    default: "admin",
    lowercase: true,
  },

  isEmailVerified: {
    type: Boolean,
    default: false,
  },

  isPhoneVerified:{
    type:Boolean,
    default:false
  },

  // account lock / brute force protection
  failedLoginAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: {
    type: Date,
    default: null,
  },

  lastLoginAt: {
    type: Date,
  },

  isActive: {
    type: Boolean,
    default: true,
  },

  // optional: store refresh tokens or token ids (be careful with size)
  refreshTokens: {
    type: [String],
    default: [],
  },

  // for password reset
  resetPasswordToken: String,
  resetPasswordExpires: Date

}, { timestamps: true });

/*
 Ensure at least one identifier exists (email or phone).
 This runs before validation and prevents saving invalid doc.
*/
UserSchema.pre("validate", function () {
  if (!this.email && !this.phone) {
    throw new Error("Either email or phone is required");
  }
 
});

/*
 Hash password on save if modified.
*/
UserSchema.pre("save", async function () {
  
    if (!this.isModified("password")) return ;
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    this.password = await bcrypt.hash(this.password, salt);
    return ;

});

/*
 If you use findOneAndUpdate to change password, pre('findOneAndUpdate') hook:
 (only needed if you update password via findOneAndUpdate)
*/
UserSchema.pre("findOneAndUpdate", async function () {
  const update = this.getUpdate();
  if (update && update.password) {
    try {
      const salt = await bcrypt.genSalt(SALT_ROUNDS);
      update.password = await bcrypt.hash(update.password, salt);
      this.setUpdate(update);
    } catch (err) {
      return err;
    }
  }
});

/*
 Instance method to compare password
*/
UserSchema.methods.comparePassword = async function (plainPassword) {
  
  //check if user profile is Locked?
  if(this.lockUntil && this.lockUntil > Date.now()) throw new Error('Your Account is Locked for 1 hour');

    //compare password
  const isMatch = await bcrypt.compare(plainPassword, this.password);
  if(isMatch){
    //reset 
      this.failedLoginAttempts = 0;
    this.lockUntil = null;
    this.lastLoginAt = new Date();
    await this.save();

    return true;
  }
    // 4️⃣ Password incorrect
  this.failedLoginAttempts += 1;

  // 5️⃣ Lock account if max attempts reached
  if (this.failedLoginAttempts >= 5) {
    this.lockUntil = new Date(Date.now() + (1000 * 60 * 60));
  }

  await this.save();

  return false;

};

/*
 Instance helper to sanitize output (remove password, tokens)
*/
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  // optionally delete refreshTokens if you don't want to return them
  delete obj.refreshTokens;
  return obj;
};

/*
 Static helper: find by credential (email or phone)
*/
UserSchema.statics.findByCredential = async function (credential) {
  // detect email/phone by simple regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  let query= {};
  if (emailRegex.test(credential)) {
    query.email = credential.toLowerCase();
  } else {
    // normalize phone: remove non-digit chars
    const phone = credential.replace(/\D/g, "");
    query.phone = phone;
  }
  return this.findOne(query);
};

/*
 Indexes (ensure created)
*/
UserSchema.index({ email: 1 }, { unique: true, sparse: true });
UserSchema.index({ phone: 1 }, { unique: true, sparse: true });

export const Users = mongoose.model("Users", UserSchema);
