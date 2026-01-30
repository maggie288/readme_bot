import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import { authenticateToken } from '../middleware/auth.js';

// pdfjs-dist for rendering PDF pages
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createCanvas } = require('canvas');

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 确保上传目录存在
const uploadsDir = path.join(__dirname, '../../uploads');
const pdfPagesDir = path.join(uploadsDir, 'pdf-pages');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
if (!fs.existsSync(pdfPagesDir)) {
  fs.mkdirSync(pdfPagesDir, { recursive: true });
}

// 配置 multer 存储
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB 限制
  },
  fileFilter: (req, file, cb) => {
    // 解析文件时只允许 PDF 和 Word
    if (req.path === '/parse') {
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/msword', // .doc
      ];

      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('不支持的文件类型。请上传 PDF 或 Word 文档。'));
      }
    } 
    // 图片上传时允许图片类型
    else if (req.path === '/image') {
      const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
      if (imageTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('不支持的图片格式。请上传 JPG、PNG、GIF 或 WebP 图片。'));
      }
    }
    else {
      cb(null, true);
    }
  }
});

// 清理无效 UTF-8 字符（null 字节等）
function sanitizeText(text) {
  if (!text) return '';
  // 移除 null 字节和其他控制字符（保留换行、回车、制表符）
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

// 动态加载 pdfjs-dist（因为是 ESM 模块）
let pdfjsLib = null;
async function getPdfjs() {
  if (!pdfjsLib) {
    pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  }
  return pdfjsLib;
}

// 渲染 PDF 页面为图片
async function renderPDFPages(filePath, docId) {
  const pdfjs = await getPdfjs();
  const pageImages = [];

  try {
    const data = new Uint8Array(fs.readFileSync(filePath));
    const loadingTask = pdfjs.getDocument({ data, useSystemFonts: true });
    const pdfDocument = await loadingTask.promise;

    const numPages = pdfDocument.numPages;
    const scale = 2.0; // 渲染比例，提高清晰度

    // 为这个文档创建专门的目录
    const docPagesDir = path.join(pdfPagesDir, docId);
    if (!fs.existsSync(docPagesDir)) {
      fs.mkdirSync(docPagesDir, { recursive: true });
    }

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      try {
        const page = await pdfDocument.getPage(pageNum);
        const viewport = page.getViewport({ scale });

        // 创建 canvas
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');

        // 设置白色背景
        context.fillStyle = 'white';
        context.fillRect(0, 0, viewport.width, viewport.height);

        // 渲染页面
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;

        // 保存为 PNG 图片
        const imageName = `page-${pageNum}.png`;
        const imagePath = path.join(docPagesDir, imageName);
        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(imagePath, buffer);

        pageImages.push({
          page: pageNum,
          url: `/uploads/pdf-pages/${docId}/${imageName}`,
          width: viewport.width,
          height: viewport.height,
        });
      } catch (pageError) {
        console.error(`Error rendering page ${pageNum}:`, pageError);
        // 继续处理其他页面
      }
    }

    return pageImages;
  } catch (error) {
    console.error('PDF rendering error:', error);
    return [];
  }
}

// 解析 PDF 文件（提取文本）
async function parsePDF(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);

  // 提取并清理文本内容
  let text = sanitizeText(data.text || '');

  // 尝试识别标题（基于字体大小或位置等启发式方法）
  // PDF 解析比较复杂，这里做简单处理
  const lines = text.split('\n').filter(line => line.trim());

  let htmlContent = '';
  let title = '';
  let currentParagraph = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // 启发式判断标题：短行（通常是标题）且后面有空行或明显不同的内容
    const isLikelyHeading = (
      line.length < 100 &&
      !line.endsWith('。') &&
      !line.endsWith('，') &&
      !line.endsWith('；') &&
      !line.endsWith('.') &&
      !line.endsWith(',') &&
      (line.match(/^[第一二三四五六七八九十\d]+[章节部分、.．]/) ||
       line.match(/^\d+[\.\s]/) ||
       line.match(/^[一二三四五六七八九十]+、/) ||
       line.match(/^(Abstract|Introduction|Conclusion|References|Figure|Table)\b/i))
    );

    if (isLikelyHeading) {
      // 先保存之前的段落
      if (currentParagraph.length > 0) {
        htmlContent += `<p>${currentParagraph.join(' ')}</p>\n`;
        currentParagraph = [];
      }

      // 判断标题级别
      if (line.match(/^第[一二三四五六七八九十\d]+[章部]/) || line.match(/^\d+\s+[A-Z]/)) {
        htmlContent += `<h1>${line}</h1>\n`;
        if (!title) title = line;
      } else if (line.match(/^第[一二三四五六七八九十\d]+[节]/) || line.match(/^\d+\.\d+\s/)) {
        htmlContent += `<h2>${line}</h2>\n`;
      } else if (line.match(/^[一二三四五六七八九十]+、/) || line.match(/^\d+[\.\s]/) || line.match(/^\d+\.\d+\.\d+/)) {
        htmlContent += `<h3>${line}</h3>\n`;
      } else {
        htmlContent += `<h2>${line}</h2>\n`;
      }
    } else {
      currentParagraph.push(line);

      // 如果累积了一定长度，或者看起来是段落结束
      if (currentParagraph.join(' ').length > 500 ||
          line.endsWith('。') ||
          line.endsWith('.')) {
        htmlContent += `<p>${currentParagraph.join(' ')}</p>\n`;
        currentParagraph = [];
      }
    }
  }

  // 处理剩余内容
  if (currentParagraph.length > 0) {
    htmlContent += `<p>${currentParagraph.join(' ')}</p>\n`;
  }

  // 如果没有识别出标题，使用文件的前几个字作为标题
  if (!title && lines.length > 0) {
    title = lines[0].substring(0, 50);
  }

  return {
    title: sanitizeText(title) || 'PDF 文档',
    content: sanitizeText(htmlContent),
    pageCount: data.numpages,
    images: [] // PDF 图片提取较复杂，暂时不处理
  };
}

// 解析 Word 文件
async function parseWord(filePath) {
  const options = {
    convertImage: mammoth.images.imgElement(async (image) => {
      // 将图片保存到 uploads 目录
      const extension = image.contentType.split('/')[1] || 'png';
      const imageName = `img-${Date.now()}-${Math.round(Math.random() * 1E9)}.${extension}`;
      const imagePath = path.join(uploadsDir, imageName);

      const buffer = await image.read();
      fs.writeFileSync(imagePath, buffer);

      // 返回图片 URL
      return {
        src: `/uploads/${imageName}`
      };
    }),
    styleMap: [
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
      "p[style-name='Heading 4'] => h4:fresh",
      "p[style-name='Heading 5'] => h5:fresh",
      "p[style-name='Heading 6'] => h6:fresh",
      "p[style-name='Title'] => h1:fresh",
      "p[style-name='Subtitle'] => h2:fresh",
      "r[style-name='Strong'] => strong",
      "r[style-name='Emphasis'] => em",
    ]
  };

  const result = await mammoth.convertToHtml({ path: filePath }, options);
  let htmlContent = result.value;

  // 清理一些不需要的属性
  htmlContent = htmlContent
    .replace(/class="[^"]*"/g, '')
    .replace(/id="[^"]*"/g, '');

  // 提取标题
  let title = 'Word 文档';
  const h1Match = htmlContent.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (h1Match) {
    title = h1Match[1].replace(/<[^>]+>/g, '').trim();
  }

  // 收集图片信息
  const images = [];
  const imgMatches = htmlContent.matchAll(/<img[^>]+src="([^"]+)"[^>]*>/g);
  for (const match of imgMatches) {
    images.push(match[1]);
  }

  return {
    title: sanitizeText(title),
    content: sanitizeText(htmlContent),
    images,
    warnings: result.messages
  };
}

// 文件上传和解析 API
router.post('/parse', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传文件' });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    const docId = Date.now() + '-' + Math.round(Math.random() * 1E9);

    let result;
    let pdfPages = [];

    if (fileExtension === '.pdf') {
      // 并行执行文本解析和页面渲染
      const [textResult, pages] = await Promise.all([
        parsePDF(filePath),
        renderPDFPages(filePath, docId)
      ]);
      result = textResult;
      pdfPages = pages;
    } else if (fileExtension === '.docx' || fileExtension === '.doc') {
      result = await parseWord(filePath);
    } else {
      // 删除上传的文件
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: '不支持的文件格式' });
    }

    // 删除原始上传文件（图片已经单独保存）
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      title: result.title,
      content: result.content,
      images: result.images || [],
      pageCount: result.pageCount,
      pdfPages: pdfPages, // 新增：PDF 页面渲染结果
      docId: docId, // 新增：文档 ID
      warnings: result.warnings || []
    });

  } catch (error) {
    console.error('File parse error:', error);

    // 尝试删除上传的文件
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: '文件解析失败: ' + (error.message || '未知错误')
    });
  }
});

// 图片上传 API
router.post('/image', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传图片' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    res.json({
      success: true,
      url: imageUrl
    });
  } catch (error) {
    console.error('Image upload error:', error);

    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      error: '图片上传失败: ' + (error.message || '未知错误')
    });
  }
});

// 错误处理中间件
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: '文件大小超过限制（最大 50MB）' });
    }
  }
  res.status(400).json({ error: error.message });
});

export default router;
