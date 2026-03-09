import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/uiStore';

interface AppLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}

export function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden soft-ui">
      <div className="absolute inset-0 crm-gradient" />
      <div className="absolute inset-0 crm-vignette" />
      <div className="relative h-svh w-full overflow-hidden rounded-[28px] bg-white/5 shadow-[0_28px_90px_rgba(0,0,0,0.45)] edge-fade sm:h-[92vh] sm:w-[min(95vw,1783px)] sm:rounded-[42px] sm:border sm:border-white/10">
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggleCollapsed={toggleSidebar}
        />
        <div
          className={cn(
            'h-full flex flex-col transition-all duration-300',
            sidebarCollapsed ? 'ml-[96px]' : 'ml-[284px]'
          )}
        >
          <TopBar title={title} subtitle={subtitle} />
          <main className="flex-1 overflow-y-auto no-scrollbar px-6 pb-6 pt-4">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
