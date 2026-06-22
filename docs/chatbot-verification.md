# Shifaa Chatbot — Manual Verification Notes

## Provider status

```bash
curl "http://localhost:3000/api/chatbot?status=1"
```

Expected when `.env` has `AI_PROVIDER=gemini` and `GEMINI_API_KEY`:

- `requested`: `"gemini"`
- `active`: `"gemini"`
- `configured`: `true`
- `fallbackUsed`: `false`
- `mockAllowed`: `false`

Mock must **not** appear unless `AI_PROVIDER=mock`.

## Arabic greeting (no mock)

Send: `مرحبا`

Expected: Shifaa greeting quick reply — **not** the mock echo message.

## Gemini failure

If `GEMINI_API_KEY` is invalid, the API should return an error JSON — **not** silently fall back to mock.

## Doctor search (real DB)

Send: `رشحلي دكتور جلدية`

Expected:

- Doctors returned only from `User` where `role=DOCTOR`, `verificationStatus=VERIFIED`, `accountStatus=ACTIVE`, `specialty` equals `Dermatology`
- Doctor cards in UI match database records

## Missing / unavailable specialty

Send: `عايز دكتور تخصص غير موجود`

Expected Arabic reply:

`هذا التخصص غير متوفر حالياً على منصة شفاء.`

## Symptom → confirm → doctors

1. `عندي ألم في العين`
2. Bot offers doctors for Ophthalmology
3. Reply: `نعم`

Expected: Ophthalmology doctors from database only.

## Uploaded report / image

Upload a lab PDF or X-ray with a short message.

Expected: Gemini vision/text analysis (not mock), cautious summary, no invented doctors.
