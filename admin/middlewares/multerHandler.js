// src/middlewares/multerHandler.js
import multer from "multer";
import { upload } from "../utils/s3Upload.js";

const multerHandler = (fieldName, maxFiles = 10) => {
  return (req, res, next) => {
    const handler = upload.array(fieldName, maxFiles);

    handler(req, res, (err) => {
      if (err) {
        console.error("Multer middleware error:", err);

        if (err instanceof multer.MulterError) {
          switch (err.code) {
            case "LIMIT_FILE_SIZE":
              return res.status(400).json({ error: "File too large. Max 200 MB per file." });
            case "LIMIT_FILE_COUNT":
              return res.status(400).json({ error: "Too many files. Max 10 files allowed." });
            case "LIMIT_UNEXPECTED_FILE":
              return res.status(400).json({ error: "Unexpected file field." });
            default:
              return res.status(400).json({ error: err.message || "Upload error" });
          }
        }

        return res.status(400).json({ error: err.message || "File upload failed" });
      }

      next();
    });
  };
};

export default multerHandler;
