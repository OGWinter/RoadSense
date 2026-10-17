import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/hooks/useRedux';
import { clearCredentials } from '@/features/auth/authSlice';
import { authApi } from '@/features/auth/authApi';
import {
  LayoutDashboard,
  MapPin,
  AlertTriangle,
  FileVideo,
  UploadCloud,
  BarChart3,
  Users,
  LogOut,
  Menu,
  ChevronLeft,
  ChevronRight,
  Shield,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatRoleLabel } from '@/utils/formatters';
import { toast } from 'sonner';

export const DashboardLayout: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAppSelector((state) => state.auth);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore
    } finally {
      dispatch(clearCredentials());
      toast.success('Signed out successfully');
      navigate('/login');
    }
  };

  const navItems = [
    {
      to: '/app/dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      description: 'KPIs & overview',
    },
    {
      to: '/app/map',
      label: 'Geospatial Map',
      icon: MapPin,
      description: 'Pothole & crack markers',
    },
    {
      to: '/app/issues',
      label: 'Road Issues',
      icon: AlertTriangle,
      description: 'Audit & verification',
    },
    {
      to: '/app/uploads',
      label: 'Survey Uploads',
      icon: FileVideo,
      description: 'Processing pipelines',
    },
    {
      to: '/app/uploads/new',
      label: 'Upload Video',
      icon: UploadCloud,
      description: 'Submit dashcam footage',
    },
    {
      to: '/app/reports',
      label: 'Reports & PCI',
      icon: BarChart3,
      description: 'Condition index trends',
    },
  ];

  // Admin-only nav item
  if (user?.role === 'admin') {
    navItems.push({
      to: '/app/users',
      label: 'Municipal Users',
      icon: Users,
      description: 'Operator directory',
    });
  }

  const renderNavLinks = (isMobile = false) => (
    <nav className="space-y-1.5 px-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          location.pathname === item.to ||
          (item.to === '/app/uploads' && location.pathname.startsWith('/app/uploads/') && location.pathname !== '/app/uploads/new') ||
          (item.to === '/app/issues' && location.pathname.startsWith('/app/issues/'));

        return (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={() => isMobile && setMobileOpen(false)}
            className={({ isActive: directActive }) => {
              const active = directActive || isActive;
              return `group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              } ${sidebarCollapsed && !isMobile ? 'justify-center px-2' : ''}`;
            }}
            title={sidebarCollapsed && !isMobile ? item.label : undefined}
          >
            <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105" />
            {(!sidebarCollapsed || isMobile) && (
              <span className="truncate">{item.label}</span>
            )}
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col border-r border-border bg-card transition-all duration-300 z-20 ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-primary text-white flex items-center justify-center shadow-sm">
                <Activity className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <span className="font-bold text-base text-foreground tracking-tight">RoadSense</span>
                <span className="block text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">
                  Civic Works AI
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto h-9 w-9 rounded-lg bg-primary text-white flex items-center justify-center">
              <Activity className="h-5 w-5" />
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground ml-auto"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4">
          {renderNavLinks(false)}
        </div>

        {/* User Card & Role Footer */}
        <div className="p-3 border-t border-border bg-muted/20">
          {!sidebarCollapsed ? (
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-card border border-border">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground truncate">
                  {user?.name || 'Operator'}
                </p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {user?.email || 'officer@roadsense.gov'}
                </p>
                <Badge variant="outline" className="mt-1 text-[10px] font-medium py-0 px-1.5 border-primary/30 text-primary">
                  {formatRoleLabel(user?.role || 'municipal_officer')}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                title="Sign Out"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 p-0 flex flex-col">
          <SheetHeader className="p-4 border-b border-border text-left">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-primary text-white flex items-center justify-center">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <SheetTitle className="text-base font-bold text-foreground">RoadSense</SheetTitle>
                <p className="text-xs text-muted-foreground">Municipal Road Operations</p>
              </div>
            </div>
          </SheetHeader>
          <div className="flex-1 py-4 overflow-y-auto">
            {renderNavLinks(true)}
          </div>
          <div className="p-4 border-t border-border">
            <Button variant="outline" className="w-full justify-start gap-2" onClick={handleLogout}>
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-border bg-card/80 backdrop-blur px-4 sm:px-6 flex items-center justify-between shrink-0 z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="md:hidden h-9 w-9"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-4 w-4" />
            </Button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <Shield className="h-3.5 w-3.5 text-primary" />
              <span>Municipal Infrastructure Command System</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* System Status Pill */}
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-xs font-medium">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span>Local Demo Mode (Backend :5000 offline)</span>
            </div>

            <Button asChild size="sm" className="gap-1.5 hidden sm:inline-flex shadow-sm">
              <NavLink to="/app/uploads/new">
                <UploadCloud className="h-4 w-4" />
                <span>Upload Dashcam</span>
              </NavLink>
            </Button>

            {/* User Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 rounded-full px-2.5 py-1">
                  <div className="h-6 w-6 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center">
                    {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="hidden sm:inline font-medium text-xs">
                    {user?.name || 'User'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="p-2">
                  <p className="text-xs font-medium text-foreground truncate">{user?.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{user?.email}</p>
                  <div className="mt-1">
                    <Badge variant="secondary" className="text-[10px]">
                      {user?.role ? formatRoleLabel(user.role) : 'Officer'}
                    </Badge>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Body Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
