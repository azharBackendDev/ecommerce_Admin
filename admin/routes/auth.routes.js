import express from "express";
import { adminLogin } from "../controller/auth.controllre.js";

const router = express.Router();

//Admin Login
router.post('/login', adminLogin);

export default router;