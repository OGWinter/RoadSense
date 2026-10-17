import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector } from '@/hooks/useRedux';
import { UserRole } from '@/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface RequireRoleProps {
  children: React.ReactNode;
  allowedRoles: UserRole[];
  fallbackUrl?: string;
}

export const RequireRole: React.FC<RequireRoleProps> = ({
  children,
  allowedRoles,
  fallbackUrl = '/app/dashboard',
}) => {
  const { user, isAuthenticated, isInitializing } = useAppSelector((state) => state.auth);

  if (isInitializing) {
    return null;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="flex h-[70vh] items-center justify-center p-6">
        <Card className="max-w-md w-full border-destructive/30 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-3">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <CardTitle className="text-xl">Access Restricted</CardTitle>
            <CardDescription>
              Your role <strong className="font-semibold text-foreground uppercase">{user.role}</strong> does not have permission to access this administrative module.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pt-2">
            <Button asChild variant="outline">
              <Link to={fallbackUrl}>Return to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};
