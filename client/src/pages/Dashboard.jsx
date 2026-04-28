import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import analyticsService from "../services/analyticsServices";
import { setAlerts } from "../features/budget/budgetSlice";
import { formatCurrency, formatCompact } from "../utils/formatCurrency";
import { getCategoryIcon, getCategoryColor } from "../utils/categoryColors";
import { formatDate } from "../utils/dateHelpers";
import AreaChartWidget from "../components/charts/AreaChartWidget";
import PieChartWidget from "../components/charts/PieChartWidget";
import Modal from "../components/ui/Modal";
import ExpenseForm from "../components/expenses/ExpenseForm";

// ─── Summary Card ─────────────────────────────────────────────────────────────

const SummaryCard = ({ label, amount, count, symbol, color }) => (
  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 flex flex-col gap-2 transition-colors">
    <div className="flex items-center justify-between">
      <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
        {label}
      </span>
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: color }}
      />
    </div>
    <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
      {formatCurrency(amount, symbol)}
    </p>
    <p className="text-xs text-gray-400">{count} transaction{count !== 1 ? "s" : ""}</p>
  </div>
);

// ─── Skeleton loader ──────────────────────────────────────────────────────────

const Skeleton = ({ className = "" }) => (
  <div className={`bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse ${className}`} />
);

const CardSkeleton = () => (
  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 flex flex-col gap-3">
    <Skeleton className="h-3 w-20" />
    <Skeleton className="h-6 w-32" />
    <Skeleton className="h-3 w-16" />
  </div>
);

// ─── Dashboard ────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const [addOpen, setAddOpen] = useState(false);
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const symbol = user?.currency?.symbol || "₹";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["analytics", "overview"],
    queryFn:  analyticsService.getOverview,
    staleTime: 1000 * 60 * 2, // 2 min cache
  });

  const overview = data?.data;

  // Push budget alerts into Redux so Navbar bell can read them
  useEffect(() => {
    if (overview?.budgetAlerts) {
      dispatch(setAlerts(overview.budgetAlerts));
    }
  }, [overview, dispatch]);

  // Format last7Days data for area chart
  const trendData = (overview?.last7DaysTrend || []).map((d) => ({
    ...d,
    label: d.date
      ? new Date(d.date).toLocaleDateString("en-IN", { weekday: "short" })
      : d.date,
  }));

  const last7DaysTotal = (overview?.last7DaysTrend || []).reduce(
    (sum, d) => sum + (d.total || 0),
    0
  );

  if (isError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-400 text-sm">Failed to load dashboard data.</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-indigo-600 text-sm hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── Greeting ── */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Hello, {user?.name?.split(" ")[0]} 👋
        </h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
          Here's your spending summary
        </p>
      </div>

      {/* ── Budget alert banner ── */}
      {(overview?.budgetAlerts?.length > 0) && (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl px-4 py-3
          flex items-start gap-3">
          <span className="text-red-400 dark:text-red-500 mt-0.5">
            <svg width="16" height="16" fill="none" stroke="currentColor"
              strokeWidth="2" viewBox="0 0 24 24">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0
                1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </span>
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">Budget alert</p>
            <p className="text-xs text-red-500 dark:text-red-400/80 mt-0.5">
              {overview.budgetAlerts
                .map((a) => `${a.category} (${a.percentage}%)`)
                .join(", ")}{" "}
              {overview.budgetAlerts.length === 1 ? "is" : "are"} over limit.
            </p>
          </div>
        </div>
      )}

      {/* ── Summary cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {isLoading ? (
          Array(4).fill(0).map((_, i) => <CardSkeleton key={i}/>)
        ) : (
          <>
            <SummaryCard
              label="Today"
              amount={overview?.summary?.daily?.total || 0}
              count={overview?.summary?.daily?.count || 0}
              symbol={symbol}
              color="#6366f1"
            />
            <SummaryCard
              label="This week"
              amount={overview?.summary?.weekly?.total || 0}
              count={overview?.summary?.weekly?.count || 0}
              symbol={symbol}
              color="#3b82f6"
            />
            <SummaryCard
              label="This month"
              amount={overview?.summary?.monthly?.total || 0}
              count={overview?.summary?.monthly?.count || 0}
              symbol={symbol}
              color="#8b5cf6"
            />
            <SummaryCard
              label="This year"
              amount={overview?.summary?.yearly?.total || 0}
              count={overview?.summary?.yearly?.count || 0}
              symbol={symbol}
              color="#ec4899"
            />
          </>
        )}
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Area chart — last 7 days */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 transition-colors">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Last 7 days</h3>
              <p className="text-xs text-gray-400 dark:text-gray-500">Daily spending trend</p>
            </div>
            {!isLoading && (
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30
                px-2.5 py-1 rounded-full">
                {formatCompact(last7DaysTotal, symbol)} total
              </span>
            )}
          </div>
          {isLoading
            ? <Skeleton className="h-48 w-full" />
            : <AreaChartWidget
                data={trendData}
                xKey="label"
                dataKey="total"
                symbol={symbol}
                height={192}
                color="#6366f1"
              />
          }
        </div>

        {/* Pie chart — this month by category */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 transition-colors">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">This month</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500">By category</p>
          </div>
          {isLoading
            ? <Skeleton className="h-48 w-full" />
            : <PieChartWidget
                data={overview?.categoryBreakdown || []}
                symbol={symbol}
                height={192}
                showLegend={false}
              />
          }
        </div>
      </div>

      {/* ── Bottom row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Category breakdown list */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 transition-colors">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Category breakdown
          </h3>
          {isLoading ? (
            <div className="space-y-3">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                  <Skeleton className="h-3 w-16" />
                </div>
              ))}
            </div>
          ) : overview?.categoryBreakdown?.length ? (
            <div className="space-y-3">
              {overview.categoryBreakdown.slice(0, 6).map((cat) => (
                <div key={cat.category} className="flex items-center gap-3">
                  {/* Icon */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center
                      text-base flex-shrink-0"
                    style={{ backgroundColor: `${getCategoryColor(cat.category)}18` }}
                  >
                    <span style={{ fontSize: "14px" }}>
                      {getCategoryIcon(cat.category)}
                    </span>
                  </div>
                  {/* Bar */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize truncate">
                        {cat.category}
                      </span>
                      <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                        {cat.percentage}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${cat.percentage}%`,
                          backgroundColor: getCategoryColor(cat.category),
                        }}
                      />
                    </div>
                  </div>
                  {/* Amount */}
                  <span className="text-xs font-semibold text-gray-900 dark:text-gray-100 flex-shrink-0">
                    {formatCompact(cat.total, symbol)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-300 dark:text-gray-600 text-center py-8">
              No expenses this month
            </p>
          )}
        </div>

        {/* Top expenses */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 transition-colors">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Top expenses this month
          </h3>
          {isLoading ? (
            <div className="space-y-3">
              {Array(5).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                  <Skeleton className="h-4 w-16" />
                </div>
              ))}
            </div>
          ) : overview?.topExpenses?.length ? (
            <div className="space-y-3">
              {overview.topExpenses.map((expense, i) => (
                <div key={expense._id}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  {/* Rank */}
                  <div className="w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center
                    justify-center text-xs font-semibold text-gray-500 dark:text-gray-400 flex-shrink-0">
                    {i + 1}
                  </div>
                  {/* Icon */}
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${getCategoryColor(expense.category)}18` }}
                  >
                    <span style={{ fontSize: "14px" }}>
                      {getCategoryIcon(expense.category)}
                    </span>
                  </div>
                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate capitalize">
                      {expense.note || expense.category}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {formatDate(expense.date, "dd MMM")} ·{" "}
                      <span className="capitalize">{expense.category}</span>
                    </p>
                  </div>
                  {/* Amount */}
                  <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex-shrink-0">
                    {formatCurrency(expense.amount, symbol)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-300 dark:text-gray-600 text-center py-8">
              No expenses this month
            </p>
          )}
        </div>
      </div>

      {/* ── Floating Action Button (FAB) ── */}
      <button
        onClick={() => setAddOpen(true)}
        className="fixed bottom-24 right-5 md:bottom-10 md:right-10 w-14 h-14 bg-indigo-600 
          hover:bg-indigo-700 text-white rounded-full flex items-center justify-center 
          shadow-lg dark:shadow-none hover:shadow-xl transition-all z-40"
        aria-label="Add expense"
      >
        <img 
          src="/images/wallet.png" 
          alt="Wallet" 
          className="w-8 h-8 object-contain brightness-0 invert cursor-pointer" 
        />
      </button>

      {/* Add expense modal */}
      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add expense"
      >
        <ExpenseForm
          onSuccess={() => setAddOpen(false)}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default Dashboard;