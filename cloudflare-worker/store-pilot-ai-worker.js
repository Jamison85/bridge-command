const ALLOWED_ORIGINS = new Set([
  "https://jamison85.github.io",
  "http://localhost:5173",
  "http://localhost:3000"
]);

function corsHeaders(request) {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.has(origin) ? origin : "https://jamison85.github.io";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function jsonResponse(request, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(request),
      "Content-Type": "application/json"
    }
  });
}

function buildPrompt(payload) {
  const prefs = payload.prefs || {};
  const review = payload.review || {};
  const brain = payload.brain || {};
  return `You are Store Pilot, a calm retail shift assistant for Jamison, a Casey's center store manager.

Write one professional manager handoff message.

Rules:
- Do not invent completed work.
- Keep it sincere, clear, and useful.
- Match the recipient and tone.
- Mention store status, what moved forward, what still needs attention, the recommended next move, and why.
- If there were delays, explain them without sounding defensive.
- Keep it text-message friendly.

Recipient: ${prefs.recipient || "loretta"}
Tone: ${prefs.tone || "positive"}
Shift: ${review.shift || "unknown"}
Store status: ${brain.status || "Yellow"}
Recommended next: ${brain.next?.title || "Final walk and handoff note"}
Why: ${brain.reason || "Use the highest-impact next move."}

Shift context JSON:
${JSON.stringify({ prefs, review, brain }, null, 2)}`;
}

function getGeminiText(data) {
  if (typeof data?.output_text === "string") return data.output_text;
  if (typeof data?.text === "string") return data.text;
  if (typeof data?.message === "string") return data.message;

  const chunks = [];
  const visit = (value) => {
    if (!value || typeof value !== "object") return;
    if (typeof value.text === "string") chunks.push(value.text);
    if (Array.isArray(value)) value.forEach(visit);
    else Object.values(value).forEach(visit);
  };
  visit(data?.steps || data?.output || data?.candidates || data);
  return chunks.join("\n").trim();
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders(request) });
    if (request.method !== "POST") return jsonResponse(request, { error: "POST only" }, 405);
    if (!env.GEMINI_API_KEY) return jsonResponse(request, { error: "Missing GEMINI_API_KEY secret" }, 500);

    let payload;
    try {
      payload = await request.json();
    } catch {
      return jsonResponse(request, { error: "Invalid JSON" }, 400);
    }

    const prompt = buildPrompt(payload);
    const model = env.GEMINI_MODEL || "gemini-3.5-flash";

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        model,
        input: prompt,
        system_instruction: "Return JSON only with keys: message, storeStatus, recommendedNext, why.",
        generation_config: {
          temperature: 0.7,
          thinking_level: "low"
        }
      })
    });

    const rawText = await response.text();
    let data = {};
    try { data = JSON.parse(rawText); } catch { data = { output_text: rawText }; }

    if (!response.ok) {
      return jsonResponse(request, { error: "Gemini API error", details: data }, response.status);
    }

    const text = getGeminiText(data);
    let parsed = null;
    try {
      parsed = JSON.parse(text.replace(/^```json\s*/i, "").replace(/```$/i, "").trim());
    } catch {
      parsed = { message: text };
    }

    return jsonResponse(request, {
      message: parsed.message || text,
      storeStatus: parsed.storeStatus || payload.brain?.status || "Yellow",
      recommendedNext: parsed.recommendedNext || payload.brain?.next?.title || "Final walk and handoff note",
      why: parsed.why || payload.brain?.reason || "AI handoff generated from Store Pilot shift context.",
      provider: "gemini",
      model
    });
  }
};
