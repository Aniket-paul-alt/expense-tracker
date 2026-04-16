const StatCard = ({ label, value, sub, accent = "#6366f1", small = false }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-4">
    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
      {label}
    </p>
    <p className={`font-semibold text-gray-900 ${small ? "text-base" : "text-xl"}`}>
      {value}
    </p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    <div
      className="mt-3 h-0.5 w-8 rounded-full"
      style={{ backgroundColor: accent }}
    />
  </div>
);

export default StatCard;