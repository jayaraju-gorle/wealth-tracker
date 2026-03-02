import React, { useState, useMemo } from 'react';
import { HashRouter } from 'react-router-dom';
import { LayoutDashboard, Wallet, History, Menu, X, Activity, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';
import { useStore } from './services/store';
import { AssetsLiabilities } from './components/AssetsLiabilities';
import { HistoryMachine } from './components/HistoryMachine';
import { Projections } from './components/Projections';
import { Milestones } from './components/Milestones';
import { SyncManager } from './components/SyncManager';
import { formatCurrency, formatCompact } from './utils';

const App: React.FC = () => {
  const { state, updateState, isSynced, syncStatus, forcePull } = useStore();
  const [activeView, setActiveView] = useState<'dashboard' | 'assets' | 'history'>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const totalAssets = useMemo(() => state.assets.reduce((a, b) => a + b.value, 0), [state.assets]);
  const totalLiabilities = useMemo(() => state.liabilities.reduce((a, b) => a + b.value, 0), [state.liabilities]);
  const netWorth = totalAssets - totalLiabilities;

  // Calculate month-over-month change from snapshots
  const monthChange = useMemo(() => {
    if (state.snapshots.length < 2) return null;
    const sorted = [...state.snapshots].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const latest = sorted[0].netWorth;
    const previous = sorted[1].netWorth;
    const change = latest - previous;
    const percent = previous !== 0 ? ((change / Math.abs(previous)) * 100) : 0;
    return { change, percent };
  }, [state.snapshots]);

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });

  const NavItem = ({ view, label, icon: Icon }: any) => (
    <button
      onClick={() => {
        setActiveView(view);
        setMobileMenuOpen(false);
      }}
      className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all ${activeView === view
        ? 'bg-white/10 text-white shadow-lg border border-white/5'
        : 'text-slate-400 hover:bg-white/5 hover:text-white'
        }`}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <HashRouter>
      <div className="min-h-screen pb-24 md:pb-0 flex flex-col md:flex-row max-w-7xl mx-auto md:p-8">

        {/* Mobile Header */}
        <div className="md:hidden flex justify-between items-center p-4 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-500 p-2 rounded-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-white">WealthTracker</h1>
          </div>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-white">
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Sidebar / Navigation */}
        <nav className={`
          fixed md:static inset-0 z-40 bg-slate-900/95 md:bg-transparent backdrop-blur-xl md:backdrop-blur-none
          transition-transform duration-300 ease-in-out md:translate-x-0 md:w-64 flex-shrink-0
          ${mobileMenuOpen ? 'translate-x-0 pt-20 px-4' : '-translate-x-full md:pt-0 md:px-0'}
        `}>
          <div className="hidden md:flex items-center gap-3 mb-10 px-4">
            <div className="bg-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-600/30">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">WealthTracker</h1>
              <p className="text-xs text-slate-400">Track. Sync. Grow.</p>
            </div>
          </div>

          <div className="space-y-2">
            <NavItem view="dashboard" label="Dashboard" icon={LayoutDashboard} />
            <NavItem view="assets" label="Assets & Debts" icon={Wallet} />
            <NavItem view="history" label="Time Machine" icon={History} />
          </div>

          <div className="mt-10 px-4 hidden md:block">
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30">
              <p className="text-xs text-indigo-200 mb-1 font-semibold uppercase tracking-wider">Net Worth</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(netWorth)}
              </p>
              {monthChange && (
                <div className={`flex items-center gap-1 mt-2 text-xs ${monthChange.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {monthChange.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  <span>{monthChange.percent >= 0 ? '+' : ''}{monthChange.percent.toFixed(1)}% from last entry</span>
                </div>
              )}
            </div>
          </div>
        </nav>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-0 md:ml-8 overflow-y-auto">
          <div className="space-y-6">

            {/* Compact Sync Manager */}
            <SyncManager
              data={state}
              onUpdate={updateState}
              isSynced={isSynced}
              syncStatus={syncStatus}
              onForcePull={forcePull}
            />

            {activeView === 'dashboard' && (
              <div className="space-y-6 animate-fade-in">
                {/* Welcome & Date */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-bold text-white">Welcome back 👋</h2>
                    <div className="flex items-center gap-2 mt-1 text-slate-400 text-sm">
                      <Calendar className="w-4 h-4" />
                      <span>{today}</span>
                    </div>
                  </div>
                </div>

                {/* Hero Summary Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Total Assets */}
                  <div className="group bg-gradient-to-br from-emerald-500/15 to-emerald-600/5 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-5 transition-all duration-300 hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 bg-emerald-500/20 rounded-xl">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                      </div>
                      <span className="text-emerald-200 text-sm font-medium">Total Assets</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{formatCurrency(totalAssets)}</div>
                    <div className="text-xs text-emerald-300/60 mt-1">{state.assets.length} items tracked</div>
                  </div>

                  {/* Total Liabilities */}
                  <div className="group bg-gradient-to-br from-rose-500/15 to-rose-600/5 backdrop-blur-md border border-rose-500/20 rounded-2xl p-5 transition-all duration-300 hover:border-rose-500/40 hover:shadow-lg hover:shadow-rose-500/10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 bg-rose-500/20 rounded-xl">
                        <TrendingDown className="w-5 h-5 text-rose-400" />
                      </div>
                      <span className="text-rose-200 text-sm font-medium">Total Liabilities</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{formatCurrency(totalLiabilities)}</div>
                    <div className="text-xs text-rose-300/60 mt-1">{state.liabilities.length} items tracked</div>
                  </div>

                  {/* Net Worth */}
                  <div className="group bg-gradient-to-br from-indigo-500/15 to-purple-600/10 backdrop-blur-md border border-indigo-500/20 rounded-2xl p-5 transition-all duration-300 hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/10">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 bg-indigo-500/20 rounded-xl">
                        <span className="text-indigo-400 font-bold text-lg">₹</span>
                      </div>
                      <span className="text-indigo-200 text-sm font-medium">Net Worth</span>
                    </div>
                    <div className="text-2xl font-bold text-white">{formatCurrency(netWorth)}</div>
                    {monthChange && (
                      <div className={`flex items-center gap-1 mt-1 text-xs ${monthChange.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {monthChange.change >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                        <span>{monthChange.change >= 0 ? '+' : ''}{formatCompact(Math.abs(monthChange.change))} ({monthChange.percent.toFixed(1)}%)</span>
                      </div>
                    )}
                    {!monthChange && <div className="text-xs text-indigo-300/60 mt-1">Add snapshots to track changes</div>}
                  </div>
                </div>

                {/* Projections Chart */}
                <Projections data={state} />

                {/* Milestones & Quick Assets */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Milestones data={state} onUpdate={updateState} />

                  {/* Quick View of Assets */}
                  <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-white/15 animate-slide-up">
                    <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                      <h3 className="text-lg font-semibold text-white">Top Assets</h3>
                      <button onClick={() => setActiveView('assets')} className="text-sm text-indigo-400 hover:text-white transition-colors">
                        Manage →
                      </button>
                    </div>
                    <div className="p-6">
                      <div className="space-y-3">
                        {state.assets
                          .slice()
                          .sort((a, b) => b.value - a.value)
                          .slice(0, 5)
                          .map(asset => (
                            <div key={asset.id} className="flex justify-between items-center text-sm p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                                <span className="text-slate-300">{asset.name}</span>
                              </div>
                              <span className="font-mono text-white font-medium">{formatCurrency(asset.value)}</span>
                            </div>
                          ))}
                        {state.assets.length === 0 && (
                          <div className="text-center py-8">
                            <Wallet className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-500 text-sm">No assets tracked yet.</p>
                            <button onClick={() => setActiveView('assets')} className="mt-3 text-sm text-indigo-400 hover:text-white transition-colors">
                              + Add your first asset
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeView === 'assets' && (
              <div className="animate-fade-in">
                <AssetsLiabilities data={state} onUpdate={updateState} />
              </div>
            )}

            {activeView === 'history' && (
              <div className="animate-fade-in">
                <HistoryMachine data={state} onUpdate={updateState} />
              </div>
            )}

          </div>
        </main>

        {/* Mobile Bottom Tab Bar */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-t border-white/10 px-2 py-1 safe-area-pb">
          <div className="flex justify-around items-center max-w-md mx-auto">
            {[
              { view: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
              { view: 'assets' as const, label: 'Assets', icon: Wallet },
              { view: 'history' as const, label: 'History', icon: History },
            ].map(({ view, label, icon: Icon }) => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${activeView === view
                    ? 'text-indigo-400'
                    : 'text-slate-500 hover:text-slate-300'
                  }`}
              >
                <div className={`p-1.5 rounded-lg transition-all ${activeView === view ? 'bg-indigo-500/20' : ''}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </HashRouter>
  );
};

export default App;