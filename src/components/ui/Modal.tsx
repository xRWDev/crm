import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  scrollable?: boolean;
}

const sizeClasses = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
};

export function Modal({ isOpen, onClose, title, children, size = 'md', scrollable = true }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/45 backdrop-blur-[6px]"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          "relative w-full mx-auto modal-surface crm-dialog overflow-visible rounded-[24px] shadow-2xl animate-scale-in",
          sizeClasses[size]
        )}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -right-20 h-56 w-56 rounded-full bg-sky-200/40 blur-3xl" />
          <div className="absolute top-24 -left-24 h-64 w-64 rounded-full bg-rose-200/30 blur-3xl" />
          <div className="absolute bottom-0 right-10 h-48 w-48 rounded-full bg-emerald-200/30 blur-3xl" />
        </div>

        <div className="relative">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/60 bg-white/70 backdrop-blur-md">
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/60 bg-white/80 text-muted-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div
            className={cn(
          "px-6 pt-4 pb-0",
          scrollable ? "max-h-[720px] overflow-y-auto overflow-x-visible no-scrollbar" : "overflow-visible"
        )}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
