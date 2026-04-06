const logger = require('../utils/logger');
const { validateGHLPayload } = require('../utils/validators');
const RetellService = require('../services/retell');
const NotionService = require('../services/notion');

const retellService = new RetellService(
  process.env.RETELL_API_KEY,
  process.env.RETELL_AGENT_ID,
  process.env.RETELL_FROM_NUMBER
);

const notionService = new NotionService(process.env.NOTION_API_KEY);

module.exports = async (req, res) => {
  logger.webhook('/webhook/ghl-payment', req.body);

  // Validate payload
  const validation = validateGHLPayload(req.body);
  if (!validation.valid) {
    logger.error('GHL payload validation failed', { errors: validation.errors });
    return res.status(400).json({
      success: false,
      errors: validation.errors
    });
  }

  const { contact, payment } = req.body;
  const clientName = `${contact.firstName} ${contact.lastName}`;

  try {
    // 1. Trigger Retell AI call
    logger.info('Triggering Retell AI call', { clientName, phone: contact.phone });
    let retellCallId = null;

    try {
      const retellResponse = await retellService.createOutboundCall(
        contact.phone,
        {
          client_name: clientName,
          client_email: contact.email,
          package: contact.customFields.package,
          source: 'ghl_payment_webhook',
          payment_amount: payment?.amount || 0,
          payment_timestamp: payment?.timestamp || new Date().toISOString()
        }
      );
      retellCallId = retellResponse.call_id;
      logger.info('Retell call created', { callId: retellCallId });
    } catch (retellError) {
      logger.error('Retell API call failed, continuing to Notion', retellError);
      // Don't throw — continue to create Notion record
    }

    // 2. Create Notion client record
    logger.info('Creating Notion client record', { clientName });
    const notionResponse = await notionService.createClientRecord(
      process.env.NOTION_DATABASE_ID_CLIENT_PIPELINE,
      {
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        package: contact.customFields.package,
        amount: payment?.amount || 0,
        timestamp: payment?.timestamp || new Date().toISOString()
      }
    );

    logger.info('Client record created', { pageId: notionResponse.id });

    // Return success
    return res.json({
      success: true,
      message: 'Client onboarding initiated',
      client_name: clientName,
      retell_call_id: retellCallId,
      notion_page_id: notionResponse.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('GHL webhook handler error', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process payment webhook',
      message: error.message
    });
  }
};
