import React from 'react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { Settings, Sliders } from 'lucide-react';

export const SettingsPlaceholder: React.FC = () => {
  return (
    <DashboardLayout title="Settings">
      <div className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 text-center max-w-3xl mx-auto space-y-6 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mx-auto border border-purple-200/60 shadow-2xs">
          <Settings className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-slate-900">Account & Preference Settings</h2>
          <p className="text-slate-600 text-sm max-w-md mx-auto">
            Manage your account notifications, ATS scoring preferences, and API configuration.
          </p>
        </div>

        <div className="p-8 border border-slate-200 rounded-2xl bg-slate-50/50 space-y-3">
          <Sliders className="w-10 h-10 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Account Preferences</p>
        </div>
      </div>
    </DashboardLayout>
  );
};
