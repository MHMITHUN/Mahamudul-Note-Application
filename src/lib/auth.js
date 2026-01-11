import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error('Please define the JWT_SECRET environment variable');
}

// Generate JWT token
export function generateToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

// Verify JWT token
export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

// Validate admin credentials
export function validateAdminCredentials(username, password) {
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
        throw new Error('Admin credentials not configured');
    }

    return username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
}

// Get token from request cookies
export function getTokenFromCookies(request) {
    const cookieHeader = request.headers.get('cookie');
    if (!cookieHeader) return null;

    const cookies = Object.fromEntries(
        cookieHeader.split('; ').map((c) => {
            const [key, ...v] = c.split('=');
            return [key, v.join('=')];
        })
    );

    return cookies.authToken || null;
}

// Verify if user is admin from request
export function verifyAdmin(request) {
    const token = getTokenFromCookies(request);
    if (!token) return false;

    const payload = verifyToken(token);
    return payload && payload.isAdmin === true;
}
