import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import documentRoutes from './routes/documents.js';
import bookshelfRoutes from './routes/bookshelf.js';
import aiRoutes from './routes/ai.js';
import noteRoutes from './routes/notes.js';
import uploadRoutes from './routes/upload.js';
import publicRoutes from './routes/public.js';
import twitterRoutes from './routes/twitter.js';
import translateRoutes from './routes/translate.js';
import voiceRoutes from './routes/voice.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// CORS 配置 - 支持多个域名
const getCorsOrigin = () => {
  const allowedOrigins = [
    'https://readme-bot-seven.vercel.app',
    'http://localhost:5173',
    'http://localhost:3000',
  ];
  
  const envOrigin = process.env.CORS_ORIGIN;
  if (envOrigin) {
    // 支持逗号分隔的多个域名
    const envOrigins = envOrigin.split(',').map(origin => origin.trim());
    allowedOrigins.push(...envOrigins);
  }
  
  return allowedOrigins;
};

const corsOptions = {
  origin: function (origin, callback) {
    // 允许无 origin 的请求（如移动应用、Postman等）
    if (!origin) return callback(null, true);
    
    const allowedOrigins = getCorsOrigin();
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Disposition'],
  maxAge: 86400, // 24小时
};
app.use(cors(corsOptions));

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow static files to be loaded
  contentSecurityPolicy: false, // Disable CSP for now (frontend handles it)
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 静态文件服务 - 用于访问上传的图片
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/bookshelf', bookshelfRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/twitter', twitterRoutes);
app.use('/api/translate', translateRoutes);
app.use('/api/voice', voiceRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Error handling - must be after all routes
app.use(notFoundHandler);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
