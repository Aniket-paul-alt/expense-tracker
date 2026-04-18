import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import analyticsService from "../../services/analyticsServices";
import { formatCurrency, formatCompact } from "../../utils/formatCurrency";
import { getCategoryColor } from "../../utils/categoryColors";
import BarChartWidget  from "../charts/BarChartWidget";
import PieChartWidget  from "../charts/PieChartWidget";
import StatCard        from "./StatCard";
import SectionCard     from "./SectionCard";
import CategoryList    from "./CategoryList";
import ComparisonBadge from "./ComparisonBadge";
import { StatCardSkeleton, ChartSkeleton, ListSkeleton } from "./Skeleton";

const YearlyView = ({ symbol }) => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "yearly", year],
    queryFn:  () => analyticsService.getYearly(year),
  });

  const d = data?.data;

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  // Format monthly breakdown for bar chart
  const monthlyData = (d?.monthlyBreakdown || []).map((m) => ({
    ...m,
    label: m.monthName,
    isPeak: m.month === d?.peakMonth?.month,
  }));

  // Color bars — highlight the peak month
  const barColors = monthlyData.map((m) =>
    m.isPeak ? "#6366f1" : "#e0e7ff"
  );

  return (
    <div className="space-y-4">

      {/* Year picker */}
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm text-gray-500 dark:text-gray-400">Year</label>
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg
            outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors"
        >
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        {!isLoading && d?.comparison && (
          <ComparisonBadge
            changePercent={d.comparison.changePercent}
            trend={d.comparison.trend}
          />
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading ? Array(4).fill(0).map((_, i) => <StatCardSkeleton key={i}/>) : (
          <>
            <StatCard
              label="Year total"
              value={formatCurrency(d?.summary?.total || 0, symbol)}
              sub={`${d?.summary?.count || 0} transactions`}
              accent="#6366f1"
            />
            <StatCard
              label="Monthly average"
              value={formatCurrency((d?.summary?.total || 0) / 12, symbol)}
              sub="per month"
              accent="#3b82f6"
            />
            <StatCard
              label="Peak month"
              value={d?.peakMonth?.monthName || "—"}
              sub={d?.peakMonth?.total
                ? formatCurrency(d.peakMonth.total, symbol)
                : "No data"}
              accent="#f97316"
            />
            <StatCard
              label="Categories used"
              value={d?.categoryBreakdown?.length || 0}
              sub={`this year`}
              accent="#22c55e"
            />
          </>
        )}
      </div>

      {/* Month-over-month bar chart */}
      <SectionCard
        title={`Month by month — ${year}`}
        subtitle="Peak month highlighted in indigo"
      >
        {isLoading
          ? <ChartSkeleton height={240} />
          : <BarChartWidget
              data={monthlyData}
              xKey="label"
              dataKey="total"
              symbol={symbol}
              height={240}
              colors={barColors}
            />
        }
      </SectionCard>

      {/* vs last year comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Comparison bar */}
        <SectionCard
          title="vs Last year"
          subtitle={`${year - 1} vs ${year}`}
        >
          {isLoading ? <ChartSkeleton height={200}/> : (
            <div className="space-y-4">
              <BarChartWidget
                data={[
                  { label: String(year - 1), total: d?.comparison?.previousTotal || 0 },
                  { label: String(year),      total: d?.comparison?.currentTotal  || 0 },
                ]}
                xKey="label"
                dataKey="total"
                symbol={symbol}
                height={150}
                colors={["#e5e7eb", "#6366f1"]}
              />
              <div className="flex gap-6 pt-1 border-t border-gray-50 dark:border-gray-800">
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{year - 1}</p>
                  <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                    {formatCompact(d?.comparison?.previousTotal || 0, symbol)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{year}</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {formatCompact(d?.comparison?.currentTotal || 0, symbol)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </SectionCard>

        {/* Category pie */}
        <div className="lg:col-span-2">
          <SectionCard title="Category split" subtitle={`Full year ${year}`}>
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
        </div>
      </div>

      {/* Category list + top 10 expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <SectionCard title="Category breakdown" subtitle={`All of ${year}`}>
          {isLoading
            ? <ListSkeleton />
            : <CategoryList
                data={d?.categoryBreakdown || []}
                symbol={symbol}
                limit={10}
              />
          }
        </SectionCard>

        <SectionCard title={`Top 10 expenses of ${year}`}>
          {isLoading ? <ListSkeleton rows={8}/> : (
            d?.topExpenses?.length
              ? <div className="space-y-2.5">
                  {d.topExpenses.map((exp, i) => (
                    <div key={exp._id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <span className="w-5 h-5 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center
                        justify-center text-xs font-semibold text-gray-400 dark:text-gray-500 flex-shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 capitalize truncate">
                          {exp.note || exp.category}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">
                          {exp.category} · {new Date(exp.date).toLocaleDateString("en-IN", {
                            day: "numeric", month: "short"
                          })}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-shrink-0">
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

export default YearlyView;