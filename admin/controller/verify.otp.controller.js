import Otp from "../model/otp.model.js";
import User from "../model/user.model.js";
import jwt from "jsonwebtoken"; // for login token

export async function verifyOtp(req, res) {
  const { emailOrPhone, code, purpose } = req.body;
  const type = emailOrPhone.includes('@') ? 'email' : 'phone';

  // Find latest valid OTP
  const otp = await Otp.findOne({
    channel: emailOrPhone,
    code, // or bcrypt.compare if hashed
    purpose,
    expiresAt: { $gt: new Date() },
    attempts: { $lt: 5 }
  }).sort({ createdAt: -1 });

  if (!otp) return res.status(400).json({ message: "Invalid/expired OTP" });

  // Verify success
  otp.verifiedAt = new Date();
  otp.attempts += 1;
  await otp.save();

  const user = await User.findById(otp.userId);

  if (purpose === 'verify' || purpose === 'register') {
    user.verified = true;
    user.verifiedAt = new Date();
    await user.save();
  }

  // For login: Generate JWT
  if (purpose === 'login') {
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.json({ success: true, token, user: { id: user._id, name: user.name } });
  } else {
    res.json({ success: true, message: "Verified successfully" });
  }
}