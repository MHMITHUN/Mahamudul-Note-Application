import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Edit2, Eye, Trash2, Copy, Check, Clock, FileText, CheckCircle, AlertCircle, Menu, AlignLeft, Type, Share2, Plus, ChevronDown, ChevronRight, Layers, X, Maximize2 } from 'lucide-react';
import Swal from 'sweetalert2';

export default function ChatView({
    chat,
    isAdmin,
    onUpdate,
    onDelete,
    loading,
    onMenuClick
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [content, setContent] = useState(chat?.content || '');
    const [title, setTitle] = useState(chat?.title || '');
    const [subnotes, setSubnotes] = useState(chat?.subnotes || []);
    const [expandedSubnotes, setExpandedSubnotes] = useState(new Set());
    const [editingSubnoteId, setEditingSubnoteId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState('');
    const [copied, setCopied] = useState(false);
    const [shared, setShared] = useState(false);
    const [useRawView, setUseRawView] = useState(false); // Toggle between raw and styled preview
    const [showSubnotesPanel, setShowSubnotesPanel] = useState(false);
    const [maximizedSubnoteId, setMaximizedSubnoteId] = useState(null);
    const autoSaveTimer = useRef(null);
    const subnoteAutoSaveTimer = useRef({});

    useEffect(() => {
        setContent(chat?.content || '');
        setTitle(chat?.title || '');
        setSubnotes(chat?.subnotes || []);
        setIsEditing(false);
        setIsEditingTitle(false);
        setEditingSubnoteId(null);
        setShowSubnotesPanel(false);
        setMaximizedSubnoteId(null);
    }, [chat?._id]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!chat) return;

            // Ctrl + S to Save (already auto-saves, but good for habit)
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveContent({ content });
            }
            // Ctrl + E to Toggle Edit
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                setIsEditing(!isEditing);
            }
            // Shift + Enter to Save (Enter alone creates new lines)
            if (e.shiftKey && e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                saveContent({ content });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [chat, content, isEditing]);

    const handleContentChange = (e) => {
        const newContent = e.target.value;
        setContent(newContent);

        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        setSaveStatus('Typing...');
        autoSaveTimer.current = setTimeout(() => {
            saveContent({ content: newContent });
        }, 5000); // Changed from 1000ms to 5000ms (5 seconds)
    };

    const handleTitleChange = (e) => {
        setTitle(e.target.value);
    };

    const handleTitleBlur = () => {
        setIsEditingTitle(false);
        if (title !== chat.title) {
            saveContent({ title, isTitleManual: true });
        }
    };

    const handleTitleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleTitleBlur();
        }
    };

    const saveContent = async (updates) => {
        if (!chat) return;
        setSaving(true);
        setSaveStatus('Saving...');
        try {
            await onUpdate(chat._id, updates);
            setSaveStatus('Saved');
            setTimeout(() => setSaveStatus(''), 2000);
        } catch (error) {
            setSaveStatus('Error saving');
        } finally {
            setSaving(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = () => {
        const shareUrl = `${window.location.origin}/?note=${chat._id}`;
        navigator.clipboard.writeText(shareUrl);
        window.history.replaceState({}, '', `/?note=${chat._id}`);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
    };

    // Double-tap to edit handler
    const handleDoubleClick = () => {
        // Only allow edit if not pinned OR user is admin
        if (!chat.isPinned || isAdmin) {
            setIsEditing(true);
        } else {
            Swal.fire({
                title: 'Access Denied',
                text: 'This note is pinned. Only admin can edit pinned notes.',
                icon: 'warning',
                confirmButtonText: 'OK',
                confirmButtonColor: '#3b82f6',
                backdrop: true,
                customClass: {
                    popup: 'rounded-2xl',
                    confirmButton: 'rounded-xl px-6 py-2 font-semibold'
                }
            });
        }
    };

    const getStats = () => {
        const words = content.trim() ? content.trim().split(/\s+/).length : 0;
        const readingTime = Math.ceil(words / 200); // Average 200 wpm
        return { words, readingTime };
    };

    const { words, readingTime } = getStats();

    const generateObjectId = () => {
        const timestamp = Math.floor(Date.now() / 1000).toString(16);
        const randomHex = [...Array(16)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
        return timestamp + randomHex;
    };

    const handleAddSubnote = async () => {
        const newSubnote = {
            _id: generateObjectId(),
            title: 'Untitled Subnote',
            content: ''
        };
        const newSubnotes = [...subnotes, newSubnote];
        setSubnotes(newSubnotes);
        setEditingSubnoteId(newSubnote._id);
        setExpandedSubnotes(prev => new Set(prev).add(newSubnote._id));
        await saveContent({ subnotes: newSubnotes });
    };

    const handleSubnoteChange = (id, field, value) => {
        const updated = subnotes.map(sn => sn._id === id ? { ...sn, [field]: value } : sn);
        setSubnotes(updated);
        
        if (subnoteAutoSaveTimer.current[id]) clearTimeout(subnoteAutoSaveTimer.current[id]);
        setSaveStatus('Typing...');
        subnoteAutoSaveTimer.current[id] = setTimeout(() => {
            saveContent({ subnotes: updated });
        }, 2000);
    };

    const handleDeleteSubnote = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('Delete this subnote?')) return;
        const updated = subnotes.filter(sn => sn._id !== id);
        setSubnotes(updated);
        
        await saveContent({ subnotes: updated });
    };

    const toggleSubnoteExpand = (id) => {
        setExpandedSubnotes(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    if (!chat) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors duration-300 relative">
                {/* Hamburger menu for mobile when no chat selected */}
                <button
                    onClick={onMenuClick}
                    className="lg:hidden absolute top-4 left-4 p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors z-10"
                >
                    <Menu className="w-6 h-6" />
                </button>

                <div className="text-center space-y-6 max-w-md px-6 animate-in fade-in zoom-in duration-700">
                    <div className="relative mx-auto w-24 h-24">
                        <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full animate-pulse" />
                        <div className="relative w-24 h-24 bg-white dark:bg-gray-900 rounded-[2rem] shadow-xl flex items-center justify-center border border-gray-100 dark:border-gray-800">
                            <FileText className="w-12 h-12 text-blue-600" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Your Digital Garden</h2>
                        <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                            Select a note to start blooming your ideas, or create a new one to begin your journey.
                        </p>
                    </div>
                    <div className="flex flex-wrap justify-center gap-3 text-xs font-bold text-gray-400 uppercase tracking-widest">
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">Markdown</span>
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">Auto-Save</span>
                        <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full">Secure</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex h-full overflow-hidden relative bg-white dark:bg-gray-950 transition-colors duration-300">
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Header */}
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white/80 dark:bg-gray-950/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-3 flex-1 min-w-0 mr-2">
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <Menu className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col flex-1 min-w-0">
                        {isEditingTitle ? (
                            <input
                                type="text"
                                value={title}
                                onChange={handleTitleChange}
                                onBlur={handleTitleBlur}
                                onKeyDown={handleTitleKeyDown}
                                className="text-xl font-bold text-gray-900 dark:text-white bg-transparent border-none focus:ring-0 p-0 w-full"
                                autoFocus
                            />
                        ) : (
                            <h2
                                onClick={() => setIsEditingTitle(true)}
                                className="text-xl font-bold text-gray-900 dark:text-white truncate cursor-pointer hover:text-blue-600 transition-colors"
                                title="Click to rename"
                            >
                                {title || 'Untitled Note'}
                            </h2>
                        )}
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                                <span>Last updated {new Date(chat.updatedAt).toLocaleString()}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                <div className="flex items-center gap-1" title="Unique views">
                                    <Eye className="w-3 h-3" />
                                    <span>{chat.viewCount || 0}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    <span>{words} words</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>{readingTime} min</span>
                                </div>
                                {saveStatus && (
                                    <div className={`flex items-center gap-1 ${saveStatus === 'Error saving' ? 'text-red-500' : 'text-blue-500'}`}>
                                        {saveStatus === 'Saved' ? (
                                            <CheckCircle className="w-3 h-3 text-green-500" />
                                        ) : saveStatus === 'Saving...' ? (
                                            <Clock className="w-3 h-3 animate-spin" />
                                        ) : (
                                            <AlertCircle className="w-3 h-3" />
                                        )}
                                        <span className="hidden xs:inline">{saveStatus}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowSubnotesPanel(!showSubnotesPanel)}
                        className={`p-2 rounded-lg transition-all ${
                            showSubnotesPanel 
                                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400' 
                                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                        title="Toggle Subnotes"
                    >
                        <Layers className="w-5 h-5" />
                    </button>
                    {!isEditing && (
                        <button
                            onClick={() => setUseRawView(!useRawView)}
                            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                            title={useRawView ? "Switch to Styled View" : "Switch to Raw View"}
                        >
                            {useRawView ? <Type className="w-5 h-5" /> : <AlignLeft className="w-5 h-5" />}
                        </button>
                    )}
                    <button
                        onClick={handleShare}
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                        title="Share Note"
                    >
                        {shared ? <Check className="w-5 h-5 text-green-500" /> : <Share2 className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={handleCopy}
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                        title="Copy to clipboard"
                    >
                        {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={() => {
                            if (!chat.isPinned || isAdmin) {
                                setIsEditing(!isEditing);
                            } else {
                                Swal.fire({
                                    title: 'Access Denied',
                                    text: 'This note is pinned. Only admin can edit pinned notes.',
                                    icon: 'warning',
                                    confirmButtonText: 'OK',
                                    confirmButtonColor: '#3b82f6',
                                    backdrop: true,
                                    customClass: {
                                        popup: 'rounded-2xl',
                                        confirmButton: 'rounded-xl px-6 py-2 font-semibold'
                                    }
                                });
                            }
                        }}
                        disabled={chat.isPinned && !isAdmin}
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl font-semibold transition-all ${isEditing
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                            : (chat.isPinned && !isAdmin)
                                ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 cursor-not-allowed opacity-50'
                                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                        title={chat.isPinned && !isAdmin ? 'Pinned notes can only be edited by admin' : ''}
                    >
                        {isEditing ? (
                            <><Eye className="w-4 h-4" /> <span className="hidden sm:inline">Preview</span></>
                        ) : (
                            <><Edit2 className="w-4 h-4" /> <span className="hidden sm:inline">Edit</span></>
                        )}
                    </button>
                    {isAdmin && (
                        <button
                            onClick={() => onDelete(chat._id)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete Note"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 h-full">
                    {isEditing ? (
                        <textarea
                            value={content}
                            onChange={handleContentChange}
                            className="w-full h-full min-h-[500px] resize-none bg-transparent text-gray-900 dark:text-gray-100 focus:outline-none text-lg leading-relaxed"
                            style={{ caretColor: '#3b82f6' }}
                            placeholder="Start typing your note here..."
                            spellCheck={true}
                            autoFocus
                        />
                    ) : (
                        <div
                            className="prose prose-lg dark:prose-invert max-w-none animate-in fade-in slide-in-from-bottom-4 duration-500 cursor-pointer"
                            style={useRawView ? { whiteSpace: 'pre-wrap' } : {}}
                            onDoubleClick={handleDoubleClick}
                            title={chat.isPinned && !isAdmin ? 'Pinned note - Admin only' : 'Double-click to edit'}
                        >
                            {useRawView ? (
                                <div className="text-lg leading-relaxed">{content || '*No content yet.*'}</div>
                            ) : (
                                <ReactMarkdown>{content || '*No content yet.*'}</ReactMarkdown>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Bar */}
            <div className="px-4 sm:px-6 py-2 bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 flex items-center gap-4 text-[10px] text-gray-400 font-medium z-10">
                <div className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {words} words
                </div>
                <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {readingTime} min read
                </div>
                <div className="ml-auto flex items-center gap-3">
                    <span className="hidden sm:inline">Ctrl+E: Edit</span>
                    <span className="hidden sm:inline">Shift+Enter: Save</span>
                </div>
            </div>
            </div>

            {/* Right Subnotes Panel */}
            {showSubnotesPanel && (
                <>
                    {/* Backdrop to detect clicks outside */}
                    <div 
                        className="absolute inset-0 z-10 bg-transparent" 
                        onClick={() => setShowSubnotesPanel(false)}
                    />
                    <div className="w-80 md:w-96 shrink-0 border-l border-gray-200 dark:border-gray-800 bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-xl flex flex-col h-full absolute right-0 top-0 bottom-0 z-20 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] dark:shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.5)] animate-in slide-in-from-right-8 duration-300">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <Layers className="w-5 h-5 text-blue-500" />
                            Subnotes
                            <span className="text-xs font-medium bg-gray-200 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                                {subnotes.length}
                            </span>
                        </h3>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleAddSubnote}
                                className="p-1.5 text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-500/20 rounded-lg transition-colors"
                                title="Add Subnote"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setShowSubnotesPanel(false)}
                                className="p-1.5 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                title="Close Panel"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                        {subnotes.length === 0 ? (
                            <div className="text-center py-10 text-gray-400 dark:text-gray-500 text-sm border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl">
                                <Layers className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                No subnotes yet.<br />Click the + icon to create one.
                            </div>
                        ) : (
                            subnotes.map((subnote) => (
                                <SubnoteItem
                                    key={subnote._id}
                                    subnote={subnote}
                                    isExpanded={expandedSubnotes.has(subnote._id)}
                                    toggleExpand={toggleSubnoteExpand}
                                    onUpdate={handleSubnoteChange}
                                    onDelete={handleDeleteSubnote}
                                    onMaximize={setMaximizedSubnoteId}
                                />
                            ))
                        )}
                    </div>
                </div>
                </>
            )}

            {/* Maximized Subnote Modal */}
            {maximizedSubnoteId && (
                <div 
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                    onClick={() => setMaximizedSubnoteId(null)}
                >
                    <div 
                        className="w-full max-w-5xl h-[85vh] bg-white dark:bg-gray-950 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border border-gray-200 dark:border-gray-800"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {subnotes.find(s => s._id === maximizedSubnoteId) && (
                            <SubnoteItem
                                subnote={subnotes.find(s => s._id === maximizedSubnoteId)}
                                isExpanded={true}
                                toggleExpand={() => {}}
                                onUpdate={handleSubnoteChange}
                                onDelete={handleDeleteSubnote}
                                onMaximize={setMaximizedSubnoteId}
                                isMaximized={true}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

function SubnoteItem({ subnote, isExpanded, toggleExpand, onUpdate, onDelete, onMaximize, isMaximized }) {
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [useRawView, setUseRawView] = useState(false);
    const [copied, setCopied] = useState(false);
    const [isEditing, setIsEditing] = useState(!subnote.content);

    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(subnote.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className={`border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm transition-all flex flex-col group ${isMaximized ? 'h-full w-full rounded-2xl shadow-2xl' : 'rounded-xl overflow-hidden'}`}>
            <div 
                className={`flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-colors ${isMaximized ? 'border-b border-gray-200 dark:border-gray-800' : ''}`}
                onClick={() => !isMaximized && toggleExpand(subnote._id)}
            >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    {!isMaximized && (
                        isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                    )}
                    
                    {isEditingTitle ? (
                        <input
                            type="text"
                            value={subnote.title}
                            onChange={(e) => onUpdate(subnote._id, 'title', e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            onBlur={() => setIsEditingTitle(false)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') setIsEditingTitle(false);
                            }}
                            className={`font-semibold text-gray-900 dark:text-white bg-transparent border-none focus:ring-0 p-0 w-full ${isMaximized ? 'text-xl' : 'text-[15px]'}`}
                            autoFocus
                        />
                    ) : (
                        <h4 
                            className={`font-semibold text-gray-900 dark:text-white truncate ${isMaximized ? 'text-xl' : 'text-[15px]'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsEditingTitle(true);
                            }}
                            title="Click to rename"
                        >
                            {subnote.title || 'Untitled Subnote'}
                        </h4>
                    )}
                </div>
                
                <div className={`flex items-center gap-1 ${isMaximized ? '' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                    {(isExpanded || isMaximized) && (
                        <>
                            <button
                                onClick={(e) => { e.stopPropagation(); setUseRawView(!useRawView); }}
                                className={`p-1.5 rounded-md transition-colors ${useRawView ? 'text-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10'}`}
                                title={useRawView ? "Styled View" : "Raw View"}
                            >
                                {useRawView ? <Type className="w-4 h-4" /> : <AlignLeft className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); setIsEditing(!isEditing); }}
                                className={`p-1.5 rounded-md transition-colors ${isEditing ? 'text-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10'}`}
                                title={isEditing ? "Preview" : "Edit"}
                            >
                                {isEditing ? <Eye className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                            </button>
                            <button
                                onClick={handleCopy}
                                className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/10 rounded-md transition-colors"
                                title="Copy Content"
                            >
                                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                            </button>
                            {!isMaximized && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onMaximize(subnote._id); }}
                                    className="p-1.5 text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-500/10 rounded-md transition-colors"
                                    title="Open Large"
                                >
                                    <Maximize2 className="w-4 h-4" />
                                </button>
                            )}
                        </>
                    )}
                    {!isMaximized && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(subnote._id, e); }}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"
                            title="Delete Subnote"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    )}
                    {isMaximized && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onMaximize(null); }}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors ml-2"
                            title="Close Window"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {(isExpanded || isMaximized) && (
                <div className={`border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950/30 flex-1 flex flex-col min-h-0 ${isMaximized ? 'p-6' : 'p-3'} animate-in slide-in-from-top-1 duration-200`}>
                    {isEditing ? (
                        <textarea
                            value={subnote.content}
                            onChange={(e) => onUpdate(subnote._id, 'content', e.target.value)}
                            placeholder="Write your subnote content here..."
                            className={`w-full resize-none bg-transparent text-gray-700 dark:text-gray-300 focus:outline-none placeholder-gray-400 leading-relaxed custom-scrollbar ${isMaximized ? 'h-full text-lg' : 'min-h-[120px] text-[14px]'}`}
                            style={{ caretColor: '#3b82f6' }}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                        />
                    ) : (
                        <div 
                            className={`overflow-y-auto custom-scrollbar prose dark:prose-invert max-w-none ${isMaximized ? 'h-full text-lg' : 'max-h-[300px] text-[14px]'}`}
                            style={useRawView ? { whiteSpace: 'pre-wrap' } : {}}
                            onDoubleClick={(e) => {
                                e.stopPropagation();
                                setIsEditing(true);
                            }}
                        >
                            {useRawView ? (
                                <div>{subnote.content || '*No content yet.*'}</div>
                            ) : (
                                <ReactMarkdown>{subnote.content || '*No content yet.*'}</ReactMarkdown>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
