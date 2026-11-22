import { useState } from 'react';
import { X } from 'lucide-react';
import Swal from 'sweetalert2';

export default function CreateFolderModal({ isOpen, onClose, onCreateFolder }) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [password, setPassword] = useState('');
    const [icon, setIcon] = useState('📁');
    const [loading, setLoading] = useState(false);

    // Enhanced icon options organized by category
    const iconOptions = [
        // Folders & Files
        '📁', '📂', '🗂️', '📋', '📄', '📝', '📚', '📖', '📑', '📓',
        // Work & Business
        '💼', '🏢', '💻', '🖥️', '⚙️', '🔧', '🛠️',
        // Creative & Design  
        '🎨', '🎯', '✨', '💡', '🎭', '🎬', '📸',
        // Special
        '⭐', '❤️', '🔒', '🔑', '🏆', '🎓', '🚀', '⚡', '🔥',
        // Nature
        '🌟', '🌈', '🌺', '🍀', '🌙',
    ];

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!name.trim()) {
            Swal.fire({
                title: 'Name Required',
                text: 'Please enter a folder name',
                icon: 'warning',
                confirmButtonColor: '#3b82f6',
            });
            return;
        }

        setLoading(true);
        try {
            await onCreateFolder({
                name: name.trim(),
                description: description.trim() || undefined,
                password: password || undefined,
                icon,
            });

            // Reset form
            setName('');
            setDescription('');
            setPassword('');
            setIcon('📁');
            onClose();
        } catch (error) {
            // Error is already handled in parent
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="relative overflow-hidden bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 border border-gray-100 dark:border-gray-800 animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors z-10"
                    aria-label="Close"
                >
                    <X className="w-4 h-4" />
                </button>

                <div className="mb-4 pr-8">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Folder</h2>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3.5">
                    {/* Icon Picker */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                            Folder Icon
                        </label>
                        <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto p-1 custom-scrollbar">
                            {iconOptions.map((emojiIcon) => (
                                <button
                                    key={emojiIcon}
                                    type="button"
                                    onClick={() => setIcon(emojiIcon)}
                                    className={`text-xl p-2 rounded-xl transition-all ${icon === emojiIcon
                                        ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500 scale-105'
                                        : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    {emojiIcon}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Folder Name */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                            Folder Name *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-white transition-all outline-none text-sm placeholder:text-gray-400"
                            placeholder="e.g., Work Notes, Personal, Projects"
                            required
                            maxLength={100}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                            Description (optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-white transition-all outline-none resize-none text-sm placeholder:text-gray-400"
                            placeholder="Brief description of this folder..."
                            rows={2}
                            maxLength={500}
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-1.5">
                            Password (optional) 🔒
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-white transition-all outline-none text-sm placeholder:text-gray-400"
                            placeholder="Set a password to protect this folder"
                        />
                        <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                            Leave empty for public folder. Admin can access all folders.
                        </p>
                    </div>

                    {/* Buttons */}
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
                            className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-colors shadow-md shadow-blue-500/20 text-sm active:scale-95"
                        >
                            {loading ? 'Creating...' : 'Create Folder'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
