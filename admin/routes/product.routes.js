import { Router } from "express";
import {Products} from '../model/mongo.tes.js'

const router = Router();

router.post("/", async (req, res) =>  {
    const {title,description,price} = req.body;
   


    return res.send('success...')

});

export default router;
