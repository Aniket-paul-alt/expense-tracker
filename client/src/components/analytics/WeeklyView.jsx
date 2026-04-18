import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import analyticsService from "../../services/analyticsServices";
import { formatCurrency } from "../../utils/formatCurrency";
import { getTodayISO } from "../../utils/dateHelpers";
import { getCategoryColor } from "../../utils/categoryColors";
import BarChartWidget  from "../charts/BarChartWidget";
import PieChartWidget  from "../charts/PieChartWidget";
import StatCard        from "./StatCard";
import SectionCard     from "./SectionCard";
import CategoryList    from "./CategoryList";
import { StatCardSkeleton, ChartSkeleton, ListSkeleton } from "./Skeleton";

// Get Monday of the current week
const getThisMonday = () => {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  return monday.toISOString().split("T")[0];
};

const WeeklyView = ({ symbol }) => {
  const [weekStart, setWeekStart] = useState(getThisMonday());

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "weekly", weekStart],
    queryFn:  () => analyticsService.getWeekly(weekStart),
  });

  const d = data?.data;

  // Payment method colors
  const pmColors = ["#6366f1", "#3b82f6", "#f97316", "#22c55e", "#ec4899", "#eab308"];

  return (
    <div className="space-y-4">

      {/* Week picker */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-500 dark:text-gray-400">Week starting</label>
        <input
          type="date"
          value={weekStart}
          max={getTodayISO()}
          onChange={(e) => setWeekStart(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-700 rounded-lg
            outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors"
        />
        {d && (
          <span className="text-xs text-gray-400">
            {d.weekStart} → {d.weekEnd}
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading ? Array(4).fill(0).map((_, i) => <StatCardSkeleton key={i}/>) : (
          <>
            <StatCard
              label="Week total"
              value={formatCurrency(d?.summary?.total || 0, symbol)}
              sub={`${d?.summary?.count || 0} transactions`}
              accent="#6366f1"
            />
            <StatCard
              label="Daily average"
              value={formatCurrency((d?.summary?.total || 0) / 7, symbol)}
              sub="per day"
              accent="#3b82f6"
            />
            <StatCard
              label="Avg per txn"
              value={formatCurrency(d?.summary?.avgPerExpense || 0, symbol)}
              accent="#f97316"
            />
            <StatCard
              label="Categories"
              value={d?.categoryBreakdown?.length || 0}
              sub="active this week"
              accent="#22c55e"
            />
          </>
        )}
      </div>

      {/* Day-by-day bar chart */}
      <SectionCard
        title="Day by day"
        subtitle="Spending for each day this week"
      >
        {isLoading
          ? <ChartSkeleton height={220} />
          : <BarChartWidget
              data={d?.dailyBreakdown || []}
              xKey="dayName"
              dataKey="total"
              symbol={symbol}
              height={220}
              color="#6366f1"
            />
        }
      </SectionCard>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Category list */}
        <div className="lg:col-span-2">
          <SectionCard title="Category breakdown" subtitle="This week">
            {isLoading
              ? <ListSkeleton />
              : <CategoryList data={d?.categoryBreakdown || []} symbol={symbol} />
            }
          </SectionCard>
        </div>

        {/* Payment methods */}
        <SectionCard title="Payment methods">
          {isLoading ? <ListSkeleton rows={4}/> : (
            d?.paymentMethods?.length
              ? <div className="space-y-3">
                  {d.paymentMethods.map((pm, i) => (
                    <div key={pm.method} className="flex items-center gap-3">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: pmColors[i % pmColors.length] }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize">
                            {pm.method}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">{pm.count} txn</span>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                        {formatCurrency(pm.total, symbol)}
                      </span>
                    </div>
                  ))}
                </div>
              : <p className="text-sm text-gray-300 text-center py-8">No data</p>
          )}
        </SectionCard>
      </div>

      {/* Category pie */}
      <SectionCard title="Category split" subtitle="Visual breakdown for this week">
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
  );
};

export default WeeklyView;