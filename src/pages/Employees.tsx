import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { Briefcase, List, Mail, Phone, Plus, Search, User, UserCheck, UserMinus, Users, UserX, type LucideIcon } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import { AppLayout } from '@/components/layout/AppLayout';
import { Modal } from '@/components/ui/Modal';
import { useCRMStore, Employee } from '@/store/crmStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

type EmployeeFilter = 'all' | 'staff' | 'contractor' | 'fired';
type ActivityFilter = 'today' | 'week' | 'month' | 'period';

const monthLabels = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
];

const toDate = (value?: Date | string | null) => (value ? new Date(value) : null);

const formatDate = (value?: Date | string | null) => {
  const date = toDate(value);
  return date ? date.toLocaleDateString('ru-RU') : '—';
};

const formatDateTime = (value?: Date | string | null) => {
  const date = toDate(value);
  return date
    ? date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';
};

const toInputDate = (value?: Date | string | null) => {
  const date = toDate(value);
  return date ? date.toISOString().slice(0, 10) : '';
};

const fixMojibake = (value?: string | null) => {
  if (!value || !/[РС]/.test(value)) return value || '';
  try {
    const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff);
    const decoded = new TextDecoder('utf-8').decode(bytes);
    return /[А-Яа-яЁё]/.test(decoded) ? decoded : value;
  } catch {
    return value;
  }
};

const getDisplayName = (employee: Employee) => {
  const name = [employee.lastName, employee.firstName, employee.middleName].filter(Boolean).join(' ').trim();
  const fixedName = fixMojibake(name);
  return fixedName || fixMojibake(employee.name) || '—';
};

const defaultEfficiency = { communications: undefined, orders: undefined, tasks: undefined };
const defaultReportAccess = {
  analytics: {
    tasks: true,
    clients: true,
    sales: true,
    deals: true,
    efficiency: true,
    comparison: true,
  },
};
const analyticsAccessOptions = [
  { key: 'tasks', label: 'Отчеты по задачам' },
  { key: 'clients', label: 'Клиенты и коммуникации' },
  { key: 'sales', label: 'Отчеты по продажам' },
  { key: 'deals', label: 'Отчеты по делам' },
  { key: 'efficiency', label: 'Коэффициент эффективности' },
  { key: 'comparison', label: 'Сравнение менеджеров' },
] as const;

export default function Employees() {
  const {
    employees,
    clients,
    tasks,
    orders,
    addEmployee,
    updateEmployee,
    updateClient,
    updateTask,
    updateOrder,
  } = useCRMStore();
  const { role } = useAuthStore();
  const isDirector = role === 'director';

  const [filter, setFilter] = useState<EmployeeFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFireOpen, setIsFireOpen] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('week');
  const [activityRange, setActivityRange] = useState({ from: '', to: '' });

  const [employeeForm, setEmployeeForm] = useState({
    lastName: '',
    firstName: '',
    middleName: '',
    email: '',
    phones: [''],
    gender: 'male' as Employee['gender'],
    position: '',
    employmentType: 'staff' as Employee['employmentType'],
    login: '',
    password: '',
    confirmPassword: '',
  });

  const [detailDraft, setDetailDraft] = useState({
    lastName: '',
    firstName: '',
    middleName: '',
    email: '',
    phones: [''],
    gender: 'male' as Employee['gender'],
    position: '',
    employmentType: 'staff' as Employee['employmentType'],
    login: '',
    role: 'manager' as Employee['role'],
    hireDate: '',
    fireDate: '',
    birthday: '',
    city: '',
    salary: {} as Employee['salary'],
    efficiencyTargets: { ...defaultEfficiency } as Employee['efficiencyTargets'],
    efficiencyActual: { ...defaultEfficiency } as Employee['efficiencyActual'],
    reportAccess: { ...defaultReportAccess },
  });

  const [fireForm, setFireForm] = useState({
    reassignTo: '',
    fireDate: '',
    comment: '',
  });

  const currentYear = new Date().getFullYear();
  const salaryMonths = useMemo(
    () =>
      monthLabels.map((label, index) => ({
        key: `${currentYear}-${String(index + 1).padStart(2, '0')}`,
        label,
      })),
    [currentYear]
  );

  const selectedEmployee = useMemo(
    () => (selectedEmployeeId ? employees.find((employee) => employee.id === selectedEmployeeId) || null : null),
    [employees, selectedEmployeeId]
  );

  const adminId = useMemo(
    () => employees.find((employee) => employee.role === 'admin')?.id || employees[0]?.id || '1',
    [employees]
  );

  useEffect(() => {
    if (!selectedEmployee) return;
    setDetailDraft({
      lastName: selectedEmployee.lastName || '',
      firstName: selectedEmployee.firstName || '',
      middleName: selectedEmployee.middleName || '',
      email: selectedEmployee.email || '',
      phones: selectedEmployee.phones?.length ? selectedEmployee.phones : [''],
      gender: selectedEmployee.gender || 'male',
      position: selectedEmployee.position || '',
      employmentType: selectedEmployee.employmentType || 'staff',
      login: selectedEmployee.login || '',
      role: selectedEmployee.role,
      hireDate: toInputDate(selectedEmployee.hireDate),
      fireDate: toInputDate(selectedEmployee.fireDate),
      birthday: toInputDate(selectedEmployee.birthday),
      city: selectedEmployee.city || '',
      salary: selectedEmployee.salary || {},
      efficiencyTargets: selectedEmployee.efficiencyTargets || { ...defaultEfficiency },
      efficiencyActual: selectedEmployee.efficiencyActual || { ...defaultEfficiency },
      reportAccess: selectedEmployee.reportAccess || { ...defaultReportAccess },
    });
    setActivityFilter('week');
    setActivityRange({ from: '', to: '' });
  }, [selectedEmployee?.id]);

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return employees.filter((employee) => {
      const isFired = employee.employmentStatus === 'fired' || employee.isActive === false;
      const employmentType = employee.employmentType || 'staff';
      if (filter === 'staff' && (isFired || employmentType !== 'staff')) return false;
      if (filter === 'contractor' && (isFired || employmentType !== 'contractor')) return false;
      if (filter === 'fired' && !isFired) return false;

      if (!query) return true;
      const searchable = [
        getDisplayName(employee),
        employee.name,
        employee.position,
        employee.email,
        employee.login,
        employee.city,
        ...(employee.phones || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [employees, searchQuery, filter]);

  const filterCounts = useMemo(() => {
    const total = employees.length;
    const staff = employees.filter(
      (employee) => (employee.employmentType || 'staff') === 'staff' && employee.employmentStatus !== 'fired'
    ).length;
    const contractor = employees.filter(
      (employee) => (employee.employmentType || 'staff') === 'contractor' && employee.employmentStatus !== 'fired'
    ).length;
    const fired = employees.filter((employee) => employee.employmentStatus === 'fired' || employee.isActive === false)
      .length;
    return { total, staff, contractor, fired };
  }, [employees]);

  const assignableEmployees = useMemo(
    () =>
      employees.filter(
        (employee) =>
          employee.id !== selectedEmployeeId &&
          employee.employmentStatus !== 'fired' &&
          (employee.role === 'admin' || employee.role === 'manager')
      ),
    [employees, selectedEmployeeId]
  );

  const assignedClients = useMemo(() => {
    if (!selectedEmployee) return [];
    return clients.filter(
      (client) => client.managerId === selectedEmployee.id || client.responsibleId === selectedEmployee.id
    );
  }, [clients, selectedEmployee]);

  const assignedTasks = useMemo(() => {
    if (!selectedEmployee) return [];
    return tasks.filter((task) => task.assigneeId === selectedEmployee.id);
  }, [tasks, selectedEmployee]);

  const assignedOrders = useMemo(() => {
    if (!selectedEmployee) return [];
    return orders.filter((order) => order.managerId === selectedEmployee.id);
  }, [orders, selectedEmployee]);

  const filteredActivityLog = useMemo(() => {
    if (!selectedEmployee?.activityLog?.length) return [];
    const now = new Date();
    return selectedEmployee.activityLog.filter((entry) => {
      const entryDate = toDate(entry.at);
      if (!entryDate) return false;
      if (activityFilter === 'today') {
        return entryDate.toDateString() === now.toDateString();
      }
      if (activityFilter === 'week') {
        return now.getTime() - entryDate.getTime() <= 7 * 24 * 60 * 60 * 1000;
      }
      if (activityFilter === 'month') {
        return now.getTime() - entryDate.getTime() <= 30 * 24 * 60 * 60 * 1000;
      }
      if (activityFilter === 'period' && activityRange.from && activityRange.to) {
        const from = new Date(activityRange.from);
        const to = new Date(`${activityRange.to}T23:59:59`);
        return entryDate >= from && entryDate <= to;
      }
      return true;
    });
  }, [selectedEmployee, activityFilter, activityRange]);

  const renderActivityEntry = (entry: NonNullable<Employee['activityLog']>[number]) => (
    <div key={entry.id} className="flex items-start gap-3 border-b border-border/40 pb-2">
      <div className="mt-1 h-2 w-2 bg-primary" />
      <div>
        <p className="text-sm text-foreground">Вход в систему</p>
        <p className="text-xs text-muted-foreground">{formatDateTime(entry.at)}</p>
      </div>
    </div>
  );

  const handleCopyToClipboard = (label: string, value?: string | null) => {
    if (!value) return;
    navigator.clipboard
      ?.writeText(value)
      .then(() => {
        toast({ title: 'Скопировано', description: `${label}: ${value}` });
      })
      .catch(() => {
        toast({ title: 'Не удалось скопировать', description: value, variant: 'destructive' });
      });
  };


  const handleOpenDetail = (employee: Employee) => {
    setSelectedEmployeeId(employee.id);
    setIsDetailOpen(true);
  };

  const handleOpenCreate = () => {
    setEmployeeForm({
      lastName: '',
      firstName: '',
      middleName: '',
      email: '',
      phones: [''],
      gender: 'male',
      position: '',
      employmentType: 'staff',
      login: '',
      password: '',
      confirmPassword: '',
    });
    setIsAddOpen(true);
  };

  const handleAddEmployee = () => {
    if (!employeeForm.firstName.trim() || !employeeForm.lastName.trim()) {
      alert('Укажите имя и фамилию сотрудника.');
      return;
    }
    if (!employeeForm.email.trim()) {
      alert('Укажите почту сотрудника.');
      return;
    }
    if (!employeeForm.login.trim()) {
      alert('Укажите логин сотрудника.');
      return;
    }
    if (!employeeForm.password.trim()) {
      alert('Укажите пароль сотрудника.');
      return;
    }
    if (employeeForm.password !== employeeForm.confirmPassword) {
      alert('Пароли не совпадают.');
      return;
    }

    const fullName = [employeeForm.lastName, employeeForm.firstName, employeeForm.middleName]
      .filter(Boolean)
      .join(' ')
      .trim();
    const cleanedPhones = employeeForm.phones.map((phone) => phone.trim()).filter(Boolean);

    const newEmployeeId = addEmployee({
      name: fullName,
      firstName: employeeForm.firstName.trim(),
      lastName: employeeForm.lastName.trim(),
      middleName: employeeForm.middleName.trim(),
      email: employeeForm.email.trim(),
      phones: cleanedPhones,
      gender: employeeForm.gender,
      position: employeeForm.position.trim(),
      login: employeeForm.login.trim(),
      password: employeeForm.password,
      role: 'manager',
      isActive: true,
      employmentType: employeeForm.employmentType,
      employmentStatus: 'active',
      hireDate: null,
      fireDate: null,
      birthday: null,
      city: '',
      activityLog: [],
      salary: {},
      efficiencyTargets: { ...defaultEfficiency },
      efficiencyActual: { ...defaultEfficiency },
      reportAccess: { ...defaultReportAccess },
    });

    setIsAddOpen(false);
    setSelectedEmployeeId(newEmployeeId);
    setIsDetailOpen(true);
  };

  const updatePhoneList = (
    value: string,
    index: number,
    setter: Dispatch<SetStateAction<typeof employeeForm>>
  ) => {
    setter((prev) => {
      const nextPhones = [...prev.phones];
      nextPhones[index] = value;
      return { ...prev, phones: nextPhones };
    });
  };

  const updateDetailPhones = (value: string, index: number) => {
    setDetailDraft((prev) => {
      const nextPhones = [...prev.phones];
      nextPhones[index] = value;
      return { ...prev, phones: nextPhones };
    });
  };

  const handleSaveDetail = () => {
    if (!selectedEmployee) return;
    const fullName = [detailDraft.lastName, detailDraft.firstName, detailDraft.middleName]
      .filter(Boolean)
      .join(' ')
      .trim();
    const cleanedPhones = detailDraft.phones.map((phone) => phone.trim()).filter(Boolean);

    updateEmployee(selectedEmployee.id, {
      name: fullName || selectedEmployee.name,
      firstName: detailDraft.firstName.trim(),
      lastName: detailDraft.lastName.trim(),
      middleName: detailDraft.middleName.trim(),
      email: detailDraft.email.trim(),
      phones: cleanedPhones,
      gender: detailDraft.gender,
      position: detailDraft.position.trim(),
      employmentType: detailDraft.employmentType,
      login: detailDraft.login.trim(),
      hireDate: detailDraft.hireDate ? new Date(detailDraft.hireDate) : null,
      fireDate: detailDraft.fireDate ? new Date(detailDraft.fireDate) : null,
      birthday: detailDraft.birthday ? new Date(detailDraft.birthday) : null,
      city: detailDraft.city.trim(),
      salary: detailDraft.salary,
      efficiencyTargets: detailDraft.efficiencyTargets,
      efficiencyActual: detailDraft.efficiencyActual,
      reportAccess: detailDraft.reportAccess,
    });
    setIsDetailOpen(false);
  };

  const handleOpenFire = () => {
    if (!selectedEmployee) return;
    const defaultAssignee = assignableEmployees[0]?.id || adminId || '';
    setFireForm({
      reassignTo: defaultAssignee,
      fireDate: toInputDate(new Date()),
      comment: '',
    });
    setIsFireOpen(true);
  };

  const handleFireEmployee = () => {
    if (!selectedEmployee) return;
    const reassigneeId = fireForm.reassignTo || adminId;
    if (!reassigneeId) {
      alert('Выберите сотрудника для переназначения.');
      return;
    }

    assignedClients.forEach((client) => {
      updateClient(client.id, {
        managerId: client.managerId === selectedEmployee.id ? reassigneeId : client.managerId,
        responsibleId: client.responsibleId === selectedEmployee.id ? reassigneeId : client.responsibleId,
      });
    });

    assignedTasks.forEach((task) => {
      updateTask(task.id, {
        assigneeId: reassigneeId,
      });
    });

    assignedOrders.forEach((order) => {
      updateOrder(order.id, {
        managerId: reassigneeId,
      });
    });

    updateEmployee(selectedEmployee.id, {
      employmentStatus: 'fired',
      isActive: false,
      fireDate: fireForm.fireDate ? new Date(fireForm.fireDate) : new Date(),
      terminationComment: fireForm.comment.trim(),
    });
    setIsFireOpen(false);
  };

  const renderFilterButton = (
    label: string,
    count: number,
    isActive: boolean,
    onClick: () => void,
    icon?: LucideIcon
  ) => {
    const Icon = icon;
    return (
      <button
        onClick={onClick}
        className={cn(
          'flex items-center justify-between px-3 py-2 text-sm border border-transparent transition-all duration-200 ease-out',
          isActive
            ? 'bg-primary/10 text-primary shadow-[0_12px_26px_rgba(15,23,42,0.12)] -translate-y-[1px]'
            : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground hover:shadow-[0_12px_26px_rgba(15,23,42,0.10)] hover:-translate-y-[1px]'
        )}
      >
        <span className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-current/70" />}
          <span>{label}</span>
        </span>
        <span className="ml-3 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-none bg-muted text-[11px] font-semibold text-muted-foreground">
          {count}
        </span>
      </button>
    );
  };

  if (!isDirector) {
    return (
      <AppLayout title="Сотрудники" subtitle="Доступно только директору">
        <div className="glass-card p-10 text-center text-muted-foreground">
          Раздел доступен только директору.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Сотрудники" subtitle={`Всего сотрудников: ${employees.length}`}>
      <div className="grid grid-cols-12 gap-6 animate-fade-up">
        <aside className="col-span-12 xl:col-span-3 space-y-4">
          <div className="glass-card p-4 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Фильтры</h3>
            {renderFilterButton('Все сотрудники', filterCounts.total, filter === 'all', () => setFilter('all'), Users)}
            {renderFilterButton('В штате', filterCounts.staff, filter === 'staff', () => setFilter('staff'), UserCheck)}
            {renderFilterButton(
              'Внештатные',
              filterCounts.contractor,
              filter === 'contractor',
              () => setFilter('contractor'),
              Briefcase
            )}
            {renderFilterButton('Уволенные', filterCounts.fired, filter === 'fired', () => setFilter('fired'), UserMinus)}
          </div>
        </aside>

        <section className="col-span-12 xl:col-span-9 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="search-bar flex-1 min-w-[470px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Поиск сотрудника..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <button onClick={handleOpenCreate} className="ios-button-primary text-xs">
              <Plus className="h-4 w-4" /> Добавить сотрудника
            </button>
          </div>

          <div className="glass-card rounded-2xl border border-border p-0 m-0 overflow-hidden">
            <div className="max-h-[64vh] overflow-y-auto custom-scrollbar">
              <table className="w-full border-separate border-spacing-y-2 text-sm">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-white/90 backdrop-blur-md">
                    <th className="w-[18%] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Сотрудник
                    </th>
                    <th className="w-[14%] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Должность
                    </th>
                    <th className="w-[13%] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Телефон
                    </th>
                    <th className="w-[16%] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Почта
                    </th>
                    <th className="w-[10%] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Прием
                    </th>
                    <th className="w-[10%] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Увольнение
                    </th>
                    <th className="w-[9%] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Рождение
                    </th>
                    <th className="w-[10%] px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Город
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((employee) => (
                    <tr
                      key={employee.id}
                      onClick={() => handleOpenDetail(employee)}
                      className="group cursor-pointer bg-white transition-all duration-200 ease-out hover:bg-primary/10 hover:-translate-y-[2px]"
                    >
                      <td className="px-4 py-3 align-middle bg-transparent text-foreground/90 transition-all duration-200 ease-out">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{getDisplayName(employee)}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {employee.role === 'admin' ? 'Директор' : 'Сотрудник'}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-middle bg-transparent text-sm text-foreground truncate">
                        {fixMojibake(employee.position) || '—'}
                      </td>
                      <td className="px-4 py-3 align-middle bg-transparent">
                        {employee.phones?.length ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleCopyToClipboard('Телефон', employee.phones?.join(', '));
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center bg-muted/40 text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                            aria-label="����������� Телефон"
                            title={employee.phones.join(', ')}
                          >
                            <Phone className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-sm text-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle bg-transparent">
                        {employee.email ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleCopyToClipboard('Почта', employee.email);
                            }}
                            className="inline-flex h-8 w-8 items-center justify-center bg-muted/40 text-foreground/80 transition-colors hover:bg-muted hover:text-foreground"
                            aria-label="Скопировать почту"
                            title={employee.email}
                          >
                            <Mail className="h-4 w-4" />
                          </button>
                        ) : (
                          <span className="text-sm text-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle bg-transparent text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(employee.hireDate)}
                      </td>
                      <td className="px-4 py-3 align-middle bg-transparent text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(employee.fireDate)}
                      </td>
                      <td className="px-4 py-3 align-middle bg-transparent text-sm text-muted-foreground whitespace-nowrap">
                        {formatDate(employee.birthday)}
                      </td>
                      <td className="px-4 py-3 align-middle bg-transparent text-sm text-muted-foreground truncate">
                        {fixMojibake(employee.city) || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredEmployees.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">Сотрудники не найдены</div>
            )}
          </div>
        </section>
      </div>

      {/* MODALS_START */}
      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Добавить сотрудника" size="xl">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Фамилия *</label>
              <input
                className="ios-input"
                value={employeeForm.lastName}
                onChange={(event) => setEmployeeForm((prev) => ({ ...prev, lastName: event.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Имя *</label>
              <input
                className="ios-input"
                value={employeeForm.firstName}
                onChange={(event) => setEmployeeForm((prev) => ({ ...prev, firstName: event.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Отчество</label>
              <input
                className="ios-input"
                value={employeeForm.middleName}
                onChange={(event) => setEmployeeForm((prev) => ({ ...prev, middleName: event.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Почта *</label>
              <input
                className="ios-input"
                value={employeeForm.email}
                onChange={(event) => setEmployeeForm((prev) => ({ ...prev, email: event.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Должность</label>
              <input
                className="ios-input"
                value={employeeForm.position}
                onChange={(event) => setEmployeeForm((prev) => ({ ...prev, position: event.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Пол</label>
              <select
                className="ios-input"
                value={employeeForm.gender || 'male'}
                onChange={(event) =>
                  setEmployeeForm((prev) => ({ ...prev, gender: event.target.value as Employee['gender'] }))
                }
              >
                <option value="male">Мужской</option>
                <option value="female">Женский</option>
                <option value="other">Другой</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Тип занятости</label>
              <select
                className="ios-input"
                value={employeeForm.employmentType || 'staff'}
                onChange={(event) =>
                  setEmployeeForm((prev) => ({
                    ...prev,
                    employmentType: event.target.value as Employee['employmentType'],
                  }))
                }
              >
                <option value="staff">В штате</option>
                <option value="contractor">Внештатный</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Телефон</label>
              <div className="space-y-2">
                {employeeForm.phones.map((phone, index) => (
                  <div key={`${index}-phone`} className="flex items-center gap-2">
                    <input
                      className="ios-input"
                      value={phone}
                      onChange={(event) => updatePhoneList(event.target.value, index, setEmployeeForm)}
                    />
                    {employeeForm.phones.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setEmployeeForm((prev) => ({
                            ...prev,
                            phones: prev.phones.filter((_, idx) => idx !== index),
                          }))
                        }
                        className="ios-button-secondary text-xs px-2"
                      >
                        Удалить
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setEmployeeForm((prev) => ({ ...prev, phones: [...prev.phones, ''] }))}
                  className="ios-button-secondary text-xs w-full"
                >
                  Добавить телефон
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Логин *</label>
              <input
                className="ios-input"
                value={employeeForm.login}
                onChange={(event) => setEmployeeForm((prev) => ({ ...prev, login: event.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Пароль *</label>
              <input
                type="password"
                className="ios-input"
                value={employeeForm.password}
                onChange={(event) => setEmployeeForm((prev) => ({ ...prev, password: event.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Подтверждение пароля *</label>
              <input
                type="password"
                className="ios-input"
                value={employeeForm.confirmPassword}
                onChange={(event) => setEmployeeForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button onClick={() => setIsAddOpen(false)} className="ios-button-secondary">
              Отмена
            </button>
            <button onClick={handleAddEmployee} className="ios-button-primary">
              Добавить
            </button>
          </div>
        </div>
      </Modal>

      {/* DETAIL_MODAL_START */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={selectedEmployee ? getDisplayName(selectedEmployee) : 'Карточка сотрудника'}
        size="xl"
      >
        {selectedEmployee && (
          <div className="space-y-6 pb-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
              <div className="glass-card border border-border p-4 space-y-3 h-full m-0">
                <h4 className="text-sm font-semibold text-foreground">Основная информация</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Фамилия</label>
                    <input
                      className="ios-input"
                      value={detailDraft.lastName}
                      onChange={(event) => setDetailDraft((prev) => ({ ...prev, lastName: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Имя</label>
                    <input
                      className="ios-input"
                      value={detailDraft.firstName}
                      onChange={(event) => setDetailDraft((prev) => ({ ...prev, firstName: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Отчество</label>
                    <input
                      className="ios-input"
                      value={detailDraft.middleName}
                      onChange={(event) => setDetailDraft((prev) => ({ ...prev, middleName: event.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Должность</label>
                  <input
                    className="ios-input"
                    value={detailDraft.position}
                    onChange={(event) => setDetailDraft((prev) => ({ ...prev, position: event.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Пол</label>
                    <select
                      className="ios-input"
                      value={detailDraft.gender || 'male'}
                      onChange={(event) =>
                        setDetailDraft((prev) => ({ ...prev, gender: event.target.value as Employee['gender'] }))
                      }
                    >
                      <option value="male">Мужской</option>
                      <option value="female">Женский</option>
                      <option value="other">Другой</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Тип занятости</label>
                    <select
                      className="ios-input"
                      value={detailDraft.employmentType || 'staff'}
                      onChange={(event) =>
                        setDetailDraft((prev) => ({
                          ...prev,
                          employmentType: event.target.value as Employee['employmentType'],
                        }))
                      }
                    >
                      <option value="staff">В штате</option>
                      <option value="contractor">Внештатный</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Почта</label>
                    <input
                      className="ios-input"
                      value={detailDraft.email}
                      onChange={(event) => setDetailDraft((prev) => ({ ...prev, email: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Логин</label>
                    <input
                      className="ios-input"
                      value={detailDraft.login}
                      onChange={(event) => setDetailDraft((prev) => ({ ...prev, login: event.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="glass-card p-4 space-y-3 h-full">
                <h4 className="text-sm font-semibold text-foreground">Контакты и даты</h4>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Телефоны</label>
                  <div className="space-y-2">
                    {detailDraft.phones.map((phone, index) => (
                      <div key={`${index}-detail-phone`} className="flex items-center gap-2">
                        <input
                          className="ios-input"
                          value={phone}
                          onChange={(event) => updateDetailPhones(event.target.value, index)}
                        />
                        {detailDraft.phones.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setDetailDraft((prev) => ({
                                ...prev,
                                phones: prev.phones.filter((_, idx) => idx !== index),
                              }))
                            }
                            className="ios-button-secondary text-xs px-2"
                          >
                            Удалить
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setDetailDraft((prev) => ({ ...prev, phones: [...prev.phones, ''] }))}
                      className="ios-button-secondary text-xs w-full"
                    >
                      Добавить телефон
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Дата приема</label>
                    <input
                      type="date"
                      className="ios-input"
                      value={detailDraft.hireDate}
                      onChange={(event) => setDetailDraft((prev) => ({ ...prev, hireDate: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Дата увольнения</label>
                    <input
                      type="date"
                      className="ios-input"
                      value={detailDraft.fireDate}
                      onChange={(event) => setDetailDraft((prev) => ({ ...prev, fireDate: event.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">День рождения</label>
                    <input
                      type="date"
                      className="ios-input"
                      value={detailDraft.birthday}
                      onChange={(event) => setDetailDraft((prev) => ({ ...prev, birthday: event.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-muted-foreground mb-1">Город</label>
                    <input
                      className="ios-input"
                      value={detailDraft.city}
                      onChange={(event) => setDetailDraft((prev) => ({ ...prev, city: event.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h4 className="text-sm font-semibold text-foreground">Лента активности</h4>
                <div className="flex flex-wrap items-center gap-2">
                  {(
                    [
                      ['today', 'Сегодня'],
                      ['week', 'Неделя'],
                      ['month', 'Месяц'],
                      ['period', 'Период'],
                    ] as [ActivityFilter, string][]
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      onClick={() => setActivityFilter(value)}
                      className={cn(
                        'px-3 py-1 text-xs border transition-colors',
                        activityFilter === value
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-muted/60 text-muted-foreground border-border hover:bg-muted'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                  <button
                    onClick={() => setIsActivityLogOpen(true)}
                    className="flex items-center gap-2 px-3 py-1 text-xs border bg-muted/60 text-muted-foreground border-border hover:bg-muted"
                  >
                    <List className="h-3.5 w-3.5" />
                    Полный список
                  </button>
                </div>
              </div>
              {activityFilter === 'period' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="date"
                    className="ios-input"
                    value={activityRange.from}
                    onChange={(event) => setActivityRange((prev) => ({ ...prev, from: event.target.value }))}
                  />
                  <input
                    type="date"
                    className="ios-input"
                    value={activityRange.to}
                    onChange={(event) => setActivityRange((prev) => ({ ...prev, to: event.target.value }))}
                  />
                </div>
              )}
              {filteredActivityLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">Активность отсутствует.</p>
              ) : (
                <div className="space-y-2 max-h-[150px] overflow-y-auto no-scrollbar pr-1">
                  {filteredActivityLog.map((entry) => renderActivityEntry(entry))}
                </div>
              )}
            </div>

            <div className="glass-card p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Зарплата</h4>
              <div className="overflow-x-auto">
                <table className="ios-table w-full text-xs">
                  <thead>
                    <tr className="border-b border-border/60">
                      <th className="bg-background/95 backdrop-blur">Месяц</th>
                      <th className="bg-background/95 backdrop-blur">Ставка</th>
                      <th className="bg-background/95 backdrop-blur">Бонус</th>
                      <th className="bg-background/95 backdrop-blur">Штраф</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salaryMonths.map((month) => {
                      const entry = detailDraft.salary?.[month.key] || {};
                      return (
                        <tr key={month.key}>
                          <td className="text-sm text-foreground">{month.label}</td>
                          <td>
                            <input
                              type="number"
                              className="ios-input text-xs py-1"
                              value={entry.salary ?? ''}
                              onChange={(event) =>
                                setDetailDraft((prev) => ({
                                  ...prev,
                                  salary: {
                                    ...prev.salary,
                                    [month.key]: {
                                      ...prev.salary?.[month.key],
                                      salary: event.target.value === '' ? undefined : Number(event.target.value),
                                    },
                                  },
                                }))
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="ios-input text-xs py-1"
                              value={entry.bonus ?? ''}
                              onChange={(event) =>
                                setDetailDraft((prev) => ({
                                  ...prev,
                                  salary: {
                                    ...prev.salary,
                                    [month.key]: {
                                      ...prev.salary?.[month.key],
                                      bonus: event.target.value === '' ? undefined : Number(event.target.value),
                                    },
                                  },
                                }))
                              }
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              className="ios-input text-xs py-1"
                              value={entry.penalty ?? ''}
                              onChange={(event) =>
                                setDetailDraft((prev) => ({
                                  ...prev,
                                  salary: {
                                    ...prev.salary,
                                    [month.key]: {
                                      ...prev.salary?.[month.key],
                                      penalty: event.target.value === '' ? undefined : Number(event.target.value),
                                    },
                                  },
                                }))
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="glass-card p-4 space-y-3">
              <h4 className="text-sm font-semibold text-foreground">Коэффициент эффективности</h4>
              <div className="space-y-3">
                {(
                  [
                    ['communications', 'Коммуникации'],
                    ['orders', 'Заказы'],
                    ['tasks', 'Задачи'],
                  ] as const
                ).map(([key, label]) => {
                  const target = detailDraft.efficiencyTargets?.[key];
                  const actual = detailDraft.efficiencyActual?.[key];
                  const progress = target ? Math.min(100, Math.round(((actual || 0) / target) * 100)) : 0;
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span>{label}</span>
                        <span>{target ? `${actual || 0}/${target}` : '—'}</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="number"
                          className="ios-input text-xs"
                          placeholder="Норма"
                          value={target ?? ''}
                          onChange={(event) =>
                            setDetailDraft((prev) => ({
                              ...prev,
                              efficiencyTargets: {
                                ...prev.efficiencyTargets,
                                [key]: event.target.value === '' ? undefined : Number(event.target.value),
                              },
                            }))
                          }
                        />
                        <input
                          type="number"
                          className="ios-input text-xs"
                          placeholder="Факт"
                          value={actual ?? ''}
                          onChange={(event) =>
                            setDetailDraft((prev) => ({
                              ...prev,
                              efficiencyActual: {
                                ...prev.efficiencyActual,
                                [key]: event.target.value === '' ? undefined : Number(event.target.value),
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="h-1 bg-muted">
                        <div className="h-full bg-primary" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {(selectedEmployee.role === 'manager' || selectedEmployee.role === 'admin') && (
              <div className="glass-card p-4 space-y-3">
                <h4 className="text-sm font-semibold text-foreground">Доступ к отчетам (аналитика)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {analyticsAccessOptions.map((option) => (
                    <label key={option.key} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={detailDraft.reportAccess?.analytics?.[option.key] ?? true}
                        onChange={(event) =>
                          setDetailDraft((prev) => ({
                            ...prev,
                            reportAccess: {
                              ...prev.reportAccess,
                              analytics: {
                                ...prev.reportAccess?.analytics,
                                [option.key]: event.target.checked,
                              },
                            },
                          }))
                        }
                      />
                      <span className="text-foreground">{option.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Эти настройки ограничивают видимость блоков в разделе отчетов для выбранного менеджера.
                </p>
              </div>
            )}

            <div className="sticky bottom-0 z-10 -mx-6 -mb-4 mt-2 bg-[hsl(var(--border-solid))] px-6 py-2">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                  <button
                    onClick={handleOpenFire}
                    className="ios-button-secondary text-xs"
                    disabled={selectedEmployee.role === 'admin'}
                  >
                    <UserX className="h-4 w-4" /> Уволить
                  </button>
                </div>
                <button onClick={handleSaveDetail} className="ios-button-primary">
                  Сохранить изменения
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
      {/* DETAIL_MODAL_END */}

      <Modal
        isOpen={isActivityLogOpen}
        onClose={() => setIsActivityLogOpen(false)}
        title="Лента активности"
        size="lg"
      >
        {filteredActivityLog.length === 0 ? (
          <p className="text-sm text-muted-foreground">Активность отсутствует.</p>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto no-scrollbar pr-1">
            {filteredActivityLog.map((entry) => renderActivityEntry(entry))}
          </div>
        )}
      </Modal>

      {/* FIRE_MODAL_START */}
      <Modal
        isOpen={isFireOpen}
        onClose={() => setIsFireOpen(false)}
        title="Увольнение сотрудника"
        size="lg"
      >
        {selectedEmployee && (
          <div className="space-y-4">
            <div className="glass-card p-4 space-y-2">
              <p className="text-sm text-foreground">
                Закреплено за сотрудником: клиентов — {assignedClients.length}, задач — {assignedTasks.length}, сделок —
                {assignedOrders.length}.
              </p>
              <p className="text-xs text-muted-foreground">
                Выберите сотрудника для переназначения всех данных.
              </p>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Назначить на</label>
              <select
                className="ios-input"
                value={fireForm.reassignTo}
                onChange={(event) => setFireForm((prev) => ({ ...prev, reassignTo: event.target.value }))}
              >
                {assignableEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {getDisplayName(employee)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Дата увольнения</label>
              <input
                type="date"
                className="ios-input"
                value={fireForm.fireDate}
                onChange={(event) => setFireForm((prev) => ({ ...prev, fireDate: event.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Комментарий</label>
              <textarea
                className="ios-input min-h-[90px]"
                value={fireForm.comment}
                onChange={(event) => setFireForm((prev) => ({ ...prev, comment: event.target.value }))}
                placeholder="Комментарий по увольнению"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <button onClick={() => setIsFireOpen(false)} className="ios-button-secondary">
                Отмена
              </button>
              <button onClick={handleFireEmployee} className="ios-button-secondary text-destructive">
                Уволить
              </button>
            </div>
          </div>
        )}
      </Modal>
      {/* FIRE_MODAL_END */}
      {/* MODALS_END */}
    </AppLayout>
  );
}






