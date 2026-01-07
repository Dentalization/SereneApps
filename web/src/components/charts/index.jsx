import React from 'react';

/**
 * Simple Line Chart Component
 * Displays trend data as a line chart with gradient fill
 */
const LineChart = ({ data, height = 200, color = '#6366f1' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value || 0));
  const minValue = Math.min(...data.map(d => d.value || 0));
  const range = maxValue - minValue || 1;

  const width = 100;
  const padding = 10;
  const chartWidth = width - (padding * 2);
  const chartHeight = height - (padding * 2);

  // Calculate points
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((d.value - minValue) / range) * chartHeight;
    return { x, y, value: d.value, label: d.label };
  });

  // Create path string
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`;

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
        {/* Gradient definition */}
        <defs>
          <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.3 }} />
            <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
          </linearGradient>
        </defs>

        {/* Area under the line */}
        <path
          d={areaPath}
          fill={`url(#gradient-${color})`}
          className="transition-all duration-300"
        />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke={color}
          strokeWidth="0.5"
          className="transition-all duration-300"
        />

        {/* Data points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r="1"
              fill={color}
              className="transition-all duration-300 hover:r-1.5"
            />
            {/* Label on hover */}
            <title>{`${p.label}: ${p.value.toLocaleString()}`}</title>
          </g>
        ))}
      </svg>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 px-2">
        {data.map((d, i) => (
          <span
            key={i}
            className="text-xs text-muted-foreground"
            style={{ width: `${100 / data.length}%`, textAlign: 'center' }}
          >
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
};

/**
 * Simple Bar Chart Component
 * Displays categorical data as vertical bars
 */
export const BarChart = ({ data, height = 200, colors = ['#6366f1', '#10b981', '#f59e0b'] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-muted-foreground">No data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value || 0));

  return (
    <div className="w-full" style={{ height: `${height}px` }}>
      <div className="flex items-end justify-around h-full gap-2 px-4">
        {data.map((item, i) => {
          const barHeight = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          const color = colors[i % colors.length];

          return (
            <div key={i} className="flex flex-col items-center flex-1 max-w-20">
              {/* Value label */}
              <span className="text-xs font-medium text-primary mb-1">
                {item.value.toLocaleString()}
              </span>

              {/* Bar */}
              <div className="w-full flex items-end" style={{ height: '80%' }}>
                <div
                  className="w-full rounded-t-lg transition-all duration-500 hover:opacity-80"
                  style={{
                    height: `${barHeight}%`,
                    backgroundColor: color
                  }}
                  title={`${item.label}: ${item.value}`}
                />
              </div>

              {/* Label */}
              <span className="text-xs text-muted-foreground mt-2 text-center truncate w-full">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * Progress Ring Component
 * Displays a single metric as a circular progress indicator
 */
export const ProgressRing = ({ 
  value = 0, 
  max = 100, 
  size = 120, 
  strokeWidth = 8,
  color = '#6366f1',
  label,
  showPercentage = true
}) => {
  const percentage = max > 0 ? (value / max) * 100 : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-muted/20"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
        {/* Center text */}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dy=".3em"
          className="transform rotate-90 text-xl font-bold fill-primary"
          style={{ transformOrigin: 'center' }}
        >
          {showPercentage ? `${percentage.toFixed(0)}%` : value.toLocaleString()}
        </text>
      </svg>
      {label && (
        <p className="text-sm text-muted-foreground mt-2 text-center">{label}</p>
      )}
    </div>
  );
};

export default LineChart;
