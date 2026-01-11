import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Edit2, Eye, Trash2, Copy, Check, Clock, FileText, CheckCircle, AlertCircle } from 'lucide-react';

export default function ChatView({
    chat,
    isAdmin,
    onUpdate,
    onDelete,
    loading
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [content, setContent] = useState(chat?.content || '');
    const [title, setTitle] = useState(chat?.title || '');
    const [saving, setSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState('');
    const [copied, setCopied] = useState(false);
    const autoSaveTimer = useRef(null);

    useEffect(() => {
        setContent(chat?.content || '');
        setTitle(chat?.title || '');
        setIsEditing(false);
        setIsEditingTitle(false);
    }, [chat]);

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
        }, 1000);
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

    const getStats = () => {
        const words = content.trim() ? content.trim().split(/\s+/).length : 0;
        const readingTime = Math.ceil(words / 200); // Average 200 wpm
        return { words, readingTime };
    };

    const { words, readingTime } = getStats();

    if (!chat) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
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
        <div className="flex-1 flex flex-col h-full bg-white dark:bg-gray-950 transition-colors duration-300 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white/80 dark:bg-gray-950/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex flex-col flex-1 min-w-0 mr-4">
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
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                        <span>Last updated {new Date(chat.updatedAt).toLocaleString()}</span>
                        {saveStatus && (
                            <span className={`flex items-center gap-1 ${saveStatus === 'Error saving' ? 'text-red-500' : 'text-blue-500'}`}>
                                {saveStatus === 'Error saving' ? <AlertCircle className="w-3 h-3" /> : <CheckCircle className="w-3 h-3" />}
                                {saveStatus}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleCopy}
                        className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all"
                        title="Copy to clipboard"
                    >
                        {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5" />}
                    </button>
                    <button
                        onClick={() => setIsEditing(!isEditing)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-semibold transition-all ${isEditing
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                            }`}
                    >
                        {isEditing ? (
                            <><Eye className="w-4 h-4" /> Preview</>
                        ) : (
                            <><Edit2 className="w-4 h-4" /> Edit</>
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
                <div className="max-w-4xl mx-auto px-6 py-8 h-full">
                    {isEditing ? (
                        <textarea
                            value={content}
                            onChange={handleContentChange}
                            className="w-full h-full min-h-[500px] p-0 bg-transparent border-none focus:ring-0 text-gray-900 dark:text-gray-100 font-mono text-lg resize-none placeholder-gray-300 dark:placeholder-gray-700"
                            placeholder="Start writing your note here... (Markdown supported)"
                            autoFocus
                        />
                    ) : (
                        <div className="prose prose-lg dark:prose-invert max-w-none animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <ReactMarkdown>{content || '*No content yet.*'}</ReactMarkdown>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Bar */}
            <div className="px-6 py-2 bg-gray-50/50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-800 flex items-center gap-4 text-[10px] text-gray-400 font-medium">
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
                    <span className="hidden sm:inline">Ctrl+S: Save</span>
                </div>
            </div>
        </div>
    );
}
