import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/hooks/useRedux';
import { ShieldCheck, Activity } from 'lucide-react';

export const AuthLayout: React.FC = () => {
  const { isAuthenticated, isInitializing } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (!isInitializing && isAuthenticated) {
    const from = (location.state as any)?.from?.pathname || '/app/dashboard';
    return <Navigate to={from} replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col justify-center items-center p-4 sm:p-6 text-slate-100">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary text-white shadow-lg shadow-primary/30 mb-2">
            <Activity className="h-7 w-7 stroke-[2.5]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            RoadSense
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/20 text-primary-foreground border border-primary/40 uppercase tracking-widest">
              Civic AI
            </span>
          </h1>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Municipal AI-driven road damage detection, geolocated pothole mapping, and repair workflow operations.
          </p>
        </div>

        {/* Content Outlet (Login Form) */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <Outlet />
        </div>

        <div className="text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Department of Public Works & Municipal Infrastructure Operations</span>
        </div>
      </div>
    </div>
  );
};
