import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Admin login
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (
        username === process.env.ADMIN_USERNAME &&
        password === process.env.ADMIN_PASSWORD
    ) {
        const token = jwt.sign(
            { isAdmin: true, username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ success: true, token, user: { username, isAdmin: true } });
    } else {
        res.status(401).json({ error: 'Invalid credentials' });
    }
});

// Verify token
router.get('/verify', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.json({ isAdmin: false });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ isAdmin: decoded.isAdmin || false });
    } catch (error) {
        res.json({ isAdmin: false });
    }
});

export default router;
