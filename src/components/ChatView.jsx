'use client';

import { useState, useEffect } from 'react';
import { Trash2, Edit3, Save, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import useAutoSave from '@/hooks/useAutoSave';
import { ChatViewSkeleton, EmptyState } from './LoadingStates';

export default function ChatView({ chatId, isAdmin, onDelete, onChatUpdate }) {
    const [chat, setChat] = useState(null);
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showPreview, setShowPreview] = useState(false);

    // Auto-save functionality (only for admin when editing)
    useAutoSave(isAdmin && isEditing ? content : '', chatId);

    useEffect(() => {
        if (chatId) {
            fetchChat();
        } else {
            setChat(null);
            setContent('');
            setIsEditing(false);
        }
    }, [chatId]);

    const fetchChat = async () => {
        setLoading(true);
        try {
            const response = await fetch(`/api/chat/${chatId}`);
            const data = await response.json();
            if (data.success) {
                setChat(data.chat);
                setContent(data.chat.content);
            }
        } catch (error) {
            console.error('Fetch chat error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this note?')) return;

        try {
            const response = await fetch(`/api/chat/${chatId}`, {
                method: 'DELETE',
            });

            if (response.ok) {
                onDelete(chatId);
            } else {
                alert('Failed to delete chat');
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete chat');
        }
    };

    const handleSave = async () => {
        try {
            const response = await fetch(`/api/chat/${chatId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
            });

            if (response.ok) {
                const data = await response.json();
                setChat(data.chat);
                setIsEditing(false);
                onChatUpdate();
            } else {
                alert('Failed to save chat');
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to save chat');
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleString();
    };

    if (!chatId) {
        return (
            <EmptyState
                icon={FileText}
                title="No Chat Selected"
                description="Select a chat from the sidebar or create a new one to get started"
            />
        );
    }

    if (loading) {
        return <ChatViewSkeleton />;
    }

    if (!chat) {
        return (
            <EmptyState
                icon={FileText}
                title="Chat Not Found"
                description="The selected chat could not be loaded"
            />
        );
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-gray-900">
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                            {chat.title}
                        </h1>
                        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                            <span>Created: {formatDate(chat.createdAt)}</span>
                            <span>•</span>
                            <span>Updated: {formatDate(chat.updatedAt)}</span>
                        </div>
                    </div>

                    {/* Admin Actions */}
                    {isAdmin && (
                        <div className="flex items-center gap-2 ml-4">
                            {!isEditing ? (
                                <>
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={handleDelete}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Delete
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={handleSave}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                                    >
                                        <Save className="w-4 h-4" />
                                        Save
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsEditing(false);
                                            setContent(chat.content);
                                        }}
                                        className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Preview Toggle */}
                {isEditing && (
                    <div className="mt-4 flex items-center gap-2">
                        <button
                            onClick={() => setShowPreview(!showPreview)}
                            className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
                        >
                            {showPreview ? 'Hide Preview' : 'Show Preview'}
                        </button>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            (Auto-saving...)
                        </span>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
                {isEditing ? (
                    <div className={showPreview ? 'grid grid-cols-2 gap-4 h-full' : ''}>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            className="w-full h-full min-h-[400px] p-4 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none"
                            placeholder="Start typing your note..."
                        />
                        {showPreview && (
                            <div className="prose dark:prose-invert max-w-none p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg overflow-y-auto">
                                <ReactMarkdown>{content}</ReactMarkdown>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="prose dark:prose-invert max-w-none">
                        <ReactMarkdown>{chat.content}</ReactMarkdown>
                    </div>
                )}
            </div>
        </div>
    );
}
