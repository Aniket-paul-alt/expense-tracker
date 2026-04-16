const ComparisonBadge = ({ changePercent, trend }) => {
  if (trend === "no-data") {
    return (
      <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
        No previous data
      </span>
    );
  }

  const isUp   = trend === "up";
  const isSame = trend === "same";

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full
        ${isUp   ? "bg-red-50 text-red-600"
        : isSame ? "bg-gray-100 text-gray-500"
                 : "bg-green-50 text-green-600"}`}
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