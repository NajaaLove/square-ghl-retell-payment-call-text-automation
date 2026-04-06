const { validateGHLPayload } = require('../utils/validators');

// ---------------------------------------------------------------------------
// validators.js — validateGHLPayload
// ---------------------------------------------------------------------------
describe('validateGHLPayload', () => {
  const validPayload = {
    contact: {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+15551234567',
      customFields: {
        package: 'Elevation'
      }
    },
    payment: {
      amount: 597.00,
      timestamp: '2026-04-06T14:30:00Z'
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
    const payload = JSON.parse(JSON.stringify(validPayload));
    delete payload.contact.firstName;
    const result = validateGHLPayload(payload);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing firstName');
  });

  test('returns invalid when lastName is missing', () => {
    const payload = JSON.parse(JSON.stringify(validPayload));
    delete payload.contact.lastName;
    const result = validateGHLPayload(payload);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing lastName');
  });

  test('returns invalid when email is missing', () => {
    const payload = JSON.parse(JSON.stringify(validPayload));
    delete payload.contact.email;
    const result = validateGHLPayload(payload);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing email');
  });

  test('returns invalid for a malformed email', () => {
    const payload = JSON.parse(JSON.stringify(validPayload));
    payload.contact.email = 'not-an-email';
    const result = validateGHLPayload(payload);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Invalid email format');
  });

  test('returns invalid when phone is missing', () => {
    const payload = JSON.parse(JSON.stringify(validPayload));
    delete payload.contact.phone;
    const result = validateGHLPayload(payload);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing phone');
  });

  test('returns invalid for a phone without country code', () => {
    const payload = JSON.parse(JSON.stringify(validPayload));
    payload.contact.phone = '5551234567'; // missing leading +1
    const result = validateGHLPayload(payload);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'Invalid phone format (must include country code, e.g., +15551234567)'
    );
  });

  test('returns invalid when package is missing', () => {
    const payload = JSON.parse(JSON.stringify(validPayload));
    delete payload.contact.customFields.package;
    const result = validateGHLPayload(payload);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing package in customFields');
  });

  test('returns invalid when customFields is missing entirely', () => {
    const payload = JSON.parse(JSON.stringify(validPayload));
    delete payload.contact.customFields;
    const result = validateGHLPayload(payload);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Missing package in customFields');
  });

  test('accepts all three valid package types', () => {
    for (const pkg of ['Elevation', 'VIP', 'Couples']) {
      const payload = JSON.parse(JSON.stringify(validPayload));
      payload.contact.customFields.package = pkg;
      const result = validateGHLPayload(payload);
      expect(result.valid).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// logger.js — smoke tests (just ensure no throws)
// ---------------------------------------------------------------------------
describe('logger', () => {
  const logger = require('../utils/logger');

  test('logger.info does not throw', () => {
    expect(() => logger.info('test message', { key: 'value' })).not.toThrow();
  });

  test('logger.error does not throw', () => {
    expect(() => logger.error('test error', new Error('boom'))).not.toThrow();
  });

  test('logger.webhook does not throw', () => {
    expect(() => logger.webhook('/test', { foo: 'bar' })).not.toThrow();
  });
});
