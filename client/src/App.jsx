import { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import ThemeToggle from './components/ThemeToggle';
import { Loader2, User, MessageSquare, Eye, EyeOff } from 'lucide-react';

function App() {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    // Initialize theme
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    checkAuth();
    fetchChats();
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
  }, []); // No longer depends on chats

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const res = await fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setIsAdmin(data.isAdmin);
    } catch (err) {
      console.error('Auth check failed:', err);
    }
  };

  const fetchChats = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/chat/list');
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

  const handleNewChat = async () => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/chat/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: '# New Note\n\nStart typing your note here...' })
      });
      const data = await res.json();
      if (data.success) {
        setChats(prev => [data.chat, ...prev]);
        setSelectedChat(data.chat);
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

  const handleSelectChat = async (id) => {
    try {
      const res = await fetch(`/api/chat/${id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedChat(data.chat);
        setIsSidebarOpen(false); // Close sidebar on mobile after selection
      }
    } catch (err) {
      console.error('Failed to fetch chat details:', err);
    }
  };

  const handleUpdateChat = async (id, updates) => {
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    try {
      const res = await fetch(`/api/chat/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        // Update local state
        setChats(prev => prev.map(c => c._id === id ? { ...c, ...data.chat } : c));
        setSelectedChat(data.chat);
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
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
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
        onSelectChat={handleSelectChat}
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
          />
        )}
      </main>
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
