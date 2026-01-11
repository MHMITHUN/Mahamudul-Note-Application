'use client';

import { useState, useEffect, useMemo } from 'react';
import { Menu, X, Plus, MessageSquare } from 'lucide-react';
import SearchBar from './SearchBar';
import ThemeToggle from './ThemeToggle';
import { ChatListSkeleton } from './LoadingStates';

export default function Sidebar({
    chats,
    selectedChatId,
    onSelectChat,
    onNewChat,
    isAdmin,
    onLogout,
    loading,
}) {
    const [isOpen, setIsOpen] = useState(true);
    const [searchResults, setSearchResults] = useState(null);
    const [searching, setSearching] = useState(false);

    const displayChats = searchResults !== null ? searchResults : chats;

    const handleSearch = async (query) => {
        setSearching(true);
        try {
            const response = await fetch(`/api/chat/search?q=${encodeURIComponent(query)}`);
            const data = await response.json();
            if (data.success) {
                setSearchResults(data.chats);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setSearching(false);
        }
    };

    const handleClearSearch = () => {
        setSearchResults(null);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 z-50 w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    }`}
            >
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <MessageSquare className="w-6 h-6" />
                            My Notes
                        </h1>
                        <div className="flex items-center gap-2">
                            <ThemeToggle />
                            <button
                                onClick={() => setIsOpen(false)}
                                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* New Chat Button */}
                    <button
                        onClick={onNewChat}
                        className="w-full flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        New Chat
                    </button>
                </div>

                {/* Search */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <SearchBar onSearch={handleSearch} onClear={handleClearSearch} />
                </div>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading || searching ? (
                        <ChatListSkeleton />
                    ) : displayChats.length === 0 ? (
                        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                            {searchResults !== null ? 'No results found' : 'No chats yet'}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {displayChats.map((chat) => (
                                <button
                                    key={chat._id}
                                    onClick={() => {
                                        onSelectChat(chat._id);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full text-left p-3 rounded-lg transition-colors ${selectedChatId === chat._id
                                            ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500'
                                            : 'hover:bg-gray-100 dark:hover:bg-gray-800 border-2 border-transparent'
                                        }`}
                                >
                                    <h3 className="font-medium text-gray-900 dark:text-white truncate mb-1">
                                        {chat.title || 'Untitled'}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        {formatDate(chat.updatedAt)}
                                    </p>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer - Admin Status */}
                {isAdmin && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full" />
                                <span className="text-sm text-gray-700 dark:text-gray-300">Admin</span>
                            </div>
                            <button
                                onClick={onLogout}
                                className="text-sm text-red-600 dark:text-red-400 hover:underline"
                            >
                                Logout
                            </button>
                        </div>
                    </div>
                )}
            </aside>

            {/* Mobile Menu Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed top-4 left-4 z-30 lg:hidden p-2 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
                >
                    <Menu className="w-6 h-6" />
                </button>
            )}
        </>
    );
}
