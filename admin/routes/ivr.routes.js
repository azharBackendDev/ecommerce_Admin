// routes/ivr.routes.js
import express from 'express';
import { authAdminMiddleware } from "../middlewares/auth.middleware.js";
import {
    cancelIVRForOrder,
    exotelResponse,
    exotelStart,
    manualTrigger,
    scheduleIVRForOrder
} from "../controller/ivr.controller.js";

const router = express.Router();
const urlencodedParser = express.urlencoded({ extended: false });

router.post('/order/:orderNumber/schedule-ivr', scheduleIVRForOrder);
router.post('/order/:orderNumber/cancel-ivr', authAdminMiddleware, cancelIVRForOrder);
router.post('/order/:orderNumber/trigger', authAdminMiddleware, manualTrigger);

// Prefer explicit methods rather than app.all — support both GET and POST if unsure:
router.get('/exotel/ivr', exotelStart);
router.post('/exotel/ivr', urlencodedParser, exotelStart);
// The webhook that Exotel posts DTMF to
router.post('/exotel/ivr-response', urlencodedParser, exotelResponse);

export default router;
