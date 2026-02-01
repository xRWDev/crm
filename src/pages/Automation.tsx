import { useState } from 'react';
import { Zap, Bell, Package, DollarSign, Users, Clock, Check, X, Settings } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { cn } from '@/lib/utils';

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: string;
  action: string;
  isActive: boolean;
  icon: typeof Zap;
  category: 'stock' | 'orders' | 'notifications' | 'pricing';
}

const defaultRules: AutomationRule[] = [
  {
    id: '1',
    name: 'Auto Reserve Stock',
    description: 'Automatically reserve stock when a new order is placed',
    trigger: 'New order created',
    action: 'Reserve items in warehouse',
    isActive: true,
    icon: Package,
    category: 'stock'
  },
  {
    id: '2',
    name: 'Low Stock Alert',
    description: 'Send notification when stock falls below minimum level',
    trigger: 'Stock < minimum level',
    action: 'Notify warehouse manager',
    isActive: true,
    icon: Bell,
    category: 'notifications'
  },
  {
    id: '3',
    name: 'Auto Order Confirmation',
    description: 'Automatically confirm orders with successful payment',
    trigger: 'Payment received',
    action: 'Change status to Confirmed',
    isActive: true,
    icon: Check,
    category: 'orders'
  },
  {
    id: '4',
    name: 'VIP Discount',
    description: 'Apply automatic 10% discount for VIP clients',
    trigger: 'VIP client places order',
    action: 'Apply 10% discount',
    isActive: true,
    icon: DollarSign,
    category: 'pricing'
  },
  {
    id: '5',
    name: 'Abandoned Cart Reminder',
    description: 'Send reminder for orders pending more than 24 hours',
    trigger: 'Order pending > 24 hours',
    action: 'Send email reminder',
    isActive: false,
    icon: Clock,
    category: 'notifications'
  },
  {
    id: '6',
    name: 'Auto Manager Assignment',
    description: 'Assign new clients to managers based on workload',
    trigger: 'New client created',
    action: 'Assign to manager with lowest load',
    isActive: true,
    icon: Users,
    category: 'orders'
  },
  {
    id: '7',
    name: 'Bulk Discount',
    description: 'Apply 5% discount for orders over $5000',
    trigger: 'Order total > $5000',
    action: 'Apply 5% discount',
    isActive: true,
    icon: DollarSign,
    category: 'pricing'
  },
  {
    id: '8',
    name: 'Delivery Status Update',
    description: 'Update order status when delivery is confirmed',
    trigger: 'Tracking shows delivered',
    action: 'Change status to Delivered',
    isActive: true,
    icon: Package,
    category: 'orders'
  },
];

const categoryLabels = {
  stock: 'Inventory',
  orders: 'Order Processing',
  notifications: 'Notifications',
  pricing: 'Pricing & Discounts'
};

const categoryColors = {
  stock: 'bg-amber-500/10 text-amber-500',
  orders: 'bg-primary/10 text-primary',
  notifications: 'bg-purple-500/10 text-purple-500',
  pricing: 'bg-success/10 text-success'
};

export default function Automation() {
  const [rules, setRules] = useState(defaultRules);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const toggleRule = (id: string) => {
    setRules(rules.map(rule => 
      rule.id === id ? { ...rule, isActive: !rule.isActive } : rule
    ));
  };

  const filteredRules = filterCategory === 'all' 
    ? rules 
    : rules.filter(r => r.category === filterCategory);

  const activeCount = rules.filter(r => r.isActive).length;

  return (
    <AppLayout title="Automation" subtitle="Manage automated workflows">
      <div className="space-y-6 animate-fade-up">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{rules.length}</p>
                <p className="text-sm text-muted-foreground">Total Rules</p>
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                <Check className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{activeCount}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <X className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{rules.length - activeCount}</p>
                <p className="text-sm text-muted-foreground">Inactive</p>
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                <Bell className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">1,247</p>
                <p className="text-sm text-muted-foreground">Triggered Today</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'stock', 'orders', 'notifications', 'pricing'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize",
                filterCategory === cat 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {cat === 'all' ? 'All' : categoryLabels[cat as keyof typeof categoryLabels]}
            </button>
          ))}
        </div>

        {/* Rules Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRules.map((rule) => (
            <div 
              key={rule.id}
              className={cn(
                "glass-card rounded-2xl p-5 hover:shadow-xl transition-all duration-300",
                !rule.isActive && "opacity-60"
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl", categoryColors[rule.category])}>
                    <rule.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{rule.name}</h3>
                    <span className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full",
                      categoryColors[rule.category]
                    )}>
                      {categoryLabels[rule.category]}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => toggleRule(rule.id)}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    rule.isActive ? "bg-success" : "bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      rule.isActive ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
              </div>

              <p className="text-sm text-muted-foreground mb-4">{rule.description}</p>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Trigger:</span>
                  <span className="text-foreground font-medium">{rule.trigger}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Action:</span>
                  <span className="text-foreground font-medium">{rule.action}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-border flex justify-end">
                <button className="ios-button-secondary text-xs">
                  <Settings className="h-3 w-3" /> Configure
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
