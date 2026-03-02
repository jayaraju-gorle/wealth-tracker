import React, { useState, useMemo } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, PieChart as PieChartIcon } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { AppState, Asset, Liability, AssetType, LiabilityType } from '../types';
import { GlassCard } from './ui/GlassCard';
import { formatCurrency } from '../utils';

interface Props {
  data: AppState;
  onUpdate: (updates: Partial<AppState>) => void;
}

const ASSET_COLORS: Record<string, string> = {
  CASH: '#10b981',
  MUTUAL_FUND: '#6366f1',
  STOCK: '#f59e0b',
  REAL_ESTATE: '#ec4899',
  GOLD: '#eab308',
  FD: '#06b6d4',
  EPF_PPF: '#8b5cf6',
  CRYPTO: '#f97316',
  OTHER: '#64748b',
};

const ASSET_LABELS: Record<string, string> = {
  CASH: 'Cash',
  MUTUAL_FUND: 'Mutual Funds',
  STOCK: 'Stocks',
  REAL_ESTATE: 'Real Estate',
  GOLD: 'Gold',
  FD: 'FD/RD',
  EPF_PPF: 'EPF/PPF/NPS',
  CRYPTO: 'Crypto',
  OTHER: 'Other',
};

export const AssetsLiabilities: React.FC<Props> = ({ data, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'assets' | 'liabilities'>('assets');

  const addAsset = () => {
    const newAsset: Asset = {
      id: crypto.randomUUID(),
      name: 'New Asset',
      value: 0,
      type: 'CASH',
      growthRate: 0.06
    };
    onUpdate({ assets: [...data.assets, newAsset] });
  };

  const addLiability = () => {
    const newLiab: Liability = {
      id: crypto.randomUUID(),
      name: 'New Liability',
      value: 0,
      type: 'PERSONAL_LOAN',
      interestRate: 0.10
    };
    onUpdate({ liabilities: [...data.liabilities, newLiab] });
  };

  const removeAsset = (id: string) => {
    onUpdate({ assets: data.assets.filter(a => a.id !== id) });
  };
  const removeLiability = (id: string) => {
    onUpdate({ liabilities: data.liabilities.filter(l => l.id !== id) });
  };

  const updateAsset = (id: string, field: keyof Asset, value: any) => {
    onUpdate({
      assets: data.assets.map(a => a.id === id ? { ...a, [field]: value } : a)
    });
  };
  const updateLiability = (id: string, field: keyof Liability, value: any) => {
    onUpdate({
      liabilities: data.liabilities.map(l => l.id === id ? { ...l, [field]: value } : l)
    });
  };

  const totalAssets = data.assets.reduce((sum, a) => sum + a.value, 0);
  const totalLiabilities = data.liabilities.reduce((sum, l) => sum + l.value, 0);
  const netWorth = totalAssets - totalLiabilities;

  // Pie chart data grouped by type
  const pieData = useMemo(() => {
    const grouped: Record<string, number> = {};
    data.assets.forEach(a => {
      grouped[a.type] = (grouped[a.type] || 0) + a.value;
    });
    return Object.entries(grouped)
      .filter(([, v]) => v > 0)
      .map(([type, value]) => ({
        name: ASSET_LABELS[type] || type,
        value,
        color: ASSET_COLORS[type] || '#64748b',
      }))
      .sort((a, b) => b.value - a.value);
  }, [data.assets]);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="bg-emerald-500/10 border-emerald-500/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-emerald-200 text-sm font-medium">Total Assets</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatCurrency(totalAssets)}</div>
        </GlassCard>

        <GlassCard className="bg-rose-500/10 border-rose-500/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-500/20 rounded-lg">
              <TrendingDown className="w-5 h-5 text-rose-400" />
            </div>
            <span className="text-rose-200 text-sm font-medium">Total Liabilities</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatCurrency(totalLiabilities)}</div>
        </GlassCard>

        <GlassCard className="bg-blue-500/10 border-blue-500/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <div className="font-bold text-blue-400 px-1">₹</div>
            </div>
            <span className="text-blue-200 text-sm font-medium">Net Worth</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatCurrency(netWorth)}</div>
        </GlassCard>
      </div>

      {/* Asset Allocation Pie Chart */}
      {pieData.length > 0 && (
        <GlassCard title="Asset Allocation" action={
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <PieChartIcon className="w-3 h-3" /> By category
          </div>
        }>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={`cell-${i}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                    formatter={(val: number) => [formatCurrency(val), 'Value']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {pieData.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm p-2 rounded-lg hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                    <span className="text-slate-300">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-white font-medium font-mono">{formatCurrency(item.value)}</span>
                    <span className="text-slate-500 text-xs w-10 text-right">
                      {totalAssets > 0 ? ((item.value / totalAssets) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      <GlassCard title="Portfolio Manager">
        <div className="flex gap-4 mb-6 border-b border-white/10 pb-1">
          <button
            onClick={() => setActiveTab('assets')}
            className={`pb-3 px-2 text-sm font-medium transition-colors ${activeTab === 'assets' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-white'}`}
          >
            Assets ({data.assets.length})
          </button>
          <button
            onClick={() => setActiveTab('liabilities')}
            className={`pb-3 px-2 text-sm font-medium transition-colors ${activeTab === 'liabilities' ? 'text-rose-400 border-b-2 border-rose-400' : 'text-slate-400 hover:text-white'}`}
          >
            Liabilities ({data.liabilities.length})
          </button>
        </div>

        <div className="space-y-4">
          {activeTab === 'assets' && (
            <>
              {data.assets.length === 0 && (
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-8 h-8 text-emerald-500/50" />
                  </div>
                  <p className="text-slate-400 mb-1">No assets tracked yet</p>
                  <p className="text-slate-500 text-sm mb-4">Start by adding your savings, investments, or property</p>
                </div>
              )}
              {data.assets.map(asset => (
                <div key={asset.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-white/5 p-4 rounded-xl border border-white/5 hover:border-white/20 hover:bg-white/[0.07] transition-all group">
                  <div className="sm:col-span-4">
                    <label className="text-xs text-slate-400 block mb-1">Name</label>
                    <input
                      type="text"
                      value={asset.name}
                      onChange={(e) => updateAsset(asset.id, 'name', e.target.value)}
                      placeholder="e.g. HDFC Bank, Gold"
                      className="w-full bg-transparent text-white border-b border-slate-600 focus:border-emerald-400 outline-none pb-1"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="text-xs text-slate-400 block mb-1">Type</label>
                    <select
                      value={asset.type}
                      onChange={(e) => updateAsset(asset.id, 'type', e.target.value as AssetType)}
                      className="w-full bg-slate-800/50 text-white rounded px-2 py-1 text-sm border border-slate-600 outline-none"
                    >
                      <option value="CASH">Cash / Savings</option>
                      <option value="MUTUAL_FUND">Mutual Fund (SIP)</option>
                      <option value="STOCK">Stocks</option>
                      <option value="GOLD">Gold (SGB/Physical)</option>
                      <option value="FD">FD / RD</option>
                      <option value="EPF_PPF">EPF / PPF / NPS</option>
                      <option value="REAL_ESTATE">Real Estate</option>
                      <option value="CRYPTO">Crypto</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-slate-400 block mb-1">Value (₹)</label>
                    <input
                      type="number"
                      value={asset.value}
                      onChange={(e) => updateAsset(asset.id, 'value', parseFloat(e.target.value) || 0)}
                      className="w-full bg-transparent text-white border-b border-slate-600 focus:border-emerald-400 outline-none pb-1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-slate-400 block mb-1">Growth %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={(asset.growthRate * 100).toFixed(1)}
                      onChange={(e) => updateAsset(asset.id, 'growthRate', (parseFloat(e.target.value) || 0) / 100)}
                      className="w-full bg-transparent text-white border-b border-slate-600 focus:border-emerald-400 outline-none pb-1"
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <button onClick={() => removeAsset(asset.id)} className="p-2 text-slate-500 hover:text-rose-400 transition-colors opacity-50 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={addAsset} className="w-full py-3 border border-dashed border-slate-600 rounded-xl text-slate-400 hover:text-white hover:border-emerald-400 hover:bg-emerald-400/5 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                <Plus className="w-4 h-4" /> Add Asset
              </button>
            </>
          )}

          {activeTab === 'liabilities' && (
            <>
              {data.liabilities.length === 0 && (
                <div className="text-center py-10">
                  <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <TrendingDown className="w-8 h-8 text-rose-500/50" />
                  </div>
                  <p className="text-slate-400 mb-1">No liabilities tracked</p>
                  <p className="text-slate-500 text-sm mb-4">Add loans or credit card balances to track your debts</p>
                </div>
              )}
              {data.liabilities.map(liab => (
                <div key={liab.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-white/5 p-4 rounded-xl border border-white/5 hover:border-white/20 hover:bg-white/[0.07] transition-all group">
                  <div className="sm:col-span-4">
                    <label className="text-xs text-slate-400 block mb-1">Name</label>
                    <input
                      type="text"
                      value={liab.name}
                      onChange={(e) => updateLiability(liab.id, 'name', e.target.value)}
                      placeholder="e.g. SBI Home Loan"
                      className="w-full bg-transparent text-white border-b border-slate-600 focus:border-rose-400 outline-none pb-1"
                    />
                  </div>
                  <div className="sm:col-span-3">
                    <label className="text-xs text-slate-400 block mb-1">Type</label>
                    <select
                      value={liab.type}
                      onChange={(e) => updateLiability(liab.id, 'type', e.target.value as LiabilityType)}
                      className="w-full bg-slate-800/50 text-white rounded px-2 py-1 text-sm border border-slate-600 outline-none"
                    >
                      <option value="HOME_LOAN">Home Loan</option>
                      <option value="CAR_LOAN">Car Loan</option>
                      <option value="EDUCATION_LOAN">Education Loan</option>
                      <option value="PERSONAL_LOAN">Personal Loan</option>
                      <option value="CREDIT_CARD">Credit Card</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-slate-400 block mb-1">Balance (₹)</label>
                    <input
                      type="number"
                      value={liab.value}
                      onChange={(e) => updateLiability(liab.id, 'value', parseFloat(e.target.value) || 0)}
                      className="w-full bg-transparent text-white border-b border-slate-600 focus:border-rose-400 outline-none pb-1"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-slate-400 block mb-1">Interest %</label>
                    <input
                      type="number"
                      step="0.1"
                      value={(liab.interestRate * 100).toFixed(1)}
                      onChange={(e) => updateLiability(liab.id, 'interestRate', (parseFloat(e.target.value) || 0) / 100)}
                      className="w-full bg-transparent text-white border-b border-slate-600 focus:border-rose-400 outline-none pb-1"
                    />
                  </div>
                  <div className="sm:col-span-1 flex justify-end">
                    <button onClick={() => removeLiability(liab.id)} className="p-2 text-slate-500 hover:text-rose-400 transition-colors opacity-50 group-hover:opacity-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              <button onClick={addLiability} className="w-full py-3 border border-dashed border-slate-600 rounded-xl text-slate-400 hover:text-white hover:border-rose-400 hover:bg-rose-400/5 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                <Plus className="w-4 h-4" /> Add Liability
              </button>
            </>
          )}
        </div>

        {/* Monthly Contribution Input */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
            <div>
              <h4 className="text-white font-medium">Monthly Surplus / SIP Investment</h4>
              <p className="text-blue-200/70 text-sm">How much do you save or invest (SIP/PPF) each month?</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-300 font-bold">₹</span>
              <input
                type="number"
                value={data.monthlyContribution}
                onChange={(e) => onUpdate({ monthlyContribution: parseFloat(e.target.value) || 0 })}
                className="bg-slate-900/50 text-white px-3 py-2 rounded-lg border border-blue-500/30 w-32 focus:border-blue-400 outline-none"
              />
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};