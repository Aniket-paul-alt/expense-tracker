import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";

const pageTitles = {
  "/":          { title: "Dashboard",  subtitle: "Your financial overview" },
  "/analytics": { title: "Analytics",  subtitle: "Spending trends and insights" },
  "/history":   { title: "History",    subtitle: "All your transactions" },
  "/budget":    { title: "Budget",     subtitle: "Spending limits by category" },
  "/settings":  { title: "Settings",   subtitle: "Manage your account" },
};

const Navbar = () => {
  const location = useLocation();
  const { user } = useSelector((state) => state.auth);
  const alerts = useSelector((state) => state.budget.alerts);

  const page = pageTitles[location.pathname] || { title: "Expense Tracker", subtitle: "" };

  // Format today's date
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <header className="flex items-center justify-between px-4 md:px-6 h-16
      bg-white border-b border-gray-100 flex-shrink-0">

      {/* Left: page title */}
      <div>
        <h1 className="text-base font-semibold text-gray-900">{page.title}</h1>
        <p className="text-xs text-gray-400 hidden sm:block">{page.subtitle}</p>
      </div>

      {/* Right: date + alerts + avatar */}
      <div className="flex items-center gap-3">

        {/* Date — hidden on small screens */}
        <span className="hidden lg:block text-xs text-gray-400">{today}</span>

        {/* Budget alert bell */}
        {alerts.length > 0 && (
          <div className="relative">
            <button className="w-8 h-8 flex items-center justify-center rounded-lg
              bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white
              text-xs rounded-full flex items-center justify-center font-medium">
              {alerts.length}
            </span>
          </div>
        )}

        {/* Currency badge */}
        <span className="hidden sm:flex items-center px-2.5 py-1 bg-gray-100
          text-gray-600 text-xs font-medium rounded-full">
          {user?.currency?.symbol || "₹"} {user?.currency?.code || "INR"}
        </span>

        {/* Avatar — mobile only (sidebar hidden on mobile) */}
        <div className="flex md:hidden w-8 h-8 rounded-full bg-indigo-100
          items-center justify-center text-indigo-700 text-xs font-semibold">
          {user?.name?.charAt(0).toUpperCase() || "U"}
        </div>
      </div>
    </header>
  );
};

export default Navbar;