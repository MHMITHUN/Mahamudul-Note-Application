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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 animate-in fade-in zoom-in duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Create Folder</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Icon Picker */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Folder Icon
                        </label>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                            {iconOptions.map((emojiIcon) => (
                                <button
                                    key={emojiIcon}
                                    type="button"
                                    onClick={() => setIcon(emojiIcon)}
                                    className={`text-2xl p-2 rounded-lg transition-all ${icon === emojiIcon
                                        ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500'
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
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Folder Name *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:text-white transition-all outline-none"
                            placeholder="e.g., Work Notes, Personal, Projects"
                            required
                            maxLength={100}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Description (optional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:text-white transition-all outline-none resize-none"
                            placeholder="Brief description of this folder..."
                            rows={2}
                            maxLength={500}
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Password (optional) 🔒
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:text-white transition-all outline-none"
                            placeholder="Set a password to protect this folder"
                        />
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            Leave empty for public folder. Admin can access all folders.
                        </p>
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-colors shadow-lg shadow-blue-500/25"
                        >
                            {loading ? 'Creating...' : 'Create Folder'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
