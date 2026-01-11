import express from 'express';
import Chat from '../models/Chat.js';
import { verifyAdmin } from '../middleware/auth.js';

const router = express.Router();

// Create chat (public)
router.post('/create', async (req, res) => {
    try {
        const { content } = req.body;
        const chat = await Chat.create({ content });
        res.status(201).json({ success: true, chat });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List all chats (public)
router.get('/list', async (req, res) => {
    try {
        const chats = await Chat.find()
            .select('_id title content isPinned updatedAt')
            .sort({ updatedAt: -1 });
        res.json({ success: true, chats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Search chats (public)
router.get('/search', async (req, res) => {
    try {
        const { q } = req.query;
        const chats = await Chat.find({
            $or: [
                { title: { $regex: q, $options: 'i' } },
                { content: { $regex: q, $options: 'i' } },
            ],
        })
            .select('_id title content updatedAt')
            .sort({ updatedAt: -1 });
        res.json({ success: true, chats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single chat (public)
router.get('/:id', async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);
        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }
        res.json({ success: true, chat });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update chat (public)
router.put('/:id', async (req, res) => {
    try {
        const { content, title, isTitleManual, isPinned } = req.body;
        const chat = await Chat.findById(req.params.id);
        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }
        if (content !== undefined) chat.content = content;
        if (title !== undefined) chat.title = title;
        if (isTitleManual !== undefined) chat.isTitleManual = isTitleManual;
        if (isPinned !== undefined) chat.isPinned = isPinned;

        await chat.save();
        res.json({ success: true, chat });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete chat (admin only)
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        const chat = await Chat.findByIdAndDelete(req.params.id);
        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }
        res.json({ success: true, message: 'Chat deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
