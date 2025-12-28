import express from "express";
import { adminLogin, ForgetPassword, resetPassword, verifyLoginOTP } from "../controller/auth.controllre.js";
import { sendOtp } from "../controller/sendotp.controller.js";
import { verifyOtp } from "../controller/verify.otp.controller.js";

const router = express.Router();

//Admin Login
router.post('/login', adminLogin);
router.post('/verify-otp', verifyLoginOTP)
router.post('/forgot-password', ForgetPassword);
router.post('/verify-resetpassword-otp', resetPassword)


//User Login
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);

// Similar for recovery
// router.post("/add-recovery", addRecoveryController); 

export default router;