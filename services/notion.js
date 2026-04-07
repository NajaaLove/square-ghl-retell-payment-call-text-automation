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
  }
}

module.exports = NotionService;
