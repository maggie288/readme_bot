import express from 'express';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get notes for a document
router.get('/document/:documentId', authenticateToken, async (req, res) => {
  try {
    const { documentId } = req.params;

    const notes = await prisma.note.findMany({
      where: {
        documentId: parseInt(documentId),
        userId: req.user.id,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(notes);
  } catch (error) {
    console.error('Get notes error:', error);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

// Create note
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { documentId, content, position } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Note content is required' });
    }

    const note = await prisma.note.create({
      data: {
        documentId,
        userId: req.user.id,
        content,
        position: position || null,
      },
    });

    res.status(201).json(note);
  } catch (error) {
    console.error('Create note error:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

// Update note
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    // Check if user owns the note
    const note = await prisma.note.findUnique({
      where: { id: parseInt(id) },
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (note.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to edit this note' });
    }

    const updatedNote = await prisma.note.update({
      where: { id: parseInt(id) },
      data: { content },
    });

    res.json(updatedNote);
  } catch (error) {
    console.error('Update note error:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

// Delete note
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user owns the note
    const note = await prisma.note.findUnique({
      where: { id: parseInt(id) },
    });

    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    if (note.userId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this note' });
    }

    await prisma.note.delete({
      where: { id: parseInt(id) },
    });

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Delete note error:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

export default router;
