import { useState } from 'react';
import { X, Lock } from 'lucide-react';

export default function FolderPasswordModal({ isOpen, folder, onClose, onVerify }) {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const success = await onVerify(folder._id, password);
            if (success) {
                setPassword('');
                onClose();
            } else {
                setError('Incorrect password');
            }
        } catch (err) {
            setError(err.message || 'Failed to verify password');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !folder) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center">
                            <Lock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Locked Folder</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{folder.icon} {folder.name}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Enter Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError('');
                            }}
                            className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:text-white transition-all outline-none"
                            placeholder="••••••••"
                            required
                            autoFocus
                        />
                        {error && (
                            <p className="mt-2 text-sm text-red-500 animate-in fade-in duration-200">
                                {error}
                            </p>
                        )}
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 rounded-xl font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-3 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-colors shadow-lg shadow-blue-500/25"
                        >
                            {loading ? 'Verifying...' : 'Unlock'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
