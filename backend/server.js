require("dotenv").config();
const express = require("express");
const cors = require("cors");
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.json());

function loadVendors() {
  const filePath = path.join(__dirname, "vendors.xlsx");
  if (!fs.existsSync(filePath)) return getSampleVendors();
  try {
    const workbook = XLSX.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(sheet);
  } catch (err) {
    return getSampleVendors();
  }
}

function getSampleVendors() {
  return [
    { "Vendor Name": "Aura Interiors", Service: "Full Home Interior", "Budget Range": "2-4 Lakh", Rating: 4.8, Phone: "+91-9876501001", City: "Bangalore" },
    { "Vendor Name": "DesignNest Studio", Service: "Modular Kitchen", "Budget Range": "1-3 Lakh", Rating: 4.5, Phone: "+91-9876501002", City: "Bangalore" },
    { "Vendor Name": "Luxe Living Co.", Service: "Premium Interior Design", "Budget Range": "8-15 Lakh", Rating: 4.9, Phone: "+91-9876501003", City: "Bangalore" },
    { "Vendor Name": "HomeHaven Decor", Service: "Living Room Makeover", "Budget Range": "1-2 Lakh", Rating: 4.3, Phone: "+91-9876501004", City: "Bangalore" },
    { "Vendor Name": "Craftopia Interiors", Service: "Full Home Interior", "Budget Range": "3-6 Lakh", Rating: 4.6, Phone: "+91-9876501005", City: "Bangalore" },
    { "Vendor Name": "Zen Spaces", Service: "Minimalist Interior", "Budget Range": "2-5 Lakh", Rating: 4.4, Phone: "+91-9876501007", City: "Bangalore" },
    { "Vendor Name": "Elara Designs", Service: "Full Home Interior", "Budget Range": "5-10 Lakh", Rating: 4.8, Phone: "+91-9876501009", City: "Bangalore" },
    { "Vendor Name": "WoodCraft Interiors", Service: "Furniture & Woodwork", "Budget Range": "1-4 Lakh", Rating: 4.6, Phone: "+91-9876501010", City: "Bangalore" },
  ];
}

function buildSystemPrompt(vendors) {
  const vendorJSON = JSON.stringify(vendors, null, 2);
  return `You are Tatva — TatvaOps's intelligent interior design assistant. You help customers discover, compare, and connect with verified interior design vendors across India.

You have access to the following vendor data:
${vendorJSON}

## Your Personality
- Warm, professional, and conversational
- Occasionally use emojis (👍 ⭐ 📞 🏠 ✨) — but don't overdo it
- Speak like a knowledgeable friend helping someone make a good decision
- Never sound robotic or say things like "based on dataset" or "according to data"

## How You Respond
**Vendor Discovery**: Recommend the best matching vendors. Explain WHY each fits (budget, rating, specialty). Format as bullet points.
**Smart Recommendation**: When asked "which is best?" — pick ONE vendor and explain confidently.
**Comparison**: Create a clear structured comparison of 2-3 vendors.
**Contact Info**: Share vendor phone number naturally.
**FAQ / TatvaOps Process**: Milestone-based payments, verified vendors, no upfront risk, end-to-end support.

## Always End With a Helpful Nudge
After every response add one suggestion like:
- "Would you like me to compare these two?"
- "Want me to pick the best one for you?"
- "Shall I share their contact details?"

## Important Rules
- Never make up vendors not in the data
- Keep responses concise but complete
- Always mention vendor names clearly`;
}

app.post("/chat", async (req, res) => {
  const { message, history = [] } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "No GROQ_API_KEY found in .env file" });

  const vendors = loadVendors();
  const systemPrompt = buildSystemPrompt(vendors);
  const messages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  try {
    const reply = await callGroq(systemPrompt, messages, apiKey);
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: "AI request failed: " + err.message });
  }
});

async function callGroq(systemPrompt, messages, apiKey) {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      temperature: 0.7,
      max_tokens: 800,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Groq error");
  return data.choices[0].message.content;
}

app.get("/health", (req, res) => {
  res.json({ status: "ok", vendorsLoaded: loadVendors().length });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ TatvaOps backend running on http://localhost:${PORT}`);
});