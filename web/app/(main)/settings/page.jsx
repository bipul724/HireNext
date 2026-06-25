"use client";

import { useState } from 'react';
import Head from 'next/head';
import { User, Settings as SettingsIcon, Bell, Shield, Save, Key, Trash2, LogOut } from 'lucide-react';
import { toast } from "sonner";
import { supabase } from "@/services/supabaseClient";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

/* --- UI COMPONENTS (Internal) --- */

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6 ${className}`}>
    {children}
  </div>
);

const SectionHeader = ({ icon: Icon, title, description }) => (
  <div className="mb-6 border-b border-gray-100 pb-4">
    <div className="flex items-center gap-2 mb-1">
      <div className="p-2 bg-primary/10 rounded-lg">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h2 className="text-lg font-bold text-gray-800">{title}</h2>
    </div>
    <p className="text-sm text-gray-500 ml-11">{description}</p>
  </div>
);

const Input = ({ label, id, ...props }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</label>}
    <input
      id={id}
      {...props}
      className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-gray-400 text-gray-900"
    />
  </div>
);

// Note: This component renders a standard <select> inside
const Select = ({ label, id, children, ...props }) => (
  <div className="flex flex-col gap-1.5 w-full">
    {label && <label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</label>}
    <select
      id={id}
      {...props}
      className="px-3 py-2 border border-gray-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all cursor-pointer text-gray-900"
    >
      {children}
    </select>
  </div>
);

const Toggle = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-3 cursor-pointer group select-none">
    <div className="relative">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange({ target: { checked: !checked } })}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
          ${checked ? 'bg-primary' : 'bg-gray-200'}
        `}
      >
        <span className={`
          pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out
          ${checked ? 'translate-x-6' : 'translate-x-1'}
        `} />
      </button>
    </div>
    <span className="text-sm text-gray-700 font-medium group-hover:text-gray-900 transition-colors">
      {label}
    </span>
  </label>
);

/* --- MAIN PAGE COMPONENT --- */

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [profile, setProfile] = useState({ name: '', email: '', bio: '' });
  const [preferences, setPreferences] = useState({ language: 'English', difficulty: 'Medium', autoSave: true });
  const [notifications, setNotifications] = useState({ emailAlerts: true, pushNotifications: false });

  const handleSave = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Settings saved", {
        description: "Your profile and preferences have been updated.",
      });
    }, 800);
  };

  const handlePasswordUpdate = () => {
    toast("Security verification required", {
      description: "We've sent a password reset link to your email address.",
      style: {
        background: "#fff",      // Ensure background is solid white
        color: "#111827",        // Force text to dark gray/black (Tailwind's gray-900)
      },
      // If you want to target the description specifically
      descriptionClassName: "text-gray-600",
    });
  };

  const handleDeleteAccount = () => {
    toast.error("Are you absolutely sure?", {
      description: "This action will permanently delete all your data.",
      action: {
        label: "Confirm",
        onClick: () => {},
      },
    });
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success("Logged out successfully");
      router.push("/");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Failed to log out");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8 pb-20">

        <header>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Settings</h1>
          <p className="text-gray-500 mt-2 text-lg">Configure your HireNext account and interview engine.</p>
        </header>

        <form onSubmit={handleSave}>

          <Card>
            <SectionHeader
              icon={User}
              title="Personal Information"
              description="Manage your identity and how recruiters see you."
            />
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Full Name"
                  id="name"
                  placeholder="e.g. Adity"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  required
                />
                <Input
                  label="Email Address"
                  id="email"
                  type="email"
                  placeholder="adity@example.com"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="bio" className="text-sm font-medium text-gray-700">Bio</label>
                <textarea
                  id="bio"
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none min-h-[120px] resize-y text-gray-900"
                  placeholder="Briefly describe your professional background..."
                  value={profile.bio}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                />
              </div>
            </div>
          </Card>

          <Card>
            <SectionHeader
              icon={SettingsIcon}
              title="Interview Configuration"
              description="Fine-tune the AI voice and assessment logic."
            />
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* FIXED: Using <Select> and closing with </Select> */}
                <Select
                  label="Preferred Language"
                  id="language"
                  value={preferences.language}
                  onChange={(e) => setPreferences({ ...preferences, language: e.target.value })}
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                </Select>

                <Select
                  label="Difficulty Level"
                  id="difficulty"
                  value={preferences.difficulty}
                  onChange={(e) => setPreferences({ ...preferences, difficulty: e.target.value })}
                >
                  <option value="Easy">Easy (Junior)</option>
                  <option value="Medium">Medium (Mid-level)</option>
                  <option value="Hard">Hard (Senior)</option>
                </Select>
              </div>

              <div className="pt-2">
                <Toggle
                  label="Auto-save responses during interview"
                  checked={preferences.autoSave}
                  onChange={(e) => setPreferences({ ...preferences, autoSave: e.target.checked })}
                />
              </div>
            </div>
          </Card>

          <Card>
            <SectionHeader
              icon={Bell}
              title="Notifications"
              description="Set how you want to be alerted for interview updates."
            />
            <div className="space-y-4">
              <Toggle
                label="Email alerts for new interview requests"
                checked={notifications.emailAlerts}
                onChange={(e) => setNotifications({ ...notifications, emailAlerts: e.target.checked })}
              />
              <Toggle
                label="Real-time push notifications"
                checked={notifications.pushNotifications}
                onChange={(e) => setNotifications({ ...notifications, pushNotifications: e.target.checked })}
              />
            </div>
          </Card>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={loading}
              className={`flex items-center gap-2 px-8 py-3 h-auto rounded-xl font-bold transition-all hover:shadow-lg active:scale-95 ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <Save className="w-4 h-4" />
              {loading ? 'Processing...' : 'Save Settings'}
            </Button>
          </div>
        </form>

        <div className="mt-16 pt-8 border-t border-gray-200">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-900" /> Account Security
          </h2>

          {/* Logout Box */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex gap-4">
              <div className="bg-slate-100 p-3 rounded-full h-fit">
                <LogOut className="w-5 h-5 text-slate-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Sign Out</h3>
                <p className="text-sm text-gray-500 mt-0.5">Log out of your HireNext account on this device.</p>
              </div>
            </div>
            <Button
              type="button"
              onClick={handleLogout}
              className="bg-slate-900 text-white hover:bg-slate-800 px-6 py-2 h-auto rounded-lg text-sm font-bold transition-colors"
            >
              Logout
            </Button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex gap-4">
              <div className="bg-gray-100 p-3 rounded-full h-fit">
                <Key className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">Password</h3>
                <p className="text-sm text-gray-500 mt-0.5">Maintain your account security with a strong password.</p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handlePasswordUpdate}
              className="px-6 py-2 h-auto rounded-lg text-sm font-bold transition-colors"
            >
              Update Password
            </Button>
          </div>

          <div className="bg-red-50/50 border border-red-100 rounded-xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex gap-4">
              <div className="bg-red-100 p-3 rounded-full h-fit">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-red-900 text-lg">Delete Account</h3>
                <p className="text-sm text-red-700 mt-0.5">This will erase all your history, recorded interviews, and profile data.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleDeleteAccount}
              className="px-6 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-colors whitespace-nowrap"
            >
              Delete Account
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}