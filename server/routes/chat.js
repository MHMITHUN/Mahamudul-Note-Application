import express from 'express';
import jwt from 'jsonwebtoken';
import Chat from '../models/Chat.js';
import { verifyAdmin, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Helper to check if request is authorized for a specific protected note
const isNoteAuthorized = (req, chatId) => {
    if (req.user?.isAdmin) return true;
    const noteToken = req.headers['x-note-token'];
    if (!noteToken) return false;
    try {
        const decoded = jwt.verify(noteToken, process.env.JWT_SECRET);
        return decoded.noteId === chatId.toString();
    } catch (err) {
        return false;
    }
};

// Create chat (public)
router.post('/create', optionalAuth, async (req, res) => {
    try {
        const { content, folderId, password } = req.body;
        const chatData = {
            content,
            folderId: folderId || null // null = root folder
        };

        if (password && password.trim().length > 0) {
            chatData.password = password.trim();
            chatData.isProtected = true;
        }

        const chat = await Chat.create(chatData);

        let noteToken = null;
        if (chat.isProtected) {
            noteToken = jwt.sign(
                { noteId: chat._id.toString() },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );
        }

        res.status(201).json({ success: true, chat, noteToken });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List all chats (public or admin, optionally filtered by folder)
router.get('/list', optionalAuth, async (req, res) => {
    try {
        const { folderId } = req.query;
        const isAdmin = req.user?.isAdmin || false;

        let chats;

        if (folderId === 'all') {
            // "All Notes" view:
            // 1. Admin sees EVERYTHING
            // 2. Users see: Root notes + Notes in Public folders
            // 3. Notes in Protected folders are HIDDEN from "All Notes"
            if (isAdmin) {
                chats = await Chat.find()
                    .select('_id title content isPinned isProtected folderId viewCount updatedAt')
                    .sort({ isPinned: -1, updatedAt: -1 });
            } else {
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
                            isProtected: 1,
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
                .select('_id title content isPinned isProtected folderId viewCount updatedAt')
                .sort({ isPinned: -1, updatedAt: -1 });
        }

        // For non-admin, mask content of protected notes in list
        const sanitizedChats = chats.map(c => {
            const item = typeof c.toObject === 'function' ? c.toObject() : { ...c };
            if (!isAdmin && item.isProtected) {
                item.content = '';
            }
            return item;
        });

        res.json({ success: true, chats: sanitizedChats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Search chats
router.get('/search', optionalAuth, async (req, res) => {
    try {
        const { q } = req.query;
        const isAdmin = req.user?.isAdmin || false;

        const chats = await Chat.find({
            $or: [
                { title: { $regex: q, $options: 'i' } },
                { content: { $regex: q, $options: 'i' } },
            ],
        })
            .select('_id title content isPinned isProtected updatedAt')
            .sort({ updatedAt: -1 });

        const sanitizedChats = chats.map(c => {
            const doc = c.toObject();
            if (!isAdmin && doc.isProtected) {
                doc.content = '';
            }
            return doc;
        });

        res.json({ success: true, chats: sanitizedChats });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single chat - tracks unique views
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);
        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        const isAdmin = req.user?.isAdmin || false;

        // If note is password protected and user is not admin & not authorized with token
        if (chat.isProtected && !isNoteAuthorized(req, chat._id)) {
            return res.json({
                success: true,
                isProtected: true,
                isLocked: true,
                chat: {
                    _id: chat._id,
                    title: chat.title,
                    isProtected: true,
                    isPinned: chat.isPinned,
                    folderId: chat.folderId,
                    viewCount: chat.viewCount || 0,
                    updatedAt: chat.updatedAt,
                    createdAt: chat.createdAt
                }
            });
        }

        // Track unique views using IP or a header
        const viewerIP = req.headers['x-forwarded-for'] || req.connection?.remoteAddress || 'unknown';
        const rawIdentifier = `${viewerIP}-${req.headers['user-agent']}`;
        const viewerIdentifier = rawIdentifier
            .substring(0, 100)
            .replace(/\./g, '_')
            .replace(/\$/g, '_');

        const lastViewed = chat.lastViewedBy?.get(viewerIdentifier);
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        if (!lastViewed || lastViewed < oneDayAgo) {
            chat.viewCount = (chat.viewCount || 0) + 1;
            if (!chat.lastViewedBy) chat.lastViewedBy = new Map();
            chat.lastViewedBy.set(viewerIdentifier, now);
            await chat.save();
        }

        res.json({
            success: true,
            chat,
            isProtected: chat.isProtected || false,
            isLocked: false
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Verify note password
router.post('/:id/verify', optionalAuth, async (req, res) => {
    try {
        const { password } = req.body;
        const chat = await Chat.findById(req.params.id).select('+password');

        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        // Admin bypass: always verified
        if (req.user?.isAdmin) {
            const noteToken = jwt.sign(
                { noteId: chat._id.toString() },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );
            return res.json({ success: true, verified: true, chat, noteToken });
        }

        // If not protected
        if (!chat.isProtected) {
            return res.json({ success: true, verified: true, chat });
        }

        // Verify password
        const isValid = await chat.verifyPassword(password);

        if (isValid) {
            const noteToken = jwt.sign(
                { noteId: chat._id.toString() },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );
            res.json({ success: true, verified: true, chat, noteToken });
        } else {
            res.status(401).json({ success: false, verified: false, error: 'Incorrect password' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Set / Change / Remove note password
router.post('/:id/password', optionalAuth, async (req, res) => {
    try {
        const { password, currentPassword } = req.body;
        const chat = await Chat.findById(req.params.id).select('+password');

        if (!chat) {
            return res.status(404).json({ error: 'Chat not found' });
        }

        const isAdmin = req.user?.isAdmin || false;

        // If note is already protected, verify current password unless admin
        if (chat.isProtected && !isAdmin) {
            if (!currentPassword) {
                return res.status(400).json({ error: 'Current password is required' });
            }
            const isValid = await chat.verifyPassword(currentPassword);
            if (!isValid) {
                return res.status(401).json({ error: 'Incorrect current password' });
            }
        }

        // Setting / updating password
        if (password && password.trim().length > 0) {
            chat.password = password.trim();
            chat.isProtected = true;
            await chat.save();

            const noteToken = jwt.sign(
                { noteId: chat._id.toString() },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            return res.json({
                success: true,
                message: 'Password set successfully',
                isProtected: true,
                noteToken,
                chat
            });
        } else {
            // Removing password
            chat.password = undefined;
            chat.isProtected = false;
            await chat.save();

            return res.json({
                success: true,
                message: 'Password protection removed',
                isProtected: false,
                chat
            });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update chat (with auth-aware restrictions)
router.put('/:id', optionalAuth, async (req, res) => {
    try {
        const { content, title, isTitleManual, isPinned, subnotes } = req.body;
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
            if (content !== undefined || title !== undefined || isTitleManual !== undefined || subnotes !== undefined) {
                return res.status(403).json({
                    error: 'This note is pinned. Only admin can edit pinned notes.'
                });
            }
        }

        // RESTRICTION 3: If note is protected and not admin, check note authorization
        if (chat.isProtected && !isNoteAuthorized(req, chat._id)) {
            return res.status(403).json({
                error: 'Password protected note. Verification required to make changes.'
            });
        }

        // Apply updates
        if (content !== undefined) chat.content = content;
        if (title !== undefined) chat.title = title;
        if (isTitleManual !== undefined) chat.isTitleManual = isTitleManual;
        if (isPinned !== undefined) chat.isPinned = isPinned;
        if (subnotes !== undefined) {
            chat.subnotes = subnotes.map(sn => ({
                ...sn,
                updatedAt: Date.now()
            }));
        }

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
