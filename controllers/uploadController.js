const xlsx = require('xlsx');
const fs = require('fs');
const { DateTime } = require('luxon');
const Order = require('../models/Order');
const ArchivedOrder = require('../models/ArchivedOrder');
const AreaConfig = require('../models/AreaConfig');

const TZ = 'America/Toronto';
const PERSIST_HOUR = 6; // <--- store orders at 6:00 AM local time

function parseFileInfo(filename) {
  const name = filename.replace(/\..+$/, '');
  const [codeRaw, ...rest] = name.split('-');
  const areaCode = (codeRaw || '').trim().toUpperCase();
  if (!areaCode || rest.length === 0) throw new Error('Invalid filename format');

  const raw = rest.join('-').trim();
  // Try ISO first ("yyyy-LL-dd"); otherwise "d LLL yyyy" / "d LLLL yyyy" with current year
  let dt = DateTime.fromISO(raw, { zone: TZ });
  if (!dt.isValid) {
    const y = DateTime.now().setZone(TZ).year;
    dt = DateTime.fromFormat(`${raw} ${y}`, 'd LLL yyyy', { zone: TZ });
    if (!dt.isValid) dt = DateTime.fromFormat(`${raw} ${y}`, 'd LLLL yyyy', { zone: TZ });
  }
  if (!dt.isValid) throw new Error(`Invalid date in filename: "${raw}"`);

  const startDT = dt.startOf('day'); // 00:00 Toronto (for window building)
  const accessCode = `${areaCode}-${startDT.toFormat('LLdd')}`;
  return { areaCode, startDT, accessCode };
}

function cleanPhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = String(phone).replace(/[^\d]/g, '');
  if (cleaned.length === 11 && cleaned.startsWith('1')) cleaned = cleaned.slice(1);
  return cleaned || null;
}

const uploadOrdersFromFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Key must be "file".' });
    }

    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Normalize the Toronto calendar day
    const { areaCode, startDT, accessCode } = parseFileInfo(req.file.originalname);
    const endDT = startDT.endOf('day');
    const start = startDT.toJSDate();
    const end = endDT.toJSDate();
    const dateKey = startDT.toFormat('yyyy-LL-dd'); // stable day key

    // Persist at 6:00 AM local time (safer than midnight; avoids DST weirdness)
    const persistedDT = startDT.set({ hour: PERSIST_HOUR, minute: 0, second: 0, millisecond: 0 });
    const persistedAt = persistedDT.toJSDate(); // <-- THIS is what we store into `date`

    // Verify area
    const config = await AreaConfig.findOne();
    if (!config) throw new Error('Area configuration not found.');
    const areaMeta = config.areas.find(a => a.areaCode === areaCode);
    if (!areaMeta) throw new Error(`Area code "${areaCode}" is not registered in AreaConfig.`);

    // Archive existing orders for that day — use dateKey (bulletproof)
    const existing = await Order.find({ areaCode, dateKey });
    if (existing.length) {
      const archived = existing.map(o => ({
        ...o.toObject(),
        archivedAt: new Date(),
        archiveReason: 'Re-upload',
      }));
      await ArchivedOrder.insertMany(archived);
      await Order.deleteMany({ areaCode, dateKey });
    }
    // (If you still keep range-based cleanup anywhere, use { $gte: start, $lte: end } derived above.)

    // Build new docs
    const newOrders = sheet.map((row, i) => {
      let tiffinQty = 0;
      const specialItems = [];
      const tiffinRaw = String(row['Tiffin'] ?? '').trim();

      if (tiffinRaw && !/^\d+$/.test(tiffinRaw)) {
        specialItems.push(tiffinRaw);
      } else {
        tiffinQty = parseInt(tiffinRaw, 10) || 0;
      }

      return {
        customerId: null,
        customerPrimaryPhoneNumber: cleanPhoneNumber(row.Phone),
        deliveryAddress: {
          addressInfo: row['Address'] || '',
          houseType: null,
          buzzCode: null,
          unit: null,
          deliveryType: row['Location Notes'],
          areaCode,
        },
        items: {
          tiffin: tiffinQty,
          rotis: Number(row['Rotis']) || 0,
          thepla: Number(row['Thepla']) || 0,
          veggie: Number(row['Veggie']) || 0,
          rice: Number(row['Rice']) || 0,
          curry: Number(row['Curry']) || 0,
        },
        specialItems,
        comments: [{ ops: 'import', comment: row['Location'], ts: new Date() }],
        status: 'created',

        // Store 6 AM instant + stable key + human day label
        date: persistedAt,                    // <-- 6:00 AM Toronto (in UTC under the hood)
        dateKey,                              // <-- "YYYY-MM-DD"
        day: startDT.setLocale('en').toFormat('cccc'),

        stopNumber: row['Stop Number'] || i + 1,
        customerName: row['Location'] || 'N/A',
        rawAddress: row['Address'] || 'N/A',
        // accessCode, // keep if needed
      };
    });

    await Order.insertMany(newOrders);

    console.log(
      '[upload-orders] area=%s dateKey=%s new=%d persistedZ=%s windowZ=[%s .. %s]',
      areaCode,
      dateKey,
      newOrders.length,
      persistedAt.toISOString(),
      start.toISOString(),
      end.toISOString()
    );

    fs.unlinkSync(filePath);
    return res.json({
      message: 'Orders uploaded successfully',
      created: newOrders.length,
      areaCode,
      dateKey,
    });
  } catch (err) {
    console.error(err);
    try { if (req?.file?.path) fs.unlinkSync(req.file.path); } catch {}
    return res.status(500).json({ error: err.message });
  }
};

module.exports = { uploadOrdersFromFile };
