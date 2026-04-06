const logger = require('../utils/logger');
const NotionService = require('../services/notion');

const notionService = new NotionService(process.env.NOTION_API_KEY);

module.exports = async (req, res) => {
  logger.webhook('/webhook/retell', req.body);

  const callData = req.body;

  // Only process call_ended events; acknowledge others silently
  if (callData.event && callData.event !== 'call_ended') {
    logger.info('Ignoring non-call_ended Retell event', { event: callData.event });
    return res.json({ success: true, message: `Event '${callData.event}' acknowledged, no action taken` });
  }

  try {
    // 1. Create Aria Activity Log entry
    logger.info('Creating Aria Activity Log entry', { callId: callData.call_id });
    const logResponse = await notionService.createAriaLogEntry(
      process.env.NOTION_DATABASE_ID_ARIA_LOG,
      callData
    );

    logger.info('Aria log created', { logId: logResponse.id });

    // 2. Update client status in Client Pipeline
    if (callData.metadata?.client_email) {
      logger.info('Finding and updating client record', { email: callData.metadata.client_email });

      const clientPage = await notionService.findClientByEmail(
        process.env.NOTION_DATABASE_ID_CLIENT_PIPELINE,
        callData.metadata.client_email
      );

      if (clientPage) {
        await notionService.updateClientStatus(
          clientPage.id,
          'Credentials Submitted - Ready for Mahad'
        );
        logger.info('Client status updated', { pageId: clientPage.id });
      } else {
        logger.info('Client not found in pipeline', { email: callData.metadata.client_email });
      }
    }

    // Return success
    return res.json({
      success: true,
      message: 'Call logged to Notion',
      call_id: callData.call_id,
      notion_log_id: logResponse.id
    });

  } catch (error) {
    logger.error('Retell webhook handler error', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to process Retell webhook',
      message: error.message
    });
  }
};
