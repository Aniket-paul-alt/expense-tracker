import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import expenseService from "../../services/expenseServices";
import { getTodayISO } from "../../utils/dateHelpers";
import { CATEGORY_ICONS } from "../../utils/categoryColors";

const schema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine((v) => !isNaN(v) && parseFloat(v) > 0, "Amount must be greater than 0"),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  note: z.string().max(300).optional(),
  date: z.string().min(1, "Date is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  isRecurring: z.boolean().optional(),
  tags: z.string().optional(),
});

const CATEGORIES = Object.entries(CATEGORY_ICONS).map(([key, icon]) => ({
  value: key,
  label: key.charAt(0).toUpperCase() + key.slice(1),
  icon,
}));

const PAYMENT_METHODS = [
  { value: "upi",        label: "UPI" },
  { value: "card",       label: "Card" },
  { value: "cash",       label: "Cash" },
  { value: "netbanking", label: "Net Banking" },
  { value: "wallet",     label: "Wallet" },
  { value: "other",      label: "Other" },
];

// ─── Field Component ──────────────────────────────────────────────────────────

const Field = ({ label, error, children }) => (
  <div>
    <label className="block text-xs font-medium text-gray-600 mb-1.5">
      {label}
    </label>
    {children}
    {error && (
      <p className="text-red-500 text-xs mt-1">{error}</p>
    )}
  </div>
);

const inputClass = (hasError) =>
  `w-full px-3 py-2 text-sm border rounded-lg outline-none transition
  focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white
  ${hasError ? "border-red-300" : "border-gray-200"}`;

// ─── ExpenseForm ──────────────────────────────────────────────────────────────

const ExpenseForm = ({ expense = null, onSuccess, onCancel }) => {
  const queryClient = useQueryClient();
  const { user } = useSelector((state) => state.auth);
  const symbol = user?.currency?.symbol || "₹";
  const isEditing = !!expense;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      amount:        expense?.amount?.toString() || "",
      category:      expense?.category || "",
      subcategory:   expense?.subcategory || "",
      note:          expense?.note || "",
      date:          expense?.date
                       ? new Date(expense.date).toISOString().split("T")[0]
                       : getTodayISO(),
      paymentMethod: expense?.paymentMethod || "upi",
      isRecurring:   expense?.isRecurring || false,
      tags:          expense?.tags?.join(", ") || "",
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => expenseService.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });

      // Show budget alert if triggered
      if (res.budgetAlert) {
        const { type, message } = res.budgetAlert;
        type === "exceeded"
          ? toast.error(message)
          : toast(message, { icon: "⚠️" });
      } else {
        toast.success("Expense added!");
      }

      reset();
      onSuccess?.();
    },
    onError: (err) => toast.error(err.message || "Failed to add expense"),
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data) => expenseService.update(expense._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      toast.success("Expense updated!");
      onSuccess?.();
    },
    onError: (err) => toast.error(err.message || "Failed to update expense"),
  });

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const onSubmit = (formData) => {
    const payload = {
      amount:        parseFloat(formData.amount),
      category:      formData.category,
      subcategory:   formData.subcategory || undefined,
      note:          formData.note || "",
      date:          formData.date,
      paymentMethod: formData.paymentMethod,
      isRecurring:   formData.isRecurring || false,
      tags: formData.tags
        ? formData.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
    };

    isEditing ? updateMutation.mutate(payload) : createMutation.mutate(payload);
  };

  const selectedCategory = watch("category");

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

      {/* Amount */}
      <Field label={`Amount (${symbol})`} error={errors.amount?.message}>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm
            font-medium text-gray-400">
            {symbol}
          </span>
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            {...register("amount")}
            className={`${inputClass(errors.amount)} pl-7`}
          />
        </div>
      </Field>

      {/* Category */}
      <Field label="Category" error={errors.category?.message}>
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
          {CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.value;
            return (
              <label
                key={cat.value}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg border
                  cursor-pointer transition-all text-center
                  ${isSelected
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-gray-200 hover:border-gray-300"
                  }`}
              >
                <input
                  type="radio"
                  value={cat.value}
                  {...register("category")}
                  className="sr-only"
                />
                <span style={{ fontSize: "20px" }}>{cat.icon}</span>
                <span className={`text-xs font-medium truncate w-full text-center
                  ${isSelected ? "text-indigo-700" : "text-gray-600"}`}>
                  {cat.label}
                </span>
              </label>
            );
          })}
        </div>
        {errors.category && (
          <p className="text-red-500 text-xs mt-1">{errors.category.message}</p>
        )}
      </Field>

      {/* Date + Payment method row */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date" error={errors.date?.message}>
          <input
            type="date"
            max={getTodayISO()}
            {...register("date")}
            className={inputClass(errors.date)}
          />
        </Field>

        <Field label="Payment method" error={errors.paymentMethod?.message}>
          <select
            {...register("paymentMethod")}
            className={inputClass(errors.paymentMethod)}
          >
            {PAYMENT_METHODS.map((pm) => (
              <option key={pm.value} value={pm.value}>{pm.label}</option>
            ))}
          </select>
        </Field>
      </div>

      {/* Note */}
      <Field label="Note (optional)" error={errors.note?.message}>
        <input
          type="text"
          placeholder="What was this for?"
          {...register("note")}
          className={inputClass(errors.note)}
        />
      </Field>

      {/* Tags */}
      <Field label="Tags (optional, comma separated)">
        <input
          type="text"
          placeholder="groceries, weekend, family"
          {...register("tags")}
          className={inputClass(false)}
        />
      </Field>

      {/* Recurring toggle */}
      <div className="flex items-center gap-3 py-1">
        <input
          type="checkbox"
          id="isRecurring"
          {...register("isRecurring")}
          className="w-4 h-4 accent-indigo-600 cursor-pointer"
        />
        <label htmlFor="isRecurring"
          className="text-sm text-gray-600 cursor-pointer select-none">
          This is a recurring expense
        </label>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-600
              text-sm font-medium rounded-lg hover:bg-gray-50 transition"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700
            disabled:bg-indigo-400 text-white text-sm font-medium
            rounded-lg transition"
        >
          {isLoading
            ? isEditing ? "Saving..." : "Adding..."
            : isEditing ? "Save changes" : "Add expense"
          }
        </button>
      </div>
    </form>
  );
};

export default ExpenseForm;