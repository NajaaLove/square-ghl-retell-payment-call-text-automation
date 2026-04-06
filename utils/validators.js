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

module.exports = {
  validateGHLPayload
};
