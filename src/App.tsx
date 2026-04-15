/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Sparkles, User, UserRound, Trash2, Menu, X, ChevronRight, Cpu, Activity, Smartphone, Laptop, Tablet, Watch } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { sendMessageStream } from './services/geminiService';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

interface ChatHistory {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: Date;
}

export default function App() {
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem('graciela_user_email'));
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState(false);
  const [chats, setChats] = useState<ChatHistory[]>(() => {
    const saved = localStorage.getItem('graciela_chats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((chat: any) => ({
          ...chat,
          lastUpdated: new Date(chat.lastUpdated),
          messages: chat.messages.map((m: any) => ({
            ...m,
            timestamp: new Date(m.timestamp)
          }))
        }));
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userEmail) {
      localStorage.setItem('graciela_user_email', userEmail);
    } else {
      localStorage.removeItem('graciela_user_email');
    }
  }, [userEmail]);

  useEffect(() => {
    localStorage.setItem('graciela_chats', JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    if (currentChatId) {
      const currentChat = chats.find(c => c.id === currentChatId);
      if (currentChat) {
        setMessages(currentChat.messages);
      }
    } else {
      setMessages([]);
    }
  }, [currentChatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleLogin = () => {
    if (emailInput.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput)) {
      setUserEmail(emailInput.trim());
      setEmailInput('');
      setEmailError(false);
    } else {
      setEmailError(true);
      setTimeout(() => setEmailError(false), 3000);
    }
  };

  const handleLogout = () => {
    setUserEmail(null);
    clearAllChats();
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    const modelMessageId = (Date.now() + 1).toString();
    const modelMessage: Message = {
      id: modelMessageId,
      role: 'model',
      content: '',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, modelMessage]);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));

      let fullResponse = '';
      const stream = sendMessageStream(input, history);
      let chatId = currentChatId;

      for await (const chunk of stream) {
        fullResponse += chunk;
        setMessages(prev => {
          const updated = prev.map(m => m.id === modelMessageId ? { ...m, content: fullResponse } : m);
          
          // Update chat history
          if (chatId) {
            setChats(prevChats => prevChats.map(chat => 
              chat.id === chatId 
                ? { ...chat, messages: updated, lastUpdated: new Date() } 
                : chat
            ));
          } else {
            // Create new chat if it doesn't exist
            const newChatId = Date.now().toString();
            chatId = newChatId;
            const newChat: ChatHistory = {
              id: newChatId,
              title: input.slice(0, 30) + (input.length > 30 ? '...' : ''),
              messages: updated,
              lastUpdated: new Date()
            };
            setChats(prevChats => [newChat, ...prevChats]);
            setCurrentChatId(newChatId);
          }
          
          return updated;
        });
      }
    } catch (error) {
      console.error("Failed to get AI response:", error);
      const errorMessage = "Lo siento, ha ocurrido un error en mi sistema dorado. Por favor, inténtalo de nuevo.";
      setMessages(prev => prev.map(m => m.id === modelMessageId ? { ...m, content: errorMessage } : m));
    } finally {
      setIsLoading(false);
    }
  };

  const createNewChat = () => {
    setCurrentChatId(null);
    setMessages([]);
    setIsSidebarOpen(false);
  };

  const selectChat = (id: string) => {
    setCurrentChatId(id);
    setIsSidebarOpen(false);
  };

  const deleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setChats(prev => prev.filter(c => c.id !== id));
    if (currentChatId === id) {
      createNewChat();
    }
  };

  const clearAllChats = () => {
    setChats([]);
    createNewChat();
  };

  const GracielaIcon = ({ className = "w-6 h-6" }) => (
    <div className={`relative flex items-center justify-center ${className}`}>
      <UserRound className="w-full h-full text-black" />
      <motion.div 
        animate={{ opacity: [0.4, 0.8, 0.4] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute inset-0 bg-gold-200/20 rounded-full blur-sm"
      />
    </div>
  );

  return (
    <div className="flex h-screen bg-dark-bg text-white overflow-hidden font-sans selection:bg-gold-300/30">
      {/* Sidebar Backdrop (Mobile Only) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar - Left Panel */}
      <AnimatePresence>
        {(isSidebarOpen || window.innerWidth > 1024) && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className={`fixed lg:relative z-50 w-[280px] h-full bg-panel-bg border-r border-gold-300/30 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
          >
            <div className="p-8 flex flex-col gap-8 h-full">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 gold-gradient rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(191,149,63,0.4)] border border-gold-100/30">
                    <GracielaIcon className="w-6 h-6" />
                  </div>
                  <div className="flex flex-col">
                    <h1 className="text-xl font-extrabold tracking-[2px] gold-text-gradient uppercase leading-none">Graciela</h1>
                    <span className="text-[9px] text-gold-300/60 font-bold tracking-[3px] uppercase mt-1">AI System</span>
                  </div>
                </div>
                <button 
                  onClick={() => setIsSidebarOpen(false)} 
                  className="lg:hidden w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-white/60 hover:text-white active:scale-90 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Email Access Section */}
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-[2px] px-2">Acceso al Sistema</p>
                {userEmail ? (
                  <div className="bg-gold-300/5 border border-gold-300/20 p-5 rounded-2xl space-y-4 shadow-inner">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full gold-gradient flex items-center justify-center text-black shadow-lg border border-gold-100/30">
                        <User className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white/40 uppercase tracking-wider font-extrabold">Sesión Activa</p>
                        <p className="text-xs font-bold truncate text-gold-50">{userEmail}</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleLogout}
                      className="w-full py-3 rounded-xl border border-white/10 text-[10px] uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/5 active:scale-[0.98] transition-all font-bold"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="relative">
                      <input 
                        type="email"
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                        placeholder="correo@ejemplo.com"
                        className={`w-full bg-white/5 border ${emailError ? 'border-red-500/50' : 'border-white/10'} rounded-xl px-4 py-4 text-sm focus:ring-2 focus:ring-gold-300/30 outline-none transition-all placeholder:text-white/20`}
                      />
                      {emailError && (
                        <p className="absolute -bottom-5 left-2 text-[9px] text-red-400 font-bold uppercase tracking-wider">Correo inválido</p>
                      )}
                    </div>
                    <button 
                      onClick={handleLogin}
                      className="w-full py-4 rounded-xl bg-white/10 hover:bg-gold-300/20 text-white/70 hover:text-gold-50 text-[11px] font-bold uppercase tracking-widest active:scale-[0.98] transition-all border border-white/5"
                    >
                      Acceder al Núcleo
                    </button>
                  </div>
                )}
              </div>

              <button 
                onClick={createNewChat}
                disabled={!userEmail}
                className={`w-full flex items-center justify-center gap-2 px-4 py-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all active:scale-[0.98] ${
                  userEmail 
                    ? 'gold-gradient text-black hover:shadow-[0_0_20px_rgba(191,149,63,0.4)]' 
                    : 'bg-white/5 text-white/20 cursor-not-allowed opacity-50'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Nuevo Chat
              </button>

              <div className="flex-1 overflow-y-auto -mx-2 px-2 space-y-2 scrollbar-hide">
                <p className="text-[10px] font-bold text-white/20 uppercase tracking-[2px] mb-4 px-2">Historial de Búsqueda</p>
                {!userEmail ? (
                  <div className="px-2 py-8 text-center space-y-2">
                    <User className="w-8 h-8 text-white/10 mx-auto" />
                    <p className="text-xs text-white/30 italic">Accede para ver tu historial</p>
                  </div>
                ) : chats.length === 0 ? (
                  <p className="text-xs text-white/30 px-2 italic">No hay chats previos</p>
                ) : (
                  chats.map((chat) => (
                    <div 
                      key={chat.id}
                      onClick={() => selectChat(chat.id)}
                      className={`group w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-xl cursor-pointer transition-all border active:scale-[0.98] ${
                        currentChatId === chat.id 
                          ? 'bg-gold-300/10 text-gold-50 border-gold-300/30' 
                          : 'text-white/60 hover:text-white hover:bg-white/5 border-transparent'
                      }`}
                    >
                      <span className="text-xs truncate flex-1 font-medium">{chat.title}</span>
                      <button 
                        onClick={(e) => deleteChat(e, chat.id)}
                        className="opacity-0 group-hover:opacity-100 p-2 hover:text-red-400 transition-all rounded-lg hover:bg-red-500/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-6 border-t border-white/5">
                <button 
                  onClick={clearAllChats}
                  disabled={!userEmail}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 transition-colors text-left group disabled:opacity-20 disabled:cursor-not-allowed active:scale-[0.98]"
                >
                  <Trash2 className="w-4 h-4 text-white/20 group-hover:text-red-400 transition-colors" />
                  <span className="text-[10px] text-white/40 group-hover:text-white uppercase tracking-wider font-bold">Borrar Historial</span>
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content - Center Panel */}
      <main className="flex-1 flex flex-col relative min-w-0 bg-dark-bg">
        {/* Header (Mobile Only) */}
        <header className="lg:hidden h-20 bg-panel-bg/80 backdrop-blur-xl border-b border-gold-300/20 flex items-center justify-between px-6 z-40 sticky top-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 active:scale-90 transition-all border border-white/5"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-gold-300 uppercase tracking-[2px]">Graciela</span>
              <span className="text-sm font-extrabold tracking-wider text-white uppercase">AI Core</span>
            </div>
          </div>
          {userEmail && (
            <div className="w-10 h-10 rounded-full gold-gradient flex items-center justify-center text-black shadow-lg">
              <User className="w-5 h-5" />
            </div>
          )}
        </header>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-10 space-y-8 scrollbar-hide">
          {!userEmail ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-10 max-w-2xl mx-auto py-10 px-4">
              <div className="ai-orb-container">
                <motion.div 
                  animate={{ scale: [1, 1.05, 1], opacity: [0.7, 0.9, 0.7] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="ai-orb"
                />
                <div className="ai-core">
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="ai-core-inner flex items-center justify-center"
                  >
                    <GracielaIcon className="w-10 h-10" />
                  </motion.div>
                </div>
              </div>
              <div className="space-y-4">
                <h2 className="text-3xl md:text-5xl font-light tracking-tight">
                  Acceso <span className="font-bold gold-text-gradient">Restringido</span>
                </h2>
                <p className="text-white/40 text-sm md:text-base tracking-wide uppercase max-w-sm mx-auto leading-relaxed">
                  Por favor, ingresa tu correo electrónico en el panel lateral para acceder al sistema Graciela AI
                </p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-10 max-w-2xl mx-auto py-10 px-4">
              <div className="ai-orb-container">
                <motion.div 
                  animate={{ scale: [1, 1.05, 1], opacity: [0.7, 0.9, 0.7] }}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                  className="ai-orb"
                />
                <div className="ai-core">
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    className="ai-core-inner flex items-center justify-center"
                  >
                    <GracielaIcon className="w-12 h-12" />
                  </motion.div>
                </div>
              </div>
              
              <div className="space-y-4">
                <h2 className="text-4xl md:text-6xl font-light tracking-tight">
                  Graciela <span className="font-bold gold-text-gradient">AI</span>
                </h2>
                <p className="text-white/40 text-xs md:text-sm tracking-[3px] uppercase font-bold">
                  Núcleo de procesamiento técnico y análisis de precisión
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-6">
                {[
                  "¿Cómo puedo mejorar mi productividad?",
                  "Escribe un poema sobre el oro y la luz.",
                  "Planifica un viaje de lujo a París.",
                  "Explícame la teoría de la relatividad."
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(suggestion)}
                    className="p-5 rounded-2xl bg-white/5 hover:bg-white/10 transition-all text-left text-xs md:text-sm text-white/60 hover:text-white border border-white/5 hover:border-gold-300/30 active:scale-[0.98]"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-10 pb-32">
              {messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  className={`flex gap-4 md:gap-8 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div className={`w-12 h-12 md:w-16 md:h-16 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-2xl border ${message.role === 'user' ? 'bg-white/10 border-white/10' : 'gold-gradient border-gold-100/30'}`}>
                    {message.role === 'user' ? <User className="w-6 h-6 md:w-8 md:h-8" /> : <GracielaIcon className="w-8 h-8 md:w-10 md:h-10" />}
                  </div>
                  <div className={`flex-1 max-w-[90%] md:max-w-[80%] space-y-3 ${message.role === 'user' ? 'text-right' : ''}`}>
                    <div className={`inline-block p-5 md:p-8 rounded-3xl text-left shadow-2xl ${
                      message.role === 'user' 
                        ? 'bg-gold-500 text-black rounded-tr-none font-medium' 
                        : 'bg-panel-bg rounded-tl-none border border-gold-300/20'
                    }`}>
                      <div className="markdown-body text-sm md:text-base">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                      {message.role === 'model' && message.content === '' && (
                        <div className="flex gap-1.5 py-3">
                          <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 rounded-full bg-gold-200" />
                          <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 rounded-full bg-gold-200" />
                          <motion.div animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 rounded-full bg-gold-200" />
                        </div>
                      )}
                    </div>
                    <p className="text-[10px] text-white/20 uppercase tracking-[2px] px-2 font-bold">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-10 bg-gradient-to-t from-dark-bg via-dark-bg/95 to-transparent sticky bottom-0 z-30">
          <div className="max-w-4xl mx-auto">
            <div className={`bg-panel-bg/90 backdrop-blur-xl border border-gold-300/30 rounded-3xl p-3 md:p-4 flex items-center gap-3 md:gap-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] ${!userEmail ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <input
                type="text"
                value={input}
                disabled={!userEmail}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder={userEmail ? "Escribe un comando..." : "Accede para comenzar..."}
                className="flex-1 bg-transparent border-none focus:ring-0 px-3 text-sm md:text-base text-white placeholder:text-white/20 disabled:cursor-not-allowed"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading || !userEmail}
                className={`w-12 h-12 md:w-auto md:px-8 md:py-3 rounded-2xl font-bold text-[13px] uppercase tracking-wider transition-all flex items-center justify-center ${
                  input.trim() && !isLoading && userEmail
                    ? 'gold-gradient text-black hover:scale-105 active:scale-95 shadow-lg' 
                    : 'bg-white/5 text-white/20'
                }`}
              >
                <span className="hidden md:inline">Ejecutar</span>
                <Send className="w-5 h-5 md:hidden" />
              </button>
            </div>
            <p className="text-[9px] text-center mt-4 text-white/10 uppercase tracking-[2px] font-bold">
              Graciela AI v2.4.0 • Procesamiento de Precisión Activo
            </p>
          </div>
        </div>
      </main>

      {/* Stats Panel - Right Panel */}
      <div className="hidden xl:flex w-[280px] h-full bg-panel-bg border-l border-gold-300/30 flex-col p-10">
        <div className="text-[12px] uppercase tracking-[1.5px] text-white/40 mb-6">Estado del Sistema</div>
        
        <div className="space-y-5">
          <div className="bg-white/[0.03] border border-white/[0.05] p-5 rounded-xl">
            <div className="text-2xl font-bold text-gold-50 mb-1">98.4%</div>
            <div className="text-[12px] text-white/40 flex items-center gap-2">
              <Activity className="w-3 h-3" />
              Precisión Neural
            </div>
          </div>

          <div className="bg-white/[0.03] border border-white/[0.05] p-5 rounded-xl">
            <div className="text-2xl font-bold text-gold-50 mb-1">1.2ms</div>
            <div className="text-[12px] text-white/40 flex items-center gap-2">
              <Cpu className="w-3 h-3" />
              Latencia Global
            </div>
          </div>
        </div>

        <div className="mt-10">
          <div className="text-[12px] uppercase tracking-[1.5px] text-white/40 mb-6">Dispositivos Activos</div>
          <div className="space-y-4">
            {[
              { name: 'iPhone 15 Pro', icon: Smartphone },
              { name: 'MacBook Pro M3', icon: Laptop },
              { name: 'iPad Air Gen 5', icon: Tablet },
              { name: 'Smart Watch Gold', icon: Watch },
            ].map((device) => (
              <div key={device.name} className="flex justify-between items-center py-3 border-b border-white/[0.05]">
                <div className="flex items-center gap-3 text-[13px]">
                  <device.icon className="w-4 h-4 text-white/40" />
                  <span>{device.name}</span>
                </div>
                <div className="w-2 h-2 bg-gold-400 rounded-full shadow-[0_0_5px_#FCF6BA]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
