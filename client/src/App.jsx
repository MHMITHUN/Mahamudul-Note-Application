import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import ThemeToggle from './components/ThemeToggle';
import CreateFolderModal from './components/CreateFolderModal';
import FolderPasswordModal from './components/FolderPasswordModal';
import NotePasswordModal from './components/NotePasswordModal';
import NoteSecurityModal from './components/NoteSecurityModal';
import { Loader2, User, MessageSquare, Eye, EyeOff } from 'lucide-react';

function App() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Folder state
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState('all'); // 'all' = All Notes view
  const [unlockedFolders, setUnlockedFolders] = useState(new Set());
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordModalFolder, setPasswordModalFolder] = useState(null);

  // Note Password Protection state
  const [unlockedNotes, setUnlockedNotes] = useState(new Set());
  const [unlockedNoteTokens, setUnlockedNoteTokens] = useState({});
  const [showNotePasswordModal, setShowNotePasswordModal] = useState(false);
  const [notePasswordModalChat, setNotePasswordModalChat] = useState(null);
  const [showNoteSecurityModal, setShowNoteSecurityModal] = useState(false);
  const [noteSecurityModalChat, setNoteSecurityModalChat] = useState(null);
  const [noteSecurityInitialMode, setNoteSecurityInitialMode] = useState('set');

  useEffect(() => {
    // Initialize theme - default to dark mode
    const savedTheme = localStorage.getItem('theme');

    if (savedTheme === 'dark' || !savedTheme) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Folders re-lock on refresh
    localStorage.removeItem('unlockedFolders');

    // Restore note unlock tokens for current browser session
    try {
      const savedTokens = JSON.parse(sessionStorage.getItem('note_tokens') || '{}');
      setUnlockedNoteTokens(savedTokens);
      setUnlockedNotes(new Set(Object.keys(savedTokens)));
    } catch (e) {
      console.error('Failed to parse note tokens from sessionStorage', e);
    }

    checkAuth();
    fetchFolders();

    const params = new URLSearchParams(window.location.search);
    const noteId = params.get('note');
    
    if (noteId) {
      handleSelectChat(noteId);
    }
    fetchChats(selectedFolder);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        handleNewChat();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setIsAdmin(data.isAdmin);
      if (!data.isAdmin) {
        localStorage.removeItem('token');
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    }
  };

  const fetchChats = async (folderId = selectedFolder) => {
    setLoading(true);
    try {
      let url;
      if (folderId === 'all') {
        url = '/api/chat/list?folderId=all';
      } else if (folderId === null || folderId === 'root') {
        url = '/api/chat/list?folderId=root';
      } else {
        url = `/api/chat/list?folderId=${folderId}`;
      }

      const token = localStorage.getItem('token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(url, { headers });
      const data = await res.json();
      if (data.success) {
        setChats(data.chats);
      }
    } catch (err) {
      console.error('Failed to fetch chats:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      const res = await fetch('/api/folder/list');
      const data = await res.json();
      if (data.success) {
        setFolders(data.folders);
      }
    } catch (err) {
      console.error('Failed to fetch folders:', err);
    }
  };

  const handleNewChat = async () => {
    setActionLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/chat/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          content: '# New Note\n\nStart typing your note here...',
          folderId: selectedFolder === 'all' ? null : selectedFolder
        })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedChat(data.chat);
        window.history.replaceState({}, '', `?note=${data.chat._id}`);
        await fetchChats(selectedFolder);
      } else {
        alert('Failed to create note: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('New chat error:', err);
      alert('Network error while creating note. Is the backend running?');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSelectChat = async (id, tokenOverride = null) => {
    try {
      const token = localStorage.getItem('token');
      const headers = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const noteToken = tokenOverride || unlockedNoteTokens[id];
      if (noteToken) headers['x-note-token'] = noteToken;

      const res = await fetch(`/api/chat/${id}`, { headers });
      const data = await res.json();

      if (data.success) {
        // If the note is locked and user is not admin
        if (data.isLocked && !isAdmin) {
          setSelectedChat(data.chat);
          setNotePasswordModalChat(data.chat);
          setShowNotePasswordModal(true);
          window.history.replaceState({}, '', `?note=${id}`);
          setIsSidebarOpen(false);
          return;
        }

        setSelectedChat(data.chat);
        window.history.replaceState({}, '', `?note=${data.chat._id}`);
        setIsSidebarOpen(false); // Close sidebar on mobile after selection

        if (data.chat.isProtected) {
          setUnlockedNotes(prev => new Set(prev).add(id));
        }

        // Update the chat in local list
        setChats(prev => {
          const existing = prev.find(c => c._id === id);
          if (existing) {
            return prev.map(c => c._id === id ? { ...existing, ...data.chat } : c);
          }
          return prev;
        });
      } else {
        alert('Failed to load note: ' + (data.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Failed to fetch chat details:', err);
      alert('Network error while loading note. Please check your connection.');
    }
  };

  const handleVerifyNotePassword = async (chatId, password) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/chat/${chatId}/verify`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ password })
      });
      const data = await res.json();

      if (data.verified) {
        if (data.noteToken) {
          setUnlockedNoteTokens(prev => ({ ...prev, [chatId]: data.noteToken }));
          try {
            const saved = JSON.parse(sessionStorage.getItem('note_tokens') || '{}');
            saved[chatId] = data.noteToken;
            sessionStorage.setItem('note_tokens', JSON.stringify(saved));
          } catch (e) {
            console.error(e);
          }
        }

        setUnlockedNotes(prev => new Set(prev).add(chatId));
        setSelectedChat(data.chat);
        window.history.replaceState({}, '', `?note=${chatId}`);

        // Update chats list
        setChats(prev => prev.map(c => c._id === chatId ? { ...c, isProtected: true, title: data.chat.title } : c));
        setShowNotePasswordModal(false);
        setNotePasswordModalChat(null);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Password verification error:', err);
      throw err;
    }
  };

  const handleSaveNoteSecurity = async ({ chatId, mode, password, currentPassword }) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/chat/${chatId}/password`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ password, currentPassword })
      });
      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to update password');
      }

      const Swal = (await import('sweetalert2')).default;

      if (data.isProtected) {
        // Note is now password protected (set or change)
        if (data.noteToken) {
          setUnlockedNoteTokens(prev => ({ ...prev, [chatId]: data.noteToken }));
          try {
            const saved = JSON.parse(sessionStorage.getItem('note_tokens') || '{}');
            saved[chatId] = data.noteToken;
            sessionStorage.setItem('note_tokens', JSON.stringify(saved));
          } catch (e) {
            console.error(e);
          }
        }
        setUnlockedNotes(prev => new Set(prev).add(chatId));

        // Update local state
        setChats(prev => prev.map(c => c._id === chatId ? { ...c, isProtected: true } : c));
        if (selectedChat && selectedChat._id === chatId) {
          setSelectedChat(prev => ({ ...prev, isProtected: true }));
        }

        Swal.fire({
          title: mode === 'change' ? 'Password Updated!' : 'Note Protected!',
          text: mode === 'change' ? 'The note password was changed successfully.' : 'This note is now password protected.',
          icon: 'success',
          confirmButtonColor: '#3b82f6',
          background: '#1f2937',
          color: '#f3f4f6',
          customClass: {
            popup: 'rounded-2xl',
            confirmButton: 'rounded-xl px-6 py-2.5 font-semibold shadow-lg'
          }
        });
      } else {
        // Password removed
        setUnlockedNotes(prev => {
          const next = new Set(prev);
          next.delete(chatId);
          return next;
        });
        setUnlockedNoteTokens(prev => {
          const next = { ...prev };
          delete next[chatId];
          return next;
        });
        try {
          const saved = JSON.parse(sessionStorage.getItem('note_tokens') || '{}');
          delete saved[chatId];
          sessionStorage.setItem('note_tokens', JSON.stringify(saved));
        } catch (e) {
          console.error(e);
        }

        // Update local state
        setChats(prev => prev.map(c => c._id === chatId ? { ...c, isProtected: false } : c));
        if (selectedChat && selectedChat._id === chatId) {
          setSelectedChat(prev => ({ ...prev, isProtected: false }));
        }

        Swal.fire({
          title: 'Protection Removed',
          text: 'This note is now public and no longer password protected.',
          icon: 'info',
          confirmButtonColor: '#3b82f6',
          background: '#1f2937',
          color: '#f3f4f6',
          customClass: {
            popup: 'rounded-2xl',
            confirmButton: 'rounded-xl px-6 py-2.5 font-semibold shadow-lg'
          }
        });
      }

      await fetchChats(selectedFolder);
    } catch (err) {
      console.error('Failed to update note security:', err);
      throw err;
    }
  };

  const handleOpenNoteSecurity = (chat, mode = 'set') => {
    setNoteSecurityModalChat(chat);
    setNoteSecurityInitialMode(mode);
    setShowNoteSecurityModal(true);
  };

  const handleOpenUnlockModal = (chat) => {
    setNotePasswordModalChat(chat);
    setShowNotePasswordModal(true);
  };

  const handleUpdateChat = async (id, updates) => {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const noteToken = unlockedNoteTokens[id];
    if (noteToken) headers['x-note-token'] = noteToken;

    try {
      const res = await fetch(`/api/chat/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        setChats(prev => prev.map(c => c._id === id ? { ...c, ...data.chat } : c));
        setSelectedChat(data.chat);
      } else {
        throw new Error(data.error || 'Failed to update note');
      }
    } catch (err) {
      console.error('Update failed:', err);
      throw err;
    }
  };

  const handleDeleteChat = async (id) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/chat/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setChats(prev => prev.filter(c => c._id !== id));
        setSelectedChat(null);
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  // Folder handlers
  const handleCreateFolder = async (folderData) => {
    const duplicateFolder = folders.find(
      f => f.name.toLowerCase() === folderData.name.toLowerCase()
    );

    if (duplicateFolder) {
      const Swal = (await import('sweetalert2')).default;
      Swal.fire({
        title: 'Duplicate Folder Name',
        html: `A folder named <strong>"${duplicateFolder.name}"</strong> already exists.<br>Please choose a different name.`,
        icon: 'warning',
        confirmButtonColor: '#3b82f6',
        confirmButtonText: 'OK',
        buttonsStyling: true,
        background: '#1f2937',
        color: '#f3f4f6',
        customClass: {
          popup: 'rounded-2xl',
          confirmButton: 'rounded-xl px-6 py-3 font-semibold shadow-lg',
          htmlContainer: 'text-gray-100'
        }
      });
      throw new Error('Duplicate folder name');
    }

    try {
      const res = await fetch('/api/folder/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folderData)
      });
      const data = await res.json();
      if (data.success) {
        setFolders(prev => [data.folder, ...prev]);
      }
    } catch (err) {
      console.error('Failed to create folder:', err);
      throw err;
    }
  };

  const handleFolderClick = async (folder) => {
    const folderId = folder._id;

    if (selectedFolder !== folderId) {
      setUnlockedFolders(new Set());
      localStorage.removeItem('unlockedFolders');
    }

    // Admin can access all folders without password
    if (isAdmin) {
      setSelectedFolder(folderId);
      await fetchChats(folderId);
      return;
    }

    // Check if folder is protected and not unlocked
    if (folder.isProtected && !unlockedFolders.has(folder._id)) {
      setPasswordModalFolder(folder);
      setShowPasswordModal(true);
    } else {
      setSelectedFolder(folderId);
      await fetchChats(folderId);
    }
  };

  const handleVerifyFolderPassword = async (folderId, password) => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/folder/${folderId}/verify`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ password })
      });
      const data = await res.json();

      if (data.verified) {
        const newUnlocked = new Set(unlockedFolders);
        newUnlocked.add(folderId);
        setUnlockedFolders(newUnlocked);

        setSelectedFolder(folderId);
        await fetchChats(folderId);

        setShowPasswordModal(false);
        setPasswordModalFolder(null);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to verify password:', err);
      throw err;
    }
  };

  const handleDeleteFolder = async (folderId) => {
    if (!window.confirm('Delete this folder and all its notes?')) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/folder/${folderId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setFolders(prev => prev.filter(f => f._id !== folderId));
        if (selectedFolder === folderId) {
          setSelectedFolder(null);
          fetchChats(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete folder:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    sessionStorage.removeItem('note_tokens');
    setIsAdmin(false);
    window.location.reload();
  };

  // Simple routing for admin login
  if (window.location.pathname === '/admin/login') {
    return <AdminLogin onLoginSuccess={() => {
      setIsAdmin(true);
      window.location.href = '/';
    }} />;
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950 transition-colors duration-300 overflow-hidden relative">
      <Sidebar
        chats={chats}
        selectedChatId={selectedChat?._id}
        onSelectChat={(id) => {
          const chat = chats.find(c => c._id === id);
          if (chat?.isProtected && !isAdmin && !unlockedNotes.has(id)) {
            setNotePasswordModalChat(chat);
            setShowNotePasswordModal(true);
          } else {
            handleSelectChat(id);
          }
        }}
        onNewChat={() => {
          handleNewChat();
          setIsSidebarOpen(false);
        }}
        isAdmin={isAdmin}
        onLogout={handleLogout}
        onUpdate={handleUpdateChat}
        onDelete={handleDeleteChat}
        loading={loading || actionLoading}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        folders={folders}
        selectedFolder={selectedFolder}
        onFolderClick={handleFolderClick}
        onCreateFolder={() => setShowCreateFolderModal(true)}
        onDeleteFolder={handleDeleteFolder}
        unlockedFolders={unlockedFolders}
        unlockedNotes={unlockedNotes}
        onOpenPasswordModal={handleOpenNoteSecurity}
      />

      <main className="flex-1 relative overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        ) : (
          <ChatView
            chat={selectedChat}
            isAdmin={isAdmin}
            onUpdate={handleUpdateChat}
            onDelete={handleDeleteChat}
            loading={actionLoading}
            onMenuClick={() => setIsSidebarOpen(true)}
            onManageSecurity={(chat) => handleOpenNoteSecurity(chat, chat.isProtected ? 'change' : 'set')}
            onUnlockNote={handleOpenUnlockModal}
          />
        )}
      </main>

      {/* Modals */}
      <CreateFolderModal
        isOpen={showCreateFolderModal}
        onClose={() => setShowCreateFolderModal(false)}
        onCreateFolder={handleCreateFolder}
      />
      <FolderPasswordModal
        isOpen={showPasswordModal}
        folder={passwordModalFolder}
        onClose={() => setShowPasswordModal(false)}
        onVerify={handleVerifyFolderPassword}
      />
      <NotePasswordModal
        isOpen={showNotePasswordModal}
        chat={notePasswordModalChat}
        onClose={() => {
          setShowNotePasswordModal(false);
          setNotePasswordModalChat(null);
        }}
        onVerify={handleVerifyNotePassword}
      />
      <NoteSecurityModal
        isOpen={showNoteSecurityModal}
        chat={noteSecurityModalChat}
        initialMode={noteSecurityInitialMode}
        isAdmin={isAdmin}
        onClose={() => {
          setShowNoteSecurityModal(false);
          setNoteSecurityModalChat(null);
        }}
        onSave={handleSaveNoteSecurity}
      />
    </div>
  );
}

// Premium Admin Login Component
function AdminLogin({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        localStorage.setItem('token', data.token);
        onLoginSuccess();
      } else {
        setError(data.error || 'Invalid username or password');
      }
    } catch (err) {
      setError('Connection refused. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] dark:bg-[#0a0a0a] p-4 transition-colors duration-500">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-purple-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative">
        <div className="absolute top-4 right-4 z-10">
          <ThemeToggle />
        </div>
        <div className="bg-white dark:bg-[#111] rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-10 border border-gray-100 dark:border-white/5 backdrop-blur-xl">
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/40 rotate-3 hover:rotate-0 transition-transform duration-300">
              <User className="w-8 h-8 text-white" />
            </div>
          </div>

          <h2 className="text-3xl font-black text-center text-gray-900 dark:text-white mb-2 tracking-tight">
            Admin Access
          </h2>
          <p className="text-center text-gray-500 dark:text-gray-400 text-sm mb-10">
            Enter your credentials to manage your notes
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-sm text-center animate-in fade-in zoom-in duration-300">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 dark:text-white transition-all outline-none"
                placeholder="Enter username"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-5 py-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-transparent focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/10 dark:text-white transition-all outline-none pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-lg transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Authenticating...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-10 text-center">
            <a
              href="/"
              className="text-sm font-semibold text-gray-400 hover:text-blue-500 transition-colors flex items-center justify-center gap-2"
            >
              <MessageSquare className="w-4 h-4" />
              Back to Public Notes
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
