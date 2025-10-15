// /lib/controllers/labelsController.js
const Label = require('../models/Labels'); // NOTE: if your file is models/Label.js, change this require path
const { normalizeLabelInput } = require('../utils/labels');

/* ---------- small local helpers (no extra deps) ---------- */
function asString(x) {
  return (x ?? '').toString().trim();
}
function asStringArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(asString).filter(Boolean);
  return asString(v).split(',').map(s => s.trim()).filter(Boolean);
}
function parseDateMaybe(x) {
  if (!x) return null;
  if (x instanceof Date && !isNaN(x)) return x;
  const d = new Date(x);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * POST /api/labels
 * Body: { labels: [{ customerName, phoneNumber, notes, items[], zone, copies?, labelDate?, status?, lockedBy?, lockedAt? }, ...] }
 */
async function bulkCreate(req, res) {
  try {
    const labelsInput = Array.isArray(req.body?.labels) ? req.body.labels : [];
    if (!labelsInput.length) {
      return res.status(400).json({ ok: false, error: 'labels must be a non-empty array' });
    }
    const docs = labelsInput.map(normalizeLabelInput);
    const created = await Label.insertMany(docs, { ordered: false });
    return res.status(201).json({ ok: true, count: created.length, ids: created.map(d => d._id) });
  } catch (err) {
    return res.status(400).json({ ok: false, error: String(err?.message || err) });
  }
}

/**
 * GET /api/labels?skip=&limit=&queued=true|false&printed=true|false
 */
async function list(req, res) {
  try {
    const skip = Math.max(0, parseInt(req.query.skip ?? '0', 10));
    const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit ?? '200', 10)));

    const toBool = (v) =>
      v === undefined ? undefined : v === 'true' ? true : v === 'false' ? false : undefined;

    const queued = toBool(req.query.queued);
    const printed = toBool(req.query.printed);

    const query = {};
    if (typeof queued === 'boolean')  query['status.queued']  = queued;
    if (typeof printed === 'boolean') query['status.printed'] = printed;

    const [items, total] = await Promise.all([
      Label.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Label.countDocuments(query),
    ]);

    return res.json({ ok: true, items, total, skip, limit });
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
}

/**
 * GET /api/labels/:id
 */
async function getOne(req, res) {
  try {
    const { id } = req.params;
    const doc = await Label.findById(id).lean();
    if (!doc) return res.status(404).json({ ok: false, error: 'Label not found' });
    return res.json({ ok: true, item: doc });
  } catch (err) {
    return res.status(400).json({ ok: false, error: String(err?.message || err) });
  }
}

/**
 * PATCH /api/labels/:id
 * Body: partial patch; safely merges top-level fields and nested status fields.
 * Example to queue reprint: { status: { queued: true } }
 */
async function updateOne(req, res) {
  try {
    const { id } = req.params;
    const patch = req.body || {};

    const update = {};
    // Top-level fields (apply only if provided)
    if ('customerName' in patch) update.customerName = asString(patch.customerName);
    if ('phoneNumber'  in patch) update.phoneNumber  = asString(patch.phoneNumber);
    if ('notes'        in patch) update.notes        = asString(patch.notes);
    if ('items'        in patch) update.items        = asStringArray(patch.items);
    if ('zone'         in patch) update.zone         = asString(patch.zone);
    if ('copies'       in patch) update.copies       = Math.max(1, Number(patch.copies || 1));
    if ('labelDate'    in patch) update.labelDate    = parseDateMaybe(patch.labelDate);

    if ('lockedBy' in patch) update.lockedBy = asString(patch.lockedBy) || null;
    if ('lockedAt' in patch) update.lockedAt = parseDateMaybe(patch.lockedAt);

    // Nested status merge (field-level so we don't wipe other status fields)
    if (patch.status && typeof patch.status === 'object') {
      const st = patch.status;
      if ('queued'      in st) update['status.queued']      = !!st.queued;
      if ('printed'     in st) update['status.printed']     = !!st.printed;
      if ('printedAt'   in st) update['status.printedAt']   = parseDateMaybe(st.printedAt);
      if ('lastPrinted' in st) update['status.lastPrinted'] = parseDateMaybe(st.lastPrinted);
      if ('printedOn'   in st) update['status.printedOn']   = asString(st.printedOn) || null;
      if ('printer'     in st) update['status.printer']     = asString(st.printer) || null;
      if ('reprints'    in st) update['status.reprints']    = Math.max(0, Number(st.reprints || 0));
    }

    const updated = await Label.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true }
    ).lean();

    if (!updated) return res.status(404).json({ ok: false, error: 'Label not found' });
    return res.json({ ok: true, item: updated });
  } catch (err) {
    return res.status(400).json({ ok: false, error: String(err?.message || err) });
  }
}

/**
 * DELETE /api/labels/:id
 */
async function removeOne(req, res) {
  try {
    const { id } = req.params;
    const del = await Label.findByIdAndDelete(id).lean();
    if (!del) return res.status(404).json({ ok: false, error: 'Label not found' });
    return res.json({ ok: true, deleted: 1, id });
  } catch (err) {
    return res.status(400).json({ ok: false, error: String(err?.message || err) });
  }
}

/**
 * DELETE /api/labels?all=true
 * or body: { ids: ["...", "..."] }
 */
async function remove(req, res) {
  try {
    const all = String(req.query.all || '').toLowerCase() === 'true';

    if (all) {
      const resDel = await Label.deleteMany({});
      return res.json({ ok: true, deleted: resDel.deletedCount || 0, all: true });
    }

    let ids = [];
    if (Array.isArray(req.body?.ids)) ids = req.body.ids;
    const qIds = req.query.ids;
    if (qIds) ids.push(...String(qIds).split(',').map(s => s.trim()).filter(Boolean));

    const idList = (Array.isArray(ids) ? ids : [])
      .map(String)
      .filter(Boolean);

    if (!idList.length) {
      return res.status(400).json({ ok: false, error: 'Provide ids[] or set all=true' });
    }

    const resDel = await Label.deleteMany({ _id: { $in: idList } });
    return res.json({ ok: true, deleted: resDel.deletedCount || 0, ids: idList });
  } catch (err) {
    return res.status(400).json({ ok: false, error: String(err?.message || err) });
  }
}

module.exports = {
  bulkCreate,
  list,
  getOne,
  updateOne,
  removeOne,
  remove,
};
