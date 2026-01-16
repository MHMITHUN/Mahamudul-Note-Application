import express from 'express';
import Folder from '../models/Folder.js';
import Chat from '../models/Chat.js';
import { verifyAdmin, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Create folder (public)
router.post('/create', async (req, res) => {
    try {
        const { name, description, password, icon } = req.body;

        if (!name || name.trim().length === 0) {
            return res.status(400).json({ error: 'Folder name is required' });
        }

        const folder = await Folder.create({
            name: name.trim(),
            description: description?.trim(),
            password, // Will be hashed by pre-save hook
            icon: icon || '📁',
        });

        res.status(201).json({ success: true, folder });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// List all folders with chat counts (public)
router.get('/list', async (req, res) => {
    try {
        const folders = await Folder.find().sort({ createdAt: -1 });

        // Get chat count for each folder
        const foldersWithCounts = await Promise.all(
            folders.map(async (folder) => {
                const chatCount = await Chat.countDocuments({ folderId: folder._id });
                return {
                    ...folder.toJSON(),
                    chatCount,
                };
            })
        );

        res.json({ success: true, folders: foldersWithCounts });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Verify folder password
router.post('/:id/verify', optionalAuth, async (req, res) => {
    try {
        const { password } = req.body;
        const folder = await Folder.findById(req.params.id);

        if (!folder) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        // Admin bypass: always verified
        if (req.user?.isAdmin) {
            return res.json({ success: true, verified: true });
        }

        // If folder is not protected
        if (!folder.isProtected) {
            return res.json({ success: true, verified: true });
        }

        // Verify password
        const isValid = await folder.verifyPassword(password);

        if (isValid) {
            res.json({ success: true, verified: true });
        } else {
            res.status(401).json({ success: false, verified: false, error: 'Incorrect password' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update folder (optional auth for password change)
router.put('/:id', optionalAuth, async (req, res) => {
    try {
        const { name, description, password, icon, currentPassword } = req.body;
        const folder = await Folder.findById(req.params.id);

        if (!folder) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        const isAdmin = req.user?.isAdmin || false;

        // If changing password, verify current password (unless admin)
        if (password !== undefined && !isAdmin && folder.isProtected) {
            if (!currentPassword) {
                return res.status(400).json({ error: 'Current password required to change password' });
            }
            const isValid = await folder.verifyPassword(currentPassword);
            if (!isValid) {
                return res.status(401).json({ error: 'Incorrect current password' });
            }
        }

        // Update fields
        if (name !== undefined) folder.name = name.trim();
        if (description !== undefined) folder.description = description?.trim();
        if (icon !== undefined) folder.icon = icon;
        if (password !== undefined) {
            folder.password = password; // Will be hashed by pre-save hook
        }

        await folder.save();

        res.json({ success: true, folder });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete folder (admin only) - cascade deletes all chats
router.delete('/:id', verifyAdmin, async (req, res) => {
    try {
        const folder = await Folder.findById(req.params.id);

        if (!folder) {
            return res.status(404).json({ error: 'Folder not found' });
        }

        // Count chats to be deleted
        const chatCount = await Chat.countDocuments({ folderId: folder._id });

        // Delete all chats in this folder (cascade delete)
        await Chat.deleteMany({ folderId: folder._id });

        await folder.deleteOne();

        res.json({
            success: true,
            message: `Folder and ${chatCount} chat(s) deleted`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
