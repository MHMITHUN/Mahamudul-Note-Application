import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Edit2, Eye, EyeOff, Trash2, Copy, Check, Clock, FileText, CheckCircle, AlertCircle, Menu, AlignLeft, Type, Share2, Plus, ChevronDown, ChevronRight, Layers, X, Maximize2, Lock, Unlock, Key, Loader2, Shield } from 'lucide-react';
import Swal from 'sweetalert2';

export default function ChatView({
    chat,
    isAdmin,
    onUpdate,
    onDelete,
    loading,
    onMenuClick,
    onManageSecurity = () => { },
    onUnlockNote = () => { },
    onLockNote = () => { },
    unlockedNotes = new Set()
}) {
    const isLocked = Boolean(
        chat && (
            chat.isLocked === true ||
            (chat.isProtected && !isAdmin && !unlockedNotes.has(chat._id))
        )
    );

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
    const [useRawView, setUseRawView] = useState(false);
    const [showSubnotesPanel, setShowSubnotesPanel] = useState(false);
    const [maximizedSubnoteId, setMaximizedSubnoteId] = useState(null);
    const autoSaveTimer = useRef(null);
    const subnoteAutoSaveTimer = useRef({});

    // Inline unlock form state
    const [inlinePassword, setInlinePassword] = useState('');
    const [showInlinePassword, setShowInlinePassword] = useState(false);
    const [inlineUnlockLoading, setInlineUnlockLoading] = useState(false);
    const [inlineUnlockError, setInlineUnlockError] = useState('');

    useEffect(() => {
        setContent(chat?.content || '');
        setTitle(chat?.title || '');
        setSubnotes(chat?.subnotes || []);
        setIsEditing(false);
        setIsEditingTitle(false);
        setEditingSubnoteId(null);
        setShowSubnotesPanel(false);
        setMaximizedSubnoteId(null);
        setInlinePassword('');
        setInlineUnlockError('');
    }, [chat?._id, isLocked]);

    // Keyboard Shortcuts
    useEffect(() => {
        if (!chat || isLocked) return;

        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveContent({ content });
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                setIsEditing(!isEditing);
            }
            if (e.shiftKey && e.key === 'Enter' && !e.ctrlKey && !e.metaKey) {
                e.preventDefault();
                saveContent({ content });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [chat, content, isEditing, isLocked]);

    const handleContentChange = (e) => {
        const newContent = e.target.value;
        setContent(newContent);

        if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
        setSaveStatus('Typing...');
        autoSaveTimer.current = setTimeout(() => {
            saveContent({ content: newContent });
        }, 5000);
    };

    const handleTitleChange = (e) => {
        setTitle(e.target.value);
    };

    const handleTitleBlur = () => {
        setIsEditingTitle(false);
        if (title !== chat?.title) {
            saveContent({ title, isTitleManual: true });
        }
    };

    const handleTitleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleTitleBlur();
        }
    };

    const saveContent = async (updates) => {
        if (!chat || isLocked) return;
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

    const handleDoubleClick = () => {
        if (isLocked) return;
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

    const handleInlineUnlockSubmit = async (e) => {
        e.preventDefault();
        if (!inlinePassword) {
            setInlineUnlockError('Please enter password');
            return;
        }

        setInlineUnlockError('');
        setInlineUnlockLoading(true);

        try {
            const success = await onUnlockNote(chat, inlinePassword);
            if (!success) {
                setInlineUnlockError('Incorrect password. Please try again.');
            } else {
                setInlinePassword('');
            }
        } catch (err) {
            setInlineUnlockError(err.message || 'Incorrect password');
        } finally {
            setInlineUnlockLoading(false);
        }
    };

    const getStats = () => {
        const words = content.trim() ? content.trim().split(/\s+/).length : 0;
        const readingTime = Math.ceil(words / 200);
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

    // Locked Note View
    if (isLocked) {
        return (
            <div className="flex-1 flex flex-col h-full overflow-hidden relative bg-white dark:bg-gray-950 transition-colors duration-300">
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
                            <div className="flex items-center gap-2">
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                                    {chat.title || 'Untitled Note'}
                                </h2>
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 shrink-0">
                                    <Lock className="w-2.5 h-2.5" />
                                    Locked
                                </span>
                            </div>
                            <span className="text-[10px] text-gray-400 font-medium">
                                Password protected note
                            </span>
                        </div>
                    </div>
                </div>

                {/* Inline Unlock Screen */}
                <div className="flex-1 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                    <div className="w-full max-w-sm bg-white dark:bg-gray-900/90 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-200 text-center">
                        <div className="w-14 h-14 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/10">
                            <Lock className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1.5">
                            This Note is Locked
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
                            Enter the password to unlock, view, and edit its contents.
                        </p>

                        <form onSubmit={handleInlineUnlockSubmit} className="space-y-4 text-left">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                                    Password
                                </label>
                                <div className="relative">
                                    <input
                                        type={showInlinePassword ? 'text' : 'password'}
                                        value={inlinePassword}
                                        onChange={(e) => {
                                            setInlinePassword(e.target.value);
                                            setInlineUnlockError('');
                                        }}
                                        className="w-full px-4 py-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700/80 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-gray-900 dark:text-white transition-all outline-none pr-11 text-sm placeholder:text-gray-400"
                                        placeholder="••••••••"
                                        required
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowInlinePassword(!showInlinePassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
                                        tabIndex={-1}
                                    >
                                        {showInlinePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                                {inlineUnlockError && (
                                    <p className="mt-2 text-xs font-medium text-red-500 dark:text-red-400 animate-in fade-in duration-200">
                                        {inlineUnlockError}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={inlineUnlockLoading}
                                className="w-full py-2.5 rounded-xl font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 transition-all shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 text-sm active:scale-95"
                            >
                                {inlineUnlockLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Unlocking...</span>
                                    </>
                                ) : (
                                    <>
                                        <Unlock className="w-4 h-4" />
                                        <span>Unlock Note</span>
                                    </>
                                )}
                            </button>
                        </form>
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
                            <div className="flex items-center gap-2">
                                <h2
                                    onClick={() => setIsEditingTitle(true)}
                                    className="text-xl font-bold text-gray-900 dark:text-white truncate cursor-pointer hover:text-blue-600 transition-colors"
                                    title="Click to rename"
                                >
                                    {title || 'Untitled Note'}
                                </h2>
                                {chat.isProtected && (
                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                                        isAdmin
                                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                    }`}>
                                        <Unlock className="w-2.5 h-2.5" />
                                        {isAdmin ? 'Admin View' : 'Unlocked'}
                                    </span>
                                )}
                            </div>
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

                <div className="flex items-center gap-1 sm:gap-2">
                    {/* Instant Lock Button (when protected note is currently unlocked) */}
                    {chat.isProtected && !isAdmin && (
                        <button
                            onClick={() => onLockNote(chat._id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-all shadow-sm active:scale-95"
                            title="Lock this note immediately"
                        >
                            <Lock className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Lock Note</span>
                        </button>
                    )}

                    {/* Manage Security (Change / Remove Password or Protect Note) */}
                    <button
                        onClick={() => onManageSecurity(chat)}
                        className={`p-2 rounded-xl transition-all ${
                            chat.isProtected
                                ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                                : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                        title={chat.isProtected ? 'Security settings (Change or Remove password)' : 'Protect note with password'}
                    >
                        {chat.isProtected ? <Key className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                    </button>

                    <button
                        onClick={() => setShowSubnotesPanel(!showSubnotesPanel)}
                        className={`p-2 rounded-xl transition-all ${
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
                            className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                            title={useRawView ? "Switch to Styled View" : "Switch to Raw View"}
                        >
                            {useRawView ? <Type className="w-5 h-5" /> : <AlignLeft className="w-5 h-5" />}
                        </button>
                    )}
                    <button
                        onClick={handleShare}
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                        title="Share Note"
                    >
                        {shared ? <Check className="w-5 h-5 text-green-500" /> : <Share2 className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={handleCopy}
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
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
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
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
