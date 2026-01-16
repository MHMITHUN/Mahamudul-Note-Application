import express from 'express';
import Chat from '../models/Chat.js';
import { verifyAdmin, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Create chat (public)
router.post('/create', async (req, res) => {
    try {
        const { content, folderId } = req.body;
        const chat = await Chat.create({
            content,
            folderId: folderId || null // null = root folder
        });
        res.status(201).json({ success: true, chat });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List all chats (public, optionally filtered by folder)
router.get('/list', async (req, res) => {
    try {
        const { folderId } = req.query;
        const isAdmin = req.user?.isAdmin; // Assuming verifyToken/optionalAuth middleware populates this if present

        let chats;

        if (folderId === 'all') {
            // "All Notes" view:
            // 1. Admin sees EVERYTHING
            // 2. Users see: Root notes + Notes in Public folders
            // 3. Notes in Protected folders are HIDDEN from "All Notes"

            if (isAdmin) {
                chats = await Chat.find()
                    .select('_id title content isPinned folderId viewCount updatedAt')
                    .sort({ isPinned: -1, updatedAt: -1 });
            } else {
                // Aggregation to filter based on folder protection
                chats = await Chat.aggregate([
                    {
                        $lookup: {
                            from: 'folders',
                            localField: 'folderId',
                            foreignField: '_id',
                            as: 'folder'
                        }
                    },
                    {
                        $unwind: {
                            path: '$folder',
                            preserveNullAndEmptyArrays: true // Keep root notes (folder is null)
                        }
                    },
                    {
                        $match: {
                            $or: [
                                { folderId: null }, // Root notes
                                { 'folder.isProtected': false } // Public folder notes
                            ]
                        }
                    },
                    {
                        $project: {
                            _id: 1,
                            title: 1,
                            content: 1,
                            isPinned: 1,
                            folderId: 1,
                            viewCount: 1,
                            updatedAt: 1
                        }
                    },
                    { $sort: { isPinned: -1, updatedAt: -1 } }
                ]);
            }
        } else {
            // Specific folder or Root only
            const query = folderId === 'root' || !folderId
                ? { folderId: null }
                : { folderId };

            chats = await Chat.find(query)
                .select('_id title content isPinned folderId viewCount updatedAt')
                .sort({ isPinned: -1, updatedAt: -1 });
        }

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

// Get single chat (public) - tracks unique views
router.get('/:id', async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);
        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        // Track unique views using IP or a header
        // Use combination of IP + User-Agent as unique identifier
        const viewerIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown';
        // IMPORTANT: Sanitize the identifier - Mongoose Maps don't support keys with '.' or '$'
        const rawIdentifier = `${viewerIP}-${req.headers['user-agent']}`;
        const viewerIdentifier = rawIdentifier
            .substring(0, 100)
            .replace(/\./g, '_')  // Replace dots with underscores
            .replace(/\$/g, '_'); // Replace dollar signs with underscores

        // Check if this viewer has viewed recently (within 24 hours)
        const lastViewed = chat.lastViewedBy?.get(viewerIdentifier);
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Only increment if new viewer OR last viewed more than 24 hours ago
        if (!lastViewed || lastViewed < oneDayAgo) {
            chat.viewCount = (chat.viewCount || 0) + 1;
            if (!chat.lastViewedBy) chat.lastViewedBy = new Map();
            chat.lastViewedBy.set(viewerIdentifier, now);
            await chat.save();
        }

        res.json({ success: true, chat });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update chat (with auth-aware restrictions)
router.put('/:id', optionalAuth, async (req, res) => {
    try {
        const { content, title, isTitleManual, isPinned } = req.body;
        const chat = await Chat.findById(req.params.id);

        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        const isAdmin = req.user?.isAdmin || false;

        // RESTRICTION 1: Only admin can pin/unpin
        if (isPinned !== undefined && !isAdmin) {
            return res.status(403).json({
                error: 'Only admin can pin/unpin notes'
            });
        }

        // RESTRICTION 2: If note is pinned, only admin can edit
        if (chat.isPinned && !isAdmin) {
            if (content !== undefined || title !== undefined || isTitleManual !== undefined) {
                return res.status(403).json({
                    error: 'This note is pinned. Only admin can edit pinned notes.'
                });
            }
        }

        // Apply updates
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
