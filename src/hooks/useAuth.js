import { useState, useEffect } from 'react';

export default function useAuth() {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const response = await fetch('/api/auth/verify');
            const data = await response.json();
            setIsAdmin(data.isAdmin || false);
        } catch (error) {
            console.error('Auth check error:', error);
            setIsAdmin(false);
        } finally {
            setLoading(false);
        }
    };

    const login = async (username, password) => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (response.ok) {
                setIsAdmin(true);
                return { success: true };
            } else {
                return { success: false, error: data.error || 'Login failed' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Network error' };
        }
    };

    const logout = async () => {
        try {
            await fetch('/api/auth/verify', { method: 'POST' });
            setIsAdmin(false);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return { isAdmin, loading, login, logout, checkAuth };
}
