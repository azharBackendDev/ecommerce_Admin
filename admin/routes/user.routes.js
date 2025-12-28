import { Router } from "express";
const router = Router();

import { addAddress, registerUser } from "../controller/user-controller.js";



router.post('/register', registerUser);


router.post('/:userId/address', addAddress);

export default router;