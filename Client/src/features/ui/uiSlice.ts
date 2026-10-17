import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UiState {
  sidebarCollapsed: boolean;
  mobileMenuOpen: boolean;
  isBackendOnline: boolean;
  lastBackendError: string | null;
}

const initialState: UiState = {
  sidebarCollapsed: false,
  mobileMenuOpen: false,
  isBackendOnline: true,
  lastBackendError: null,
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.sidebarCollapsed = action.payload;
    },
    setMobileMenuOpen: (state, action: PayloadAction<boolean>) => {
      state.mobileMenuOpen = action.payload;
    },
    setBackendStatus: (state, action: PayloadAction<{ online: boolean; error?: string }>) => {
      state.isBackendOnline = action.payload.online;
      state.lastBackendError = action.payload.error || null;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarCollapsed,
  setMobileMenuOpen,
  setBackendStatus,
} = uiSlice.actions;

export default uiSlice.reducer;
