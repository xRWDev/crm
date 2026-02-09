import { useMemo, useState } from "react";

import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useCRMStore } from "@/store/crmStore";
import { type DirectoryKey, useDirectoryStore } from "@/store/directoryStore";
import { Plus, ShieldCheck, Trash2, Users } from "lucide-react";

type DirectoryGroup = {
  key: DirectoryKey;
  title: string;
  items: string[];
};

const GROUP_DEFS: Array<Pick<DirectoryGroup, "key" | "title">> = [
  { key: "activity", title: "Вид деятельности" },
  { key: "region", title: "Область" },
  { key: "city", title: "Город" },
  { key: "postal", title: "Служба почтовой доставки" },
  { key: "product", title: "Продукция" },
  { key: "sourceChannel", title: "Канал привлечения" },
  { key: "clientType", title: "Тип клиента" },
  { key: "tag", title: "Метки" },
  { key: "refusal", title: "Причина отказа" },
  { key: "orderStatus", title: "Статус заказа" },
];

const SECTIONS = [
  { key: "dashboard", label: "Рабочий стол" },
  { key: "tasks", label: "Задачи" },
  { key: "clients", label: "Клиенты" },
  { key: "orders", label: "Сделки" },
  { key: "documents", label: "Документы" },
  { key: "employees", label: "Сотрудники" },
  { key: "analytics", label: "Отчеты" },
  { key: "directory", label: "Справочник" },
];

export default function Directory() {
  const { employees } = useCRMStore();
  const { role } = useAuthStore();
  const isDirector = role === "director";

  const { directories, addDirectoryItem, removeDirectoryItem } = useDirectoryStore();

  const [newValues, setNewValues] = useState<Record<string, string>>({});
  const [access, setAccess] = useState<Record<string, Record<string, boolean>>>({});

  const managers = useMemo(
    () => employees.filter((employee) => employee.role === "manager"),
    [employees]
  );

  const groups = useMemo<DirectoryGroup[]>(
    () =>
      GROUP_DEFS.map((def) => ({
        ...def,
        items: directories[def.key] ?? [],
      })),
    [directories]
  );

  const handleAddItem = (key: DirectoryKey) => {
    const value = (newValues[key] || "").trim();
    if (!value) return;
    addDirectoryItem(key, value);
    setNewValues((prev) => ({ ...prev, [key]: "" }));
  };

  const handleRemoveItem = (key: DirectoryKey, value: string) => {
    removeDirectoryItem(key, value);
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
        <aside className="col-span-12 space-y-4 xl:col-span-4">
          <div className="glass-card space-y-3 p-4">
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
                      {SECTIONS.map((section) => (
                        <button
                          key={section.key}
                          onClick={() => toggleAccess(manager.id, section.key)}
                          className={cn(
                            "flex items-center gap-2 px-2 py-1 transition-all",
                            access[manager.id]?.[section.key]
                              ? "bg-primary/10 text-primary"
                              : "bg-background/60 hover:bg-muted"
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

        <section className="col-span-12 space-y-4 xl:col-span-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {groups.map((group) => (
              <div key={group.key} className="glass-card space-y-3 rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-foreground">{group.title}</h3>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <span
                      key={item}
                      className="inline-flex items-center gap-2 bg-muted/40 px-2 py-1 text-xs text-foreground"
                    >
                      {item}
                      {isDirector && (
                        <button
                          onClick={() => handleRemoveItem(group.key, item)}
                          className="text-muted-foreground"
                          aria-label="Удалить"
                          type="button"
                        >
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
                      value={newValues[group.key] || ""}
                      onChange={(event) =>
                        setNewValues((prev) => ({ ...prev, [group.key]: event.target.value }))
                      }
                    />
                    <button onClick={() => handleAddItem(group.key)} className="ios-button-primary text-xs" type="button">
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

