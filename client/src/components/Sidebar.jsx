import { useState, useRef, useEffect } from 'react';
import { Plus, MessageSquare, Search, LogOut, User, MoreVertical, Edit2, Trash2, Check, X, Pin, PinOff } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

export default function Sidebar({
    chats,
    selectedChatId,
    onSelectChat,
    onNewChat,
    isAdmin,
    onLogout,
    onUpdate,
    onDelete,
    loading
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [menuOpenId, setMenuOpenId] = useState(null);
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setMenuOpenId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleRenameStart = (chat) => {
        setRenamingId(chat._id);
        setRenameValue(chat.title || '');
        setMenuOpenId(null);
    };

    const handleRenameSave = (id) => {
        if (renameValue.trim() && renameValue !== chats.find(c => c._id === id)?.title) {
            onUpdate(id, { title: renameValue, isTitleManual: true });
        }
        setRenamingId(null);
    };

    const filteredChats = chats.filter(chat =>
        chat.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.content?.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.updatedAt) - new Date(a.updatedAt);
    });

    return (
        <div className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full transition-colors duration-300">
            {/* Header */}
            <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <MessageSquare className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                            mahamudul note
                        </h1>
                    </div>
                    <ThemeToggle />
                </div>

                <button
                    onClick={onNewChat}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    New Chat
                </button>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search notes..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-white transition-all"
                    />
                </div>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
                {filteredChats.map(chat => (
                    <div key={chat._id} className="relative group">
                        {renamingId === chat._id ? (
                            <div className="flex items-center gap-1 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                                <input
                                    autoFocus
                                    type="text"
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleRenameSave(chat._id)}
                                    className="flex-1 bg-transparent border-none focus:ring-0 text-sm dark:text-white p-0"
                                />
                                <button onClick={() => handleRenameSave(chat._id)} className="p-1 text-green-500 hover:bg-green-100 dark:hover:bg-green-900/30 rounded">
                                    <Check className="w-3 h-3" />
                                </button>
                                <button onClick={() => setRenamingId(null)} className="p-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => onSelectChat(chat._id)}
                                className={`w-full text-left p-3 rounded-xl transition-all group relative ${selectedChatId === chat._id
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                                    }`}
                            >
                                <div className="font-medium truncate pr-8 flex items-center gap-2">
                                    {chat.isPinned && <Pin className="w-3 h-3 text-blue-500 fill-blue-500" />}
                                    {chat.title || 'Untitled Note'}
                                </div>
                                <div className="text-[10px] opacity-60 mt-1">
                                    {new Date(chat.updatedAt).toLocaleDateString(undefined, {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                                {selectedChatId === chat._id && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full" />
                                )}

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setMenuOpenId(menuOpenId === chat._id ? null : chat._id);
                                    }}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all"
                                >
                                    <MoreVertical className="w-4 h-4" />
                                </button>
                            </button>
                        )}

                        {menuOpenId === chat._id && (
                            <div
                                ref={menuRef}
                                className="absolute right-2 top-10 w-32 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 py-1 animate-in fade-in zoom-in duration-200"
                            >
                                <button
                                    onClick={() => {
                                        onUpdate(chat._id, { isPinned: !chat.isPinned });
                                        setMenuOpenId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    {chat.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                                    {chat.isPinned ? 'Unpin' : 'Pin'}
                                </button>
                                <button
                                    onClick={() => handleRenameStart(chat)}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    Rename
                                </button>
                                {isAdmin && (
                                    <button
                                        onClick={() => {
                                            onDelete(chat._id);
                                            setMenuOpenId(null);
                                        }}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        Delete
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {filteredChats.length === 0 && (
                    <div className="text-center py-10 text-gray-400 text-sm">
                        No notes found
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                {isAdmin ? (
                    <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-800 p-3 rounded-xl">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white">
                                <User className="w-4 h-4" />
                            </div>
                            <span className="text-sm font-medium dark:text-white">Admin</span>
                        </div>
                        <button
                            onClick={onLogout}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                ) : (
                    <a
                        href="/admin/login"
                        className="block text-center text-sm text-gray-500 hover:text-blue-600 transition-colors"
                    >
                        Admin Login
                    </a>
                )}
            </div>
        </div>
    );
}
