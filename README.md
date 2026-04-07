# The Financial Healer — Square Payment Webhook

Receives Square payment webhooks from GoHighLevel, triggers an Aria (Retell AI) outbound call to the client, and creates a client record in Notion.

## What This Does

```
Client pays on Square ($597 / $997 / $1,500)
        ↓
GHL receives payment → fires webhook to Railway
        ↓
This server receives the webhook and:
  1. Triggers Aria (Retell AI) to call the client
  2. Creates a record in Notion Client Pipeline
```

## Endpoint

### `POST /webhook/square-payment`

**Request body (sent by GHL workflow):**
```json
{
  "contact": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+15551234567",
    "customFields": {
      "package": "VIP"
    }
  },
  "payment": {
    "amount": 997.00,
    "timestamp": "2026-04-07T10:00:00Z"
  }
}
```

**Success response:**
```json
{
  "success": true,
  "message": "Client onboarding initiated",
  "client_name": "John Doe",
  "retell_call_id": "call_xxxxx",
  "notion_page_id": "page_xxxxx",
  "timestamp": "2026-04-07T10:00:05Z"
}
```

## Environment Variables

```bash
RETELL_API_KEY=                          # app.retellai.com → Settings → API Keys
RETELL_AGENT_ID=                         # Aria agent ID
RETELL_FROM_NUMBER=+12162389148          # Aria's phone number

NOTION_API_KEY=                          # Notion integration secret
NOTION_DATABASE_ID_CLIENT_PIPELINE=f44bb10bbc5882c684f2075660d5190c
```

## Package Mapping

GHL package names are mapped to Notion select options:

| GHL sends | Notion receives |
|---|---|
| `Elevation` | `VIP - $997` |
| `VIP` | `VIP - $997` |
| `Couples` | `Couples - $1200` |
| `1 Round` | `1 Round - $150` |
| `2 Rounds` | `2 Rounds - $297` |
| `3 Rounds` | `3 Rounds - $297+` |

## Notion Client Pipeline — Fields Written

| Property | Value |
|---|---|
| Client Name | Full name |
| Stage | `Payment Received` |
| Package | Mapped from GHL package name |
| Credentials Status | `Not Started` |
| Last Updated By | `System` |
| Date Started | Payment timestamp |

## Local Development

```bash
npm install
cp .env.example .env   # fill in real values
npm run dev
```

## Test with curl

```bash
curl -X POST http://localhost:3000/webhook/square-payment \
  -H "Content-Type: application/json" \
  -d '{
    "contact": {
      "firstName": "Test",
      "lastName": "Client",
      "email": "test@example.com",
      "phone": "+15551234567",
      "customFields": {"package": "VIP"}
    },
    "payment": {"amount": 997.00, "timestamp": "2026-04-07T10:00:00Z"}
  }'
```

## GHL Workflow

The GHL workflow that fires this webhook:

```
Trigger: Square payment received
        ↓
Action 1: Send welcome SMS
        ↓
Action 2: Send welcome email
        ↓
Action 3: Wait 5 minutes
        ↓
Action 4: POST /webhook/square-payment  ← this server
```

The workflow only fires on first payment (gated by the `new-client-paid` tag in GHL).

## Deployment

Railway — connected to this GitHub repo, auto-deploys on push to `main`.
