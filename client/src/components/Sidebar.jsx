import { useState, useRef, useEffect } from 'react';
import { Plus, MessageSquare, Search, LogOut, User, MoreVertical, Edit2, Trash2, Check, X, Pin, PinOff, Shield, Folder, Lock, Unlock, Key, ChevronRight, ChevronDown } from 'lucide-react';
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
    loading,
    isOpen,
    onClose,
    folders = [],
    selectedFolder = null,
    onFolderClick = () => { },
    onCreateFolder = () => { },
    onDeleteFolder = () => { },
    unlockedFolders = new Set(),
    unlockedNotes = new Set(),
    onOpenPasswordModal = () => { },
    onLockNote = () => { }
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [menuOpenId, setMenuOpenId] = useState(null);
    const [renamingId, setRenamingId] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [isFoldersExpanded, setIsFoldersExpanded] = useState(false);
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
        <>
            {/* Backdrop for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
                    onClick={onClose}
                />
            )}

            <div className={`
                fixed inset-y-0 left-0 z-50 w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 
                flex flex-col h-full transition-all duration-300 ease-in-out
                ${isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
                lg:relative lg:translate-x-0 lg:shadow-none
            `}>
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
                        <div className="flex items-center gap-1">
                            <ThemeToggle />
                            <button
                                onClick={onClose}
                                className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <button
                        onClick={onNewChat}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        New Chat
                    </button>

                    {/* Folders Section */}
                    <div className="space-y-1 pt-2">
                        <div className="flex items-center justify-between px-2">
                            <button
                                onClick={() => setIsFoldersExpanded(!isFoldersExpanded)}
                                className="flex items-center gap-1 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                            >
                                {isFoldersExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                Folders
                            </button>
                            <button
                                onClick={onCreateFolder}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-500 transition-colors"
                                title="New Folder"
                            >
                                <Plus className="w-3 h-3" />
                            </button>
                        </div>

                        {isFoldersExpanded && (
                            <div className="space-y-0.5 animate-in slide-in-from-top-2 duration-200">
                                {/* Root Folder (All Notes) */}
                                <button
                                    onClick={() => onFolderClick({ _id: 'all' })}
                                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${selectedFolder === 'all'
                                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                        }`}
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    <span className="flex-1 text-left truncate">All Notes</span>
                                </button>

                                {/* User Folders */}
                                {folders.map(folder => {
                                    const isLocked = folder.isProtected && !unlockedFolders.has(folder._id) && !isAdmin;
                                    return (
                                        <div key={folder._id} className="group flex items-center gap-1">
                                            <button
                                                onClick={() => onFolderClick(folder)}
                                                className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${selectedFolder === folder._id
                                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium'
                                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                                                    }`}
                                            >
                                                <span className="text-base">{folder.icon || '📁'}</span>
                                                <span className="flex-1 text-left truncate">{folder.name}</span>
                                                {folder.isProtected && (
                                                    isLocked ? <Lock className="w-3 h-3 text-gray-400" /> : <Unlock className="w-3 h-3 text-green-500" />
                                                )}
                                                {folder.chatCount > 0 && (
                                                    <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full">
                                                        {folder.chatCount}
                                                    </span>
                                                )}
                                            </button>
                                            {isAdmin && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteFolder(folder._id);
                                                    }}
                                                    className="p-1.5 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                                                    title="Delete Folder"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search notes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-none rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-white transition-all outline-none"
                        />
                    </div>
                </div>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
                    {filteredChats.map((chat, index) => {
                        const isNoteUnlocked = isAdmin || unlockedNotes.has(chat._id);
                        const isNearBottom = index >= Math.max(0, filteredChats.length - 2);

                        return (
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
                                    <>
                                        <button
                                            onClick={() => onSelectChat(chat._id)}
                                            className={`w-full text-left p-3 rounded-xl transition-all group relative ${selectedChatId === chat._id
                                                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                                                : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                                                }`}
                                        >
                                            <div className="font-medium pr-8 flex items-center gap-2 min-w-0">
                                                {chat.isPinned && <Pin className="w-3 h-3 text-blue-500 fill-blue-500 shrink-0" />}
                                                {chat.isProtected && (
                                                    isNoteUnlocked ? (
                                                        <Unlock className="w-3.5 h-3.5 text-emerald-500 shrink-0" title="Password protected (Unlocked)" />
                                                    ) : (
                                                        <Lock className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Password protected (Locked)" />
                                                    )
                                                )}
                                                <span className="truncate flex-1 min-w-0">{chat.title || 'Untitled Note'}</span>
                                            </div>
                                            <div className="text-[10px] opacity-60 mt-1 flex items-center gap-2">
                                                <span>
                                                    {new Date(chat.updatedAt).toLocaleDateString(undefined, {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </span>
                                                {chat.isProtected && (
                                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold tracking-wider ${
                                                        isNoteUnlocked
                                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                                                            : 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                                                    }`}>
                                                        {isNoteUnlocked ? 'UNLOCKED' : 'PROTECTED'}
                                                    </span>
                                                )}
                                            </div>
                                            {selectedChatId === chat._id && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-600 rounded-r-full" />
                                            )}
                                        </button>

                                        {/* 3-dots Menu button */}
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setMenuOpenId(menuOpenId === chat._id ? null : chat._id);
                                            }}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 opacity-70 sm:opacity-0 group-hover:opacity-100 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-all"
                                            title="Note options"
                                        >
                                            <MoreVertical className="w-4 h-4" />
                                        </button>
                                    </>
                                )}

                                {/* Dropdown Menu */}
                                {menuOpenId === chat._id && (
                                    <div
                                        ref={menuRef}
                                        className={`absolute right-2 w-44 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 py-1 animate-in fade-in zoom-in-95 duration-150 ${
                                            isNearBottom ? 'bottom-8' : 'top-10'
                                        }`}
                                    >
                                        {isAdmin && (
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
                                        )}

                                        {/* Lock Now option if currently unlocked */}
                                        {chat.isProtected && isNoteUnlocked && !isAdmin && (
                                            <button
                                                onClick={() => {
                                                    setMenuOpenId(null);
                                                    onLockNote(chat._id);
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors font-medium"
                                            >
                                                <Lock className="w-3.5 h-3.5" />
                                                Lock Note
                                            </button>
                                        )}

                                        {/* Password Protection menu items */}
                                        {!chat.isProtected ? (
                                            <button
                                                onClick={() => {
                                                    setMenuOpenId(null);
                                                    onOpenPasswordModal(chat, 'set');
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                                            >
                                                <Lock className="w-3.5 h-3.5" />
                                                Password Protect
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => {
                                                    setMenuOpenId(null);
                                                    onOpenPasswordModal(chat, 'change');
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                            >
                                                <Key className="w-3.5 h-3.5" />
                                                Change Password
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setMenuOpenId(null);
                                                    onOpenPasswordModal(chat, 'remove');
                                                }}
                                                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                            >
                                                <Unlock className="w-3.5 h-3.5" />
                                                Remove Password
                                            </button>
                                        </>
                                        )}

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
                        );
                    })}
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
                        <button
                            onClick={() => window.location.href = '/admin/login'}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 active:scale-95"
                        >
                            <Shield className="w-5 h-5" />
                            <span>Admin Access</span>
                        </button>
                    )}
                </div>
            </div>
        </>
    );
}
