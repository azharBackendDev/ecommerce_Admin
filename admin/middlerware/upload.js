// Enhanced middleware/upload.js (update the provided one for multiple files and product-specific)
// Remove the Image model creation; just handle files for products

import { s3 } from '../config/s3.js';
import multer from 'multer';
import multerS3 from 'multer-s3';

console.log("AWS_BUCKET_NAME =", process.env.AWS_BUCKET_NAME);

export const upload = multer({
  storage: multerS3({
    s3,
    bucket: process.env.AWS_BUCKET_NAME,
    key: (req, file, cb) => {
      // For products: prefix with 'products/' and timestamp
      cb(null, `products/${Date.now()}-${file.originalname}`);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per image
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'), false);
    }
  },
});

// Optional: separate handler for general images if needed, but for products, use in route
export const uploadImage = async (req, res) => {
  // Legacy single upload handler - keep if needed for non-product images
  if (!req.file) {
    return res.status(400).json({ message: "Image file is required" });
  }

  // If using Image model for general images:
  // const doc = await Image.create({
  //   title: req.body.title,
  //   imageUrl: req.file.location,
  // });
  // res.status(201).json(doc);

  // For products, this is handled in controller; just return URL for testing
  res.status(201).json({ imageUrl: req.file.location });
};

export const getImages = async (req, res) => {
  // Legacy - if needed
  // const images = await Image.find().sort({ createdAt: -1 });
  // res.json(images);
  res.status(501).json({ message: "Not implemented for products; use product routes" });
};