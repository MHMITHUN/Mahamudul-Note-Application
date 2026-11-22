import { useState, useEffect } from 'react';
import { X, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

export default function NotePasswordModal({ isOpen, chat, onClose, onVerify }) {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setPassword('');
            setShowPassword(false);
            setError('');
        }
    }, [isOpen, chat?._id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!password) {
            setError('Please enter the password');
            return;
        }

        setError('');
        setLoading(true);

        try {
            const success = await onVerify(chat._id, password);
            if (success) {
                setPassword('');
                onClose();
            } else {
                setError('Incorrect password. Please try again.');
            }
        } catch (err) {
            setError(err.message || 'Failed to verify password');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !chat) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <Lock className="w-6 h-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">
                                Locked Note
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5" title={chat.title}>
                                {chat.title || 'Untitled Note'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                        aria-label="Close"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-2">
                            Enter Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setError('');
                                }}
                                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-white transition-all outline-none pr-11"
                                placeholder="••••••••"
                                required
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        {error && (
                            <p className="mt-2 text-xs font-medium text-red-500 dark:text-red-400 animate-in fade-in duration-200">
                                {error}
                            </p>
                        )}
                    </div>

                    <div className="flex gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 text-sm"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Unlocking...</span>
                                </>
                            ) : (
                                <span>Unlock</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
