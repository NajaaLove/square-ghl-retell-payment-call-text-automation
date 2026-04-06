# System Architecture

## Overview

The Financial Healer automation server is a lightweight Node.js/Express API that coordinates three external systems:

| System | Role |
|---|---|
| **GoHighLevel (GHL)** | CRM — fires webhook after Square payment |
| **Retell AI** | AI voice platform — runs Aria outbound calls |
| **Notion** | Ops database — Client Pipeline + Aria Activity Log |

---

## Data Flow

### Step 1 — Payment → Onboarding Call (THIS REPO)

```
Client pays on Square ($597 Elevation / $997 VIP / $1,200 Couples)
        │
        ▼
GHL receives "Payment Received" from Square integration
        │
        ▼
GHL Workflow fires POST /webhook/ghl-payment to THIS Railway service
        │
        ├──► Notion: create page in Client Pipeline database
        │           Status: "Payment Received - Calling Now"
        │
        └──► Retell AI: create outbound call (Aria → client)
        │
        ▼
Railway returns 200 OK to GHL
```

### Step 2 — Call Completion → Ready for Disputes (SEPARATE REPO / RAILWAY SERVICE)

```
Aria finishes call with client
        │
        ▼
Retell AI fires POST /webhook/retell to the OTHER Railway service
(financial-healer-square-retell-notion-automation)
        │
        ├──► Notion: create page in Aria Activity Log database
        │
        └──► Notion: update client Status → "Credentials Submitted - Ready for Mahad"
        │
        ▼
Mahad sees updated status in Notion → begins disputes work
```

---

## File Responsibilities

```
server.js                   Express app setup, middleware, route mounting
├── routes/ghl-webhook.js   Orchestrates: validate → Retell call → Notion record
├── routes/retell-webhook.js Orchestrates: Notion log → update client status
├── services/retell.js      Retell API v2 — createOutboundCall()
├── services/notion.js      Notion API — createClientRecord(), createAriaLogEntry(),
│                           findClientByEmail(), updateClientStatus()
├── services/ghl.js         GHL API — sendSMS() (optional, for future use)
├── utils/logger.js         Structured JSON logging (INFO / ERROR / WEBHOOK)
└── utils/validators.js     validateGHLPayload() — returns { valid, errors }
```

---

## Error Handling Strategy

| Failure Point | Behavior |
|---|---|
| Retell API call fails | Log error, **continue** to create Notion record — call is non-blocking |
| Notion client record fails | Return 500 to GHL; GHL can retry |
| Client not found in pipeline (Retell webhook) | Log warning, still create Aria log entry |
| Invalid GHL payload | Return 400 immediately with specific field errors |
| Unknown Retell event type | Return 200 with "no action taken" — don't error on future event types |

---

## Security Considerations

**Current (MVP):**
- Accepts all POST requests to webhook endpoints
- Validates payload structure and field formats
- API keys stored in Railway environment variables — never in code or git

**Planned Enhancements:**
- Add Retell webhook signature verification (`x-retell-signature` header)
- Add GHL webhook secret validation
- Rate limiting per IP

---

## Notion Data Model

### Client Pipeline Database

| Property | Notion Type | Set By |
|---|---|---|
| Client Name | Title | GHL webhook |
| Email | Email | GHL webhook |
| Phone | Phone number | GHL webhook |
| Package | Select | GHL webhook |
| Status | Select | GHL webhook / Retell webhook |
| Payment Date | Date | GHL webhook |
| Payment Amount | Number | GHL webhook |
| Source | Rich text | GHL webhook (always "Square → GHL → Railway") |
| Last Aria Call | Date | Retell webhook |

**Status lifecycle:**
```
"Payment Received - Calling Now"  →  "Credentials Submitted - Ready for Mahad"
        (set by this repo)               (set by the Retell webhook repo)
```

### Aria Activity Log Database

| Property | Notion Type | Set By |
|---|---|---|
| Client Name | Title | Retell webhook |
| Call ID | Rich text | Retell webhook |
| Phone Number | Phone number | Retell webhook |
| Call Duration | Number (seconds) | Retell webhook |
| Call Success | Checkbox | Retell webhook |
| User Sentiment | Select | Retell webhook |
| Summary | Rich text | Retell webhook |
| Transcript | Rich text | Retell webhook (truncated to 2000 chars) |
| Package | Select | Retell webhook (from call metadata) |
| Timestamp | Date | Retell webhook |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `RETELL_API_KEY` | Yes | Retell API key from app.retellai.com |
| `RETELL_AGENT_ID` | Yes | Aria agent ID |
| `RETELL_FROM_NUMBER` | Yes | `+12162389148` |
| `NOTION_API_KEY` | Yes | Notion integration secret |
| `NOTION_DATABASE_ID_CLIENT_PIPELINE` | Yes | `f44bb10bbc5882c684f2075660d5190c` |
| `NOTION_DATABASE_ID_ARIA_LOG` | Yes | `4c9bb10bbc58822fb0960749097b280a` |
| `GHL_API_KEY` | No | For optional SMS via GHL |
| `PORT` | No | Default `3000` (Railway sets automatically) |

---

## Scaling & Cost

- Railway Starter plan (~$5/month) handles current volume comfortably
- Auto-scales horizontally as call volume grows
- No database or queue needed — each webhook is stateless
- Notion rate limit: 3 requests/second — well within normal onboarding volume
- Retell rate limit: governed by plan tier
