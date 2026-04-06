const { Client } = require('@notionhq/client');

class NotionService {
  constructor(apiKey) {
    this.notion = new Client({ auth: apiKey });
  }

  async createClientRecord(databaseId, clientData) {
    const { firstName, lastName, email, phone, package: pkg, amount, timestamp } = clientData;

    try {
      const response = await this.notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
          'Client Name': {
            title: [{ text: { content: `${firstName} ${lastName}` } }]
          },
          'Email': {
            email: email
          },
          'Phone': {
            phone_number: phone
          },
          'Package': {
            select: { name: pkg }
          },
          'Status': {
            select: { name: 'Onboarding - Aria Called' }
          },
          'Payment Date': {
            date: { start: timestamp }
          },
          'Payment Amount': {
            number: amount
          },
          'Source': {
            rich_text: [{ text: { content: 'Square → GHL → Railway' } }]
          }
        }
      });
      return response;
    } catch (error) {
      console.error('Notion API error (createClientRecord):', error);
      throw error;
    }
  }

  async createAriaLogEntry(databaseId, callData) {
    const { call_id, metadata, to_number, start_timestamp, end_timestamp, transcript, call_analysis } = callData;
    const duration = end_timestamp - start_timestamp;

    try {
      const response = await this.notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
          'Client Name': {
            title: [{ text: { content: metadata.client_name } }]
          },
          'Call ID': {
            rich_text: [{ text: { content: call_id } }]
          },
          'Phone Number': {
            phone_number: to_number
          },
          'Call Duration': {
            number: duration
          },
          'Call Success': {
            checkbox: call_analysis.call_successful
          },
          'User Sentiment': {
            select: { name: call_analysis.user_sentiment }
          },
          'Summary': {
            rich_text: [{ text: { content: call_analysis.call_summary || '' } }]
          },
          'Transcript': {
            // Notion has a 2000 char limit per rich_text block
            rich_text: [{ text: { content: (transcript || '').substring(0, 2000) } }]
          },
          'Package': {
            select: { name: metadata.package }
          },
          'Timestamp': {
            date: { start: new Date(start_timestamp * 1000).toISOString() }
          }
        }
      });
      return response;
    } catch (error) {
      console.error('Notion API error (createAriaLogEntry):', error);
      throw error;
    }
  }

  async findClientByEmail(databaseId, email) {
    try {
      const response = await this.notion.databases.query({
        database_id: databaseId,
        filter: {
          property: 'Email',
          email: { equals: email }
        }
      });
      return response.results.length > 0 ? response.results[0] : null;
    } catch (error) {
      console.error('Notion API error (findClientByEmail):', error);
      throw error;
    }
  }

  async updateClientStatus(pageId, newStatus) {
    try {
      await this.notion.pages.update({
        page_id: pageId,
        properties: {
          'Status': {
            select: { name: newStatus }
          },
          'Last Aria Call': {
            date: { start: new Date().toISOString() }
          }
        }
      });
    } catch (error) {
      console.error('Notion API error (updateClientStatus):', error);
      throw error;
    }
  }
}

module.exports = NotionService;
