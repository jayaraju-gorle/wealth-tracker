import React, { useState, useMemo } from 'react';
import { Target, Trash2, Plus, Trophy, Droplets, TrendingUp, Landmark, Pencil, Check } from 'lucide-react';
import { AppState, Milestone, MilestoneTrackingMode, LIQUID_ASSET_TYPES } from '../types';
import { GlassCard } from './ui/GlassCard';
import { formatCurrency } from '../utils';
import { useLanguage } from '../i18n/LanguageContext';

interface Props {
  data: AppState;
  onUpdate: (updates: Partial<AppState>) => void;
}

// ─── Curated color palette ────────────────────────────────────────────
const MILESTONE_COLORS = [
  '#34d399', // emerald
  '#60a5fa', // blue
  '#f59e0b', // amber
  '#a78bfa', // violet
  '#f472b6', // pink
  '#38bdf8', // sky
  '#fb923c', // orange
  '#4ade80', // green
  '#e879f9', // fuchsia
  '#2dd4bf', // teal
];

// ─── Indian number formatting ─────────────────────────────────────────
const formatIndian = (n: number): string => {
  if (!n && n !== 0) return '';
  return n.toLocaleString('en-IN');
};
const parseIndian = (s: string): number => Number(s.replace(/,/g, '')) || 0;

// ─── SVG Progress Ring ────────────────────────────────────────────────
const ProgressRing: React.FC<{ percent: number; color: string; size?: number }> = ({ percent, color, size = 72 }) => {
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (Math.min(100, percent) / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={radius}
        stroke={color} strokeWidth={strokeWidth} fill="none"
        strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
      />
    </svg>
  );
};

// ─── Input classes (consistent with rest of app) ──────────────────────
const INPUT_CLASS = 'w-full bg-white/[0.03] text-white rounded-lg px-3 py-2.5 text-sm border border-white/[0.08] focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 outline-none transition-all placeholder:text-slate-500';
const SELECT_CLASS = 'w-full bg-slate-800/60 text-white rounded-lg px-3 py-2.5 text-sm border border-white/[0.08] focus:border-amber-400/40 outline-none transition-all cursor-pointer appearance-none';
const LABEL_CLASS = 'text-[11px] text-slate-400 font-medium block mb-1.5';
const OPTION_STYLE = { backgroundColor: '#1e293b', color: '#e2e8f0' };

export const Milestones: React.FC<Props> = ({ data, onUpdate }) => {
  const { t } = useLanguage();
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalMode, setNewGoalMode] = useState<MilestoneTrackingMode>('net_worth');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Pre-compute tracked values
  const trackedValues = useMemo(() => {
    const totalAssets = data.assets.reduce((a, b) => a + b.value, 0);
    const totalLiabilities = data.liabilities.reduce((a, b) => a + b.value, 0);
    const liquidAssets = data.assets
      .filter(a => LIQUID_ASSET_TYPES.includes(a.type))
      .reduce((sum, a) => sum + a.value, 0);

    return {
      net_worth: totalAssets - totalLiabilities,
      liquid_assets: liquidAssets,
      total_assets: totalAssets,
    };
  }, [data.assets, data.liabilities]);

  const addMilestone = () => {
    if (!newGoalName || !newGoalTarget) return;
    const colorIndex = data.milestones.length % MILESTONE_COLORS.length;
    const newMilestone: Milestone = {
      id: crypto.randomUUID(),
      name: newGoalName,
      targetAmount: parseIndian(newGoalTarget),
      color: MILESTONE_COLORS[colorIndex],
      trackingMode: newGoalMode,
    };
    onUpdate({ milestones: [...data.milestones, newMilestone] });
    setNewGoalName('');
    setNewGoalTarget('');
  };

  const removeMilestone = (id: string) => {
    onUpdate({ milestones: data.milestones.filter(m => m.id !== id) });
  };

  const updateMilestone = (id: string, updates: Partial<Milestone>) => {
    onUpdate({
      milestones: data.milestones.map(m => m.id === id ? { ...m, ...updates } : m)
    });
  };

  const getModeLabel = (mode: MilestoneTrackingMode) => {
    switch (mode) {
      case 'net_worth': return t('milestones_net_worth');
      case 'liquid_assets': return t('milestones_liquid');
      case 'total_assets': return t('milestones_total');
    }
  };

  const getModeIcon = (mode: MilestoneTrackingMode) => {
    switch (mode) {
      case 'net_worth': return TrendingUp;
      case 'liquid_assets': return Droplets;
      case 'total_assets': return Landmark;
    }
  };

  return (
    <GlassCard title={t('milestones_title')} action={
      <span className="text-xs text-slate-400">{data.milestones.length} {t('milestones_goals')}</span>
    }>
      {/* Empty state */}
      {data.milestones.length === 0 && (
        <div className="text-center py-10">
          <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-amber-500/50" />
          </div>
          <p className="text-slate-400 mb-1">{t('milestones_no_goals')}</p>
          <p className="text-slate-500 text-sm">{t('milestones_set_goals')}</p>
        </div>
      )}

      {/* Milestone cards */}
      <div className="space-y-3 mb-6">
        {data.milestones.map(milestone => {
          const mode = milestone.trackingMode || 'net_worth';
          const currentValue = trackedValues[mode];
          const percent = Math.min(100, Math.max(0, (currentValue / milestone.targetAmount) * 100));
          const isComplete = percent >= 100;
          const ModeIcon = getModeIcon(mode);
          const isEditing = editingId === milestone.id;

          return (
            <div
              key={milestone.id}
              className={`relative p-4 rounded-2xl border transition-all ${isComplete
                ? 'bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border-emerald-500/25'
                : 'bg-white/[0.03] border-white/[0.06] hover:border-white/10'
                }`}
            >
              <div className="flex items-start gap-4">
                {/* Progress Ring */}
                <div className="relative flex-shrink-0">
                  <ProgressRing percent={percent} color={isComplete ? '#34d399' : milestone.color} size={68} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    {isComplete ? (
                      <Trophy className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <span className="text-sm font-bold text-white">{percent.toFixed(0)}%</span>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  {/* Name row */}
                  <div className="flex items-start gap-2 mb-1">
                    {isEditing ? (
                      <input
                        autoFocus
                        defaultValue={milestone.name}
                        onBlur={(e) => {
                          updateMilestone(milestone.id, { name: e.target.value });
                          setEditingId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                        }}
                        className="text-white font-semibold bg-transparent border-b border-amber-400/40 outline-none text-sm flex-1 py-0.5"
                      />
                    ) : (
                      <h4 className="text-white font-semibold text-sm leading-snug break-words">{milestone.name}</h4>
                    )}
                    {isComplete && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 rounded-full uppercase tracking-wider shrink-0">
                        🎉 {t('milestones_achieved')}
                      </span>
                    )}
                  </div>

                  {/* Target + Current */}
                  <div className="flex items-center gap-3 flex-wrap text-xs">
                    <span className="text-slate-400">
                      {t('milestones_target')}: <span className="text-white font-medium">{formatCurrency(milestone.targetAmount)}</span>
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-400">
                      {t('milestones_current')}: <span className={`font-medium ${isComplete ? 'text-emerald-400' : 'text-amber-400'}`}>{formatCurrency(currentValue)}</span>
                    </span>
                  </div>

                  {/* Tracking mode badge */}
                  <div className="flex items-center gap-1 mt-1.5">
                    <ModeIcon className="w-3 h-3 text-slate-500" />
                    <span className="text-[11px] text-slate-500">{getModeLabel(mode)}</span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{ width: `${percent}%`, backgroundColor: isComplete ? '#34d399' : milestone.color }}
                    />
                  </div>
                </div>

                {/* Actions (always visible) */}
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => setEditingId(isEditing ? null : milestone.id)}
                    className="p-1.5 text-slate-500 hover:text-amber-400 hover:bg-amber-400/10 rounded-lg transition-all"
                    title="Edit"
                  >
                    {isEditing ? <Check className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => removeMilestone(milestone.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <select
                    value={mode}
                    onChange={(e) => updateMilestone(milestone.id, { trackingMode: e.target.value as MilestoneTrackingMode })}
                    className="text-[10px] bg-white/5 border border-white/10 text-slate-400 rounded px-1.5 py-0.5 outline-none cursor-pointer appearance-none"
                    style={OPTION_STYLE}
                  >
                    <option value="net_worth" style={OPTION_STYLE}>{t('milestones_net_worth')}</option>
                    <option value="liquid_assets" style={OPTION_STYLE}>{t('milestones_liquid')}</option>
                    <option value="total_assets" style={OPTION_STYLE}>{t('milestones_total')}</option>
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Goal Form */}
      <div className="bg-white/[0.02] p-4 rounded-xl border border-white/[0.06]">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-5">
            <label className={LABEL_CLASS}>{t('milestones_goal_name')}</label>
            <input
              type="text"
              value={newGoalName}
              onChange={e => setNewGoalName(e.target.value)}
              placeholder={t('milestones_placeholder_name')}
              className={INPUT_CLASS}
            />
          </div>
          <div className="sm:col-span-3">
            <label className={LABEL_CLASS}>{t('milestones_target_amount')}</label>
            <input
              type="text"
              inputMode="decimal"
              value={newGoalTarget}
              onChange={e => {
                const raw = e.target.value.replace(/,/g, '');
                if (/^\d*$/.test(raw)) {
                  setNewGoalTarget(raw ? formatIndian(Number(raw)) : '');
                }
              }}
              placeholder={t('milestones_placeholder_amount')}
              className={INPUT_CLASS}
            />
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS}>{t('milestones_track_against')}</label>
            <select
              value={newGoalMode}
              onChange={e => setNewGoalMode(e.target.value as MilestoneTrackingMode)}
              className={SELECT_CLASS}
            >
              <option value="net_worth" style={OPTION_STYLE}>{t('milestones_net_worth')}</option>
              <option value="liquid_assets" style={OPTION_STYLE}>{t('milestones_liquid')}</option>
              <option value="total_assets" style={OPTION_STYLE}>{t('milestones_total')}</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <button
              onClick={addMilestone}
              disabled={!newGoalName || !newGoalTarget}
              className="w-full px-4 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 disabled:bg-white/5 disabled:text-slate-600 text-amber-400 rounded-lg transition-all flex items-center justify-center gap-2 active:scale-[0.98] text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> {t('milestones_add_goal')}
            </button>
          </div>
        </div>
      </div>
    </GlassCard>
  );
};