require('dotenv').config();
const express = require('express');
const logger = require('./utils/logger');
const squarePaymentRoute = require('./routes/square-payment');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Financial Healer — Square Payment Webhook',
    version: '1.0.0',
    endpoints: [
      'POST /webhook/square-payment',
      'POST /webhook/square-direct'
    ]
  });
});

// Payment webhook: GHL fires this after a Square payment
app.post('/webhook/square-payment', squarePaymentRoute);

const squareDirectRoute = require('./routes/square-direct');
app.post('/webhook/square-direct', squareDirectRoute);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', err);
  res.status(500).json({ success: false, error: 'Internal server error', message: err.message });
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`Financial Healer — Square Payment Webhook`);
  console.log(`Listening on port ${PORT}`);
  console.log(`POST /webhook/square-payment`);
  console.log(`POST /webhook/square-direct`);
});

module.exports = app;
