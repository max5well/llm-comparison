import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

interface MetricChartProps {
  title: string;
  data: Array<{
    model: string;
    value: number | null;
    [key: string]: any;
  }>;
  metricName: string;
  formatValue?: (value: number) => string;
  chartType?: 'bar' | 'line';
  color?: string;
  yAxisDomain?: [number, number];
  className?: string;
}

export const MetricChart: React.FC<MetricChartProps> = ({
  title,
  data,
  metricName,
  formatValue,
  chartType = 'bar',
  color = '#3B82F6',
  yAxisDomain,
  className,
}) => {
  const chartData = data.map((item) => ({
    model: item.model.length > 20 ? `${item.model.substring(0, 20)}...` : item.model,
    value: item.value ?? 0,
    fullModel: item.model,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-semibold text-gray-900">{data.fullModel}</p>
          <p className="text-sm text-gray-600">
            {metricName}:{' '}
            <span className="font-medium">
              {formatValue
                ? formatValue(payload[0].value)
                : payload[0].value.toFixed(2)}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`card ${className || ''}`}>
      <h3 className="text-lg font-semibold mb-4 text-gray-900">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        {chartType === 'bar' ? (
          <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="model"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 12 }}
              stroke="#6B7280"
            />
            <YAxis
              domain={yAxisDomain || [0, 'auto']}
              tick={{ fontSize: 12 }}
              stroke="#6B7280"
            />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="value" fill={color} radius={[8, 8, 0, 0]} />
          </BarChart>
        ) : (
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="model"
              angle={-45}
              textAnchor="end"
              height={80}
              tick={{ fontSize: 12 }}
              stroke="#6B7280"
            />
            <YAxis
              domain={yAxisDomain || [0, 'auto']}
              tick={{ fontSize: 12 }}
              stroke="#6B7280"
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={{ fill: color, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

