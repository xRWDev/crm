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
import { useAuthStore } from '@/store/authStore';
import { useDirectoryStore } from '@/store/directoryStore';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const periodOptions = [
  { key: 'day', label: 'День', days: 1 },
  { key: 'week', label: 'Неделя', days: 7 },
  { key: 'month', label: 'Месяц', days: 30 },
  { key: 'custom', label: 'Период', days: 0 },
] as const;

const clientTypeLabel: Record<string, string> = {
  client: 'Клиент',
  supplier: 'Поставщик',
  competitor: 'Конкурент',
  partner: 'Партнер',
};

const clientTagLabel: Record<string, string> = {
  new: 'Новый',
  regular: 'Регулярный',
  vip: 'VIP',
  problem: 'Проблемный',
};

const orderStatusLabel: Record<string, string> = {
  new: 'Новый',
  confirmed: 'Подтвержден',
  picking: 'Сборка',
  shipped: 'Отгружен',
  delivered: 'Доставлен',
  returned: 'Возврат',
  cancelled: 'Отменен',
};

const refusalReasons = [
  { value: 'supplier', label: 'Есть свой поставщик' },
  { value: 'not_using', label: 'Не используют' },
  { value: 'closed', label: 'Закрылись' },
  { value: 'expensive', label: 'Дорого' },
] as const;

type PeriodKey = typeof periodOptions[number]['key'];

type FilterValue = 'all' | string;

type AnalyticsFilters = {
  activityType: FilterValue;
  region: FilterValue;
  city: FilterValue;
  deliveryService: FilterValue;
  productCategory: FilterValue;
  clientType: FilterValue;
  clientTag: FilterValue;
  refusalReason: FilterValue;
  orderStatus: FilterValue;
};

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
  const { role, userId } = useAuthStore();
  const directoryActivities = useDirectoryStore((state) => state.directories.activity);
  const directoryProducts = useDirectoryStore((state) => state.directories.product);
  const directoryRegions = useDirectoryStore((state) => state.directories.region);
  const directoryCities = useDirectoryStore((state) => state.directories.city);

  const managers = useMemo(
    () => employees.filter((employee) => employee.role === 'manager' || employee.role === 'admin'),
    [employees]
  );

  const currentEmployee = useMemo(
    () => employees.find((employee) => employee.id === userId) || null,
    [employees, userId]
  );

  const availableManagers = useMemo(() => {
    if (role !== 'manager' || !userId) return managers;
    return managers.filter((manager) => manager.id === userId);
  }, [managers, role, userId]);

  const [period, setPeriod] = useState<PeriodKey>('week');
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [selectedManagers, setSelectedManagers] = useState<string[]>([]);

  const activeManagerIds = selectedManagers.length
    ? selectedManagers
    : availableManagers.map((m) => m.id);
  const activeManagerIdSet = useMemo(() => new Set(activeManagerIds), [activeManagerIds]);
  const managerIdSet = useMemo(() => new Set(managers.map((manager) => manager.id)), [managers]);
  const includeUnassignedTasks = selectedManagers.length === 0;

  const [filters, setFilters] = useState<AnalyticsFilters>({
    activityType: 'all',
    region: 'all',
    city: 'all',
    deliveryService: 'all',
    productCategory: 'all',
    clientType: 'all',
    clientTag: 'all',
    refusalReason: 'all',
    orderStatus: 'all',
  });

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

  const activityOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...directoryActivities,
          ...clients.map((client) => client.activityType).filter(Boolean),
        ])
      ).filter(Boolean) as string[],
    [clients, directoryActivities]
  );

  const splitProductCategories = (value?: string | null) =>
    (value ?? "")
      .split(/[,;\n]+/g)
      .map((item) => item.trim())
      .filter(Boolean);

  const productOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...directoryProducts,
          ...clients.flatMap((client) => splitProductCategories(client.productCategory)),
        ])
      ).filter(Boolean) as string[],
    [clients, directoryProducts]
  );

  const regionOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...directoryRegions,
          ...clients.map((client) => client.region).filter(Boolean),
        ])
      ).filter(Boolean) as string[],
    [clients, directoryRegions]
  );

  const cityOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...directoryCities,
          ...clients.map((client) => client.city).filter(Boolean),
        ])
      ).filter(Boolean) as string[],
    [clients, directoryCities]
  );

  const deliveryOptions = useMemo(
    () =>
      Array.from(new Set(orders.map((order) => order.deliveryMethod).filter(Boolean))),
    [orders]
  );

  const orderStatusOptions = useMemo(
    () => Array.from(new Set(orders.map((order) => order.status).filter(Boolean))),
    [orders]
  );

  const clientTypeOptions = useMemo(
    () => Array.from(new Set(clients.map((client) => client.clientType).filter(Boolean))),
    [clients]
  );

  const clientTagOptions = useMemo(
    () => Array.from(new Set(clients.map((client) => client.status).filter(Boolean))),
    [clients]
  );

  const clientById = useMemo(() => {
    return new Map(clients.map((client) => [client.id, client]));
  }, [clients]);

  const getLatestFailedReason = (client: typeof clients[number]) => {
    const failed = (client.communications ?? [])
      .filter((item) => item.status === 'closed' && item.result === 'failed' && item.reason)
      .map((item) => ({
        reason: item.reason as string,
        time: new Date(item.closedAt ?? item.scheduledAt).getTime(),
      }))
      .sort((a, b) => b.time - a.time);
    return failed[0]?.reason ?? null;
  };

  const matchesClientFilters = (client: typeof clients[number]) => {
    if (filters.activityType !== 'all' && client.activityType !== filters.activityType) return false;
    if (filters.region !== 'all' && client.region !== filters.region) return false;
    if (filters.city !== 'all' && client.city !== filters.city) return false;
    if (filters.productCategory !== 'all') {
      const products = splitProductCategories(client.productCategory);
      if (!products.includes(filters.productCategory)) return false;
    }
    if (filters.clientType !== 'all' && client.clientType !== filters.clientType) return false;
    if (filters.clientTag !== 'all' && client.status !== filters.clientTag) return false;
    if (filters.refusalReason !== 'all') {
      const reason = getLatestFailedReason(client);
      if (reason !== filters.refusalReason) return false;
    }
    return true;
  };

  const matchesOrderFilters = (order: typeof orders[number]) => {
    if (filters.deliveryService !== 'all' && order.deliveryMethod !== filters.deliveryService) return false;
    if (filters.orderStatus !== 'all' && order.status !== filters.orderStatus) return false;
    const client = clientById.get(order.clientId);
    if (client && !matchesClientFilters(client)) return false;
    return true;
  };

  const reportAccess = useMemo(() => {
    const base = {
      tasks: true,
      clients: true,
      sales: true,
      deals: true,
      efficiency: true,
      comparison: true,
    };
    if (role === 'director') return base;
    return { ...base, ...(currentEmployee?.reportAccess?.analytics ?? {}) };
  }, [currentEmployee, role]);

  const hasAnyReportSections = Object.values(reportAccess).some(Boolean);

  const managerMetrics: ManagerMetrics[] = useMemo(() => {
    const getCommunicationTime = (item: NonNullable<typeof clients[number]["communications"]>[number]) => {
      const dateValue =
        item.status === 'closed'
          ? item.closedAt ?? item.scheduledAt ?? item.createdAt
          : item.scheduledAt ?? item.createdAt;
      return toDate(dateValue);
    };

    const getClientCommunicationMeta = (client: typeof clients[number]) => {
      const items = client.communications ?? [];
      if (!items.length) {
        return {
          status: client.communicationStatus ?? 'none',
          time: toDate(client.lastCommunicationAt ?? null),
        };
      }
      const latest = items
        .map((item) => {
          const time = getCommunicationTime(item);
          return {
            item,
            time: time?.getTime() ?? 0,
            priority: item.status === 'closed' ? 1 : 0,
          };
        })
        .sort((a, b) => (b.time - a.time) || (b.priority - a.priority))[0]?.item;

      if (!latest) {
        return {
          status: client.communicationStatus ?? 'none',
          time: toDate(client.lastCommunicationAt ?? null),
        };
      }

      const status =
        latest.status === 'planned'
          ? 'in_progress'
          : latest.result === 'success'
          ? 'success'
          : 'refused';
      return { status, time: getCommunicationTime(latest) };
    };

    const getOrderManagerId = (order: typeof orders[number]) => {
      if (order.managerId) return order.managerId;
      const linkedClient = clientById.get(order.clientId);
      return linkedClient?.managerId || linkedClient?.responsibleId || null;
    };

    return managers.map((manager) => {
      const managerTasks = tasks.filter((task) => task.assigneeId === manager.id);
      const managerClients = clients.filter(
        (client) =>
          (client.managerId === manager.id || client.responsibleId === manager.id) &&
          matchesClientFilters(client)
      );
      const managerOrders = orders.filter(
        (order) => getOrderManagerId(order) === manager.id && matchesOrderFilters(order)
      );

      const tasksDone = managerTasks.filter((task) => task.status === 'completed').length;
      const tasksInWork = managerTasks.filter((task) => task.status !== 'completed').length;

      const clientsAdded = managerClients.filter((client) => inRange(client.createdAt)).length;

      const managerCommunications = managerClients.flatMap((client) => client.communications ?? []);
      const closedCommunicationsInRange = managerCommunications.filter((item) => {
        if (item.status !== 'closed') return false;
        const dateValue = getCommunicationTime(item);
        return inRange(dateValue);
      });
      const communications = closedCommunicationsInRange.length;

      const ordersCount = managerOrders.filter((order) => inRange(order.createdAt)).length;

      const communicationStats = managerClients.reduce(
        (acc, client) => {
          const { status } = getClientCommunicationMeta(client);
          if (status === 'success') acc.success += 1;
          if (status === 'refused') acc.refused += 1;
          return acc;
        },
        { success: 0, refused: 0 }
      );
      const dealsSuccess = communicationStats.success;
      const dealsRefused = communicationStats.refused;

      const efficiencyCalls = communications;
      const efficiencyOrders = ordersCount;

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
  }, [managers, tasks, clients, orders, filters, clientById]);

  const filteredManagers = managerMetrics.filter((manager) => activeManagerIds.includes(manager.id));

  const taskSummary = useMemo(
    () =>
      tasks.reduce(
        (acc, task) => {
          const assigneeId = task.assigneeId;
          const hasManager = assigneeId && managerIdSet.has(assigneeId);
          const isIncluded = hasManager
            ? activeManagerIdSet.has(assigneeId)
            : includeUnassignedTasks;
          if (!isIncluded) return acc;
          if (task.status === 'completed') acc.tasksDone += 1;
          else acc.tasksInWork += 1;
          return acc;
        },
        { tasksDone: 0, tasksInWork: 0 }
      ),
    [tasks, managerIdSet, activeManagerIdSet, includeUnassignedTasks]
  );

  const summary = useMemo(() => {
    const base = filteredManagers.reduce(
      (acc, manager) => {
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
    return {
      ...base,
      tasksDone: taskSummary.tasksDone,
      tasksInWork: taskSummary.tasksInWork,
    };
  }, [filteredManagers, taskSummary]);

  const metricCards = [
    {
      key: 'tasksDone',
      access: reportAccess.tasks,
      value: summary.tasksDone,
      label: 'Выполнено задач',
      icon: CheckCircle2,
      iconWrap: 'bg-success/10',
      iconColor: 'text-success',
    },
    {
      key: 'tasksInWork',
      access: reportAccess.tasks,
      value: summary.tasksInWork,
      label: 'Задач в работе',
      icon: Clock3,
      iconWrap: 'bg-warning/10',
      iconColor: 'text-warning',
    },
    {
      key: 'clientsAdded',
      access: reportAccess.clients,
      value: summary.clientsAdded,
      label: 'Новых клиентов',
      icon: Users,
      iconWrap: 'bg-primary/10',
      iconColor: 'text-primary',
    },
    {
      key: 'ordersCount',
      access: reportAccess.sales,
      value: summary.ordersCount,
      label: 'Заявок за период',
      icon: BarChart3,
      iconWrap: 'bg-sky-500/10',
      iconColor: 'text-sky-500',
    },
  ];
  const visibleMetricCards = metricCards.filter((card) => card.access);

  const efficiencyChart = filteredManagers.map((manager) => ({
    name: manager.name,
    calls: manager.efficiencyCalls,
    orders: manager.efficiencyOrders,
  }));

  const taskChart = useMemo(() => {
    const buckets = new Map<string, { name: string; completed: number; inWork: number }>();
    const nameById = new Map(managers.map((manager) => [manager.id, manager.name]));

    managers.forEach((manager) => {
      if (!activeManagerIdSet.has(manager.id)) return;
      buckets.set(manager.id, { name: manager.name, completed: 0, inWork: 0 });
    });

    tasks.forEach((task) => {
      const assigneeId = task.assigneeId;
      const hasManager = assigneeId && managerIdSet.has(assigneeId);
      if (hasManager) {
        if (!activeManagerIdSet.has(assigneeId)) return;
        const bucket = buckets.get(assigneeId) || {
          name: nameById.get(assigneeId) ?? '—',
          completed: 0,
          inWork: 0,
        };
        if (task.status === 'completed') bucket.completed += 1;
        else bucket.inWork += 1;
        buckets.set(assigneeId, bucket);
        return;
      }

      if (!includeUnassignedTasks) return;
      const bucketId = 'unassigned';
      const bucket = buckets.get(bucketId) || { name: 'Без ответственного', completed: 0, inWork: 0 };
      if (task.status === 'completed') bucket.completed += 1;
      else bucket.inWork += 1;
      buckets.set(bucketId, bucket);
    });

    return Array.from(buckets.values());
  }, [tasks, managers, managerIdSet, activeManagerIdSet, includeUnassignedTasks]);

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

          {role === 'director' ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {availableManagers.map((manager) => {
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
          ) : (
            <div className="mt-4 text-xs text-muted-foreground">
              Менеджер: {currentEmployee?.name || '—'}
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Вид деятельности</label>
              <Select
                value={filters.activityType}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, activityType: value }))}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Все" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  {activityOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Область</label>
              <Select
                value={filters.region}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, region: value }))}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Все" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  {regionOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Город</label>
              <Select
                value={filters.city}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, city: value }))}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Все" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  {cityOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Служба почтовой доставки</label>
              <Select
                value={filters.deliveryService}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, deliveryService: value }))}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Все" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  {deliveryOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Продукция</label>
              <Select
                value={filters.productCategory}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, productCategory: value }))}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Все" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  {productOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Тип клиента</label>
              <Select
                value={filters.clientType}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, clientType: value }))}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Все" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  {clientTypeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {clientTypeLabel[option] ?? option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Метка</label>
              <Select
                value={filters.clientTag}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, clientTag: value }))}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Все" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  {clientTagOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {clientTagLabel[option] ?? option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Причина отказа</label>
              <Select
                value={filters.refusalReason}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, refusalReason: value }))}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Все" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  {refusalReasons.map((reason) => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs text-muted-foreground mb-1">Статус заказа</label>
              <Select
                value={filters.orderStatus}
                onValueChange={(value) => setFilters((prev) => ({ ...prev, orderStatus: value }))}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Все" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все</SelectItem>
                  {orderStatusOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {orderStatusLabel[option] ?? option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {(reportAccess.comparison || reportAccess.sales) && (
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
              {reportAccess.comparison && <span>Сравнение: {activeManagerIds.length} менеджеров</span>}
              {reportAccess.sales && (
                <a
                  className={cn(
                    'inline-flex items-center gap-2 text-primary',
                    reportAccess.comparison ? 'ml-auto' : ''
                  )}
                  href="/analytics/regions"
                >
                  <MapPinned className="h-4 w-4" /> Продажи по регионам
                </a>
              )}
            </div>
          )}
        </div>

        {!hasAnyReportSections ? (
          <div className="glass-card rounded-2xl p-6 text-sm text-muted-foreground">
            Нет доступа к разделам аналитики. Настройте доступ в разделе сотрудников.
          </div>
        ) : (
          <>
            {visibleMetricCards.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {visibleMetricCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div key={card.key} className="metric-card">
                      <div className="flex items-center gap-3">
                        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', card.iconWrap)}>
                          <Icon className={cn('h-5 w-5', card.iconColor)} />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-foreground">{card.value}</p>
                          <p className="text-sm text-muted-foreground">{card.label}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {(reportAccess.tasks || reportAccess.clients) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {reportAccess.tasks && (
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
                )}

                {reportAccess.clients && (
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
                )}
              </div>
            )}

            {(reportAccess.sales || reportAccess.deals || reportAccess.efficiency) && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {reportAccess.sales && (
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
                )}

                {reportAccess.deals && (
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
                        Берется из статуса коммуникации клиента (Успешно / Отказ).
                      </p>
                    </div>
                  </div>
                )}

                {reportAccess.efficiency && (
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
                )}
              </div>
            )}

            {reportAccess.comparison && (
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
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
