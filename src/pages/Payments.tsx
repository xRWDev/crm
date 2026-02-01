import { useMemo } from 'react';
import { DollarSign, TrendingUp, TrendingDown, CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useCRMStore } from '@/store/crmStore';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const CHART_COLORS = ['#0A84FF', '#30D158', '#FF9F0A', '#AF52DE', '#FF453A'];

export default function Payments() {
  const { payments, orders, products, getOrderTotal, getOrderProfit } = useCRMStore();

  const stats = useMemo(() => {
    const income = payments.filter(p => p.type === 'income').reduce((sum, p) => sum + p.amount, 0);
    const refunds = payments.filter(p => p.type === 'refund').reduce((sum, p) => sum + p.amount, 0);
    const fees = payments.filter(p => p.type === 'fee').reduce((sum, p) => sum + p.amount, 0);
    
    const validOrders = orders.filter(o => o.status !== 'cancelled' && o.status !== 'returned');
    const totalRevenue = validOrders.reduce((sum, o) => sum + getOrderTotal(o), 0);
    const totalProfit = validOrders.reduce((sum, o) => sum + getOrderProfit(o), 0);
    const margin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Payment methods breakdown
    const methodBreakdown = payments.filter(p => p.type === 'income').reduce((acc, p) => {
      acc[p.method] = (acc[p.method] || 0) + p.amount;
      return acc;
    }, {} as Record<string, number>);

    return {
      income,
      refunds,
      fees,
      net: income - refunds - fees,
      totalRevenue,
      totalProfit,
      margin,
      methodBreakdown
    };
  }, [payments, orders, getOrderTotal, getOrderProfit]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const methodChartData = Object.entries(stats.methodBreakdown).map(([method, amount]) => ({
    name: method,
    value: amount
  }));

  // Recent payments data for chart
  const revenueData = [
    { name: 'Week 1', revenue: 12500, profit: 3200 },
    { name: 'Week 2', revenue: 15800, profit: 4100 },
    { name: 'Week 3', revenue: 18200, profit: 4800 },
    { name: 'Week 4', revenue: 21500, profit: 5600 },
  ];

  return (
    <AppLayout title="Документы" subtitle="Счета, оплаты и финансовые операции">
      <div className="space-y-6 animate-fade-up">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="metric-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{formatCurrency(stats.totalRevenue)}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Profit</p>
                <p className="mt-2 text-2xl font-semibold text-success">{formatCurrency(stats.totalProfit)}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Profit Margin</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{stats.margin.toFixed(1)}%</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                <TrendingUp className="h-5 w-5 text-warning" />
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Refunds</p>
                <p className="mt-2 text-2xl font-semibold text-destructive">{formatCurrency(stats.refunds)}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
                <TrendingDown className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue & Profit Chart */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6">
            <h3 className="font-semibold text-foreground mb-4">Revenue vs Profit</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px'
                    }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#colorRevenue)" />
                  <Area type="monotone" dataKey="profit" stroke="hsl(var(--success))" strokeWidth={2} fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold text-foreground mb-4">Payment Methods</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={methodChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {methodChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {methodChartData.map((item, index) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Recent Transactions</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="ios-table">
              <thead>
                <tr className="bg-muted/30">
                  <th>Order</th>
                  <th>Type</th>
                  <th>Method</th>
                  <th>Amount</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {payments.slice(0, 10).map((payment) => (
                  <tr key={payment.id}>
                    <td className="font-medium text-primary">{payment.orderId}</td>
                    <td>
                      <span className={`inline-flex items-center gap-1 ${
                        payment.type === 'income' ? 'text-success' : 
                        payment.type === 'refund' ? 'text-destructive' : 'text-muted-foreground'
                      }`}>
                        {payment.type === 'income' ? (
                          <ArrowUpRight className="h-4 w-4" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4" />
                        )}
                        {payment.type.charAt(0).toUpperCase() + payment.type.slice(1)}
                      </span>
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1.5">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        {payment.method}
                      </span>
                    </td>
                    <td className={`font-semibold ${
                      payment.type === 'income' ? 'text-success' : 'text-destructive'
                    }`}>
                      {payment.type === 'income' ? '+' : '-'}{formatCurrency(payment.amount)}
                    </td>
                    <td className="text-muted-foreground">
                      {new Date(payment.date).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
