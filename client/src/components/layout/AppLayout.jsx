import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { fetchMe } from "../../features/auth/authSlice";
import { fetchNotifications } from "../../features/notifications/notificationsSlice";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";

const AppLayout = () => {
  const dispatch = useDispatch();
  const { token } = useSelector((state) => state.auth);

  // Refresh user data and notifications on every app load
  useEffect(() => {
    if (token) {
      dispatch(fetchMe());
      dispatch(fetchNotifications());
    }
  }, [token, dispatch]);

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden transition-colors duration-200">

      {/* Sidebar — hidden on mobile, visible on md+ */}
      <aside className="hidden md:flex md:w-60 lg:w-64 flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Top navbar */}
        <Navbar />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
          <Outlet />
        </main>
      </div>

      {/* Bottom nav — mobile only */}
      <BottomNav />
    </div>
  );
};

export default AppLayout;