import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./protectedRoutes.jsx";
import AppLayout from "../components/layout/AppLayout";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";
import Dashboard from "../pages/Dashboard";
import Analytics from "../pages/Analytics";
import History from "../pages/History";
import Budget from "../pages/Budget";
import Settings from "../pages/Settings";

// Placeholder pages — replace one by one as you build each
const Placeholder = ({ name }) => (
  <div className="flex items-center justify-center h-64 text-gray-400 text-sm">
    {name} page — coming soon
  </div>
);

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Protected */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/"          element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/history"   element={<History />} />
          <Route path="/budget"    element={<Budget />} />
          <Route path="/settings"  element={<Settings />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;