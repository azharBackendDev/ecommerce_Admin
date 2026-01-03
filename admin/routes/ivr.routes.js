import { Router } from "express";

const router = Router();


import * as ivrCtrl from '../controller/ivr.controller.js';


router.post('/admin/order/:orderNumber/schedule-ivr', adminAuth, ivrCtrl.scheduleIVRForOrder);
router.post('/admin/order/:orderNumber/cancel-ivr', adminAuth, ivrCtrl.cancelIVRForOrder);
router.post('/admin/order/:orderNumber/trigger', adminAuth, ivrCtrl.manualTrigger);


app.all('/exotel/ivr', ivrCtrl.exotelStart);
app.post('/exotel/ivr-response', express.urlencoded({ extended: false }), ivrCtrl.exotelResponse);