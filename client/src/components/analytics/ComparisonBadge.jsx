const ComparisonBadge = ({ changePercent, trend }) => {
  if (trend === "no-data") {
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2.5 py-1 rounded-full">
        No previous data
      </span>
    );
  }

  const isUp   = trend === "up";
  const isSame = trend === "same";

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full
        ${isUp   ? "bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400"
        : isSame ? "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                 : "bg-green-50 dark:bg-green-900/10 text-green-600 dark:text-green-400"}`}
    >
      {/* Arrow icon */}
      {!isSame && (
        <svg
          width="10" height="10" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" strokeWidth="3"
          style={{ transform: isUp ? "rotate(0deg)" : "rotate(180deg)" }}
        >
          <polyline points="18 15 12 9 6 15"/>
        </svg>
      )}
      {isSame
        ? "Same as before"
        : `${Math.abs(changePercent)}% ${isUp ? "more" : "less"} than before`
      }
    </span>
  );
};

export default ComparisonBadge;