# The Financial Healer — Automation Server

AI-powered credit repair onboarding automation for The Financial Healer.

## Overview

This server automates client onboarding by:

1. Receiving payment webhooks from GoHighLevel (triggered when a client pays on Square)
2. Triggering an AI voice call via Retell AI (Aria agent walks the client through account setup)
3. Creating a client record in the Notion Client Pipeline database
4. Logging call completion data to the Notion Aria Activity Log database
5. Updating the client's pipeline status so Mahad (disputes specialist) knows they're ready

## Architecture

```
Square → GHL → Railway (/webhook/ghl-payment) → Retell AI (Aria call)
                                               → Notion (client record)

Retell AI → Railway (/webhook/retell) → Notion (call log + status update)
```

## Project Structure

```
square-ghl-retell-payment-call-text-automation/
├── server.js                    # Main Express server
├── routes/
│   ├── ghl-webhook.js           # POST /webhook/ghl-payment
│   └── retell-webhook.js        # POST /webhook/retell
├── services/
│   ├── retell.js                # Retell AI API client
│   ├── notion.js                # Notion API client
│   └── ghl.js                   # GHL API client (SMS, optional)
├── utils/
│   ├── logger.js                # Structured JSON logger
│   └── validators.js            # Payload validation
├── tests/
│   └── webhook.test.js          # Unit tests
├── .env.example                 # Environment variable template
├── package.json
├── README.md
└── ARCHITECTURE.md
```

## Setup

### Prerequisites

- Node.js 18.x or 20.x
- Railway account (for deployment)
- Retell AI account with Aria agent configured
- Notion workspace with two databases:
  - **Client Pipeline** (ID: `f44bb10bbc5882c684f2075660d5190c`)
  - **Aria Activity Log** (ID: `4c9bb10bbc58822fb0960749097b280a`)

### Local Development

1. Clone the repo:
   ```bash
   git clone https://github.com/NajaaLove/square-ghl-retell-payment-call-text-automation.git
   cd square-ghl-retell-payment-call-text-automation
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create your `.env` file:
   ```bash
   cp .env.example .env
   # Open .env and fill in your real values
   ```

4. Run in dev mode (auto-restarts on file changes):
   ```bash
   npm run dev
   ```

5. Run tests:
   ```bash
   npm test
   ```

### Deployment to Railway

1. Push code to GitHub (this repo)
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
3. Select this repository
4. Add the following environment variables in the Railway dashboard:

| Variable | Where to find it |
|---|---|
| `RETELL_API_KEY` | app.retellai.com → Settings → API Keys |
| `RETELL_AGENT_ID` | app.retellai.com → your Aria agent → Agent ID |
| `RETELL_FROM_NUMBER` | `+12162389148` (Aria's number) |
| `NOTION_API_KEY` | notion.so → Settings → Integrations → your integration |
| `NOTION_DATABASE_ID_CLIENT_PIPELINE` | `f44bb10bbc5882c684f2075660d5190c` |
| `NOTION_DATABASE_ID_ARIA_LOG` | `4c9bb10bbc58822fb0960749097b280a` |
| `PORT` | `3000` (Railway sets this automatically) |

5. Railway auto-deploys on every push to `main`. Copy the Railway URL.

6. Configure GHL webhook:
   - GHL → Settings → Integrations → Webhooks
   - URL: `https://your-railway-url.up.railway.app/webhook/ghl-payment`
   - Event: Payment Received

7. Configure Retell webhook:
   - app.retellai.com → your Aria agent → Webhook URL
   - URL: `https://your-railway-url.up.railway.app/webhook/retell`

## API Endpoints

### `GET /`
Health check — confirms the server is running.

**Response:**
```json
{
  "status": "online",
  "service": "Financial Healer Automation Server",
  "version": "1.0.0",
  "endpoints": ["/webhook/ghl-payment", "/webhook/retell"]
}
```

---

### `POST /webhook/ghl-payment`

Receives payment webhook from GoHighLevel after a Square payment.

**Request body:**
```json
{
  "contact": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+15551234567",
    "customFields": {
      "package": "Elevation"
    }
  },
  "payment": {
    "amount": 597.00,
    "timestamp": "2026-04-06T14:30:00Z"
  }
}
```

**Success response (200):**
```json
{
  "success": true,
  "message": "Client onboarding initiated",
  "client_name": "John Doe",
  "retell_call_id": "call_xxxxx",
  "notion_page_id": "page_xxxxx",
  "timestamp": "2026-04-06T14:30:05Z"
}
```

**Validation error (400):**
```json
{
  "success": false,
  "errors": ["Missing phone", "Invalid email format"]
}
```

---

### `POST /webhook/retell`

Receives call completion data from Retell AI when Aria finishes a call.

**Request body (Retell `call_ended` event):**
```json
{
  "event": "call_ended",
  "call_id": "call_xxxxx",
  "agent_id": "agent_xxxxx",
  "from_number": "+12162389148",
  "to_number": "+15551234567",
  "start_timestamp": 1680012345,
  "end_timestamp": 1680012645,
  "transcript": "Full call transcript...",
  "call_analysis": {
    "call_successful": true,
    "user_sentiment": "positive",
    "call_summary": "Client created all bureau accounts."
  },
  "metadata": {
    "client_name": "John Doe",
    "client_email": "john@example.com",
    "package": "Elevation"
  }
}
```

**Success response (200):**
```json
{
  "success": true,
  "message": "Call logged to Notion",
  "call_id": "call_xxxxx",
  "notion_log_id": "page_xxxxx"
}
```

## Testing Locally with curl

**Test GHL payment webhook:**
```bash
curl -X POST http://localhost:3000/webhook/ghl-payment \
  -H "Content-Type: application/json" \
  -d '{
    "contact": {
      "firstName": "Test",
      "lastName": "Client",
      "email": "test@example.com",
      "phone": "+15551234567",
      "customFields": {"package": "Elevation"}
    },
    "payment": {"amount": 597.00, "timestamp": "2026-04-06T14:30:00Z"}
  }'
```

**Test Retell call completion webhook:**
```bash
curl -X POST http://localhost:3000/webhook/retell \
  -H "Content-Type: application/json" \
  -d '{
    "event": "call_ended",
    "call_id": "call_test123",
    "from_number": "+12162389148",
    "to_number": "+15551234567",
    "start_timestamp": 1680012345,
    "end_timestamp": 1680012645,
    "transcript": "Hello, this is Aria...",
    "call_analysis": {
      "call_successful": true,
      "user_sentiment": "positive",
      "call_summary": "Client set up all accounts."
    },
    "metadata": {
      "client_name": "Test Client",
      "client_email": "test@example.com",
      "package": "Elevation"
    }
  }'
```

## Notion Database Requirements

### Client Pipeline Database
| Property Name | Type |
|---|---|
| Client Name | Title |
| Email | Email |
| Phone | Phone number |
| Package | Select (Elevation, VIP, Couples) |
| Status | Select |
| Payment Date | Date |
| Payment Amount | Number |
| Source | Rich text |
| Last Aria Call | Date |

### Aria Activity Log Database
| Property Name | Type |
|---|---|
| Client Name | Title |
| Call ID | Rich text |
| Phone Number | Phone number |
| Call Duration | Number (seconds) |
| Call Success | Checkbox |
| User Sentiment | Select (positive, neutral, negative) |
| Summary | Rich text |
| Transcript | Rich text |
| Package | Select |
| Timestamp | Date |

> **Note:** Property names in your Notion databases must match exactly (including capitalization and spacing) for the integration to work.

## Troubleshooting

**Retell call not triggering:**
- Verify `RETELL_API_KEY` is correct and not expired
- Confirm phone number includes country code (`+1...`)
- Check Railway logs: `railway logs`

**Notion record not created:**
- Verify `NOTION_API_KEY` integration has been shared with both databases
- Confirm database IDs are correct (no dashes — just the 32-char hex string)
- Ensure all property names match exactly

**GHL not sending webhooks:**
- Confirm the webhook URL in GHL matches your Railway domain exactly
- Test the webhook manually from GHL's webhook settings page
- Check GHL workflow is active and triggered by "Payment Received"

## License

Proprietary — The Financial Healer × Black Lotus Ventures
