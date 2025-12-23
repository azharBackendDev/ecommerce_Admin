import { Users } from "../model/user.model.js";
import { generateAccessToken } from "../services/jwt.services.js";
import { sendMail } from "../services/mail.services.js";
import { otpStore } from "../services/storeOtp.services.js";
const isprod = process.env.IS_PRODUCTION;

 function generateOTP(){
  return Math.floor(100000 + Math.random() * 900000).toString();
}


export const adminLogin = async (req, res) => {
  try {
    const { credential, password } = req.body;

    if (!credential || !password) {
      return res
        .status(400)
        .json({ message: "Credential and password required" });
    }

    let user = await Users.findByCredential(credential);

    
    if (user) {
      const ok = await user.comparePassword(password);
      if (!ok) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
    }

    
    if (!user) {
      const normalized = {};
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(credential)) {
        normalized.email = credential.toLowerCase();
      } else {
        normalized.phone = credential.replace(/\D/g, "");
      }

      user = await Users.create({
        ...normalized,
        password,
      });
    }

  
    const otp = generateOTP();//genereate otp
    otpStore.set(credential, otp);//save otp

    await sendMail(credential, otp);//send mail

    return res.status(200).json({
      message: "OTP sent successfully",
      to: credential,
      isNewUser: !user.lastLoginAt, 
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
};

export const verifyLoginOTP = async (req, res) => {
  try {
    const { credential, otp } = req.body;

    if (!credential || !otp) {
      return res.status(400).json({ message: "credential and OTP required" });
    }

    const valid = otpStore.verify(credential, otp);
    if (!valid) {
      return res.status(401).json({ message: "Invalid or expired OTP" });
    }

    const user = await Users.findByCredential(credential)

    //generate access token and send cookie
    const token = await generateAccessToken(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET
    );

    res.cookie("AccessToken", token, {
      httpOnly: true,
      secure: isprod,
      sameSite: isprod ? "none" : "lax",
      maxAge: 1000 * 60 * 15,
    });

    user.lastLoginAt = new Date();
    user.isEmailVerified=true
    await user.save();

    return res.status(200).json({
      message: "Login successful",
      user: user.toJSON(),
    });

  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};



