import { useState } from 'react';
import { Plug, ShoppingBag, MessageSquare, Calculator, Globe, Smartphone, Check, ExternalLink } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { cn } from '@/lib/utils';

interface Integration {
  id: string;
  name: string;
  description: string;
  category: 'ecommerce' | 'messaging' | 'accounting' | 'marketplace' | 'pos';
  icon: typeof Plug;
  isConnected: boolean;
  color: string;
}

const defaultIntegrations: Integration[] = [
  {
    id: '1',
    name: 'Shopify',
    description: 'Sync products, orders, and inventory with your Shopify store',
    category: 'ecommerce',
    icon: ShoppingBag,
    isConnected: true,
    color: 'bg-green-500'
  },
  {
    id: '2',
    name: 'WooCommerce',
    description: 'Connect your WordPress WooCommerce store',
    category: 'ecommerce',
    icon: Globe,
    isConnected: false,
    color: 'bg-purple-500'
  },
  {
    id: '3',
    name: 'Amazon',
    description: 'Manage Amazon marketplace orders and inventory',
    category: 'marketplace',
    icon: ShoppingBag,
    isConnected: true,
    color: 'bg-orange-500'
  },
  {
    id: '4',
    name: 'eBay',
    description: 'Sync with eBay listings and orders',
    category: 'marketplace',
    icon: ShoppingBag,
    isConnected: false,
    color: 'bg-blue-600'
  },
  {
    id: '5',
    name: 'WhatsApp Business',
    description: 'Send order updates and communicate with customers',
    category: 'messaging',
    icon: MessageSquare,
    isConnected: true,
    color: 'bg-green-600'
  },
  {
    id: '6',
    name: 'Telegram',
    description: 'Receive notifications and manage orders via Telegram',
    category: 'messaging',
    icon: MessageSquare,
    isConnected: false,
    color: 'bg-sky-500'
  },
  {
    id: '7',
    name: 'QuickBooks',
    description: 'Sync invoices, payments, and financial data',
    category: 'accounting',
    icon: Calculator,
    isConnected: true,
    color: 'bg-green-700'
  },
  {
    id: '8',
    name: 'Xero',
    description: 'Connect with Xero for accounting and invoicing',
    category: 'accounting',
    icon: Calculator,
    isConnected: false,
    color: 'bg-cyan-500'
  },
  {
    id: '9',
    name: 'Square POS',
    description: 'Integrate with Square point of sale system',
    category: 'pos',
    icon: Smartphone,
    isConnected: false,
    color: 'bg-gray-800'
  },
  {
    id: '10',
    name: 'Stripe',
    description: 'Process payments and manage subscriptions',
    category: 'accounting',
    icon: Calculator,
    isConnected: true,
    color: 'bg-indigo-500'
  },
];

const categoryLabels = {
  ecommerce: 'E-Commerce',
  messaging: 'Messaging',
  accounting: 'Accounting & Payments',
  marketplace: 'Marketplaces',
  pos: 'Point of Sale'
};

export default function Integrations() {
  const [integrations, setIntegrations] = useState(defaultIntegrations);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const toggleIntegration = (id: string) => {
    setIntegrations(integrations.map(int => 
      int.id === id ? { ...int, isConnected: !int.isConnected } : int
    ));
  };

  const filteredIntegrations = filterCategory === 'all' 
    ? integrations 
    : integrations.filter(i => i.category === filterCategory);

  const connectedCount = integrations.filter(i => i.isConnected).length;

  return (
    <AppLayout title="Integrations" subtitle="Connect third-party services">
      <div className="space-y-6 animate-fade-up">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Plug className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{integrations.length}</p>
                <p className="text-sm text-muted-foreground">Available</p>
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                <Check className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{connectedCount}</p>
                <p className="text-sm text-muted-foreground">Connected</p>
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <Plug className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{integrations.length - connectedCount}</p>
                <p className="text-sm text-muted-foreground">Available</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'ecommerce', 'marketplace', 'messaging', 'accounting', 'pos'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium transition-all",
                filterCategory === cat 
                  ? "bg-primary text-primary-foreground" 
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {cat === 'all' ? 'All' : categoryLabels[cat as keyof typeof categoryLabels]}
            </button>
          ))}
        </div>

        {/* Integrations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIntegrations.map((integration) => (
            <div 
              key={integration.id}
              className="glass-card rounded-2xl p-5 hover:shadow-xl transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={cn("flex h-12 w-12 items-center justify-center rounded-xl text-white", integration.color)}>
                    <integration.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{integration.name}</h3>
                    <span className="text-xs text-muted-foreground">
                      {categoryLabels[integration.category]}
                    </span>
                  </div>
                </div>
                {integration.isConnected && (
                  <span className="flex items-center gap-1 text-xs font-medium text-success">
                    <Check className="h-3 w-3" /> Connected
                  </span>
                )}
              </div>

              <p className="text-sm text-muted-foreground mb-4">{integration.description}</p>

              <div className="flex gap-2">
                <button
                  onClick={() => toggleIntegration(integration.id)}
                  className={cn(
                    "flex-1 ios-button text-sm",
                    integration.isConnected 
                      ? "bg-destructive/10 text-destructive hover:bg-destructive/20" 
                      : "ios-button-primary"
                  )}
                >
                  {integration.isConnected ? 'Disconnect' : 'Connect'}
                </button>
                <button className="ios-button-secondary text-sm">
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
