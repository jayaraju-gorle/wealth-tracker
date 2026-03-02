import React, { useState } from 'react';
import { Target, Trash2, Plus, Trophy } from 'lucide-react';
import { AppState, Milestone } from '../types';
import { GlassCard } from './ui/GlassCard';
import { formatCurrency } from '../utils';

interface Props {
  data: AppState;
  onUpdate: (updates: Partial<AppState>) => void;
}

// SVG Circular Progress Ring
const ProgressRing: React.FC<{ percent: number; color: string; size?: number }> = ({ percent, color, size = 80 }) => {
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="rgba(255,255,255,0.1)"
        strokeWidth={strokeWidth}
        fill="none"
      />
      {/* Progress circle */}
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

  const currentNetWorth = data.assets.reduce((a, b) => a + b.value, 0) - data.liabilities.reduce((a, b) => a + b.value, 0);

  const addMilestone = () => {
    if (!newGoalName || !newGoalTarget) return;
    const newMilestone: Milestone = {
      id: crypto.randomUUID(),
      name: newGoalName,
      targetAmount: Number(newGoalTarget),
      color: `hsl(${Math.random() * 360}, 70%, 50%)`
    };
    onUpdate({ milestones: [...data.milestones, newMilestone] });
    setNewGoalName('');
    setNewGoalTarget('');
  };

  const removeMilestone = (id: string) => {
    onUpdate({ milestones: data.milestones.filter(m => m.id !== id) });
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
          const percent = Math.min(100, Math.max(0, (currentNetWorth / milestone.targetAmount) * 100));
          const isComplete = percent >= 100;

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
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-slate-400 text-sm">Target: {formatCurrency(milestone.targetAmount)}</span>
                </div>
                {/* Linear progress bar */}
                <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{ width: `${percent}%`, backgroundColor: milestone.color }}
                  />
                </div>
              </div>

              {/* Delete */}
              <button
                onClick={() => removeMilestone(milestone.id)}
                className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Add New */}
      <div className="flex flex-col sm:flex-row gap-4 items-end bg-slate-900/30 p-4 rounded-xl border border-slate-700/50">
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
        <button
          onClick={addMilestone}
          className="w-full sm:w-auto px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>
    </GlassCard>
  );
};