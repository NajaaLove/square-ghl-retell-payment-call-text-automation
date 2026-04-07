const logger = require('../utils/logger');
const { validateGHLPayload } = require('../utils/validators');
const RetellService = require('../services/retell');
const NotionService = require('../services/notion');

const retell = new RetellService(
  process.env.RETELL_API_KEY,
  process.env.RETELL_AGENT_ID,
  process.env.RETELL_FROM_NUMBER
);

const notion = new NotionService(process.env.NOTION_API_KEY);

module.exports = async (req, res) => {
  logger.webhook('/webhook/square-payment', req.body);

  const validation = validateGHLPayload(req.body);
  if (!validation.valid) {
    logger.error('Payload validation failed', { errors: validation.errors });
    return res.status(400).json({ success: false, errors: validation.errors });
  }

  const { contact, payment } = req.body;
  const clientName = `${contact.firstName} ${contact.lastName}`;

  // 1. Trigger Retell AI — Aria calls the client
  let retellCallId = null;
  try {
    logger.info('Triggering Aria call', { clientName, phone: contact.phone });
    const retellResponse = await retell.createOutboundCall(contact.phone, {
      client_name: clientName,
      client_email: contact.email,
      package: contact.customFields.package,
      source: 'square_payment',
      payment_amount: payment?.amount || 0,
      payment_timestamp: payment?.timestamp || new Date().toISOString()
    });
    retellCallId = retellResponse.call_id;
    logger.info('Aria call created', { callId: retellCallId });
  } catch (err) {
    logger.error('Retell call failed — continuing to Notion', err);
  }

  // 2. Create client record in Notion Client Pipeline
  try {
    logger.info('Creating Notion client record', { clientName });
    const notionResponse = await notion.createClientRecord(
      process.env.NOTION_DATABASE_ID_CLIENT_PIPELINE,
      {
        firstName: contact.firstName,
        lastName: contact.lastName,
        package: contact.customFields.package,
        timestamp: payment?.timestamp || new Date().toISOString()
      }
    );
    logger.info('Notion record created', { pageId: notionResponse.id });

    return res.json({
      success: true,
      message: 'Client onboarding initiated',
      client_name: clientName,
      retell_call_id: retellCallId,
      notion_page_id: notionResponse.id,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    logger.error('Notion record failed', err);
    return res.status(500).json({ success: false, error: 'Failed to create Notion record', message: err.message });
  }
};
