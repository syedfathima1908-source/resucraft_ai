import React from 'react';
import { DashboardLayout } from '../components/dashboard/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { User, Mail, ShieldCheck } from 'lucide-react';

export const ProfilePlaceholder: React.FC = () => {
  const { user } = useAuth();
  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  return (
    <DashboardLayout title="User Profile">
      <div className="bg-white rounded-3xl p-8 border border-slate-200/80 max-w-2xl mx-auto space-y-6 shadow-xs">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white font-extrabold flex items-center justify-center text-2xl shadow-md">
            {fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{fullName}</h2>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 mt-1">
              <ShieldCheck className="w-3 h-3" /> Supabase Authenticated User
            </span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <User className="w-3.5 h-3.5 text-blue-600" /> Full Name
            </div>
            <p className="text-sm font-semibold text-slate-900">{fullName}</p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/70 space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Mail className="w-3.5 h-3.5 text-indigo-600" /> Account Email
            </div>
            <p className="text-sm font-semibold text-slate-900">{user?.email}</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
