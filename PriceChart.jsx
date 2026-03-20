// frontend/src/components/PriceChart.jsx
import {
  ComposedChart, Area, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';

// ── Custom tooltip ─────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-bg-card border border-bg-border rounded-lg p-3 shadow-2xl text-xs font-mono">
      <p className="text-text-muted mb-2">{label}</p>
      {payload.map((entry) => (
        entry.value != null && (
          <div key={entry.dataKey} className="flex items-center justify-between gap-4">
            <span style={{ color: entry.color }} className="flex items-center gap-1.5">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}
            </span>
            <span className="text-text-primary font-semibold">
              ${Number(entry.value).toFixed(2)}
            </span>
          </div>
        )
      ))}
    </div>
  );
}

// ── Main chart ─────────────────────────────────────────────────────────────────
export default function PriceChart({ predictionData, height = 380 }) {
  if (!predictionData) return null;

  const { history = [], predictions = [], confidence_bands = [], ticker } = predictionData;

  // Merge history + predictions into one series for seamless rendering
  const historicalPoints = history.map((h) => ({
    date: h.date,
    actual: h.price,
    label: formatDate(h.date),
    isPrediction: false,
  }));

  // Create a bridge point (last historical = first prediction anchor)
  const lastActual = history[history.length - 1];

  const predictionPoints = predictions.map((p, i) => {
    const band = confidence_bands[i];
    return {
      date: p.date,
      predicted: p.price,
      upper: band?.upper,
      lower: band?.lower,
      label: formatDate(p.date),
      isPrediction: true,
    };
  });

  // Attach bridge to first prediction point
  if (lastActual && predictionPoints.length) {
    predictionPoints[0] = {
      ...predictionPoints[0],
      actual: lastActual.price, // bridge point
    };
  }

  const chartData = [...historicalPoints, ...predictionPoints];

  // Y-axis domain with 5% padding
  const allPrices = chartData.flatMap((d) =>
    [d.actual, d.predicted, d.upper, d.lower].filter(Boolean)
  );
  const minPrice = Math.min(...allPrices) * 0.975;
  const maxPrice = Math.max(...allPrices) * 1.025;

  // Divider index
  const splitDate = lastActual?.date;

  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 8 }}>
          <defs>
            <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#00d4ff" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#00d4ff" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#00ff88" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#00ff88" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#a855f7" stopOpacity={0.08} />
              <stop offset="95%" stopColor="#a855f7" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(30,45,69,0.8)"
            vertical={false}
          />

          <XAxis
            dataKey="label"
            tick={{ fill: '#8899bb', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={{ stroke: '#1e2d45' }}
            interval="preserveStartEnd"
          />

          <YAxis
            domain={[minPrice, maxPrice]}
            tick={{ fill: '#8899bb', fontSize: 10, fontFamily: 'JetBrains Mono' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `$${v.toFixed(0)}`}
            width={56}
          />

          <Tooltip content={<ChartTooltip />} />

          {/* Confidence band — rendered as two areas */}
          <Area
            dataKey="upper"
            name="Upper Band"
            stroke="none"
            fill="url(#bandGrad)"
            fillOpacity={1}
            legendType="none"
            connectNulls
            dot={false}
            activeDot={false}
          />
          <Area
            dataKey="lower"
            name="Lower Band"
            stroke="none"
            fill="url(#bandGrad)"
            fillOpacity={1}
            legendType="none"
            connectNulls
            dot={false}
            activeDot={false}
          />

          {/* Historical price */}
          <Area
            dataKey="actual"
            name="Actual"
            stroke="#00d4ff"
            strokeWidth={2}
            fill="url(#actualGrad)"
            fillOpacity={1}
            dot={false}
            activeDot={{ r: 4, fill: '#00d4ff', strokeWidth: 0 }}
            connectNulls
          />

          {/* Predicted price */}
          <Line
            dataKey="predicted"
            name="Predicted"
            stroke="#00ff88"
            strokeWidth={2}
            strokeDasharray="6 3"
            dot={false}
            activeDot={{ r: 4, fill: '#00ff88', strokeWidth: 0 }}
            connectNulls
          />

          {/* Divider between history and prediction */}
          {splitDate && (
            <ReferenceLine
              x={formatDate(splitDate)}
              stroke="rgba(255,181,71,0.4)"
              strokeDasharray="4 4"
              label={{
                value: 'Today',
                position: 'insideTopRight',
                fill: '#ffb547',
                fontSize: 10,
                fontFamily: 'JetBrains Mono',
              }}
            />
          )}

          <Legend
            wrapperStyle={{ paddingTop: '12px' }}
            formatter={(value) => (
              <span style={{ color: '#8899bb', fontSize: '11px', fontFamily: 'Inter' }}>
                {value}
              </span>
            )}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function formatDate(dateStr) {
  try {
    return format(parseISO(dateStr), 'MMM d');
  } catch {
    return dateStr;
  }
}
