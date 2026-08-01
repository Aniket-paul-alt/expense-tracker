import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import authService from "../../services/authServices.js";

const schema = z.object({
  email: z.string().email("Enter a valid email"),
});

const ForgotPassword = () => {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      await authService.forgotPassword(data);
      setSuccess(true);
      toast.success("Reset link sent to your email!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4 transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 transition-colors">
        
        <div className="mb-8 text-center">
          <div className="text-3xl mb-2">🔒</div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Forgot Password</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Enter your email and we'll send you a link to reset your password.
          </p>
        </div>

        {success ? (
          <div className="text-center">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg mb-6 text-sm">
              An email with a reset link has been sent to your inbox.
            </div>
            <Link to="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium text-sm">
              Back to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                {...register("email")}
                className={`w-full px-4 py-2.5 rounded-lg border text-sm outline-none transition-colors
                  focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-900 dark:text-gray-100
                  ${errors.email ? "border-red-400 dark:border-red-500/50 bg-red-50 dark:bg-red-900/10" : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800"}`}
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700
                disabled:bg-indigo-400 text-white text-sm font-medium
                rounded-lg transition cursor-pointer"
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </button>
            
            <div className="text-center mt-4">
              <Link to="/login" className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 text-sm transition-colors">
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
