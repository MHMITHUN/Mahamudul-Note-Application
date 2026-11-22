import { useState, useEffect } from 'react';
import { X, Lock, Unlock, Key, Eye, EyeOff, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';

export default function NoteSecurityModal({
    isOpen,
    chat,
    initialMode = 'set', // 'set' | 'change' | 'remove'
    isAdmin = false,
    onClose,
    onSave
}) {
    const [mode, setMode] = useState(initialMode);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setMode(chat?.isProtected ? (initialMode === 'remove' ? 'remove' : 'change') : 'set');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setShowCurrent(false);
            setShowNew(false);
            setShowConfirm(false);
            setError('');
        }
    }, [isOpen, chat?._id, chat?.isProtected, initialMode]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (mode === 'set' || mode === 'change') {
            if (!newPassword || newPassword.trim().length === 0) {
                setError('New password cannot be empty');
                return;
            }
            if (newPassword.length < 3) {
                setError('Password must be at least 3 characters long');
                return;
            }
            if (newPassword !== confirmPassword) {
                setError('New passwords do not match');
                return;
            }
        }

        if (chat?.isProtected && !isAdmin && (mode === 'change' || mode === 'remove')) {
            if (!currentPassword) {
                setError('Current password is required');
                return;
            }
        }

        setLoading(true);

        try {
            await onSave({
                chatId: chat._id,
                mode,
                password: mode === 'remove' ? '' : newPassword,
                currentPassword: currentPassword || undefined
            });
            onClose();
        } catch (err) {
            setError(err.message || 'Operation failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !chat) return null;

    const isProtected = chat.isProtected;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full p-6 border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button cleanly positioned */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors z-10"
                    aria-label="Close"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Header with safe padding */}
                <div className="flex items-center gap-3 pr-8 mb-4">
                    <div className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center border ${
                        mode === 'remove'
                            ? 'bg-red-500/10 border-red-500/20 text-red-500'
                            : mode === 'change'
                            ? 'bg-blue-500/10 border-blue-500/20 text-blue-500'
                            : 'bg-amber-500/10 border-amber-500/20 text-amber-500'
                    }`}>
                        {mode === 'remove' ? (
                            <Unlock className="w-5 h-5" />
                        ) : mode === 'change' ? (
                            <Key className="w-5 h-5" />
                        ) : (
                            <Lock className="w-5 h-5" />
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white leading-snug">
                            {mode === 'set' && 'Protect Note'}
                            {mode === 'change' && 'Change Password'}
                            {mode === 'remove' && 'Remove Password'}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5" title={chat.title}>
                            {chat.title || 'Untitled Note'}
                        </p>
                    </div>
                </div>

                {/* Mode Selector for Protected Notes */}
                {isProtected && (
                    <div className="flex bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl mb-4 text-xs font-semibold">
                        <button
                            type="button"
                            onClick={() => {
                                setMode('change');
                                setError('');
                            }}
                            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                mode === 'change'
                                    ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-white shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            <Key className="w-3.5 h-3.5" />
                            Change Password
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setMode('remove');
                                setError('');
                            }}
                            className={`flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                                mode === 'remove'
                                    ? 'bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                            }`}
                        >
                            <Unlock className="w-3.5 h-3.5" />
                            Remove Password
                        </button>
                    </div>
                )}

                {/* Admin bypass hint */}
                {isAdmin && isProtected && (
                    <div className="mb-4 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                        <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                        <span>Admin Access: Current password verification is bypassed.</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3.5">
                    {mode === 'set' && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                            Lock this note with a password. Anyone trying to view or edit this note will be required to enter this password. Admin can always view all notes.
                        </p>
                    )}

                    {mode === 'remove' && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                            <span>
                                Removing the password will make this note publicly readable and editable to anyone with the link.
                            </span>
                        </div>
                    )}

                    {/* Current Password Field */}
                    {isProtected && !isAdmin && (mode === 'change' || mode === 'remove') && (
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                                Current Password *
                            </label>
                            <div className="relative">
                                <input
                                    type={showCurrent ? 'text' : 'password'}
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-white transition-all outline-none pr-11 text-sm placeholder:text-gray-400"
                                    placeholder="Enter current password"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowCurrent(!showCurrent)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                                    tabIndex={-1}
                                >
                                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* New Password & Confirm Password */}
                    {(mode === 'set' || mode === 'change') && (
                        <>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                                    {mode === 'change' ? 'New Password *' : 'Password *'}
                                </label>
                                <div className="relative">
                                    <input
                                        type={showNew ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-white transition-all outline-none pr-11 text-sm placeholder:text-gray-400"
                                        placeholder="Enter password"
                                        required
                                        autoFocus={mode === 'set' || isAdmin}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowNew(!showNew)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                                        tabIndex={-1}
                                    >
                                        {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-600 dark:text-gray-300 mb-1.5">
                                    Confirm Password *
                                </label>
                                <div className="relative">
                                    <input
                                        type={showConfirm ? 'text' : 'password'}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-white transition-all outline-none pr-11 text-sm placeholder:text-gray-400"
                                        placeholder="Confirm password"
                                        required
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirm(!showConfirm)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                                        tabIndex={-1}
                                    >
                                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {error && (
                        <p className="text-xs font-medium text-red-500 dark:text-red-400 animate-in fade-in duration-200">
                            {error}
                        </p>
                    )}

                    <div className="flex gap-2.5 pt-2">
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
                            className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-white transition-all shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-50 active:scale-95 ${
                                mode === 'remove'
                                    ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20'
                                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                            }`}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Processing...</span>
                                </>
                            ) : mode === 'remove' ? (
                                <span>Remove Password</span>
                            ) : mode === 'change' ? (
                                <span>Update Password</span>
                            ) : (
                                <span>Set Password</span>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
