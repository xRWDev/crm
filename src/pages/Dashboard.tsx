import { useMemo, useState } from 'react';
import {
  ClipboardList,
  Briefcase,
  PhoneCall,
  Users,
  CheckCircle2,
  XCircle,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Trophy,
  Medal,
  BadgeCheck,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Progress } from '@/components/ui/progress';
import { useCRMStore } from '@/store/crmStore';
import { cn } from '@/lib/utils';
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
  Cell,
} from 'recharts';

const CHART_COLORS = ['#0A84FF', '#30D158', '#FF9F0A', '#FF453A', '#AF52DE'];

type PeriodKey = 'today' | 'week' | 'month' | 'period';

type DashboardScope = 'manager' | 'director';

interface DashboardProps {
  scope?: DashboardScope;
}

const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'today', label: 'Сегодня' },
  { key: 'week', label: 'Неделя' },
  { key: 'month', label: 'Месяц' },
  { key: 'period', label: 'Период' },
];

type CallLog = {
  date: Date;
  count: number;
  managerId?: string;
};

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number) => {
  const next = new Date(date);
  next.setDate(date.getDate() + days);
  return next;
};

const toDate = (value: Date | string) => (value instanceof Date ? value : new Date(value));

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

const getRangeForPeriod = (period: PeriodKey, referenceDate: Date) => {
  const end = new Date(referenceDate);
  let start = new Date(referenceDate);

  switch (period) {
    case 'today':
      start = startOfDay(referenceDate);
      break;
    case 'week':
      start = startOfDay(addDays(referenceDate, -6));
      break;
    case 'month':
      start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1);
      break;
    case 'period':
      start = startOfDay(addDays(referenceDate, -29));
      break;
  }

  return { start, end };
};

const getPlanForPeriod = (period: PeriodKey) => {
  if (period === 'today') return { callsPlan: 25, salesPlan: 3 };
  if (period === 'week') return { callsPlan: 120, salesPlan: 15 };
  if (period === 'month') return { callsPlan: 480, salesPlan: 60 };
  return { callsPlan: 600, salesPlan: 80 };
};

const buildCallLog = (referenceDate: Date, managerId?: string): CallLog[] => {
  const days = 60;
  const seed = managerId
    ? managerId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    : 0;
  const logs = Array.from({ length: days }, (_, index) => {
    const date = startOfDay(addDays(referenceDate, -index));
    const base = 14 + ((index * 3 + seed) % 7);
    const taper = Math.floor((index + seed) / 8);
    const count = Math.max(4, base - taper);
    return { date, count, managerId };
  });
  return logs.reverse();
};

const aggregateCallLogs = (logsByManager: CallLog[][]) => {
  const combined = new Map<string, { date: Date; count: number }>();
  logsByManager.forEach((logs) => {
    logs.forEach((log) => {
      const key = log.date.toISOString().slice(0, 10);
      const existing = combined.get(key);
      if (existing) {
        existing.count += log.count;
      } else {
        combined.set(key, { date: log.date, count: log.count });
      }
    });
  });
  return Array.from(combined.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
};


const buildCallsSeries = (logs: CallLog[], period: PeriodKey, referenceDate: Date) => {
  const countForDate = (date: Date) => logs.find((log) => isSameDay(log.date, date))?.count ?? 0;
  const sumBetween = (start: Date, end: Date) =>
    logs.reduce((sum, log) => (log.date >= start && log.date <= end ? sum + log.count : sum), 0);

  if (period === 'today') {
    const total = countForDate(referenceDate);
    const slots = [
      { label: '09-11', share: 0.15 },
      { label: '11-13', share: 0.2 },
      { label: '13-15', share: 0.2 },
      { label: '15-17', share: 0.2 },
      { label: '17-19', share: 0.15 },
      { label: '19-21', share: 0.1 },
    ];
    let remaining = total;
    return slots.map((slot, index) => {
      const value = index === slots.length - 1 ? remaining : Math.round(total * slot.share);
      remaining -= value;
      return { name: slot.label, value };
    });
  }

  if (period === 'week') {
    return Array.from({ length: 7 }, (_, index) => {
      const day = addDays(startOfDay(referenceDate), index - 6);
      return {
        name: day.toLocaleDateString('ru-RU', { weekday: 'short' }),
        value: countForDate(day),
      };
    });
  }

  const bucketCount = period === 'month' ? 4 : 5;
  return Array.from({ length: bucketCount }, (_, index) => {
    const end = addDays(startOfDay(referenceDate), (index - (bucketCount - 1)) * 7);
    const start = addDays(end, -6);
    return {
      name: `Нед ${index + 1}`,
      value: sumBetween(start, end),
    };
  });
};

export default function Dashboard({ scope = 'manager' }: DashboardProps) {
  const { orders, clients, employees, tasks, getOrderTotal } = useCRMStore();
  const [period, setPeriod] = useState<PeriodKey>('week');

  const isDirectorView = scope === 'director';
  const title = isDirectorView ? 'Рабочий стол (директор)' : 'Рабочий стол (менеджер)';
  const subtitle = isDirectorView
    ? 'Сводная статистика и эффективность по команде'
    : 'Статистика и эффективность за период';
  const periodLabel = PERIODS.find((item) => item.key === period)?.label || 'Период';

  const metrics = useMemo(() => {
    const now = new Date();
    const selectedRange = getRangeForPeriod(period, now);
    const managerId = scope === 'manager'
      ? employees.find((e) => e.role === 'manager')?.id || employees.find((e) => e.role === 'admin')?.id
      : undefined;

    const managerOrders = managerId ? orders.filter((o) => o.managerId === managerId) : orders;
    const managerClients = managerId ? clients.filter((c) => c.managerId === managerId) : clients;
    const managerTasks = managerId ? tasks.filter((task) => task.assigneeId === managerId) : tasks;

    const callLogs = isDirectorView
      ? aggregateCallLogs(
          employees
            .filter((employee) => employee.role === 'manager')
            .map((employee) => buildCallLog(now, employee.id))
        )
      : buildCallLog(now, managerId);

    const periodRanges = PERIODS.reduce((acc, item) => {
      acc[item.key] = getRangeForPeriod(item.key, now);
      return acc;
    }, {} as Record<PeriodKey, { start: Date; end: Date }>);

    const callsByPeriod = PERIODS.reduce((acc, item) => {
      const range = periodRanges[item.key];
      acc[item.key] = callLogs.reduce(
        (sum, log) => (log.date >= range.start && log.date <= range.end ? sum + log.count : sum),
        0
      );
      return acc;
    }, {} as Record<PeriodKey, number>);

    const clientsByPeriod = PERIODS.reduce((acc, item) => {
      const range = periodRanges[item.key];
      acc[item.key] = managerClients.filter((client) => {
        const createdAt = toDate(client.createdAt);
        return createdAt >= range.start && createdAt <= range.end;
      }).length;
      return acc;
    }, {} as Record<PeriodKey, number>);

    const tasksAssigned = managerTasks.filter((task) => {
      const createdAt = toDate(task.createdAt);
      return createdAt >= selectedRange.start && createdAt <= selectedRange.end;
    }).length;
    const tasksCompleted = managerTasks.filter((task) => {
      if (task.status !== 'completed' || !task.completedAt) return false;
      const completedAt = toDate(task.completedAt);
      return completedAt >= selectedRange.start && completedAt <= selectedRange.end;
    }).length;

    const activeStatuses = ['new', 'confirmed', 'picking', 'shipped'];
    const activeOrders = managerOrders.filter((order) => activeStatuses.includes(order.status));

    const closedStatuses = ['delivered', 'returned', 'cancelled'];
    const getOrderClosedAt = (order: (typeof managerOrders)[number]) => {
      if (!closedStatuses.includes(order.status)) return null;
      const history = [...order.statusHistory].reverse();
      const closedEntry = history.find((entry) => closedStatuses.includes(entry.status));
      return toDate(closedEntry?.date || order.createdAt);
    };

    const closedOrders = managerOrders.filter((order) => closedStatuses.includes(order.status));
    const closedInPeriod = closedOrders.filter((order) => {
      const closedAt = getOrderClosedAt(order);
      return closedAt ? closedAt >= selectedRange.start && closedAt <= selectedRange.end : false;
    });

    const closedSuccess = closedInPeriod.filter((order) => order.status === 'delivered').length;
    const closedFail = closedInPeriod.filter((order) => order.status !== 'delivered').length;
    const closedTotal = closedInPeriod.length;

    const { callsPlan, salesPlan } = getPlanForPeriod(period);

    const callsDone = callsByPeriod[period];
    const salesDone = closedSuccess;

    const callsEfficiency = callsPlan ? Math.round((callsDone / callsPlan) * 100) : 0;
    const salesEfficiency = salesPlan ? Math.round((salesDone / salesPlan) * 100) : 0;

    const callsSeries = buildCallsSeries(callLogs, period, now);

    const latestClients = [...managerClients]
      .sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime())
      .slice(0, 5);

    const recentOrders = [...managerOrders]
      .sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime())
      .slice(0, 5);

    const managers = employees.filter((employee) => employee.role === 'manager');

    const managerRatings = isDirectorView
      ? managers
          .map((manager) => {
            const managerOrders = orders.filter((order) => order.managerId === manager.id);
            const managerClients = clients.filter((client) => client.managerId === manager.id);
            const managerTasks = tasks.filter((task) => task.assigneeId === manager.id);
            const managerCallLogs = buildCallLog(now, manager.id);

            const callsDone = managerCallLogs.reduce(
              (sum, log) => (log.date >= selectedRange.start && log.date <= selectedRange.end ? sum + log.count : sum),
              0
            );

            const closedStatuses = ['delivered', 'returned', 'cancelled'];
            const getOrderClosedAt = (order: (typeof managerOrders)[number]) => {
              if (!closedStatuses.includes(order.status)) return null;
              const history = [...order.statusHistory].reverse();
              const closedEntry = history.find((entry) => closedStatuses.includes(entry.status));
              return toDate(closedEntry?.date || order.createdAt);
            };

            const closedOrders = managerOrders.filter((order) => closedStatuses.includes(order.status));
            const closedInPeriod = closedOrders.filter((order) => {
              const closedAt = getOrderClosedAt(order);
              return closedAt ? closedAt >= selectedRange.start && closedAt <= selectedRange.end : false;
            });
            const salesDone = closedInPeriod.filter((order) => order.status === 'delivered').length;

            const { callsPlan, salesPlan } = getPlanForPeriod(period);
            const callsEfficiency = callsPlan ? Math.round((callsDone / callsPlan) * 100) : 0;
            const salesEfficiency = salesPlan ? Math.round((salesDone / salesPlan) * 100) : 0;
            const totalEfficiency = Math.round((callsEfficiency + salesEfficiency) / 2);

            const newClients = managerClients.filter((client) => {
              const createdAt = toDate(client.createdAt);
              return createdAt >= selectedRange.start && createdAt <= selectedRange.end;
            }).length;

            const tasksCompleted = managerTasks.filter((task) => {
              if (task.status !== 'completed' || !task.completedAt) return false;
              const completedAt = toDate(task.completedAt);
              return completedAt >= selectedRange.start && completedAt <= selectedRange.end;
            }).length;

            return {
              id: manager.id,
              name: manager.name,
              position: manager.position || 'Менеджер',
              callsDone,
              callsPlan,
              salesDone,
              salesPlan,
              callsEfficiency,
              salesEfficiency,
              totalEfficiency,
              newClients,
              tasksCompleted,
            };
          })
          .sort((a, b) => b.totalEfficiency - a.totalEfficiency)
      : [];

    return {
      now,
      tasksAssigned,
      tasksCompleted,
      activeOrders,
      callsSeries,
      callsByPeriod,
      clientsByPeriod,
      totalClients: managerClients.length,
      closedTotal,
      closedSuccess,
      closedFail,
      closedLabel: 'Завершенные',
      callsPlan,
      callsDone,
      callsEfficiency,
      salesPlan,
      salesDone,
      salesEfficiency,
      latestClients,
      recentOrders,
      managerRatings,
    };
  }, [orders, clients, employees, period, scope, tasks, isDirectorView]);

  const closedChartData = [
    { name: 'Удачно', value: metrics.closedSuccess },
    { name: 'Неудачно', value: metrics.closedFail },
  ];

  return (
    <AppLayout title={title} subtitle={subtitle}>
      <div className="space-y-6 animate-fade-up">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Период анализа</p>
            <p className="text-lg font-semibold text-foreground">
              {PERIODS.find((item) => item.key === period)?.label}
            </p>
          </div>
          <ToggleGroup
            type="single"
            value={period}
            onValueChange={(value) => value && setPeriod(value as PeriodKey)}
            className="justify-start"
          >
            {PERIODS.map((item) => (
              <ToggleGroupItem key={item.key} value={item.key} size="sm">
                {item.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="metric-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Задачи</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {metrics.tasksAssigned}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Выполнено: {metrics.tasksCompleted}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Сделки в работе</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {metrics.activeOrders.length}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Активные заказы</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Briefcase className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Коммуникации</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {metrics.callsByPeriod[period]}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Сегодня <span className="font-medium text-foreground">{metrics.callsByPeriod.today}</span>
                  <span className="mx-1">•</span>
                  Неделя <span className="font-medium text-foreground">{metrics.callsByPeriod.week}</span>
                  <span className="mx-1">•</span>
                  Месяц <span className="font-medium text-foreground">{metrics.callsByPeriod.month}</span>
                  <span className="mx-1">•</span>
                  Период <span className="font-medium text-foreground">{metrics.callsByPeriod.period}</span>
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <PhoneCall className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Клиенты</p>
                <p className="mt-2 text-2xl font-semibold text-foreground">{metrics.totalClients}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Сегодня <span className="font-medium text-foreground">{metrics.clientsByPeriod.today}</span>
                  <span className="mx-1">•</span>
                  Неделя <span className="font-medium text-foreground">{metrics.clientsByPeriod.week}</span>
                  <span className="mx-1">•</span>
                  Месяц <span className="font-medium text-foreground">{metrics.clientsByPeriod.month}</span>
                  <span className="mx-1">•</span>
                  Период <span className="font-medium text-foreground">{metrics.clientsByPeriod.period}</span>
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Communications Chart */}
          <div className="lg:col-span-2 glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Коммуникации</h3>
              <span className="text-xs text-muted-foreground">Звонки за выбранный период</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.callsSeries}>
                  <defs>
                    <linearGradient id="callsGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                    }}
                    formatter={(value: number) => [`${value} звонков`, 'Коммуникации']}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#callsGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Closed Deals Effectiveness */}
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Результативность закрытых дел</h3>
              <Target className="h-5 w-5 text-primary" />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{metrics.closedLabel}: {metrics.closedTotal}</p>
            <div className="h-48 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={closedChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {closedChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-success" /> Удачно
                </span>
                <span className="font-medium text-foreground">{metrics.closedSuccess}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <XCircle className="h-4 w-4 text-destructive" /> Неудачно
                </span>
                <span className="font-medium text-foreground">{metrics.closedFail}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div
          className={
            isDirectorView ? "grid grid-cols-1 gap-6" : "grid grid-cols-1 lg:grid-cols-3 gap-6"
          }
        >
          {!isDirectorView && (
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">Новые клиенты</h3>
              </div>
              <div className="space-y-3">
                {metrics.latestClients.map((client) => (
                  <div key={client.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{client.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {toDate(client.createdAt).toLocaleDateString('ru-RU')}
                      </p>
                    </div>
                    <StatusBadge status={client.status} type="client" />
                  </div>
                ))}
                {metrics.latestClients.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Нет новых клиентов</p>
                )}
              </div>
            </div>
          )}

          {!isDirectorView && (
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">Коэффициент эффективности</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Звонки</span>
                    <span className="text-muted-foreground">{metrics.callsDone} / {metrics.callsPlan}</span>
                  </div>
                  <Progress value={Math.min(metrics.callsEfficiency, 100)} className="mt-2 h-2" />
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    {metrics.callsEfficiency >= 100 ? (
                      <ArrowUpRight className="h-4 w-4 text-success" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-warning" />
                    )}
                    <span>Выполнено: {metrics.callsEfficiency}%</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Продажи</span>
                    <span className="text-muted-foreground">{metrics.salesDone} / {metrics.salesPlan}</span>
                  </div>
                  <Progress value={Math.min(metrics.salesEfficiency, 100)} className="mt-2 h-2" />
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    {metrics.salesEfficiency >= 100 ? (
                      <ArrowUpRight className="h-4 w-4 text-success" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-warning" />
                    )}
                    <span>Выполнено: {metrics.salesEfficiency}%</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          {!isDirectorView && (
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Briefcase className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">Сделки в работе</h3>
              </div>
              <div className="space-y-3">
                {metrics.activeOrders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{order.id}</p>
                      <p className="text-xs text-muted-foreground">{toDate(order.createdAt).toLocaleDateString('ru-RU')}</p>
                    </div>
                    <StatusBadge status={order.status} type="order" />
                  </div>
                ))}
                {metrics.activeOrders.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Нет активных сделок</p>
                )}
              </div>
            </div>
          )}
        </div>

        {isDirectorView && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">Коэффициент эффективности</h3>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Звонки</span>
                    <span className="text-muted-foreground">{metrics.callsDone} / {metrics.callsPlan}</span>
                  </div>
                  <Progress value={Math.min(metrics.callsEfficiency, 100)} className="mt-2 h-2" />
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    {metrics.callsEfficiency >= 100 ? (
                      <ArrowUpRight className="h-4 w-4 text-success" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-warning" />
                    )}
                    <span>Выполнено: {metrics.callsEfficiency}%</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Продажи</span>
                    <span className="text-muted-foreground">{metrics.salesDone} / {metrics.salesPlan}</span>
                  </div>
                  <Progress value={Math.min(metrics.salesEfficiency, 100)} className="mt-2 h-2" />
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    {metrics.salesEfficiency >= 100 ? (
                      <ArrowUpRight className="h-4 w-4 text-success" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-warning" />
                    )}
                    <span>Выполнено: {metrics.salesEfficiency}%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-semibold text-foreground">Рейтинг менеджеров</h3>
                  <p className="text-xs text-muted-foreground">
                    Коэффициент эффективности за {periodLabel.toLowerCase()}
                  </p>
                </div>
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-3">
                {metrics.managerRatings.map((manager, index) => {
                  const initials = manager.name
                    .split(' ')
                    .map((part) => part[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();
                  const isTop = index === 0;
                  const isSecond = index === 1;
                  const isThird = index === 2;

                  return (
                    <div
                      key={manager.id}
                      className={cn(
                        'flex items-center gap-4 rounded-xl border border-border/40 bg-white/70 px-4 py-3 transition-all',
                        isTop
                          ? 'bg-amber-50/70 border-amber-200/70 shadow-[0_10px_24px_rgba(245,158,11,0.15)]'
                          : 'hover:bg-white/90 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)]'
                      )}
                    >
                      <div className="flex h-9 w-9 items-center justify-center text-sm font-semibold text-muted-foreground">
                        {isTop && <Trophy className="h-4 w-4 text-amber-500" />}
                        {isSecond && <Medal className="h-4 w-4 text-slate-400" />}
                        {isThird && <BadgeCheck className="h-4 w-4 text-orange-500" />}
                        {!isTop && !isSecond && !isThird && <span>{index + 1}</span>}
                      </div>
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                          {initials}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[15px] font-semibold text-foreground truncate">{manager.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {manager.salesDone} сделок · {manager.callsDone} звонков
                          </div>
                        </div>
                      </div>
                      <div className={cn('text-sm font-semibold', isTop ? 'text-emerald-600' : 'text-primary')}>
                        {manager.totalEfficiency}%
                      </div>
                    </div>
                  );
                })}
                {metrics.managerRatings.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-6">
                    Нет данных по менеджерам
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!isDirectorView && (
          <div className="glass-card rounded-2xl p-6">
            <h3 className="font-semibold text-foreground mb-4">Недавние сделки</h3>
            <div className="overflow-x-auto">
              <table className="ios-table">
                <thead>
                  <tr className="bg-muted/30">
                    <th>Сделка</th>
                    <th>Клиент</th>
                    <th>Сумма</th>
                    <th>Статус</th>
                    <th>Дата</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.recentOrders.map((order) => {
                    const client = clients.find((c) => c.id === order.clientId);
                    return (
                      <tr key={order.id}>
                        <td className="font-medium text-primary">{order.id}</td>
                        <td>{client?.name || 'Unknown'}</td>
                        <td className="font-medium">
                          {new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'USD' }).format(
                            getOrderTotal(order)
                          )}
                        </td>
                        <td>
                          <StatusBadge status={order.status} type="order" />
                        </td>
                        <td className="text-muted-foreground">
                          {toDate(order.createdAt).toLocaleDateString('ru-RU')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
