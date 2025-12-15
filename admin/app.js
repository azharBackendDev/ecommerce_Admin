import dotenv from "dotenv";
dotenv.config();
import express, { urlencoded } from "express";
import morgan from "morgan";
import categoryRoutes from "./routes/category.routes.js";
import productRoutes from "./routes/product.routes.js";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@as-integrations/express4";
import bodyParser from "body-parser";
import cors from "cors";
import typeDefs from "./schema.js";
import resolvers from "./resolver.js";
import adminAuthRoutes from './routes/auth.routes.js'






//Appollo server for graphQL
const server = new ApolloServer({
  typeDefs, // Schema yahan attach kiya
  resolvers, // Resolvers yahan attach kiye
});

await server.start();

export const app = express();

app.use(express.json());
app.use(urlencoded({ extended: true }));
app.use(express.json({ limit: "10mb" }));

//setup cors
app.use(
  cors({
    origin: [process.env.FRONTEND_URL],
    credentials: true,
  })
);

app.use("/admin", cors(), bodyParser.json(), expressMiddleware(server));

if (process.env.NODE_ENV !== "test") {
  app.use(morgan("dev"));
}

app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use('/api/auth/admin',adminAuthRoutes);// Admin login middleware

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  const msg = status >= 500 ? "Server Error" : err.message;

  res.status(status).json({
    success: false,
    message: msg,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});
