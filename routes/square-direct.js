const logger = require('../utils/logger');
const { validateSquarePayload } = require('../utils/validators');
const { mapPaymentToPackage } = require('../utils/packageMap');
const GHLService = require('../services/ghl');
const RetellService = require('../services/retell');

let ghlService;
if (process.env.GHL_API_KEY && process.env.GHL_LOCATION_ID) {
  ghlService = new GHLService(process.env.GHL_API_KEY, process.env.GHL_LOCATION_ID);
}

const retell = new RetellService(
  process.env.RETELL_API_KEY,
  process.env.RETELL_AGENT_ID,
  process.env.RETELL_FROM_NUMBER
);

module.exports = async (req, res) => {
  logger.webhook('/webhook/square-direct', req.body);
  res.sendStatus(200);
  handleSquareDirectPayment(req.body).catch((err) => {
    logger.error('[square-direct] unhandled error', err);
  });
};

async function handleSquareDirectPayment(body) {
  const validation = validateSquarePayload(body);
  if (!validation.valid) {
    logger.error('[square-direct] payload validation failed', { errors: validation.errors });
    return;
  }

  const payment = body.data.object.payment;

  if (payment.status !== 'COMPLETED') {
    logger.info('[square-direct] skipping non-COMPLETED payment', { paymentId: payment.id, status: payment.status });
    return;
  }

  const productName = payment.itemizations?.[0]?.name || null;
  const amountCents = payment.amount_money?.amount ?? 0;
  const email = (payment.buyer_email_address || '').toLowerCase().trim();

  if (!email) {
    logger.error('[square-direct] missing buyer email', { paymentId: payment.id });
    return;
  }

  const packageInfo = mapPaymentToPackage({ productName, amountCents });
  logger.info('[square-direct] mapped payment', {
    paymentId: payment.id, email, productName, amountCents,
    packageName: packageInfo.packageName, ghlTag: packageInfo.ghlTag,
  });

  if (!packageInfo.triggersAria || !packageInfo.ghlTag) {
    logger.warn('[square-direct] non-Aria product, skipping GHL tag', { packageName: packageInfo.packageName });
    return;
  }

  if (!ghlService) {
    logger.warn('[square-direct] GHL not configured, skipping');
    return;
  }

  let contact = await ghlService.findContactByEmail(email);
  if (!contact) {
    const fullName = payment.shipping_address?.name || payment.billing_address?.name || '';
    const [firstName, ...rest] = fullName.split(/\s+/);
    const lastName = rest.join(' ') || '';
    const newContactId = await ghlService.createContact({
      firstName: firstName || 'Unknown', lastName, email, phone: '',
    });
    if (!newContactId) {
      logger.error('[square-direct] failed to create GHL contact', { email });
      return;
    }
    contact = { contactId: newContactId, firstName, lastName, email, phone: null };
    logger.info('[square-direct] created new GHL contact', { contactId: newContactId, email });
  } else {
    logger.info('[square-direct] found existing GHL contact', { contactId: contact.contactId, email });
  }

  const tagApplied = await ghlService.addTagToContact(contact.contactId, packageInfo.ghlTag);
  if (tagApplied) {
    logger.info('[square-direct] tag applied successfully', { contactId: contact.contactId, tag: packageInfo.ghlTag });
  } else {
    logger.error('[square-direct] failed to apply tag', { contactId: contact.contactId, tag: packageInfo.ghlTag });
  }

  if (contact.phone) {
    try {
      const retellResponse = await retell.createOutboundCall(contact.phone, {
        client_name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Client',
        client_email: email,
        package: packageInfo.packageName,
        source: 'square_direct_payment',
        payment_amount: amountCents / 100,
        payment_timestamp: new Date().toISOString(),
      });
      logger.info('[square-direct] Aria call triggered', { callId: retellResponse.call_id });
    } catch (err) {
      logger.error('[square-direct] Aria call failed', err);
    }
  } else {
    logger.warn('[square-direct] no phone for Aria call', { contactId: contact.contactId, email });
  }
}
