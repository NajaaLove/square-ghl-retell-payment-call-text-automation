require('dotenv').config();
const express = require('express');
const logger = require('./utils/logger');

// Import route handlers
const ghlWebhookRoute = require('./routes/ghl-webhook');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    service: 'Financial Healer Automation Server',
    version: '1.0.0',
    endpoints: ['/webhook/ghl-payment']
  });
});

// Webhook routes
app.post('/webhook/ghl-payment', ghlWebhookRoute);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`Financial Healer Automation Server`);
  console.log(`Listening on port ${PORT}`);
  console.log(`Endpoint: /webhook/ghl-payment`);
});

module.exports = app;
