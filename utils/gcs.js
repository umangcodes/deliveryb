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
      return reject(new Error('Invalid file input or buffer missing'));
    }

    const blob = bucket.file(destinationPath);

    const stream = blob.createWriteStream({
      resumable: false,
      metadata: {
        contentType: file.mimetype || 'application/octet-stream',
      },
    });

    let streamDestroyed = false;

    stream.on('error', (err) => {
      streamDestroyed = true;
      console.error('GCS upload error:', err.message);
      reject(err);
    });

    stream.on('finish', () => {
      if (!streamDestroyed) {
        resolve(destinationPath);
      }
    });

    // Schedule the .end() safely after the stream is fully initialized
    setImmediate(() => {
      try {
        if (!stream.destroyed) {
          stream.end(file.buffer);
        } else {
          reject(new Error('Stream was destroyed before end() could be called'));
        }
      } catch (err) {
        console.error('Error during stream.end:', err.message);
        reject(err);
      }
    });
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