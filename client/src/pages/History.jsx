import { useState, useMemo } from "react";
import { isToday, isYesterday, format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector, useDispatch } from "react-redux";
import toast from "react-hot-toast";
import expenseService from "../services/expenseServices";
import { setPage } from "../features/expense/expenseSlice";
import FilterBar    from "../components/expenses/FilterBar";
import ExpenseCard  from "../components/expenses/ExpenseCard";
import ExpenseForm  from "../components/expenses/ExpenseForm";
import Modal        from "../components/ui/Modal";
import ConfirmDialog from "../components/ui/ConfirmDialog";

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Groups expenses by their calendar date (YYYY-MM-DD key, ordered newest first)
const groupExpensesByDate = (expenses) => {
  const groups = {};
  expenses.forEach((e) => {
    const key = format(new Date(e.date), "yyyy-MM-dd");
    if (!groups[key]) groups[key] = { key, date: new Date(e.date), items: [] };
    groups[key].items.push(e);
  });
  // Return pre-sorted (backend already sorts desc, so insertion order is correct)
  return Object.values(groups);
};

const getDateLabel = (date) => {
  if (isToday(date))     return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "EEEE, dd MMM yyyy"); // e.g. "Monday, 20 Apr 2025"
};

// ─── Date Section Header ─────────────────────────────────────────────────────

const DateHeader = ({ date, items }) => {
  const total = items.reduce((sum, e) => sum + e.amount, 0);
  const label = getDateLabel(date);
  const isSpecial = isToday(date) || isYesterday(date);

  return (
    <div className="flex items-center justify-between px-4 py-2
      bg-gray-50/80 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800/60">
      <div className="flex items-center gap-2">
        {isSpecial && (
          <span className={`w-1.5 h-1.5 rounded-full ${
            isToday(date) ? "bg-indigo-500" : "bg-amber-400"
          }`}/>
        )}
        <span className={`text-xs font-semibold tracking-wide ${
          isSpecial
            ? "text-gray-700 dark:text-gray-300"
            : "text-gray-400 dark:text-gray-500 uppercase"
        }`}>
          {label}
        </span>
      </div>
      <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">
        ₹{total.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
      </span>
    </div>
  );
};

// ─── Skeleton row ──────────────────────────────────────────────────────────────

const RowSkeleton = () => (
  <div className="flex items-center gap-3 p-3">
    <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse flex-shrink-0"/>
    <div className="flex-1 space-y-2">
      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-40"/>
      <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-56"/>
    </div>
    <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-16"/>
  </div>
);

// ─── Pagination ───────────────────────────────────────────────────────────────

const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.totalPages <= 1) return null;
  const { currentPage, totalPages, totalCount } = pagination;

  return (
    <div className="flex items-center justify-between px-1">
      <p className="text-xs text-gray-400 dark:text-gray-500">
        {totalCount} transaction{totalCount !== 1 ? "s" : ""}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!pagination.hasPrevPage}
          className="w-8 h-8 flex items-center justify-center rounded-lg
            border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 disabled:opacity-40
            hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm"
        >
          ‹
        </button>

        {/* Page numbers */}
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter((p) => p === 1 || p === totalPages ||
            Math.abs(p - currentPage) <= 1)
          .reduce((acc, p, i, arr) => {
            if (i > 0 && p - arr[i - 1] > 1) {
              acc.push("...");
            }
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === "..." ? (
              <span key={`dots-${i}`} className="w-8 text-center text-xs text-gray-400 dark:text-gray-500">
                …
              </span>
            ) : (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition
                  ${p === currentPage
                    ? "bg-indigo-600 text-white"
                    : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                  }`}
              >
                {p}
              </button>
            )
          )
        }

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!pagination.hasNextPage}
          className="w-8 h-8 flex items-center justify-center rounded-lg
            border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 disabled:opacity-40
            hover:bg-gray-50 dark:hover:bg-gray-800 transition text-sm"
        >
          ›
        </button>
      </div>
    </div>
  );
};

// ─── History Page ─────────────────────────────────────────────────────────────

const History = () => {
  const dispatch     = useDispatch();
  const queryClient  = useQueryClient();
  const filters      = useSelector((state) => state.expenses.filters);
  const { user }     = useSelector((state) => state.auth);

  const [addOpen,     setAddOpen]     = useState(false);
  const [editExpense, setEditExpense] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // ── Fetch expenses ──
  const { data, isLoading } = useQuery({
    queryKey: ["expenses", filters],
    queryFn:  () => expenseService.getAll(filters),
    keepPreviousData: true,
  });

  const expenses      = data?.data || [];
  const pagination    = data?.pagination;
  const groupedByDate = useMemo(() => groupExpensesByDate(expenses), [expenses]);

  // ── Delete mutation ──
  const deleteMutation = useMutation({
    mutationFn: (id) => expenseService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Expense deleted");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.message || "Failed to delete"),
  });

  // ── CSV Export ──
  const handleExport = async () => {
    try {
      setExportLoading(true);
      const blob = await expenseService.exportCSV(filters);
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `expenses-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV downloaded!");
    } catch {
      toast.error("Export failed. No expenses match your filters.");
    } finally {
      setExportLoading(false);
    }
  };

  return (
    <div className="space-y-4">

      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((p) => !p)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border
              text-sm font-medium transition
              ${showFilters
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
              }`}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor"
              strokeWidth="2" viewBox="0 0 24 24">
              <line x1="4" y1="6" x2="20" y2="6"/>
              <line x1="8" y1="12" x2="16" y2="12"/>
              <line x1="11" y1="18" x2="13" y2="18"/>
            </svg>
            Filters
            {!showFilters && (filters.category || filters.startDate ||
              filters.search || filters.paymentMethod) && (
              <span className="w-2 h-2 rounded-full bg-indigo-500"/>
            )}
          </button>

          {/* Export */}
          <button
            onClick={handleExport}
            disabled={exportLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border
              border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 text-sm font-medium
              hover:bg-gray-50 dark:hover:bg-gray-800 transition disabled:opacity-60"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor"
              strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            {exportLoading ? "Exporting..." : "Export CSV"}
          </button>
        </div>

        {/* Add expense */}
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600
            hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor"
            strokeWidth="2.5" viewBox="0 0 24 24">
            <line x1="12" y1="5" x2="12" y2="19"/>
            <line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add expense
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && <FilterBar />}

      {/* Expense list */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 overflow-hidden transition-colors">

        {/* List header */}
        <div className="flex items-center justify-between px-4 py-3
          border-b border-gray-50 dark:border-gray-800/50">
          <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
            Transactions
          </p>
          {pagination && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {pagination.totalCount} total
            </p>
          )}
        </div>

        {/* Items — grouped by date */}
        <div>
          {isLoading ? (
            <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {Array(8).fill(0).map((_, i) => <RowSkeleton key={i}/>)}
            </div>
          ) : expenses.length ? (
            groupedByDate.map((group) => (
              <div key={group.key}>
                <DateHeader date={group.date} items={group.items} />
                <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                  {group.items.map((expense) => (
                    <ExpenseCard
                      key={expense._id}
                      expense={expense}
                      onEdit={(e) => setEditExpense(e)}
                      onDelete={(e) => setDeleteTarget(e)}
                    />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="py-16 text-center">
              <p className="text-2xl mb-2">🔍</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">No expenses found</p>
              <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">
                Try adjusting your filters or add a new expense
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && expenses.length > 0 && (
          <div className="px-4 py-4 border-t border-gray-50 dark:border-gray-800/50">
            <Pagination
              pagination={pagination}
              onPageChange={(p) => dispatch(setPage(p))}
            />
          </div>
        )}
      </div>

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

      {/* Edit expense modal */}
      <Modal
        isOpen={!!editExpense}
        onClose={() => setEditExpense(null)}
        title="Edit expense"
      >
        <ExpenseForm
          expense={editExpense}
          onSuccess={() => setEditExpense(null)}
          onCancel={() => setEditExpense(null)}
        />
      </Modal>

      {/* Delete confirm dialog */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget?._id)}
        isLoading={deleteMutation.isPending}
        title="Delete expense"
        message={`Delete "${deleteTarget?.note || deleteTarget?.category}" 
          for ${deleteTarget?.amount}? This cannot be undone.`}
      />
    </div>
  );
};

export default History;