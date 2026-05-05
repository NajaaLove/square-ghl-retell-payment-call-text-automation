const axios = require('axios');
const logger = require('../utils/logger');

class GHLService {
  constructor(apiKey, locationId) {
    this.apiKey = apiKey;
    this.locationId = locationId;
    this.baseUrl = 'https://services.leadconnectorhq.com';
  }

  get headers() {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Version': '2021-07-28',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
  }

  async findContactByEmail(email) {
    try {
      const response = await axios.get(
        `${this.baseUrl}/contacts/?locationId=${this.locationId}&query=${encodeURIComponent(email)}`,
        { headers: this.headers }
      );
      const contact = response.data.contacts?.[0];
      if (!contact) return null;
      return {
        contactId: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        phone: contact.phone,
        email: contact.email
      };
    } catch (error) {
      logger.error('[ghl-client] findContactByEmail failed', {
        email,
        status: error.response?.status,
        body: error.response?.data,
        message: error.message
      });
      return null;
    }
  }

  async createContact({ firstName, lastName, email, phone }) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/contacts/`,
        { firstName, lastName, email, phone, locationId: this.locationId },
        { headers: this.headers }
      );
      return response.data.contact?.id ?? response.data.id ?? null;
    } catch (error) {
      logger.error('[ghl-client] createContact failed', {
        email,
        status: error.response?.status,
        body: error.response?.data,
        message: error.message
      });
      return null;
    }
  }

  async addTagToContact(contactId, tag) {
    try {
      await axios.post(
        `${this.baseUrl}/contacts/${contactId}/tags`,
        { tags: [tag] },
        { headers: this.headers }
      );
      return true;
    } catch (error) {
      logger.error('[ghl-client] addTagToContact failed', {
        contactId,
        tag,
        status: error.response?.status,
        body: error.response?.data,
        message: error.message
      });
      return false;
    }
  }
}

module.exports = GHLService;
