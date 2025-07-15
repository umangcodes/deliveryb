const { Storage } = require('@google-cloud/storage');

const serviceAccount = {
  type: 'service_account',
  project_id: process.env.GCP_PROJECT_ID,
  private_key_id: process.env.GCP_PRIVATE_KEY_ID,
  private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'), // fix line breaks
  client_email: process.env.GCP_CLIENT_EMAIL,
  client_id: process.env.GCP_CLIENT_ID,
};

const storage = new Storage({ credentials: serviceAccount });
const bucket = storage.bucket(process.env.GOOGLE_CLOUD_STORAGE_BUCKET);

module.exports = { storage, bucket };
