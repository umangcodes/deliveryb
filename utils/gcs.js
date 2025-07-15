const { bucket } = require('../config/gcs');

/**
 * Uploads a file to GCS and returns only the stored path.
 * @param {Object} file - Multer file (must include file.buffer and file.mimetype).
 * @param {string} destinationPath - e.g., "proofs/orderId_timestamp.jpg"
 * @returns {Promise<string|null>} GCS path on success, null on failure
 */
exports.uploadImageToGCS = async (file, destinationPath) => {
  return new Promise((resolve, reject) => {
    const blob = bucket.file(destinationPath);

    const stream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: file.mimetype,
      },
    });

    stream.on('error', (err) => {
      console.error('GCS upload error:', err);
      reject(null);
    });

    stream.on('finish', () => {
      resolve(destinationPath); // ✅ Just return the GCS path
    });

    stream.end(file.buffer);
  });
};

exports.getSignedImageUrl = async (gcsPath) => {
  try {
    const file = bucket.file(gcsPath);
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    });

    return url;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
};