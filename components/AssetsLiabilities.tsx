import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, TrendingUp, TrendingDown, PieChart as PieChartIcon, Search, RefreshCw, Loader2, Zap, ExternalLink, Eye, EyeOff, FileText, ChevronDown } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { AppState, Asset, Liability, AssetType, LiabilityType, Attachment, LIQUID_ASSET_TYPES } from '../types';
import { GlassCard } from './ui/GlassCard';
import { formatCurrency } from '../utils';
import { searchMutualFunds, getLatestNAV, MFSearchResult } from '../services/mfapi';
import { useLanguage } from '../i18n/LanguageContext';

interface Props {
  data: AppState;
  onUpdate: (updates: Partial<AppState>) => void;
}

const ASSET_COLORS: Record<string, string> = {
  CASH: '#10b981', SAVINGS_ACCOUNT: '#34d399', MUTUAL_FUND: '#6366f1', STOCK: '#f59e0b',
  REAL_ESTATE: '#ec4899', GOLD: '#eab308', SILVER: '#9ca3af', FD: '#06b6d4', EPF_PPF: '#8b5cf6', NPS: '#a78bfa',
  INSURANCE: '#f472b6', BONDS: '#2dd4bf', CRYPTO: '#f97316', VEHICLE: '#94a3b8', ESOPS: '#c084fc', LENDING: '#fb7185', OTHER: '#64748b',
};

const ASSET_LABELS: Record<string, string> = {
  CASH: 'Cash', SAVINGS_ACCOUNT: 'Savings A/C', MUTUAL_FUND: 'Mutual Funds', STOCK: 'Stocks',
  REAL_ESTATE: 'Real Estate', GOLD: 'Gold', SILVER: 'Silver', FD: 'FD/RD', EPF_PPF: 'EPF/PPF', NPS: 'NPS',
  INSURANCE: 'Insurance', BONDS: 'Bonds', CRYPTO: 'Crypto', VEHICLE: 'Vehicle', ESOPS: 'ESOPs', LENDING: 'Lending', OTHER: 'Other',
};

const ASSET_ICONS: Record<string, string> = {
  CASH: '💵', SAVINGS_ACCOUNT: '🏦', MUTUAL_FUND: '📊', STOCK: '📈', REAL_ESTATE: '🏠',
  GOLD: '🪙', SILVER: '🪨', FD: '🔒', EPF_PPF: '🏛️', NPS: '🎯', INSURANCE: '🛡️',
  BONDS: '📜', CRYPTO: '₿', VEHICLE: '🚗', ESOPS: '💼', LENDING: '🤝', OTHER: '📦',
};

const LIABILITY_ICONS: Record<string, string> = {
  HOME_LOAN: '🏠', MORTGAGE: '🏗️', CAR_LOAN: '🚗', VEHICLE_LOAN: '🏍️',
  EDUCATION_LOAN: '🎓', PERSONAL_LOAN: '👤', BUSINESS_LOAN: '💼',
  GOLD_LOAN: '🪙', CREDIT_CARD: '💳', OTHER: '📋',
};

// Types that support smart pricing
const SMART_TYPES: AssetType[] = ['MUTUAL_FUND', 'STOCK', 'GOLD', 'SILVER'];

// ─── Modern Input Styles ──────────────────────────────────────────────
const INPUT_CLASS = 'w-full bg-white/[0.03] text-white rounded-lg px-3 py-2.5 text-sm border border-white/[0.08] focus:border-emerald-400/40 focus:ring-1 focus:ring-emerald-400/20 outline-none transition-all placeholder:text-slate-500';
const INPUT_CLASS_ROSE = 'w-full bg-white/[0.03] text-white rounded-lg px-3 py-2.5 text-sm border border-white/[0.08] focus:border-rose-400/40 focus:ring-1 focus:ring-rose-400/20 outline-none transition-all placeholder:text-slate-500';
const SELECT_CLASS = 'w-full bg-slate-800/60 text-white rounded-lg px-3 py-2.5 text-sm border border-white/[0.08] focus:border-emerald-400/40 outline-none transition-all cursor-pointer appearance-none';
const SELECT_CLASS_ROSE = 'w-full bg-slate-800/60 text-white rounded-lg px-3 py-2.5 text-sm border border-white/[0.08] focus:border-rose-400/40 outline-none transition-all cursor-pointer appearance-none';
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
  if ((asset.type === 'STOCK' || asset.type === 'GOLD' || asset.type === 'SILVER') && asset.quantity && asset.pricePerUnit) {
    const unit = (asset.type === 'GOLD' || asset.type === 'SILVER') ? 'g' : 'qty';
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
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'assets' | 'liabilities'>('assets');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [showPasswords, setShowPasswords] = useState<Set<string>>(new Set());
  const [savedField, setSavedField] = useState<string | null>(null);

  // Brief "saved" flash for notes/fields
  const flashSaved = (fieldId: string) => {
    setSavedField(fieldId);
    setTimeout(() => setSavedField(null), 1500);
  };

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const togglePassword = (id: string) => {
    setShowPasswords(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

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
          } else if ((updated.type === 'STOCK' || updated.type === 'GOLD' || updated.type === 'SILVER') && updated.quantity && updated.pricePerUnit) {
            updated.value = Math.round(updated.quantity * updated.pricePerUnit);
          }
        }

        return updated;
      })
    });
    flashSaved(`card-${id}`);
  };

  const updateLiability = (id: string, field: keyof Liability, value: any) => {
    onUpdate({ liabilities: data.liabilities.map(l => l.id === id ? { ...l, [field]: value } : l) });
    flashSaved(`card-${id}`);
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
        {isSmart && (asset.type === 'GOLD' || asset.type === 'SILVER') && (
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
            <span className="text-blue-200 text-sm font-medium">{t('net_worth')}</span>
          </div>
          <div className="text-2xl font-bold text-white">{formatCurrency(netWorth)}</div>
        </GlassCard>
      </div>

      {/* Pie Chart */}
      {pieData.length > 0 && (
        <GlassCard title={t('asset_allocation')} action={
          <div className="flex items-center gap-1 text-xs text-slate-400"><PieChartIcon className="w-3 h-3" /> {t('by_category')}</div>
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

      <GlassCard title={t('portfolio_manager')}>
        <div className="flex gap-4 mb-6 border-b border-white/10 pb-1">
          <button onClick={() => setActiveTab('assets')} className={`pb-3 px-2 text-sm font-medium transition-colors ${activeTab === 'assets' ? 'text-emerald-400 border-b-2 border-emerald-400' : 'text-slate-400 hover:text-white'}`}>
            {t('assets_tab')} ({data.assets.length})
          </button>
          <button onClick={() => setActiveTab('liabilities')} className={`pb-3 px-2 text-sm font-medium transition-colors ${activeTab === 'liabilities' ? 'text-rose-400 border-b-2 border-rose-400' : 'text-slate-400 hover:text-white'}`}>
            {t('liabilities_tab')} ({data.liabilities.length})
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
                  <p className="text-slate-400 mb-1">{t('no_assets_tracked')}</p>
                  <p className="text-slate-500 text-sm mb-4">{t('start_by_adding')}</p>
                </div>
              )}
              {data.assets.map(asset => (
                <div key={asset.id} className="bg-white/[0.03] p-5 rounded-2xl border border-white/[0.06] hover:border-white/15 hover:bg-white/[0.05] transition-all group relative" style={{ borderLeft: `3px solid ${ASSET_COLORS[asset.type] || '#64748b'}40` }}>
                  {savedField === `card-${asset.id}` && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded-full border border-emerald-500/20 animate-pulse z-10">✓ Saved</div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                    <div className="sm:col-span-4">
                      <label className={LABEL_CLASS}>{t('name')}</label>
                      <div className="flex items-center gap-2">
                        <span className="text-lg" title={ASSET_LABELS[asset.type]}>{ASSET_ICONS[asset.type] || '📦'}</span>
                        <input
                          type="text" value={asset.name}
                          onChange={(e) => updateAsset(asset.id, { name: e.target.value })}
                          placeholder="e.g. HDFC Bank, Gold"
                          className={INPUT_CLASS}
                        />
                      </div>
                      <SmartValueBadge asset={asset} />
                    </div>
                    <div className="sm:col-span-3">
                      <label className={LABEL_CLASS}>{t('type')}</label>
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
                        <optgroup label="💧 Liquid (counted for emergency fund)" style={OPTION_STYLE}>
                          <option style={OPTION_STYLE} value="CASH">💵 Cash</option>
                          <option style={OPTION_STYLE} value="SAVINGS_ACCOUNT">🏦 Savings A/C</option>
                          <option style={OPTION_STYLE} value="MUTUAL_FUND">📊 Mutual Fund</option>
                          <option style={OPTION_STYLE} value="STOCK">📈 Stocks</option>
                          <option style={OPTION_STYLE} value="FD">🔒 FD / RD</option>
                          <option style={OPTION_STYLE} value="BONDS">📜 Bonds / Debentures</option>
                          <option style={OPTION_STYLE} value="CRYPTO">₿ Crypto</option>
                        </optgroup>
                        <optgroup label="🔒 Non-Liquid" style={OPTION_STYLE}>
                          <option style={OPTION_STYLE} value="REAL_ESTATE">🏠 Real Estate</option>
                          <option style={OPTION_STYLE} value="GOLD">🪙 Gold (SGB/Physical)</option>
                          <option style={OPTION_STYLE} value="SILVER">🪨 Silver</option>
                          <option style={OPTION_STYLE} value="EPF_PPF">🏛️ EPF / PPF</option>
                          <option style={OPTION_STYLE} value="NPS">🎯 NPS</option>
                          <option style={OPTION_STYLE} value="INSURANCE">🛡️ Insurance / ULIP</option>
                          <option style={OPTION_STYLE} value="ESOPS">💼 ESOPs / RSUs</option>
                          <option style={OPTION_STYLE} value="LENDING">🤝 Lending / Given</option>
                          <option style={OPTION_STYLE} value="VEHICLE">🚗 Vehicle</option>
                          <option style={OPTION_STYLE} value="OTHER">📦 Other</option>
                        </optgroup>
                      </select>
                    </div>
                    {/* Show manual value input only when NOT in smart mode */}
                    {asset.valuationMode !== 'smart' && (
                      <div className="sm:col-span-2">
                        <label className={LABEL_CLASS}>{t('value')}</label>
                        <input
                          type="text" inputMode="decimal" value={formatIndian(asset.value)}
                          onChange={(e) => updateAsset(asset.id, { value: parseIndian(e.target.value) })}
                          className={INPUT_CLASS}
                        />
                      </div>
                    )}
                    {asset.valuationMode === 'smart' && (
                      <div className="sm:col-span-2">
                        <label className={LABEL_CLASS}>{t('value')}</label>
                        <div className="text-emerald-400 font-bold font-mono pb-1 text-sm">{formatCurrency(asset.value)}</div>
                      </div>
                    )}
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLASS}>{t('growth_pct')}</label>
                      <input
                        type="text" inputMode="decimal"
                        defaultValue={(asset.growthRate * 100).toFixed(1)}
                        key={`growth-${asset.id}-${asset.type}`}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value);
                          updateAsset(asset.id, { growthRate: (isNaN(val) ? 0 : val) / 100 });
                        }}
                        className={INPUT_CLASS}
                      />
                    </div>
                    <div className="sm:col-span-1 flex justify-end items-end gap-0.5">
                      <button onClick={() => toggleExpand(asset.id)} title="Tracking details" className={`p-2 rounded-lg transition-all ${expandedCards.has(asset.id) ? 'text-indigo-400 bg-indigo-400/10' : 'text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10'}`}>
                        <FileText className="w-4 h-4" />
                      </button>
                      <button onClick={() => removeAsset(asset.id)} title="Remove asset" className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  {/* Smart fields row */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                    {renderSmartFields(asset)}
                  </div>
                  {/* Tracking Details (collapsible) */}
                  {expandedCards.has(asset.id) && (
                    <div className="mt-3 pt-3 border-t border-white/5 animate-in slide-in-from-top-1">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] text-slate-500 font-medium">Tracking Details</span>
                        {savedField === `panel-${asset.id}` && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1 animate-pulse">✓ Auto-saved</span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                        <div className="sm:col-span-5">
                          <label className={LABEL_CLASS}>Portal URL</label>
                          <div className="flex gap-1.5">
                            <input
                              type="url"
                              value={asset.trackingUrl || ''}
                              onChange={(e) => updateAsset(asset.id, { trackingUrl: e.target.value })}
                              onBlur={() => flashSaved(`panel-${asset.id}`)}
                              placeholder="https://kuvera.in"
                              className={INPUT_CLASS}
                            />
                            {asset.trackingUrl && (
                              <a href={asset.trackingUrl} target="_blank" rel="noopener noreferrer" className="p-2.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all shrink-0">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="sm:col-span-3">
                          <label className={LABEL_CLASS}>Username</label>
                          <input
                            type="text"
                            value={asset.trackingUsername || ''}
                            onChange={(e) => updateAsset(asset.id, { trackingUsername: e.target.value })}
                            onBlur={() => flashSaved(`panel-${asset.id}`)}
                            placeholder="login ID or email"
                            className={INPUT_CLASS}
                          />
                        </div>
                        <div className="sm:col-span-4">
                          <label className={LABEL_CLASS}>Password</label>
                          <div className="flex gap-1.5">
                            <input
                              type={showPasswords.has(asset.id) ? 'text' : 'password'}
                              value={asset.trackingPassword || ''}
                              onChange={(e) => updateAsset(asset.id, { trackingPassword: e.target.value })}
                              onBlur={() => flashSaved(`panel-${asset.id}`)}
                              placeholder="••••••••"
                              className={INPUT_CLASS}
                            />
                            <button onClick={() => togglePassword(asset.id)} className="p-2.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all shrink-0">
                              {showPasswords.has(asset.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        {/* Context-Specific: Real Estate Location */}
                        {asset.type === 'REAL_ESTATE' && (
                          <div className="sm:col-span-12">
                            <label className={LABEL_CLASS}>📍 Location / Maps Link</label>
                            <div className="flex gap-1.5">
                              <input
                                type="text"
                                value={asset.location || ''}
                                onChange={(e) => updateAsset(asset.id, { location: e.target.value })}
                                onBlur={() => flashSaved(`panel-${asset.id}`)}
                                placeholder="Enter address or paste Google Maps link"
                                className={INPUT_CLASS}
                              />
                              {asset.location && (
                                <a
                                  href={asset.location.startsWith('http') ? asset.location : `https://maps.google.com/?q=${encodeURIComponent(asset.location)}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2.5 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-all shrink-0"
                                  title="Open in Maps"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </a>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="sm:col-span-12">
                          <label className={LABEL_CLASS}>{t('notes')}</label>
                          <textarea
                            value={asset.notes || ''}
                            onChange={(e) => updateAsset(asset.id, { notes: e.target.value })}
                            onBlur={() => flashSaved(`panel-${asset.id}`)}
                            placeholder={
                              asset.type === 'REAL_ESTATE' ? 'Property details, registration number, builder name, possession date...' :
                                asset.type === 'GOLD' || asset.type === 'SILVER' ? 'Purity (24K/22K), form (coins/bars/jewellery), purchase date, dealer...' :
                                  asset.type === 'FD' ? 'Maturity date, FD number, auto-renewal status, nominee...' :
                                    asset.type === 'INSURANCE' ? 'Policy number, premium amount, due date, sum assured, nominee...' :
                                      asset.type === 'VEHICLE' ? 'Registration number, model, purchase date, insurance expiry...' :
                                        asset.type === 'BONDS' ? 'Bond series, maturity date, coupon rate, ISIN...' :
                                          asset.type === 'EPF_PPF' || asset.type === 'NPS' ? 'UAN/PRAN number, employer, contribution amount...' :
                                            t('notes_placeholder_asset')
                            }
                            rows={2}
                            className={`${INPUT_CLASS} resize-none`}
                          />
                        </div>

                        {/* Attachments */}
                        <div className="sm:col-span-12">
                          <label className={LABEL_CLASS}>📎 Attachments</label>
                          {(asset.attachments || []).length > 0 && (
                            <div className="space-y-1.5 mb-2">
                              {(asset.attachments || []).map(att => (
                                <div key={att.id} className="flex items-center gap-2 bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/[0.06] group">
                                  <span className="text-xs">{att.type === 'image' ? '🖼️' : att.type === 'document' ? '📄' : '🔗'}</span>
                                  <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 truncate flex-1">{att.name}</a>
                                  <button onClick={() => updateAsset(asset.id, { attachments: (asset.attachments || []).filter(a => a.id !== att.id) })} className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all p-0.5" title="Remove">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              placeholder="Link name (e.g. Sale deed)"
                              id={`att-name-${asset.id}`}
                              className={`${INPUT_CLASS} text-xs`}
                            />
                            <input
                              type="url"
                              placeholder="Paste URL (Drive, OneDrive...)"
                              id={`att-url-${asset.id}`}
                              className={`${INPUT_CLASS} text-xs flex-1`}
                            />
                            <button
                              onClick={() => {
                                const nameEl = document.getElementById(`att-name-${asset.id}`) as HTMLInputElement;
                                const urlEl = document.getElementById(`att-url-${asset.id}`) as HTMLInputElement;
                                if (nameEl?.value && urlEl?.value) {
                                  const newAtt: Attachment = {
                                    id: crypto.randomUUID(),
                                    name: nameEl.value,
                                    url: urlEl.value,
                                    type: urlEl.value.match(/\.(jpg|jpeg|png|gif|webp|svg)/i) ? 'image' : urlEl.value.match(/\.(pdf|doc|docx|xls|xlsx)/i) ? 'document' : 'link',
                                  };
                                  updateAsset(asset.id, { attachments: [...(asset.attachments || []), newAtt] });
                                  nameEl.value = '';
                                  urlEl.value = '';
                                }
                              }}
                              className="px-3 py-2 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded-lg text-xs font-medium transition-all shrink-0"
                            >
                              + Add
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={addAsset} className="w-full py-3.5 border-2 border-dashed border-white/10 rounded-2xl text-slate-500 hover:text-emerald-300 hover:border-emerald-400/30 hover:bg-emerald-400/5 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                <Plus className="w-4 h-4" /> {t('add_asset')}
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
                  <p className="text-slate-400 mb-1">{t('no_liabilities_tracked')}</p>
                  <p className="text-slate-500 text-sm mb-4">{t('add_loans_or_cc')}</p>
                </div>
              )}
              {data.liabilities.map(liab => (
                <div key={liab.id} className="bg-white/[0.03] p-5 rounded-2xl border border-white/[0.06] hover:border-white/15 hover:bg-white/[0.05] transition-all group relative" style={{ borderLeft: '3px solid rgba(244,63,94,0.3)' }}>
                  {savedField === `card-${liab.id}` && (
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded-full border border-emerald-500/20 animate-pulse z-10">✓ Saved</div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                    <div className="sm:col-span-4">
                      <label className={LABEL_CLASS}>{t('name')}</label>
                      <div className="flex items-center gap-2">
                        <span className="text-lg" title={liab.type.replace(/_/g, ' ')}>{LIABILITY_ICONS[liab.type] || '📋'}</span>
                        <input type="text" value={liab.name} onChange={(e) => updateLiability(liab.id, 'name', e.target.value)} placeholder="e.g. SBI Home Loan" className={INPUT_CLASS_ROSE} />
                      </div>
                    </div>
                    <div className="sm:col-span-3">
                      <label className={LABEL_CLASS}>{t('type')}</label>
                      <select value={liab.type} onChange={(e) => updateLiability(liab.id, 'type', e.target.value as LiabilityType)} className={SELECT_CLASS_ROSE}>
                        <option style={OPTION_STYLE} value="HOME_LOAN">🏠 Home Loan</option>
                        <option style={OPTION_STYLE} value="MORTGAGE">🏗️ Mortgage</option>
                        <option style={OPTION_STYLE} value="CAR_LOAN">🚗 Car Loan</option>
                        <option style={OPTION_STYLE} value="VEHICLE_LOAN">🏍️ Vehicle Loan</option>
                        <option style={OPTION_STYLE} value="EDUCATION_LOAN">🎓 Education Loan</option>
                        <option style={OPTION_STYLE} value="PERSONAL_LOAN">👤 Personal Loan</option>
                        <option style={OPTION_STYLE} value="BUSINESS_LOAN">💼 Business Loan</option>
                        <option style={OPTION_STYLE} value="GOLD_LOAN">🪙 Gold Loan</option>
                        <option style={OPTION_STYLE} value="CREDIT_CARD">💳 Credit Card</option>
                        <option style={OPTION_STYLE} value="OTHER">📋 Other</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLASS}>{t('balance')}</label>
                      <input type="text" inputMode="decimal" value={formatIndian(liab.value)} onChange={(e) => updateLiability(liab.id, 'value', parseIndian(e.target.value))} className={INPUT_CLASS_ROSE} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className={LABEL_CLASS}>{t('interest_pct')}</label>
                      <input type="text" inputMode="decimal" defaultValue={(liab.interestRate * 100).toFixed(1)} key={`interest-${liab.id}-${liab.type}`} onBlur={(e) => {
                        const val = parseFloat(e.target.value);
                        updateLiability(liab.id, 'interestRate', (isNaN(val) ? 0 : val) / 100);
                      }} className={INPUT_CLASS_ROSE} />
                    </div>
                    <div className="sm:col-span-1 flex justify-end items-end gap-0.5">
                      <button onClick={() => toggleExpand(liab.id)} title="Tracking details" className={`p-2 rounded-lg transition-all ${expandedCards.has(liab.id) ? 'text-indigo-400 bg-indigo-400/10' : 'text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10'}`}>
                        <FileText className="w-4 h-4" />
                      </button>
                      <button onClick={() => removeLiability(liab.id)} title="Remove liability" className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 rounded-lg transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  {/* Tracking Details (collapsible) */}
                  {expandedCards.has(liab.id) && (
                    <div className="mt-3 pt-3 border-t border-white/5">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] text-slate-500 font-medium">Tracking Details</span>
                        {savedField === `panel-${liab.id}` && (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1 animate-pulse">✓ Auto-saved</span>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                        <div className="sm:col-span-5">
                          <label className={LABEL_CLASS}>{t('portal_url')}</label>
                          <div className="flex gap-1.5">
                            <input
                              type="url"
                              value={liab.trackingUrl || ''}
                              onChange={(e) => updateLiability(liab.id, 'trackingUrl', e.target.value)}
                              onBlur={() => flashSaved(`panel-${liab.id}`)}
                              placeholder="https://bank.example.com"
                              className={INPUT_CLASS_ROSE}
                            />
                            {liab.trackingUrl && (
                              <a href={liab.trackingUrl} target="_blank" rel="noopener noreferrer" className="p-2.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-400/10 rounded-lg transition-all shrink-0">
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="sm:col-span-3">
                          <label className={LABEL_CLASS}>{t('username')}</label>
                          <input
                            type="text"
                            value={liab.trackingUsername || ''}
                            onChange={(e) => updateLiability(liab.id, 'trackingUsername', e.target.value)}
                            onBlur={() => flashSaved(`panel-${liab.id}`)}
                            placeholder="login ID or email"
                            className={INPUT_CLASS_ROSE}
                          />
                        </div>
                        <div className="sm:col-span-4">
                          <label className={LABEL_CLASS}>{t('password')}</label>
                          <div className="flex gap-1.5">
                            <input
                              type={showPasswords.has(liab.id) ? 'text' : 'password'}
                              value={liab.trackingPassword || ''}
                              onChange={(e) => updateLiability(liab.id, 'trackingPassword', e.target.value)}
                              onBlur={() => flashSaved(`panel-${liab.id}`)}
                              placeholder="••••••••"
                              className={INPUT_CLASS_ROSE}
                            />
                            <button onClick={() => togglePassword(liab.id)} className="p-2.5 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all shrink-0">
                              {showPasswords.has(liab.id) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div className="sm:col-span-12">
                          <label className={LABEL_CLASS}>{t('notes')}</label>
                          <textarea
                            value={liab.notes || ''}
                            onChange={(e) => updateLiability(liab.id, 'notes', e.target.value)}
                            onBlur={() => flashSaved(`panel-${liab.id}`)}
                            placeholder={
                              liab.type === 'HOME_LOAN' || liab.type === 'MORTGAGE' ? 'EMI amount, tenure, bank branch, prepayment plans, property linked...' :
                                liab.type === 'CAR_LOAN' || liab.type === 'VEHICLE_LOAN' ? 'EMI amount, tenure, vehicle details, foreclosure charges...' :
                                  liab.type === 'EDUCATION_LOAN' ? 'EMI, moratorium period, institution, course details...' :
                                    liab.type === 'GOLD_LOAN' ? 'Pledged weight, renewal date, interest payment frequency...' :
                                      liab.type === 'CREDIT_CARD' ? 'Bill date, due date, credit limit, reward points...' :
                                        t('notes_placeholder_liability')
                            }
                            rows={2}
                            className={`${INPUT_CLASS_ROSE} resize-none`}
                          />
                        </div>

                        {/* Attachments */}
                        <div className="sm:col-span-12">
                          <label className={LABEL_CLASS}>📎 Attachments</label>
                          {(liab.attachments || []).length > 0 && (
                            <div className="space-y-1.5 mb-2">
                              {(liab.attachments || []).map(att => (
                                <div key={att.id} className="flex items-center gap-2 bg-white/[0.03] px-3 py-1.5 rounded-lg border border-white/[0.06] group">
                                  <span className="text-xs">{att.type === 'image' ? '🖼️' : att.type === 'document' ? '📄' : '🔗'}</span>
                                  <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 truncate flex-1">{att.name}</a>
                                  <button onClick={() => {
                                    const updated = (liab.attachments || []).filter(a => a.id !== att.id);
                                    updateLiability(liab.id, 'attachments' as any, updated);
                                  }} className="text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all p-0.5" title="Remove">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="flex gap-1.5">
                            <input type="text" placeholder="Link name (e.g. Loan agreement)" id={`att-name-${liab.id}`} className={`${INPUT_CLASS_ROSE} text-xs`} />
                            <input type="url" placeholder="Paste URL (Drive, OneDrive...)" id={`att-url-${liab.id}`} className={`${INPUT_CLASS_ROSE} text-xs flex-1`} />
                            <button
                              onClick={() => {
                                const nameEl = document.getElementById(`att-name-${liab.id}`) as HTMLInputElement;
                                const urlEl = document.getElementById(`att-url-${liab.id}`) as HTMLInputElement;
                                if (nameEl?.value && urlEl?.value) {
                                  const newAtt: Attachment = {
                                    id: crypto.randomUUID(),
                                    name: nameEl.value,
                                    url: urlEl.value,
                                    type: urlEl.value.match(/\.(jpg|jpeg|png|gif|webp|svg)/i) ? 'image' : urlEl.value.match(/\.(pdf|doc|docx|xls|xlsx)/i) ? 'document' : 'link',
                                  };
                                  updateLiability(liab.id, 'attachments' as any, [...(liab.attachments || []), newAtt]);
                                  nameEl.value = '';
                                  urlEl.value = '';
                                }
                              }}
                              className="px-3 py-2 bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 rounded-lg text-xs font-medium transition-all shrink-0"
                            >
                              + Add
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={addLiability} className="w-full py-3.5 border-2 border-dashed border-white/10 rounded-2xl text-slate-500 hover:text-rose-300 hover:border-rose-400/30 hover:bg-rose-400/5 transition-all flex items-center justify-center gap-2 active:scale-[0.98]">
                <Plus className="w-4 h-4" /> {t('add_liability')}
              </button>
            </>
          )}
        </div>

        {/* Monthly Contribution */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-blue-500/10 p-4 rounded-xl border border-blue-500/20">
            <div>
              <h4 className="text-white font-medium">{t('monthly_surplus')}</h4>
              <p className="text-blue-200/70 text-sm">{t('how_much_save')}</p>
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