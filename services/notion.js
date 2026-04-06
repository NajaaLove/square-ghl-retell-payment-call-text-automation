const { Client } = require('@notionhq/client');

const PACKAGE_MAPPING = {
  'Elevation': 'VIP - $997',
  'VIP': 'VIP - $997',
  'Couples': 'Couples - $1200',
  '1 Round': '1 Round - $150',
  '2 Rounds': '2 Rounds - $297',
  '3 Rounds': '3 Rounds - $297+'
};

function mapPackage(ghlPackage) {
  return PACKAGE_MAPPING[ghlPackage] || ghlPackage;
}

function mapOutcome(callAnalysis) {
  if (!callAnalysis) return 'Partial';
  if (callAnalysis.call_successful === true) return 'Completed';
  if (callAnalysis.user_sentiment === 'no_answer') return 'No Answer';
  return 'Partial';
}

class NotionService {
  constructor(apiKey) {
    this.notion = new Client({ auth: apiKey });
  }

  /**
   * Create a new client record in the Client Pipeline database.
   * Called when GHL fires a payment webhook.
   */
  async createClientRecord(databaseId, clientData) {
    const { firstName, lastName, package: pkg, timestamp } = clientData;

    try {
      const response = await this.notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
          'Client Name': {
            title: [{ text: { content: `${firstName} ${lastName}` } }]
          },
          'Stage': {
            select: { name: 'Payment Received' }
          },
          'Package': {
            select: { name: mapPackage(pkg) }
          },
          'Credentials Status': {
            select: { name: 'Not Started' }
          },
          'Last Updated By': {
            select: { name: 'System' }
          },
          'Date Started': {
            date: { start: timestamp || new Date().toISOString() }
          }
        }
      });
      return response;
    } catch (error) {
      console.error('Notion API error (createClientRecord):', error);
      throw error;
    }
  }

  /**
   * Create an entry in the Aria Activity Log database.
   * Called when Retell fires a call_ended webhook.
   */
  async createAriaLogEntry(databaseId, callData) {
    const {
      call_id,
      metadata = {},
      to_number,
      start_timestamp,
      end_timestamp,
      call_analysis = {}
    } = callData;

    const duration = (end_timestamp || 0) - (start_timestamp || 0);
    const callTimestamp = start_timestamp
      ? new Date(start_timestamp * 1000).toISOString()
      : new Date().toISOString();

    try {
      const response = await this.notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
          'Client Name': {
            title: [{ text: { content: metadata.client_name || 'Unknown' } }]
          },
          'Call Type': {
            select: { name: 'New Client Intake' }
          },
          'Outcome': {
            select: { name: mapOutcome(call_analysis) }
          },
          'Last Updated By': {
            select: { name: 'Railway' }
          },
          'Call Timestamp': {
            date: { start: callTimestamp }
          },
          'Attempt Number': {
            number: 1
          },
          'Duration (seconds)': {
            number: duration
          },
          'Client Phone': {
            rich_text: [{ text: { content: to_number || '' } }]
          },
          'Retell Call ID': {
            rich_text: [{ text: { content: call_id || '' } }]
          },
          'Transcript Summary': {
            rich_text: [{ text: { content: (call_analysis.call_summary || '').substring(0, 2000) } }]
          },
          'Escalated to Marina': {
            checkbox: false
          }
        }
      });
      return response;
    } catch (error) {
      console.error('Notion API error (createAriaLogEntry):', error);
      throw error;
    }
  }

  /**
   * Find a client page in the Client Pipeline database by name.
   * Notion doesn't have an email property on this DB, so we search by Client Name.
   */
  async findClientByName(databaseId, fullName) {
    try {
      const response = await this.notion.databases.query({
        database_id: databaseId,
        filter: {
          property: 'Client Name',
          title: { equals: fullName }
        }
      });
      return response.results.length > 0 ? response.results[0] : null;
    } catch (error) {
      console.error('Notion API error (findClientByName):', error);
      throw error;
    }
  }

  /**
   * Update client pipeline stage after Aria finishes the call.
   */
  async updateClientStatus(pageId) {
    try {
      await this.notion.pages.update({
        page_id: pageId,
        properties: {
          'Stage': {
            select: { name: 'Credentials Complete' }
          },
          'Last Updated By': {
            select: { name: 'Aria' }
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
