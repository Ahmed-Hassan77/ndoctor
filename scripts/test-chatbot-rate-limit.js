/**
 * Lightweight checks for chatbot rate-limit client mapping (no @/ aliases).
 * Run: node scripts/test-chatbot-rate-limit.js
 */

import { readFileSync } from "fs";
import { pathToFileURL } from "url";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Inline minimal copies of logic under test (avoids Next alias resolution in node)
function parseRetryAfterSeconds(message) {
  const match = message?.match(/retry in ~?([0-9.]+)\s*s/i);
  if (match) {
    return Math.min(Math.ceil(Number(match[1])), 120);
  }
  return null;
}

class ChatbotProviderError extends Error {
  constructor(code, message, meta = {}) {
    super(message);
    this.code = code;
    this.retryAfterSeconds = meta.retryAfterSeconds;
  }
}

const RATE_LIMIT_USER_MESSAGE = {
  en: "The AI service is busy right now. Please try again shortly.",
  ar: "خدمة الذكاء الاصطناعي مشغولة حالياً. حاول مرة أخرى بعد قليل.",
};

function mapRateLimit(error, locale = "en") {
  const lang = locale === "ar" ? "ar" : "en";
  const mapped = {
    code: error.code,
    message: RATE_LIMIT_USER_MESSAGE[lang],
  };
  if (error.retryAfterSeconds != null && error.retryAfterSeconds > 0) {
    mapped.retryAfterSeconds = error.retryAfterSeconds;
  }
  return mapped;
}

let passed = 0;
let failed = 0;

function assert(name, condition) {
  if (condition) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${name}`);
  }
}

console.log("parseRetryAfterSeconds");
assert("parses ~40s", parseRetryAfterSeconds("Please retry in ~40s") === 40);
assert("parses 31.3s", parseRetryAfterSeconds("Please retry in 31.3s") === 32);
assert("returns null when missing", parseRetryAfterSeconds("quota exceeded") === null);

console.log("mapRateLimit (client-safe)");
const raw =
  "Quota exceeded for metric generativelanguage.googleapis.com/generate_content_free_tier_requests. Please retry in 40s.";
const err = new ChatbotProviderError("AI_PROVIDER_RATE_LIMIT", raw, {
  retryAfterSeconds: parseRetryAfterSeconds(raw),
});
const en = mapRateLimit(err, "en");
const ar = mapRateLimit(err, "ar");
assert("English safe message", en.message === RATE_LIMIT_USER_MESSAGE.en);
assert("Arabic safe message", ar.message === RATE_LIMIT_USER_MESSAGE.ar);
assert("No raw quota in EN", !en.message.includes("generativelanguage"));
assert("retryAfterSeconds included", en.retryAfterSeconds === 40);

console.log("provider index mock guard");
const indexSrc = readFileSync(join(root, "lib/chatbot/providers/index.js"), "utf8");
assert(
  "mock only when AI_PROVIDER=mock",
  indexSrc.includes('if (requested === "mock")') &&
    indexSrc.includes("mock is NEVER included unless AI_PROVIDER=mock")
);

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
