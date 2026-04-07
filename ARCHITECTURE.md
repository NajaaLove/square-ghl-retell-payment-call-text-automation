# Architecture

## This Repo's Scope

This server owns one thing: **receive a Square payment webhook from GHL and kick off client onboarding.**

```
Square payment
      ↓
GHL workflow fires POST /webhook/square-payment
      ↓
      ├──► Retell AI: Aria calls the client
      └──► Notion: create record in Client Pipeline (Stage: "Payment Received")
```

Everything after the Aria call (call logging, status updates, Mahad notification) is handled by the **separate Retell webhook service** (`financial-healer-square-retell-notion-automation`).

---

## Full Business Flow

```
Client pays on Square ($597 / $997 / $1,500)
      ↓
GHL receives payment
      ↓
GHL workflow:
  1. Send welcome SMS    ← GHL native
  2. Send welcome email  ← GHL native
  3. Wait 5 minutes
  4. POST /webhook/square-payment  ← THIS REPO
      ↓
Railway (this server):
  ├── Retell API → Aria dials client
  └── Notion API → Client Pipeline record created
      ↓
Aria call completes
      ↓
Retell webhook → OTHER Railway service
  ├── Aria Activity Log entry created
  └── Client Stage updated → "Credentials Complete"
      ↓
Mahad notified → starts disputes work
```

---

## Files

```
server.js                      Express app, single endpoint
routes/square-payment.js       Webhook handler — validates, calls Retell, creates Notion record
services/retell.js             Retell API v2 — createOutboundCall()
services/notion.js             Notion API — createClientRecord()
utils/validators.js            validateGHLPayload()
utils/logger.js                Structured JSON logger
tests/webhook.test.js          Jest unit tests
```

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `RETELL_API_KEY` | Authenticate with Retell API |
| `RETELL_AGENT_ID` | Aria's agent ID |
| `RETELL_FROM_NUMBER` | `+12162389148` — Aria's number |
| `NOTION_API_KEY` | Authenticate with Notion API |
| `NOTION_DATABASE_ID_CLIENT_PIPELINE` | `f44bb10bbc5882c684f2075660d5190c` |

---

## Error Handling

| Failure | Behaviour |
|---|---|
| Retell API fails | Log error, continue to create Notion record |
| Notion API fails | Return 500 — GHL can retry |
| Invalid payload | Return 400 with specific field errors |
