import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles,
  LayoutDashboard,
  FileSearch,
  Wand2,
  History,
  User as UserIcon,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Bot,
  Bell,
} from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, title = 'Dashboard' }) => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const fullName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';
  const email = user?.email || '';

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Analyze Resume', path: '/analyze', icon: FileSearch },
    { name: 'AI Resume Optimizer', path: '/optimizer', icon: Wand2 },
    { name: 'AI Mock Interview', path: '/interview', icon: Bot },
    { name: 'Analysis History', path: '/history', icon: History },
    { name: 'Profile', path: '/profile', icon: UserIcon },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50/60 flex font-sans text-slate-900 selection:bg-blue-600 selection:text-white">
      {/* Mobile Sidebar Backdrop Overlay */}
      {mobileSidebarOpen && (
        <div
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between transition-transform duration-200 ease-in-out md:translate-x-0 ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header & Navigation Links */}
        <div>
          {/* Logo */}
          <div className="h-16 sm:h-20 px-6 flex items-center justify-between border-b border-slate-100">
            <Link to="/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                Resu<span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Craft</span> AI
              </span>
            </Link>
            <button
              onClick={() => setMobileSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Links List */}
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200/60 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <ChevronRight className="w-4 h-4 text-blue-600" />}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom User Area */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 p-2 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-xs flex-shrink-0">
              {fullName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{fullName}</p>
              <p className="text-[11px] text-slate-500 truncate">{email}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full mt-3 flex items-center justify-center gap-2 py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0 md:pl-64">
        {/* Top Header Bar */}
        <header className="h-16 sm:h-20 bg-white border-b border-slate-200/80 sticky top-0 z-30 px-4 sm:px-8 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              aria-label="Open Navigation Menu"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900">{title}</h1>
          </div>

          {/* Top User & Notification Controls */}
          <div className="flex items-center gap-4">
            {/* Notification Bell Icon */}
            <button
              type="button"
              className="relative p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
            </button>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            {/* User Profile Badge */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-900">{fullName}</span>
                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/50">
                  Student / Candidate
                </span>
              </div>
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-sm ring-2 ring-blue-100">
                {fullName.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-8">
          {children}
        </main>
      </div>
    </div>
  );
};
