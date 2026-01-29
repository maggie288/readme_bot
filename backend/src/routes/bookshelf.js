import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get user's bookshelf
router.get('/', authenticateToken, async (req, res) => {
  try {
    const bookshelf = await prisma.bookshelf.findMany({
      where: { userId: req.user.id },
      include: {
        document: {
          include: {
            author: {
              select: { id: true, username: true, avatar: true },
            },
          },
        },
      },
      orderBy: { lastReadAt: 'desc' }, // 按最后阅读时间排序
    });

    res.json(bookshelf);
  } catch (error) {
    console.error('Get bookshelf error:', error);
    res.status(500).json({ error: 'Failed to fetch bookshelf' });
  }
});

// Add document to bookshelf
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.body;

    // Check if document exists
    const document = await prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check if already in bookshelf
    const existing = await prisma.bookshelf.findUnique({
      where: {
        userId_documentId: {
          userId: req.user.id,
          documentId,
        },
      },
    });

    if (existing) {
      return res.status(400).json({ error: 'Document already in bookshelf' });
    }

    const bookshelfItem = await prisma.bookshelf.create({
      data: {
        userId: req.user.id,
        documentId,
      },
      include: {
        document: {
          include: {
            author: {
              select: { id: true, username: true, avatar: true },
            },
          },
        },
      },
    });

    res.status(201).json(bookshelfItem);
  } catch (error) {
    console.error('Add to bookshelf error:', error);
    res.status(500).json({ error: 'Failed to add to bookshelf' });
  }
});

// Remove document from bookshelf
router.delete('/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;

    await prisma.bookshelf.delete({
      where: {
        userId_documentId: {
          userId: req.user.id,
          documentId: parseInt(documentId),
        },
      },
    });

    res.json({ message: 'Document removed from bookshelf' });
  } catch (error) {
    console.error('Remove from bookshelf error:', error);
    res.status(500).json({ error: 'Failed to remove from bookshelf' });
  }
});

// Get reading progress for a document
router.get('/progress/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;

    const bookshelfItem = await prisma.bookshelf.findUnique({
      where: {
        userId_documentId: {
          userId: req.user.id,
          documentId: parseInt(documentId),
        },
      },
      select: {
        readPosition: true,
        listenPosition: true,
        readPercent: true,
        listenPercent: true,
        speed: true,
        lastReadAt: true,
      },
    });

    if (!bookshelfItem) {
      // 如果不在书架中，返回默认进度
      return res.json({
        readPosition: 0,
        listenPosition: 0,
        readPercent: 0,
        listenPercent: 0,
        speed: 1.0,
        lastReadAt: null,
        inBookshelf: false,
      });
    }

    res.json({
      ...bookshelfItem,
      inBookshelf: true,
    });
  } catch (error) {
    console.error('Get reading progress error:', error);
    res.status(500).json({ error: 'Failed to fetch reading progress' });
  }
});

// Update reading progress for a document
router.put('/progress/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;
    const { readPosition, listenPosition, readPercent, listenPercent, speed } = req.body;

    // 查找或创建书架记录
    let bookshelfItem = await prisma.bookshelf.findUnique({
      where: {
        userId_documentId: {
          userId: req.user.id,
          documentId: parseInt(documentId),
        },
      },
    });

    // 如果不在书架中，先添加到书架
    if (!bookshelfItem) {
      bookshelfItem = await prisma.bookshelf.create({
        data: {
          userId: req.user.id,
          documentId: parseInt(documentId),
        },
      });
    }

    // 更新进度
    const updateData = {
      lastReadAt: new Date(),
    };

    if (readPosition !== undefined) updateData.readPosition = readPosition;
    if (listenPosition !== undefined) updateData.listenPosition = listenPosition;
    if (readPercent !== undefined) updateData.readPercent = readPercent;
    if (listenPercent !== undefined) updateData.listenPercent = listenPercent;
    if (speed !== undefined) updateData.speed = speed;

    const updatedItem = await prisma.bookshelf.update({
      where: {
        userId_documentId: {
          userId: req.user.id,
          documentId: parseInt(documentId),
        },
      },
      data: updateData,
      select: {
        readPosition: true,
        listenPosition: true,
        readPercent: true,
        listenPercent: true,
        speed: true,
        lastReadAt: true,
      },
    });

    res.json(updatedItem);
  } catch (error) {
    console.error('Update reading progress error:', error);
    res.status(500).json({ error: 'Failed to update reading progress' });
  }
});

export default router;
