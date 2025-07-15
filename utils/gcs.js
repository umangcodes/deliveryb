const { bucket } = require('../config/gcs');

/**
 * Uploads a file to GCS and returns only the stored path.
 * @param {Object} file - Multer file (must include file.buffer and file.mimetype).
 * @param {string} destinationPath - e.g., "proofs/orderId_timestamp.jpg"
 * @returns {Promise<string|null>} GCS path on success, null on failure
 */
exports.uploadImageToGCS = async (file, destinationPath) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.buffer) {
      console.error('Missing file or file buffer');
      return reject(new Error('Invalid file input'));
    }

    const blob = bucket.file(destinationPath);

    const stream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: file.mimetype || 'application/octet-stream',
      },
    });

    stream.on('error', (err) => {
      console.error('GCS upload error:', err);
      // Avoid calling .end() again
      if (!stream.destroyed) stream.destroy();
      reject(err);
    });

    stream.on('finish', () => {
      console.log('Upload to GCS completed:', destinationPath);
      resolve(destinationPath);
    });

    try {
      stream.end(file.buffer); // safest way to write the entire buffer
    } catch (err) {
      console.error('Error ending stream:', err);
      if (!stream.destroyed) stream.destroy();
      reject(err);
    }
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