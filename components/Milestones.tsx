import React, { useState, useMemo } from 'react';
import { Target, Trash2, Plus, Trophy, Droplets, TrendingUp, Landmark } from 'lucide-react';
import { AppState, Milestone, MilestoneTrackingMode, LIQUID_ASSET_TYPES } from '../types';
import { GlassCard } from './ui/GlassCard';
import { formatCurrency } from '../utils';

interface Props {
  data: AppState;
  onUpdate: (updates: Partial<AppState>) => void;
}

const TRACKING_MODE_LABELS: Record<MilestoneTrackingMode, { label: string; shortLabel: string; icon: typeof Target }> = {
  net_worth: { label: 'Net Worth', shortLabel: 'Net Worth', icon: TrendingUp },
  liquid_assets: { label: 'Liquid Assets (Cash + FD + MF)', shortLabel: 'Liquid', icon: Droplets },
  total_assets: { label: 'Total Assets', shortLabel: 'Total Assets', icon: Landmark },
};

// SVG Circular Progress Ring
const ProgressRing: React.FC<{ percent: number; color: string; size?: number }> = ({ percent, color, size = 80 }) => {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={strokeWidth}
        fill="none"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease-out' }}
      />
    </svg>
  );
};

export const Milestones: React.FC<Props> = ({ data, onUpdate }) => {
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalMode, setNewGoalMode] = useState<MilestoneTrackingMode>('net_worth');

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
    const newMilestone: Milestone = {
      id: crypto.randomUUID(),
      name: newGoalName,
      targetAmount: Number(newGoalTarget),
      color: `hsl(${Math.random() * 360}, 70%, 50%)`,
      trackingMode: newGoalMode,
    };
    onUpdate({ milestones: [...data.milestones, newMilestone] });
    setNewGoalName('');
    setNewGoalTarget('');
  };

  const removeMilestone = (id: string) => {
    onUpdate({ milestones: data.milestones.filter(m => m.id !== id) });
  };

  const updateMilestoneMode = (id: string, mode: MilestoneTrackingMode) => {
    onUpdate({
      milestones: data.milestones.map(m => m.id === id ? { ...m, trackingMode: mode } : m)
    });
  };

  return (
    <GlassCard title="Financial Milestones" action={
      <span className="text-xs text-slate-400">{data.milestones.length} goals</span>
    }>
      {data.milestones.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-amber-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-amber-500/50" />
          </div>
          <p className="text-slate-400 mb-1">No milestones set</p>
          <p className="text-slate-500 text-sm">Set financial goals to track your progress</p>
        </div>
      )}

      <div className="space-y-4 mb-6">
        {data.milestones.map(milestone => {
          const mode = milestone.trackingMode || 'net_worth';
          const currentValue = trackedValues[mode];
          const percent = Math.min(100, Math.max(0, (currentValue / milestone.targetAmount) * 100));
          const isComplete = percent >= 100;
          const modeInfo = TRACKING_MODE_LABELS[mode];
          const ModeIcon = modeInfo.icon;

          return (
            <div
              key={milestone.id}
              className={`relative flex items-center gap-4 p-4 rounded-2xl border transition-all group ${isComplete
                  ? 'bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border-emerald-500/30 animate-celebrate'
                  : 'bg-white/5 border-white/5 hover:border-white/15'
                }`}
            >
              {/* Progress Ring */}
              <div className="relative flex-shrink-0">
                <ProgressRing percent={percent} color={milestone.color} size={70} />
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
                <div className="flex items-center gap-2">
                  <h4 className="text-white font-semibold truncate">{milestone.name}</h4>
                  {isComplete && (
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 rounded-full uppercase tracking-wider">
                      Achieved!
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <span className="text-slate-400 text-sm">Target: {formatCurrency(milestone.targetAmount)}</span>
                  <span className="text-slate-500 text-[10px]">·</span>
                  <span className="text-slate-500 text-[10px] flex items-center gap-1">
                    <ModeIcon className="w-3 h-3" />
                    Tracks {modeInfo.shortLabel}
                    <span className="text-slate-600">({formatCurrency(currentValue)})</span>
                  </span>
                </div>
                {/* Linear progress bar */}
                <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${percent}%`, backgroundColor: milestone.color }}
                  />
                </div>
              </div>

              {/* Tracking mode selector + Delete */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <button
                  onClick={() => removeMilestone(milestone.id)}
                  className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <select
                  value={mode}
                  onChange={(e) => updateMilestoneMode(milestone.id, e.target.value as MilestoneTrackingMode)}
                  className="text-[10px] bg-white/5 border border-white/10 text-slate-400 rounded px-1.5 py-0.5 outline-none opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                >
                  <option value="net_worth">Net Worth</option>
                  <option value="liquid_assets">Liquid Assets</option>
                  <option value="total_assets">Total Assets</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New */}
      <div className="flex flex-col gap-4 bg-slate-900/30 p-4 rounded-xl border border-slate-700/50">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="text-xs text-slate-400 block mb-1">Goal Name</label>
            <input
              type="text"
              value={newGoalName}
              onChange={e => setNewGoalName(e.target.value)}
              placeholder="e.g. Daughter's Education"
              className="w-full bg-transparent border-b border-slate-600 text-white focus:border-white outline-none py-1"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="text-xs text-slate-400 block mb-1">Target Amount (₹)</label>
            <input
              type="number"
              value={newGoalTarget}
              onChange={e => setNewGoalTarget(e.target.value)}
              placeholder="e.g. 2500000"
              className="w-full bg-transparent border-b border-slate-600 text-white focus:border-white outline-none py-1"
            />
          </div>
          <div className="w-full sm:w-auto">
            <label className="text-xs text-slate-400 block mb-1">Track Against</label>
            <select
              value={newGoalMode}
              onChange={e => setNewGoalMode(e.target.value as MilestoneTrackingMode)}
              className="w-full bg-slate-800/50 text-white rounded px-2 py-1.5 text-sm border border-slate-600 outline-none"
            >
              <option value="net_worth">Net Worth</option>
              <option value="liquid_assets">Liquid Assets</option>
              <option value="total_assets">Total Assets</option>
            </select>
          </div>
        </div>
        <button
          onClick={addMilestone}
          className="w-full sm:w-auto px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center justify-center gap-2 active:scale-[0.98] self-end"
        >
          <Plus className="w-4 h-4" /> Add Goal
        </button>
      </div>
    </GlassCard>
  );
};