import { useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeDollarSign,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Filter,
  Flame,
  ListChecks,
  MessageSquare,
  Sparkles,
  User,
  X,
  type LucideIcon,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { Modal } from '@/components/ui/Modal';
import { useCRMStore, Task, TaskComment } from '@/store/crmStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

const priorityLabels: Record<Task['priority'], string> = {
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
};

const priorityStyles: Record<Task['priority'], string> = {
  high: 'bg-red-500/10 text-red-600 ring-1 ring-inset ring-red-500/20 dark:text-red-400',
  medium: 'bg-amber-500/10 text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400',
  low: 'bg-emerald-500/10 text-emerald-600 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-400',
};

const statusLabels = {
  open: 'Активная',
  in_progress: 'В работе',
  completed: 'Завершена',
  overdue: 'Просрочена',
};

const statusStyles: Record<keyof typeof statusLabels, string> = {
  open: 'bg-blue-500/10 text-blue-600 ring-1 ring-inset ring-blue-500/20 dark:text-blue-400',
  in_progress: 'bg-amber-500/10 text-amber-600 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400',
  completed: 'bg-green-500/10 text-green-600 ring-1 ring-inset ring-green-500/20 dark:text-green-400',
  overdue: 'bg-red-500/10 text-red-600 ring-1 ring-inset ring-red-500/20 dark:text-red-400',
};

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

const createTempId = () => Math.random().toString(36).slice(2, 10);

const getInitials = (name?: string) => {
  if (!name) return '—';
  const trimmed = name.trim();
  if (!trimmed) return '—';
  const parts = trimmed.split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const second = parts.length > 1 ? parts[1]?.[0] ?? '' : '';
  return (first + second || trimmed[0]).toUpperCase();
};

const getDisplayStatus = (task: Task): keyof typeof statusLabels => {
  if (task.status === 'completed') return 'completed';
  const due = toDate(task.dueDate);
  if (due && due.getTime() < Date.now()) return 'overdue';
  return task.status === 'in_progress' ? 'in_progress' : 'open';
};

export default function Tasks() {
  const { tasks, employees, addTask, updateTask, deleteTask } = useCRMStore();
  const { role } = useAuthStore();

  const isDirector = role === 'director';
  const adminId = useMemo(
    () => employees.find((emp) => emp.role === 'admin')?.id || employees[0]?.id || '1',
    [employees]
  );
  const managerId = useMemo(
    () => employees.find((emp) => emp.role === 'manager')?.id || employees[0]?.id || '2',
    [employees]
  );
  const currentUserId = isDirector ? adminId : managerId;

  const [leftFilter, setLeftFilter] = useState<'all' | 'mine' | 'active' | 'completed'>(
    isDirector ? 'all' : 'mine'
  );
  const [priorityFilter, setPriorityFilter] = useState<'all' | Task['priority']>('all');
  const [urgentOnly, setUrgentOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assigneeId: currentUserId,
    priority: 'medium' as Task['priority'],
    isUrgent: false,
    hasDeadline: true,
    dueDate: '',
  });

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [commentToDeleteId, setCommentToDeleteId] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [detailDraft, setDetailDraft] = useState({
    title: '',
    description: '',
    assigneeId: currentUserId,
    priority: 'medium' as Task['priority'],
    isUrgent: false,
    hasDeadline: true,
    dueDate: '',
    status: 'open' as Task['status'],
    rewardAmount: '' as string | number,
    penaltyAmount: '' as string | number,
  });
  const [newCommentText, setNewCommentText] = useState('');
  const [activeSidePanel, setActiveSidePanel] = useState<'summary' | 'info' | null>(null);
  const [showSummaryPeek, setShowSummaryPeek] = useState(false);
  const [infoDirty, setInfoDirty] = useState(false);
  const summaryTimerRef = useRef<ReturnType<typeof window.setTimeout> | null>(null);

  useEffect(() => {
    setLeftFilter(isDirector ? 'all' : 'mine');
  }, [isDirector]);

  const roleScopedTasks = useMemo(
    () => (isDirector ? tasks : tasks.filter((task) => task.assigneeId === currentUserId)),
    [tasks, isDirector, currentUserId]
  );

  const assignableEmployees = useMemo(
    () =>
      employees.filter((employee) =>
        isDirector ? employee.role === 'admin' || employee.role === 'manager' : employee.role === 'manager'
      ),
    [employees, isDirector]
  );

  const counts = useMemo(
    () => ({
      all: roleScopedTasks.length,
      mine: roleScopedTasks.filter((task) => task.assigneeId === currentUserId).length,
      active: roleScopedTasks.filter((task) => task.status !== 'completed').length,
      completed: roleScopedTasks.filter((task) => task.status === 'completed').length,
    }),
    [roleScopedTasks, currentUserId]
  );

  const filteredTasks = useMemo(() => {
    let list = [...roleScopedTasks];

    if (leftFilter === 'mine') {
      list = list.filter((task) => task.assigneeId === currentUserId);
    }
    if (leftFilter === 'active') {
      list = list.filter((task) => task.status !== 'completed');
    }
    if (leftFilter === 'completed') {
      list = list.filter((task) => task.status === 'completed');
    }

    if (priorityFilter !== 'all') {
      list = list.filter((task) => task.priority === priorityFilter);
    }

    if (urgentOnly) {
      list = list.filter((task) => task.isUrgent);
    }

    return list;
  }, [roleScopedTasks, leftFilter, currentUserId, priorityFilter, urgentOnly]);

  const sortedTasks = useMemo(() => {
    const priorityRank = { high: 3, medium: 2, low: 1 };
    return [...filteredTasks].sort((a, b) => {
      if (a.isUrgent !== b.isUrgent) return a.isUrgent ? -1 : 1;
      const priorityDiff = priorityRank[b.priority] - priorityRank[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      const aDue = toDate(a.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bDue = toDate(b.dueDate)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (aDue !== bDue) return aDue - bDue;
      return toDate(b.createdAt)?.getTime() - toDate(a.createdAt)?.getTime();
    });
  }, [filteredTasks]);

  const selectedTask = useMemo(
    () => (selectedTaskId ? tasks.find((task) => task.id === selectedTaskId) || null : null),
    [tasks, selectedTaskId]
  );
  const detailDueDate =
    detailDraft.hasDeadline && detailDraft.dueDate ? new Date(`${detailDraft.dueDate}T18:00:00`) : null;
  const detailStatus = selectedTask
    ? getDisplayStatus({
        ...selectedTask,
        status: detailDraft.status,
        dueDate: detailDueDate,
      } as Task)
    : 'open';

  useEffect(() => {
    if (!selectedTask) return;
    setDetailDraft({
      title: selectedTask.title,
      description: selectedTask.description,
      assigneeId: selectedTask.assigneeId,
      priority: selectedTask.priority,
      isUrgent: selectedTask.isUrgent ?? false,
      hasDeadline: Boolean(selectedTask.dueDate),
      dueDate: toInputDate(selectedTask.dueDate),
      status: selectedTask.status,
      rewardAmount: selectedTask.rewardAmount ?? '',
      penaltyAmount: selectedTask.penaltyAmount ?? '',
    });
    setNewCommentText('');
    setInfoDirty(false);
  }, [selectedTask?.id]);

  const clearSummaryTimer = () => {
    if (summaryTimerRef.current) {
      window.clearTimeout(summaryTimerRef.current);
      summaryTimerRef.current = null;
    }
  };

  const triggerSummaryPeek = () => {
    clearSummaryTimer();
    setShowSummaryPeek(true);
    summaryTimerRef.current = window.setTimeout(() => {
      setShowSummaryPeek(false);
    }, 3000);
  };

  useEffect(() => {
    if (isDetailOpen && selectedTask) {
      setActiveSidePanel(null);
      setInfoDirty(false);
      triggerSummaryPeek();
      return;
    }
    clearSummaryTimer();
    setShowSummaryPeek(false);
    setActiveSidePanel(null);
  }, [isDetailOpen, selectedTask?.id]);

  useEffect(() => {
    if (isCommentsOpen && !selectedTask) {
      setIsCommentsOpen(false);
    }
  }, [isCommentsOpen, selectedTask]);

  useEffect(() => {
    if (commentToDeleteId && !selectedTask) {
      setCommentToDeleteId(null);
    }
  }, [commentToDeleteId, selectedTask]);

  const handleOpenCreate = () => {
    setTaskForm({
      title: '',
      description: '',
      assigneeId: currentUserId,
      priority: 'medium',
      isUrgent: false,
      hasDeadline: true,
      dueDate: '',
    });
    setIsFormOpen(true);
  };

  const handleSaveTask = () => {
    if (!taskForm.title.trim()) {
      alert('Укажите название задачи.');
      return;
    }
    const dueDateValue = taskForm.hasDeadline && taskForm.dueDate
      ? new Date(`${taskForm.dueDate}T18:00:00`)
      : null;

    const payload: Omit<Task, 'id' | 'createdAt'> = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim(),
      assigneeId: taskForm.assigneeId || currentUserId,
      creatorId: currentUserId,
      status: 'open',
      priority: taskForm.priority,
      isUrgent: taskForm.isUrgent,
      dueDate: dueDateValue,
      comments: [],
      rewardAmount: undefined,
      penaltyAmount: undefined,
      completedAt: null,
    };

    const newId = addTask(payload);
    setIsFormOpen(false);
    setSelectedTaskId(newId);
    setIsDetailOpen(true);
  };

  const handleOpenDetail = (task: Task) => {
    setSelectedTaskId(task.id);
    setIsCommentsOpen(false);
    setIsDetailOpen(true);
  };

  const handleOpenComments = (task: Task) => {
    setSelectedTaskId(task.id);
    setNewCommentText('');
    setIsCommentsOpen(true);
  };

  const handleInfoFieldChange = <K extends keyof typeof detailDraft>(key: K, value: (typeof detailDraft)[K]) => {
    setDetailDraft((prev) => ({ ...prev, [key]: value }));
    setInfoDirty(true);
  };

  const openSidePanel = (panel: 'summary' | 'info') => {
    setActiveSidePanel((prev) => (prev === panel ? null : panel));
    setShowSummaryPeek(false);
  };

  const handleSaveDetail = () => {
    if (!selectedTask) return;
    const dueDateValue = detailDraft.hasDeadline && detailDraft.dueDate
      ? new Date(`${detailDraft.dueDate}T18:00:00`)
      : null;
    const completedAtValue =
      detailDraft.status === 'completed'
        ? selectedTask.completedAt || new Date()
        : null;

    updateTask(selectedTask.id, {
      title: detailDraft.title.trim() || selectedTask.title,
      description: detailDraft.description.trim(),
      assigneeId: detailDraft.assigneeId,
      priority: detailDraft.priority,
      isUrgent: detailDraft.isUrgent,
      dueDate: dueDateValue,
      status: detailDraft.status,
      rewardAmount: detailDraft.rewardAmount === '' ? undefined : Number(detailDraft.rewardAmount),
      penaltyAmount: detailDraft.penaltyAmount === '' ? undefined : Number(detailDraft.penaltyAmount),
      completedAt: completedAtValue,
    });
    setIsDetailOpen(false);
  };

  const handleCompleteTask = () => {
    if (!selectedTask) return;
    updateTask(selectedTask.id, {
      status: 'completed',
      completedAt: new Date(),
    });
  };

  const handleDeleteTask = (taskId: string) => {
    if (!confirm('Удалить задачу?')) return;
    deleteTask(taskId);
    if (selectedTaskId === taskId) {
      setIsDetailOpen(false);
      setSelectedTaskId(null);
    }
  };

  const handleAddComment = () => {
    if (!selectedTask || !newCommentText.trim()) return;
    const newComment: TaskComment = {
      id: createTempId(),
      text: newCommentText.trim(),
      createdAt: new Date(),
      authorId: currentUserId,
    };
    updateTask(selectedTask.id, {
      comments: [...(selectedTask.comments || []), newComment],
    });
    setNewCommentText('');
  };

  const handleDeleteComment = (commentId: string) => {
    setCommentToDeleteId(commentId);
  };

  const handleConfirmDeleteComment = () => {
    if (!selectedTask || !commentToDeleteId) return;
    updateTask(selectedTask.id, {
      comments: (selectedTask.comments || []).filter((comment) => comment.id !== commentToDeleteId),
    });
    setCommentToDeleteId(null);
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
          'filters-row w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-all',
          isActive && 'is-active'
        )}
      >
        <span className="flex items-center gap-2">
          <span className={cn('filters-row__dot h-1.5 w-1.5 rounded-full', isActive && 'is-active')} />
          {Icon && <Icon className="filters-row__icon h-4 w-4" />}
          <span>{label}</span>
        </span>
        <span className="filters-row__count inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-2 text-[11px] font-semibold">
          {count}
        </span>
      </button>
    );
  };

  return (
    <AppLayout title="Задачи" subtitle="Контроль задач и исполнителей">
      <div className={cn('clients-layout min-h-full', filtersOpen && 'is-open')}>
        <button
          type="button"
          className={cn('filters-toggle', filtersOpen && 'is-active')}
          onClick={() => setFiltersOpen((prev) => !prev)}
          aria-label="Открыть фильтры"
        >
          <Filter className="h-4 w-4" />
        </button>

        <aside className={cn('filters-drawer', filtersOpen && 'is-open')}>
          <div className="filters-drawer__header">
            <span className="text-sm font-semibold">Фильтры</span>
          </div>
          <div className="filters-drawer__content custom-scrollbar">
            <div className="glass-card rounded-[22px] p-4">
              <div className="mt-2 space-y-2">
                {isDirector &&
                  renderFilterButton('Все задачи', counts.all, leftFilter === 'all', () => setLeftFilter('all'), ListChecks)}
                {renderFilterButton('Мои задачи', counts.mine, leftFilter === 'mine', () => setLeftFilter('mine'), User)}
                {renderFilterButton('Активные', counts.active, leftFilter === 'active', () => setLeftFilter('active'), Clock3)}
                {renderFilterButton('Завершенные', counts.completed, leftFilter === 'completed', () => setLeftFilter('completed'), CheckCircle2)}
              </div>
            </div>
          </div>
        </aside>

        <section className="clients-main flex flex-col gap-4 min-h-0 min-w-0 animate-fade-up">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Всего задач: {filteredTasks.length}</p>
              <p className="text-xs text-muted-foreground">Активных: {counts.active}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(['all', 'high', 'medium', 'low'] as const).map((value) => {
                const isActive = priorityFilter === value;
                const label =
                  value === 'all' ? 'Все приоритеты' : priorityLabels[value as Task['priority']];
                const activeStyle =
                  value === 'all'
                    ? 'bg-primary/10 text-primary border-primary/30'
                    : `${priorityStyles[value as Task['priority']]} border-transparent shadow-sm`;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPriorityFilter(value)}
                    aria-pressed={isActive}
                    className={cn(
                      'rounded-none px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap',
                      isActive
                        ? activeStyle
                        : 'bg-muted/60 text-muted-foreground border-border hover:bg-muted'
                    )}
                  >
                    {label}
                  </button>
                );
              })}
              <button
                onClick={() => setUrgentOnly((prev) => !prev)}
                className={cn(
                  'ios-button-secondary text-xs',
                  urgentOnly && 'bg-orange-500/10 text-orange-600 border-orange-500/30'
                )}
              >
                <Flame className="h-4 w-4 fill-current" /> Срочные
              </button>
            </div>
          </div>

          <div className="glass-card rounded-[22px] p-4 overflow-hidden relative">
            <div className="h-[690px] max-h-[75vh] overflow-y-auto overflow-x-hidden custom-scrollbar">
              <table className="service-table clients-table min-w-full table-fixed text-sm">
                <thead className="sticky top-0 z-20">
                  <tr className="table-head-row">
                    <th className="table-head-cell table-head-cell--left w-[32%]">
                      <span className="table-head-text">Описание</span>
                    </th>
                    <th className="table-head-cell table-head-cell--left w-[12%]">
                      <span className="table-head-text">Дата создания</span>
                    </th>
                    <th className="table-head-cell table-head-cell--left w-[12%]">
                      <span className="table-head-text">Дедлайн</span>
                    </th>
                    <th className="table-head-cell table-head-cell--left w-[14%]">
                      <span className="table-head-text">Ответственный</span>
                    </th>
                    <th className="table-head-cell table-head-cell--left w-[10%]">
                      <span className="table-head-text">Статус</span>
                    </th>
                    <th className="table-head-cell w-[18%]">
                      <span className="table-head-text">Комментарии</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTasks.map((task) => {
                    const status = getDisplayStatus(task);
                    const assigneeName = employees.find((emp) => emp.id === task.assigneeId)?.name || '—';
                    return (
                    <tr
                      key={task.id}
                      onClick={() => handleOpenDetail(task)}
                      className="group cursor-pointer transition-colors"
                    >
                        <td className="table-cell-left px-4 py-3">
                          <div className="flex items-start gap-2 min-w-0">
                            {task.isUrgent && (
                              <Flame className="h-4 w-4 shrink-0 text-orange-500 fill-current" />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">{task.title}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {task.description || '—'}
                              </p>
                              <span className={cn('inline-flex mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium', priorityStyles[task.priority])}>
                                {priorityLabels[task.priority]}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="table-cell-left px-4 py-3 text-sm text-muted-foreground">{formatDate(task.createdAt)}</td>
                        <td className="table-cell-left px-4 py-3 text-sm text-muted-foreground">{task.dueDate ? formatDate(task.dueDate) : 'Без срока'}</td>
                        <td className="table-cell-left px-4 py-3 text-sm text-foreground truncate">{assigneeName}</td>
                        <td className="table-cell-left px-4 py-3">
                          <span className={cn('status-badge capitalize whitespace-nowrap', statusStyles[status])}>
                            {statusLabels[status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleOpenComments(task);
                            }}
                            className="inline-flex items-center justify-center gap-1 rounded-full border border-border bg-muted/60 px-2.5 py-1 text-xs font-medium text-foreground/80 shadow-sm transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <MessageSquare className="h-4 w-4" /> {task.comments?.length || 0}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {sortedTasks.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">Задачи не найдены</div>
            )}
          </div>
        </section>
      </div>

      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title="Поставить задачу"
        size="lg"
      >
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Название *</label>
            <input
              type="text"
              className="ios-input"
              value={taskForm.title}
              onChange={(event) => setTaskForm((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Введите название"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Суть задачи</label>
            <textarea
              className="ios-input min-h-[100px]"
              value={taskForm.description}
              onChange={(event) => setTaskForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Опишите задачу"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Дата завершения</label>
              <input
                type="date"
                className="ios-input"
                value={taskForm.dueDate}
                onChange={(event) => setTaskForm((prev) => ({ ...prev, dueDate: event.target.value }))}
                disabled={!taskForm.hasDeadline}
              />
              <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={!taskForm.hasDeadline}
                  onChange={(event) =>
                    setTaskForm((prev) => ({ ...prev, hasDeadline: !event.target.checked }))
                  }
                />
                Без срока
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Ответственный</label>
              <select
                className="ios-input"
                value={taskForm.assigneeId}
                onChange={(event) => setTaskForm((prev) => ({ ...prev, assigneeId: event.target.value }))}
              >
                {assignableEmployees.map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Приоритет</label>
              <div className="flex flex-wrap items-center gap-2">
                {(['high', 'medium', 'low'] as Task['priority'][]).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTaskForm((prev) => ({ ...prev, priority: value }))}
                    aria-pressed={taskForm.priority === value}
                    className={cn(
                      'rounded-none px-3 py-1.5 text-xs font-medium border transition-colors whitespace-nowrap',
                      taskForm.priority === value
                        ? `${priorityStyles[value]} border-transparent shadow-sm`
                        : 'bg-muted/60 text-muted-foreground border-border hover:bg-muted'
                    )}
                  >
                    {priorityLabels[value]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="block text-sm font-medium text-foreground">Срочно</label>
              <button
                onClick={() => setTaskForm((prev) => ({ ...prev, isUrgent: !prev.isUrgent }))}
                className={cn(
                  'rounded-none px-3 py-1.5 text-xs font-medium border transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap',
                  taskForm.isUrgent
                    ? 'bg-red-500/10 text-red-600 border-red-500/30 shadow-sm'
                    : 'bg-muted/60 text-muted-foreground border-border hover:bg-muted'
                )}
              >
                <Flame className="h-4 w-4 fill-current" /> Срочно
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button onClick={() => setIsFormOpen(false)} className="ios-button-secondary">
              Отмена
            </button>
            <button onClick={handleSaveTask} className="ios-button-primary">
              Создать
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isCommentsOpen}
        onClose={() => setIsCommentsOpen(false)}
        title={selectedTask ? `Комментарии: ${selectedTask.title}` : 'Комментарии'}
        size="lg"
      >
        {selectedTask && (
          <div className="space-y-3">
            <textarea
              className="ios-input min-h-[90px]"
              placeholder="Добавить комментарий"
              value={newCommentText}
              onChange={(event) => setNewCommentText(event.target.value)}
            />
            <div className="flex justify-end">
              <button onClick={handleAddComment} className="ios-button-primary text-xs">
                Добавить
              </button>
            </div>
            {(selectedTask.comments || []).length === 0 && (
              <p className="text-xs text-muted-foreground">Комментарии отсутствуют.</p>
            )}
            <div className="space-y-3 max-h-80 overflow-y-auto no-scrollbar pr-1 scroll-fade-vertical pt-2 pb-2">
              {(selectedTask.comments || [])
                .slice()
                .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0))
                .map((comment) => {
                  const author = employees.find((emp) => emp.id === comment.authorId);
                  const authorName = author?.name || 'Неизвестно';
                  return (
                    <div key={comment.id} className="rounded-xl bg-muted/50 p-3 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                            {getInitials(authorName)}
                          </span>
                          <span
                            className={cn(
                              'font-medium',
                              author?.role === 'admin'
                                ? 'text-white bg-foreground px-2 py-0.5 rounded-full'
                                : 'text-primary bg-primary/10 px-2 py-0.5 rounded-full'
                            )}
                          >
                            {authorName}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span>{formatDateTime(comment.createdAt)}</span>
                          {(isDirector || comment.authorId === currentUserId) && (
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(comment.id)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-500/15 text-red-600 hover:bg-red-500/25"
                              title="Удалить"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-foreground">{comment.text}</p>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title="Карточка задачи"
        size="xl"
        scrollable={false}
      >
        {selectedTask && (
          <div className="relative">
            <div className="task-side-rail">
              <div className={cn("task-side-dock", isDetailOpen && "is-visible")}>
                <button
                  type="button"
                  onMouseEnter={triggerSummaryPeek}
                  onClick={() => openSidePanel('summary')}
                  className="task-fab task-fab--summary"
                  aria-label="Суть задачи"
                >
                  <MessageSquare className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => openSidePanel('info')}
                  className="task-fab task-fab--info"
                  aria-label="Основная информация"
                >
                  <ListChecks className="h-5 w-5" />
                </button>
              </div>

              <div className={cn("task-side-peek", showSummaryPeek && activeSidePanel !== 'summary' && "is-visible")}>
                <p className="task-side-peek__title">Суть задачи</p>
                <p className="task-side-peek__text">
                  {detailDraft.description?.trim() || 'Описание пока не заполнено.'}
                </p>
              </div>

              <div
                className={cn("task-side-panel summary", activeSidePanel === 'summary' && "is-open")}
              >
                <div className="task-side-panel__header">
                  <span className="task-side-panel__icon bg-emerald-500/10 text-emerald-600">
                    <MessageSquare className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Суть задачи</p>
                    <p className="text-xs text-muted-foreground">Полный контекст задачи</p>
                  </div>
                </div>
                <textarea
                  className="ios-input min-h-[160px]"
                  value={detailDraft.description}
                  onChange={(event) => setDetailDraft((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="Подробности по задаче"
                />
              </div>

              <div
                className={cn("task-side-panel info", activeSidePanel === 'info' && "is-open")}
              >
                <div className="task-side-panel__header">
                  <span className="task-side-panel__icon bg-sky-500/10 text-sky-600">
                    <ListChecks className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Основная информация</p>
                    <p className="text-xs text-muted-foreground">Редактирование данных</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <ListChecks className="h-3.5 w-3.5 text-sky-500" />
                      Название
                    </label>
                    <input
                      className="ios-input"
                      value={detailDraft.title}
                      onChange={(event) => handleInfoFieldChange('title', event.target.value)}
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                      <User className="h-3.5 w-3.5 text-sky-500" />
                      Ответственный
                    </label>
                    <select
                      className="ios-input"
                      value={detailDraft.assigneeId}
                      onChange={(event) => handleInfoFieldChange('assigneeId', event.target.value)}
                    >
                      {assignableEmployees.map((employee) => (
                        <option key={employee.id} value={employee.id}>
                          {employee.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <CalendarClock className="h-3.5 w-3.5 text-sky-500" />
                        Дедлайн
                      </label>
                      <input
                        type="date"
                        className="ios-input"
                        value={detailDraft.dueDate}
                        onChange={(event) => handleInfoFieldChange('dueDate', event.target.value)}
                        disabled={!detailDraft.hasDeadline}
                      />
                      <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={!detailDraft.hasDeadline}
                          onChange={(event) => handleInfoFieldChange('hasDeadline', !event.target.checked)}
                        />
                        Без срока
                      </label>
                    </div>
                    <div>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Sparkles className="h-3.5 w-3.5 text-sky-500" />
                        Приоритет
                      </label>
                      <select
                        className="ios-input"
                        value={detailDraft.priority}
                        onChange={(event) =>
                          handleInfoFieldChange('priority', event.target.value as Task['priority'])
                        }
                      >
                        {Object.entries(priorityLabels).map(([key, label]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleInfoFieldChange('isUrgent', !detailDraft.isUrgent)}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-semibold border transition-all inline-flex items-center justify-center gap-2 whitespace-nowrap shadow-sm hover:-translate-y-0.5',
                        detailDraft.isUrgent
                          ? 'bg-red-500/10 text-red-600 border-red-500/30 shadow-sm'
                          : 'bg-muted/60 text-muted-foreground border-border hover:bg-muted'
                      )}
                    >
                      <Flame className="h-4 w-4 fill-current" /> Срочно
                    </button>
                    {(['open', 'in_progress', 'completed'] as Task['status'][]).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleInfoFieldChange('status', value)}
                        aria-pressed={detailDraft.status === value}
                        className={cn(
                          'rounded-full px-3 py-1.5 text-xs font-semibold border transition-all text-center whitespace-nowrap shadow-sm hover:-translate-y-0.5',
                          detailDraft.status === value
                            ? `${statusStyles[value]} border-transparent shadow-sm`
                            : 'bg-muted/60 text-muted-foreground border-border hover:bg-muted'
                        )}
                      >
                        {statusLabels[value]}
                      </button>
                    ))}
                  </div>
                  {infoDirty && (
                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        className="ios-button-primary text-xs"
                        onClick={() => {
                          setInfoDirty(false);
                          setActiveSidePanel(null);
                        }}
                      >
                        Ок
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="space-y-6 pb-2 max-h-[70vh] overflow-y-auto overflow-x-visible no-scrollbar pr-2">
              <div className="glass-panel rounded-2xl p-4 sm:p-5 flex flex-wrap items-start justify-between gap-4 animate-fade-up">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
                    <ListChecks className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-foreground">{selectedTask.title}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        Создана {formatDateTime(selectedTask.createdAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <CalendarClock className="h-3.5 w-3.5" />
                        Дедлайн {selectedTask.dueDate ? formatDateTime(selectedTask.dueDate) : 'Без срока'}
                      </span>
                      {selectedTask.completedAt && (
                        <span className="inline-flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Завершена {formatDateTime(selectedTask.completedAt)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {detailDraft.isUrgent && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-600 ring-1 ring-inset ring-orange-500/20">
                      <Flame className="h-4 w-4 fill-current" /> Срочно
                    </span>
                  )}
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold shadow-sm', statusStyles[detailStatus])}>
                    {statusLabels[detailStatus]}
                  </span>
                  <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold shadow-sm', priorityStyles[detailDraft.priority])}>
                    <Sparkles className="h-3.5 w-3.5" />
                    {priorityLabels[detailDraft.priority]}
                  </span>
                </div>
              </div>

              {isDirector && (
                <div className="glass-card rounded-2xl p-4 space-y-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                  <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                      <BadgeDollarSign className="h-4 w-4" />
                    </span>
                    Награда / штраф
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Награда</label>
                      <input
                        type="number"
                        className="ios-input"
                        value={detailDraft.rewardAmount}
                        onChange={(event) => setDetailDraft((prev) => ({ ...prev, rewardAmount: event.target.value }))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Штраф</label>
                      <input
                        type="number"
                        className="ios-input"
                        value={detailDraft.penaltyAmount}
                        onChange={(event) => setDetailDraft((prev) => ({ ...prev, penaltyAmount: event.target.value }))}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="glass-card rounded-2xl p-4 space-y-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg">
                <h4 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600">
                    <MessageSquare className="h-4 w-4" />
                  </span>
                  Комментарии
                </h4>
                <textarea
                  className="ios-input min-h-[90px]"
                  placeholder="Добавить комментарий"
                  value={newCommentText}
                  onChange={(event) => setNewCommentText(event.target.value)}
                />
                <div className="flex justify-end">
                  <button onClick={handleAddComment} className="ios-button-primary text-xs">
                    Добавить
                  </button>
                </div>
                {(selectedTask.comments || []).length === 0 && (
                  <p className="text-xs text-muted-foreground">Комментарии отсутствуют.</p>
                )}
                <div className="space-y-3 max-h-80 overflow-y-auto no-scrollbar pr-1 scroll-fade-vertical pt-2 pb-2">
                  {(selectedTask.comments || [])
                    .slice()
                    .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0))
                    .map((comment) => {
                      const author = employees.find((emp) => emp.id === comment.authorId);
                      const authorName = author?.name || 'Неизвестно';
                      return (
                      <div key={comment.id} className="rounded-2xl border border-border/60 bg-white/70 p-3 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                              {getInitials(authorName)}
                            </span>
                            <span
                              className={cn(
                                'font-medium',
                                author?.role === 'admin'
                                  ? 'text-white bg-foreground px-2 py-0.5 rounded-full'
                                  : 'text-primary bg-primary/10 px-2 py-0.5 rounded-full'
                              )}
                            >
                              {authorName}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span>{formatDateTime(comment.createdAt)}</span>
                            {(isDirector || comment.authorId === currentUserId) && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(comment.id)}
                                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-500/15 text-red-600 hover:bg-red-500/25"
                                title="Удалить"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-foreground">{comment.text}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="sticky bottom-0 z-10 -mx-6 -mb-4 mt-2 bg-white/70 backdrop-blur-md border-t border-white/60 px-6 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-2">
                    <button onClick={() => handleDeleteTask(selectedTask.id)} className="ios-button-secondary text-xs">
                      Удалить
                    </button>
                    <button onClick={handleCompleteTask} className="ios-button-secondary text-xs">
                      Завершить
                    </button>
                  </div>
                  <button onClick={handleSaveDetail} className="ios-button-primary">
                    Сохранить изменения
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {commentToDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setCommentToDeleteId(null)}
          />
          <div className="relative w-[min(90vw,360px)] glass-card rounded-2xl p-6">
            <h3 className="text-base font-semibold text-foreground">Удалить комментарий?</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Это действие нельзя отменить.
            </p>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setCommentToDeleteId(null)} className="ios-button-secondary text-xs">
                Отмена
              </button>
              <button
                onClick={handleConfirmDeleteComment}
                className="ios-button-secondary text-xs text-destructive border border-destructive/30 bg-destructive/10 hover:bg-destructive/15"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      <FloatingActionButton
        onClick={handleOpenCreate}
        offsetX={96}
        offsetY={72}
        ariaLabel="Поставить задачу"
      />
    </AppLayout>
  );
}



