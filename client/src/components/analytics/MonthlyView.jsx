import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import analyticsService from "../../services/analyticsServices";
import { formatCurrency } from "../../utils/formatCurrency";
import AreaChartWidget from "../charts/AreaChartWidget";
import BarChartWidget  from "../charts/BarChartWidget";
import PieChartWidget  from "../charts/PieChartWidget";
import StatCard        from "./StatCard";
import SectionCard     from "./SectionCard";
import CategoryList    from "./CategoryList";
import ComparisonBadge from "./ComparisonBadge";
import { StatCardSkeleton, ChartSkeleton, ListSkeleton } from "./Skeleton";

const MONTHS = [
  "Jan","Feb","Mar","Apr","May","Jun",
  "Jul","Aug","Sep","Oct","Nov","Dec",
];

const MonthlyView = ({ symbol }) => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear]   = useState(now.getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "monthly", month, year],
    queryFn:  () => analyticsService.getMonthly(month, year),
  });

  const d = data?.data;

  // Format daily trend for area chart
  const trendData = (d?.dailyTrend || []).map((t) => ({
    ...t,
    label: t.date ? new Date(t.date).getDate().toString() : "",
  }));

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="space-y-4">

      {/* Month + Year pickers */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm text-gray-500">Period</label>
        <select
          value={month}
          onChange={(e) => setMonth(Number(e.target.value))}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg
            outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          {MONTHS.map((m, i) => (
            <option key={m} value={i + 1}>{m}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg
            outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        {/* Comparison badge */}
        {!isLoading && d?.comparison && (
          <ComparisonBadge
            changePercent={d.comparison.changePercent}
            trend={d.comparison.trend}
          />
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading ? Array(4).fill(0).map((_, i) => <StatCardSkeleton key={i}/>) : (
          <>
            <StatCard
              label="Month total"
              value={formatCurrency(d?.summary?.total || 0, symbol)}
              sub={`${d?.summary?.count || 0} transactions`}
              accent="#6366f1"
            />
            <StatCard
              label="Daily average"
              value={formatCurrency(
                (d?.summary?.total || 0) / new Date(year, month, 0).getDate(),
                symbol
              )}
              sub="per day"
              accent="#3b82f6"
            />
            <StatCard
              label="Avg per txn"
              value={formatCurrency(d?.summary?.avgPerExpense || 0, symbol)}
              accent="#f97316"
            />
            <StatCard
              label="Biggest expense"
              value={formatCurrency(d?.summary?.maxExpense || 0, symbol)}
              accent="#ec4899"
            />
          </>
        )}
      </div>

      {/* Daily trend area chart */}
      <SectionCard
        title={`Daily trend — ${MONTHS[month - 1]} ${year}`}
        subtitle="Spending per day this month"
      >
        {isLoading
          ? <ChartSkeleton height={220} />
          : <AreaChartWidget
              data={trendData}
              xKey="label"
              dataKey="total"
              symbol={symbol}
              height={220}
              color="#6366f1"
            />
        }
      </SectionCard>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Category pie */}
        <SectionCard title="Category split">
          {isLoading
            ? <ChartSkeleton height={240} />
            : <PieChartWidget
                data={d?.categoryBreakdown || []}
                symbol={symbol}
                height={240}
                showLegend={true}
              />
          }
        </SectionCard>

        {/* vs last month */}
        <SectionCard
          title="vs Last month"
          subtitle="How this month compares"
        >
          {isLoading ? <ChartSkeleton height={240}/> : (
            <div className="space-y-5">
              {/* Bar comparison */}
              <BarChartWidget
                data={[
                  {
                    label: "Last month",
                    total: d?.comparison?.previousTotal || 0,
                  },
                  {
                    label: "This month",
                    total: d?.comparison?.currentTotal || 0,
                  },
                ]}
                xKey="label"
                dataKey="total"
                symbol={symbol}
                height={160}
                colors={["#e5e7eb", "#6366f1"]}
              />
              {/* Text summary */}
              <div className="flex gap-4 pt-1 border-t border-gray-50">
                <div>
                  <p className="text-xs text-gray-400">Last month</p>
                  <p className="text-sm font-semibold text-gray-700">
                    {formatCurrency(d?.comparison?.previousTotal || 0, symbol)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">This month</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {formatCurrency(d?.comparison?.currentTotal || 0, symbol)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Category list + top expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Category breakdown">
          {isLoading
            ? <ListSkeleton />
            : <CategoryList data={d?.categoryBreakdown || []} symbol={symbol} />
          }
        </SectionCard>

        <SectionCard title="Top expenses this month">
          {isLoading ? <ListSkeleton rows={5}/> : (
            d?.topExpenses?.length
              ? <div className="space-y-3">
                  {d.topExpenses.map((exp, i) => (
                    <div key={exp._id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center
                        justify-center text-xs font-semibold text-gray-400">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 capitalize truncate">
                          {exp.note || exp.category}
                        </p>
                        <p className="text-xs text-gray-400 capitalize">{exp.category}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(exp.amount, symbol)}
                      </p>
                    </div>
                  ))}
                </div>
              : <p className="text-sm text-gray-300 text-center py-8">No data</p>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default MonthlyView;