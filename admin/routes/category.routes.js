import { Router } from "express";
import { createCategory, addAttribute, getCategory, listCategories, updateCategory } from "../controller/categoryController.js";

const router = Router();

router.get("/list",listCategories)//list all category and sub-category
router.post("/attributes/:id", addAttribute);//add attribut to category
router.get('/getCategories/:id',getCategory)
router.post("/creates", createCategory);//create a category
router.patch('/updateCategories/:id',updateCategory)


export default router;
