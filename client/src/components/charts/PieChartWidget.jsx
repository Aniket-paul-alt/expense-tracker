import {
  PieChart, Pie, Cell, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { getCategoryColor } from "../../utils/categoryColors";
import { formatCompact } from "../../utils/formatCurrency";

const CustomTooltip = ({ active, payload, symbol }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-lg shadow-sm px-3 py-2 text-xs">
      <p className="font-medium text-gray-800 dark:text-gray-200 capitalize mb-0.5">{d.category}</p>
      <p className="text-gray-900 dark:text-gray-100 font-semibold">
        {symbol}{Number(d.total).toLocaleString("en-IN")}
      </p>
      <p className="text-gray-400 dark:text-gray-500">{d.percentage}%</p>
    </div>
  );
};

const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }) => {
  if (percentage < 6) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle"
      dominantBaseline="central" fontSize={11} fontWeight={500}>
      {`${percentage}%`}
    </text>
  );
};

const PieChartWidget = ({
  data = [],
  symbol = "₹",
  height = 240,
  showLegend = true,
}) => {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center text-gray-300 text-sm"
        style={{ height }}>
        No data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="category"
          cx="50%"
          cy="50%"
          outerRadius={90}
          labelLine={false}
          label={renderCustomLabel}
        >
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={getCategoryColor(entry.category)}
              stroke="white"
              strokeWidth={2}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip symbol={symbol}/>}/>
        {showLegend && (
          <Legend
            formatter={(value) => (
              <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">{value}</span>
            )}
            iconSize={8}
            iconType="circle"
          />
        )}
      </PieChart>
    </ResponsiveContainer>
  );
};

export default PieChartWidget;