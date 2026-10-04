// The Grove Guide's private middleman, as a Cloudflare Worker, so the AI chat works for everyone
// on the published site. It holds the Gemini API key as a secret (GEMINI_API_KEY) that browsers
// never see, only accepts requests from the site's own address (ALLOWED_ORIGINS), and builds the
// prompt itself so it cannot be used as a general-purpose AI for anything else.
// Setup steps: README → "Journey report and Grove Guide".
//
// The prompts and limits here match start-grove-server.py (the laptop version); change both together.

const MODEL = "gemini-flash-lite-latest"; // Google's cheapest current model; plenty for short reports.

// Cost limits. Each report allows 8 questions (enforced in the browser); the Worker also refuses
// oversized requests and more than 30 requests per hour from one address.
const MAX_MESSAGES = 16;
const MAX_MESSAGE_CHARS = 500; // a player's question
const MAX_REPLY_CHARS = 2000; // an earlier Guide reply sent back as conversation history
const MAX_REPORT_CHARS = 15000;
const MAX_OUTPUT_TOKENS = { summary: 450, chat: 350 };
const REQUESTS_PER_HOUR = 30;
const FREE_LIMIT_MESSAGE = "The Grove Guide has answered a lot of questions today and is resting. Please try again later or tomorrow!";

const SYSTEM_PROMPT = `You are the Grove Guide, a warm, encouraging mentor inside "Into the Unknown", a \
choose-your-own-adventure game where a princess crosses an enchanted forest to rescue a prince. \
The game teaches young players money ideas: needs versus wants, opportunity cost, saving, \
interest, risk, insurance, scams, and the value of time, relationships, and information.

Below is the player's journey report as JSON. The game calculated the score and each choice's \
rating ("wise", "fair", "risky") from its answer key, with the reason in "why" and better \
choices that were available in "wiserOptions". Treat these as correct; do not re-score or dispute them.

Rules:
- Speak to the player directly as "you". Use friendly, simple language suitable for ages 10 to 16.
- Ground every point in specific choices and outcomes from the report.
- Be honest about risky choices but kind and encouraging; never shame the player.
- Connect choices to the real-world money idea behind them, with short everyday examples.
- This is a learning game, not personal financial advice. Do not recommend real financial \
products, companies, or investments.
- Only discuss this journey and the money ideas in it. If asked about anything else, \
kindly steer back to the journey.
- Never ask for personal information such as names, ages, addresses, or contact details.
- Keep answers short: at most about 120 words in chat. Use plain text; use "- " for bullet points.

Journey report:
`;

const SUMMARY_REQUEST = `Write my journey reflection in plain text, under 170 words:
- one opening sentence about my journey overall and my score,
- the line "What you did well:" followed by 2 or 3 bullet points,
- the line "What to try next time:" followed by 2 or 3 bullet points,
- one encouraging closing sentence.`;

// Best-effort limit per address. Each Worker instance keeps its own count, so for a hard limit
// also add a Cloudflare rate limiting rule (see the README).
const recentRequests = new Map();
function allowRequest(address) {
  const now = Date.now();
  const times = (recentRequests.get(address) ?? []).filter((time) => now - time < 3600_000);
  if (times.length >= REQUESTS_PER_HOUR) return false;
  times.push(now);
  recentRequests.set(address, times);
  return true;
}

function buildGeminiRequest(body) {
  const { mode, report, messages = [] } = body ?? {};
  if (!(mode in MAX_OUTPUT_TOKENS) || !report || typeof report !== "object" || !Array.isArray(messages)) {
    throw new Error("Invalid request.");
  }
  const reportJson = JSON.stringify(report);
  if (reportJson.length > MAX_REPORT_CHARS) throw new Error("This report is too large.");

  let contents;
  if (mode === "summary") {
    contents = [{ role: "user", parts: [{ text: SUMMARY_REQUEST }] }];
  } else {
    if (!messages.length || messages.length > MAX_MESSAGES) throw new Error("This conversation has reached its limit.");
    contents = messages.map((message) => {
      const { role, text } = message ?? {};
      if (!["user", "model"].includes(role) || typeof text !== "string" || !text.trim()) throw new Error("Invalid message.");
      return { role, parts: [{ text: text.slice(0, role === "model" ? MAX_REPLY_CHARS : MAX_MESSAGE_CHARS) }] };
    });
    if (contents.at(-1).role !== "user") throw new Error("Invalid conversation.");
  }

  return {
    system_instruction: { parts: [{ text: SYSTEM_PROMPT + reportJson }] },
    contents,
    generationConfig: { maxOutputTokens: MAX_OUTPUT_TOKENS[mode], temperature: 0.6 }
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") ?? "";
    const allowed = (env.ALLOWED_ORIGINS ?? "").split(",").map((entry) => entry.trim()).filter(Boolean);
    // Anyone running the code on their own computer (Live Server, start-grove-server.py, any port)
    // can use the Guide too, so teammates and judges need no key of their own.
    const isAllowed = allowed.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const cors = {
      "Access-Control-Allow-Origin": isAllowed ? origin : allowed[0] ?? "",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      Vary: "Origin"
    };
    const reply = (status, data) => new Response(JSON.stringify(data), { status, headers: { ...cors, "Content-Type": "application/json" } });

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST" || new URL(request.url).pathname !== "/api/grove-guide") return reply(404, { error: "Not found." });
    if (!isAllowed) return reply(403, { error: "This site is not allowed to use the Grove Guide." });
    if (!allowRequest(request.headers.get("CF-Connecting-IP") ?? "unknown")) {
      return reply(429, { error: "The Grove Guide needs a short rest. Please try again later." });
    }

    let payload;
    try {
      const text = await request.text();
      if (text.length > 40000) throw new Error("This request is too large.");
      payload = buildGeminiRequest(JSON.parse(text));
    } catch (error) {
      return reply(400, { error: error instanceof SyntaxError ? "Invalid request." : error.message });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
      body: JSON.stringify(payload)
    }).catch(() => null);
    // On Google's free tier, running out of the daily allowance returns 429; nothing is charged.
    if (response?.status === 429) return reply(429, { error: FREE_LIMIT_MESSAGE });
    if (!response?.ok) {
      console.log("Gemini error", response?.status, await response?.text().catch(() => ""));
      return reply(502, { error: "The Grove Guide could not answer right now. Please try again." });
    }
    const data = await response.json();
    const text = (data.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join("").trim();
    if (!text) return reply(502, { error: "The Grove Guide had nothing to say to that. Try asking another way." });
    return reply(200, { text });
  }
};
