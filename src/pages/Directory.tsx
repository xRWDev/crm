import { useMemo, useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCRMStore } from '@/store/crmStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Users, ShieldCheck } from 'lucide-react';

type DirectoryGroup = {
  key: string;
  title: string;
  items: string[];
};

const initialGroups: DirectoryGroup[] = [
  { key: 'activity', title: 'Вид деятельности', items: ['Аптеки', 'Банки', 'Прачечные', 'Розница'] },
  { key: 'region', title: 'Область', items: ['Киевская', 'Львовская', 'Одесская'] },
  { key: 'city', title: 'Город', items: ['Киев', 'Львов', 'Одесса'] },
  { key: 'postal', title: 'Служба почтовой доставки', items: ['Новая Почта', 'Укрпочта', 'DHL'] },
  { key: 'product', title: 'Продукция', items: ['Канцелярия', 'Одежда', 'Игрушки'] },
  { key: 'clientType', title: 'Тип клиента', items: ['Клиент', 'Поставщик', 'Конкурент', 'Партнер'] },
  { key: 'tag', title: 'Метка', items: ['VIP', 'Важно', 'Просрочка'] },
  { key: 'refusal', title: 'Причина отказа', items: ['Дорого', 'Есть поставщик', 'Закрылись', 'Не используют'] },
  { key: 'orderStatus', title: 'Статус заказа', items: ['Новая', 'В работе', 'Завершена', 'Отменена'] },
];

const sections = [
  { key: 'dashboard', label: 'Рабочий стол' },
  { key: 'tasks', label: 'Задачи' },
  { key: 'clients', label: 'Клиенты' },
  { key: 'orders', label: 'Сделки' },
  { key: 'documents', label: 'Документы' },
  { key: 'employees', label: 'Сотрудники' },
  { key: 'analytics', label: 'Отчеты' },
  { key: 'directory', label: 'Справочник' },
];

export default function Directory() {
  const { employees } = useCRMStore();
  const { role } = useAuthStore();
  const isDirector = role === 'director';

  const [groups, setGroups] = useState<DirectoryGroup[]>(initialGroups);
  const [newValues, setNewValues] = useState<Record<string, string>>({});
  const [access, setAccess] = useState<Record<string, Record<string, boolean>>>({});

  const managers = useMemo(
    () => employees.filter((employee) => employee.role === 'manager'),
    [employees]
  );

  const handleAddItem = (key: string) => {
    const value = (newValues[key] || '').trim();
    if (!value) return;
    setGroups((prev) =>
      prev.map((group) =>
        group.key === key && !group.items.includes(value)
          ? { ...group, items: [...group.items, value] }
          : group
      )
    );
    setNewValues((prev) => ({ ...prev, [key]: '' }));
  };

  const handleRemoveItem = (key: string, value: string) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.key === key ? { ...group, items: group.items.filter((item) => item !== value) } : group
      )
    );
  };

  const toggleAccess = (employeeId: string, section: string) => {
    setAccess((prev) => ({
      ...prev,
      [employeeId]: {
        ...prev[employeeId],
        [section]: !prev[employeeId]?.[section],
      },
    }));
  };

  return (
    <AppLayout title="Справочник" subtitle="Списки, статусы и доступы">
      <div className="grid grid-cols-12 gap-6 animate-fade-up">
        <aside className="col-span-12 xl:col-span-4 space-y-4">
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold text-foreground">Доступы к разделам</h3>
            </div>
            {!isDirector && (
              <p className="text-xs text-muted-foreground">
                Управление доступами доступно только директору.
              </p>
            )}
            {isDirector && managers.length === 0 && (
              <p className="text-xs text-muted-foreground">Нет менеджеров для настройки доступа.</p>
            )}
            {isDirector && managers.length > 0 && (
              <div className="space-y-3">
                {managers.map((manager) => (
                  <div key={manager.id} className="rounded-xl bg-muted/30 p-3">
                    <div className="mb-2 text-sm font-medium text-foreground">{manager.name}</div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      {sections.map((section) => (
                        <button
                          key={section.key}
                          onClick={() => toggleAccess(manager.id, section.key)}
                          className={cn(
                            'flex items-center gap-2 px-2 py-1 transition-all',
                            access[manager.id]?.[section.key]
                              ? 'bg-primary/10 text-primary'
                              : 'bg-background/60 hover:bg-muted'
                          )}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {section.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className="col-span-12 xl:col-span-8 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {groups.map((group) => (
              <div key={group.key} className="glass-card rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-2 bg-muted/40 px-2 py-1 text-xs text-foreground"
                    >
                      {item}
                      {isDirector && (
                        <button onClick={() => handleRemoveItem(group.key, item)} className="text-muted-foreground">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </span>
                  ))}
                  {group.items.length === 0 && (
                    <span className="text-xs text-muted-foreground">Пока нет значений</span>
                  )}
                </div>
                {isDirector && (
                  <div className="flex items-center gap-2">
                    <input
                      className="ios-input text-xs"
                      placeholder="Добавить значение..."
                      value={newValues[group.key] || ''}
                      onChange={(event) => setNewValues((prev) => ({ ...prev, [group.key]: event.target.value }))}
                    />
                    <button onClick={() => handleAddItem(group.key)} className="ios-button-primary text-xs">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
