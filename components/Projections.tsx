import React, { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { TrendingUp, Target, Zap } from 'lucide-react';
import { AppState } from '../types';
import { GlassCard } from './ui/GlassCard';
import { formatCompact, formatCurrency } from '../utils';

interface Props {
  data: AppState;
}

export const Projections: React.FC<Props> = ({ data }) => {
  const currentNetWorth = useMemo(() =>
    data.assets.reduce((a, b) => a + b.value, 0) - data.liabilities.reduce((a, b) => a + b.value, 0),
    [data.assets, data.liabilities]
  );

  const totalAssets = data.assets.reduce((sum, a) => sum + a.value, 0) || 1;
  const weightedGrowth = data.assets.reduce((sum, a) => sum + (a.value * a.growthRate), 0) / totalAssets;

  const chartData = useMemo(() => {
    const points = data.snapshots.map(s => ({
      date: s.date,
      history: s.netWorth,
      projected: null as number | null,
      isProjected: false
    }));

    if (points.length === 0) return [];

    const lastDate = new Date().toISOString().slice(0, 10);

    const lastSnapshot = points[points.length - 1];
    if (lastSnapshot.date !== lastDate) {
      points.push({
        date: lastDate,
        history: currentNetWorth,
        projected: currentNetWorth,
        isProjected: false
      });
    } else {
      points[points.length - 1].projected = points[points.length - 1].history;
    }

    const monthlyRate = weightedGrowth / 12;
    let projectedVal = currentNetWorth;
    let currentDate = new Date();

    for (let i = 1; i <= 60; i++) {
      currentDate.setMonth(currentDate.getMonth() + 1);
      projectedVal += data.monthlyContribution;
      projectedVal = projectedVal * (1 + monthlyRate);

      points.push({
        date: currentDate.toISOString().slice(0, 7),
        history: null,
        projected: Math.round(projectedVal),
        isProjected: true
      });
    }

    return points;
  }, [data]);

  // 5-year projected value
  const projectedIn5Years = chartData.length > 0 ? chartData[chartData.length - 1]?.projected || 0 : 0;
  const growthMultiple = currentNetWorth > 0 ? (projectedIn5Years / currentNetWorth) : 0;

  return (
    <GlassCard title="Wealth Trajectory" action={
      <span className="text-xs text-slate-400">History + 5-Year Projection</span>
    }>
      {/* Summary Stats Above Chart */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
            <span className="text-xs text-slate-400">Current</span>
          </div>
          <p className="text-lg font-bold text-white">{formatCompact(currentNetWorth)}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <div className="w-2 h-2 rounded-full bg-indigo-500 opacity-60"></div>
            <span className="text-xs text-slate-400">5Y Projected</span>
          </div>
          <p className="text-lg font-bold text-indigo-300">{formatCompact(projectedIn5Years)}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <Zap className="w-3 h-3 text-amber-400" />
            <span className="text-xs text-slate-400">Growth</span>
          </div>
          <p className="text-lg font-bold text-amber-300">
            {growthMultiple > 0 ? `${growthMultiple.toFixed(1)}x` : '—'}
          </p>
        </div>
      </div>

      <div className="h-[350px] w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorHistory" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorProjected" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#94a3b8"
                fontSize={12}
                tickMargin={10}
                tickFormatter={(val) => val.slice(0, 7)}
              />
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                tickFormatter={(val) => formatCompact(val)}
              />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', borderColor: '#334155', borderRadius: '8px', color: '#fff' }}
                itemStyle={{ color: '#fff' }}
                formatter={(val: number) => [formatCurrency(val), 'Net Worth']}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area
                type="monotone"
                dataKey="history"
                stroke="#10b981"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorHistory)"
                name="History"
              />
              <Area
                type="monotone"
                dataKey="projected"
                stroke="#6366f1"
                strokeWidth={3}
                strokeDasharray="5 5"
                fillOpacity={1}
                fill="url(#colorProjected)"
                name="Projection"
              />
              <ReferenceLine x={new Date().toISOString().slice(0, 10)} stroke="#f472b6" label="Today" strokeDasharray="3 3" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="w-16 h-16 bg-indigo-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-indigo-500/50" />
            </div>
            <p className="text-slate-400 mb-1">No projection data yet</p>
            <p className="text-slate-500 text-sm">Add historical snapshots in "Time Machine" to see your wealth trajectory.</p>
          </div>
        )}
      </div>
      <div className="mt-4 flex gap-6 justify-center text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
          <span className="text-slate-300">Recorded History</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-indigo-500 rounded-full opacity-50"></div>
          <span className="text-slate-300">Projected Future</span>
        </div>
      </div>
    </GlassCard>
  );
};