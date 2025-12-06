// server.js
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const cron = require('node-cron')
const runBaseJob = require('./utils/notificationJob')
dotenv.config();

const uploadOrdersRoute = require('./routes/uploadOrders');
const areaRoutes = require('./routes/areaRoutes');
const authRoutes = require('./routes/authRoutes');
const punchRoutes = require('./routes/punchRoutes')
const orderRoutes = require('./routes/orderRoutes')
const driverRoutes = require('./routes/driverRoutes')
const commandCenterRoutes = require('./routes/commandCenterRoutes')
const labelsRoutes = require('./routes/labelsRoutes')
const app = express();
const PORT = process.env.PORT || 5005;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploaded files (optional)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/area', areaRoutes)
app.use('/auth', authRoutes);
app.use('/orders', orderRoutes)
app.use('/driver', driverRoutes)
// Routes
app.use('/api', uploadOrdersRoute);
app.use('/punch', punchRoutes)
app.use('/cc', commandCenterRoutes)
app.use('/labels', labelsRoutes)



// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected');
  cron.schedule('*/3 * * * *', () => {
    runBaseJob()
    console.log('cron ran now' + new Date())
  })
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch(err => {
  console.error('MongoDB connection error:', err);
});
