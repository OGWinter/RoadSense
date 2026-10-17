import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppSelector } from '@/hooks/useRedux';
import { Skeleton } from '@/components/ui/skeleton';

export const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isInitializing } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (isInitializing) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-6">
        <div className="flex flex-col items-center space-y-4 max-w-sm w-full">
          <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center animate-pulse">
            <span className="font-bold text-primary text-xl">RS</span>
          </div>
          <p className="text-sm text-muted-foreground font-medium">Authenticating RoadSense session...</p>
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
