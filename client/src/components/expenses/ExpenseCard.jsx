import { getCategoryColor, getCategoryIcon } from "../../utils/categoryColors";
import { formatCurrency } from "../../utils/formatCurrency";
import { formatDate } from "../../utils/dateHelpers";

const PAYMENT_LABELS = {
  upi: "UPI", card: "Card", cash: "Cash",
  netbanking: "Net Banking", wallet: "Wallet", other: "Other",
};

const ExpenseCard = ({ expense, onEdit, onDelete }) => {
  const color = getCategoryColor(expense.category);
  const icon  = getCategoryIcon(expense.category);

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50
      transition-colors group">

      {/* Category icon */}
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ backgroundColor: `${color}18` }}
      >
        <span style={{ fontSize: "18px" }}>{icon}</span>
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
            {expense.note || expense.category}
          </p>
          {expense.isRecurring && (
            <span className="text-xs px-1.5 py-0.5 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400
              rounded font-medium">
              Recurring
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-gray-400 dark:text-gray-500 capitalize">{expense.category}</span>
          <span className="text-gray-200 dark:text-gray-700">·</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {formatDate(expense.date, "dd MMM yyyy")}
          </span>
          <span className="text-gray-200 dark:text-gray-700">·</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {PAYMENT_LABELS[expense.paymentMethod] || expense.paymentMethod}
          </span>
          {expense.tags?.length > 0 && (
            <>
              <span className="text-gray-200 dark:text-gray-700">·</span>
              <div className="flex gap-1 border-t border-transparent">
                {expense.tags.slice(0, 2).map((tag) => (
                  <span key={tag}
                    className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded transition-colors border border-transparent dark:border-gray-700/50">
                    {tag}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Amount + actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {formatCurrency(expense.amount)}
        </p>

        {/* Action buttons — visible on hover */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(expense)}
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
            onClick={() => onDelete(expense)}
            className="w-7 h-7 flex items-center justify-center rounded-lg
              text-gray-400 dark:text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-500 dark:hover:text-red-400 transition"
          >
            <svg width="13" height="13" fill="none" stroke="currentColor"
              strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseCard;