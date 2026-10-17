import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { User } from '@/types';
import { setAuthToken } from '@/services/apiClient';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isInitializing: true,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; token?: string }>
    ) => {
      state.user = action.payload.user;
      state.isAuthenticated = true;
      state.isInitializing = false;
      if (action.payload.token) {
        setAuthToken(action.payload.token);
      }
    },
    clearCredentials: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      state.isInitializing = false;
      setAuthToken(null);
    },
    setAuthInitialized: (state, action: PayloadAction<boolean>) => {
      state.isInitializing = !action.payload;
    },
    updateUser: (state, action: PayloadAction<Partial<User>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
});

export const { setCredentials, clearCredentials, setAuthInitialized, updateUser } =
  authSlice.actions;

export default authSlice.reducer;
