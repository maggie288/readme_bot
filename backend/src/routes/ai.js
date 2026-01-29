import express from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Ask AI a question about the document
router.post('/ask', authenticateToken, async (req, res) => {
  try {
    const { question, documentContent } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({
        error: 'AI service not configured. Please add ANTHROPIC_API_KEY to environment variables.'
      });
    }

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: documentContent
            ? `Based on this document:\n\n${documentContent}\n\nQuestion: ${question}`
            : question,
        },
      ],
    });

    const answer = message.content[0].text;

    res.json({ answer });
  } catch (error) {
    console.error('AI ask error:', error);

    if (error.status === 401) {
      return res.status(401).json({ error: 'Invalid API key' });
    }

    res.status(500).json({ error: 'Failed to get AI response' });
  }
});

export default router;
