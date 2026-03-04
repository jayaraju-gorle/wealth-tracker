import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, PieChart as PieChartIcon, Search, RefreshCw, Loader2, Zap } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { AppState, Asset, Liability, AssetType, LiabilityType } from '../types';
import { GlassCard } from './ui/GlassCard';
import { formatCurrency } from '../utils';
import { searchMutualFunds, getLatestNAV, MFSearchResult } from '../services/mfapi';

interface Props {
  data: AppState;
  onUpdate: (updates: Partial<AppState>) => void;
}

const ASSET_COLORS: Record<string, string> = {
  CASH: '#10b981', MUTUAL_FUND: '#6366f1', STOCK: '#f59e0b', REAL_ESTATE: '#ec4899',
  GOLD: '#eab308', FD: '#06b6d4', EPF_PPF: '#8b5cf6', CRYPTO: '#f97316', OTHER: '#64748b',
};

const ASSET_LABELS: Record<string, string> = {
  CASH: 'Cash', MUTUAL_FUND: 'Mutual Funds', STOCK: 'Stocks', REAL_ESTATE: 'Real Estate',
  GOLD: 'Gold', FD: 'FD/RD', EPF_PPF: 'EPF/PPF/NPS', CRYPTO: 'Crypto', OTHER: 'Other',
};

// Types that support smart pricing
const SMART_TYPES: AssetType[] = ['MUTUAL_FUND', 'STOCK', 'GOLD'];

// ─── Modern Input Styles ──────────────────────────────────────────────
const INPUT_CLASS = 'w-full bg-white/[0.03] text-white rounded-lg px-3 py-2.5 text-sm border border-white/[0.08] focus:border-emerald-400/40 focus:ring-1 focus:ring-emerald-400/20 outline-none transition-all placeholder:text-slate-600';
const INPUT_CLASS_ROSE = 'w-full bg-white/[0.03] text-white rounded-lg px-3 py-2.5 text-sm border border-white/[0.08] focus:border-rose-400/40 focus:ring-1 focus:ring-rose-400/20 outline-none transition-all placeholder:text-slate-600';
const SELECT_CLASS = 'w-full bg-slate-800/60 text-white rounded-lg px-3 py-2.5 text-sm border border-white/[0.08] focus:border-emerald-400/40 outline-none transition-all cursor-pointer';
const SELECT_CLASS_ROSE = 'w-full bg-slate-800/60 text-white rounded-lg px-3 py-2.5 text-sm border border-white/[0.08] focus:border-rose-400/40 outline-none transition-all cursor-pointer';
const LABEL_CLASS = 'text-[11px] text-slate-400 font-medium block mb-1.5';
const OPTION_STYLE = { backgroundColor: '#1e293b', color: '#e2e8f0' };

// ─── Indian Comma Formatting ─────────────────────────────────────────
const formatIndian = (n: number): string => n ? n.toLocaleString('en-IN') : '';
const parseIndian = (s: string): number => parseFloat(s.replace(/,/g, '')) || 0;

// ─── MF Search Dropdown ──────────────────────────────────────────────
const MFSearchInput: React.FC<{
  asset: Asset;
  onSelect: (result: MFSearchResult) => void;
}> = ({ asset, onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MFSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const doSearch = useCallback((q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    searchMutualFunds(q).then(r => {
      setResults(r);
      setLoading(false);
      setOpen(true);
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 400);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-2">
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={asset.schemeCode ? asset.name : 'Search mutual fund...'}
          className={`${INPUT_CLASS} pl-8 pr-8`}
        />
        {loading && <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin absolute right-2 top-1/2 -translate-y-1/2" />}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 max-h-48 overflow-y-auto bg-slate-800 border border-slate-600 rounded-lg shadow-2xl">
          {results.map(r => (
            <button
              key={r.schemeCode}
              onClick={() => { onSelect(r); setOpen(false); setQuery(''); }}
              className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-indigo-500/20 hover:text-white transition-colors border-b border-slate-700/50 last:border-b-0"
            >
              <span className="block truncate">{r.schemeName}</span>
              <span className="text-[10px] text-slate-500">Code: {r.schemeCode}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── NAV Refresh Button ──────────────────────────────────────────────
const NavRefreshButton: React.FC<{ schemeCode: number; onRefresh: (nav: number) => void }> = ({ schemeCode, onRefresh }) => {
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    const data = await getLatestNAV(schemeCode);
    if (data) onRefresh(data.nav);
    setLoading(false);
  };

  return (
    <button onClick={handleRefresh} disabled={loading} className="p-1 text-indigo-400 hover:text-indigo-300 transition-colors" title="Refresh NAV">
      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
    </button>
  );
};

// ─── Smart Value Display ─────────────────────────────────────────────
const SmartValueBadge: React.FC<{ asset: Asset }> = ({ asset }) => {
  if (asset.valuationMode !== 'smart') return null;

  if (asset.type === 'MUTUAL_FUND' && asset.navPerUnit && asset.units) {
    return (
      <div className="text-[10px] text-indigo-300/80 flex items-center gap-1 mt-0.5">
        <Zap className="w-2.5 h-2.5" />
        {asset.units.toFixed(3)} units × ₹{asset.navPerUnit.toFixed(2)} NAV
      </div>
    );
  }
  if ((asset.type === 'STOCK' || asset.type === 'GOLD') && asset.quantity && asset.pricePerUnit) {
    const unit = asset.type === 'GOLD' ? 'g' : 'qty';
    return (
      <div className="text-[10px] text-amber-300/80 flex items-center gap-1 mt-0.5">
        <Zap className="w-2.5 h-2.5" />
        {asset.quantity}{unit} × ₹{asset.pricePerUnit.toLocaleString('en-IN')}
      </div>
    );
  }
  return null;
};

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export const AssetsLiabilities: React.FC<Props> = ({ data, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'assets' | 'liabilities'>('assets');

  const addAsset = () => {
    const newAsset: Asset = {
      id: crypto.randomUUID(),
      name: 'New Asset',
      value: 0,
      type: 'CASH',
      growthRate: 0.06,
      valuationMode: 'manual',
    };
    onUpdate({ assets: [...data.assets, newAsset] });
  };

  const addLiability = () => {
    const newLiab: Liability = { id: crypto.randomUUID(), name: 'New Liability', value: 0, type: 'PERSONAL_LOAN', interestRate: 0.10 };
    onUpdate({ liabilities: [...data.liabilities, newLiab] });
  };

  const removeAsset = (id: string) => onUpdate({ assets: data.assets.filter(a => a.id !== id) });
  const removeLiability = (id: string) => onUpdate({ liabilities: data.liabilities.filter(l => l.id !== id) });

  const updateAsset = (id: string, updates: Partial<Asset>) => {
    onUpdate({
      assets: data.assets.map(a => {
        if (a.id !== id) return a;
        const merged = { ...a, ...updates };

        // Strip any undefined values (Firebase can't handle them)
        const updated: Asset = {} as any;
        for (const [k, v] of Object.entries(merged)) {
          if (v !== undefined) (updated as any)[k] = v;
        }

        // Auto-compute value for smart mode
        if (updated.valuationMode === 'smart') {
          if (updated.type === 'MUTUAL_FUND' && updated.units && updated.navPerUnit) {
            updated.value = Math.round(updated.units * updated.navPerUnit);
          } else if ((updated.type === 'STOCK' || updated.type === 'GOLD') && updated.quantity && updated.pricePerUnit) {
            updated.value = Math.round(updated.quantity * updated.pricePerUnit);
          }
        }

        return updated;
      })
    });
  };

  const updateLiability = (id: string, field: keyof Liability, value: any) => {
    onUpdate({ liabilities: data.liabilities.map(l => l.id === id ? { ...l, [field]: value } : l) });
  };

  // Handle MF scheme selection
  const handleMFSelect = async (assetId: string, result: MFSearchResult) => {
    // Fetch latest NAV
    const navData = await getLatestNAV(result.schemeCode);
    const nav = navData?.nav || 0;

    updateAsset(assetId, {
      name: result.schemeName,
      schemeCode: result.schemeCode,
      navPerUnit: nav,
      valuationMode: 'smart',
    });
  };

  // Handle NAV refresh
  const handleNavRefresh = (assetId: string, nav: number) => {
    updateAsset(assetId, { navPerUnit: nav });
  };

  const totalAssets = data.assets.reduce((sum, a) => sum + a.value, 0);
  const totalLiabilities = data.liabilities.reduce((sum, l) => sum + l.value, 0);
  const netWorth = totalAssets - totalLiabilities;

  // Pie chart data
  const pieData = useMemo(() => {
    const grouped: Record<string, number> = {};
    data.assets.forEach(a => { grouped[a.type] = (grouped[a.type] || 0) + a.value; });
    return Object.entries(grouped)
      .filter(([, v]) => v > 0)
      .map(([type, value]) => ({ name: ASSET_LABELS[type] || type, value, color: ASSET_COLORS[type] || '#64748b' }))
      .sort((a, b) => b.value - a.value);
  }, [data.assets]);

  // ─── Render smart input fields based on asset type ─────────────────
  const renderSmartFields = (asset: Asset) => {
    const isSmart = asset.valuationMode === 'smart';
    const canBeSmart = SMART_TYPES.includes(asset.type);

    return (
      <>
        {/* Valuation mode toggle */}
        {canBeSmart && (
          <div className="sm:col-span-12 flex items-center gap-3 mt-1">
            <button
              onClick={() => updateAsset(asset.id, { valuationMode: isSmart ? 'manual' : 'smart' })}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${isSmart
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                : 'bg-white/5 text-slate-500 border-white/10 hover:text-slate-300'
                }`}
            >
              {isSmart ? '⚡ Smart Pricing' : '✏️ Manual Value'}
            </button>
          </div>
        )}

        {/* MF: Search + Units + SIP */}
        {isSmart && asset.type === 'MUTUAL_FUND' && (
          <div className="sm:col-span-12">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mt-2">
              <div className="sm:col-span-6">
                <label className={LABEL_CLASS}>Search & Link Fund</label>
                <MFSearchInput asset={asset} onSelect={(r) => handleMFSelect(asset.id, r)} />
                {asset.schemeCode && (
                  <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                    <span>Code: {asset.schemeCode}</span>
                    {asset.navPerUnit && (
                      <>
                        <span>·</span>
                        <span>NAV: ₹{asset.navPerUnit.toFixed(2)}</span>
                        <NavRefreshButton schemeCode={asset.schemeCode} onRefresh={(nav) => handleNavRefresh(asset.id, nav)} />
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="sm:col-span-3">
                <label className={LABEL_CLASS}>Units Held</label>
                <input
                  type="number"
                  step="0.001"
                  value={asset.units || ''}
                  onChange={(e) => updateAsset(asset.id, { units: parseFloat(e.target.value) || 0 })}
                  placeholder="e.g. 245.678"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="sm:col-span-3">
                <label className={LABEL_CLASS}>Computed Value</label>
                <div className="text-emerald-400 font-bold font-mono pb-1">
                  {formatCurrency(asset.value)}
                </div>
              </div>
            </div>

            {/* SIP Tracking */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 mt-3 pt-3 border-t border-white/5">
              <div className="sm:col-span-4">
                <label className={LABEL_CLASS}>Monthly SIP (₹)</label>
                <input
                  type="text" inputMode="decimal"
                  value={formatIndian(asset.sipAmount || 0)}
                  onChange={(e) => updateAsset(asset.id, { sipAmount: parseIndian(e.target.value) })}
                  placeholder="e.g. 5,000"
                  className={INPUT_CLASS}
                />
              </div>
              <div className="sm:col-span-2">
                <label className={LABEL_CLASS}>SIP Day</label>
                <select
                  value={asset.sipDay || 5}
                  onChange={(e) => updateAsset(asset.id, { sipDay: parseInt(e.target.value) })}
                  className={SELECT_CLASS}
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                    <option key={d} value={d} style={OPTION_STYLE}>{d}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-6">
                {(() => {
                  if (!asset.sipAmount || asset.sipAmount <= 0 || !asset.navPerUnit) return null;

                  const today = new Date();
                  const sipDay = asset.sipDay || 5;
                  const lastLog = asset.lastSipLogDate ? new Date(asset.lastSipLogDate) : null;
                  const currentMonthSipDate = new Date(today.getFullYear(), today.getMonth(), sipDay);

                  // Check if SIP is due: past sipDay this month AND not logged this month
                  const isPastSipDay = today >= currentMonthSipDate;
                  const isLoggedThisMonth = lastLog &&
                    lastLog.getFullYear() === today.getFullYear() &&
                    lastLog.getMonth() === today.getMonth();

                  const sipDue = isPastSipDay && !isLoggedThisMonth;
                  const newUnits = asset.sipAmount / asset.navPerUnit;

                  if (isLoggedThisMonth) {
                    return (
                      <div className="text-xs text-emerald-400/70 flex items-center gap-1 pt-5">
                        ✅ SIP logged: {lastLog!.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        {' · '}+{((asset.sipAmount || 0) / (asset.navPerUnit || 1)).toFixed(3)} units
                      </div>
                    );
                  }

                  if (sipDue) {
                    return (
                      <div className="bg-violet-500/10 border border-violet-500/20 rounded-lg p-2.5 mt-1">
                        <div className="text-xs text-violet-200 mb-2">
                          📅 SIP Due: ₹{asset.sipAmount.toLocaleString('en-IN')} → <span className="text-white font-bold">+{newUnits.toFixed(3)} units</span> at NAV ₹{asset.navPerUnit.toFixed(2)}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const updatedUnits = (asset.units || 0) + newUnits;
                              updateAsset(asset.id, {
                                units: parseFloat(updatedUnits.toFixed(3)),
                                lastSipLogDate: new Date().toISOString().slice(0, 10),
                              });
                            }}
                            className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs rounded-lg hover:bg-emerald-500/30 transition-colors font-medium"
                          >
                            ✅ Log SIP
                          </button>
                          <button
                            onClick={() => {
                              updateAsset(asset.id, {
                                lastSipLogDate: new Date().toISOString().slice(0, 10),
                              });
                            }}
                            className="px-3 py-1 bg-white/5 text-slate-400 text-xs rounded-lg hover:bg-white/10 transition-colors"
                          >
                            ❌ Skip
                          </button>
                        </div>
                      </div>
                    );
                  }

                  // SIP day not reached yet this month
                  const daysUntil = Math.ceil((currentMonthSipDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  if (daysUntil > 0) {
                    return (
                      <div className="text-xs text-slate-500 flex items-center gap-1 pt-5">
                        ⏳ Next SIP in {daysUntil} day{daysUntil > 1 ? 's' : ''} (₹{asset.sipAmount.toLocaleString('en-IN')})
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            </div>
          </div>
        )}

        {/* Stock: Quantity + Price */}
        {isSmart && asset.type === 'STOCK' && (
          <div className="sm:col-span-12 grid grid-cols-1 sm:grid-cols-12 gap-4 mt-2">
            <div className="sm:col-span-4">
              <label className={LABEL_CLASS}>Quantity</label>
              <input
                type="number"
                value={asset.quantity || ''}
                onChange={(e) => updateAsset(asset.id, { quantity: parseFloat(e.target.value) || 0 })}
                placeholder="e.g. 50"
                className={INPUT_CLASS}
              />
            </div>
            <div className="sm:col-span-4">
              <label className={LABEL_CLASS}>Price per Share (₹)</label>
              <input
                type="text" inputMode="decimal"
                value={formatIndian(asset.pricePerUnit || 0)}
                onChange={(e) => updateAsset(asset.id, { pricePerUnit: parseIndian(e.target.value) })}
                placeholder="e.g. 2,450"
                className={INPUT_CLASS}
              />
            </div>
            <div className="sm:col-span-4">
              <label className="text-xs text-slate-400 block mb-1">Computed Value</label>
              <div className="text-emerald-400 font-bold font-mono pb-1">
                {formatCurrency(asset.value)}
              </div>
            </div>
          </div>
        )}

        {/* Gold: Grams + Price per gram */}
        {isSmart && asset.type === 'GOLD' && (
          <div className="sm:col-span-12 grid grid-cols-1 sm:grid-cols-12 gap-4 mt-2">
            <div className="sm:col-span-4">
              <label className={LABEL_CLASS}>Weight (grams)</label>
              <input
                type="number"
                step="0.01"
                value={asset.quantity || ''}
                onChange={(e) => updateAsset(asset.id, { quantity: parseFloat(e.target.value) || 0 })}
                placeholder="e.g. 10"
                className={INPUT_CLASS}
              />
            </div>
            <div className="sm:col-span-4">
              <label className={LABEL_CLASS}>₹ per gram (market rate)</label>
              <input
                type="text" inputMode="decimal"
                value={formatIndian(asset.pricePerUnit || 0)}
                onChange={(e) => updateAsset(asset.id, { pricePerUnit: parseIndian(e.target.value) })}
                placeholder="e.g. 7,500"
                className={INPUT_CLASS}
              />
            </div>
            <div className="sm:col-span-4">
              <label className="text-xs text-slate-400 block mb-1">Computed Value</label>
              <div className="text-emerald-400 font-bold font-mono pb-1">
                {formatCurrency(asset.value)}
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard className="bg-emerald-500/10 border-emerald-500/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-500/20 rounded-lg"><TrendingUp className="w-5 h-5 text-emerald-400" /></div>
            <span className="text-emerald-200 text-sm font-medium">Total Assets</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatCurrency(totalAssets)}</div>
        </GlassCard>
        <GlassCard className="bg-rose-500/10 border-rose-500/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-500/20 rounded-lg"><TrendingDown className="w-5 h-5 text-rose-400" /></div>
            <span className="text-rose-200 text-sm font-medium">Total Liabilities</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatCurrency(totalLiabilities)}</div>
        </GlassCard>
        <GlassCard className="bg-blue-500/10 border-blue-500/20">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500/20 rounded-lg"><div className="font-bold text-blue-400 px-1">₹</div></div>
            <span className="text-blue-200 text-sm font-medium">Net Worth</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatCurrency(netWorth)}</div>
        </GlassCard>
      </div>

      {/* Pie Chart */}
      {pieData.length > 0 && (
        <GlassCard title="Asset Allocation" action={
          <div className="flex items-center gap-1 text-xs text-slate-400"><PieChartIcon className="w-3 h-3" /> By category</div>
        }>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" stroke="none">
                    {pieData.map((entry, i) => <Cell key={`cell-${i}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', borderColor: '#334155', borderRadius: '8px', color: '#fff' }} formatter={(val: number) => [formatCurrency(val), 'Value']} />
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
                    <span className="text-slate-500 text-xs w-10 text-right">{totalAssets > 0 ? ((item.value / totalAssets) * 100).toFixed(0) : 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      )}

      <GlassCard title="Portfolio Manager">
        <div className="flex gap-4 mb-6 border-b border-white/10 pb-1">
          <button onClick={() => setActiveTab('assets')} className={`pb-3 px-2 text-sm font-medium transition-colors ${activeTab === 'assets' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-white'}`}>
            Assets ({data.assets.length})
          </button>
          <button onClick={() => setActiveTab('liabilities')} className={`pb-3 px-2 text-sm font-medium transition-colors ${activeTab === 'liabilities' ? 'text-rose-400 border-b-2 border-rose-400' : 'text-slate-400 hover:text-white'}`}>
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
                <div key={asset.id} className="bg-white/[0.03] p-5 rounded-2xl border border-white/[0.06] hover:border-white/15 hover:bg-white/[0.05] transition-all group" style={{ borderLeft: `3px solid ${ASSET_COLORS[asset.type] || '#64748b'}40` }}>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                    <div className="sm:col-span-4">
                      <label className={LABEL_CLASS}>Name</label>
                      <input
                        type="text" value={asset.name}
                        onChange={(e) => updateAsset(asset.id, { name: e.target.value })}
                        placeholder="e.g. HDFC Bank, Gold"
                        className={INPUT_CLASS}
                      />
                      <SmartValueBadge asset={asset} />
                    </div>
                    <div className="sm:col-span-3">
                      <label className={LABEL_CLASS}>Type</label>
                      <select
                        value={asset.type}
                        onChange={(e) => {
                          const newType = e.target.value as AssetType;
                          if (newType !== asset.type) {
                            // Build a clean reset: only include fields we want to keep
                            const cleanAsset: Asset = {
                              id: asset.id,
                              name: asset.name,
                              value: asset.value,
                              type: newType,
                              growthRate: asset.growthRate,
                              valuationMode: 'manual',
                            };
                            onUpdate({
                              assets: data.assets.map(a => a.id === asset.id ? cleanAsset : a)
                            });
                          }
                        }}
                        className={SELECT_CLASS}
                      >
                        <option style={OPTION_STYLE} value="CASH">Cash / Savings</option>
                        <option style={OPTION_STYLE} value="MUTUAL_FUND">Mutual Fund</option>
                        <option style={OPTION_STYLE} value="STOCK">Stocks</option>
                        <option style={OPTION_STYLE} value="GOLD">Gold (SGB/Physical)</option>
                        <option style={OPTION_STYLE} value="FD">FD / RD</option>
                        <option style={OPTION_STYLE} value="EPF_PPF">EPF / PPF / NPS</option>
                        <option style={OPTION_STYLE} value="REAL_ESTATE">Real Estate</option>
                        <option style={OPTION_STYLE} value="CRYPTO">Crypto</option>
                        <option style={OPTION_STYLE} value="OTHER">Other</option>
                      </select>
                    </div>
                    {/* Show manual value input only when NOT in smart mode */}
                    {asset.valuationMode !== 'smart' && (
                      <div className="sm:col-span-2">
                        <label className={LABEL_CLASS}>Value (₹)</label>
                        <input
                          type="text" inputMode="decimal" value={formatIndian(asset.value)}
                          onChange={(e) => updateAsset(asset.id, { value: parseIndian(e.target.value) })}
                          className={INPUT_CLASS}
                        />
                      </div>
                    )}
                    {asset.valuationMode === 'smart' && (
                      <div className="sm:col-span-2">
                        <label className={LABEL_CLASS}>Value (₹)</label>
                        <div className="text-emerald-400 font-bold font-mono pb-1 text-sm">{formatCurrency(asset.value)}</div>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLASS}>Growth %</label>
                      <input
                        type="number" step="0.1"
                        value={(asset.growthRate * 100).toFixed(1)}
                        onChange={(e) => updateAsset(asset.id, { growthRate: (parseFloat(e.target.value) || 0) / 100 })}
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end items-end">
                      <button onClick={() => removeAsset(asset.id)} className="p-2 text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {/* Smart fields row */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                    {renderSmartFields(asset)}
                  </div>
                </div>
              ))}
              <button onClick={addAsset} className="w-full py-3.5 border-2 border-dashed border-white/10 rounded-2xl text-slate-500 hover:text-emerald-300 hover:border-emerald-400/30 hover:bg-emerald-400/5 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
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
                  <p className="text-slate-500 text-sm mb-4">Add loans or credit card balances</p>
                </div>
              )}
              {data.liabilities.map(liab => (
                <div key={liab.id} className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-white/[0.03] p-5 rounded-2xl border border-white/[0.06] hover:border-white/15 hover:bg-white/[0.05] transition-all group" style={{ borderLeft: '3px solid rgba(244,63,94,0.3)' }}>
                  <div className="sm:col-span-4">
                    <label className={LABEL_CLASS}>Name</label>
                    <input type="text" value={liab.name} onChange={(e) => updateLiability(liab.id, 'name', e.target.value)} placeholder="e.g. SBI Home Loan" className={INPUT_CLASS_ROSE} />
                  </div>
                  <div className="sm:col-span-3">
                    <label className={LABEL_CLASS}>Type</label>
                    <select value={liab.type} onChange={(e) => updateLiability(liab.id, 'type', e.target.value as LiabilityType)} className={SELECT_CLASS_ROSE}>
                      <option style={OPTION_STYLE} value="HOME_LOAN">Home Loan</option>
                      <option style={OPTION_STYLE} value="CAR_LOAN">Car Loan</option>
                      <option style={OPTION_STYLE} value="EDUCATION_LOAN">Education Loan</option>
                      <option style={OPTION_STYLE} value="PERSONAL_LOAN">Personal Loan</option>
                      <option style={OPTION_STYLE} value="CREDIT_CARD">Credit Card</option>
                      <option style={OPTION_STYLE} value="OTHER">Other</option>
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className={LABEL_CLASS}>Balance (₹)</label>
                    <input type="text" inputMode="decimal" value={formatIndian(liab.value)} onChange={(e) => updateLiability(liab.id, 'value', parseIndian(e.target.value))} className={INPUT_CLASS_ROSE} />
                  </div>
                  <div className="sm:col-span-2">
                    <label className={LABEL_CLASS}>Interest %</label>
                    <input type="number" step="0.1" value={(liab.interestRate * 100).toFixed(1)} onChange={(e) => updateLiability(liab.id, 'interestRate', (parseFloat(e.target.value) || 0) / 100)} className={INPUT_CLASS_ROSE} />
                  </div>
                  <div className="sm:col-span-1 flex justify-end items-end">
                    <button onClick={() => removeLiability(liab.id)} className="p-2 text-slate-600 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
              <button onClick={addLiability} className="w-full py-3.5 border-2 border-dashed border-white/10 rounded-2xl text-slate-500 hover:text-rose-300 hover:border-rose-400/30 hover:bg-rose-400/5 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                <Plus className="w-4 h-4" /> Add Liability
              </button>
            </>
          )}
        </div>

        {/* Monthly Contribution */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
            <div>
              <h4 className="text-white font-medium">Monthly Surplus / SIP Investment</h4>
              <p className="text-blue-200/70 text-sm">How much do you save or invest each month?</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-300 font-bold">₹</span>
              <input type="text" inputMode="decimal" value={formatIndian(data.monthlyContribution)} onChange={(e) => onUpdate({ monthlyContribution: parseIndian(e.target.value) })} className="bg-white/[0.06] text-white px-3 py-2 rounded-lg border border-blue-500/20 w-36 focus:border-blue-400 outline-none transition-all text-right" />
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
};