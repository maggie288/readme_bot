import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Lingva API base URL (free translation service)
const LINGVA_API = 'https://lingva.ml/api/v1';

// Alternative Lingva instances for fallback
const LINGVA_INSTANCES = [
  'https://lingva.ml',
  'https://lingva.lunar.icu',
  'https://translate.plausibility.cloud',
];

/**
 * Translate text using Lingva API
 */
async function translateWithLingva(text, sourceLang = 'en', targetLang = 'zh') {
  const errors = [];

  for (const baseUrl of LINGVA_INSTANCES) {
    try {
      // Lingva API requires URL-encoded text
      const encodedText = encodeURIComponent(text);
      const url = `${baseUrl}/api/v1/${sourceLang}/${targetLang}/${encodedText}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'ReadmeBOT/1.0',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.translation) {
        return {
          success: true,
          translatedText: data.translation,
          source: baseUrl,
        };
      }
    } catch (error) {
      errors.push(`${baseUrl}: ${error.message}`);
    }
  }

  return {
    success: false,
    error: `All translation services failed: ${errors.join(', ')}`,
  };
}

/**
 * POST /translate
 * Translate text (preview, doesn't charge)
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { text, targetLang = 'zh', sourceLang = 'en' } = req.body;

    if (!text) {
      return res.status(400).json({ error: '请提供要翻译的文本' });
    }

    // Limit text length for preview
    const maxLength = 5000;
    const textToTranslate = text.length > maxLength ? text.substring(0, maxLength) : text;

    const result = await translateWithLingva(textToTranslate, sourceLang, targetLang);

    if (!result.success) {
      return res.status(500).json({ error: result.error });
    }

    res.json({
      translatedText: result.translatedText,
      truncated: text.length > maxLength,
      cost: 0.5, // Translation cost in RMB
    });
  } catch (error) {
    console.error('Translation error:', error);
    res.status(500).json({ error: '翻译失败' });
  }
});

/**
 * POST /translate/charge
 * Charge user for translation and cache the result
 */
router.post('/charge', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.body;
    const userId = req.user.id;
    const translationPrice = 0.5;

    if (!documentId) {
      return res.status(400).json({ error: '请提供文档 ID' });
    }

    // Check if already purchased
    const existingPurchase = await prisma.translationPurchase.findUnique({
      where: {
        userId_documentId: {
          userId,
          documentId: parseInt(documentId),
        },
      },
    });

    if (existingPurchase) {
      return res.json({
        success: true,
        message: '您已购买过该翻译',
        alreadyPurchased: true,
      });
    }

    // Get document and check if it has original content
    const document = await prisma.document.findUnique({
      where: { id: parseInt(documentId) },
    });

    if (!document) {
      return res.status(404).json({ error: '文档不存在' });
    }

    if (!document.originalContent) {
      return res.status(400).json({ error: '该文档没有可翻译的原文内容' });
    }

    // Check user balance
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user.balance < translationPrice) {
      return res.status(400).json({
        error: '余额不足',
        required: translationPrice,
        current: user.balance,
      });
    }

    // Translate content if not already cached
    let translatedContent = document.translatedContent;

    if (!translatedContent) {
      const result = await translateWithLingva(document.originalContent, 'en', 'zh');

      if (!result.success) {
        return res.status(500).json({ error: '翻译失败: ' + result.error });
      }

      translatedContent = result.translatedText;

      // Cache the translation
      await prisma.document.update({
        where: { id: parseInt(documentId) },
        data: { translatedContent },
      });
    }

    // Create transaction: deduct balance and record purchase
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { balance: { decrement: translationPrice } },
      }),
      prisma.translationPurchase.create({
        data: {
          userId,
          documentId: parseInt(documentId),
          price: translationPrice,
        },
      }),
    ]);

    res.json({
      success: true,
      translatedContent,
      price: translationPrice,
      newBalance: user.balance - translationPrice,
    });
  } catch (error) {
    console.error('Translation charge error:', error);
    res.status(500).json({ error: '购买翻译失败' });
  }
});

/**
 * GET /translate/check/:documentId
 * Check if user has purchased translation for a document
 */
router.get('/check/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;

    const purchase = await prisma.translationPurchase.findUnique({
      where: {
        userId_documentId: {
          userId,
          documentId: parseInt(documentId),
        },
      },
    });

    // Also get the document to check if translation is cached
    const document = await prisma.document.findUnique({
      where: { id: parseInt(documentId) },
      select: {
        translatedContent: true,
        originalContent: true,
        sourceType: true,
      },
    });

    res.json({
      purchased: !!purchase,
      hasTranslation: !!document?.translatedContent,
      hasOriginalContent: !!document?.originalContent,
      isTwitterSource: document?.sourceType === 'twitter',
      purchaseDate: purchase?.createdAt,
    });
  } catch (error) {
    console.error('Check translation error:', error);
    res.status(500).json({ error: '检查翻译购买状态失败' });
  }
});

/**
 * GET /translate/content/:documentId
 * Get translated content (only if purchased)
 */
router.get('/content/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const userId = req.user.id;

    // Check if purchased
    const purchase = await prisma.translationPurchase.findUnique({
      where: {
        userId_documentId: {
          userId,
          documentId: parseInt(documentId),
        },
      },
    });

    if (!purchase) {
      return res.status(403).json({ error: '请先购买翻译' });
    }

    const document = await prisma.document.findUnique({
      where: { id: parseInt(documentId) },
      select: {
        translatedContent: true,
        originalContent: true,
      },
    });

    if (!document) {
      return res.status(404).json({ error: '文档不存在' });
    }

    res.json({
      translatedContent: document.translatedContent,
      originalContent: document.originalContent,
    });
  } catch (error) {
    console.error('Get translation content error:', error);
    res.status(500).json({ error: '获取翻译内容失败' });
  }
});

export default router;
