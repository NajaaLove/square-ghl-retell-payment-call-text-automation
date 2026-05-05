const validateGHLPayload = (payload) => {
  const errors = [];

  if (!payload.contact) {
    errors.push('Missing contact object');
    return { valid: false, errors };
  }

  if (!payload.contact.firstName) errors.push('Missing firstName');
  if (!payload.contact.lastName) errors.push('Missing lastName');
  if (!payload.contact.email) errors.push('Missing email');
  if (!payload.contact.phone) errors.push('Missing phone');

  // Validate phone format (must start with + and be at least 10 digits)
  if (payload.contact.phone && !/^\+\d{10,}$/.test(payload.contact.phone)) {
    errors.push('Invalid phone format (must include country code, e.g., +15551234567)');
  }

  // Validate email format
  if (payload.contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.contact.email)) {
    errors.push('Invalid email format');
  }

  if (!payload.contact.customFields?.package) {
    errors.push('Missing package in customFields');
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

const validateSquarePayload = (body) => {
  const errors = [];

  const payment = body?.data?.object?.payment;
  if (!payment) {
    errors.push('Missing data.object.payment');
    return { valid: false, errors };
  }

  if (typeof payment.id !== 'string') errors.push('payment.id must be a string');
  if (typeof payment.status !== 'string') errors.push('payment.status must be a string');
  if (typeof payment.amount_money?.amount !== 'number') errors.push('payment.amount_money.amount must be a number');
  if (typeof payment.buyer_email_address !== 'string') errors.push('payment.buyer_email_address must be a string');

  return {
    valid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateGHLPayload,
  validateSquarePayload
};
