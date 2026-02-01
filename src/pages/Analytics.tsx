import { useMemo, useState } from 'react';
import {
  BarChart3,
  Users,
  CheckCircle2,
  Clock3,
  UserCheck,
  UserX,
  ArrowUpRight,
  ArrowDownRight,
  LineChart as LineChartIcon,
  MapPinned,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCRMStore } from '@/store/crmStore';
import { cn } from '@/lib/utils';
import {
  ResponsiveContainer,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  LineChart,
  Line,
  Legend,
} from 'recharts';

const periodOptions = [
  { key: 'day', label: 'День', days: 1 },
  { key: 'week', label: 'Неделя', days: 7 },
  { key: 'month', label: 'Месяц', days: 30 },
  { key: 'custom', label: 'Период', days: 0 },
] as const;

type PeriodKey = typeof periodOptions[number]['key'];

type ManagerMetrics = {
  id: string;
  name: string;
  tasksDone: number;
  tasksInWork: number;
  clientsAdded: number;
  communications: number;
  ordersCount: number;
  efficiencyCalls: number;
  efficiencyOrders: number;
  dealsSuccess: number;
  dealsRefused: number;
};

const toDate = (value?: Date | string | null) => (value ? new Date(value) : null);

export default function Analytics() {
  const { employees, tasks, clients, orders } = useCRMStore();

  const managers = useMemo(
    () => employees.filter((employee) => employee.role === 'manager' || employee.role === 'admin'),
    [employees]
  );

  const [period, setPeriod] = useState<PeriodKey>('week');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);

  const activeManagerIds = selectedManagers.length ? selectedManagers : managers.map((m) => m.id);

  const { fromDate, toDate: toDateRange } = useMemo(() => {
    const now = new Date();
    if (period === 'custom' && rangeFrom && rangeTo) {
      return {
        fromDate: new Date(rangeFrom),
        toDate: new Date(`${rangeTo}T23:59:59`),
      };
    }
    const option = periodOptions.find((opt) => opt.key === period);
    const days = option?.days ?? 7;
    const from = new Date(now);
    from.setDate(from.getDate() - days + 1);
    from.setHours(0, 0, 0, 0);
    return { fromDate: from, toDate: now };
  }, [period, rangeFrom, rangeTo]);

  const inRange = (value?: Date | string | null) => {
    const date = toDate(value);
    if (!date) return false;
    return date >= fromDate && date <= toDateRange;
  };

  const managerMetrics: ManagerMetrics[] = useMemo(() => {
    return managers.map((manager) => {
      const managerTasks = tasks.filter((task) => task.assigneeId === manager.id);
      const managerClients = clients.filter((client) => client.managerId === manager.id || client.responsibleId === manager.id);
      const managerOrders = orders.filter((order) => order.managerId === manager.id);

      const tasksDone = managerTasks.filter((task) => task.status === 'completed' && inRange(task.completedAt || task.createdAt)).length;
      const tasksInWork = managerTasks.filter((task) => task.status !== 'completed' && inRange(task.createdAt)).length;

      const clientsAdded = managerClients.filter((client) => inRange(client.createdAt)).length;
      const communications = managerClients.filter((client) => inRange(client.lastCommunicationAt)).length;

      const ordersCount = managerOrders.filter((order) => inRange(order.createdAt)).length;

      const dealsSuccess = managerClients.filter(
        (client) => client.communicationStatus === 'success' && inRange(client.lastCommunicationAt)
      ).length;
      const dealsRefused = managerClients.filter(
        (client) => client.communicationStatus === 'refused' && inRange(client.lastCommunicationAt)
      ).length;

      const efficiencyCalls = manager.efficiencyActual?.communications ?? 0;
      const efficiencyOrders = manager.efficiencyActual?.orders ?? 0;

      return {
        id: manager.id,
        name: manager.name,
        tasksDone,
        tasksInWork,
        clientsAdded,
        communications,
        ordersCount,
        efficiencyCalls,
        efficiencyOrders,
        dealsSuccess,
        dealsRefused,
      };
    });
  }, [managers, tasks, clients, orders, fromDate, toDateRange]);

  const filteredManagers = managerMetrics.filter((manager) => activeManagerIds.includes(manager.id));

  const summary = useMemo(() => {
    return filteredManagers.reduce(
      (acc, manager) => {
        acc.tasksDone += manager.tasksDone;
        acc.tasksInWork += manager.tasksInWork;
        acc.clientsAdded += manager.clientsAdded;
        acc.communications += manager.communications;
        acc.ordersCount += manager.ordersCount;
        acc.dealsSuccess += manager.dealsSuccess;
        acc.dealsRefused += manager.dealsRefused;
        return acc;
      },
      {
        tasksDone: 0,
        tasksInWork: 0,
        clientsAdded: 0,
        communications: 0,
        ordersCount: 0,
        dealsSuccess: 0,
        dealsRefused: 0,
      }
    );
  }, [filteredManagers]);

  const efficiencyChart = filteredManagers.map((manager) => ({
    name: manager.name,
    calls: manager.efficiencyCalls,
    orders: manager.efficiencyOrders,
  }));

  const taskChart = filteredManagers.map((manager) => ({
    name: manager.name,
    completed: manager.tasksDone,
    inWork: manager.tasksInWork,
  }));

  const clientsChart = filteredManagers.map((manager) => ({
    name: manager.name,
    clients: manager.clientsAdded,
    communications: manager.communications,
  }));

  const ordersChart = filteredManagers.map((manager) => ({
    name: manager.name,
    orders: manager.ordersCount,
  }));

  return (
    <AppLayout title="Отчеты (аналитика)" subtitle="Сводные показатели и аналитика">
      <div className="space-y-6 animate-fade-up">
        <div className="glass-card rounded-2xl p-4">
          <div className="flex flex-wrap items-center gap-3">
            {periodOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => setPeriod(option.key)}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-all',
                  period === option.key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                {option.label}
              </button>
            ))}
            {period === 'custom' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={rangeFrom}
                  onChange={(event) => setRangeFrom(event.target.value)}
                  className="ios-input text-xs"
                />
                <span className="text-xs text-muted-foreground">—</span>
                <input
                  type="date"
                  value={rangeTo}
                  onChange={(event) => setRangeTo(event.target.value)}
                  className="ios-input text-xs"
                />
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {managers.map((manager) => {
              const active = activeManagerIds.includes(manager.id);
              return (
                <button
                  key={manager.id}
                  onClick={() => {
                    setSelectedManagers((prev) =>
                      prev.includes(manager.id) ? prev.filter((id) => id !== manager.id) : [...prev, manager.id]
                    );
                  }}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium transition-all',
                    active ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {manager.name}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>Сравнение: {activeManagerIds.length} менеджеров</span>
            <a className="ml-auto inline-flex items-center gap-2 text-primary" href="/analytics/regions">
              <MapPinned className="h-4 w-4" /> Продажи по регионам
            </a>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                <CheckCircle2 className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{summary.tasksDone}</p>
                <p className="text-sm text-muted-foreground">Выполнено задач</p>
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10">
                <Clock3 className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{summary.tasksInWork}</p>
                <p className="text-sm text-muted-foreground">Задач в работе</p>
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{summary.clientsAdded}</p>
                <p className="text-sm text-muted-foreground">Новых клиентов</p>
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10">
                <BarChart3 className="h-5 w-5 text-sky-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{summary.ordersCount}</p>
                <p className="text-sm text-muted-foreground">Заявок за период</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Отчеты по задачам</h3>
              <LineChartIcon className="h-5 w-5 text-primary" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taskChart} barSize={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completed" name="Выполнено" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="inWork" name="В работе" fill="hsl(var(--warning))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Клиенты и коммуникации</h3>
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={clientsChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="clients" name="Добавлено клиентов" stroke="hsl(var(--primary))" strokeWidth={2} />
                  <Line type="monotone" dataKey="communications" name="Коммуникации" stroke="hsl(var(--success))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Отчеты по продажам</h3>
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ordersChart} barSize={26}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="orders" name="Заявки" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Отчеты по делам</h3>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span>Удачно / Неудачно</span>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Завершенные</span>
                <span className="text-sm font-semibold text-foreground">
                  {summary.dealsSuccess + summary.dealsRefused}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Удачно</span>
                <span className="text-sm font-semibold text-success">{summary.dealsSuccess}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Неудачно</span>
                <span className="text-sm font-semibold text-destructive">{summary.dealsRefused}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Причины неудачи берутся из комментариев в карточке клиента.
              </p>
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Коэффициент эффективности</h3>
              <div className="flex items-center gap-1">
                <ArrowUpRight className="h-4 w-4 text-success" />
                <ArrowDownRight className="h-4 w-4 text-warning" />
              </div>
            </div>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={efficiencyChart} barSize={20}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="calls" name="По звонкам" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="orders" name="По заказам" fill="hsl(var(--success))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Сравнение менеджеров</h3>
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-3">
            {filteredManagers.map((manager) => (
              <div key={manager.id} className="flex items-center justify-between text-sm">
                <span className="font-medium text-foreground">{manager.name}</span>
                <div className="flex items-center gap-4 text-muted-foreground">
                  <span>Задачи: {manager.tasksDone}/{manager.tasksInWork}</span>
                  <span>Клиенты: {manager.clientsAdded}</span>
                  <span>Коммуникации: {manager.communications}</span>
                  <span>Заявки: {manager.ordersCount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
