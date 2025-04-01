import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import cors from 'cors';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    status: 'running',
    apiKeyConfigured: !!process.env.GEMINI_API_KEY,
    serverTime: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    geminiReady: !!process.env.GEMINI_API_KEY 
  });
});

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    // Validate input
    if (!req.body.question) {
      return res.status(400).json({ error: "Question is required" });
    }

    console.log("Processing question:", req.body.question);

    // Generate content
    const result = await model.generateContent({
      contents: [{
        parts: [
          { text: "You are a poultry farming assistant for Kenyan farmers. Respond in 3 concise bullet points with Swahili translations." },
          { text: req.body.question }
        ]
      }]
    });

    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error("Empty response from Gemini API");
    }

    res.json({
      response: text,
      query: req.body.question,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("API Error:", error);
    res.status(500).json({
      error: "Failed to process question",
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Gemini API ready: ${!!process.env.GEMINI_API_KEY}`);
});

// Error handling
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});
