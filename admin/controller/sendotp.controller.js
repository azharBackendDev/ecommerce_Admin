import Otp from "../model/otp.model.js"
import User from "../model/user.model.js";
// Import nodemailer/twilio for actual send

export async function sendOtp(req, res) {
  const { emailOrPhone, purpose } = req.body; // e.g., "register"
  const type = emailOrPhone.includes('@') ? 'email' : 'phone';
  const channel = emailOrPhone;

  // Find or create user (for register: create with verified: false)
  let user = await User.findOne({ [type]: channel });
  if (!user && purpose === 'register') {
    user = await User.create({ [type]: channel, verified: false });
  }
  if (!user) return res.status(404).json({ message: "User not found" });

  // Rate limit: Check recent OTPs
  const recent = await Otp.countDocuments({ 
    userId: user._id, type, purpose, 
    createdAt: { $gte: new Date(Date.now() - 5 * 60 * 1000) } // 5 min
  });
  if (recent > 3) return res.status(429).json({ message: "Too many requests" });

  // Generate & send OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  // TODO: Send via email/SMS: await sendEmail(channel, code);

  // Save OTP
  await Otp.create({
    userId: user._id,
    code,
    type,
    channel,
    purpose,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 min
  });

  res.json({ success: true, message: "OTP sent" });
}