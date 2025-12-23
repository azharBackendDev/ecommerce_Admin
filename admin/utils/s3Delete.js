// src/utils/s3Utils.js
import { s3 } from "../config/s3.js";

export async function deleteS3Objects(keys = []) {

    if (!Array.isArray(keys) || keys.length === 0) return;

    const Objects = keys.map(Key => ({ Key }));

    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Delete: { Objects }
    };
    
    return s3.deleteObjects(params).promise();
}
