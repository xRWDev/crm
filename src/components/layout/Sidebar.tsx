import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  UserCog,
  BarChart3,
  ClipboardList,
  FileText,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore, type UserRole } from '@/store/authStore';
import { useCRMStore } from '@/store/crmStore';

const navItems: { path: string; label: string; icon: LucideIcon; roles: UserRole[] }[] = [
  { path: '/dashboard/manager', label: 'Рабочий стол (менеджер)', icon: LayoutDashboard, roles: ['manager'] },
  { path: '/dashboard/director', label: 'Рабочий стол (директор)', icon: LayoutDashboard, roles: ['director'] },
  { path: '/tasks', label: 'Задачи', icon: ClipboardList, roles: ['manager', 'director'] },
  { path: '/clients', label: 'Клиенты', icon: Users, roles: ['manager', 'director'] },
  { path: '/orders', label: 'Сделки', icon: ShoppingCart, roles: ['manager', 'director'] },
  { path: '/documents', label: 'Документы', icon: FileText, roles: ['manager', 'director'] },
  { path: '/employees', label: 'Сотрудники', icon: UserCog, roles: ['director'] },
  { path: '/analytics', label: 'Отчеты', icon: BarChart3, roles: ['director'] },
  { path: '/directory', label: 'Справочник', icon: BookOpen, roles: ['director'] },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function Sidebar({ collapsed, onToggleCollapsed }: SidebarProps) {
  const [isDark, setIsDark] = useState(false);
  const location = useLocation();
  const role = useAuthStore((state) => state.role);
  const { tasks, employees } = useCRMStore();
  const visibleItems = navItems.filter((item) => item.roles.includes(role));
  const adminId = employees.find((emp) => emp.role === 'admin')?.id || employees[0]?.id || '1';
  const managerId = employees.find((emp) => emp.role === 'manager')?.id || employees[0]?.id || '2';
  const currentUserId = role === 'director' ? adminId : managerId;
  const tasksCount = tasks.filter((task) => {
    if (role === 'director') return task.status !== 'completed';
    return task.assigneeId === currentUserId && task.status !== 'completed';
  }).length;

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  return (
    <aside 
      className={cn(
        "absolute left-6 top-6 bottom-6 z-40 h-auto glass-panel rounded-[26px] border border-sidebar-border transition-all duration-300 ease-out",
        collapsed ? "w-[72px]" : "w-[260px]"
      )}
    >
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
          {!collapsed && (
            <div className="flex items-center gap-3 animate-fade-in">
              <img
                src="/favicon.svg"
                alt="crmPRO"
                className="h-9 w-9 rounded-xl object-cover"
              />
              <span className="font-semibold text-lg text-sidebar-foreground">crmPRO</span>
            </div>
          )}
          <button
            onClick={onToggleCollapsed}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-sidebar-accent transition-colors"
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4 text-sidebar-foreground" />
            ) : (
              <ChevronLeft className="h-4 w-4 text-sidebar-foreground" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
          {visibleItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={cn(
                  "nav-item group",
                  isActive && "nav-item-active",
                  collapsed && "justify-center px-2"
                )}
              >
                <item.icon className={cn(
                  "h-5 w-5 flex-shrink-0 transition-colors",
                  isActive ? "text-primary" : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
                )} />
                {!collapsed && (
                  <span className={cn(
                    "truncate transition-colors flex-1",
                    isActive ? "text-primary font-medium" : ""
                  )}>
                    {item.label}
                  </span>
                )}
                {!collapsed && item.path === '/tasks' && tasksCount > 0 && (
                  <span className="ml-auto inline-flex h-5 w-5 items-center justify-center rounded-none bg-muted text-[11px] font-semibold text-muted-foreground">
                    {tasksCount}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Theme Toggle & User */}
        <div className="border-t border-sidebar-border p-3">
          <button
            onClick={toggleTheme}
            className={cn(
              "nav-item w-full",
              collapsed && "justify-center px-2"
            )}
          >
            {isDark ? (
              <Sun className="h-5 w-5 text-sidebar-foreground/60" />
            ) : (
              <Moon className="h-5 w-5 text-sidebar-foreground/60" />
            )}
            {!collapsed && <span>{isDark ? 'Светлая тема' : 'Темная тема'}</span>}
          </button>
        </div>
      </div>
    </aside>
  );
}
