import { cn } from '@/lib/utils';

type OrderStatus = 'new' | 'confirmed' | 'picking' | 'shipped' | 'delivered' | 'returned' | 'cancelled';
type ClientStatus = 'new' | 'regular' | 'vip' | 'problem';
type PaymentStatus = 'pending' | 'partial' | 'paid' | 'refunded';
type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

interface StatusBadgeProps {
  status: OrderStatus | ClientStatus | PaymentStatus | LeadStatus | string;
  type?: 'order' | 'client' | 'payment' | 'lead';
}

const orderStatusStyles: Record<OrderStatus, string> = {
  new: 'status-new',
  confirmed: 'status-confirmed',
  picking: 'status-picking',
  shipped: 'status-shipped',
  delivered: 'status-delivered',
  returned: 'status-returned',
  cancelled: 'status-cancelled',
};

const clientStatusStyles: Record<ClientStatus, string> = {
  new: 'client-new',
  regular: 'client-regular',
  vip: 'client-vip',
  problem: 'client-problem',
};

const paymentStatusStyles: Record<PaymentStatus, string> = {
  pending: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  partial: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  paid: 'bg-green-500/10 text-green-600 dark:text-green-400',
  refunded: 'bg-gray-500/10 text-gray-600 dark:text-gray-400',
};

const leadStatusStyles: Record<LeadStatus, string> = {
  new: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  contacted: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  qualified: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  proposal: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
  negotiation: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  won: 'bg-green-500/10 text-green-600 dark:text-green-400',
  lost: 'bg-red-500/10 text-red-600 dark:text-red-400',
};

export function StatusBadge({ status, type = 'order' }: StatusBadgeProps) {
  let styleClass = '';

  switch (type) {
    case 'order':
      styleClass = orderStatusStyles[status as OrderStatus] || 'bg-gray-500/10 text-gray-600';
      break;
    case 'client':
      styleClass = clientStatusStyles[status as ClientStatus] || 'bg-gray-500/10 text-gray-600';
      break;
    case 'payment':
      styleClass = paymentStatusStyles[status as PaymentStatus] || 'bg-gray-500/10 text-gray-600';
      break;
    case 'lead':
      styleClass = leadStatusStyles[status as LeadStatus] || 'bg-gray-500/10 text-gray-600';
      break;
  }

  return (
    <span className={cn("status-badge capitalize", styleClass)}>
      {status}
    </span>
  );
}
