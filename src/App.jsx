import { useState, useEffect } from 'react'
import {
  AreaChart, Area, LineChart, Line, ComposedChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, ReferenceArea
} from 'recharts'

const C = {
  blue: '#4f8ff7', green: '#34d399', red: '#f87171',
  amber: '#fbbf24', purple: '#a78bfa', cyan: '#22d3ee',
  muted: '#5a5e73', border: '#2a2d3e', card: '#1e2130',
}

const fmt = (v, type) => {
  if (v == null || isNaN(v)) return '—'
  if (typeof v === 'string') return v
  if (type === '$') {
    const neg = v < 0 ? '-' : ''
    const a = Math.abs(v)
    if (a >= 1e6) return `${neg}$${(a / 1e6).toFixed(1)}M`
    if (a >= 1e3) return `${neg}$${(a / 1e3).toFixed(0)}K`
    return `${neg}$${a.toFixed(0)}`
  }
  if (type === '%') return `${(v * 100).toFixed(1)}%`
  if (type === '#') return v.toFixed(2)
  return String(v)
}

const delta = (now, target) => {
  if (!target || target === 0) return null
  return (target - now) / Math.abs(target)
}

// ── Tooltip ──
const Tip = ({ active, payload, label, vf }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1a1d27', border: `1px solid ${C.border}`, borderRadius: 8,
      padding: '10px 14px', fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
    }}>
      <div style={{ color: C.muted, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.filter(p => p.value != null).map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.stroke, flexShrink: 0 }} />
          <span style={{ color: '#e4e6f0' }}>{p.name}:</span>
          <span style={{ fontWeight: 600, color: p.color || p.stroke }}>{fmt(p.value, vf || '$')}</span>
        </div>
      ))}
    </div>
  )
}

// ── Scoreboard Row ──
function Score({ label, now, target3, target6, target12, type, color, icon }) {
  const d3 = delta(now, target3)
  const d6 = delta(now, target6)
  return (
    <div className="score-row">
      <div className="score-icon" style={{ background: color + '18', color }}>{icon}</div>
      <div className="score-label">{label}</div>
      <div className="score-now" style={{ color }}>{fmt(now, type)}</div>
      <div className="score-targets">
        <Target label="3mo" value={target3} type={type} delta={d3} />
        <Target label="6mo" value={target6} type={type} delta={d6} />
        <Target label="12mo" value={target12} type={type} />
      </div>
    </div>
  )
}

function Target({ label, value, type, delta: d }) {
  return (
    <div className="target-cell">
      <div className="target-label">{label} target</div>
      <div className="target-value">{fmt(value, type)}</div>
      {d != null && (
        <div className={`target-delta ${d > 0 ? 'up' : d < 0 ? 'down' : ''}`}>
          {d > 0 ? '↑' : d < 0 ? '↓' : '→'} {fmt(Math.abs(d), '%')} to go
        </div>
      )}
    </div>
  )
}

// ── KPI Sparkline Chart ──
function KpiChart({ title, data, dataKey, color, today, type, targetKey, children }) {
  return (
    <div className="kpi-chart">
      <div className="kpi-chart-title">{title}</div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.muted }} interval={5} />
          <YAxis tickFormatter={v => fmt(v, type)} tick={{ fontSize: 10, fill: C.muted }} width={58} />
          <Tooltip content={<Tip vf={type} />} />
          {/* Shade past as slightly brighter */}
          <ReferenceArea x1={data[0]?.date} x2={today} fill="#ffffff" fillOpacity={0.03} />
          {/* Today line */}
          <ReferenceLine x={today} stroke={C.amber} strokeWidth={2} strokeDasharray="6 3"
            label={{ value: 'TODAY', fill: C.amber, fontSize: 10, fontWeight: 700, position: 'top' }} />
          {children || (
            <Area type="monotone" dataKey={dataKey} name={title} stroke={color}
              fill={color} fillOpacity={0.1} strokeWidth={2.5}
              dot={false} activeDot={{ r: 4, fill: color }} />
          )}
          {targetKey && (
            <Line type="monotone" dataKey={targetKey} name="Target" stroke={C.muted}
              strokeWidth={1.5} strokeDasharray="6 3" dot={false} />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Main App ──
export default function App() {
  const [data, setData] = useState(null)

  useEffect(() => {
    fetch('/data.json').then(r => r.json()).then(setData)
  }, [])

  if (!data) return (
    <div className="loading">Loading Togy Dashboard...</div>
  )

  const { today, today_idx: ti, dates, milestones: m, series: s } = data

  // Chart data with actuals (up to today) and plan (after today)
  const chartData = dates.map((d, i) => {
    const isPast = i <= ti
    return {
      date: d,
      mrr: s.mrr[i],
      mrrActual: isPast ? s.mrr[i] : null,
      mrrPlan: !isPast ? s.mrr[i] : null,
      gm: s.gross_margin[i],
      gmActual: isPast ? s.gross_margin[i] : null,
      gmPlan: !isPast ? s.gross_margin[i] : null,
      logos: s.new_logos[i],
      logosActual: isPast ? s.new_logos[i] : null,
      logosPlan: !isPast ? s.new_logos[i] : null,
      cumLogos: s.cum_logos[i],
      burn: s.burn_rate[i],
      burnActual: isPast ? s.burn_rate[i] : null,
      burnPlan: !isPast ? s.burn_rate[i] : null,
      util: s.utilization[i],
      utilActual: isPast ? s.utilization[i] : null,
      utilPlan: !isPast ? s.utilization[i] : null,
      cash: s.cash_ending[i],
      collections: s.collections[i],
    }
  })
  // Bridge: connect actual to plan at the today boundary
  if (ti + 1 < dates.length) {
    chartData[ti].mrrPlan = chartData[ti].mrrActual
    chartData[ti].gmPlan = chartData[ti].gmActual
    chartData[ti].logosPlan = chartData[ti].logosActual
    chartData[ti].burnPlan = chartData[ti].burnActual
    chartData[ti].utilPlan = chartData[ti].utilActual
  }

  const now = m.current
  const t3 = m.plus_3m
  const t6 = m.plus_6m
  const t12 = m.plus_12m

  // Breakeven
  const bkIdx = s.cash_ending.findIndex((v, i) => i > 0 && s.cash_ending[i - 1] < 0 && v >= 0)
  const breakevenDate = bkIdx >= 0 ? dates[bkIdx] : null

  // Cash trough
  const minCash = Math.min(...s.cash_ending)

  return (
    <div className="dashboard">
      {/* ── Header ── */}
      <header className="header">
        <div>
          <h1>Togy <span className="accent">Command Center</span></h1>
          <p className="header-sub">5 KPIs that matter &middot; Today: <strong>{today}</strong> &middot; Forecast → {dates[dates.length - 1]}</p>
        </div>
        <div className="header-right">
          <div className="header-stat">
            <div className="header-stat-label">Breakeven</div>
            <div className="header-stat-value" style={{ color: C.green }}>{breakevenDate || '—'}</div>
          </div>
          <div className="header-stat">
            <div className="header-stat-label">Cash Trough</div>
            <div className="header-stat-value" style={{ color: C.red }}>{fmt(minCash, '$')}</div>
          </div>
        </div>
      </header>

      {/* ── Scoreboard ── */}
      <section className="scoreboard">
        <div className="scoreboard-header">
          <div className="scoreboard-col-label" />
          <div className="scoreboard-col-label" />
          <div className="scoreboard-col-now">Now</div>
          <div className="scoreboard-col-targets">
            <span>3 month</span>
            <span>6 month</span>
            <span>12 month</span>
          </div>
        </div>
        <Score label="MRR" icon="$" color={C.blue} type="$"
          now={now.mrr} target3={t3.mrr} target6={t6.mrr} target12={t12.mrr} />
        <Score label="Gross Margin" icon="%" color={C.green} type="%"
          now={now.gross_margin} target3={t3.gross_margin} target6={t6.gross_margin} target12={t12.gross_margin} />
        <Score label="New Logos/mo" icon="◆" color={C.amber} type="#"
          now={now.new_logos} target3={t3.new_logos} target6={t6.new_logos} target12={t12.new_logos} />
        <Score label="Burn Rate" icon="↓" color={C.red} type="$"
          now={now.burn_rate} target3={t3.burn_rate} target6={t6.burn_rate} target12={t12.burn_rate} />
        <Score label="Utilization" icon="◎" color={C.purple} type="%"
          now={now.utilization} target3={t3.utilization} target6={t6.utilization} target12={t12.utilization} />
      </section>

      {/* ── Charts ── */}
      <section className="charts">
        <KpiChart title="Monthly Recurring Revenue" data={chartData} dataKey="mrr" color={C.blue} today={today} type="$">
          <Area type="monotone" dataKey="mrrActual" name="Actual" stroke={C.blue}
            fill={C.blue} fillOpacity={0.15} strokeWidth={2.5} dot={false} connectNulls={false} />
          <Area type="monotone" dataKey="mrrPlan" name="Plan" stroke={C.blue}
            fill={C.blue} fillOpacity={0.05} strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls={false} />
        </KpiChart>

        <KpiChart title="Gross Margin %" data={chartData.filter(d => d.gm > -1)} dataKey="gm" color={C.green} today={today} type="%">
          <ReferenceLine y={0} stroke={C.muted} strokeDasharray="3 3" />
          <Area type="monotone" dataKey="gmActual" name="Actual" stroke={C.green}
            fill={C.green} fillOpacity={0.15} strokeWidth={2.5} dot={false} connectNulls={false} />
          <Area type="monotone" dataKey="gmPlan" name="Plan" stroke={C.green}
            fill={C.green} fillOpacity={0.05} strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls={false} />
        </KpiChart>

        <KpiChart title="New Logos per Month" data={chartData} dataKey="logos" color={C.amber} today={today} type="#">
          <Bar dataKey="logosActual" name="Actual" fill={C.amber} fillOpacity={0.9} radius={[3, 3, 0, 0]} />
          <Bar dataKey="logosPlan" name="Plan" fill={C.amber} fillOpacity={0.25} radius={[3, 3, 0, 0]} />
        </KpiChart>

        <KpiChart title="Burn Rate (monthly)" data={chartData} dataKey="burn" color={C.red} today={today} type="$">
          <Area type="monotone" dataKey="burnActual" name="Actual" stroke={C.red}
            fill={C.red} fillOpacity={0.15} strokeWidth={2.5} dot={false} connectNulls={false} />
          <Area type="monotone" dataKey="burnPlan" name="Plan" stroke={C.red}
            fill={C.red} fillOpacity={0.05} strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls={false} />
        </KpiChart>

        <KpiChart title="Team Utilization" data={chartData} dataKey="util" color={C.purple} today={today} type="%">
          <ReferenceLine y={0.9} stroke={C.red} strokeDasharray="6 3"
            label={{ value: '90% capacity', fill: C.red, fontSize: 9, position: 'right' }} />
          <Area type="monotone" dataKey="utilActual" name="Actual" stroke={C.purple}
            fill={C.purple} fillOpacity={0.15} strokeWidth={2.5} dot={false} connectNulls={false} />
          <Area type="monotone" dataKey="utilPlan" name="Plan" stroke={C.purple}
            fill={C.purple} fillOpacity={0.05} strokeWidth={2} strokeDasharray="6 3" dot={false} connectNulls={false} />
        </KpiChart>

        {/* Cash runway - full width */}
        <div className="kpi-chart full">
          <div className="kpi-chart-title">Cash Position & Runway</div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: C.muted }} interval={5} />
              <YAxis tickFormatter={v => fmt(v, '$')} tick={{ fontSize: 10, fill: C.muted }} width={58} />
              <Tooltip content={<Tip />} />
              <ReferenceArea x1={chartData[0]?.date} x2={today} fill="#ffffff" fillOpacity={0.03} />
              <ReferenceLine x={today} stroke={C.amber} strokeWidth={2} strokeDasharray="6 3"
                label={{ value: 'TODAY', fill: C.amber, fontSize: 10, fontWeight: 700, position: 'top' }} />
              <ReferenceLine y={0} stroke={C.muted} strokeWidth={1.5} />
              <Area type="monotone" dataKey="cash" name="Cash Balance" stroke={C.cyan}
                fill={C.cyan} fillOpacity={0.1} strokeWidth={2.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}
