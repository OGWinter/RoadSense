import React from 'react';
import { useRouteError, isRouteErrorResponse, Link } from 'react-router-dom';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';

export const RouteErrorBoundary: React.FC = () => {
  const error = useRouteError();

  let errorMessage = 'An unexpected application error occurred.';
  let statusCode = 500;

  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    errorMessage = error.data?.message || error.statusText || errorMessage;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full border-destructive/20 shadow-xl">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-3">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <CardTitle className="text-xl">
            {statusCode === 404 ? 'Page Not Found' : 'Application Error'}
          </CardTitle>
          <CardDescription className="text-sm">
            {errorMessage}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground font-mono overflow-auto max-h-32">
            Status: {statusCode} | Trace: {String(error)}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between gap-3">
          <Button variant="outline" onClick={() => window.location.reload()} className="flex items-center gap-1.5 flex-1">
            <RefreshCw className="h-4 w-4" /> Reload
          </Button>
          <Button asChild className="flex items-center gap-1.5 flex-1">
            <Link to="/app/dashboard">
              <Home className="h-4 w-4" /> Dashboard
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
