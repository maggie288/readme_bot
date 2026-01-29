import { z } from 'zod';

// Auth validations
export const registerSchema = z.object({
  username: z.string()
    .min(2, 'Username must be at least 2 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_\u4e00-\u9fa5]+$/, 'Username can only contain letters, numbers, underscores and Chinese characters'),
  email: z.string()
    .email('Invalid email address'),
  password: z.string()
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password must be at most 100 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Document validations
export const createDocumentSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  content: z.string().optional().default(''),
  mode: z.enum(['edit', 'read']).optional().default('read'),
  pdfPages: z.array(z.any()).optional().nullable(),
  docId: z.string().optional().nullable(),
  price: z.number().min(0, 'Price cannot be negative').optional().default(0),
  isPublic: z.boolean().optional().default(true),
  sourceType: z.enum(['twitter', 'pdf', 'word', 'notion']).optional().nullable(),
  sourceUrl: z.string().url('Invalid source URL').optional().nullable(),
  originalContent: z.string().optional().nullable(),
});

export const updateDocumentSchema = z.object({
  title: z.string()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters')
    .optional(),
  content: z.string().optional(),
  mode: z.enum(['edit', 'read']).optional(),
  price: z.number().min(0, 'Price cannot be negative').optional(),
  isPublic: z.boolean().optional(),
});

// Note validations
export const createNoteSchema = z.object({
  documentId: z.number().int().positive('Invalid document ID'),
  content: z.string().min(1, 'Note content is required'),
  selectedText: z.string().optional(),
  position: z.number().int().min(0).optional(),
});

export const updateNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required'),
});

// Translation validations
export const translateSchema = z.object({
  text: z.string().min(1, 'Text is required').max(10000, 'Text too long'),
  targetLang: z.string().length(2, 'Invalid language code').optional().default('zh'),
});

export const chargeTranslationSchema = z.object({
  documentId: z.number().int().positive('Invalid document ID'),
});

// Voice validations
export const synthesizeVoiceSchema = z.object({
  text: z.string().min(1, 'Text is required').max(5000, 'Text too long for synthesis'),
  voiceId: z.string().min(1, 'Voice ID is required'),
});

// Twitter validations
export const fetchTwitterSchema = z.object({
  url: z.string()
    .url('Invalid URL')
    .refine(
      (url) => url.includes('twitter.com') || url.includes('x.com'),
      'URL must be from Twitter/X'
    ),
});

// AI validations
export const aiAskSchema = z.object({
  question: z.string().min(1, 'Question is required').max(1000, 'Question too long'),
  documentContent: z.string().optional(),
});

// Bookshelf validations
export const addToBookshelfSchema = z.object({
  documentId: z.number().int().positive('Invalid document ID'),
});

export const updateProgressSchema = z.object({
  listenPosition: z.number().int().min(0).optional(),
  listenPercent: z.number().min(0).max(100).optional(),
  readPosition: z.number().int().min(0).optional(),
  readPercent: z.number().min(0).max(100).optional(),
  speed: z.number().min(0.5).max(2).optional(),
});

// Balance validation
export const addBalanceSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
});

// Validation middleware helper
export const validate = (schema) => (req, res, next) => {
  try {
    // Validate body for POST/PUT/PATCH, query for GET
    const dataToValidate = ['GET', 'DELETE'].includes(req.method) ? req.query : req.body;
    const validated = schema.parse(dataToValidate);

    // Replace with validated data
    if (['GET', 'DELETE'].includes(req.method)) {
      req.query = validated;
    } else {
      req.body = validated;
    }

    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }
    next(error);
  }
};
