import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4 text-muted-foreground font-bold text-2xl">
        404
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">Page Not Found</h1>
      <p className="text-sm text-muted-foreground max-w-md mb-6">
        The road or resource you are looking for does not exist in the RoadSense municipal index.
      </p>
      <div className="flex gap-3">
        <Button variant="outline" onClick={() => window.history.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Go Back
        </Button>
        <Button asChild className="gap-2">
          <Link to="/app/dashboard">
            <Home className="h-4 w-4" /> Go to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
};
