# Shifaa Chatbot & Admin AI Analytics — Implementation Report

## Executive summary

Production AI assistant for patients/doctors/admins with a **pluggable provider layer**, SSE streaming, bilingual UI, file analysis, and **Admin AI Analytics**. All AI keys stay **server-side only**.

### Cursor runtime API verdict

**Not available for in-app medical chat.**

Cursor Pro and the official [`@cursor/sdk`](https://cursor.com/docs/sdk/typescript) target **Cloud Agents** (code/repo automation), not consumer Q&A in a web application. A Cursor editor subscription does **not** include a production patient-chat API.

- `lib/chatbot/providers/cursor.js` documents this and never calls undocumented endpoints.
- When `AI_PROVIDER=cursor`, the system **automatically falls back** to Gemini → OpenAI → mock.
- **Recommended production provider:** `AI_PROVIDER=gemini` with `GEMINI_API_KEY`.

---

## 1. Frontend files (`components/chatbot/`)

| File | Purpose |
|------|---------|
| `index.jsx` | Public export |
| `chat-widget.jsx` | FAB + mounts panel (stable hooks) |
| `chat-panel.jsx` | Dialog shell — **always mounted** (hidden when closed) |
| `chat-messages.jsx` | Message list + typing indicator |
| `chat-markdown.jsx` | Markdown rendering (`react-markdown`) |
| `typing-indicator.jsx` | Animated typing dots |
| `chat-input.jsx` | Text input, send/stop |
| `chat-upload.jsx` | File + URL upload UI |
| `chat-recommendations.jsx` | Doctor cards / emergency banner |
| `use-chatbot.js` | Client state, SSE streaming, API calls |

**UI rule:** Input, send, upload, and URL analysis stay **enabled** even when AI is misconfigured. Errors appear **after send** from the backend.

Legacy shim: `components/shifaa-chatbot.jsx` → re-exports `@/components/chatbot`.

Mounted in: `app/layout.js`

---

## 2. Backend route (`app/api/chatbot/route.js`)

| Method | Purpose |
|--------|---------|
| `GET ?status=1` | Provider status (no secrets) |
| `GET ?conversationId=` | Conversation history |
| `POST` JSON | Chat (optional `stream: true` → SSE) |
| `POST` multipart | File / URL upload |

---

## 3. Provider adapters (`lib/chatbot/providers/`)

| File | Provider | Env vars |
|------|----------|----------|
| `index.js` | Selection + auto-fallback | `AI_PROVIDER` |
| `cursor.js` | Cursor (graceful fail) | `CURSOR_API_KEY`, `CURSOR_MODEL` |
| `gemini.js` | **Google Gemini (recommended)** | `GEMINI_API_KEY`, `GEMINI_MODEL` |
| `openai.js` | OpenAI chat completions | `OPENAI_API_KEY`, `OPENAI_MODEL` |
| `mock.js` | Local echo (always works) | `AI_PROVIDER=mock` |
| `openai-compatible.js` | Shared OpenAI SSE helper | — |
| `generic-provider.js` | Deprecated alias → openai | — |

### Provider selection & fallback

```
AI_PROVIDER (default: gemini)
    │
    ├─ cursor → if unavailable → gemini → openai → mock
    ├─ gemini / openai → if key missing → next in chain → mock
    └─ mock → always works
```

Switch providers by editing `.env` only and restarting the server.

### Switching providers

| From | To | Change in `.env` |
|------|-----|------------------|
| Gemini | OpenAI | `AI_PROVIDER=openai` + `OPENAI_API_KEY=...` |
| OpenAI | Gemini | `AI_PROVIDER=gemini` + `GEMINI_API_KEY=...` |
| Cursor | Gemini | `AI_PROVIDER=gemini` (Cursor auto-falls back anyway) |
| Any | Mock/test | `AI_PROVIDER=mock` |

---

## 4. Chatbot logic (`lib/chatbot/`)

| Path | Role |
|------|------|
| `service.js` | Chat orchestration, history, streaming |
| `auth.js` | Clerk auth + conversation ACL |
| `prompts/system.js` | Role-aware system prompts |
| `safety/triage.js` | Urgency + red flags |
| `safety/guardrails.js` | Disclaimers, sanitization |
| `recommendations/doctors.js` | Verified doctor ranking |
| `intake/summary.js` | Pre-visit intake summaries |
| `context/role-context.js` | Patient/doctor/admin context |
| `files/storage.js` | Uploads, PDF/DOCX/TXT/image, SSRF-safe URLs |

---

## 5. Admin AI Analytics

### Frontend 

| Path | Role |
|------|------|
| `components/admin/analytics/admin-analytics-panel.jsx` | Ask AI, stream results, download report |
| Admin tab | `admin` → **AI Analytics** (`admin-tabs-nav.jsx`) |

### Backend

| Path | Role |
|------|------|
| `app/api/admin/analytics/route.js` | Admin-only API (SSE + export) |
| `lib/chatbot/analytics/queries.js` | Safe read-only DB metrics |
| `lib/chatbot/analytics/formatter.js` | Prompt context + structured report |
| `lib/chatbot/analytics/service.js` | AI narrative + `{ summary, insights, metrics, recommendations }` |
| `lib/chatbot/analytics/cache.js` | 60s in-memory cache |

### Security model

- `verifyAdmin()` required on every analytics request.
- AI **never** runs raw SQL; only predefined Prisma aggregations.
- No individual patient PHI — counts, specialties, governorates, doctor names with aggregated bookings only.
- Uses same `getChatProvider()` as chatbot.

### Example admin prompts

- "Analyze number of users this month"
- "Generate doctor performance report for Dr. Ahmed"
- "Summarize top booked specialties"
- "Identify peak booking times"

### Report output shape

```json
{
  "summary": "...",
  "insights": ["..."],
  "metrics": { "totalPatients": 0, "appointmentsInRange": 0 },
  "recommendations": [],
  "doctorPerformance": [],
  "generatedAt": "ISO8601"
}
```

Download exports `.txt` (JSON or narrative). Use browser Print → Save as PDF for PDF.

---

## 6. Streaming architecture

1. Client POST `{ stream: true }` to `/api/chatbot` or `/api/admin/analytics`
2. Server returns `text/event-stream`
3. Events: `{ type: "delta", text: "..." }` then `{ type: "done", ... }`
4. Terminal: `data: [DONE]`

---

## 7. Localization

- UI strings: `lib/dictionaries/en.js` + `ar.js` under `chatbot.*` and `admin.analytics*`
- Locale cookie drives `locale` in API payloads
- System prompts instruct model to reply in user's language

---

## 8. Environment variables

See `env.example`. Minimum for production:

```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your-key
GEMINI_MODEL=gemini-2.5-flash
```

---

## 9. Testing checklist

| Test | Steps |
|------|-------|
| Mock provider | `AI_PROVIDER=mock`, send chat message |
| Gemini | Set `GEMINI_API_KEY`, English + Arabic chat |
| OpenAI | `AI_PROVIDER=openai`, verify streaming |
| Cursor fallback | `AI_PROVIDER=cursor`, confirm fallback banner + mock/Gemini response |
| PDF upload | Attach PDF, ask to explain |
| DOCX upload | Attach .docx |
| URL analysis | Paste public HTTPS file URL |
| Admin analytics | Sign in as admin → AI Analytics tab |
| Misconfigured AI | Remove keys, UI still accepts input, error on send |
| Lint/build | `npm run lint` && `npm run build` |

---

## 10. Remaining recommendations

1. Object storage (S3/R2) for multi-instance deploys
2. Rate limiting on `/api/chatbot` and `/api/admin/analytics`
3. Multimodal Gemini for image uploads
4. Server-side PDF report generation (e.g. `@react-pdf/renderer`)
5. Doctor dashboard view for `ChatIntakeSummary`
6. Redis cache for analytics in production

---

## Tests run (this implementation)

- `npm install react-markdown remark-gfm mammoth pdf-parse`
- `npm run lint` — 0 errors (3 pre-existing warnings)
- `npm run build` — pass
