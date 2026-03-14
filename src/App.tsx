import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Trash2, 
  Copy, 
  RefreshCw, 
  Moon, 
  Sun, 
  MessageSquare, 
  Code, 
  BookOpen, 
  History, 
  Settings,
  Menu,
  X,
  User,
  Bot,
  Loader2,
  Check,
  Play,
  ExternalLink,
  Terminal,
  Mail,
  Stethoscope,
  Cpu,
  Shield,
  Globe
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Initialize Gemini AI
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

type View = 'ask' | 'study' | 'history' | 'settings';

interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

interface UserProfile {
  name: string;
  email: string;
  bio: string;
}

interface ChatHistory {
  id: string;
  title: string;
  messages: Message[];
  timestamp: string;
}

export default function App() {
  const [currentView, setCurrentView] = useState<View>('ask');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [history, setHistory] = useState<ChatHistory[]>([]);
  const [profile, setProfile] = useState<UserProfile>({
    name: 'Guest User',
    email: 'guest@example.com',
    bio: 'AI enthusiast exploring the future.'
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Theme management
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
    }

    const savedProfile = localStorage.getItem('profile');
    if (savedProfile) setProfile(JSON.parse(savedProfile));

    const savedHistory = localStorage.getItem('chatHistory');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
  }, []);

  // Persistence
  useEffect(() => {
    localStorage.setItem('profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    localStorage.setItem('chatHistory', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const cleanResponse = (text: string) => {
    // Remove markdown symbols like *, -, #, _, `, etc.
    return text.replace(/[*#\-_`>]/g, '').trim();
  };

  const handleSend = async (overrideInput?: any) => {
    const currentInput = typeof overrideInput === 'string' ? overrideInput : input;
    if (!currentInput || typeof currentInput !== 'string' || !currentInput.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInput,
      timestamp: new Date().toISOString(),
    };

    const newMessages = overrideInput ? messages : [...messages, userMessage];
    if (!overrideInput) setMessages(newMessages);
    if (!overrideInput) setInput('');
    setIsLoading(true);

    try {
      const streamResponse = await genAI.models.generateContentStream({
        model: "gemini-3-flash-preview",
        contents: newMessages.map(m => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }]
        })),
        config: {
          systemInstruction: "You are Quick Assist, a professional and helpful AI assistant. Rules: 1. NEVER use symbols like *, -, #, _, or markdown formatting in your responses. 2. For simple questions or suggestions, keep answers concise (strictly 4-5 lines). 3. For complex or informational questions, provide detailed and informative answers without line limits. 4. ALWAYS use relevant emojis to make the conversation engaging. 5. Be professional, clear, and helpful. 6. If asked for code, provide it in plain text without markdown code blocks.",
        }
      });

      let fullContent = '';
      const aiMessageId = (Date.now() + 1).toString();
      
      // Add initial empty AI message
      setMessages(prev => [...prev, {
        id: aiMessageId,
        role: 'ai',
        content: '',
        timestamp: new Date().toISOString(),
      }]);

      for await (const chunk of streamResponse) {
        const chunkText = chunk.text;
        if (chunkText) {
          fullContent += chunkText;
          setMessages(prev => prev.map(m => 
            m.id === aiMessageId ? { ...m, content: cleanResponse(fullContent) } : m
          ));
        }
      }

      const finalMessages = [...newMessages, {
        id: aiMessageId,
        role: 'ai',
        content: cleanResponse(fullContent),
        timestamp: new Date().toISOString(),
      }];

      // Add to history if it's a new conversation
      if (messages.length === 0) {
        const newHistory: ChatHistory = {
          id: Date.now().toString(),
          title: currentInput.slice(0, 30) + (currentInput.length > 30 ? '...' : ''),
          messages: finalMessages,
          timestamp: new Date().toISOString(),
        };
        setHistory(prev => [newHistory, ...prev]);
      } else {
        // Update existing history entry
        setHistory(prev => prev.map(h => {
          if (h.id === history[0]?.id) {
            return { ...h, messages: finalMessages };
          }
          return h;
        }));
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'ai',
        content: 'Oops! Something went wrong. Please try again. ⚠️',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const regenerateLast = () => {
    if (messages.length < 2 || isLoading) return;
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMessage) {
      if (messages[messages.length - 1].role === 'ai') {
        setMessages(prev => prev.slice(0, -1));
      }
      handleSend(lastUserMessage.content);
    }
  };

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors duration-300 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center justify-between">
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                <Bot size={20} />
              </div>
              Quick Assist
            </h1>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors">
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            <SidebarItem 
              icon={<MessageSquare size={18} />} 
              label="Ask AI" 
              active={currentView === 'ask'} 
              onClick={() => { setCurrentView('ask'); setIsSidebarOpen(false); }} 
            />
            <SidebarItem 
              icon={<BookOpen size={18} />} 
              label="Study Help" 
              active={currentView === 'study'} 
              onClick={() => { setCurrentView('study'); setIsSidebarOpen(false); }} 
            />
            <SidebarItem 
              icon={<Settings size={18} />} 
              label="Settings" 
              active={currentView === 'settings'} 
              onClick={() => { setCurrentView('settings'); setIsSidebarOpen(false); }} 
            />
          </nav>

          <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
            <div 
              onClick={() => { setCurrentView('settings'); setIsSidebarOpen(false); }}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                <User size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{profile.name}</p>
                <p className="text-xs text-neutral-500 truncate">Pro Account ✨</p>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 lg:px-8 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md sticky top-0 z-40">
          <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors">
            <Menu size={24} />
          </button>
          
          <div className="flex-1 lg:hidden text-center font-bold text-lg">
            {currentView === 'ask' && 'Ask AI'}
            {currentView === 'study' && 'Study Resources'}
            {currentView === 'settings' && 'User Settings'}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <button 
              onClick={toggleTheme}
              className="p-2.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all text-neutral-600 dark:text-neutral-400"
              title="Toggle theme"
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        {/* View Content */}
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            {currentView === 'ask' && (
              <ChatView 
                messages={messages} 
                setMessages={setMessages}
                input={input}
                setInput={setInput}
                isLoading={isLoading}
                handleSend={handleSend}
                messagesEndRef={messagesEndRef}
                setCopiedId={setCopiedId}
                copiedId={copiedId}
                regenerateLast={regenerateLast}
              />
            )}
            {currentView === 'study' && <StudyView />}
            {currentView === 'settings' && (
              <SettingsView 
                profile={profile} 
                setProfile={setProfile} 
                history={history} 
                setHistory={setHistory}
                setMessages={setMessages}
                setCurrentView={setCurrentView}
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

// --- Sub-Views ---

function UniqueLoader() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 1, 0.3],
              backgroundColor: ["#3b82f6", "#8b5cf6", "#3b82f6"]
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut"
            }}
            className="w-2 h-2 rounded-full"
          />
        ))}
      </div>
      <motion.span 
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="text-sm font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
      >
        Thinking...
      </motion.span>
    </div>
  );
}

function ChatView({ messages, setMessages, input, setInput, isLoading, handleSend, messagesEndRef, setCopiedId, copiedId, regenerateLast }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="h-full flex flex-col"
    >
      <div className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-8 max-w-2xl mx-auto">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-blue-500/40"
            >
              <Bot size={40} />
            </motion.div>
            <div className="space-y-2">
              <h2 className="text-4xl font-extrabold tracking-tight">Quick Assist AI</h2>
              <p className="text-lg text-neutral-500 dark:text-neutral-400">
                Your professional assistant for coding, studying, and more. 🚀
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              <SuggestionCard text="Explain recursion simply 💡" onClick={() => setInput("Explain recursion simply")} />
              <SuggestionCard text="Python script for data 🐍" onClick={() => setInput("Write a Python script for data analysis")} />
              <SuggestionCard text="Biology exam tips 🧬" onClick={() => setInput("Help me study for my biology exam")} />
              <SuggestionCard text="Linux commands list 🐧" onClick={() => setInput("What are the best Linux commands for beginners?")} />
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-6 pb-32">
            {messages.map((msg: Message) => (
              <motion.div 
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex", msg.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div className={cn(
                  "max-w-[85%] lg:max-w-[75%] p-5 rounded-2xl shadow-sm relative group",
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-tl-none'
                )}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 whitespace-pre-wrap leading-relaxed text-[15px]">
                      {msg.content}
                    </div>
                  </div>
                  
                  {msg.role === 'ai' && (
                    <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-700 flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(msg.content);
                          setCopiedId(msg.id);
                          setTimeout(() => setCopiedId(null), 2000);
                        }}
                        className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-blue-600 transition-colors"
                      >
                        {copiedId === msg.id ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        {copiedId === msg.id ? 'Copied' : 'Copy'}
                      </button>
                      <button 
                        onClick={regenerateLast}
                        className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-blue-600 transition-colors"
                      >
                        <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                        Regenerate
                      </button>
                      <button 
                        onClick={() => setMessages([])}
                        className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                        Clear
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            {isLoading && messages[messages.length - 1]?.role !== 'ai' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex justify-start"
              >
                <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 p-4 rounded-2xl rounded-tl-none shadow-sm">
                  <UniqueLoader />
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-8 bg-gradient-to-t from-neutral-50 dark:from-neutral-950 via-neutral-50 dark:via-neutral-950 to-transparent">
        <div className="max-w-4xl mx-auto relative">
          <div className="relative flex items-center group">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask anything..."
              className="w-full p-5 pr-16 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none min-h-[64px] max-h-[200px] transition-all"
              rows={1}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className={cn(
                "absolute right-3 p-3 rounded-xl transition-all",
                !input.trim() || isLoading 
                  ? 'bg-neutral-100 dark:bg-neutral-700 text-neutral-400 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-500/30 scale-100 active:scale-95'
              )}
            >
              {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StudyView() {
  const categories = [
    {
      title: "Programming Languages",
      icon: <Code className="text-blue-500" />,
      items: [
        { name: "Python Mastery", link: "https://docs.python.org/3/", desc: "The best for AI and automation. 🐍" },
        { name: "Java Core", link: "https://docs.oracle.com/en/java/", desc: "Enterprise-grade development. ☕" },
        { name: "Web Development", link: "https://developer.mozilla.org/", desc: "HTML, CSS, and JS essentials. 🌐" }
      ]
    },
    {
      title: "Trending Tech",
      icon: <Cpu className="text-purple-500" />,
      items: [
        { name: "Cybersecurity", link: "https://www.cybrary.it/", desc: "Protect systems and data. 🛡️" },
        { name: "Cloud Computing", link: "https://aws.amazon.com/training/", desc: "Scaling the future. ☁️" },
        { name: "AI & ML", link: "https://www.deeplearning.ai/", desc: "Building smart systems. 🤖" }
      ]
    },
    {
      title: "Medical & Health",
      icon: <Stethoscope className="text-red-500" />,
      items: [
        { name: "Medical Basics", link: "https://www.webmd.com/", desc: "Health tips and remedies. 💊" },
        { name: "Modern Medicine", link: "https://www.mayoclinic.org/", desc: "Trending medical tech. 🏥" },
        { name: "Wellness Tips", link: "https://www.healthline.com/", desc: "Daily health routines. 🍏" }
      ]
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full p-4 lg:p-8 space-y-8"
    >
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">Study Resources 📚</h2>
        <p className="text-neutral-500 mt-1">Curated links to master any technology or field.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {categories.map((cat, idx) => (
          <div key={idx} className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              {cat.icon}
              <h3 className="font-bold text-lg">{cat.title}</h3>
            </div>
            <div className="space-y-3">
              {cat.items.map((item, i) => (
                <a 
                  key={i}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-xl hover:shadow-blue-500/5 transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold group-hover:text-blue-600 transition-colors">{item.name}</span>
                    <ExternalLink size={14} className="text-neutral-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                  <p className="text-xs text-neutral-500">{item.desc}</p>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function SettingsView({ profile, setProfile, history, setHistory, setMessages, setCurrentView }: { 
  profile: UserProfile, 
  setProfile: (p: UserProfile) => void,
  history: ChatHistory[],
  setHistory: React.Dispatch<React.SetStateAction<ChatHistory[]>>,
  setMessages: (m: Message[]) => void,
  setCurrentView: (v: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [tempProfile, setTempProfile] = useState(profile);

  const handleSave = () => {
    setProfile(tempProfile);
    setIsEditing(false);
  };

  const deleteAllHistory = () => {
    setHistory([]);
    localStorage.removeItem('chatHistory');
    setShowDeleteConfirm(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="h-full p-4 lg:p-8 max-w-4xl mx-auto space-y-8"
    >
      {/* Profile Section */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-xl" id="profile-card">
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600 relative">
          <div className="absolute -bottom-12 left-8">
            <div className="w-24 h-24 rounded-3xl bg-white dark:bg-neutral-800 p-1 shadow-xl">
              <div className="w-full h-full rounded-2xl bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center">
                <User size={40} className="text-neutral-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="pt-16 pb-8 px-8 space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{profile.name}</h2>
              <p className="text-neutral-500">{profile.email}</p>
            </div>
            <button 
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-sm font-bold flex items-center gap-2"
              id="edit-profile-btn"
            >
              <Settings size={16} />
              Edit Profile
            </button>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400">About Me</h3>
            <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed bg-neutral-50 dark:bg-neutral-800/50 p-4 rounded-2xl border border-neutral-100 dark:border-neutral-800">
              {profile.bio || "No bio added yet. Tell us about yourself! ✨"}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30">
              <span className="block text-xs font-bold text-blue-600 dark:text-blue-400 uppercase mb-1">Account Type</span>
              <span className="font-bold">Free Tier</span>
            </div>
            <div className="p-4 rounded-2xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/30">
              <span className="block text-xs font-bold text-purple-600 dark:text-purple-400 uppercase mb-1">Member Since</span>
              <span className="font-bold">March 2026</span>
            </div>
          </div>
        </div>
      </div>

      {/* History Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold flex items-center gap-2">
            <History size={20} className="text-blue-600" />
            Chat History
          </h3>
          {history.length > 0 && (
            <button 
              onClick={() => setShowDeleteConfirm(true)}
              className="text-xs font-bold text-red-500 hover:text-red-600 flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
            >
              <Trash2 size={14} />
              Delete All
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="p-12 rounded-3xl border border-dashed border-neutral-200 dark:border-neutral-800 flex flex-col items-center justify-center text-center space-y-3">
            <History size={32} className="text-neutral-300" />
            <p className="text-neutral-500 text-sm">No chat history found. 🍃</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {history.map((item) => (
              <div 
                key={item.id}
                className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-blue-500 transition-all group relative"
              >
                <div 
                  onClick={() => {
                    setMessages(item.messages);
                    setCurrentView('ask');
                  }}
                  className="cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg uppercase tracking-wider">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                    <MessageSquare size={14} className="text-neutral-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <h3 className="font-bold text-neutral-800 dark:text-neutral-100 line-clamp-1 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    {item.messages.length} messages
                  </p>
                </div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setHistory(prev => prev.filter(h => h.id !== item.id));
                  }}
                  className="absolute top-4 right-4 p-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  title="Delete conversation"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-neutral-900 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-neutral-200 dark:border-neutral-800"
              id="edit-profile-modal"
            >
              <h3 className="text-xl font-bold mb-6">Edit Profile 📝</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5 ml-1">Full Name</label>
                  <input 
                    type="text" 
                    value={tempProfile.name}
                    onChange={(e) => setTempProfile({...tempProfile, name: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5 ml-1">Email Address</label>
                  <input 
                    type="email" 
                    value={tempProfile.email}
                    onChange={(e) => setTempProfile({...tempProfile, email: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase mb-1.5 ml-1">Bio / Description</label>
                  <textarea 
                    value={tempProfile.bio}
                    onChange={(e) => setTempProfile({...tempProfile, bio: e.target.value})}
                    rows={4}
                    placeholder="Tell us about yourself..."
                    className="w-full px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 px-4 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all"
                  id="save-profile-btn"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {showDeleteConfirm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white dark:bg-neutral-900 rounded-3xl p-8 w-full max-w-sm shadow-2xl border border-neutral-200 dark:border-neutral-800 text-center"
            >
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto text-red-600 mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">Clear All History?</h3>
              <p className="text-neutral-500 text-sm mb-8">
                This will permanently delete all your previous conversations. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-800 font-bold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={deleteAllHistory}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 shadow-lg shadow-red-500/20 transition-all"
                >
                  Delete All
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function SidebarItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all group",
        active 
          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20 font-bold" 
          : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-neutral-900 dark:hover:text-white"
      )}
    >
      <div className={cn("transition-transform group-hover:scale-110", active && "scale-110")}>
        {icon}
      </div>
      <span className="text-sm">{label}</span>
      {active && <motion.div layoutId="active-pill" className="ml-auto w-1.5 h-1.5 rounded-full bg-white" />}
    </div>
  );
}

function SuggestionCard({ text, onClick }: { text: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className="p-5 text-left rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/5 transition-all group"
    >
      <p className="text-sm font-medium text-neutral-600 dark:text-neutral-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
        {text}
      </p>
    </button>
  );
}
