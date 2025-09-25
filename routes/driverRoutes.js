const express = require('express');
const router = express.Router();
const driverController = require('../controllers/driverController');

router.post('/', driverController.createDriver);

router.get('/', driverController.getAllDrivers);
router.get('/:id', driverController.getDriverById);

router.put('/:id', driverController.updateDriver);

router.patch('/:id/toggle-archive', driverController.toggleArchiveStatus);


router.post('/:id/generate-password', driverController.generatePassword);

module.exports = router;
