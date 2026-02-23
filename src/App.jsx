import { useState, useEffect } from 'react'
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, ComposedChart,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'

const COLORS = {
  blue: '#4f8ff7',
  green: '#34d399',
  red: '#f87171',
  amber: '#fbbf24',
  purple: '#a78bfa',
  cyan: '#22d3ee',
  pink: '#f472b6',
  orange: '#fb923c',
}

const fmt = (v, type) => {
  if (v == null || isNaN(v)) return '—'
  if (type === 'currency') {
    if (Math.abs(v) >= 1e6) return `$${(v / 1e6).toFixed(1)}M`
    if (Math.abs(v) >= 1e3) return `$${(v / 1e3).toFixed(0)}K`
    return `$${v.toFixed(0)}`
  }
  if (type === 'percent') return `${(v * 100).toFixed(1)}%`
  if (type === 'number') return v.toFixed(1)
  if (type === 'integer') return Math.round(v).toLocaleString()
  return v.toFixed(2)
}

const pctChange = (arr) => {
  if (!arr || arr.length < 2) return 0
  const last = arr[arr.length - 1]
  const prev = arr[arr.length - 2]
  if (prev === 0) return 0
  return (last - prev) / Math.abs(prev)
}

const CustomTooltip = ({ active, payload, label, valueFormat }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#1e2130', border: '1px solid #2a2d3e', borderRadius: 8,
      padding: '10px 14px', fontSize: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
    }}>
      <div style={{ color: '#8b8fa3', marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: '#e4e6f0' }}>{p.name}: </span>
          <span style={{ fontWeight: 600, color: p.color }}>
            {fmt(p.value, valueFormat || 'currency')}
          </span>
        </div>
      ))}
    </div>
  )
}

function KpiCard({ label, value, format, change, subtitle, color }) {
  const changeClass = change > 0.001 ? 'positive' : change < -0.001 ? 'negative' : 'neutral'
  const arrow = change > 0.001 ? '↑' : change < -0.001 ? '↓' : '→'
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value" style={{ color: color || 'var(--text-primary)' }}>
        {fmt(value, format)}
      </div>
      {change !== undefined && (
        <div className={`kpi-change ${changeClass}`}>
          {arrow} {fmt(Math.abs(change), 'percent')} vs prev month
        </div>
      )}
      {subtitle && <div className="kpi-subtitle">{subtitle}</div>}
    </div>
  )
}

function ChartCard({ title, subtitle, children, fullWidth, legend }) {
  return (
    <div className={`chart-card${fullWidth ? ' full-width' : ''}`}>
      <div className="chart-title">{title}</div>
      {subtitle && <div className="chart-subtitle">{subtitle}</div>}
      {legend && (
        <div className="chart-legend">
          {legend.map((l, i) => (
            <div key={i} className="legend-item">
              <span className="legend-dot" style={{ background: l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      )}
      {children}
    </div>
  )
}

export default function App() {
  const [data, setData] = useState(null)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    fetch('/data.json').then(r => r.json()).then(setData)
  }, [])

  if (!data) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', color: '#8b8fa3' }}>
      Loading dashboard...
    </div>
  )

  const { dates, kpis, income_statement: is } = data
  const last = dates.length - 1

  // Build chart data arrays
  const chartData = dates.map((d, i) => ({
    date: d,
    mrr: kpis.financial.mrr[i],
    mrrVision: kpis.financial.mrr_vision[i],
    mrrMain: kpis.financial.mrr_main[i],
    grossMargin: kpis.financial.gross_margin[i],
    gmVision: kpis.financial.gross_margin_vision[i],
    gmMain: kpis.financial.gross_margin_main[i],
    burnRate: kpis.financial.burn_rate[i],
    burnVision: kpis.financial.burn_rate_vision[i],
    burnMain: kpis.financial.burn_rate_main[i],
    revPerEmp: kpis.financial.revenue_per_employee[i],
    newLogos: kpis.gtm.new_logos_per_month[i],
    cumLogos: is.logos_cumulative[i],
    salesProd: kpis.gtm.sales_productivity[i],
    unitsDelivered: kpis.delivery.units_delivered_per_month[i],
    visionUnits: kpis.delivery.vision_units[i],
    mainUnits: kpis.delivery.main_units[i],
    utilRate: kpis.delivery.utilization_rate[i],
    utilVision: kpis.delivery.utilization_vision[i],
    utilMain: kpis.delivery.utilization_main[i],
    deployTime: kpis.delivery.order_to_deployment_time[i],
    collections: is.total_collections[i],
    cogs: Math.abs(is.cogs[i]),
    grossCashMargin: is.gross_cash_margin[i],
    opex: Math.abs(is.operating_costs[i]),
    netCashFlow: is.net_operating_cash_flow[i],
    cashEnding: is.cash_ending[i],
    visionCumUnits: is.vision_units_cumulative[i],
    mainCumUnits: is.main_units_cumulative[i],
    visionCustomers: is.vision_customers_cumulative[i],
    mainCustomers: is.main_customers_cumulative[i],
  }))

  // Annual ARR
  const currentMRR = kpis.financial.mrr[last]
  const currentARR = currentMRR * 12

  // Cash runway calculation
  const cashEnd = is.cash_ending[last]
  const avgBurn = kpis.financial.burn_rate.slice(-6).reduce((a, b) => a + b, 0) / 6
  const cashPositive = cashEnd > 0
  const runwayMonths = cashPositive ? Infinity : Math.abs(cashEnd / avgBurn)

  // Breakeven month
  const breakevenIdx = is.net_operating_cash_flow.findIndex(v => v > 0)
  const breakevenDate = breakevenIdx >= 0 ? dates[breakevenIdx] : null

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'financial', label: 'Financial' },
    { key: 'gtm', label: 'Go-to-Market' },
    { key: 'delivery', label: 'Delivery & Ops' },
    { key: 'cashflow', label: 'Cash Flow' },
  ]

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1><span>Togy</span> KPI Dashboard</h1>
        <div className="header-meta">
          Forecast: {dates[0]} → {dates[last]} &middot; {dates.length} months &middot; USD
        </div>
      </div>

      <div className="nav-tabs">
        {tabs.map(t => (
          <button key={t.key} className={`nav-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== OVERVIEW ===== */}
      {tab === 'overview' && (
        <>
          <div className="section-header">
            <span className="dot" style={{ background: COLORS.blue }} />
            Key Metrics Snapshot (Latest: {dates[last]})
          </div>
          <div className="kpi-grid">
            <KpiCard label="Monthly Recurring Revenue" value={currentMRR} format="currency"
              change={pctChange(kpis.financial.mrr)} color={COLORS.blue} />
            <KpiCard label="Annual Run-Rate (ARR)" value={currentARR} format="currency"
              subtitle="MRR × 12" color={COLORS.cyan} />
            <KpiCard label="Gross Margin" value={kpis.financial.gross_margin[last]} format="percent"
              change={pctChange(kpis.financial.gross_margin)} color={COLORS.green} />
            <KpiCard label="Cumulative Logos" value={is.logos_cumulative[last]} format="number"
              change={pctChange(is.logos_cumulative)} color={COLORS.amber} />
            <KpiCard label="Units Delivered/mo" value={kpis.delivery.units_delivered_per_month[last]} format="number"
              change={pctChange(kpis.delivery.units_delivered_per_month)} color={COLORS.purple} />
            <KpiCard label="Utilization Rate" value={kpis.delivery.utilization_rate[last]} format="percent"
              change={pctChange(kpis.delivery.utilization_rate)} />
            <KpiCard label="Monthly Burn Rate" value={kpis.financial.burn_rate[last]} format="currency"
              change={pctChange(kpis.financial.burn_rate.map(Math.abs))} color={COLORS.red} />
            <KpiCard label="Cash Position" value={cashEnd} format="currency"
              subtitle={cashPositive ? 'Cash positive' : `~${runwayMonths.toFixed(0)} months runway`}
              color={cashPositive ? COLORS.green : COLORS.red} />
          </div>

          <div className="chart-grid">
            <ChartCard title="MRR Trajectory" subtitle="Monthly Recurring Revenue by product"
              legend={[{ label: 'Vision', color: COLORS.blue }, { label: 'MAIN', color: COLORS.green }]}>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={5} />
                  <YAxis tickFormatter={v => fmt(v, 'currency')} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="mrrVision" name="Vision" stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="mrrMain" name="MAIN" stroke={COLORS.green} fill={COLORS.green} fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Net Cash Flow" subtitle="Monthly operating cash flow trend">
              <ResponsiveContainer width="100%" height={260}>
                <ComposedChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={5} />
                  <YAxis tickFormatter={v => fmt(v, 'currency')} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="#5a5e73" strokeDasharray="3 3" />
                  <Bar dataKey="netCashFlow" name="Net Cash Flow" fill={COLORS.blue}
                    radius={[3, 3, 0, 0]}
                    fillOpacity={0.8}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}

      {/* ===== FINANCIAL ===== */}
      {tab === 'financial' && (
        <>
          <div className="section-header">
            <span className="dot" style={{ background: COLORS.blue }} />
            Financial KPIs
          </div>
          <div className="kpi-grid">
            <KpiCard label="MRR" value={currentMRR} format="currency" change={pctChange(kpis.financial.mrr)} color={COLORS.blue} />
            <KpiCard label="MRR - Vision" value={kpis.financial.mrr_vision[last]} format="currency" change={pctChange(kpis.financial.mrr_vision)} color={COLORS.cyan} />
            <KpiCard label="MRR - MAIN" value={kpis.financial.mrr_main[last]} format="currency" change={pctChange(kpis.financial.mrr_main)} color={COLORS.green} />
            <KpiCard label="Gross Margin" value={kpis.financial.gross_margin[last]} format="percent" change={pctChange(kpis.financial.gross_margin)} color={COLORS.green} />
            <KpiCard label="GM - Vision" value={kpis.financial.gross_margin_vision[last]} format="percent" color={COLORS.cyan} />
            <KpiCard label="GM - MAIN" value={kpis.financial.gross_margin_main[last]} format="percent" color={COLORS.purple} />
            <KpiCard label="Revenue / Employee" value={kpis.financial.revenue_per_employee[last]} format="currency"
              change={pctChange(kpis.financial.revenue_per_employee)} color={COLORS.amber} />
            <KpiCard label="Breakeven Month" value={breakevenDate || 'Not yet'} format={null}
              subtitle="First month with positive net cash flow" color={COLORS.green} />
          </div>

          <div className="chart-grid">
            <ChartCard title="MRR Growth" subtitle="Total and by product line"
              legend={[{ label: 'Total MRR', color: COLORS.blue }, { label: 'Vision', color: COLORS.cyan }, { label: 'MAIN', color: COLORS.green }]}>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={5} />
                  <YAxis tickFormatter={v => fmt(v, 'currency')} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="mrr" name="Total MRR" stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.1} strokeWidth={2.5} />
                  <Area type="monotone" dataKey="mrrVision" name="Vision" stroke={COLORS.cyan} fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
                  <Area type="monotone" dataKey="mrrMain" name="MAIN" stroke={COLORS.green} fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Gross Margin Trajectory" subtitle="Overall and by product"
              legend={[{ label: 'Overall', color: COLORS.green }, { label: 'Vision', color: COLORS.cyan }, { label: 'MAIN', color: COLORS.purple }]}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData.filter(d => d.grossMargin > -1)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={5} />
                  <YAxis tickFormatter={v => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 11 }} domain={[-0.5, 1]} />
                  <Tooltip content={<CustomTooltip valueFormat="percent" />} />
                  <ReferenceLine y={0} stroke="#5a5e73" />
                  <Line type="monotone" dataKey="grossMargin" name="Overall" stroke={COLORS.green} strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="gmVision" name="Vision" stroke={COLORS.cyan} strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="gmMain" name="MAIN" stroke={COLORS.purple} strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Revenue per Employee" subtitle="Monthly revenue efficiency metric"
              legend={[{ label: 'Overall', color: COLORS.amber }, { label: 'Vision', color: COLORS.cyan }, { label: 'MAIN', color: COLORS.green }]}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData.slice(2)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={5} />
                  <YAxis tickFormatter={v => fmt(v, 'currency')} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="revPerEmp" name="Overall" stroke={COLORS.amber} strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Burn Rate" subtitle="Monthly cash burn by segment"
              legend={[{ label: 'Total', color: COLORS.red }, { label: 'Vision', color: COLORS.orange }, { label: 'MAIN', color: COLORS.pink }]}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={5} />
                  <YAxis tickFormatter={v => fmt(v, 'currency')} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="burnRate" name="Total" stroke={COLORS.red} strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="burnVision" name="Vision" stroke={COLORS.orange} strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="burnMain" name="MAIN" stroke={COLORS.pink} strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}

      {/* ===== GO-TO-MARKET ===== */}
      {tab === 'gtm' && (
        <>
          <div className="section-header">
            <span className="dot" style={{ background: COLORS.amber }} />
            Go-to-Market KPIs
          </div>
          <div className="kpi-grid">
            <KpiCard label="New Logos / Month" value={kpis.gtm.new_logos_per_month[last]} format="number"
              change={pctChange(kpis.gtm.new_logos_per_month)} color={COLORS.amber} />
            <KpiCard label="Cumulative Logos" value={is.logos_cumulative[last]} format="number"
              color={COLORS.blue} />
            <KpiCard label="Sales Productivity" value={kpis.gtm.sales_productivity[last]} format="number"
              subtitle="Logos per ramped AE per month" color={COLORS.green} />
            <KpiCard label="Vision Customers" value={is.vision_customers_cumulative[last]} format="number"
              color={COLORS.cyan} />
            <KpiCard label="MAIN Customers" value={is.main_customers_cumulative[last]} format="number"
              color={COLORS.purple} />
          </div>

          <div className="chart-grid">
            <ChartCard title="Customer Acquisition" subtitle="Cumulative logos over time">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={5} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip valueFormat="number" />} />
                  <Area type="monotone" dataKey="cumLogos" name="Cumulative Logos" stroke={COLORS.amber} fill={COLORS.amber} fillOpacity={0.15} strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Customer Base by Product" subtitle="Vision vs MAIN cumulative customers"
              legend={[{ label: 'Vision', color: COLORS.cyan }, { label: 'MAIN', color: COLORS.purple }]}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={5} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip valueFormat="number" />} />
                  <Line type="monotone" dataKey="visionCustomers" name="Vision Customers" stroke={COLORS.cyan} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="mainCustomers" name="MAIN Customers" stroke={COLORS.purple} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Installed Base (Units)" subtitle="Cumulative units/subscriptions deployed"
              legend={[{ label: 'Vision Units', color: COLORS.blue }, { label: 'MAIN Subscriptions', color: COLORS.green }]} fullWidth>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={5} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip valueFormat="number" />} />
                  <Area type="monotone" dataKey="visionCumUnits" name="Vision Units" stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.12} strokeWidth={2} />
                  <Area type="monotone" dataKey="mainCumUnits" name="MAIN Subscriptions" stroke={COLORS.green} fill={COLORS.green} fillOpacity={0.12} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}

      {/* ===== DELIVERY & OPS ===== */}
      {tab === 'delivery' && (
        <>
          <div className="section-header">
            <span className="dot" style={{ background: COLORS.purple }} />
            Delivery & Operations KPIs
          </div>
          <div className="kpi-grid">
            <KpiCard label="Units Delivered / Month" value={kpis.delivery.units_delivered_per_month[last]} format="number"
              change={pctChange(kpis.delivery.units_delivered_per_month)} color={COLORS.blue} />
            <KpiCard label="Vision Delivered" value={kpis.delivery.vision_units[last]} format="number"
              color={COLORS.cyan} />
            <KpiCard label="MAIN Delivered" value={kpis.delivery.main_units[last]} format="number"
              color={COLORS.green} />
            <KpiCard label="Order-to-Deploy (wks)" value={kpis.delivery.order_to_deployment_time[last]} format="number"
              subtitle="Weighted avg weeks" color={COLORS.amber} />
            <KpiCard label="Utilization Rate" value={kpis.delivery.utilization_rate[last]} format="percent"
              change={pctChange(kpis.delivery.utilization_rate)} color={COLORS.purple} />
            <KpiCard label="Vision Utilization" value={kpis.delivery.utilization_vision[last]} format="percent"
              color={COLORS.cyan} />
            <KpiCard label="MAIN Utilization" value={kpis.delivery.utilization_main[last]} format="percent"
              color={COLORS.green} />
          </div>

          <div className="chart-grid">
            <ChartCard title="Monthly Delivery Volume" subtitle="Units delivered per month by product"
              legend={[{ label: 'Vision', color: COLORS.cyan }, { label: 'MAIN', color: COLORS.green }]}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={5} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip valueFormat="number" />} />
                  <Bar dataKey="visionUnits" name="Vision" fill={COLORS.cyan} radius={[3, 3, 0, 0]} stackId="a" />
                  <Bar dataKey="mainUnits" name="MAIN" fill={COLORS.green} radius={[3, 3, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Team Utilization" subtitle="Capacity usage across teams"
              legend={[{ label: 'Overall', color: COLORS.purple }, { label: 'Vision', color: COLORS.cyan }, { label: 'MAIN', color: COLORS.green }]}>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={5} />
                  <YAxis tickFormatter={v => `${(v * 100).toFixed(0)}%`} tick={{ fontSize: 11 }} domain={[0, 1]} />
                  <Tooltip content={<CustomTooltip valueFormat="percent" />} />
                  <ReferenceLine y={0.9} stroke={COLORS.red} strokeDasharray="6 3" label={{ value: '90% target', fill: COLORS.red, fontSize: 10 }} />
                  <Line type="monotone" dataKey="utilRate" name="Overall" stroke={COLORS.purple} strokeWidth={2.5} dot={false} />
                  <Line type="monotone" dataKey="utilVision" name="Vision" stroke={COLORS.cyan} strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                  <Line type="monotone" dataKey="utilMain" name="MAIN" stroke={COLORS.green} strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}

      {/* ===== CASH FLOW ===== */}
      {tab === 'cashflow' && (
        <>
          <div className="section-header">
            <span className="dot" style={{ background: COLORS.green }} />
            Cash Flow & Runway
          </div>
          <div className="kpi-grid">
            <KpiCard label="Cash Position" value={cashEnd} format="currency"
              color={cashPositive ? COLORS.green : COLORS.red} />
            <KpiCard label="Monthly Burn" value={kpis.financial.burn_rate[last]} format="currency"
              change={pctChange(kpis.financial.burn_rate.map(Math.abs))} color={COLORS.red} />
            <KpiCard label="Total Collections" value={is.total_collections[last]} format="currency"
              change={pctChange(is.total_collections)} color={COLORS.blue} />
            <KpiCard label="COGS" value={Math.abs(is.cogs[last])} format="currency"
              color={COLORS.orange} />
            <KpiCard label="OPEX" value={Math.abs(is.operating_costs[last])} format="currency"
              color={COLORS.pink} />
            <KpiCard label="Net Cash Flow" value={is.net_operating_cash_flow[last]} format="currency"
              change={pctChange(is.net_operating_cash_flow)} color={COLORS.green} />
            <KpiCard label="Cash Need (Max)" value={Math.min(...is.cash_ending)} format="currency"
              subtitle="Lowest cash point in forecast" color={COLORS.red} />
            <KpiCard label="Breakeven" value={breakevenDate || 'Not yet'} format={null}
              subtitle="First positive net cash flow month" color={COLORS.green} />
          </div>

          <div className="chart-grid">
            <ChartCard title="Cash Position Over Time" subtitle="Cumulative cash balance" fullWidth>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={5} />
                  <YAxis tickFormatter={v => fmt(v, 'currency')} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="#5a5e73" strokeWidth={2} />
                  <Area type="monotone" dataKey="cashEnding" name="Cash Balance" stroke={COLORS.green}
                    fill={COLORS.green} fillOpacity={0.12} strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Revenue vs Costs" subtitle="Collections, COGS, and OPEX breakdown"
              legend={[{ label: 'Collections', color: COLORS.blue }, { label: 'COGS', color: COLORS.orange }, { label: 'OPEX', color: COLORS.pink }]}>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={chartData.slice(2)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={5} />
                  <YAxis tickFormatter={v => fmt(v, 'currency')} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="collections" name="Collections" stroke={COLORS.blue} fill={COLORS.blue} fillOpacity={0.1} strokeWidth={2} />
                  <Line type="monotone" dataKey="cogs" name="COGS" stroke={COLORS.orange} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="opex" name="OPEX" stroke={COLORS.pink} strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Gross Cash Margin" subtitle="Revenue minus cost of goods sold">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData.slice(2)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} interval={5} />
                  <YAxis tickFormatter={v => fmt(v, 'currency')} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="#5a5e73" />
                  <Area type="monotone" dataKey="grossCashMargin" name="Gross Margin ($)" stroke={COLORS.green}
                    fill={COLORS.green} fillOpacity={0.12} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  )
}
