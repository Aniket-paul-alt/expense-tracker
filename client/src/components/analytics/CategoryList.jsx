import { getCategoryColor, getCategoryIcon } from "../../utils/categoryColors";
import { formatCurrency } from "../../utils/formatCurrency";

const CategoryList = ({ data = [], symbol = "₹", limit = 8 }) => {
  if (!data.length) {
    return (
      <p className="text-sm text-gray-300 text-center py-8">
        No data for this period
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {data.slice(0, limit).map((cat) => (
        <div key={cat.category} className="flex items-center gap-3">
          {/* Icon */}
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${getCategoryColor(cat.category)}18` }}
          >
            <span style={{ fontSize: "14px" }}>
              {getCategoryIcon(cat.category)}
            </span>
          </div>

          {/* Bar + label */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-700 dark:text-gray-300 capitalize truncate">
                {cat.category}
              </span>
              <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 flex-shrink-0">
                {cat.percentage}%
              </span>
            </div>
            <div className="h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${cat.percentage}%`,
                  backgroundColor: getCategoryColor(cat.category),
                }}
              />
            </div>
          </div>

          {/* Amount */}
          <div className="text-right flex-shrink-0">
            <p className="text-xs font-semibold text-gray-900 dark:text-gray-100">
              {formatCurrency(cat.total, symbol)}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{cat.count} txn</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CategoryList;