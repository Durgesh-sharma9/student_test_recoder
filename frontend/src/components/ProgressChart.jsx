import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';

/* =========================
   MODERN LIGHT ERP CHART UI
========================= */

const CHART_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

  *{
    box-sizing:border-box;
  }

  .chart-card{
    background:white;

    border-radius:24px;

    overflow:hidden;

    border:1px solid #e2e8f0;

    box-shadow:
      0 4px 20px rgba(15,23,42,0.04),
      0 2px 6px rgba(15,23,42,0.03);

    font-family:'Inter',sans-serif;

    transition:0.2s ease;
  }

  .chart-card:hover{
    transform:translateY(-2px);

    box-shadow:
      0 10px 30px rgba(15,23,42,0.06),
      0 2px 10px rgba(15,23,42,0.04);
  }

  .chart-header{
    padding:20px 22px 16px;

    border-bottom:1px solid #f1f5f9;

    display:flex;
    align-items:center;
    justify-content:space-between;
    gap:12px;
  }

  .chart-header-left{
    display:flex;
    align-items:center;
    gap:12px;
  }

  .chart-icon{
    width:42px;
    height:42px;

    border-radius:14px;

    display:flex;
    align-items:center;
    justify-content:center;

    flex-shrink:0;
  }

  .chart-title{
    font-size:16px;
    font-weight:700;
    color:#0f172a;
    margin-bottom:2px;
  }

  .chart-subtitle{
    font-size:12px;
    color:#64748b;
    font-weight:500;
  }

  .chart-badge{
    padding:6px 12px;

    border-radius:999px;

    font-size:11px;
    font-weight:700;
  }

  .chart-body{
    padding:20px 18px 18px;
  }

  .chart-empty{
    height:240px;

    display:flex;
    flex-direction:column;
    align-items:center;
    justify-content:center;

    gap:12px;

    color:#94a3b8;

    font-size:13px;
    font-weight:500;
  }

  .chart-empty-icon{
    width:56px;
    height:56px;

    border-radius:18px;

    background:#eef2ff;

    display:flex;
    align-items:center;
    justify-content:center;

    font-size:26px;
  }

  .custom-tooltip{
    background:white;

    border:1px solid #e2e8f0;

    border-radius:16px;

    padding:12px 14px;

    box-shadow:
      0 10px 24px rgba(15,23,42,0.08);

    font-family:'Inter',sans-serif;
  }

  .tooltip-label{
    font-size:11px;
    font-weight:700;

    color:#4f46e5;

    margin-bottom:6px;

    text-transform:uppercase;

    letter-spacing:0.5px;
  }

  .tooltip-row{
    font-size:13px;
    color:#0f172a;
    font-weight:600;
    margin-top:3px;
  }

  @media(max-width:768px){

    .chart-header{
      padding:16px;
    }

    .chart-body{
      padding:16px 10px 12px;
    }

    .chart-title{
      font-size:14px;
    }

    .chart-subtitle{
      font-size:11px;
    }
  }
`;

const BAR_COLORS = [
  '#4f46e5',
  '#8b5cf6',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#ef4444',
  '#06b6d4',
];

/* =========================
   CUSTOM TOOLTIP
========================= */

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="custom-tooltip">

      <div className="tooltip-label">
        {label}
      </div>

      {payload.map((p, i) => (

        <div
          key={i}
          className="tooltip-row"
          style={{
            color: p.color || '#0f172a'
          }}
        >
          {p.name}: <strong>{p.value}</strong>
        </div>

      ))}

    </div>
  );
}

/* =========================
   PERCENTAGE LINE CHART
========================= */

export function PercentageLineChart({ data }) {
  return (
    <>
      <style>{CHART_STYLES}</style>

      <div className="chart-card">

        <div className="chart-header">

          <div className="chart-header-left">

            <div
              className="chart-icon"
              style={{
                background:'#eef2ff',
                color:'#4f46e5'
              }}
            >
              📈
            </div>

            <div>

              <div className="chart-title">
                Percentage Progress
              </div>

              <div className="chart-subtitle">
                Student performance overview
              </div>

            </div>

          </div>

          <div
            className="chart-badge"
            style={{
              background:'#eef2ff',
              color:'#4f46e5'
            }}
          >
            {data?.length || 0} Tests
          </div>

        </div>

        <div className="chart-body">

          {!data?.length ? (

            <div className="chart-empty">

              <div className="chart-empty-icon">
                📊
              </div>

              No performance data available

            </div>

          ) : (

            <ResponsiveContainer width="100%" height={300}>

              <LineChart
                data={data.map((d) => ({
                  name: d.testName,
                  percentage: d.percentage,
                  rank: d.rank,
                }))}
                margin={{
                  top: 10,
                  right: 10,
                  left: -15,
                  bottom: 0,
                }}
              >

                <defs>

                  <linearGradient
                    id="lineGradient"
                    x1="0"
                    y1="0"
                    x2="1"
                    y2="0"
                  >
                    <stop offset="0%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>

                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#f1f5f9"
                  vertical={false}
                />

                <XAxis
                  dataKey="name"
                  tick={{
                    fontSize: 11,
                    fill: '#64748b',
                  }}
                  axisLine={false}
                  tickLine={false}
                />

                <YAxis
                  domain={[0, 100]}
                  tick={{
                    fontSize: 11,
                    fill: '#64748b',
                  }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v}%`}
                />

                <Tooltip content={<ChartTooltip />} />

                <Line
                  type="monotone"
                  dataKey="percentage"
                  name="Percentage"
                  stroke="url(#lineGradient)"
                  strokeWidth={4}
                  dot={{
                    r: 5,
                    fill: '#4f46e5',
                    stroke: '#fff',
                    strokeWidth: 3,
                  }}
                  activeDot={{
                    r: 7,
                    fill: '#8b5cf6',
                    stroke: '#fff',
                    strokeWidth: 2,
                  }}
                />

              </LineChart>

            </ResponsiveContainer>

          )}

        </div>

      </div>
    </>
  );
}

/* =========================
   RANK BAR CHART
========================= */

export function RankBarChart({ data }) {

  if (!data?.length) return null;

  const chartData = data.map((d) => ({
    name: d.testName,
    rank: d.rank,
  }));

  return (
    <>
      <style>{CHART_STYLES}</style>

      <div className="chart-card">

        <div className="chart-header">

          <div className="chart-header-left">

            <div
              className="chart-icon"
              style={{
                background:'#ecfdf5',
                color:'#10b981'
              }}
            >
              🏆
            </div>

            <div>

              <div className="chart-title">
                Rank Analysis
              </div>

              <div className="chart-subtitle">
                Lower rank means better performance
              </div>

            </div>

          </div>

          <div
            className="chart-badge"
            style={{
              background:'#ecfdf5',
              color:'#10b981'
            }}
          >
            {data.length} Tests
          </div>

        </div>

        <div className="chart-body">

          <ResponsiveContainer width="100%" height={260}>

            <BarChart
              data={chartData}
              margin={{
                top: 10,
                right: 10,
                left: -15,
                bottom: 0,
              }}
            >

              <defs>

                {BAR_COLORS.map((color, i) => (

                  <linearGradient
                    key={i}
                    id={`barGradient${i}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={color}
                    />

                    <stop
                      offset="100%"
                      stopColor={color}
                      stopOpacity="0.6"
                    />
                  </linearGradient>

                ))}

              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                vertical={false}
              />

              <XAxis
                dataKey="name"
                tick={{
                  fontSize: 11,
                  fill: '#64748b',
                }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                reversed
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
                tick={{
                  fontSize: 11,
                  fill: '#64748b',
                }}
              />

              <Tooltip content={<ChartTooltip />} />

              <Bar
                dataKey="rank"
                name="Rank"
                radius={[10, 10, 0, 0]}
                maxBarSize={54}
              >

                {chartData.map((_, i) => (

                  <Cell
                    key={i}
                    fill={`url(#barGradient${i % BAR_COLORS.length})`}
                  />

                ))}

              </Bar>

            </BarChart>

          </ResponsiveContainer>

        </div>

      </div>
    </>
  );
}