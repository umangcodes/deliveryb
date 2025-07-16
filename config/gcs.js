const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

const projectId = process.env.GOOGLE_CLOUD_PROJECT_ID;
const bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET;

const privateKey = process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !bucketName || !privateKey || !process.env.GCP_CLIENT_EMAIL) {
  throw new Error('Missing required Google Cloud env variables.');
}

const storage = new Storage({
  projectId,
  credentials: {
    type: 'service_account',
    project_id: projectId,
    private_key: privateKey,
    client_email: process.env.GCP_CLIENT_EMAIL,
  },
});

const bucket = storage.bucket(bucketName);

module.exports = { storage, bucket };
