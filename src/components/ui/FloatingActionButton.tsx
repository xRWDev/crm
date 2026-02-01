import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingActionButtonProps {
  onClick: () => void;
  className?: string;
  ariaLabel?: string;
  offsetX?: number;
  offsetY?: number;
}

export function FloatingActionButton({
  onClick,
  className,
  ariaLabel = "Add",
  offsetX,
  offsetY,
}: FloatingActionButtonProps) {
  const style: React.CSSProperties = {};
  if (typeof offsetX === "number") style.right = `${offsetX}px`;
  if (typeof offsetY === "number") style.bottom = `${offsetY}px`;

  return (
    <button
      onClick={onClick}
      className={cn("fab", className)}
      style={style}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <Plus className="h-6 w-6" />
    </button>
  );
}
