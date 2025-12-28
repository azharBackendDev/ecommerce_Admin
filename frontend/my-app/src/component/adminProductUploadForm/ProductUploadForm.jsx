"use client";
import React, { useState, useCallback } from "react";
import api from "../../lib/apiClient"; // Adjust path based on your project structure (e.g., from /lib/apiClient.js)

// Existing components and utilities (as provided)
import CategorySelect from "./CategorySelect"; // Adjust path as needed

// Optional: Simple slugify utility for frontend preview (backend handles final slug)
function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-");
}

const ProductCreateForm = () => {
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    price: "",
    brand: "",
    category: "",
    stock: 0,
    attributes: "{}",
    variants: "[]",
    tags: "",
    isActive: true,
  });

  // Upload state
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({}); // { fileIndex: percentage }
  const [error, setError] = useState("");

  // Handle text input changes
  const handleInputChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "name" && { slug: slugify(value) }), // Auto-generate slug preview
    }));
    setError(""); // Clear errors on change
  }, []);

  // Handle checkbox change
  const handleCheckboxChange = useCallback((e) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: checked }));
  }, []);

  // Handle file selection
  const handleFileChange = useCallback((e) => {
    const selectedFiles = Array.from(e.target.files);
    if (selectedFiles.length > 10) {
      setError("Maximum 10 files allowed.");
      return;
    }
    setFiles(selectedFiles);
    setError("");
  }, []);

  // Validate form before submit
  const validateForm = useCallback(() => {
    if (!formData.name.trim()) {
      setError("Product name is required.");
      return false;
    }
    if (!formData.category) {
      setError("Please select a category.");
      return false;
    }
    if (!files.length) {
      setError("At least one image or video is required.");
      return false;
    }
    if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
      setError("Valid price is required.");
      return false;
    }
    return true;
  }, [formData, files]);

  // Main submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) return;

    setUploading(true);

    try {
      // Step 1: Generate presigned URLs
      const fileInfos = files.map((file) => ({
        filename: file.name,
        contentType: file.type || "application/octet-stream",
        size: file.size,
      }));

      const { data: { uploads } } = await api.post("/products/presign", { files: fileInfos });

      if (uploads.length !== files.length) {
        throw new Error("Mismatch in upload configurations.");
      }

      // Step 2: Upload files (simple or multipart)
      const completedKeys = [];
      for (let i = 0; i < uploads.length; i++) {
        const uploadConfig = uploads[i];
        const file = files[i];
        const fileKey = `file-${i}`; // For progress tracking

        if (uploadConfig.type === "simple") {
          // Simple PUT upload
          const response = await fetch(uploadConfig.url, {
            method: "PUT",
            body: file,
            headers: {
              "Content-Type": uploadConfig.contentType,
            },
          });

          if (!response.ok) {
            throw new Error(`Simple upload failed for ${file.name}: ${response.statusText}`);
          }

          completedKeys.push(uploadConfig.key);
          setUploadProgress((prev) => ({ ...prev, [fileKey]: 100 }));

        } else {
          // Multipart upload
          const partSize = uploadConfig.chunkSize;
          const partCount = uploadConfig.partUrls.length;
          const partResponses = [];

          let start = 0;
          for (let p = 0; p < partCount; p++) {
            const end = Math.min(start + partSize, file.size);
            const chunk = file.slice(start, end);
            const { partNumber, url: partUrl } = uploadConfig.partUrls[p];

            const response = await fetch(partUrl, {
              method: "PUT",
              body: chunk,
              headers: {
                "Content-Type": uploadConfig.contentType,
              },
            });

            if (!response.ok) {
              throw new Error(`Multipart part ${partNumber} failed for ${file.name}: ${response.statusText}`);
            }

            const eTag = response.headers.get("ETag");
            if (!eTag) {
              throw new Error(`No ETag received for part ${partNumber} of ${file.name}`);
            }

            partResponses.push({
              PartNumber: partNumber,
              ETag: eTag.replace(/"/g, ""), // Remove quotes from ETag
            });

            // Update progress
            const progress = Math.round(((p + 1) / partCount) * 100);
            setUploadProgress((prev) => ({ ...prev, [fileKey]: progress }));

            start = end;
          }

          // Step 3: Complete multipart upload
          const { data } = await api.post("/products/complete-multipart", {
            key: uploadConfig.key,
            uploadId: uploadConfig.uploadId,
            parts: partResponses.sort((a, b) => a.PartNumber - b.PartNumber), // Ensure sorted
          });

          if (!data.key) {
            throw new Error(`Failed to complete multipart upload for ${file.name}`);
          }

          completedKeys.push(uploadConfig.key);
          setUploadProgress((prev) => ({ ...prev, [fileKey]: 100 }));
        }
      }

      // Step 4: Create product with collected keys
      let parsedAttributes, parsedVariants, parsedTags;
      try {
        parsedAttributes = JSON.parse(formData.attributes);
        parsedVariants = JSON.parse(formData.variants);
        parsedTags =
          typeof formData.tags === "string"
            ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean)
            : [];
      } catch (parseErr) {
        throw new Error(`Invalid JSON in attributes or variants: ${parseErr.message}`);
      }

      const submitData = {
        ...formData,
        images: completedKeys, // Send keys; backend builds URLs
        attributes: parsedAttributes,
        variants: parsedVariants,
        tags: parsedTags,
        price: Number(formData.price),
        stock: Number(formData.stock),
        isActive: Boolean(formData.isActive),
        slug: formData.slug || undefined, // Optional; backend falls back to auto-slugify
      };

      const { data: product } = await api.post("/products/uploadProduct", submitData);

      // Success: Reset form
      setFormData({
        name: "",
        slug: "",
        description: "",
        price: "",
        brand: "",
        category: "",
        stock: 0,
        attributes: "{}",
        variants: "[]",
        tags: "",
        isActive: true,
      });
      setFiles([]);
      setUploadProgress({});
      console.log("Product created successfully:", product);
      alert("Product created successfully!"); // Replace with toast/notification in production

    } catch (err) {
      console.error("Product creation error:", err);
      setError(err.response?.data?.error || err.message || "Failed to create product.");
    } finally {
      setUploading(false);
    }
  };

  // Render file list with progress
  const renderFileList = () => (
    <ul className="file-list">
      {files.map((file, index) => {
        const fileKey = `file-${index}`;
        const progress = uploadProgress[fileKey] || 0;
        return (
          <li key={file.name + index} className="file-item">
            {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
            {uploading && (
              <div className="progress-bar">
                <div
                  className="progress-fill"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  return (
    <div className="product-form-container">
      <h2>Create New Product</h2>
      <form onSubmit={handleSubmit} className="product-form">
        {error && <div className="error-message">{error}</div>}

        {/* Basic Info */}
        <div className="form-group">
          <label htmlFor="name">Product Name *</label>
          <input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter product name"
            required
            disabled={uploading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="slug">Slug</label>
          <input
            id="slug"
            name="slug"
            type="text"
            value={formData.slug}
            onChange={handleInputChange}
            placeholder="Auto-generated from name"
            disabled={uploading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Enter product description"
            rows={4}
            required
            disabled={uploading}
          />
        </div>

        {/* Pricing & Stock */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="price">Price *</label>
            <input
              id="price"
              name="price"
              type="number"
              step="0.01"
              min="0"
              value={formData.price}
              onChange={handleInputChange}
              placeholder="0.00"
              required
              disabled={uploading}
            />
          </div>
          <div className="form-group">
            <label htmlFor="stock">Stock</label>
            <input
              id="stock"
              name="stock"
              type="number"
              min="0"
              value={formData.stock}
              onChange={handleInputChange}
              placeholder="0"
              disabled={uploading}
            />
          </div>
        </div>

        {/* Brand & Category */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="brand">Brand *</label>
            <input
              id="brand"
              name="brand"
              type="text"
              value={formData.brand}
              onChange={handleInputChange}
              placeholder="Enter brand name"
              required
              disabled={uploading}
            />
          </div>
          <div className="form-group">
            <label>Category *</label>
            <CategorySelect
              value={formData.category}
              onChange={(value) =>
                setFormData((prev) => ({ ...prev, category: value }))
              }
              disabled={uploading}
            />
          </div>
        </div>

        {/* Advanced Fields */}
        <div className="form-group">
          <label htmlFor="attributes">Attributes (JSON)</label>
          <textarea
            id="attributes"
            name="attributes"
            value={formData.attributes}
            onChange={handleInputChange}
            placeholder='e.g., {"color": "red", "material": "cotton"}'
            rows={3}
            disabled={uploading}
          />
          <small>Validated against category schema on save.</small>
        </div>

        <div className="form-group">
          <label htmlFor="variants">Variants (JSON)</label>
          <textarea
            id="variants"
            name="variants"
            value={formData.variants}
            onChange={handleInputChange}
            placeholder='e.g., [{"size": "M", "color": "blue", "stock": 10, "priceAdjustment": 0}]'
            rows={3}
            disabled={uploading}
          />
        </div>

        <div className="form-group">
          <label htmlFor="tags">Tags (comma-separated)</label>
          <input
            id="tags"
            name="tags"
            type="text"
            value={formData.tags}
            onChange={handleInputChange}
            placeholder="tag1, tag2, tag3"
            disabled={uploading}
          />
        </div>

        {/* Status */}
        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              name="isActive"
              type="checkbox"
              checked={formData.isActive}
              onChange={handleCheckboxChange}
              disabled={uploading}
            />
            Active
          </label>
        </div>

        {/* File Upload */}
        <div className="form-group">
          <label htmlFor="images">Images/Videos * (Max 10, 200MB each)</label>
          <input
            id="images"
            name="images"
            type="file"
            multiple
            accept="image/*,video/*"
            onChange={handleFileChange}
            disabled={uploading}
          />
          {files.length > 0 && renderFileList()}
          <small>Supports direct upload via presigned URLs (simple for 100MB, multipart for larger/videos).</small>
        </div>

        {/* Submit */}
        <button type="submit" disabled={uploading || files.length === 0} className="submit-button">
          {uploading ? "Creating Product..." : "Create Product"}
        </button>
      </form>

      <style jsx>{`
        .product-form-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        .product-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        label {
          font-weight: bold;
          margin-bottom: 4px;
        }
        input, textarea, select {
          padding: 8px;
          border: 1px solid #ccc;
          border-radius: 4px;
        }
        textarea {
          resize: vertical;
        }
        .checkbox-group {
          flex-direction: row;
          align-items: center;
        }
        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .file-list {
          list-style: none;
          padding: 0;
          margin-top: 8px;
        }
        .file-item {
          padding: 4px;
          border: 1px solid #eee;
          border-radius: 4px;
          margin-bottom: 4px;
        }
        .progress-bar {
          width: 100%;
          height: 4px;
          background: #f0f0f0;
          border-radius: 2px;
          overflow: hidden;
          margin-top: 4px;
        }
        .progress-fill {
          height: 100%;
          background: #4caf50;
          transition: width 0.3s ease;
        }
        .error-message {
          color: #d32f2f;
          background: #ffebee;
          padding: 8px;
          border-radius: 4px;
        }
        .submit-button {
          padding: 12px;
          background: #2196f3;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          cursor: pointer;
        }
        .submit-button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        small {
          font-size: 12px;
          color: #666;
          margin-top: 4px;
          display: block;
        }
      `}</style>
    </div>
  );
};

export default ProductCreateForm;