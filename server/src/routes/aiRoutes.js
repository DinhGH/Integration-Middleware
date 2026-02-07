const express = require("express");
const { GROQ_API_KEY } = require("../config/env");

const router = express.Router();

const DEFAULT_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const buildSystemPrompt = (context) => {
  const guide = typeof context?.siteGuide === "string" ? context.siteGuide : "";
  return [
    "You are a helpful AI assistant for the DataMall Store web app.",
    "Keep responses concise, friendly, and action-oriented.",
    "If unsure, ask a brief clarifying question.",
    guide,
  ]
    .filter(Boolean)
    .join("\n");
};

router.post("/ai/chat", async (req, res) => {
  if (!GROQ_API_KEY) {
    return res.status(500).json({ error: "Missing GROQ_API_KEY" });
  }

  const { messages, context } = req.body || {};
  if (!Array.isArray(messages)) {
    return res
      .status(400)
      .json({ error: "messages must be an array of chat messages" });
  }

  const sanitized = messages
    .filter((msg) => msg && typeof msg.content === "string")
    .map((msg) => ({
      role: msg.role === "assistant" ? "assistant" : "user",
      content: msg.content.trim(),
    }))
    .filter((msg) => msg.content.length > 0);

  if (!sanitized.length) {
    return res.status(400).json({ error: "No valid messages provided" });
  }

  try {
    const payload = {
      model: DEFAULT_MODEL,
      messages: [{ role: "system", content: buildSystemPrompt(context) }, ...sanitized],
      temperature: 0.4,
      max_tokens: 512,
    };

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(502).json({
        error: "Groq request failed",
        status: response.status,
        detail: data?.error?.message || data,
      });
    }

    const reply = data?.choices?.[0]?.message?.content || "";
    return res.json({ reply, model: data?.model || DEFAULT_MODEL, usage: data?.usage });
  } catch (error) {
    return res
      .status(502)
      .json({ error: "Groq request failed", detail: error?.message });
  }
});

module.exports = router;
