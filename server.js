import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config'; // Simplified config loading

const app = express();
const PORT = process.env.PORT || 10000; // Render uses port 10000

// Enhanced CORS for production
app.use(cors({
  origin: [
    'https://your-mobile-app.com', // Your production app URL
    'capacitor://localhost',       // Capacitor mobile scheme
    'http://localhost:3000'       // Local development
  ],
  methods: ['POST', 'GET']
}));

app.use(express.json());

// Gemini Configuration
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    maxOutputTokens: 150,
    temperature: 0.3,
    topP: 0.95
  }
});

// System Prompt with Kenyan Focus
const SYSTEM_PROMPT = `
You are PoultryPro, an expert AI for Kenyan farmers. Rules:

1. **Response Format**:
   - 3 bullet points max (15 words each)
   - Swahili translations in brackets [Kiswahili]
   - Example: "Vaccinate day 7 [Chanjo ya siku 7]"

2. **Kenyan Context**:
   - Breeds: Kuroiler, Kari Improved Kienyeji
   - Feeds: Unga wa Kuku Fugo (18% protein)
   - Vaccines: Newcastle [Kifaranga], Gumboro

3. **Safety**:
   - Never recommend unverified treatments
   - Default: "Consult your vet about..."
`;

// API Endpoints
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    endpoints: {
      chat: 'POST /api/chat',
      health: 'GET /health'
    },
    docs: 'https://github.com/your-repo/docs'
  });
});

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime() 
  });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || message.length < 2) {
      return res.status(400).json({ error: "Invalid question" });
    }

    const result = await model.generateContent({
      contents: [{
        parts: [
          { text: SYSTEM_PROMPT },
          { text: `KENYAN FARMER QUESTION: ${message}` }
        ]
      }]
    });

    const response = await result.response;
    res.json({
      response: response.text(),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({
      error: "Samahani, jaribu tena baadaye", // Swahili apology
      requestId: req.id,
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
});

// Production Error Handling
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

// Start Server
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Server terminated');
    process.exit(0);
  });
});
