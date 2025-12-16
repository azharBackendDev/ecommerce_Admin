import { Router } from "express";
import { createCategory, addAttribute, getCategory } from "../controller/categoryController.js";

const router = Router();


router.post("/creates", createCategory);//create a category
router.post("/:id/attributes", addAttribute);//add attribut to category
router.get('/:id',getCategory)

export default router;
