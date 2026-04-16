import { useState } from "react";
import { useSelector } from "react-redux";
import DailyView   from "../components/analytics/DailyView";
import WeeklyView  from "../components/analytics/WeeklyView";
import MonthlyView from "../components/analytics/MonthlyView";
import YearlyView  from "../components/analytics/YearlyView";

const TABS = [
  { key: "daily",   label: "Daily" },
  { key: "weekly",  label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly",  label: "Yearly" },
];

const Analytics = () => {
  const [activeTab, setActiveTab] = useState("monthly");
  const { user } = useSelector((state) => state.auth);
  const symbol = user?.currency?.symbol || "₹";

  return (
    <div className="space-y-5">

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "daily"   && <DailyView   symbol={symbol} />}
        {activeTab === "weekly"  && <WeeklyView  symbol={symbol} />}
        {activeTab === "monthly" && <MonthlyView symbol={symbol} />}
        {activeTab === "yearly"  && <YearlyView  symbol={symbol} />}
      </div>
    </div>
  );
};

export default Analytics;