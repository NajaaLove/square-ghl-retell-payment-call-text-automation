const { validateGHLPayload } = require('../utils/validators');

// ---------------------------------------------------------------------------
// validateGHLPayload
// ---------------------------------------------------------------------------
describe('validateGHLPayload', () => {
  const validPayload = {
    contact: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+15551234567',
      customFields: { package: 'VIP' }
    },
    payment: {
      amount: 997.00,
      timestamp: '2026-04-07T10:00:00Z'
    }
  };

  test('returns valid for a correct payload', () => {
    const result = validateGHLPayload(validPayload);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('returns invalid when contact object is missing', () => {
    const result = validateGHLPayload({});
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing contact object');
  });

  test('returns invalid when firstName is missing', () => {
    const p = JSON.parse(JSON.stringify(validPayload));
    delete p.contact.firstName;
    expect(validateGHLPayload(p).errors).toContain('Missing firstName');
  });

  test('returns invalid when lastName is missing', () => {
    const p = JSON.parse(JSON.stringify(validPayload));
    delete p.contact.lastName;
    expect(validateGHLPayload(p).errors).toContain('Missing lastName');
  });

  test('returns invalid when email is missing', () => {
    const p = JSON.parse(JSON.stringify(validPayload));
    delete p.contact.email;
    expect(validateGHLPayload(p).errors).toContain('Missing email');
  });

  test('returns invalid for a malformed email', () => {
    const p = JSON.parse(JSON.stringify(validPayload));
    p.contact.email = 'not-an-email';
    expect(validateGHLPayload(p).errors).toContain('Invalid email format');
  });

  test('returns invalid when phone is missing', () => {
    const p = JSON.parse(JSON.stringify(validPayload));
    delete p.contact.phone;
    expect(validateGHLPayload(p).errors).toContain('Missing phone');
  });

  test('returns invalid for phone without country code', () => {
    const p = JSON.parse(JSON.stringify(validPayload));
    p.contact.phone = '5551234567';
    expect(validateGHLPayload(p).errors).toContain(
      'Invalid phone format (must include country code, e.g., +15551234567)'
    );
  });

  test('returns invalid when package is missing', () => {
    const p = JSON.parse(JSON.stringify(validPayload));
    delete p.contact.customFields.package;
    expect(validateGHLPayload(p).errors).toContain('Missing package in customFields');
  });
});

// ---------------------------------------------------------------------------
// logger smoke tests
// ---------------------------------------------------------------------------
describe('logger', () => {
  const logger = require('../utils/logger');

  test('logger.info does not throw', () => {
    expect(() => logger.info('test', { key: 'value' })).not.toThrow();
  });

  test('logger.error does not throw', () => {
    expect(() => logger.error('test error', new Error('boom'))).not.toThrow();
  });

  test('logger.webhook does not throw', () => {
    expect(() => logger.webhook('/webhook/square-payment', { foo: 'bar' })).not.toThrow();
  });
});
