const SectionCard = ({ title, subtitle, children, action }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-5">
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
    {children}
  </div>
);

export default SectionCard;