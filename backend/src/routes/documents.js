import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// 检查用户是否有权限访问文档
async function checkDocumentAccess(document, userId) {
  // 作者可以访问自己的文档
  if (document.authorId === userId) {
    return { hasAccess: true, isOwner: true, hasPurchased: false };
  }

  // 私有文档只有作者能看
  if (!document.isPublic) {
    return { hasAccess: false, isOwner: false, hasPurchased: false };
  }

  // 免费公开文档所有人可看
  if (document.price === 0) {
    return { hasAccess: true, isOwner: false, hasPurchased: false };
  }

  // 付费文档需要检查是否已购买
  if (userId) {
    const purchase = await prisma.purchase.findUnique({
      where: {
        userId_documentId: {
          userId,
          documentId: document.id,
        },
      },
    });
    if (purchase) {
      return { hasAccess: true, isOwner: false, hasPurchased: true };
    }
  }

  return { hasAccess: false, isOwner: false, hasPurchased: false };
}

// Get user's own documents only (我的文档)
router.get('/my', authenticateToken, async (req, res) => {
  try {
    const documents = await prisma.document.findMany({
      where: {
        authorId: req.user.id,
      },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
        _count: {
          select: { purchases: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const result = documents.map((doc) => ({
      ...doc,
      isOwner: true,
      purchaseCount: doc._count.purchases,
    }));

    res.json(result);
  } catch (error) {
    console.error('Get my documents error:', error);
    res.status(500).json({ error: 'Failed to fetch my documents' });
  }
});

// Search user's own documents
router.get('/my/search', authenticateToken, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || !q.trim()) {
      return res.json([]);
    }

    const documents = await prisma.document.findMany({
      where: {
        authorId: req.user.id,
        OR: [
          { title: { contains: q.trim(), mode: 'insensitive' } },
          { content: { contains: q.trim(), mode: 'insensitive' } },
        ],
      },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
        _count: {
          select: { purchases: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const result = documents.map((doc) => ({
      ...doc,
      isOwner: true,
      purchaseCount: doc._count.purchases,
    }));

    res.json(result);
  } catch (error) {
    console.error('Search documents error:', error);
    res.status(500).json({ error: 'Failed to search documents' });
  }
});

// Get all documents (public + user's own)
router.get('/', authenticateToken, async (req, res) => {
  try {
    // 获取用户自己的文档（包括私有的）
    const documents = await prisma.document.findMany({
      where: {
        OR: [
          { authorId: req.user.id }, // 用户自己的文档
          { isPublic: true }, // 公开的文档
        ],
      },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
        chapters: {
          orderBy: { order: 'asc' },
        },
        _count: {
          select: { purchases: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    // 添加用户是否已购买的信息
    const documentsWithPurchaseInfo = await Promise.all(
      documents.map(async (doc) => {
        const hasPurchased = doc.authorId !== req.user.id && doc.price > 0
          ? await prisma.purchase.findUnique({
              where: {
                userId_documentId: {
                  userId: req.user.id,
                  documentId: doc.id,
                },
              },
            })
          : null;

        return {
          ...doc,
          isOwner: doc.authorId === req.user.id,
          hasPurchased: !!hasPurchased,
          purchaseCount: doc._count.purchases,
        };
      })
    );

    res.json(documentsWithPurchaseInfo);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Get single document
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({
      where: { id: parseInt(id) },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
        chapters: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // 检查访问权限
    const accessInfo = await checkDocumentAccess(document, req.user.id);

    if (!accessInfo.hasAccess) {
      // 返回文档基本信息（用于显示购买页面）但不返回内容
      return res.json({
        id: document.id,
        title: document.title,
        price: document.price,
        isPublic: document.isPublic,
        author: document.author,
        createdAt: document.createdAt,
        updatedAt: document.updatedAt,
        // 不返回 content 和 pdfPages
        content: null,
        pdfPages: null,
        hasAccess: false,
        isOwner: false,
        hasPurchased: false,
        needPurchase: document.price > 0,
      });
    }

    res.json({
      ...document,
      hasAccess: true,
      isOwner: accessInfo.isOwner,
      hasPurchased: accessInfo.hasPurchased,
      needPurchase: false,
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Create document
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      title,
      content,
      mode,
      pdfPages,
      docId,
      price,
      isPublic,
      // 新增字段：外部来源支持
      sourceType,
      sourceUrl,
      originalContent,
    } = req.body;

    const document = await prisma.document.create({
      data: {
        title,
        content: content || '',
        mode: mode || 'read',
        pdfPages: pdfPages || null,
        docId: docId || null,
        price: price || 0,
        isPublic: isPublic !== undefined ? isPublic : true,
        authorId: req.user.id,
        // 外部来源字段
        sourceType: sourceType || null,
        sourceUrl: sourceUrl || null,
        originalContent: originalContent || null,
      },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
      },
    });

    res.status(201).json(document);
  } catch (error) {
    console.error('Create document error:', error);
    res.status(500).json({ error: 'Failed to create document' });
  }
});

// Update document
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, mode, price, isPublic } = req.body;

    // Check if user owns the document
    const document = await prisma.document.findUnique({
      where: { id: parseInt(id) },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.authorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to edit this document' });
    }

    const updatedDocument = await prisma.document.update({
      where: { id: parseInt(id) },
      data: {
        ...(title && { title }),
        ...(content !== undefined && { content }),
        ...(mode && { mode }),
        ...(price !== undefined && { price }),
        ...(isPublic !== undefined && { isPublic }),
      },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
        chapters: {
          orderBy: { order: 'asc' },
        },
      },
    });

    res.json(updatedDocument);
  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({ error: 'Failed to update document' });
  }
});

// Delete document
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user owns the document
    const document = await prisma.document.findUnique({
      where: { id: parseInt(id) },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.authorId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this document' });
    }

    await prisma.document.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

// Purchase document
router.post('/:id/purchase', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // 获取文档
    const document = await prisma.document.findUnique({
      where: { id: parseInt(id) },
      include: {
        author: {
          select: { id: true, username: true },
        },
      },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // 不能购买自己的文档
    if (document.authorId === userId) {
      return res.status(400).json({ error: '不能购买自己的文档' });
    }

    // 检查是否已购买
    const existingPurchase = await prisma.purchase.findUnique({
      where: {
        userId_documentId: {
          userId,
          documentId: parseInt(id),
        },
      },
    });

    if (existingPurchase) {
      return res.status(400).json({ error: '您已经购买过此文档' });
    }

    // 免费文档直接获取
    if (document.price === 0) {
      const purchase = await prisma.purchase.create({
        data: {
          userId,
          documentId: parseInt(id),
          price: 0,
        },
      });
      return res.json({ success: true, message: '获取成功', purchase });
    }

    // 获取用户余额
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true },
    });

    if (user.balance < document.price) {
      return res.status(400).json({
        error: '余额不足',
        required: document.price,
        balance: user.balance,
      });
    }

    // 使用事务处理购买
    const result = await prisma.$transaction(async (tx) => {
      // 扣除购买者余额
      await tx.user.update({
        where: { id: userId },
        data: { balance: { decrement: document.price } },
      });

      // 增加作者余额
      await tx.user.update({
        where: { id: document.authorId },
        data: { balance: { increment: document.price } },
      });

      // 创建购买记录
      const purchase = await tx.purchase.create({
        data: {
          userId,
          documentId: parseInt(id),
          price: document.price,
        },
      });

      return purchase;
    });

    res.json({
      success: true,
      message: '购买成功',
      purchase: result,
    });
  } catch (error) {
    console.error('Purchase document error:', error);
    res.status(500).json({ error: 'Failed to purchase document' });
  }
});

export default router;
