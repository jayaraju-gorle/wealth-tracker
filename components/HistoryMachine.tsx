import React, { useState, useMemo } from 'react';
import { Calendar, Save, RotateCcw, Trash2, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, Tooltip } from 'recharts';
import { AppState, Snapshot } from '../types';
import { GlassCard } from './ui/GlassCard';
import { formatCurrency, formatCompact } from '../utils';

interface Props {
  data: AppState;
  onUpdate: (updates: Partial<AppState>) => void;
}

export const HistoryMachine: React.FC<Props> = ({ data, onUpdate }) => {
  const [newSnapshotDate, setNewSnapshotDate] = useState(new Date().toISOString().slice(0, 10));
  const [newSnapshotValue, setNewSnapshotValue] = useState<number | ''>('');

  const currentNetWorth = data.assets.reduce((a, b) => a + b.value, 0) - data.liabilities.reduce((a, b) => a + b.value, 0);

  // Sparkline data
  const sparkData = useMemo(() => {
    return data.snapshots
      .slice()
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(s => ({ date: s.date, value: s.netWorth }));
  }, [data.snapshots]);

  // Trend info
  const trend = useMemo(() => {
    if (sparkData.length < 2) return null;
    const first = sparkData[0].value;
    const last = sparkData[sparkData.length - 1].value;
    const change = last - first;
    const percent = first !== 0 ? ((change / Math.abs(first)) * 100) : 0;
    return { change, percent, isUp: change >= 0 };
  }, [sparkData]);

  const handleLogCurrent = () => {
    const today = new Date().toISOString().slice(0, 10);
    const exists = data.snapshots.find(s => s.date === today);
    if (exists) {
      if (!confirm("A snapshot for today already exists. Overwrite?")) return;
    }

    const newSnapshot: Snapshot = {
      id: exists ? exists.id : crypto.randomUUID(),
      date: today,
      netWorth: currentNetWorth,
      isManual: false,
      note: 'Auto-logged from dashboard'
    };

    const updatedSnapshots = [...data.snapshots.filter(s => s.date !== today), newSnapshot]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    onUpdate({ snapshots: updatedSnapshots });
  };

  const handleAddHistorical = () => {
    if (!newSnapshotValue) return;

    const newSnapshot: Snapshot = {
      id: crypto.randomUUID(),
      date: newSnapshotDate,
      netWorth: Number(newSnapshotValue),
      isManual: true,
      note: 'Manual historical entry'
    };

    const updatedSnapshots = [...data.snapshots.filter(s => s.date !== newSnapshotDate), newSnapshot]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    onUpdate({ snapshots: updatedSnapshots });
    setNewSnapshotValue('');
  };

  const deleteSnapshot = (id: string) => {
    onUpdate({ snapshots: data.snapshots.filter(s => s.id !== id) });
  };

  return (
    <div className="space-y-6">
      {/* Sparkline Trend Card */}
      {sparkData.length >= 2 && (
        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-5 animate-slide-up">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400 mb-1">Net Worth Trend</p>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-white">{formatCurrency(sparkData[sparkData.length - 1].value)}</span>
                {trend && (
                  <span className={`flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full ${trend.isUp ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                    }`}>
                    {trend.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {trend.percent >= 0 ? '+' : ''}{trend.percent.toFixed(1)}%
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {sparkData.length} snapshots · {sparkData[0].date} → {sparkData[sparkData.length - 1].date}
              </p>
            </div>
            <div className="w-full sm:w-48 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData}>
                  <defs>
                    <linearGradient id="sparkGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={trend?.isUp ? '#10b981' : '#f43f5e'} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={trend?.isUp ? '#10b981' : '#f43f5e'} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={trend?.isUp ? '#10b981' : '#f43f5e'}
                    strokeWidth={2}
                    fill="url(#sparkGradient)"
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    formatter={(val: number) => [formatCurrency(val), '']}
                    labelFormatter={(label) => `Date: ${label}`}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <GlassCard title="Time Machine Control">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Action: Log Today */}
          <div className="bg-emerald-500/10 p-5 rounded-xl border border-emerald-500/20 flex flex-col justify-between">
            <div>
              <h4 className="text-emerald-300 font-semibold mb-1">Capture Today</h4>
              <p className="text-slate-400 text-sm mb-4">
                Record your current net worth ({formatCurrency(currentNetWorth)}) as a permanent history point.
              </p>
            </div>
            <button
              onClick={handleLogCurrent}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <Save className="w-4 h-4" /> Log Snapshot
            </button>
          </div>

          {/* Manual Entry */}
          <div className="bg-indigo-500/10 p-5 rounded-xl border border-indigo-500/20">
            <h4 className="text-indigo-300 font-semibold mb-3">Add Past Data</h4>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Date</label>
                <input
                  type="date"
                  value={newSnapshotDate}
                  onChange={(e) => setNewSnapshotDate(e.target.value)}
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-white text-sm focus:border-indigo-400 outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Net Worth (₹)</label>
                <input
                  type="number"
                  value={newSnapshotValue}
                  onChange={(e) => setNewSnapshotValue(parseFloat(e.target.value))}
                  placeholder="e.g. 500000"
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-2 text-white text-sm focus:border-indigo-400 outline-none"
                />
              </div>
              <button
                onClick={handleAddHistorical}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2 active:scale-[0.98]"
              >
                <RotateCcw className="w-4 h-4" /> Backdate Entry
              </button>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* History Log Table */}
      <GlassCard title="History Log" action={
        <span className="text-xs text-slate-400">{data.snapshots.length} entries</span>
      }>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-white/5 uppercase font-medium text-xs">
              <tr>
                <th className="px-4 py-3 rounded-l-lg">Date</th>
                <th className="px-4 py-3">Net Worth</th>
                <th className="px-4 py-3">Change</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3 rounded-r-lg text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50">
              {data.snapshots.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center mb-3">
                        <Calendar className="w-6 h-6 text-slate-600" />
                      </div>
                      <p className="text-slate-500">No history recorded yet.</p>
                      <p className="text-slate-600 text-xs mt-1">Use the controls above to start tracking.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                [...data.snapshots]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map((snap, idx, arr) => {
                    const prev = arr[idx + 1]; // previous is next in descending order
                    const change = prev ? snap.netWorth - prev.netWorth : null;
                    return (
                      <tr key={snap.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 text-white font-medium">{snap.date}</td>
                        <td className="px-4 py-3 text-emerald-400 font-bold font-mono">{formatCurrency(snap.netWorth)}</td>
                        <td className="px-4 py-3">
                          {change !== null ? (
                            <span className={`flex items-center gap-1 text-xs font-medium ${change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                              {change >= 0 ? '+' : ''}{formatCompact(change)}
                            </span>
                          ) : (
                            <span className="text-slate-600 text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {snap.isManual ? (
                            <span className="bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-full">Manual</span>
                          ) : (
                            <span className="bg-emerald-500/20 text-emerald-300 px-2 py-1 rounded-full">Auto</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => deleteSnapshot(snap.id)}
                            className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};