import React, { useState } from 'react';
import { Cloud, Lock, Users, AlertCircle, Check, Copy, UserPlus, ArrowRight, ArrowLeft, WifiOff, ShieldCheck, RefreshCw, Loader2 } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import { AppState } from '../types';
import { initFirebase, authenticateAnonymously, isFirebaseInitialized, isMock } from '../services/firebase';
import { SyncStatus } from '../services/store';
import { useLanguage } from '../i18n/LanguageContext';

interface Props {
  data: AppState;
  onUpdate: (updates: Partial<AppState>) => void;
  isSynced: boolean;
  syncStatus?: SyncStatus;
  onForcePull?: () => void;
}

export const SyncManager: React.FC<Props> = ({ data, onUpdate, isSynced, syncStatus = 'idle', onForcePull }) => {
  const { t } = useLanguage();
  const [view, setView] = useState<'main' | 'join'>('main');
  const [joinKey, setJoinKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyKey = () => {
    if (data.familyId) {
      navigator.clipboard.writeText(data.familyId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const initializeSync = async (isNewFamily: boolean) => {
    setError(null);
    setLoading(true);

    try {
      const isInit = initFirebase();
      if (!isInit) {
        throw new Error("Initialization failed");
      }

      await authenticateAnonymously();

      if (isNewFamily) {
        const p1 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const p2 = Math.random().toString(36).substring(2, 6).toUpperCase();
        const newId = `${p1}-${p2}`;
        onUpdate({ familyId: newId, lastUpdated: Date.now() });
      } else {
        if (!joinKey.trim() || joinKey.length < 5) throw new Error("Please enter a valid Sync Key");
        onUpdate({ familyId: joinKey.trim().toUpperCase() });
      }

      setView('main');
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Connection failed. Please check your internet.");
    } finally {
      setLoading(false);
    }
  };

  // SYNCED VIEW — Compact bar (or Connecting state)
  if (data.familyId) {
    const isReady = isSynced && isFirebaseInitialized();

    return (
      <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/20 backdrop-blur-md border border-teal-500/20 rounded-2xl px-5 py-4 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full relative flex-shrink-0 ${isReady ? 'bg-emerald-500/20 text-emerald-400' : 'bg-teal-500/20 text-teal-400'}`}>
              {!isReady ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isMock() && (
                <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 border border-slate-900" title="Demo Mode">
                  <WifiOff className="w-2 h-2 text-white" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold text-white">
                {!isReady ? "Connecting..." : t('cloud_sync_active')}
              </span>
              {isMock() && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Demo</span>}

              {/* Status Badge */}
              {isReady && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/20 text-[10px] font-medium border border-white/5">
                  {syncStatus === 'syncing' && (
                    <>
                      <Loader2 className="w-2.5 h-2.5 animate-spin text-blue-400" />
                      <span className="text-blue-200">{t('saving')}</span>
                    </>
                  )}
                  {syncStatus === 'saved' && (
                    <>
                      <Cloud className="w-2.5 h-2.5 text-emerald-400" />
                      <span className="text-emerald-200">{t('saved')}</span>
                    </>
                  )}
                  {syncStatus === 'error' && (
                    <>
                      <AlertCircle className="w-2.5 h-2.5 text-rose-400" />
                      <span className="text-rose-200">{t('error')}</span>
                    </>
                  )}
                  {syncStatus === 'idle' && (
                    <span className="text-slate-400">{t('idle')}</span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-lg border border-white/10 flex-1 sm:flex-none">
              <code className="text-sm font-mono text-emerald-300 tracking-wider">{data.familyId}</code>
              <button onClick={handleCopyKey} className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white transition-colors" title="Copy Key">
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Hey! Let's track our finances together on Wealth Tracker 💰\n\nJoin with this sync key: *${data.familyId}*\n\n👉 https://jayaraju-gorle.github.io/wealth-tracker/`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/80 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-all shrink-0"
              title="Invite via WhatsApp"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
              {t('invite')}
            </a>
            <div className="flex items-center gap-2">
              {onForcePull && (
                <button onClick={onForcePull} className="p-1.5 text-slate-500 hover:text-indigo-400 transition-colors" title="Force Refresh">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => onUpdate({ familyId: null })}
                className="text-[10px] text-rose-400 hover:text-rose-300 transition-colors"
              >
                {t('disconnect')}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // NOT SYNCED — Setup View
  return (
    <GlassCard className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border-purple-500/20 relative overflow-hidden" animate={true}>

      <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-purple-500/20 blur-3xl rounded-full pointer-events-none"></div>

      {view === 'main' && (
        <div className="space-y-5">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{t('sync_title')}</h3>
                <p className="text-slate-300 text-sm">{t('sync_desc')}</p>
              </div>
            </div>
            {isMock() && (
              <span className="px-2 py-1 text-xs font-mono text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded">Demo</span>
            )}
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded-xl flex gap-3 items-start relative z-10">
            <ShieldCheck className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-100/90 leading-relaxed">
              <span className="font-semibold text-blue-200">Privacy First — </span>
              Data stays on your device unless you enable sync.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
            <button
              onClick={() => initializeSync(true)}
              disabled={loading}
              className="group relative flex flex-col items-start p-4 rounded-xl bg-white/5 hover:bg-indigo-500/10 border border-white/10 hover:border-indigo-500/30 transition-all text-left active:scale-[0.98]"
            >
              <div className="mb-2 p-2 bg-indigo-500/20 rounded-lg text-indigo-400 group-hover:text-white group-hover:bg-indigo-500 transition-colors">
                <UserPlus className="w-5 h-5" />
              </div>
              <h4 className="text-base font-semibold text-white mb-0.5">{t('start_new_sync')}</h4>
              <p className="text-xs text-slate-400">{t('new_sync_desc')}</p>
              {loading && <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-xl"><span className="text-xs text-white">Creating...</span></div>}
            </button>

            <button
              onClick={() => setView('join')}
              disabled={loading}
              className="group flex flex-col items-start p-4 rounded-xl bg-white/5 hover:bg-purple-500/10 border border-white/10 hover:border-purple-500/30 transition-all text-left active:scale-[0.98]"
            >
              <div className="mb-2 p-2 bg-purple-500/20 rounded-lg text-purple-400 group-hover:text-white group-hover:bg-purple-500 transition-colors">
                <Users className="w-5 h-5" />
              </div>
              <h4 className="text-base font-semibold text-white mb-0.5">{t('join_existing')}</h4>
              <p className="text-xs text-slate-400">{t('join_sync_desc')}</p>
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-rose-400 text-xs bg-rose-500/10 p-3 rounded-lg border border-rose-500/20 relative z-10">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>
      )}

      {view === 'join' && (
        <div className="max-w-md mx-auto py-4">
          <button onClick={() => setView('main')} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-6">
            <ArrowLeft className="w-4 h-4" /> {t('back')}
          </button>

          <div className="text-center mb-6">
            <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3 text-purple-400">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-white">{t('enter_sync_key')}</h3>
            <p className="text-slate-400 text-sm mt-1">Paste the code shared by your partner.</p>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              value={joinKey}
              onChange={(e) => setJoinKey(e.target.value.toUpperCase())}
              placeholder="ABCD-1234"
              className="w-full text-center text-2xl font-mono tracking-widest uppercase bg-black/30 border border-purple-500/30 rounded-xl p-4 text-white focus:border-purple-400 outline-none placeholder:text-slate-700"
              autoFocus
            />

            <button
              onClick={() => initializeSync(false)}
              disabled={loading}
              className="w-full py-3.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-purple-900/50 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {loading ? 'Connecting...' : <>Connect <ArrowRight className="w-5 h-5" /></>}
            </button>
          </div>

          {error && <p className="text-center text-rose-400 text-sm mt-4">{error}</p>}
        </div>
      )}

    </GlassCard>
  );
};