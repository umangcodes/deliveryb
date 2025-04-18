// utils/sendSMS.js
const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromPhone = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);

async function sendSMS(to, body) {
  try {
    const message = await client.messages.create({
      body,
      to,
      from: fromPhone
    });
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error('Twilio message failed:', error);
    return { success: false, error: error.message };
  }
}

module.exports = { sendSMS };
