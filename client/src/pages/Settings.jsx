import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  updateProfile,
  changePassword,
  logout,
} from "../features/auth/authSlice";
import authService from "../services/authServices";
import ConfirmDialog from "../components/ui/ConfirmDialog";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(1, "Name is required").max(50),
  currencyCode:   z.string().min(1),
  currencySymbol: z.string().min(1),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(6, "At least 6 characters")
      .regex(/\d/, "Must contain at least one number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const deleteSchema = z.object({
  password: z.string().min(1, "Password is required to confirm"),
});

// ─── Shared components ────────────────────────────────────────────────────────

const Section = ({ title, subtitle, children }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-4">
    <div className="border-b border-gray-50 pb-3">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const Field = ({ label, error, children }) => (
  <div>
    <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}</label>
    {children}
    {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
  </div>
);

const inputClass = (hasError = false) =>
  `w-full px-3 py-2 text-sm border rounded-lg outline-none transition
  focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white
  ${hasError ? "border-red-300" : "border-gray-200"}`;

const CURRENCIES = [
  { code: "INR", symbol: "₹", label: "Indian Rupee" },
  { code: "USD", symbol: "$", label: "US Dollar" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "GBP", symbol: "£", label: "British Pound" },
  { code: "JPY", symbol: "¥", label: "Japanese Yen" },
  { code: "AED", symbol: "د.إ", label: "UAE Dirham" },
  { code: "SGD", symbol: "S$", label: "Singapore Dollar" },
  { code: "CAD", symbol: "CA$", label: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", label: "Australian Dollar" },
];

// ─── Profile Section ──────────────────────────────────────────────────────────

const ProfileSection = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name:           user?.name || "",
      currencyCode:   user?.currency?.code || "INR",
      currencySymbol: user?.currency?.symbol || "₹",
    },
  });

  const [saving, setSaving] = useState(false);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      await dispatch(updateProfile({
        name: data.name,
        currency: {
          code:   data.currencyCode,
          symbol: data.currencySymbol,
        },
      })).unwrap();
      toast.success("Profile updated!");
    } catch (err) {
      toast.error(err || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Section title="Profile" subtitle="Update your name and currency">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* Avatar */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center
            justify-center text-indigo-700 text-lg font-semibold flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">{user?.name}</p>
            <p className="text-xs text-gray-400">{user?.email}</p>
          </div>
        </div>

        <Field label="Full name" error={errors.name?.message}>
          <input
            type="text"
            {...register("name")}
            className={inputClass(errors.name)}
          />
        </Field>

        <Field label="Currency">
          <select
            {...register("currencyCode")}
            onChange={(e) => {
              const selected = CURRENCIES.find((c) => c.code === e.target.value);
              if (selected) {
                // update symbol field in sync
              }
            }}
            className={inputClass()}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} — {c.label} ({c.code})
              </option>
            ))}
          </select>
        </Field>

        <button
          type="submit"
          disabled={saving || !isDirty}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700
            disabled:bg-indigo-300 text-white text-sm font-medium
            rounded-lg transition"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>
    </Section>
  );
};

// ─── Password Section ─────────────────────────────────────────────────────────

const PasswordSection = () => {
  const dispatch = useDispatch();
  const [saving, setSaving] = useState(false);
  const [show, setShow] = useState({
    current: false, newP: false, confirm: false
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(passwordSchema) });

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      await dispatch(changePassword({
        currentPassword: data.currentPassword,
        newPassword:     data.newPassword,
      })).unwrap();
      toast.success("Password changed successfully!");
      reset();
    } catch (err) {
      toast.error(err || "Failed to change password");
    } finally {
      setSaving(false);
    }
  };

  const EyeIcon = ({ visible }) => (
    <svg width="15" height="15" fill="none" stroke="currentColor"
      strokeWidth="2" viewBox="0 0 24 24">
      {visible
        ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45
            18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7
            0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23"
            y2="23"/></>
        : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/></>
      }
    </svg>
  );

  const PasswordField = ({ label, name, showKey, error }) => (
    <Field label={label} error={error}>
      <div className="relative">
        <input
          type={show[showKey] ? "text" : "password"}
          placeholder="••••••••"
          {...register(name)}
          className={`${inputClass(!!error)} pr-10`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => ({ ...s, [showKey]: !s[showKey] }))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400
            hover:text-gray-600"
        >
          <EyeIcon visible={show[showKey]}/>
        </button>
      </div>
    </Field>
  );

  return (
    <Section title="Change password" subtitle="Keep your account secure">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <PasswordField
          label="Current password"
          name="currentPassword"
          showKey="current"
          error={errors.currentPassword?.message}
        />
        <PasswordField
          label="New password"
          name="newPassword"
          showKey="newP"
          error={errors.newPassword?.message}
        />
        <PasswordField
          label="Confirm new password"
          name="confirmPassword"
          showKey="confirm"
          error={errors.confirmPassword?.message}
        />
        <button
          type="submit"
          disabled={saving}
          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700
            disabled:bg-indigo-300 text-white text-sm font-medium
            rounded-lg transition"
        >
          {saving ? "Changing..." : "Change password"}
        </button>
      </form>
    </Section>
  );
};

// ─── Account Info Section ─────────────────────────────────────────────────────

const AccountInfoSection = () => {
  const { user } = useSelector((state) => state.auth);

  const rows = [
    { label: "Account created", value: user?.createdAt
        ? new Date(user.createdAt).toLocaleDateString("en-IN", {
            day: "numeric", month: "long", year: "numeric"
          })
        : "—"
    },
    { label: "Last login", value: user?.lastLogin
        ? new Date(user.lastLogin).toLocaleDateString("en-IN", {
            day: "numeric", month: "short", year: "numeric",
            hour: "2-digit", minute: "2-digit"
          })
        : "—"
    },
    { label: "Email", value: user?.email },
    {
      label: "Currency",
      value: `${user?.currency?.symbol} ${user?.currency?.code}`
    },
  ];

  return (
    <Section title="Account info">
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.label}
            className="flex items-center justify-between py-1.5
            border-b border-gray-50 last:border-0">
            <span className="text-xs text-gray-400">{r.label}</span>
            <span className="text-xs font-medium text-gray-700">{r.value}</span>
          </div>
        ))}
      </div>
    </Section>
  );
};

// ─── Danger Zone Section ──────────────────────────────────────────────────────

const DangerZoneSection = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({ resolver: zodResolver(deleteSchema) });

  const handleDelete = async (data) => {
    setDeleting(true);
    try {
      await authService.deleteAccount({ password: data.password });
      dispatch(logout());
      toast.success("Account deleted.");
      navigate("/login");
    } catch (err) {
      toast.error(err.message || "Incorrect password");
      setDeleting(false);
    }
  };

  return (
    <Section
      title="Danger zone"
      subtitle="Irreversible actions — proceed with caution"
    >
      <div className="flex items-start justify-between gap-4 p-3
        rounded-lg border border-red-100 bg-red-50/40">
        <div>
          <p className="text-sm font-medium text-red-700">Delete account</p>
          <p className="text-xs text-red-400 mt-0.5">
            Permanently deletes your account and all expense data. Cannot be undone.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-red-600
            border border-red-200 rounded-lg hover:bg-red-100 transition"
        >
          Delete
        </button>
      </div>

      {/* Delete confirm modal with password input */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { setOpen(false); reset(); }}
          />
          <div className="relative w-full max-w-sm bg-white rounded-2xl
            shadow-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Delete account
            </h3>
            <p className="text-xs text-gray-500">
              This will permanently delete your account and ALL your expense data.
              Enter your password to confirm.
            </p>

            <form onSubmit={handleSubmit(handleDelete)} className="space-y-3">
              <Field label="Your password" error={errors.password?.message}>
                <input
                  type="password"
                  placeholder="••••••••"
                  {...register("password")}
                  className={inputClass(errors.password)}
                />
              </Field>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setOpen(false); reset(); }}
                  className="flex-1 py-2 border border-gray-200 text-gray-600
                    text-sm font-medium rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deleting}
                  className="flex-1 py-2 bg-red-500 hover:bg-red-600
                    disabled:opacity-60 text-white text-sm font-medium
                    rounded-lg transition"
                >
                  {deleting ? "Deleting..." : "Delete permanently"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Section>
  );
};

// ─── Settings Page ────────────────────────────────────────────────────────────

const Settings = () => {
  const dispatch  = useDispatch();
  const navigate  = useNavigate();
  const { user }  = useSelector((state) => state.auth);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  return (
    <div className="max-w-2xl space-y-4">

      <ProfileSection />
      <PasswordSection />
      <AccountInfoSection />

      {/* Logout */}
      <div className="bg-white rounded-xl border border-gray-100 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Sign out</p>
            <p className="text-xs text-gray-400 mt-0.5">
              Signed in as {user?.email}
            </p>
          </div>
          <button
            onClick={() => setLogoutOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200
              text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor"
              strokeWidth="2" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>
        </div>
      </div>

      <DangerZoneSection />

      {/* Logout confirm */}
      <ConfirmDialog
        isOpen={logoutOpen}
        onClose={() => setLogoutOpen(false)}
        onConfirm={handleLogout}
        title="Sign out"
        message="Are you sure you want to sign out?"
        confirmLabel="Sign out"
        danger={false}
      />
    </div>
  );
};

export default Settings;