import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./protectedRoutes.jsx";
import AppLayout from "../components/layout/AppLayout";
import Login from "../pages/auth/Login";
import Register from "../pages/auth/Register";

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
          <Route path="/"          element={<Placeholder name="Dashboard" />} />
          <Route path="/analytics" element={<Placeholder name="Analytics" />} />
          <Route path="/history"   element={<Placeholder name="History" />} />
          <Route path="/budget"    element={<Placeholder name="Budget" />} />
          <Route path="/settings"  element={<Placeholder name="Settings" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;