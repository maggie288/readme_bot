import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// MiniMax API Configuration
const MINIMAX_API_KEY = process.env.MINIMAX_API_KEY;
const MINIMAX_GROUP_ID = process.env.MINIMAX_GROUP_ID;

// Multer configuration for audio file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/voice');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.wav';
    cb(null, `voice_${req.user.id}_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['audio/wav', 'audio/mp3', 'audio/mpeg', 'audio/webm', 'audio/ogg'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(wav|mp3|webm|ogg)$/i)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 WAV, MP3, WebM, OGG 音频格式'), false);
    }
  },
});

/**
 * Clone voice using MiniMax API
 */
async function cloneVoiceWithMiniMax(audioFilePath, voiceName) {
  if (!MINIMAX_API_KEY || !MINIMAX_GROUP_ID) {
    throw new Error('MiniMax API credentials not configured');
  }

  const formData = new FormData();
  const audioBuffer = fs.readFileSync(audioFilePath);
  const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });
  formData.append('file', audioBlob, 'voice.wav');
  formData.append('voice_id', `user_voice_${Date.now()}`);
  formData.append('text', '这是一段用于声音克隆的示例文本。'); // Sample text for cloning

  try {
    // MiniMax Voice Clone API
    const response = await fetch(`https://api.minimax.chat/v1/voice_clone?GroupId=${MINIMAX_GROUP_ID}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MiniMax clone error:', errorText);
      throw new Error(`Voice clone failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.base_resp?.status_code !== 0) {
      throw new Error(data.base_resp?.status_msg || 'Voice clone failed');
    }

    return {
      success: true,
      voiceId: data.voice_id,
    };
  } catch (error) {
    console.error('MiniMax voice clone error:', error);
    throw error;
  }
}

/**
 * Synthesize speech using MiniMax TTS with custom voice
 */
async function synthesizeSpeechWithMiniMax(text, voiceId) {
  if (!MINIMAX_API_KEY || !MINIMAX_GROUP_ID) {
    throw new Error('MiniMax API credentials not configured');
  }

  try {
    const response = await fetch(`https://api.minimax.chat/v1/t2a_v2?GroupId=${MINIMAX_GROUP_ID}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'speech-01-turbo',
        text: text,
        voice_setting: {
          voice_id: voiceId,
          speed: 1.0,
          vol: 1.0,
          pitch: 0,
        },
        audio_setting: {
          sample_rate: 32000,
          bitrate: 128000,
          format: 'mp3',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('MiniMax TTS error:', errorText);
      throw new Error(`TTS failed: ${response.status}`);
    }

    const data = await response.json();

    if (data.base_resp?.status_code !== 0) {
      throw new Error(data.base_resp?.status_msg || 'TTS failed');
    }

    // Return audio data (base64 encoded)
    return {
      success: true,
      audioData: data.data?.audio, // Base64 encoded audio
      audioUrl: data.data?.audio_file?.url, // Or direct URL if available
    };
  } catch (error) {
    console.error('MiniMax TTS error:', error);
    throw error;
  }
}

/**
 * POST /voice/clone
 * Upload audio and clone voice
 */
router.post('/clone', authenticateToken, upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传音频文件' });
    }

    const voiceName = req.body.name || `${req.user.username}的声音`;
    const audioFilePath = req.file.path;

    // Clone voice with MiniMax
    const result = await cloneVoiceWithMiniMax(audioFilePath, voiceName);

    if (!result.success) {
      // Clean up uploaded file
      fs.unlinkSync(audioFilePath);
      return res.status(500).json({ error: '声音克隆失败' });
    }

    // Update user record with voice ID
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        customVoiceId: result.voiceId,
        customVoiceName: voiceName,
        customVoiceCreatedAt: new Date(),
      },
    });

    // Clean up uploaded file (optional - keep if needed for re-cloning)
    // fs.unlinkSync(audioFilePath);

    res.json({
      success: true,
      voiceId: result.voiceId,
      voiceName,
      message: '声音克隆成功！',
    });
  } catch (error) {
    console.error('Voice clone error:', error);

    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: error.message || '声音克隆失败',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

/**
 * POST /voice/synthesize
 * Synthesize text to speech using custom voice
 */
router.post('/synthesize', authenticateToken, async (req, res) => {
  try {
    const { text, voiceId } = req.body;

    if (!text) {
      return res.status(400).json({ error: '请提供要合成的文本' });
    }

    // Use provided voiceId or user's custom voice
    const targetVoiceId = voiceId || (await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { customVoiceId: true },
    }))?.customVoiceId;

    if (!targetVoiceId) {
      return res.status(400).json({ error: '未找到可用的声音，请先克隆您的声音' });
    }

    // Limit text length
    const maxLength = 1000;
    const textToSynthesize = text.length > maxLength ? text.substring(0, maxLength) : text;

    const result = await synthesizeSpeechWithMiniMax(textToSynthesize, targetVoiceId);

    if (!result.success) {
      return res.status(500).json({ error: '语音合成失败' });
    }

    res.json({
      success: true,
      audioData: result.audioData,
      audioUrl: result.audioUrl,
      truncated: text.length > maxLength,
    });
  } catch (error) {
    console.error('Voice synthesize error:', error);
    res.status(500).json({ error: error.message || '语音合成失败' });
  }
});

/**
 * GET /voice/my
 * Get current user's voice info
 */
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        customVoiceId: true,
        customVoiceName: true,
        customVoiceCreatedAt: true,
      },
    });

    if (!user || !user.customVoiceId) {
      return res.json({
        hasVoice: false,
        voiceId: null,
        voiceName: null,
        createdAt: null,
      });
    }

    res.json({
      hasVoice: true,
      voiceId: user.customVoiceId,
      voiceName: user.customVoiceName,
      createdAt: user.customVoiceCreatedAt,
    });
  } catch (error) {
    console.error('Get voice info error:', error);
    res.status(500).json({ error: '获取声音信息失败' });
  }
});

/**
 * DELETE /voice/my
 * Delete user's custom voice
 */
router.delete('/my', authenticateToken, async (req, res) => {
  try {
    await prisma.user.update({
      where: { id: req.user.id },
      data: {
        customVoiceId: null,
        customVoiceName: null,
        customVoiceCreatedAt: null,
      },
    });

    res.json({
      success: true,
      message: '声音已删除',
    });
  } catch (error) {
    console.error('Delete voice error:', error);
    res.status(500).json({ error: '删除声音失败' });
  }
});

export default router;
