const xlsx = require('xlsx');
const fs = require('fs');
const Order = require('../models/Order');
const ArchivedOrder = require('../models/ArchivedOrder');
const AreaConfig = require('../models/AreaConfig');

// Parse filename e.g. SC-14 Apr.xlsx
const parseFileInfo = (filename) => {
  const name = filename.replace(/\..+$/, '');
  const [codeRaw, ...rest] = name.split('-');
  const code = codeRaw.trim().toUpperCase();

  if (!code || rest.length === 0) throw new Error('Invalid filename format');

  const dateStr = rest.join('-').trim(); // e.g., '14 Apr'
  const fullDateStr = `${dateStr} ${new Date().getFullYear()}`;
  const date = new Date(fullDateStr);

  if (isNaN(date.getTime())) throw new Error(`Invalid date in filename: ${dateStr}`);

  const formattedAccessCode = `${code}-${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}`;

  return {
    areaCode: code,
    date: new Date(date.setHours(0, 0, 0, 0)),
    accessCode: formattedAccessCode
  };
};

const cleanPhoneNumber = (phone) => {
  // Remove any special characters and spaces
  if(phone){
    let cleaned = phone.replace(/[^\d]/g, '');
    
    // Remove '+1' if present at the start
    if (cleaned.startsWith('1')) {
      cleaned = cleaned.slice(1);
    }
    
    console.log("cleaned: " + cleaned)
    return cleaned;
  }else{
    return null
  }

};

const uploadOrdersFromFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded. Make sure the key is named "file".' });
    }

    const filePath = req.file.path;
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // Extract info from filename
    const { areaCode, date, accessCode } = parseFileInfo(req.file.originalname);

    // Verify that area exists in AreaConfig
    const config = await AreaConfig.findOne();
    if (!config) throw new Error('Area configuration not found.');

    const areaMeta = config.areas.find(a => a.areaCode === areaCode);
    if (!areaMeta) throw new Error(`Area code "${areaCode}" is not registered in AreaConfig.`);

    const start = new Date(date);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    // Archive existing orders
    const oldOrders = await Order.find({
      areaCode,
      date: { $gte: start, $lte: end }
    });

    if (oldOrders.length) {
      const archived = oldOrders.map(o => ({
        ...o.toObject(),
        archivedAt: new Date(),
        archiveReason: 'Re-upload'
      }));
      await ArchivedOrder.insertMany(archived);
      await Order.deleteMany({ areaCode, date: { $gte: start, $lte: end } });
    }

    // Prepare new orders
    const newOrders = sheet.map((row, i) => {
      let tiffinQty = 0;
      let specialItems = [];
      const tiffinRaw = String(row['Tiffin'] ?? '').trim();

      if (tiffinRaw && !/^\d+$/.test(tiffinRaw)) {
        specialItems.push(tiffinRaw);
      } else {
        tiffinQty = parseInt(tiffinRaw) || 0;
      }


      return {
        customerId: null,
        customerPrimaryPhoneNumber: cleanPhoneNumber(String(row.Phone)),
        deliveryAddress: {
          addressInfo: row['Address'] || '',
          houseType: null,
          buzzCode: null,
          unit: null,
          deliveryType: row['Location Notes'],
          areaCode
        },
        items: { tiffin: tiffinQty },
        specialItems,
        comments: [{ ops: 'import', comment: row['Location'], ts: new Date() }],
        status: 'created',
        date: new Date(start),
        day: start.toLocaleDateString('en-US', { weekday: 'long' }),
        stopNumber: row['Stop Number'] || i + 1,
        customerName: row['Location'] || 'N/A',
        rawAddress: row['Address'] || 'N/A',
      };
    });

    await Order.insertMany(newOrders);
    fs.unlinkSync(filePath);

    res.json({ message: 'Orders uploaded successfully', created: newOrders.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};

module.exports = { uploadOrdersFromFile };
