// src/controllers/multipart.controller.js
import { s3 } from "../config/s3.js";
import { CompleteMultipartUploadCommand } from "@aws-sdk/client-s3";

// ===================================================
/**
 * POST /api/complete-multipart
 * body: {
 *   key, uploadId,
 *   parts: [{ ETag, PartNumber }, ...]  // collected from the PUT responses
 * }  
 */
// ===================================================

// src/controllers/multipart.controller.js

export const completeMultipart = async (req, res) => {
  try {
    const { key, uploadId, parts } = req.body;
    if (!key || !uploadId || !Array.isArray(parts) || parts.length === 0) {
      return res.status(400).json({ error: "key, uploadId and parts required" });
    }

    const sorted = parts.sort((a, b) => a.PartNumber - b.PartNumber);

    const command = new CompleteMultipartUploadCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: sorted
      }
    });

    const resp = await s3.send(command);
    // resp.Location is the object URL
    return res.json({
      location: resp.Location,
      key
    });
  }
   catch (err) {
    console.error("completeMultipart error:", err);
    return res.status(500).json({ error: "Failed to complete multipart upload" });
  }
};
