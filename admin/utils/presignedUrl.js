// src/utils/presignedUrl.js
import { s3 } from "../config/s3.js";
import { v4 as uuidv4 } from "uuid";
import { PutObjectCommand, CreateMultipartUploadCommand, UploadPartCommand } from "@aws-sdk/client-s3";

import { getSignedUrl } from '@aws-sdk/s3-request-presigner'


// ===================================================
/**
  POST /api/presign
  body: { files: [{ filename, contentType, size }, ...] }
 
  Response:
  {
    uploads: [
      { type: "simple", key, url },
      { type: "multipart", key, uploadId, partUrls: [{partNumber, url}, ...], chunkSize }
   ]
  }
 */
// ===================================================

// ===================================================
/**
Presign UTl best for large video uploading and best for retry agar uplaod net slwo ya any reason calcle ho jata hai phir retry bahi se uplado start kar sakte hain kiuki chunk wise uplado kar rhe hain jitna aprt uplaod ho gya bahi se phir star tho jayega understand 
 */
// ===================================================


export const presignBatch = async (req, res) => {
  try {
    const { files } = req.body;
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "files array required" });
    }
    if (files.length > 10) { // limit
      return res.status(400).json({ error: "max 10 files allowed" });
    }

    const results = [];

    const MULTIPART_THRESHOLD = 100 * 1024 * 1024; // 100 MB
    const PART_SIZE = 10 * 1024 * 1024; // 10 MB

    for (const f of files) {
      const { filename, contentType = "application/octet-stream", size = 0 } = f;
      if (!filename) return res.status(400).json({ error: "filename required for each file" });

      const key = `uploads/${Date.now()}-${uuidv4()}-${filename}`;

      const forceMultipart = /^video\//.test(contentType) || size >= MULTIPART_THRESHOLD;

      if (!forceMultipart) {
        const command = new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key,
          ContentType: contentType,
        });

        const url = await getSignedUrl(s3, command, { expiresIn: 120 });

        results.push({ type: "simple", key, url, contentType });
      }


      else {

        // ===================================================
        // multipart: create upload, return uploadId and part URLs
        // ===================================================
        const createResp = await s3.send(
          new CreateMultipartUploadCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
            ContentType: contentType,
          })
        );

        // ===================================================
        // const createResp = await s3.createMultipartUpload(createParams).promise();
        // ===================================================
        const uploadId = createResp.UploadId;

        const partCount = Math.ceil(size / PART_SIZE);
        const partUrls = [];

        for (let partNumber = 1; partNumber <= partCount; partNumber++) {

          const command = new UploadPartCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
            UploadId: uploadId,
            PartNumber: partNumber
          });

          const url = await getSignedUrl(s3, command, { expiresIn: 120 });
          partUrls.push({ partNumber, url });
        }

        results.push({
          type: "multipart",
          key,
          uploadId,
          chunkSize: PART_SIZE,
          partUrls,
          contentType
        });
      }
    }

    return res.json({ uploads: results });
  } catch (err) {
    console.error("presignBatch error", err);
    return res.status(500).json({ error: "Could not generate presigned urls" });
  }
};
