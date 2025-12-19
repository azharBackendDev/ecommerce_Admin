import { Router } from "express";
import { createCategory, addAttribute, getCategory, listCategories, updateCategory } from "../controller/superAdmin/categoryController.js";
import {authSuperAdminMiddleware} from '../middlewares/auth.middleware.js'

const router = Router();

router.get("/list",listCategories)//list all category and sub-category
router.post("/attributes/:id",authSuperAdminMiddleware, addAttribute);//add attribut to category
router.post("/creates",authSuperAdminMiddleware, createCategory);//create a category
router.get('/getCategories/:id',getCategory)//fetch category by id
router.patch('/updateCategories/:id',updateCategory)


export default router;
