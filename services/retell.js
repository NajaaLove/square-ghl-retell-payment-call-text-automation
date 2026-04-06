const axios = require('axios');

class RetellService {
  constructor(apiKey, agentId, fromNumber) {
    this.apiKey = apiKey;
    this.agentId = agentId;
    this.fromNumber = fromNumber;
    this.baseUrl = 'https://api.retellai.com/v2';
  }

  async createOutboundCall(toNumber, metadata) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/create-phone-call`,
        {
          agent_id: this.agentId,
          from_number: this.fromNumber,
          to_number: toNumber,
          metadata: metadata,
          retell_llm_dynamic_variables: {
            customer_name: metadata.client_name,
            customer_email: metadata.client_email,
            customer_phone: toNumber,
            package_type: metadata.package
          }
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
      console.error('Retell API error:', error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = RetellService;
