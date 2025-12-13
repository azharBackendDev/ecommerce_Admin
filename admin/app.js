import dotenv from "dotenv";
dotenv.config();

import express from "express"
import morgan from "morgan"

import categoryRoutes from "./routes/category.routes.js";
import productRoutes from "./routes/product.routes.js";

export const app = express();

app.use(express.json({ limit: "10mb" }));

if(process.env.NODE_ENV !== "test"){
    app.use(morgan("dev"));
}

app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);

app.use((err, req, res, next) => {
    console.error(err);
    const status = err.status || 500;
    const msg = status >= 500 ? "Server Error" : err.message;

    res.status(status).json({
        success: false,
        message: msg,
        ...(process.env.NODE_ENV !== "production" && { stack : err.stack }),
    })
})



