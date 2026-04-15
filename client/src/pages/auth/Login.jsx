import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, Link } from "react-router-dom";
import { loginUser, clearError } from "../../features/auth/authSlice";
import toast from "react-hot-toast";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, isLoggedIn } = useSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  // Redirect if already logged in
  useEffect(() => {
    if (isLoggedIn) navigate("/");
  }, [isLoggedIn, navigate]);

  // Show backend error as toast
  useEffect(() => {
    if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const onSubmit = (data) => {
    dispatch(loginUser(data));
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8">

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="text-3xl mb-2">💰</div>
          <h1 className="text-2xl font-semibold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              {...register("email")}
              className={`w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition
                focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                ${errors.email ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"}`}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              {...register("password")}
              className={`w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition
                focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500
                ${errors.password ? "border-red-400 bg-red-50" : "border-gray-200 bg-gray-50"}`}
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700
              disabled:bg-indigo-400 text-white text-sm font-medium
              rounded-lg transition cursor-pointer"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-6">
          Don't have an account?{" "}
          <Link to="/register" className="text-indigo-600 hover:underline font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;