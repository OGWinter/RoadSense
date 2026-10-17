import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/features/auth/authSlice';
import uiReducer from '@/features/ui/uiSlice';
import { registerUnauthorizedHandler } from '@/services/apiClient';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
  },
  devTools: process.env.NODE_ENV !== 'production',
});

// Connect unauthorized callback to auto-clear credentials
registerUnauthorizedHandler(() => {
  store.dispatch({ type: 'auth/clearCredentials' });
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
