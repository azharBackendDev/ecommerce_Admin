// src/utils/s3Upload.js
import multer from "multer";
import multerS3 from "multer-s3";
import { s3 } from "../config/s3.js";

export const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET_NAME,
    acl: "private", // recommended; change to 'public-read' only if intended
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const name = `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`;
      cb(null, `products/${name}`);
    },
  }),
  limits: {
    files: 10,
    fileSize: 200 * 1024 * 1024, // 200 MB per file
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image and video files are allowed"));
    }
  },
});
