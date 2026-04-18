import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import toast from "react-hot-toast";
import budgetService from "../services/budgetServices";
import { formatCurrency } from "../utils/formatCurrency";
import { getCategoryColor, getCategoryIcon, CATEGORY_ICONS } from "../utils/categoryColors";
import Modal from "../components/ui/Modal";
import ConfirmDialog from "../components/ui/ConfirmDialog";

// ─── Validation schema ────────────────────────────────────────────────────────

const schema = z.object({
  category: z.string().min(1, "Category is required"),
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => !isNaN(v) && parseFloat(v) >= 1, "Must be at least 1"),
  period: z.enum(["daily", "weekly", "monthly", "yearly"]),
});

const PERIODS = ["daily", "weekly", "monthly", "yearly"];

const CATEGORIES = Object.entries(CATEGORY_ICONS).map(([key, icon]) => ({
  value: key,
  label: key.charAt(0).toUpperCase() + key.slice(1),
  icon,
}));

// ─── Budget Form ──────────────────────────────────────────────────────────────

const BudgetForm = ({ existing = null, onSuccess, onCancel }) => {
  const { user } = useSelector((state) => state.auth);
  const symbol = user?.currency?.symbol || "₹";
  const queryClient = useQueryClient();
  const isEditing = !!existing;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      category: existing?.category || "",
      amount:   existing?.budgetAmount?.toString() || "",
      period:   existing?.period || "monthly",
    },
  });

  const createMutation = useMutation({
    mutationFn: budgetService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget created!");
      onSuccess?.();
    },
    onError: (err) => toast.error(err.message || "Failed to create budget"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ category, data }) => budgetService.update(category, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget updated!");
      onSuccess?.();
    },
    onError: (err) => toast.error(err.message || "Failed to update budget"),
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const selectedCategory = watch("category");

  const onSubmit = (data) => {
    const payload = {
      category: data.category,
      amount:   parseFloat(data.amount),
      period:   data.period,
    };
    isEditing
      ? updateMutation.mutate({ category: existing.category, data: payload })
      : createMutation.mutate(payload);
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg \
outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

      {/* Category picker — disabled when editing */}
      <div>
        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
          Category
        </label>
        {isEditing ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800
            border border-gray-200 dark:border-gray-700 rounded-lg">
            <span style={{ fontSize: "18px" }}>
              {getCategoryIcon(existing.category)}
            </span>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 capitalize">
              {existing.category}
            </span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-5 gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.value;
                return (
                  <label
                    key={cat.value}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg
                      border cursor-pointer transition-all text-center
                      ${isSelected
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                  >
                    <input
                      type="radio"
                      value={cat.value}
                      {...register("category")}
                      className="sr-only"
                    />
                    <span style={{ fontSize: "18px" }}>{cat.icon}</span>
                    <span className={`text-xs font-medium truncate w-full text-center
                      ${isSelected ? "text-indigo-700 dark:text-indigo-400" : "text-gray-600 dark:text-gray-400"}`}>
                      {cat.label}
                    </span>
                  </label>
                );
              })}
            </div>
            {errors.category && (
              <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.category.message}</p>
            )}
          </>
        )}
      </div>

      {/* Amount + period row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Budget limit ({symbol})
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2
              text-sm text-gray-400 font-medium">{symbol}</span>
            <input
              type="number"
              min="1"
              step="0.01"
              placeholder="5000"
              {...register("amount")}
              className={`${inputClass} pl-7`}
            />
          </div>
          {errors.amount && (
            <p className="text-red-500 dark:text-red-400 text-xs mt-1">{errors.amount.message}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
            Resets every
          </label>
          <select {...register("period")} className={inputClass}>
            {PERIODS.map((p) => (
              <option key={p} value={p} className="capitalize">
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300
            text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700
            disabled:bg-indigo-400 text-white text-sm font-medium
            rounded-lg transition"
        >
          {isLoading
            ? "Saving..."
            : isEditing ? "Save changes" : "Create budget"
          }
        </button>
      </div>
    </form>
  );
};

// ─── Budget Card ──────────────────────────────────────────────────────────────

const BudgetCard = ({ budget, onEdit, onDelete }) => {
  const { user } = useSelector((state) => state.auth);
  const symbol = user?.currency?.symbol || "₹";
  const color  = getCategoryColor(budget.category);
  const icon   = getCategoryIcon(budget.category);

  const statusColors = {
    safe:     { bar: color,      bg: "bg-green-50 dark:bg-green-900/10",  text: "text-green-700 dark:text-green-400",  label: "On track"  },
    warning:  { bar: "#f59e0b",  bg: "bg-amber-50 dark:bg-amber-900/10",  text: "text-amber-700 dark:text-amber-400",  label: "Warning"   },
    exceeded: { bar: "#ef4444",  bg: "bg-red-50 dark:bg-red-900/10",    text: "text-red-700 dark:text-red-400",    label: "Exceeded"  },
  };

  const s = statusColors[budget.status] || statusColors.safe;

  return (
    <div className={`rounded-xl border p-4 space-y-3 transition-colors
      ${budget.status === "exceeded"
        ? "border-red-100 dark:border-red-900/50 bg-red-50/30 dark:bg-red-900/5"
        : budget.status === "warning"
        ? "border-amber-100 dark:border-amber-900/50 bg-amber-50/20 dark:bg-amber-900/5"
        : "border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${color}18` }}
          >
            <span style={{ fontSize: "18px" }}>{icon}</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">
              {budget.category}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 capitalize">
              {budget.period} budget
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Status badge */}
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full
            ${s.bg} ${s.text}`}>
            {s.label}
          </span>

          {/* Actions */}
          <button
            onClick={() => onEdit(budget)}
            className="w-7 h-7 flex items-center justify-center rounded-lg
              text-gray-400 dark:text-gray-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor"
              strokeWidth="2" viewBox="0 0 24 24">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button
            onClick={() => onDelete(budget)}
            className="w-7 h-7 flex items-center justify-center rounded-lg
              text-gray-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 transition"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor"
              strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatCurrency(budget.spent, symbol)} spent
          </span>
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
            {budget.percentage}%
          </span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(budget.percentage, 100)}%`,
              backgroundColor: s.bar,
            }}
          />
        </div>
      </div>

      {/* Amounts row */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">Spent</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {formatCurrency(budget.spent, symbol)}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">Remaining</p>
          <p className={`text-sm font-semibold
            ${budget.status === "exceeded" ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
            {budget.status === "exceeded"
              ? `-${formatCurrency(budget.spent - budget.budgetAmount, symbol)}`
              : formatCurrency(budget.remaining, symbol)
            }
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400 dark:text-gray-500">Limit</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {formatCurrency(budget.budgetAmount, symbol)}
          </p>
        </div>
      </div>

      {/* Period dates */}
      <p className="text-xs text-gray-300 dark:text-gray-500 border-t border-gray-100 dark:border-gray-800/50 pt-2">
        {new Date(budget.periodStart).toLocaleDateString("en-IN", {
          day: "numeric", month: "short"
        })} — {new Date(budget.periodEnd).toLocaleDateString("en-IN", {
          day: "numeric", month: "short", year: "numeric"
        })}
      </p>
    </div>
  );
};

// ─── Budget Page ──────────────────────────────────────────────────────────────

const Budget = () => {
  const queryClient = useQueryClient();
  const [addOpen,      setAddOpen]      = useState(false);
  const [editBudget,   setEditBudget]   = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [resetOpen,    setResetOpen]    = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["budgets"],
    queryFn:  budgetService.getAll,
  });

  const budgets  = data?.data || [];
  const exceeded = budgets.filter((b) => b.status === "exceeded");
  const warning  = budgets.filter((b) => b.status === "warning");

  const deleteMutation = useMutation({
    mutationFn: (category) => budgetService.delete(category),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("Budget deleted");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const resetMutation = useMutation({
    mutationFn: budgetService.reset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      toast.success("All budgets reset");
      setResetOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  // ── Skeleton ──
  const BudgetSkeleton = () => (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 animate-pulse"/>
        <div className="space-y-1.5">
          <div className="h-3 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"/>
          <div className="h-2.5 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse"/>
        </div>
      </div>
      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full animate-pulse"/>
      <div className="flex justify-between">
        {Array(3).fill(0).map((_, i) => (
          <div key={i} className="space-y-1 text-center">
            <div className="h-2.5 w-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mx-auto"/>
            <div className="h-4 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse mx-auto"/>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* Alert banner */}
      {(exceeded.length > 0 || warning.length > 0) && (
        <div className={`rounded-xl border px-4 py-3 flex items-start gap-3
          ${exceeded.length > 0
            ? "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30"
            : "bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30"
          }`}>
          <svg className={`mt-0.5 flex-shrink-0
            ${exceeded.length > 0 ? "text-red-400 dark:text-red-500" : "text-amber-400 dark:text-amber-500"}`}
            width="16" height="16" fill="none" stroke="currentColor"
            strokeWidth="2" viewBox="0 0 24 24">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0
              1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/>
            <line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          <div>
            {exceeded.length > 0 && (
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                {exceeded.length} budget{exceeded.length > 1 ? "s" : ""} exceeded —{" "}
                {exceeded.map((b) => b.category).join(", ")}
              </p>
            )}
            {warning.length > 0 && (
              <p className={`text-sm font-medium
                ${exceeded.length ? "text-red-600 dark:text-red-400 mt-0.5" : "text-amber-700 dark:text-amber-400"}`}>
                {warning.length} budget{warning.length > 1 ? "s" : ""} near limit —{" "}
                {warning.map((b) => b.category).join(", ")}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm text-gray-400 dark:text-gray-500">
            {budgets.length} budget{budgets.length !== 1 ? "s" : ""} set
          </p>
        </div>
        <div className="flex items-center gap-2">
          {budgets.length > 0 && (
            <button
              onClick={() => setResetOpen(true)}
              className="px-3 py-2 text-sm font-medium text-red-500 dark:text-red-400
                border border-red-100 dark:border-red-900/30 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10 transition"
            >
              Reset all
            </button>
          )}
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
            Add budget
          </button>
        </div>
      </div>

      {/* Budget grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => <BudgetSkeleton key={i}/>)}
        </div>
      ) : budgets.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.category}
              budget={budget}
              onEdit={(b) => setEditBudget(b)}
              onDelete={(b) => setDeleteTarget(b)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 py-20 text-center transition-colors">
          <p className="text-4xl mb-3">💰</p>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">No budgets yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 mb-5">
            Set spending limits for each category to stay on track
          </p>
          <button
            onClick={() => setAddOpen(true)}
            className="px-4 py-2 bg-indigo-600 text-white text-sm
              font-medium rounded-lg hover:bg-indigo-700 transition"
          >
            Create first budget
          </button>
        </div>
      )}

      {/* Add budget modal */}
      <Modal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add budget"
      >
        <BudgetForm
          onSuccess={() => setAddOpen(false)}
          onCancel={() => setAddOpen(false)}
        />
      </Modal>

      {/* Edit budget modal */}
      <Modal
        isOpen={!!editBudget}
        onClose={() => setEditBudget(null)}
        title="Edit budget"
      >
        <BudgetForm
          existing={editBudget}
          onSuccess={() => setEditBudget(null)}
          onCancel={() => setEditBudget(null)}
        />
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget?.category)}
        isLoading={deleteMutation.isPending}
        title="Delete budget"
        message={`Remove the ${deleteTarget?.period} budget for "${deleteTarget?.category}"?`}
      />

      {/* Reset all confirm */}
      <ConfirmDialog
        isOpen={resetOpen}
        onClose={() => setResetOpen(false)}
        onConfirm={() => resetMutation.mutate()}
        isLoading={resetMutation.isPending}
        title="Reset all budgets"
        message="This will delete all your budgets permanently. You can set them up again anytime."
        confirmLabel="Reset all"
      />
    </div>
  );
};

export default Budget;