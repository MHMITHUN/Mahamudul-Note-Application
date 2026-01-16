import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import folderRoutes from './routes/folder.js';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// MongoDB Connection Middleware (Vercel-safe)
// This ensures DB is connected before handling any request
// Uses cached connection when serverless container is warm
app.use(async (req, res, next) => {
    try {
        await connectDB();
        next();
    } catch (error) {
        console.error('Database connection failed:', error.message);
        res.status(500).json({
            error: 'Database connection failed',
            message: 'Please try again in a moment'
        });
    }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/folder', folderRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Notes API Server Running' });
});

// Export for Vercel
export default app;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
}
