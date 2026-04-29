import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector, useDispatch } from "react-redux";
import { updateProfile } from "../../features/auth/authSlice";
import { addNotification } from "../../features/notifications/notificationsSlice";
import toast from "react-hot-toast";
import expenseService from "../../services/expenseServices";
import budgetService from "../../services/budgetServices";
import { getTodayISO } from "../../utils/dateHelpers";
import { CATEGORY_ICONS } from "../../utils/categoryColors";
import ConfirmModal from "../common/ConfirmModal";

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
    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">
      {label}
    </label>
    {children}
    {error && (
      <p className="text-red-500 text-xs mt-1">{error}</p>
    )}
  </div>
);

const inputClass = (hasError) =>
  `w-full px-3 py-2 text-sm border rounded-lg outline-none transition-colors
  focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
  ${hasError ? "border-red-300 dark:border-red-500/50" : "border-gray-200 dark:border-gray-700"}`;

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
    setValue,
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

  const dispatch = useDispatch();
  const [newSubcategory, setNewSubcategory] = useState("");
  const [isAddingSub, setIsAddingSub] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [catToDelete, setCatToDelete] = useState(null);

  const customCategories = user?.customCategories || [];
  const mergedCategories = [
    ...CATEGORIES.map(c => ({ ...c, isCustom: false })),
    ...customCategories.map(cat => ({
      value: cat.toLowerCase(),
      label: cat,
      icon: "📁",
      isCustom: true
    }))
  ];

  const defaultHobbySubcategories = ["Pet", "Plantation", "Reading", "Gaming"];
  const customHobbySubcategories = user?.customSubcategories?.hobby || [];
  const allHobbySubcategories = [...new Set([...defaultHobbySubcategories, ...customHobbySubcategories])];

  const handleAddSubcategory = async () => {
    if (!newSubcategory.trim()) return;
    const addedSub = newSubcategory.trim();
    const updatedHobbySubs = [...customHobbySubcategories, addedSub];
    
    try {
      await dispatch(updateProfile({
        customSubcategories: {
          ...user?.customSubcategories,
          hobby: updatedHobbySubs
        }
      })).unwrap();
      setNewSubcategory("");
      setIsAddingSub(false);
      setValue("subcategory", addedSub);
    } catch (err) {
      toast.error("Failed to add subcategory");
    }
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    const addedCat = newCategory.trim();
    if (mergedCategories.some(c => c.label.toLowerCase() === addedCat.toLowerCase())) {
      toast.error("Category already exists");
      return;
    }

    try {
      await dispatch(updateProfile({
        customCategories: [...customCategories, addedCat]
      })).unwrap();
      setNewCategory("");
      setIsAddingCategory(false);
      setValue("category", addedCat.toLowerCase());
    } catch (err) {
      toast.error("Failed to add category");
    }
  };

  const handleDeleteCategory = async (e, catLabel) => {
    e.preventDefault();
    e.stopPropagation();
    
    const catVal = catLabel.toLowerCase();
    
    try {
      // 1. Check for expenses
      const expRes = await expenseService.getAll({ 
        category: catVal, 
        limit: 1 
      });
      
      if (expRes.data && expRes.data.length > 0) {
        toast.error(`Cannot delete "${catLabel}". It has existing expenses. First you have to delete all expenses of this category.`);
        return;
      }

      // 2. Check for budgets
      const budRes = await budgetService.getAll();
      const budgetExists = budRes.data?.some(b => b.category === catVal);
      
      if (budgetExists) {
        toast.error(`Cannot delete "${catLabel}". It has an active budget.`);
        return;
      }
      
      setCatToDelete(catLabel);
    } catch (err) {
      toast.error("Failed to verify category status");
    }
  };

  const confirmDeleteCategory = async () => {
    if (!catToDelete) return;

    try {
      const updatedCats = customCategories.filter(c => c !== catToDelete);
      await dispatch(updateProfile({
        customCategories: updatedCats
      })).unwrap();
      
      if (selectedCategory === catToDelete.toLowerCase()) {
        setValue("category", "", { shouldValidate: false });
      }
      toast.success("Category deleted");
    } catch (err) {
      toast.error("Failed to delete category");
    } finally {
      setCatToDelete(null);
    }
  };

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data) => expenseService.create(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      queryClient.invalidateQueries({ queryKey: ["analytics"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });

      // Show budget alert if triggered
      if (res.budgetAlert) {
        const { type, message, category, period, spent, budget, percentage } = res.budgetAlert;
        type === "exceeded"
          ? toast.error(message)
          : toast(message, { icon: "⚠️" });
        // Persist to notification history
        dispatch(addNotification({
          _id: Date.now().toString(), // temporary ID
          type: type === "exceeded" ? "budget_exceeded" : "budget_warning",
          title: type === "exceeded" ? "🚨 Budget Exceeded" : "⚠️ Budget Warning",
          message,
          category,
          isRead: false,
          createdAt: new Date().toISOString(),
          metadata: {
            period,
            spent,
            budget,
            percentage,
          },
        }));
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
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
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
        <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
          {mergedCategories.map((cat) => {
            const isSelected = selectedCategory === cat.value;
            return (
              <label
                key={cat.value}
                className={`relative flex flex-col items-center gap-1 p-2 rounded-lg border
                  cursor-pointer transition-all text-center group
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
                
                {/* Delete button for custom categories */}
                {cat.isCustom && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteCategory(e, cat.label)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 hover:border-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                  </button>
                )}

                <span style={{ fontSize: "20px" }}>{cat.icon}</span>
                <span className={`text-xs font-medium truncate w-full text-center
                  ${isSelected ? "text-indigo-700 dark:text-indigo-400" : "text-gray-600 dark:text-gray-400"}`}>
                  {cat.label}
                </span>
              </label>
            );
          })}

          {/* Add Category Button */}
          {!isAddingCategory ? (
            <button
              type="button"
              onClick={() => setIsAddingCategory(true)}
              className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-indigo-600 hover:border-indigo-600 transition-colors"
            >
              <span style={{ fontSize: "20px" }}>+</span>
              <span className="text-[10px] font-medium">Add</span>
            </button>
          ) : (
            <div className="col-span-2 flex items-center gap-1 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-lg border border-indigo-200 dark:border-indigo-900/50">
              <input
                type="text"
                autoFocus
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCategory();
                  } else if (e.key === "Escape") {
                    setIsAddingCategory(false);
                    setNewCategory("");
                  }
                }}
                className="flex-1 px-2 py-1 text-xs border rounded outline-none focus:border-indigo-500 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
                placeholder="New Category"
              />
              <button
                type="button"
                onClick={handleAddCategory}
                className="p-1 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
              <button
                type="button"
                onClick={() => { setIsAddingCategory(false); setNewCategory(""); }}
                className="p-1 text-gray-400 hover:text-red-500"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
          )}
        </div>
      </Field>

      {/* Subcategory for Hobby */}
      {selectedCategory === "hobby" && (
        <Field label="Hobby Type" error={errors.subcategory?.message}>
          <div className="flex flex-wrap gap-2">
            {allHobbySubcategories.map((sub) => {
              const isSelected = watch("subcategory") === sub;
              return (
                <label
                  key={sub}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border cursor-pointer transition-colors
                    ${isSelected
                      ? "bg-indigo-600 border-indigo-600 text-white"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-indigo-400"
                    }`}
                >
                  <input
                    type="radio"
                    value={sub}
                    {...register("subcategory")}
                    className="sr-only"
                  />
                  {sub}
                </label>
              );
            })}
            
            {/* Add new subcategory button */}
            {!isAddingSub ? (
              <button
                type="button"
                onClick={() => setIsAddingSub(true)}
                className="px-3 py-1.5 rounded-full text-xs font-medium border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:text-indigo-600 hover:border-indigo-600 transition-colors flex items-center gap-1"
              >
                <span>+ Add</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  autoFocus
                  value={newSubcategory}
                  onChange={(e) => setNewSubcategory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSubcategory();
                    } else if (e.key === "Escape") {
                      setIsAddingSub(false);
                      setNewSubcategory("");
                    }
                  }}
                  className="px-3 py-1 text-xs border rounded-full outline-none focus:border-indigo-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  placeholder="Type & press Enter"
                />
                <button
                  type="button"
                  onClick={handleAddSubcategory}
                  className="p-1 text-indigo-600 hover:text-indigo-800 dark:text-indigo-400"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
                <button
                  type="button"
                  onClick={() => { setIsAddingSub(false); setNewSubcategory(""); }}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            )}
          </div>
        </Field>
      )}

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
          className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none">
          This is a recurring expense
        </label>
      </div>

      {/* Buttons */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300
              text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
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

      <ConfirmModal
        isOpen={!!catToDelete}
        title="Delete Category"
        message={`Are you sure you want to delete the category "${catToDelete}"? This will not delete the expenses already added in this category.`}
        onConfirm={confirmDeleteCategory}
        onCancel={() => setCatToDelete(null)}
      />
    </form>
  );
};

export default ExpenseForm;