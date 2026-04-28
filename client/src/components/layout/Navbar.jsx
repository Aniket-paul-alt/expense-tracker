import { useState } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "react-router-dom";
import { useTheme } from "../../contexts/ThemeContext";
import NotificationPanel from "./NotificationPanel";

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
  const { unreadCount } = useSelector((state) => state.notifications);
  const { toggleTheme, isDark } = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);

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
      bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex-shrink-0 transition-colors duration-200">

      {/* Left: page title */}
      <div>
        <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">{page.title}</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">{page.subtitle}</p>
      </div>

      {/* Right: date + notifications + theme + avatar */}
      <div className="flex items-center gap-3">

        {/* Date — hidden on small screens */}
        <span className="hidden lg:block text-xs text-gray-400 dark:text-gray-500">{today}</span>

        {/* Toggle Theme */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 flex items-center justify-center rounded-lg
            bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400
            hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {isDark ? (
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          ) : (
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          )}
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setNotifOpen(!notifOpen);
            }}
            className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors
              ${unreadCount > 0 
                ? "bg-amber-50 dark:bg-amber-900/30 text-amber-500 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50" 
                : "bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </button>
          
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white
              text-[10px] rounded-full flex items-center justify-center font-bold animate-pulse">
              {unreadCount}
            </span>
          )}

          <NotificationPanel isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
        </div>

        {/* Currency badge */}
        <span className="hidden sm:flex items-center px-2.5 py-1 bg-gray-100 dark:bg-gray-800
          text-gray-600 dark:text-gray-300 text-xs font-medium rounded-full transition-colors">
          {user?.currency?.symbol || "₹"} {user?.currency?.code || "INR"}
        </span>

        {/* Avatar — mobile only (sidebar hidden on mobile) */}
        <div className="flex md:hidden w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50
          items-center justify-center text-indigo-700 dark:text-indigo-400 text-xs font-semibold transition-colors">
          {user?.name?.charAt(0).toUpperCase() || "U"}
        </div>
      </div>
    </header>
  );
};

export default Navbar;