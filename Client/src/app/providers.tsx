import React, { useEffect } from 'react';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { store } from './store';
import { queryClient } from './queryClient';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from 'sonner';
import { authApi } from '@/features/auth/authApi';
import { setCredentials, clearCredentials, setAuthInitialized } from '@/features/auth/authSlice';
import { getAuthToken } from '@/services/apiClient';

interface ProvidersProps {
  children: React.ReactNode;
}

const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useEffect(() => {
    const initAuth = async () => {
      const existingToken = getAuthToken();
      if (!existingToken) {
        store.dispatch(clearCredentials());
        store.dispatch(setAuthInitialized(true));
        return;
      }

      try {
        const user = await authApi.getMe();
        if (user) {
          store.dispatch(setCredentials({ user, token: existingToken }));
        }
      } catch (err) {
        store.dispatch(clearCredentials());
      } finally {
        store.dispatch(setAuthInitialized(true));
      }
    };

    initAuth();
  }, []);

  return <>{children}</>;
};

export const Providers: React.FC<ProvidersProps> = ({ children }) => {
  return (
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={200}>
          <AuthInitializer>
            {children}
            <Toaster richColors position="top-right" closeButton />
          </AuthInitializer>
        </TooltipProvider>
      </QueryClientProvider>
    </Provider>
  );
};
