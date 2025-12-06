// utils/sendSMS.js
const twilio = require('twilio');
require('dotenv').config()
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

async function sendSMS(to, body) {
  // console.log(authToken)
  try {
    const message = await client.messages.create({
      body,
      to,
      from: fromPhone
    });
    // console.log({ success: true, sid: message.sid })
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error('Twilio message failed:', error);
    return { success: false, error: error.message };
  }
}

async function getMessageStatus(sid) {
  try {
    const msg = await client.messages(sid).fetch();
    return {
      success: true,
      status: msg.status,             // delivered, sent, queued, failed, etc.
      errorCode: msg.errorCode || null,
      errorMessage: msg.errorMessage || null,
      dateUpdated: msg.dateUpdated || null,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message || 'Fetch failed',
      code: error.code,
      status: error.status,
    };
  }
}

module.exports = { sendSMS, getMessageStatus };
