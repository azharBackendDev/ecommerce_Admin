import express from "express";
import { adminLogin,ForgetPassword,resetPassword,verifyLoginOTP } from "../controller/auth.controllre.js";

const router = express.Router();

//Admin Login
router.post('/login', adminLogin);
router.post('/verify-otp',verifyLoginOTP)

router.post('/forgot-password',ForgetPassword);
router.post('/verify-resetpassword-otp',resetPassword)

export default router;