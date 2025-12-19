import { Router } from "express";
import { createProduct, getProducts, getProductById, updateProduct, deleteProduct } from "../controller/product.controller.js";
import { upload } from "../middlerware/upload.js"; // Assuming upload middleware is exported from the provided image upload file

const router = Router();


// POST /products - create product with multiple image uploads
// Expects: multipart/form-data with fields: name, slug?, description, price, brand, category (ID), attributes (JSON string), stock?, variants? (JSON), tags? (JSON), isActive?
// Files: images[] (multiple)

router.post("/uploadProduct", upload.array("images", 10), createProduct); // Max 10 images




// GET /products - list all products (optional filters like ?category=..., ?active=true)
router.get("/getProduct", getProducts);




// GET /products/:id - get single product
router.get("/getSingleProduct/:id", getProductById);




// PATCH /products/:id - update product (partial, no images re-upload)
router.patch("/updateSingleProduct/:id", updateProduct);




// DELETE /products/:id - delete product
router.delete("/deleteSingleProduct/:id", deleteProduct);

export default router;