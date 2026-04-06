const axios = require('axios');

class GHLService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://rest.gohighlevel.com/v1';
  }

  /**
   * Send an SMS to a contact via GHL.
   * @param {string} contactId - GHL contact ID
   * @param {string} message - SMS message body
   */
  async sendSMS(contactId, message) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/conversations/messages`,
        {
          type: 'SMS',
          contactId,
          message
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('GHL API error (sendSMS):', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = GHLService;
