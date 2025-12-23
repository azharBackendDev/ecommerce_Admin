import express from "express";
import { adminLogin,verifyLoginOTP } from "../controller/auth.controllre.js";

const router = express.Router();

//Admin Login
router.post('/login', adminLogin);
router.post('/verify-otp',verifyLoginOTP)

export default router;