const { Storage } = require('@google-cloud/storage');
require('dotenv').config();
const serviceAccount = require('./serviceAccountKey.json'); // make sure this file exists

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;

if (!projectId || !bucketName) {
  throw new Error('Missing required environment variables for GCS.');
}

const storage = new Storage({
  projectId,
  credentials: serviceAccount, // use object, not keyFilename
});

const bucket = storage.bucket(bucketName);

module.exports = { storage, bucket };
