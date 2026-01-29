import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get popular documents (most bookmarked)
router.get('/popular', async (req, res) => {
  try {
    const documents = await prisma.document.findMany({
      take: 20,
      where: {
        isPublic: true, // 只显示公开文档
      },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
        _count: {
          select: { bookshelf: true, purchases: true },
        },
      },
      orderBy: {
        bookshelf: {
          _count: 'desc',
        },
      },
    });

    // Transform data to include viewCount (using bookshelf count as proxy)
    const result = documents.map((doc) => ({
      _id: doc.id,
      title: doc.title,
      summary: doc.content?.substring(0, 150)?.replace(/<[^>]*>/g, '') || '',
      viewCount: doc._count.bookshelf * 10, // Approximate view count
      author: doc.author,
      price: doc.price,
      purchaseCount: doc._count.purchases,
      createdAt: doc.createdAt,
    }));

    res.json(result);
  } catch (error) {
    console.error('Get popular documents error:', error);
    res.status(500).json({ error: 'Failed to fetch popular documents' });
  }
});

// Get trending documents (recently updated with activity)
router.get('/trending', async (req, res) => {
  try {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const documents = await prisma.document.findMany({
      take: 10,
      where: {
        isPublic: true, // 只显示公开文档
        updatedAt: {
          gte: oneWeekAgo,
        },
      },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
        _count: {
          select: { bookshelf: true, purchases: true },
        },
      },
      orderBy: [
        {
          bookshelf: {
            _count: 'desc',
          },
        },
        { updatedAt: 'desc' },
      ],
    });

    const result = documents.map((doc) => ({
      _id: doc.id,
      title: doc.title,
      summary: doc.content?.substring(0, 150)?.replace(/<[^>]*>/g, '') || '',
      viewCount: doc._count.bookshelf * 10,
      author: doc.author,
      price: doc.price,
      purchaseCount: doc._count.purchases,
      createdAt: doc.createdAt,
    }));

    res.json(result);
  } catch (error) {
    console.error('Get trending documents error:', error);
    res.status(500).json({ error: 'Failed to fetch trending documents' });
  }
});

// Get new documents
router.get('/new', async (req, res) => {
  try {
    const documents = await prisma.document.findMany({
      take: 10,
      where: {
        isPublic: true, // 只显示公开文档
      },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
        _count: {
          select: { bookshelf: true, purchases: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result = documents.map((doc) => ({
      _id: doc.id,
      title: doc.title,
      summary: doc.content?.substring(0, 150)?.replace(/<[^>]*>/g, '') || '',
      viewCount: doc._count.bookshelf * 10,
      author: doc.author,
      price: doc.price,
      purchaseCount: doc._count.purchases,
      createdAt: doc.createdAt,
    }));

    res.json(result);
  } catch (error) {
    console.error('Get new documents error:', error);
    res.status(500).json({ error: 'Failed to fetch new documents' });
  }
});

// Search documents
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json([]);
    }

    const documents = await prisma.document.findMany({
      take: 20,
      where: {
        isPublic: true, // 只搜索公开文档
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        author: {
          select: { id: true, username: true, avatar: true },
        },
        _count: {
          select: { bookshelf: true, purchases: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const result = documents.map((doc) => ({
      _id: doc.id,
      title: doc.title,
      summary: doc.content?.substring(0, 150)?.replace(/<[^>]*>/g, '') || '',
      viewCount: doc._count.bookshelf * 10,
      author: doc.author,
      price: doc.price,
      purchaseCount: doc._count.purchases,
      createdAt: doc.createdAt,
    }));

    res.json(result);
  } catch (error) {
    console.error('Search documents error:', error);
    res.status(500).json({ error: 'Failed to search documents' });
  }
});

export default router;
