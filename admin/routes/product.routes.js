import { Router } from "express";


const router = Router();

router.post("/", async (req, res) =>  {
    const {title,description,price} = req.body;
   


    return res.send('success...')

});

export default router;
