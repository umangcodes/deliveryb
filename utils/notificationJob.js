// utils/baseJob.js
const Message = require('../models/Message');
const { sendSMS, getMessageStatus } = require('../utils/sendSMS');

// Helpers to classify retryability without changing schema
const isTimeout = (err) =>
  String(err?.code || '').toLowerCase().includes('timeout') ||
  /timeout/i.test(err?.error || '') ||
  err?.status === 504;

const isPaymentIssue = (err) =>
  err?.status === 402 || /payment/i.test(err?.error || '');

async function runBaseJob() {
  const nowIso = new Date().toISOString();
  console.log('[Cron] Message scheduler @', nowIso);

  try {
    /**
     * STEP 1: INTERNALLY QUEUED but NOT EXTERNALLY ACCEPTED → attempt send (or retry)
     *  - queued.status           = true   (internally queued)
     *  - queued.external.status  = false  (Twilio has NOT accepted)
     *  - messageStatus.sent      = false
     *  - Only retry if brand-new (no notes/externalId) OR explicitly marked RETRYABLE last time.
     *  - Exclude NON_RETRYABLE cases.
     */
    const toSendOrRetry = await Message.find({
      'queued.status': true,
      'queued.external.status': false,
      'messageStatus.sent': false,
      $or: [
        { 'messageStatus.externalId': { $exists: false } },
        { 'messageStatus.externalId': null },
        { 'messageStatus.notes': /RETRYABLE/i },
      ],
      'messageStatus.notes': { $not: /NON_RETRYABLE/i },
    }).lean();

    for (const doc of toSendOrRetry) {
      const msg = await Message.findById(doc._id); // get live doc for updates
      const resp = await sendSMS(msg.customerPrimaryPhoneNumber, msg.message);

      if (resp.success) {
        // Twilio accepted — set external true ONCE and never flip back
        msg.queued.external.status = true;
        msg.queued.external.ts = new Date();
        msg.messageStatus.externalId = resp.sid;
        msg.messageStatus.notes = `[${nowIso}] Queued to Twilio (accepted)`;
        await msg.save();
        continue;
      }

      // Not accepted — decide retryability
      if (isTimeout(resp)) {
        msg.messageStatus.notes = `[${nowIso}] RETRYABLE: timeout (${resp.error})`;
      } else if (isPaymentIssue(resp)) {
        msg.messageStatus.notes = `[${nowIso}] RETRYABLE: payment issue (${resp.error})`;
      } else {
        msg.messageStatus.notes = `[${nowIso}] NON_RETRYABLE: ${resp.error || 'send failed'}`;
      }

      // Keep queued.external.status=false (never accepted), update internal timestamp
      msg.queued.ts = new Date();
      await msg.save();
    }

    /**
     * STEP 2: EXTERNALLY QUEUED (accepted by Twilio) but not yet sent/delivered → poll status
     *  - queued.status           = true
     *  - queued.external.status  = true   (accepted)
     *  - messageStatus.sent      = false
     *  - messageStatus.externalId present
     *  - NEVER requeue at this stage; just mark sent or record failure notes.
     */
    const toPoll = await Message.find({
      'queued.status': true,
      'queued.external.status': true,
      'messageStatus.sent': false,
      'messageStatus.externalId': { $exists: true, $ne: null },
    }).lean();

    for (const doc of toPoll) {
      const msg = await Message.findById(doc._id);
      const statusResp = await getMessageStatus(msg.messageStatus.externalId);

      if (!statusResp.success) {
        msg.messageStatus.notes = `[${nowIso}] Status fetch error: ${statusResp.error || 'unknown error'}`;
        await msg.save();
        continue;
      }

      const st = String(statusResp.status || '').toLowerCase();

      if (st === 'delivered' || st === 'sent') {
        msg.messageStatus.sent = true;
        msg.messageStatus.sentOn = nowIso;
        msg.messageStatus.notes = `[${nowIso}] Delivered (${st})`;
        await msg.save();
        continue;
      }

      if (st === 'failed' || st === 'undelivered' || st === 'canceled') {
        // Per rules: do NOT requeue after acceptance; just log
        const errInfo = statusResp.errorCode ? ` code=${statusResp.errorCode}` : '';
        const errMsg  = statusResp.errorMessage ? ` msg=${statusResp.errorMessage}` : '';
        msg.messageStatus.notes = `[${nowIso}] NON_RETRYABLE post-accept: ${st}.${errInfo}${errMsg}`;
        await msg.save();
        continue;
      }

      // Still pending at Twilio
      msg.messageStatus.notes = `[${nowIso}] Still ${st}`;
      await msg.save();
    }
  } catch (err) {
    console.error('[Cron] Job failed:', err);
  }
}

module.exports = runBaseJob;
