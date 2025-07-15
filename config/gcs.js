const { Storage } = require('@google-cloud/storage');
const path = require('path');
require('dotenv').config();

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;

if (!projectId || !bucketName) {
  throw new Error('Missing required environment variables for GCS.');
}

const storage = new Storage({
  projectId,
  keyFilename: path.join(__dirname, './serviceAccountKey.json'), // keep in /config/
});

const bucket = storage.bucket(bucketName);

module.exports = { storage, bucket };
