import React, { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthLayout } from '@/layouts/AuthLayout';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import { RequireAuth } from '@/components/common/RequireAuth';
import { RequireRole } from '@/components/common/RequireRole';
import { RouteErrorBoundary } from '@/components/common/RouteErrorBoundary';
import { Skeleton } from '@/components/ui/skeleton';

// Lazy-loaded route components for high performance and minimal initial bundle
const LoginPage = lazy(() =>
  import('@/features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage }))
);
const NotFoundPage = lazy(() =>
  import('@/features/auth/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage }))
);
const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage }))
);
const MapPage = lazy(() =>
  import('@/features/map/pages/MapPage').then((m) => ({ default: m.MapPage }))
);
const IssuesPage = lazy(() =>
  import('@/features/issues/pages/IssuesPage').then((m) => ({ default: m.IssuesPage }))
);
const IssueDetailPage = lazy(() =>
  import('@/features/issues/pages/IssueDetailPage').then((m) => ({ default: m.IssueDetailPage }))
);
const UploadsPage = lazy(() =>
  import('@/features/uploads/pages/UploadsPage').then((m) => ({ default: m.UploadsPage }))
);
const NewUploadPage = lazy(() =>
  import('@/features/uploads/pages/NewUploadPage').then((m) => ({ default: m.NewUploadPage }))
);
const UploadDetailPage = lazy(() =>
  import('@/features/uploads/pages/UploadDetailPage').then((m) => ({ default: m.UploadDetailPage }))
);
const ReportsPage = lazy(() =>
  import('@/features/reports/pages/ReportsPage').then((m) => ({ default: m.ReportsPage }))
);
const UsersPage = lazy(() =>
  import('@/features/users/pages/UsersPage').then((m) => ({ default: m.UsersPage }))
);

const PageFallback = () => (
  <div className="p-6 space-y-4 max-w-5xl mx-auto">
    <Skeleton className="h-8 w-48" />
    <Skeleton className="h-4 w-72" />
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
      <Skeleton className="h-28" />
    </div>
    <Skeleton className="h-64 w-full" />
  </div>
);

const RegisterPage = lazy(() =>
  import('@/features/auth/pages/RegisterPage').then((m) => ({ default: m.RegisterPage }))
);
const ForgotPasswordPage = lazy(() =>
  import('@/features/auth/pages/ForgotPasswordPage').then((m) => ({ default: m.ForgotPasswordPage }))
);
const ResetPasswordPage = lazy(() =>
  import('@/features/auth/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage }))
);
const VerifyEmailPage = lazy(() =>
  import('@/features/auth/pages/VerifyEmailPage').then((m) => ({ default: m.VerifyEmailPage }))
);

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/app/dashboard" replace />,
    errorElement: <RouteErrorBoundary />,
  },
  {
    path: '/login',
    element: <AuthLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<div className="h-40 flex items-center justify-center text-xs text-slate-400">Loading portal...</div>}>
            <LoginPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '/register',
    element: <AuthLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<div className="h-40 flex items-center justify-center text-xs text-slate-400">Loading portal...</div>}>
            <RegisterPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '/forgot-password',
    element: <AuthLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<div className="h-40 flex items-center justify-center text-xs text-slate-400">Loading...</div>}>
            <ForgotPasswordPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '/reset-password',
    element: <AuthLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<div className="h-40 flex items-center justify-center text-xs text-slate-400">Loading...</div>}>
            <ResetPasswordPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '/verify-email',
    errorElement: <RouteErrorBoundary />,
    element: (
      <Suspense fallback={<div className="h-screen flex items-center justify-center text-xs text-slate-400">Verifying...</div>}>
        <VerifyEmailPage />
      </Suspense>
    ),
  },
  {
    path: '/app',
    element: (
      <RequireAuth>
        <DashboardLayout />
      </RequireAuth>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: <Navigate to="/app/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: (
          <Suspense fallback={<PageFallback />}>
            <DashboardPage />
          </Suspense>
        ),
      },
      {
        path: 'map',
        element: (
          <Suspense fallback={<PageFallback />}>
            <MapPage />
          </Suspense>
        ),
      },
      {
        path: 'issues',
        element: (
          <Suspense fallback={<PageFallback />}>
            <IssuesPage />
          </Suspense>
        ),
      },
      {
        path: 'issues/:id',
        element: (
          <Suspense fallback={<PageFallback />}>
            <IssueDetailPage />
          </Suspense>
        ),
      },
      {
        path: 'uploads',
        element: (
          <Suspense fallback={<PageFallback />}>
            <UploadsPage />
          </Suspense>
        ),
      },
      {
        path: 'uploads/new',
        element: (
          <Suspense fallback={<PageFallback />}>
            <NewUploadPage />
          </Suspense>
        ),
      },
      {
        path: 'uploads/:id',
        element: (
          <Suspense fallback={<PageFallback />}>
            <UploadDetailPage />
          </Suspense>
        ),
      },
      {
        path: 'reports',
        element: (
          <Suspense fallback={<PageFallback />}>
            <ReportsPage />
          </Suspense>
        ),
      },
      {
        path: 'users',
        element: (
          <RequireRole allowedRoles={['admin']}>
            <Suspense fallback={<PageFallback />}>
              <UsersPage />
            </Suspense>
          </RequireRole>
        ),
      },
    ],
  },
  {
    path: '*',
    element: (
      <Suspense fallback={<PageFallback />}>
        <NotFoundPage />
      </Suspense>
    ),
  },
]);
