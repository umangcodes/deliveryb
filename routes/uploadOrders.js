const express = require('express');
const multer = require('multer');
const { uploadOrdersFromFile } = require('../controllers/uploadController');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/upload-orders', upload.single('file'), uploadOrdersFromFile);

module.exports = router;
