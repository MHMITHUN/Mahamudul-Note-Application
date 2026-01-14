import mongoose from 'mongoose';

/**
 * Cached MongoDB connection for serverless environments
 * 
 * Why this is needed:
 * - Vercel serverless functions are ephemeral and stateless
 * - Each invocation may spin up a new container (cold start)
 * - We need to cache the connection to avoid exhausting MongoDB connection pool
 * - When a container is warm (reused), we reuse the existing connection
 */

// Module-level cache that survives across warm starts
let cachedConnection = null;

/**
 * Connect to MongoDB with connection caching (singleton pattern)
 * @returns {Promise<typeof mongoose>} Mongoose instance
 */
export async function connectDB() {
    // If we already have a valid connection, reuse it
    if (cachedConnection && mongoose.connection.readyState === 1) {
        console.log('✅ Using cached MongoDB connection');
        return cachedConnection;
    }

    // If mongoose is in the process of connecting, wait for it
    if (mongoose.connection.readyState === 2) {
        console.log('⏳ MongoDB connection in progress, waiting...');
        // Wait for the connection to complete
        await new Promise((resolve) => {
            mongoose.connection.once('connected', resolve);
        });
        cachedConnection = mongoose;
        return cachedConnection;
    }

    try {
        console.log('🔄 Creating new MongoDB connection...');

        // Important: Use the MONGODB_URI from environment variables
        if (!process.env.MONGODB_URI) {
            throw new Error('MONGODB_URI is not defined in environment variables');
        }

        // Connect to MongoDB with optimized settings for serverless
        await mongoose.connect(process.env.MONGODB_URI, {
            dbName: 'mynote',
            // Serverless-optimized settings
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
            socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
            maxPoolSize: 10, // Limit connection pool size
            minPoolSize: 1, // Keep at least 1 connection ready
        });

        console.log('✅ MongoDB connected successfully');

        // Cache the mongoose instance for reuse
        cachedConnection = mongoose;

        return cachedConnection;
    } catch (error) {
        console.error('❌ MongoDB connection error:', error.message);
        // Reset cache on error so next request will retry
        cachedConnection = null;
        throw error;
    }
}

/**
 * Get the current connection state
 * @returns {string} Human-readable connection state
 */
export function getConnectionState() {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting',
    };
    return states[mongoose.connection.readyState] || 'unknown';
}
