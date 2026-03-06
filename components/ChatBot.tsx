import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Sparkles, ChevronDown, Mic, MicOff, Volume2, Settings, Key, Trash2, Zap, Phone, PhoneOff } from 'lucide-react';
import { AppState } from '../types';
import { parseIntent, executeIntent, ChatMessage } from '../services/chatEngine';
import { callGemini, buildPortfolioContext, saveApiKey, loadApiKey, hasStoredApiKey, clearApiKey, stripForTTS, encryptSharedKey, decryptSharedKey } from '../services/geminiService';
import { GeminiVoiceSession, VoiceSessionStatus, isVoiceSupported } from '../services/voiceService';
import { useLanguage } from '../i18n/LanguageContext';

interface Props {
    data: AppState;
    onUpdate: (updates: Partial<AppState>) => void;
}

const renderBotText = (text: string) => {
    return text.split('\n').map((line, i) => {
        const parts = line.split(/(\*\*.*?\*\*|_.*?_)/g).map((segment, j) => {
            if (segment.startsWith('**') && segment.endsWith('**')) {
                return <strong key={j} className="text-white font-semibold">{segment.slice(2, -2)}</strong>;
            }
            if (segment.startsWith('_') && segment.endsWith('_')) {
                return <em key={j} className="text-slate-500 text-[11px]">{segment.slice(1, -1)}</em>;
            }
            return <span key={j}>{segment}</span>;
        });
        return (
            <React.Fragment key={i}>
                {parts}
                {i < text.split('\n').length - 1 && <br />}
            </React.Fragment>
        );
    });
};

const ENC_PASSWORD = 'wt-gemini-encryption-key-v1';

const STATUS_CONFIG: Record<VoiceSessionStatus, { label: string; color: string; pulse: boolean }> = {
    idle: { label: '', color: '', pulse: false },
    connecting: { label: 'Connecting...', color: 'text-amber-400', pulse: true },
    connected: { label: 'Connected', color: 'text-emerald-400', pulse: false },
    listening: { label: '🎤 Listening...', color: 'text-emerald-400', pulse: true },
    thinking: { label: '🤔 Thinking...', color: 'text-amber-400', pulse: true },
    speaking: { label: '🔊 Speaking...', color: 'text-indigo-400', pulse: true },
    error: { label: '⚠️ Error', color: 'text-rose-400', pulse: false },
};

export const ChatBot: React.FC<Props> = ({ data, onUpdate }) => {
    const { language } = useLanguage();
    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [apiKeyInput, setApiKeyInput] = useState('');
    const [hasKey, setHasKey] = useState(hasStoredApiKey());
    const [geminiKey, setGeminiKey] = useState<string | null>(null);
    const [isSharedKeyValid, setIsSharedKeyValid] = useState(false);
    const [shareWithFamily, setShareWithFamily] = useState(true);
    const [voiceStatus, setVoiceStatus] = useState<VoiceSessionStatus>('idle');
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const voiceSessionRef = useRef<GeminiVoiceSession | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([{
        id: 'welcome', role: 'bot',
        text: '👋 Hi! I\'m your wealth assistant.\n\nTry asking me things like:\n• "What\'s my net worth?"\n• "Add 5L in stocks"\n• "Show summary"\n\nType **help** for all commands.',
        timestamp: Date.now(),
    }]);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
    useEffect(() => { if (isOpen && !showSettings && !isVoiceMode) setTimeout(() => inputRef.current?.focus(), 300); }, [isOpen, showSettings, isVoiceMode]);
    useEffect(() => {
        if (hasStoredApiKey()) {
            loadApiKey(ENC_PASSWORD).then(k => { if (k) { setGeminiKey(k); setHasKey(true); } });
        }
    }, []);

    // Attempt to decrypt shared key if we have familyId but no local key
    useEffect(() => {
        const tryDecryptShared = async () => {
            if (data.sharedGeminiKey && data.familyId) {
                const decrypted = await decryptSharedKey(data.sharedGeminiKey, data.familyId);
                if (decrypted) {
                    setGeminiKey(decrypted);
                    setIsSharedKeyValid(true);
                } else {
                    // Decryption failed (wrong family key or malformed)
                    setIsSharedKeyValid(false);
                    if (!hasStoredApiKey()) setGeminiKey(null);
                }
            } else if (!hasStoredApiKey()) {
                setGeminiKey(null);
                setIsSharedKeyValid(false);
            }
        };
        tryDecryptShared();
    }, [data.sharedGeminiKey, data.familyId, hasKey]);

    // Cleanup voice session on unmount
    useEffect(() => {
        return () => { voiceSessionRef.current?.disconnect(); };
    }, []);

    const executeGeminiAction = useCallback((action: any) => {
        if (!action?.action) return;
        switch (action.action) {
            case 'ADD_ASSET':
                onUpdate({ assets: [...data.assets, { id: crypto.randomUUID(), name: action.name || 'New Asset', value: Number(action.value) || 0, type: action.assetType || 'OTHER', growthRate: 0.06, valuationMode: 'manual' }] });
                break;
            case 'ADD_LIABILITY':
                onUpdate({ liabilities: [...data.liabilities, { id: crypto.randomUUID(), name: action.name || 'New Liability', value: Number(action.value) || 0, type: action.liabilityType || 'PERSONAL_LOAN', interestRate: 0.10 }] });
                break;
            case 'DELETE_ASSET': {
                const m = data.assets.find(a => a.name.toLowerCase().includes((action.name || '').toLowerCase()));
                if (m) onUpdate({ assets: data.assets.filter(a => a.id !== m.id) });
                break;
            }
            case 'DELETE_LIABILITY': {
                const m = data.liabilities.find(l => l.name.toLowerCase().includes((action.name || '').toLowerCase()));
                if (m) onUpdate({ liabilities: data.liabilities.filter(l => l.id !== m.id) });
                break;
            }
            case 'UPDATE_ASSET': {
                const m = data.assets.find(a => a.name.toLowerCase().includes((action.name || '').toLowerCase()));
                if (m) onUpdate({ assets: data.assets.map(a => a.id === m.id ? { ...a, value: Number(action.value) || a.value } : a) });
                break;
            }
            case 'ADD_MILESTONE':
                onUpdate({ milestones: [...data.milestones, { id: crypto.randomUUID(), name: action.name || 'New Goal', targetAmount: Number(action.targetAmount) || 0, color: `hsl(${Math.random() * 360}, 70%, 50%)`, trackingMode: action.trackingMode || 'net_worth' }] });
                break;
        }
    }, [data, onUpdate]);

    // ── Text chat ──
    const sendMessage = useCallback(async (text?: string) => {
        const trimmed = (text || input).trim();
        if (!trimmed || isLoading) return;

        const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: trimmed, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput('');

        if (geminiKey) {
            setIsLoading(true);
            try {
                const context = buildPortfolioContext(data);
                const history = messages.slice(-6).map(m => ({ role: m.role, text: m.text }));
                const { response, action } = await callGemini(trimmed, context, geminiKey, history);
                if (action) executeGeminiAction(action);
                setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'bot', text: response || '✅ Done!', timestamp: Date.now() }]);
            } catch (err: any) {
                setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'bot', text: `⚠️ ${err.message || 'Failed to reach Gemini.'}`, timestamp: Date.now() }]);
            } finally {
                setIsLoading(false);
            }
        } else {
            setTimeout(() => {
                const intent = parseIntent(trimmed);
                const response = executeIntent(intent, data, onUpdate);
                setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'bot', text: response, timestamp: Date.now() }]);
            }, 200);
        }
    }, [input, isLoading, geminiKey, data, messages, onUpdate, executeGeminiAction]);

    // ── Voice session ──
    const startVoice = useCallback(async () => {
        if (!geminiKey) {
            setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'bot', text: '🔑 Please add your Gemini API key in Settings to use voice.', timestamp: Date.now() }]);
            setShowSettings(true);
            return;
        }

        setIsVoiceMode(true);

        const session = new GeminiVoiceSession(geminiKey, data, {
            onStatusChange: (status) => setVoiceStatus(status),
            onTranscript: (text, isFinal) => {
                if (isFinal) {
                    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'user', text: `🎤 ${text}`, timestamp: Date.now() }]);
                }
            },
            onResponse: (text) => {
                setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'bot', text, timestamp: Date.now() }]);
            },
            onError: (error) => {
                setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'bot', text: `⚠️ ${error}`, timestamp: Date.now() }]);
            },
            onActionDetected: (action) => {
                executeGeminiAction(action);
            },
        });

        voiceSessionRef.current = session;
        await session.connect();
    }, [geminiKey, data, executeGeminiAction]);

    const stopVoice = useCallback(() => {
        voiceSessionRef.current?.disconnect();
        voiceSessionRef.current = null;
        setIsVoiceMode(false);
        setVoiceStatus('idle');
    }, []);

    // ── API key management ──
    const handleSaveKey = async () => {
        if (!apiKeyInput.trim()) return;

        const rawKey = apiKeyInput.trim();

        // Always save locally so the current user doesn't lose it if they un-sync
        await saveApiKey(rawKey, ENC_PASSWORD);
        setHasKey(true);
        setGeminiKey(rawKey);

        let shareMessage = '';
        if (shareWithFamily && data.familyId) {
            const encrypted = await encryptSharedKey(rawKey, data.familyId);
            onUpdate({ sharedGeminiKey: encrypted });
            shareMessage = ' and synced with your family encrypted';
        }

        setApiKeyInput('');
        setShowSettings(false);
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'bot', text: `🔑 Gemini API key saved${shareMessage}! I'm now **AI-powered**.\n\n🎤 You can also start a **voice conversation** using the phone button!`, timestamp: Date.now() }]);
    };

    const handleRemoveKey = () => {
        stopVoice();
        clearApiKey();
        setHasKey(false);

        // Also remove from shared state if present
        if (data.sharedGeminiKey) {
            onUpdate({ sharedGeminiKey: undefined });
        }

        // Re-evaluate shared key (it will nullify geminiKey via useEffect if shared is removed)
        setGeminiKey(null);
        setIsSharedKeyValid(false);

        setShowSettings(false);
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'bot', text: '🔓 API key removed locally and from sync. Switched back to offline mode.', timestamp: Date.now() }]);
    };

    const quickActions = [
        { label: '💰 Net Worth', text: "What's my net worth?" },
        { label: '📋 Summary', text: 'Show summary' },
        { label: '💧 Liquid', text: 'Show liquid assets' },
        { label: '❓ Help', text: 'Help' },
    ];

    const statusInfo = STATUS_CONFIG[voiceStatus];

    return (
        <>
            {isOpen && (
                <div className="fixed bottom-20 md:bottom-6 right-4 md:right-6 z-[60] w-[calc(100vw-2rem)] md:w-[420px]">
                    <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 flex flex-col overflow-hidden" style={{ maxHeight: 'min(75vh, 600px)' }}>

                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gradient-to-r from-indigo-500/10 to-violet-500/10">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                                    <Sparkles className="w-4 h-4 text-indigo-400" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-1.5">
                                        <h3 className="text-sm font-semibold text-white">Wealth Assistant</h3>
                                        {geminiKey && (
                                            <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-400 rounded-full flex items-center gap-0.5">
                                                <Zap className="w-2.5 h-2.5" /> AI
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] text-slate-400">{geminiKey ? 'Powered by Gemini AI' : 'Offline mode • Add API key for AI'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button onClick={() => setShowSettings(!showSettings)} className={`p-1.5 rounded-lg transition-all ${showSettings ? 'text-amber-400 bg-amber-400/10' : 'text-slate-400 hover:text-white hover:bg-white/10'}`} title="Settings">
                                    <Settings className="w-4 h-4" />
                                </button>
                                <button onClick={() => { setIsOpen(false); setShowSettings(false); stopVoice(); }} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Settings */}
                        {showSettings && (
                            <div className="p-4 border-b border-white/10 bg-slate-800/50">
                                <div className="flex items-center gap-2 mb-3">
                                    <Key className="w-4 h-4 text-amber-400" />
                                    <h4 className="text-sm font-medium text-white">Gemini API Key</h4>
                                </div>
                                <p className="text-[11px] text-slate-400 mb-3">
                                    Get a free key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener" className="text-indigo-400 underline">Google AI Studio</a>. Your key is encrypted locally.
                                </p>
                                {hasKey || isSharedKeyValid ? (
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 bg-white/5 rounded-lg px-3 py-2 text-sm text-emerald-400 border border-emerald-500/20">
                                            ✓ {isSharedKeyValid && !hasKey ? 'Using Family Shared Key' : 'API key configured'}
                                        </div>
                                        <button onClick={handleRemoveKey} className="p-2 text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all" title="Remove key">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-3">
                                        <div className="flex gap-2">
                                            <input type="password" value={apiKeyInput} onChange={e => setApiKeyInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveKey()} placeholder="AIzaSy..." className="flex-1 bg-white/[0.05] text-white rounded-lg px-3 py-2 text-sm border border-white/[0.08] focus:border-amber-400/40 outline-none placeholder:text-slate-600" />
                                            <button onClick={handleSaveKey} disabled={!apiKeyInput.trim()} className="px-4 py-2 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 disabled:bg-white/5 disabled:text-slate-600 rounded-lg text-sm font-medium transition-all">Save</button>
                                        </div>
                                        {data.familyId && (
                                            <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
                                                <input type="checkbox" checked={shareWithFamily} onChange={e => setShareWithFamily(e.target.checked)} className="rounded border-white/20 bg-white/5 text-amber-500 focus:ring-amber-500/40" />
                                                Share securely with family members
                                                <span className="text-slate-500">(encrypted with family key)</span>
                                            </label>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Voice Mode Banner */}
                        {isVoiceMode && (
                            <div className={`px-4 py-2.5 border-b border-white/10 bg-gradient-to-r ${voiceStatus === 'listening' ? 'from-emerald-500/10 to-teal-500/10' :
                                voiceStatus === 'speaking' ? 'from-indigo-500/10 to-violet-500/10' :
                                    voiceStatus === 'error' ? 'from-rose-500/10 to-red-500/10' :
                                        'from-amber-500/10 to-orange-500/10'
                                }`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2.5 h-2.5 rounded-full ${voiceStatus === 'listening' ? 'bg-emerald-400' :
                                            voiceStatus === 'speaking' ? 'bg-indigo-400' :
                                                voiceStatus === 'error' ? 'bg-rose-400' : 'bg-amber-400'
                                            } ${statusInfo.pulse ? 'animate-pulse' : ''}`} />
                                        <span className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                                    </div>
                                    <button onClick={stopVoice} className="px-2.5 py-1 text-[11px] bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 rounded-lg transition-all flex items-center gap-1">
                                        <PhoneOff className="w-3 h-3" /> End
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin" style={{ minHeight: '200px' }}>
                            {messages.map(msg => (
                                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.role === 'user'
                                        ? 'bg-indigo-500/20 text-indigo-100 rounded-br-md border border-indigo-500/20'
                                        : 'bg-white/[0.05] text-slate-300 rounded-bl-md border border-white/[0.06]'
                                        }`}>
                                        {msg.role === 'bot' ? renderBotText(msg.text) : msg.text}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-white/[0.05] rounded-2xl rounded-bl-md border border-white/[0.06] px-4 py-3">
                                        <div className="flex gap-1.5">
                                            <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Actions */}
                        {!isVoiceMode && (
                            <div className="px-4 pb-2 flex gap-1.5 overflow-x-auto scrollbar-none">
                                {quickActions.map(a => (
                                    <button key={a.text} onClick={() => sendMessage(a.text)} disabled={isLoading}
                                        className="px-3 py-1.5 bg-white/[0.05] text-slate-400 text-[11px] rounded-full border border-white/[0.06] hover:bg-white/10 hover:text-white transition-all whitespace-nowrap shrink-0 disabled:opacity-50">
                                        {a.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Input */}
                        <div className="p-3 border-t border-white/10">
                            {isVoiceMode ? (
                                <div className="text-center py-1">
                                    <p className="text-[11px] text-slate-500">Voice conversation active — speak naturally</p>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    {/* Voice call button */}
                                    {isVoiceSupported() && (
                                        <button
                                            onClick={startVoice}
                                            className="p-2.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-xl transition-all"
                                            title={geminiKey ? 'Start voice conversation' : 'Add API key for voice'}
                                        >
                                            <Phone className="w-4 h-4" />
                                        </button>
                                    )}
                                    <input ref={inputRef} type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()}
                                        placeholder={geminiKey ? 'Ask anything naturally...' : "Ask anything... e.g. 'Add 5L in gold'"}
                                        className="flex-1 bg-white/[0.05] text-white rounded-xl px-4 py-2.5 text-sm border border-white/[0.08] focus:border-indigo-400/40 focus:ring-1 focus:ring-indigo-400/20 outline-none transition-all placeholder:text-slate-500" />
                                    <button onClick={() => sendMessage()} disabled={!input.trim() || isLoading} className="p-2.5 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 disabled:bg-white/5 disabled:text-slate-600 rounded-xl transition-all">
                                        <Send className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Floating Bubble */}
            <button onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-24 md:bottom-6 right-4 md:right-6 z-[59] w-14 h-14 rounded-full flex items-center justify-center shadow-2xl shadow-indigo-500/30 transition-all active:scale-90 ${isOpen ? 'bg-slate-800 border border-white/10' : 'bg-gradient-to-br from-indigo-500 to-violet-500 hover:scale-105 animate-pulse-subtle'
                    }`} title="Chat with Wealth Assistant">
                {isOpen ? <ChevronDown className="w-5 h-5 text-white" /> : <MessageCircle className="w-5 h-5 text-white" />}
            </button>
            <style>{`
        @keyframes pulse-subtle { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.4)} 50%{box-shadow:0 0 0 8px rgba(99,102,241,0)} }
        .animate-pulse-subtle { animation: pulse-subtle 3s infinite; }
      `}</style>
        </>
    );
};
