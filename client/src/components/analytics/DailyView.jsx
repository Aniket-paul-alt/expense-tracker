import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import analyticsService from "../../services/analyticsServices";
import { formatCurrency } from "../../utils/formatCurrency";
import { getTodayISO } from "../../utils/dateHelpers";
import BarChartWidget  from "../charts/BarChartWidget";
import PieChartWidget  from "../charts/PieChartWidget";
import StatCard        from "./StatCard";
import SectionCard     from "./SectionCard";
import CategoryList    from "./CategoryList";
import { StatCardSkeleton, ChartSkeleton, ListSkeleton } from "./Skeleton";

const DailyView = ({ symbol }) => {
  const [date, setDate] = useState(getTodayISO());

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", "daily", date],
    queryFn:  () => analyticsService.getDaily(date),
  });

  const d = data?.data;

  // Format hourly data for bar chart
  const hourlyData = (d?.hourlyBreakdown || []).map((h) => ({
    ...h,
    label: `${h.hour}:00`,
  }));

  return (
    <div className="space-y-4">

      {/* Date picker */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-500">Date</label>
        <input
          type="date"
          value={date}
          max={getTodayISO()}
          onChange={(e) => setDate(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg
            outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading ? Array(4).fill(0).map((_, i) => <StatCardSkeleton key={i}/>) : (
          <>
            <StatCard
              label="Total spent"
              value={formatCurrency(d?.summary?.total || 0, symbol)}
              sub={`${d?.summary?.count || 0} transactions`}
              accent="#6366f1"
            />
            <StatCard
              label="Avg per txn"
              value={formatCurrency(d?.summary?.avgPerExpense || 0, symbol)}
              accent="#3b82f6"
            />
            <StatCard
              label="Largest"
              value={formatCurrency(d?.summary?.maxExpense || 0, symbol)}
              accent="#f97316"
            />
            <StatCard
              label="Smallest"
              value={formatCurrency(d?.summary?.minExpense || 0, symbol)}
              accent="#22c55e"
            />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Hourly bar chart */}
        <SectionCard
          title="Spending by hour"
          subtitle="When did you spend today?"
        >
          {isLoading
            ? <ChartSkeleton height={200} />
            : hourlyData.length
              ? <BarChartWidget
                  data={hourlyData}
                  xKey="label"
                  dataKey="total"
                  symbol={symbol}
                  color="#6366f1"
                  height={200}
                />
              : <p className="text-sm text-gray-300 text-center py-12">
                  No expenses on this day
                </p>
          }
        </SectionCard>

        {/* Category pie */}
        <SectionCard
          title="By category"
          subtitle="What did you spend on?"
        >
          {isLoading
            ? <ChartSkeleton height={200} />
            : <PieChartWidget
                data={d?.categoryBreakdown || []}
                symbol={symbol}
                height={200}
                showLegend={false}
              />
          }
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

        <SectionCard title="Top expenses today">
          {isLoading ? <ListSkeleton rows={3}/> : (
            d?.topExpenses?.length
              ? <div className="space-y-3">
                  {d.topExpenses.map((exp, i) => (
                    <div key={exp._id}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                      <span className="w-5 h-5 rounded-full bg-gray-100 flex items-center
                        justify-center text-xs font-semibold text-gray-500">
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
              : <p className="text-sm text-gray-300 text-center py-8">No expenses</p>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default DailyView;