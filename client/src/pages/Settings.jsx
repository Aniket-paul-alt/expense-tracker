import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { updateProfile, changePassword, logout } from "../features/auth/authSlice";
import authService from "../services/authServices";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { useTheme } from "../contexts/ThemeContext";
import { useNotifications } from "../contexts/NotificationContext";

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
  <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 space-y-4 transition-colors">
    <div className="border-b border-gray-50 dark:border-gray-800/50 pb-3">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

const Field = ({ label, error, children }) => (
  <div>
    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1.5">{label}</label>
    {children}
    {error && <p className="text-red-500 dark:text-red-400 text-xs mt-1">{error}</p>}
  </div>
);

const inputClass = (hasError = false) =>
  `w-full px-3 py-2 text-sm border rounded-lg outline-none transition
  focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100
  ${hasError ? "border-red-300 dark:border-red-500/50" : "border-gray-200 dark:border-gray-700"}`;

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
          <div className="w-12 h-12 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center
            justify-center text-indigo-700 dark:text-indigo-400 text-lg font-semibold flex-shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{user?.name}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{user?.email}</p>
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
            disabled:bg-indigo-300 dark:disabled:bg-indigo-900/40 text-white dark:disabled:text-indigo-200 text-sm font-medium
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
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500
            hover:text-gray-600 dark:hover:text-gray-300"
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
            disabled:bg-indigo-300 dark:disabled:bg-indigo-900/40 text-white text-sm font-medium
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
            border-b border-gray-50 dark:border-gray-800/50 last:border-0">
            <span className="text-xs text-gray-400 dark:text-gray-500">{r.label}</span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{r.value}</span>
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
        rounded-lg border border-red-100 dark:border-red-900/50 bg-red-50/40 dark:bg-red-900/10">
        <div>
          <p className="text-sm font-medium text-red-700 dark:text-red-400">Delete account</p>
          <p className="text-xs text-red-400 dark:text-red-500 mt-0.5">
            Permanently deletes your account and all expense data. Cannot be undone.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400
            border border-red-200 dark:border-red-800/50 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition"
        >
          Delete
        </button>
      </div>

      {/* Delete confirm modal with password input */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => { setOpen(false); reset(); }}
          />
          <div className="relative w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl
            shadow-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Delete account
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
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
                  className="flex-1 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300
                    text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
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

// ─── Notifications Section ───────────────────────────────────────────────────

const NotificationsSection = () => {
  const { isAuthenticated, user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const {
    permission, isSubscribed, isLoading, error, subscribe, unsubscribe, isSupported,
  } = useNotifications();

  const [dailyReminder, setDailyReminder] = useState(
    user?.preferences?.dailyReminder !== false
  );
  const [budgetAlerts, setBudgetAlerts] = useState(
    user?.preferences?.budgetAlerts !== false
  );
  const [saving, setSaving] = useState(false);

  const handleSubscribe = async () => {
    const ok = await subscribe();
    if (ok) toast.success("Notifications enabled! 🔔");
    else if (error) toast.error(error);
  };

  const handleUnsubscribe = async () => {
    const ok = await unsubscribe();
    if (ok) toast.success("Notifications disabled.");
  };

  const savePrefs = async (field, value) => {
    setSaving(true);
    try {
      await dispatch(updateProfile({
        preferences: { ...user?.preferences, [field]: value },
      })).unwrap();
      toast.success("Preferences saved!");
    } catch {
      toast.error("Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  const PermissionBadge = () => {
    const map = {
      granted:     { color: "text-green-600 dark:text-green-400",  bg: "bg-green-50 dark:bg-green-900/20",  label: "Allowed",   dot: "bg-green-500" },
      denied:      { color: "text-red-600 dark:text-red-400",    bg: "bg-red-50 dark:bg-red-900/20",    label: "Blocked",   dot: "bg-red-500"   },
      default:     { color: "text-gray-600 dark:text-gray-400",   bg: "bg-gray-50 dark:bg-gray-800",    label: "Not asked", dot: "bg-gray-400"  },
      unsupported: { color: "text-gray-500 dark:text-gray-500",   bg: "bg-gray-50 dark:bg-gray-800",    label: "Not supported", dot: "bg-gray-400" },
    };
    const s = map[permission] || map.default;
    return (
      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${s.bg} ${s.color}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {s.label}
      </span>
    );
  };

  const Toggle = ({ checked, onChange, disabled }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1
        disabled:opacity-40 disabled:cursor-not-allowed
        ${checked ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-700"}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform
          ${checked ? "translate-x-6" : "translate-x-1"}`}
      />
    </button>
  );

  if (!isSupported) {
    return (
      <Section title="Notifications" subtitle="Control push notification preferences">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Push notifications are not supported in this browser. Try Chrome or Edge.
        </p>
      </Section>
    );
  }

  return (
    <Section title="Notifications" subtitle="Get alerts even when the app is closed">
      <div className="space-y-4">

        {/* Permission status row */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Browser permission</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Required to receive any notifications</p>
          </div>
          <PermissionBadge />
        </div>

        {/* Enable / Disable button */}
        {!isSubscribed ? (
          <button
            onClick={handleSubscribe}
            disabled={isLoading || permission === "denied"}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700
              disabled:bg-indigo-300 dark:disabled:bg-indigo-900/40
              disabled:text-indigo-200 text-white text-sm font-medium rounded-lg transition"
          >
            {isLoading ? "Enabling..." : permission === "denied" ? "Blocked in browser settings" : "🔔 Enable Notifications"}
          </button>
        ) : (
          <button
            onClick={handleUnsubscribe}
            disabled={isLoading}
            className="w-full py-2.5 border border-gray-200 dark:border-gray-700
              text-gray-600 dark:text-gray-300 text-sm font-medium rounded-lg
              hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            {isLoading ? "Disabling..." : "🔕 Disable Notifications"}
          </button>
        )}

        {/* Granular toggles — only shown when subscribed */}
        {isSubscribed && (
          <div className="space-y-3 border-t border-gray-100 dark:border-gray-800/50 pt-3">

            {/* Daily reminder */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">⏰ Daily reminder (8 PM)</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Reminds you to log expenses if you haven't today
                </p>
              </div>
              <Toggle
                checked={dailyReminder}
                disabled={saving}
                onChange={(v) => { setDailyReminder(v); savePrefs("dailyReminder", v); }}
              />
            </div>

            {/* Budget alerts */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200">🚨 Budget alerts</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  Alerts when you reach 80% or exceed a budget
                </p>
              </div>
              <Toggle
                checked={budgetAlerts}
                disabled={saving}
                onChange={(v) => { setBudgetAlerts(v); savePrefs("budgetAlerts", v); }}
              />
            </div>
          </div>
        )}

        {/* Denied state help */}
        {permission === "denied" && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-100
            dark:border-amber-900/30 px-3 py-2.5">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Notifications are blocked. To enable: open your browser settings → Site settings
              → Notifications → find this site and set to &quot;Allow&quot;.
            </p>
          </div>
        )}
      </div>
    </Section>
  );
};

// ─── Theme Info Section ─────────────────────────────────────────────────────

const ThemeSection = () => {
  const { theme, setTheme } = useTheme();

  return (
    <Section title="Appearance" subtitle="Customize the theme of your application">
      <div className="grid grid-cols-3 gap-3">
        {[
          { id: "light", label: "Light", icon: "☀️" },
          { id: "dark", label: "Dark", icon: "🌙" },
          { id: "system", label: "System", icon: "💻" }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setTheme(t.id)}
            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
              theme === t.id 
                ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400 font-medium shadow-sm" 
                : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
            }`}
          >
            <span className="text-xl mb-1.5">{t.icon}</span>
            <span className="text-xs">{t.label}</span>
          </button>
        ))}
      </div>
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
    <div className="max-w-2xl mx-auto space-y-4">
      <ThemeSection />
      <NotificationsSection />
      <ProfileSection />
      <PasswordSection />
      <AccountInfoSection />

      {/* Logout */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-5 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Sign out</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Signed in as {user?.email}
            </p>
          </div>
          <button
            onClick={() => setLogoutOpen(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 dark:border-gray-700
              text-gray-600 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition"
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