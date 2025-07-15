const express = require('express');
const router = express.Router();
const multer = require('multer');
const { confirmDelivery , confirmDeliveryWithProof, getDeliveryProofUrl} = require('../controllers/OrderController');
const upload = multer({ storage: multer.memoryStorage() }); // you can also use diskStorage

router.get('/order/proof-url', getDeliveryProofUrl);
router.post('/confirm-delivery', confirmDelivery);
router.post(
    '/confirm-delivery-with-proof',
    upload.single('file'), // 🔥 handles `file` and `req.body`
    confirmDeliveryWithProof
  );



module.exports = router;