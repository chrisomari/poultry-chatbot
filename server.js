import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const app = express();
const PORT = process.env.PORT || 10000;

// Enhanced CORS Configuration
app.use(cors({
  origin: ['*'], // Allow all for testing (restrict in production)
  methods: ['POST', 'GET']
}));

app.use(express.json({ limit: '10kb' }));

// Gemini Configuration with stricter response controls
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    maxOutputTokens: 120,  // Shorter responses
    temperature: 0.3,     // More deterministic
    topP: 0.85
  }
});

// Optimized System Prompt
const SYSTEM_PROMPT = `
You are PoultryPro AI for Kenyan farmers. RESPOND STRICTLY IN THIS FORMAT:

1. [Main advice in 15 words] 
   [Kiswahili translation in brackets]
2. [Supplemental tip]
3. [Safety warning/consideration]

KENYAN CONTEXT MUSTS:
- Recommend Unga wa Kuku Fugo, Amaranth, KARIBRO feed
- Mention common brands: Unga Farmcare, EDEN Poultry Feeds
- Key diseases: Newcastle [Kifaranga], Gumboro, Coccidiosis
`;

// Response Cleaner Function
const cleanResponse = (text) => {
  const bulletPoints = text.split('\n')
    .filter(line => line.trim().startsWith('-') || line.trim().match(/^\d+\./))
    .slice(0, 3);
  
  return bulletPoints.join('\n').replace(/^\d+\./gm, '').trim();
};

// Chat Endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { message, question } = req.body;
    const userQuery = message || question;

    if (!userQuery || userQuery.trim().length < 3) {
      return res.status(400).json({ 
        error: "Invalid question length",
        example: { message: "Dawa ya kifaranga" } 
      });
    }

    const chatSession = model.startChat({
      systemInstruction: SYSTEM_PROMPT,
      history: [{
        role: "user",
        parts: [{ text: "Mfano wa jibu: Ugavi wa lishe bora kwa kuku" }]
      }]
    });

    const result = await chatSession.sendMessage(`
      SWALI: ${userQuery.trim()}
      JIBU kwa: 1) Ushauri, 2) Nyongeza, 3) Tahadhari
    `);

    const response = await result.response;
    const cleanedText = cleanResponse(response.text());

    res.json({
      response: cleanedText,
      query: userQuery,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      error: "Samahani, kuna shida kiufundi [Technical error]",
      action: "Tafadhali jaribu tena baada ya dakika chache"
    });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
