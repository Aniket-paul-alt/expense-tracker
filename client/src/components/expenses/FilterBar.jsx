import { useDispatch, useSelector } from "react-redux";
import { setFilters, resetFilters } from "../../features/expense/expenseSlice";
import { CATEGORY_ICONS } from "../../utils/categoryColors";

const PAYMENT_METHODS = [
  "upi", "card", "cash", "netbanking", "wallet", "other"
];

const FilterBar = () => {
  const dispatch = useDispatch();
  const filters = useSelector((state) => state.expenses.filters);

  const update = (key, value) => dispatch(setFilters({ [key]: value }));
  const handleReset = () => dispatch(resetFilters());

  const hasActiveFilters = !!(
    filters.startDate || filters.endDate || filters.category ||
    filters.paymentMethod || filters.search ||
    filters.minAmount || filters.maxAmount
  );

  const inputClass = "px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg \
outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 w-full transition-colors";

  const user = useSelector((state) => state.auth.user);
  const defaultHobbySubcategories = ["Pet", "Plantation", "Reading", "Gaming"];
  const customHobbySubcategories = user?.customSubcategories?.hobby || [];
  const allHobbySubcategories = [...new Set([...defaultHobbySubcategories, ...customHobbySubcategories])];

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-4 space-y-3 transition-colors">

      {/* Search + reset row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            width="14" height="14" fill="none" stroke="currentColor"
            strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search notes..."
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            className="pl-8 pr-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg
              outline-none focus:ring-2 focus:ring-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 w-full transition-colors"
          />
        </div>
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400
              border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors
              whitespace-nowrap"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Date range */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-400 mb-1">From</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => update("startDate", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">To</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => update("endDate", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Category pills */}
      <div>
        <label className="block text-xs text-gray-400 mb-2">Category</label>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(CATEGORY_ICONS).map(([key, icon]) => {
            const active = filters.category === key;
            return (
              <button
                key={key}
                onClick={() => update("category", active ? "" : key)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full
                  text-xs font-medium transition-colors border
                  ${active
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
              >
                <span style={{ fontSize: "12px" }}>{icon}</span>
                <span className="capitalize">{key}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Subcategory pills for Hobby */}
      {filters.category === "hobby" && (
        <div>
          <label className="block text-xs text-gray-400 mb-2">Hobby Type</label>
          <div className="flex flex-wrap gap-1.5">
            {allHobbySubcategories.map((sub) => {
              const active = filters.subcategory === sub;
              return (
                <button
                  key={sub}
                  onClick={() => update("subcategory", active ? "" : sub)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border
                    ${active
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                >
                  {sub}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Payment method */}
      <div>
        <label className="block text-xs text-gray-400 mb-2">Payment method</label>
        <div className="flex flex-wrap gap-1.5">
          {PAYMENT_METHODS.map((pm) => {
            const active = filters.paymentMethod === pm;
            return (
              <button
                key={pm}
                onClick={() => update("paymentMethod", active ? "" : pm)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium
                  transition-colors border capitalize
                  ${active
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
              >
                {pm}
              </button>
            );
          })}
        </div>
      </div>

      {/* Amount range */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Min amount</label>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={filters.minAmount || ""}
            onChange={(e) => update("minAmount", e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Max amount</label>
          <input
            type="number"
            min="0"
            placeholder="Any"
            value={filters.maxAmount || ""}
            onChange={(e) => update("maxAmount", e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Sort */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">Sort by</label>
          <select
            value={filters.sortBy}
            onChange={(e) => update("sortBy", e.target.value)}
            className={inputClass}
          >
            <option value="date">Date</option>
            <option value="amount">Amount</option>
            <option value="category">Category</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-400 mb-1">Order</label>
          <select
            value={filters.order}
            onChange={(e) => update("order", e.target.value)}
            className={inputClass}
          >
            <option value="desc">Newest first</option>
            <option value="asc">Oldest first</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default FilterBar;