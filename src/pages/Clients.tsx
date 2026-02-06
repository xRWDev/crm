
import { type ReactNode, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  ChevronRight,
  Copy,
  FileSpreadsheet,
  Filter,
  Globe,
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  PhoneCall,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  Users,
  X,
} from "lucide-react";
import { format, isAfter, isBefore, isSameDay, parseISO } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";

import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { useCRMStore, Client, ClientContact, Employee } from "@/store/crmStore";
import { useAuthStore } from "@/store/authStore";

const CLIENT_TYPES = ["client", "supplier", "competitor", "partner"] as const;
type ClientType = (typeof CLIENT_TYPES)[number];

const COMMUNICATION_STATUS = ["none", "refused", "in_progress", "success"] as const;
type CommunicationStatus = (typeof COMMUNICATION_STATUS)[number];

type ClientRecord = {
  id: string;
  name: string;
  company?: string;
  phone?: string;
  email?: string;
  website?: string;
  region?: string;
  city?: string;
  activityType?: string;
  productCategory?: string;
  clientType?: ClientType;
  status?: CommunicationStatus;
  sourceChannel?: string;
  lastCommunicationAt?: Date | null;
  nextCommunicationAt?: Date | null;
  lastComment?: string;
  responsibleId?: string;
  responsibleName?: string;
  ownerId?: string;
  ownerName?: string;
  starred?: boolean;
  contacts?: ClientContact[];
  comments?: { id: string; text: string; createdAt: Date; authorId?: string; authorName?: string }[];
  communications?: {
    id: string;
    scheduledAt: Date;
    note?: string;
    closedAt?: Date | null;
    result?: "success" | "failed";
    reason?: string;
  }[];
  deals?: {
    id: string;
    createdAt: Date;
    title: string;
    unit: string;
    qty: number;
    price: number;
    amount: number;
    comment?: string;
    declarationNumber?: string;
  }[];
};

type ClientFilterKey =
  | "all"
  | "mine"
  | "favorites"
  | "today"
  | "overdue"
  | "planned"
  | "none"
  | "refused"
  | "in_progress"
  | "success";

const clientTypeLabel: Record<ClientType, string> = {
  client: "Клиент",
  supplier: "Поставщик",
  competitor: "Конкурент",
  partner: "Партнер",
};

const clientTypeTone: Record<ClientType, string> = {
  client: "bg-emerald-100/70 text-emerald-700",
  supplier: "bg-amber-100/70 text-amber-700",
  competitor: "bg-rose-100/70 text-rose-700",
  partner: "bg-sky-100/70 text-sky-700",
};

const columnsOrderDefault = [
  "starred",
  "name",
  "contacts",
  "phone",
  "city",
  "email",
  "website",
  "clientType",
  "lastCommunicationAt",
  "lastComment",
  "activityType",
  "productCategory",
  "responsibleName",
] as const;

type ColumnKey = (typeof columnsOrderDefault)[number];

const columnLabels: Record<ColumnKey, string> = {
  starred: "Избр.",
  name: "Название",
  contacts: "Контакты",
  phone: "Телефон",
  city: "Город",
  email: "Почта",
  website: "Сайт",
  clientType: "Тип клиента",
  lastCommunicationAt: "Последняя коммуникация",
  lastComment: "Комментарий",
  activityType: "Вид деятельности",
  productCategory: "Продукция",
  responsibleName: "Ответственный",
};

const SAMPLE_DEALS: NonNullable<ClientRecord["deals"]> = [
  {
    id: "deal-demo-1",
    createdAt: new Date("2026-01-21T09:30:00"),
    title: "Пакет Банан 4x6 (ПВД)",
    unit: "шт.",
    qty: 1200,
    price: 0.9,
    amount: 1080,
    declarationNumber: "06532/22/01/000122",
    comment: "Звонок по продлению договора.",
  },
  {
    id: "deal-demo-2",
    createdAt: new Date("2026-01-22T11:10:00"),
    title: "Пакет Банан 4x6 (ПВД) 50 мкм",
    unit: "кг",
    qty: 100,
    price: 0.32,
    amount: 32,
    declarationNumber: "06532/22/01/000123",
    comment: "Ожидаем подтверждение объема.",
  },
  {
    id: "deal-demo-3",
    createdAt: new Date("2026-01-23T15:45:00"),
    title: "Пакет Банан 4x6 (ПВД) усиленный",
    unit: "м",
    qty: 5000,
    price: 0.19,
    amount: 950,
    declarationNumber: "06532/22/01/000124",
    comment: "Нужен финальный расчет по логистике.",
  },
];

const SOURCE_CHANNELS = ["Сайт", "Рекомендация", "Выставка", "Холодный звонок", "Партнер"] as const;
const MOCK_ACTIVITIES = ["Аптеки", "Банки", "Прачечная", "HoReCa", "Строительство", "Ритейл"];
const MOCK_PRODUCTS = ["Канцелярия", "Одежда", "Игрушки", "Медтовары", "Техника"];
const MOCK_REGIONS = ["Киевская", "Львовская", "Одесская", "Харьковская", "Днепр"];
const MOCK_CITIES = ["Киев", "Львов", "Одесса", "Харьков", "Днепр"];
const CONTACT_FIRST_NAMES = [
  "Ольга",
  "Ирина",
  "Анна",
  "Марина",
  "Наталья",
  "Тарас",
  "Олег",
  "Дмитрий",
  "Андрей",
  "Сергей",
];
const CONTACT_LAST_NAMES = [
  "Иванова",
  "Коваленко",
  "Петренко",
  "Шевченко",
  "Мельник",
  "Бондаренко",
  "Козак",
  "Гриценко",
  "Савченко",
  "Полещук",
];
const CONTACT_POSITIONS = [
  "Закупки",
  "Бухгалтер",
  "Операционный менеджер",
  "Директор",
  "Коммерческий директор",
  "Менеджер по закупкам",
  "Логистика",
  "Финансовый менеджер",
  "Секретарь",
  "Администратор",
];

const randomFrom = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const randomBool = (chance = 0.5) => Math.random() < chance;
const randomPhone = () =>
  `+380 ${Math.floor(50 + Math.random() * 49)} ${Math.floor(100 + Math.random() * 900)} ${Math.floor(
    10 + Math.random() * 90
  )} ${Math.floor(10 + Math.random() * 90)}`;

const buildMockContacts = (count: number): ClientContact[] =>
  Array.from({ length: count }, (_, index) => {
    const first = randomFrom(CONTACT_FIRST_NAMES);
    const last = randomFrom(CONTACT_LAST_NAMES);
    const name = `${first} ${last}`;
    return {
      id: `mock-contact-${Date.now()}-${index}`,
      name,
      position: randomFrom(CONTACT_POSITIONS),
      phones: [randomPhone()],
      emails: [`contact${index + 1}@example.com`],
    };
  });

const toDate = (value?: Date | string | null) =>
  value ? (value instanceof Date ? value : parseISO(String(value))) : null;

const formatDate = (value?: Date | string | null) => {
  const date = toDate(value);
  return date ? format(date, "dd.MM.yyyy") : "—";
};

const formatDateTime = (value?: Date | string | null) => {
  const date = toDate(value);
  return date ? format(date, "dd.MM.yyyy, HH:mm") : "—";
};

const formatAmount = (value?: number | null) => {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value);
};

const getInitials = (value?: string) => {
  if (!value) return "—";
  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
};

const useLocalStorageState = <T,>(key: string, initial: T) => {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [key, state]);

  return [state, setState] as const;
};

const buildMockClients = (count: number, employees: { id: string; name: string }[]): ClientRecord[] => {
  const result: ClientRecord[] = [];
  for (let i = 0; i < count; i += 1) {
    const clientType = randomFrom(CLIENT_TYPES);
    const region = randomFrom(MOCK_REGIONS);
    const city = randomFrom(MOCK_CITIES);
    const activityType = randomFrom(MOCK_ACTIVITIES);
    const productCategory = randomFrom(MOCK_PRODUCTS);
    const responsible = randomFrom(employees);
    const lastCommunicationAt = randomBool(0.7)
      ? new Date(Date.now() - Math.floor(Math.random() * 12) * 86400000)
      : null;
    const nextCommunicationAt = randomBool(0.5)
      ? new Date(Date.now() + Math.floor(Math.random() * 10) * 86400000)
      : null;
    const sourceChannel = randomFrom([...SOURCE_CHANNELS]);
    const contactCount = 3 + Math.floor(Math.random() * 2);
    const contacts = buildMockContacts(contactCount);

    result.push({
      id: `mock-${i}`,
      name: `Компания ${i + 1}`,
      company: randomBool(0.4) ? `Подразделение ${i + 1}` : undefined,
      phone: randomPhone(),
      email: `client${i + 1}@mail.com`,
      website: `client${i + 1}.com`,
      region,
      city,
      activityType,
      productCategory,
      clientType,
      status: randomFrom(COMMUNICATION_STATUS),
      sourceChannel,
      lastCommunicationAt,
      nextCommunicationAt,
      lastComment: randomBool(0.4) ? "Запросили презентацию." : "—",
      responsibleId: responsible?.id,
      responsibleName: responsible?.name,
      ownerId: responsible?.id,
      ownerName: responsible?.name,
      starred: randomBool(0.25),
      contacts,
    });
  }
  return result;
};

const getLastCommentText = (client: Client) => {
  if (!client.comments || client.comments.length === 0) return "—";
  const sorted = [...client.comments].sort(
    (a, b) => toDate(b.createdAt)?.getTime()! - toDate(a.createdAt)?.getTime()!
  );
  return sorted[0]?.text || "—";
};

const mapClientFromStore = (
  client: Client,
  employees: { id: string; name: string }[]
): ClientRecord => {
  const responsibleName =
    employees.find((emp) => emp.id === (client.responsibleId || client.managerId))?.name || "—";
  return {
    id: client.id,
    name: client.name,
    company: client.company,
    phone: client.phone,
    email: client.email,
    website: client.website,
    region: client.region,
    city: client.city,
    activityType: client.activityType,
    productCategory: client.productCategory,
    clientType: client.clientType,
    status: client.communicationStatus,
    sourceChannel: client.sourceChannel,
    lastCommunicationAt: client.lastCommunicationAt ?? null,
    nextCommunicationAt: client.nextContactAt ?? null,
    lastComment: getLastCommentText(client),
    responsibleId: client.responsibleId,
    responsibleName,
    ownerId: client.managerId,
    ownerName: employees.find((emp) => emp.id === client.managerId)?.name || "—",
    starred: client.isFavorite ?? false,
    contacts: client.contacts,
    comments: client.comments,
  };
};

const filterByCommunication = (client: ClientRecord, filter: ClientFilterKey) => {
  const now = new Date();
  const next = client.nextCommunicationAt;
  if (filter === "today") return next ? isSameDay(next, now) : false;
  if (filter === "overdue") return next ? isBefore(next, now) : false;
  if (filter === "planned") return next ? isAfter(next, now) : false;
  if (filter === "none") return !next;
  if (filter === "refused") return client.status === "refused";
  if (filter === "in_progress") return client.status === "in_progress";
  if (filter === "success") return client.status === "success";
  return true;
};

const exportClientsToExcel = (clients: ClientRecord[]) => {
  const rows = clients.map((client) => ({
    "Название": client.name,
    "Контакты": (client.contacts ?? [])
      .map((contact) => {
        const parts = [contact.name];
        if (contact.position) parts.push(`(${contact.position})`);
        if (contact.phones?.length) parts.push(contact.phones.join(", "));
        return parts.filter(Boolean).join(" ");
      })
      .join("; "),
    "Телефон": client.phone ?? "",
    "Город": client.city ?? "",
    "Почта": client.email ?? "",
    "Сайт": client.website ?? "",
    "Тип клиента": client.clientType ? clientTypeLabel[client.clientType] : "",
    "Последняя коммуникация": formatDate(client.lastCommunicationAt),
    "Комментарий": client.lastComment ?? "",
    "Вид деятельности": client.activityType ?? "",
    "Продукция": client.productCategory ?? "",
    "Ответственный": client.responsibleName ?? "",
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Clients");
  XLSX.writeFile(workbook, "clients.xlsx");
};
const ClientsPage = () => {
  const { clients: storeClients, employees, addClient, updateClient } = useCRMStore();
  const { role } = useAuthStore();
  const isDirector = role === "director";

  const employeesList = useMemo(
    () => employees.map((emp) => ({ id: emp.id, name: emp.name })),
    [employees]
  );

  const [mockClients, setMockClients] = useState<ClientRecord[]>([]);
  useEffect(() => {
    setMockClients(buildMockClients(240, employeesList));
  }, [employeesList]);

  const allClients = useMemo(() => {
    const mapped = storeClients.map((client) => mapClientFromStore(client, employeesList));
    return [...mapped, ...mockClients];
  }, [storeClients, employeesList, mockClients]);

  const [baseFilter, setBaseFilter] = useState<"all" | "mine" | "favorites">(
    isDirector ? "all" : "mine"
  );
  const [communicationFilter, setCommunicationFilter] = useState<ClientFilterKey>("all");
  const [typeFilter, setTypeFilter] = useState<ClientType | "all">("all");
  const [activityFilter, setActivityFilter] = useState<string | "all">("all");
  const [productFilter, setProductFilter] = useState<string | "all">("all");
  const [regionFilter, setRegionFilter] = useState<string | "all">("all");
  const [cityFilter, setCityFilter] = useState<string | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedContactId, setExpandedContactId] = useState<string | null>(null);

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [detailTab, setDetailTab] = useState<"deals" | "communications">("deals");
  const suppressOpenRef = useRef(false);
  const suppressTimerRef = useRef<number | null>(null);
  const clearSelectionTimerRef = useRef<number | null>(null);
  const suppressPointerCleanupRef = useRef<(() => void) | null>(null);

  const [columnOrder, setColumnOrder] = useLocalStorageState<ColumnKey[]>(
    "crm.clients.columns.order",
    [...columnsOrderDefault]
  );
  const [columnVisibility, setColumnVisibility] = useLocalStorageState<Record<ColumnKey, boolean>>(
    "crm.clients.columns.visibility",
    {
      starred: true,
      name: true,
      contacts: true,
      phone: true,
      city: true,
      email: true,
      website: true,
      clientType: true,
      lastCommunicationAt: true,
      lastComment: true,
      activityType: true,
      productCategory: true,
      responsibleName: true,
    }
  );

  useEffect(() => {
    setColumnOrder((prev) => {
      const filtered = prev.filter((key) => columnsOrderDefault.includes(key));
      const missing = columnsOrderDefault.filter((key) => !filtered.includes(key));
      const next = [...filtered, ...missing];
      return next.length ? next : [...columnsOrderDefault];
    });
    setColumnVisibility((prev) => {
      const next = { ...prev } as Record<ColumnKey, boolean>;
      columnsOrderDefault.forEach((key) => {
        if (typeof next[key] === "undefined") next[key] = true;
      });
      Object.keys(next).forEach((key) => {
        if (!columnsOrderDefault.includes(key as ColumnKey)) {
          delete (next as Record<string, boolean>)[key];
        }
      });
      return next;
    });
  }, [setColumnOrder, setColumnVisibility]);


  useEffect(() => {
    setBaseFilter(isDirector ? "all" : "mine");
  }, [isDirector]);

  const adminId = useMemo(
    () => employees.find((emp) => emp.role === "admin")?.id || employees[0]?.id || "1",
    [employees]
  );
  const managerId = useMemo(
    () => employees.find((emp) => emp.role === "manager")?.id || employees[0]?.id || "2",
    [employees]
  );
  const currentUserId = isDirector ? adminId : managerId;
  const currentUserName =
    employees.find((emp) => emp.id === currentUserId)?.name || "Менеджер";

  const updateMockClient = (id: string, data: Partial<ClientRecord>) => {
    setMockClients((prev) => prev.map((client) => (client.id === id ? { ...client, ...data } : client)));
  };

  const filteredClients = useMemo(() => {
    return allClients.filter((client) => {
      if (baseFilter === "favorites" && !client.starred) return false;
      if (baseFilter === "mine" && client.ownerId !== currentUserId) return false;
      if (communicationFilter !== "all" && !filterByCommunication(client, communicationFilter)) return false;
      if (typeFilter !== "all" && client.clientType !== typeFilter) return false;
      if (activityFilter !== "all" && client.activityType !== activityFilter) return false;
      if (productFilter !== "all" && client.productCategory !== productFilter) return false;
      if (regionFilter !== "all" && client.region !== regionFilter) return false;
      if (cityFilter !== "all" && client.city !== cityFilter) return false;

      if (!searchQuery.trim()) return true;
      const search = searchQuery.toLowerCase();
      const haystack = [
        client.name,
        client.company,
        client.phone,
        client.email,
        client.website,
        client.city,
        client.region,
        client.activityType,
        client.productCategory,
        client.lastComment,
        client.responsibleName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(search);
    });
  }, [
    allClients,
    baseFilter,
    communicationFilter,
    typeFilter,
    activityFilter,
    productFilter,
    regionFilter,
    cityFilter,
    searchQuery,
    employeesList,
    currentUserId,
  ]);

  const PAGE_SIZE = 50;
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    setVisibleCount(Math.min(PAGE_SIZE, filteredClients.length));
  }, [filteredClients]);

  const visibleClients = useMemo(
    () => filteredClients.slice(0, visibleCount),
    [filteredClients, visibleCount]
  );

  const counts = useMemo(() => {
    return {
      all: allClients.length,
      mine: allClients.filter((client) => client.ownerId === currentUserId).length,
      favorites: allClients.filter((client) => client.starred).length,
      today: allClients.filter((client) => filterByCommunication(client, "today")).length,
      overdue: allClients.filter((client) => filterByCommunication(client, "overdue")).length,
      planned: allClients.filter((client) => filterByCommunication(client, "planned")).length,
      none: allClients.filter((client) => filterByCommunication(client, "none")).length,
      refused: allClients.filter((client) => filterByCommunication(client, "refused")).length,
      in_progress: allClients.filter((client) => filterByCommunication(client, "in_progress")).length,
      success: allClients.filter((client) => filterByCommunication(client, "success")).length,
    };
  }, [allClients, employeesList, currentUserId]);

  const activityOptions = useMemo(
    () => Array.from(new Set(allClients.map((client) => client.activityType).filter(Boolean))) as string[],
    [allClients]
  );

  const productOptions = useMemo(
    () => Array.from(new Set(allClients.map((client) => client.productCategory).filter(Boolean))) as string[],
    [allClients]
  );

  const regionOptions = useMemo(
    () => Array.from(new Set(allClients.map((client) => client.region).filter(Boolean))) as string[],
    [allClients]
  );

  const cityOptions = useMemo(
    () => Array.from(new Set(allClients.map((client) => client.city).filter(Boolean))) as string[],
    [allClients]
  );
  const columns = useMemo<ColumnDef<ClientRecord>[]>(() => {
    const cols: ColumnDef<ClientRecord>[] = [
      {
        id: "starred",
        header: () => <span className="text-xs uppercase tracking-[0.18em]">Избр.</span>,
        cell: ({ row }) => {
          const client = row.original;
          return (
            <button
              aria-label={client.starred ? "Убрать из избранного" : "В избранное"}
              className="h-8 w-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/60"
              onClick={(event) => {
                event.stopPropagation();
                if (client.id.startsWith("mock-")) {
                  updateMockClient(client.id, { starred: !client.starred });
                } else {
                  updateClient(client.id, { isFavorite: !client.starred });
                }
              }}
            >
              <Star
                className={cn(
                  "h-4 w-4",
                  client.starred ? "text-amber-500 fill-amber-500" : "text-muted-foreground"
                )}
              />
            </button>
          );
        },
        size: 60,
      },
      {
        id: "name",
        accessorKey: "name",
        header: () => <span className="text-xs uppercase tracking-[0.18em]">Название</span>,
        cell: ({ row }) => {
          const client = row.original;
          return (
            <button
              type="button"
              className="min-w-[180px] text-center"
              onClick={(event) => {
                event.stopPropagation();
                const selection = window.getSelection?.();
                if (selection && selection.toString()) return;
                handleOpenClient(client);
              }}
            >
              <div className="flex flex-col items-center gap-1">
                <div className="text-sm font-semibold text-foreground text-center">{client.name}</div>
                {client.clientType && (
                  <span
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold",
                      clientTypeTone[client.clientType]
                    )}
                  >
                    {clientTypeLabel[client.clientType]}
                  </span>
                )}
              </div>
            </button>
          );
        },
      },
      {
        id: "contacts",
        header: () => <span className="text-xs uppercase tracking-[0.18em]">Контакты</span>,
        cell: ({ row }) => {
          const clientId = row.original.id;
          return (
            <ContactsCell
              contacts={row.original.contacts ?? []}
              isOpen={expandedContactId === clientId}
              onOpen={() => setExpandedContactId(clientId)}
              onClose={() => setExpandedContactId(null)}
            />
          );
        },
      },
      {
        id: "phone",
        accessorKey: "phone",
        header: () => <span className="text-xs uppercase tracking-[0.18em]">Телефон</span>,
        cell: ({ getValue }) => (
          <div className="text-sm text-foreground whitespace-nowrap">{getValue<string>() ?? "—"}</div>
        ),
      },
      {
        id: "city",
        accessorKey: "city",
        header: () => <span className="text-xs uppercase tracking-[0.18em]">Город</span>,
        cell: ({ getValue }) => (
          <div className="text-sm text-foreground">{getValue<string>() ?? "—"}</div>
        ),
      },
      {
        id: "email",
        accessorKey: "email",
        header: () => <span className="text-xs uppercase tracking-[0.18em]">Почта</span>,
        cell: ({ row }) => (
          <button
            aria-label="Скопировать email"
            className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-white/60"
            onClick={(event) => {
              event.stopPropagation();
              const email = row.original.email || "";
              if (!email) return;
              navigator.clipboard.writeText(email);
              toast({ title: "Email скопирован", description: email });
            }}
          >
            <Mail className="h-4 w-4" />
          </button>
        ),
        size: 70,
      },
      {
        id: "website",
        accessorKey: "website",
        header: () => <span className="text-xs uppercase tracking-[0.18em]">Сайт</span>,
        cell: ({ row }) => (
          <button
            aria-label="Открыть сайт"
            className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-white/60"
            onClick={(event) => {
              event.stopPropagation();
              const url = row.original.website;
              if (!url) return;
              window.open(url.startsWith("http") ? url : `https://${url}`, "_blank");
            }}
          >
            <Globe className="h-4 w-4" />
          </button>
        ),
        size: 70,
      },
      {
        id: "clientType",
        accessorKey: "clientType",
        header: () => <span className="text-xs uppercase tracking-[0.18em]">Тип клиента</span>,
        cell: ({ getValue }) => {
          const value = getValue<ClientType | undefined>();
          return value ? (
            <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold", clientTypeTone[value])}>
              {clientTypeLabel[value]}
            </span>
          ) : (
            "—"
          );
        },
      },
      {
        id: "lastCommunicationAt",
        accessorKey: "lastCommunicationAt",
        header: () => <span className="text-xs uppercase tracking-[0.18em]">Последняя коммуникация</span>,
        cell: ({ getValue }) => (
          <span className="text-sm text-foreground/80 whitespace-nowrap">
            {formatDate(getValue<Date | string | null>())}
          </span>
        ),
      },
      {
        id: "lastComment",
        accessorKey: "lastComment",
        header: () => <span className="text-xs uppercase tracking-[0.18em]">Комментарий</span>,
        cell: ({ row, getValue }) => {
          const value = (getValue<string>() ?? "").trim();
          const limit = 12;
          const hasComment = value && value !== "—";
          const short = hasComment
            ? value.length > limit
              ? `${value.slice(0, limit)}...`
              : value
            : "—";
          return (
            <CommentHoverTooltip
              text={hasComment ? value : "Комментарий отсутствует"}
              onClick={() => handleOpenClient(row.original, "communications")}
            >
              <MessageCircle className="h-3.5 w-3.5 text-slate-500" />
              {short}
            </CommentHoverTooltip>
          );
        },
      },
      {
        id: "activityType",
        accessorKey: "activityType",
        header: () => <span className="text-xs uppercase tracking-[0.18em]">Вид деятельности</span>,
        cell: ({ getValue }) => (
          <span className="text-sm text-foreground/80">{getValue<string>() ?? "—"}</span>
        ),
      },
      {
        id: "productCategory",
        accessorKey: "productCategory",
        header: () => <span className="text-xs uppercase tracking-[0.18em]">Продукция</span>,
        cell: ({ getValue }) => (
          <span className="text-sm text-foreground/80">{getValue<string>() ?? "—"}</span>
        ),
      },
      {
        id: "responsibleName",
        accessorKey: "responsibleName",
        header: () => <span className="text-xs uppercase tracking-[0.18em]">Ответственный</span>,
        cell: ({ getValue }) => (
          <span className="text-sm text-foreground/80">{getValue<string>() ?? "—"}</span>
        ),
      },
    ];

    return cols;
  }, [updateClient, updateMockClient]);

  const table = useReactTable({
    data: visibleClients,
    columns,
    state: {
      columnVisibility,
      columnOrder,
    },
    onColumnVisibilityChange: (updater) =>
      setColumnVisibility((prev) => (typeof updater === "function" ? updater(prev) : updater)),
    onColumnOrderChange: (updater) =>
      setColumnOrder((prev) => (typeof updater === "function" ? updater(prev) : updater)),
    getCoreRowModel: getCoreRowModel(),
    enableSorting: false,
  });

  const tableContainerRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: table.getRowModel().rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 66,
    overscan: 8,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0].start : 0;
  const paddingBottom =
    virtualRows.length > 0
      ? totalSize - virtualRows[virtualRows.length - 1].end
      : 0;

  const selectedClient = useMemo(
    () => allClients.find((client) => client.id === selectedClientId) || null,
    [allClients, selectedClientId]
  );

  const handleTablePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!expandedContactId) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(".contacts-cell")) return;
      setExpandedContactId(null);
    },
    [expandedContactId]
  );

  const startSuppressOpen = () => {
    suppressOpenRef.current = true;
    if (suppressPointerCleanupRef.current) {
      suppressPointerCleanupRef.current();
    }
    if (suppressTimerRef.current) {
      window.clearTimeout(suppressTimerRef.current);
      suppressTimerRef.current = null;
    }
    let released = false;
    const handleRelease = () => {
      if (released) return;
      released = true;
      suppressOpenRef.current = false;
      window.removeEventListener("pointerup", handlePointerUp, true);
      window.removeEventListener("pointercancel", handlePointerUp, true);
      suppressPointerCleanupRef.current = null;
    };
    const handlePointerUp = () => {
      window.setTimeout(handleRelease, 0);
    };
    suppressPointerCleanupRef.current = handleRelease;
    window.addEventListener("pointerup", handlePointerUp, true);
    window.addEventListener("pointercancel", handlePointerUp, true);
    suppressTimerRef.current = window.setTimeout(handleRelease, 350);
  };

  const handleOpenClient = (client: ClientRecord, tab?: "deals" | "communications") => {
    if (suppressOpenRef.current) return;
    if (suppressPointerCleanupRef.current) {
      suppressPointerCleanupRef.current();
    }
    if (suppressTimerRef.current) {
      window.clearTimeout(suppressTimerRef.current);
      suppressTimerRef.current = null;
    }
    if (clearSelectionTimerRef.current) {
      window.clearTimeout(clearSelectionTimerRef.current);
      clearSelectionTimerRef.current = null;
    }
    suppressOpenRef.current = false;
    setSelectedClientId(client.id);
    setDetailTab(tab ?? "deals");
    setIsSheetOpen(true);
  };

  useEffect(() => {
    return () => {
      if (suppressTimerRef.current) {
        window.clearTimeout(suppressTimerRef.current);
        suppressTimerRef.current = null;
      }
      if (clearSelectionTimerRef.current) {
        window.clearTimeout(clearSelectionTimerRef.current);
        clearSelectionTimerRef.current = null;
      }
      if (suppressPointerCleanupRef.current) {
        suppressPointerCleanupRef.current();
      }
    };
  }, []);

  const handleSheetOpenChange = (next: boolean) => {
    setIsSheetOpen(next);
    if (!next) {
      startSuppressOpen();
      if (clearSelectionTimerRef.current) window.clearTimeout(clearSelectionTimerRef.current);
      clearSelectionTimerRef.current = window.setTimeout(() => {
        setSelectedClientId(null);
      }, 300);
    }
  };

  const handleExportSelected = () => {
    exportClientsToExcel(filteredClients);
  };

  const reminderItems = useMemo(
    () =>
      filteredClients
        .filter((client) => client.nextCommunicationAt)
        .slice(0, 4)
        .map((client) => ({
          id: client.id,
          title: client.name,
          text: client.lastComment || "Напоминание",
          time: formatDate(client.nextCommunicationAt || null),
        })),
    [filteredClients]
  );

  const [reminders, setReminders] = useState(reminderItems);
  useEffect(() => setReminders(reminderItems), [reminderItems]);

  return (
    <AppLayout title="Клиенты" subtitle={`${filteredClients.length.toLocaleString()} клиентов`}>
      <div className={cn("clients-layout", filtersOpen && "is-open")}>
        <button
          type="button"
          className={cn("filters-toggle", filtersOpen && "is-active")}
          onClick={() => setFiltersOpen((prev) => !prev)}
          aria-label="Открыть фильтры"
        >
          <Filter className="h-4 w-4" />
        </button>

        <aside className={cn("filters-drawer", filtersOpen && "is-open")}>
          <div className="filters-drawer__header">
            <span className="text-sm font-semibold">Фильтры</span>
            <button
              type="button"
              className="filters-drawer__close"
              onClick={() => setFiltersOpen(false)}
              aria-label="Закрыть фильтры"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="filters-drawer__content custom-scrollbar">
            <div className="glass-card rounded-[22px] p-4">
              <div className="mt-2 space-y-2">
                {isDirector && (
                  <FilterRow
                    active={baseFilter === "all"}
                    icon={Users}
                    label="Все клиенты"
                    count={counts.all}
                    onClick={() => setBaseFilter("all")}
                  />
                )}
                <FilterRow
                  active={baseFilter === "mine"}
                  icon={Users}
                  label="Мои клиенты"
                  count={counts.mine}
                  onClick={() => setBaseFilter("mine")}
                />
                <FilterRow
                  active={baseFilter === "favorites"}
                  icon={Star}
                  label="Избранные"
                  count={counts.favorites}
                  onClick={() => setBaseFilter("favorites")}
                />
              </div>
            </div>

            <AccordionGroup
              title="Коммуникации"
              icon={PhoneCall}
              items={[
                { key: "today", label: "Позвонить сегодня", count: counts.today },
                { key: "overdue", label: "Просроченные", count: counts.overdue },
                { key: "planned", label: "Запланированные", count: counts.planned },
                { key: "none", label: "Без коммуникации", count: counts.none },
                { key: "refused", label: "Отказ", count: counts.refused },
                { key: "in_progress", label: "В работе", count: counts.in_progress },
                { key: "success", label: "Завершен удачно", count: counts.success },
              ]}
              activeKey={communicationFilter}
              onSelect={(key) => setCommunicationFilter(key as ClientFilterKey)}
            />

            <AccordionGroup
              title="Тип клиента"
              icon={Filter}
              items={CLIENT_TYPES.map((type) => ({
                key: type,
                label: clientTypeLabel[type],
                count: allClients.filter((client) => client.clientType === type).length,
              }))}
              activeKey={typeFilter}
              onSelect={(key) => setTypeFilter(key as ClientType)}
            />

            <AccordionGroup
              title="Вид деятельности"
              icon={Filter}
              items={activityOptions.map((option) => ({
                key: option,
                label: option,
                count: allClients.filter((client) => client.activityType === option).length,
              }))}
              activeKey={activityFilter}
              onSelect={(key) => setActivityFilter(key as string)}
            />

            <AccordionGroup
              title="Продукция"
              icon={Filter}
              items={productOptions.map((option) => ({
                key: option,
                label: option,
                count: allClients.filter((client) => client.productCategory === option).length,
              }))}
              activeKey={productFilter}
              onSelect={(key) => setProductFilter(key as string)}
            />

            <AccordionGroup
              title="Область"
              icon={Filter}
              items={regionOptions.map((option) => ({
                key: option,
                label: option,
                count: allClients.filter((client) => client.region === option).length,
              }))}
              activeKey={regionFilter}
              onSelect={(key) => setRegionFilter(key as string)}
            />

            <AccordionGroup
              title="Город"
              icon={Filter}
              items={cityOptions.map((option) => ({
                key: option,
                label: option,
                count: allClients.filter((client) => client.city === option).length,
              }))}
              activeKey={cityFilter}
              onSelect={(key) => setCityFilter(key as string)}
            />
          </div>
        </aside>

        <section className="clients-main space-y-4 min-w-0 relative h-[737px]">
          <div className="glass-card rounded-[22px] p-4 overflow-hidden relative animate-fade-up">
            <div
              ref={tableContainerRef}
              className="h-[649px] w-full min-w-0 overflow-x-auto overflow-y-auto custom-scrollbar"
              onPointerMove={handleTablePointerMove}
              onScroll={(event) => {
                const target = event.currentTarget;
                if (target.scrollTop + target.clientHeight >= target.scrollHeight - 120) {
                  setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredClients.length));
                }
              }}
            >
              <table className="service-table min-w-full">
                <thead className="sticky top-0 z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="bg-white/70 backdrop-blur">
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {paddingTop > 0 && (
                    <tr>
                      <td
                        style={{ height: paddingTop }}
                        colSpan={table.getVisibleLeafColumns().length}
                        className="border-b-0"
                      />
                    </tr>
                  )}
                  {virtualRows.map((virtualRow) => {
                    const row = table.getRowModel().rows[virtualRow.index];
                    if (!row) return null;
                    return (
                      <motion.tr
                        key={row.id}
                        data-index={virtualRow.index}
                        ref={virtualizer.measureElement}
                        layout
                        initial={false}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className={cn("group transition-colors")}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="px-4 py-3 align-middle text-foreground/90"
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </motion.tr>
                    );
                  })}
                  {paddingBottom > 0 && (
                    <tr>
                      <td
                        style={{ height: paddingBottom }}
                        colSpan={table.getVisibleLeafColumns().length}
                        className="border-b-0"
                      />
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

          <div className="sticky bottom-2 z-10">
            <div className="flex items-center gap-3">
              <div
                className="glass-card rounded-[22px] px-4 flex items-center gap-3 h-[42px] w-[1232px]"
                data-contacts-keep-open
              >
                <Search className="h-4 w-4 text-muted-foreground" />
                <input
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  placeholder="Поиск клиента..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  data-contacts-keep-open
                />
              </div>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={handleExportSelected}>
                  <FileSpreadsheet className="h-4 w-4" />
                  Экспорт
                </Button>
                <ColumnManager
                  columnOrder={columnOrder}
                  columnVisibility={columnVisibility}
                  onMove={(key, direction) => {
                    const index = columnOrder.indexOf(key);
                    if (index < 0) return;
                    const nextIndex = direction === "up" ? index - 1 : index + 1;
                    if (nextIndex < 0 || nextIndex >= columnOrder.length) return;
                    const next = [...columnOrder];
                    [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
                    setColumnOrder(next);
                  }}
                  onToggle={(key) =>
                    setColumnVisibility((prev) => ({
                      ...prev,
                      [key]: !prev[key],
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <button className="clients-fab" onClick={() => setIsAddOpen(true)} aria-label="Добавить клиента">
            <Plus className="h-5 w-5" />
          </button>

        </section>
      </div>

      <NotificationsStack
        items={reminders}
        onDismiss={(id) => setReminders((prev) => prev.filter((item) => item.id !== id))}
      />

      <AddClientDialog
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        activityOptions={activityOptions}
        productOptions={productOptions}
        regionOptions={regionOptions}
        cityOptions={cityOptions}
        currentUserId={currentUserId}
        onCreate={(payload) => {
          const newId = addClient(payload as Omit<Client, "id" | "createdAt">);
          setIsAddOpen(false);
          toast({ title: "Клиент создан", description: payload.name });
          setSelectedClientId(newId);
          setIsSheetOpen(true);
        }}
      />

      {selectedClient && (
        <ClientDetailSheet
          open={isSheetOpen}
          onOpenChange={handleSheetOpenChange}
          onPointerDownCapture={startSuppressOpen}
          client={selectedClient}
          initialTab={detailTab}
          employees={employees}
          updateClient={updateClient}
          updateMockClient={updateMockClient}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          isDirector={isDirector}
        />
      )}
    </AppLayout>
  );
};
const FilterRow = ({
  icon: Icon,
  label,
  count,
  active,
  onClick,
}: {
  icon: typeof Users;
  label: string;
  count: number;
  active?: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-all",
      active ? "bg-white/70 shadow-sm ring-1 ring-sky-200/60" : "hover:bg-white/40"
    )}
  >
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          active ? "bg-sky-500" : "bg-muted-foreground/40"
        )}
      />
      <Icon className="h-4 w-4 text-primary" />
      <span>{label}</span>
    </div>
    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/60 px-2 text-[11px] font-semibold">
      {count}
    </span>
  </button>
);

const clampValue = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const ContactsCell = ({
  contacts,
  isOpen,
  onOpen,
  onClose,
}: {
  contacts: ClientContact[];
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}) => {
  const previewContact = contacts[0];
  const previewPhone = previewContact?.phones?.[0] ?? "—";
  const extraContacts = contacts.slice(1);
  const cellRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  if (!contacts.length) {
    return <span className="text-sm text-foreground/60">—</span>;
  }

  const handleCopy = (event: React.MouseEvent | React.KeyboardEvent, phone: string) => {
    event.stopPropagation();
    if (!phone || phone === "—") return;
    navigator.clipboard?.writeText(phone);
    toast({ title: "Телефон скопирован", description: phone });
  };

  useEffect(() => {
    if (!isOpen) return;
    const listEl = listRef.current;
    if (!listEl) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const rect = listEl.getBoundingClientRect();
      if (!rect.height) return;
      const firstEl = listEl.firstElementChild as HTMLElement | null;
      if (firstEl) {
        const itemRect = firstEl.getBoundingClientRect();
        const pad = Math.max((rect.height - itemRect.height) / 2, 0);
        listEl.style.setProperty("--wheel-padding", `${pad}px`);
      }
      const centerY = rect.top + rect.height / 2;
      Array.from(listEl.children).forEach((child) => {
        const el = child as HTMLElement;
        const elRect = el.getBoundingClientRect();
        const elCenter = elRect.top + elRect.height / 2;
        const distance = Math.abs(elCenter - centerY);
        const max = rect.height / 2;
        const ratio = Math.min(distance / max, 1);
        const scale = 1 - 0.15 * ratio;
        const opacity = 1 - 0.45 * ratio;
        el.style.setProperty("--wheel-scale", scale.toFixed(3));
        el.style.setProperty("--wheel-opacity", opacity.toFixed(3));
        el.classList.toggle("is-center", distance < elRect.height * 0.35);
      });
    };

    const alignFirstToCenter = () => {
      const first = listEl.firstElementChild as HTMLElement | null;
      if (!first) return;
      const listRect = listEl.getBoundingClientRect();
      const firstRect = first.getBoundingClientRect();
      const offset = first.offsetTop + firstRect.height / 2 - listRect.height / 2;
      listEl.scrollTop = Math.max(0, offset);
    };

    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(update);
    };

    window.requestAnimationFrame(() => {
      alignFirstToCenter();
      update();
    });
    listEl.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      listEl.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", update);
    };
  }, [isOpen, contacts.length]);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!cellRef.current || !target) return;
      if (target.closest("[data-contacts-keep-open]")) return;
      if (!cellRef.current.contains(target)) {
        onClose();
      }
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen, onClose]);

  return (
    <div ref={cellRef} className="contacts-cell">
      {!isOpen && (
        <button
          type="button"
          className={cn("contacts-preview", isOpen && "is-open")}
          onClick={(event) => {
            event.stopPropagation();
            if (!extraContacts.length) return;
            onOpen();
          }}
          aria-expanded={isOpen}
        >
          <div className="contacts-preview__row">
            <div className="contacts-preview__name">
              <span className="truncate">{previewContact?.name || "—"}</span>
              {previewContact?.position && (
                <span className="contacts-preview__role">{previewContact.position}</span>
              )}
            </div>
            {previewPhone !== "—" ? (
              <span
                role="button"
                tabIndex={0}
                className="contacts-copy"
                onClick={(event) => handleCopy(event, previewPhone)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    handleCopy(event, previewPhone);
                  }
                }}
              >
                <span>{previewPhone}</span>
                <Copy className="h-3 w-3 opacity-60" />
              </span>
            ) : (
              <span className="contacts-preview__phone">—</span>
            )}
          </div>
          <span className="contacts-preview__count">{contacts.length}</span>
        </button>
      )}

      <AnimatePresence initial={false}>
        {extraContacts.length > 0 && isOpen && (
          <div className="contacts-expand" style={{ overflow: "hidden" }}>
            <div ref={listRef} className="contacts-expand__list custom-scrollbar">
              {contacts.map((contact, index) => {
                const isPreview = index === 0;
                const phones = contact.phones ?? [];
                const primaryPhone = phones[0] ?? "—";
                return (
                  <div
                    key={contact.id}
                    className={cn("contacts-expand__item", isPreview && "is-preview")}
                    role={isPreview ? "button" : undefined}
                    tabIndex={isPreview ? 0 : undefined}
                    onClick={(event) => {
                      if (!isPreview) return;
                      event.stopPropagation();
                      onClose();
                    }}
                    onKeyDown={(event) => {
                      if (!isPreview) return;
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onClose();
                      }
                    }}
                  >
                    <div className="contacts-expand__item-row">
                      <span className="contacts-expand__item-name">{contact.name || "—"}</span>
                      {contact.position && (
                        <span className="contacts-expand__item-role">{contact.position}</span>
                      )}
                    </div>
                    {primaryPhone !== "—" ? (
                      <button
                        type="button"
                        className="contacts-copy"
                        onClick={(event) => handleCopy(event, primaryPhone)}
                      >
                        <span>{primaryPhone}</span>
                        <Copy className="h-3 w-3 opacity-60" />
                      </button>
                    ) : (
                      <span className="contacts-expand__item-phone">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const CommentHoverTooltip = ({
  text,
  onClick,
  children,
}: {
  text: string;
  onClick: () => void;
  children: ReactNode;
}) => {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 240, h: 70 });
  const [instant, setInstant] = useState(true);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const updateCursor = (event: React.MouseEvent<HTMLButtonElement>, immediate = false) => {
    const { clientX, clientY } = event;
    setCursor({ x: clientX, y: clientY });
    if (immediate) setInstant(true);
  };

  useLayoutEffect(() => {
    if (!open || !tooltipRef.current) return;
    const rect = tooltipRef.current.getBoundingClientRect();
    if (rect.width && rect.height) setSize({ w: rect.width, h: rect.height });
  }, [open, text]);

  useLayoutEffect(() => {
    if (!open) return;
    if (cursor.x !== 0 || cursor.y !== 0) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setCursor({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
  }, [open, cursor.x, cursor.y]);

  useEffect(() => {
    if (!open) {
      setInstant(true);
      return;
    }
    const id = requestAnimationFrame(() => setInstant(false));
    return () => cancelAnimationFrame(id);
  }, [open]);

  const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
  const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0;
  const padding = 12;
  const width = size.w || 240;
  const height = size.h || 70;

  let left = cursor.x - width / 2;
  left = clampValue(left, padding, Math.max(padding, viewportWidth - width - padding));
  let top = cursor.y - height - 18;
  let side: "top" | "bottom" = "top";
  if (top < padding) {
    top = cursor.y + 18;
    side = "bottom";
  }
  if (top + height > viewportHeight - padding) {
    top = Math.max(padding, viewportHeight - height - padding);
  }

  const tailLeft = clampValue(cursor.x - left, 26, width - 26);
  const tooltipStyle = {
    left,
    top,
    "--tail-left": `${tailLeft}px`,
  } as React.CSSProperties;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="comment-pill"
        onMouseEnter={(event) => {
          updateCursor(event, true);
          setOpen(true);
        }}
        onMouseMove={(event) => {
          if (!open) {
            updateCursor(event, true);
            setOpen(true);
            return;
          }
          updateCursor(event);
        }}
        onMouseLeave={() => setOpen(false)}
        onClick={(event) => {
          event.stopPropagation();
          onClick();
        }}
      >
        {children}
      </button>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={tooltipRef}
              className="comment-tooltip-floating"
              data-side={side}
              style={{
                ...tooltipStyle,
                transition: instant
                  ? "none"
                  : "left 120ms cubic-bezier(0.22, 0.9, 0.2, 1), top 120ms cubic-bezier(0.22, 0.9, 0.2, 1)",
              }}
            >
              <div className="comment-tooltip__title">Комментарий</div>
              <div className="comment-tooltip__text">{text}</div>
            </div>,
            document.body
          )
        : null}
    </>
  );
};

const AccordionGroup = ({
  title,
  icon: Icon,
  items,
  activeKey,
  onSelect,
}: {
  title: string;
  icon: typeof Users;
  items: { key: string; label: string; count: number }[];
  activeKey: string | "all";
  onSelect: (key: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="glass-card rounded-[22px] p-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between collapsible-trigger">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Icon className="h-4 w-4 text-primary" />
            {title}
          </div>
          <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-2 collapsible-content">
          {items.map((item) => (
            <FilterRow
              key={item.key}
              active={activeKey === item.key}
              icon={Users}
              label={item.label}
              count={item.count}
              onClick={() => onSelect(item.key)}
            />
          ))}
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

const ColumnManager = ({
  columnOrder,
  columnVisibility,
  onToggle,
  onMove,
}: {
  columnOrder: ColumnKey[];
  columnVisibility: Record<ColumnKey, boolean>;
  onToggle: (key: ColumnKey) => void;
  onMove: (key: ColumnKey, direction: "up" | "down") => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="secondary" size="sm">
        <SlidersHorizontal className="h-4 w-4" />
        Колонки
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent className="w-64">
      {columnOrder.map((key, index) => (
        <div key={key} className="flex items-center gap-2 px-2 py-1">
          <button
            className="text-muted-foreground disabled:opacity-40"
            disabled={index === 0}
            onClick={() => onMove(key, "up")}
          >
            <ArrowUp className="h-3 w-3" />
          </button>
          <button
            className="text-muted-foreground disabled:opacity-40"
            disabled={index === columnOrder.length - 1}
            onClick={() => onMove(key, "down")}
          >
            <ArrowDown className="h-3 w-3" />
          </button>
          <DropdownMenuCheckboxItem
            checked={columnVisibility[key]}
            onCheckedChange={() => onToggle(key)}
            className="flex-1"
          >
            {columnLabels[key] || "Колонка"}
          </DropdownMenuCheckboxItem>
        </div>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);

const AddClientDialog = ({
  open,
  onOpenChange,
  onCreate,
  activityOptions,
  productOptions,
  regionOptions,
  cityOptions,
  currentUserId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: Partial<Client>) => void;
  activityOptions: string[];
  productOptions: string[];
  regionOptions: string[];
  cityOptions: string[];
  currentUserId: string;
}) => {
  const [form, setForm] = useState({
    name: "",
    region: "",
    city: "",
    activityType: "",
    productCategory: "",
    email: "",
    website: "",
    clientType: "client" as ClientType,
    sourceChannel: "",
  });
  const [contacts, setContacts] = useState<
    { id: string; fullName: string; role: string; phones: string; emails: string }[]
  >([
    { id: "contact-1", fullName: "", role: "", phones: "", emails: "" },
  ]);
  const safeActivities = activityOptions.length ? activityOptions : MOCK_ACTIVITIES;
  const safeProducts = productOptions.length ? productOptions : MOCK_PRODUCTS;
  const safeRegions = regionOptions.length ? regionOptions : MOCK_REGIONS;
  const safeCities = cityOptions.length ? cityOptions : MOCK_CITIES;

  useEffect(() => {
    if (!open) {
      setForm({
        name: "",
        region: "",
        city: "",
        activityType: "",
        productCategory: "",
        email: "",
        website: "",
        clientType: "client",
        sourceChannel: "",
      });
      setContacts([{ id: "contact-1", fullName: "", role: "", phones: "", emails: "" }]);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Добавить клиента</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            placeholder="Название"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <Select value={form.region} onValueChange={(value) => setForm((prev) => ({ ...prev, region: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Область" />
            </SelectTrigger>
            <SelectContent>
              {safeRegions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={form.city} onValueChange={(value) => setForm((prev) => ({ ...prev, city: value }))}>
            <SelectTrigger>
              <SelectValue placeholder="Город" />
            </SelectTrigger>
            <SelectContent>
              {safeCities.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={form.activityType}
            onValueChange={(value) => setForm((prev) => ({ ...prev, activityType: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Вид деятельности" />
            </SelectTrigger>
            <SelectContent>
              {safeActivities.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={form.productCategory}
            onValueChange={(value) => setForm((prev) => ({ ...prev, productCategory: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Продукция" />
            </SelectTrigger>
            <SelectContent>
              {safeProducts.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            placeholder="Почта"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          />
          <Input
            placeholder="Сайт"
            value={form.website}
            onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
          />
          <Select
            value={form.sourceChannel}
            onValueChange={(value) => setForm((prev) => ({ ...prev, sourceChannel: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Канал привлечения" />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_CHANNELS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={form.clientType}
            onValueChange={(value) => setForm((prev) => ({ ...prev, clientType: value as ClientType }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Тип клиента" />
            </SelectTrigger>
            <SelectContent>
              {CLIENT_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {clientTypeLabel[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold">Контактные лица</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setContacts((prev) => [
                  ...prev,
                  { id: `contact-${Date.now()}`, fullName: "", role: "", phones: "", emails: "" },
                ])
              }
            >
              Добавить контакт
            </Button>
          </div>
          <div className="space-y-3">
            {contacts.map((contact, index) => (
              <div key={contact.id} className="rounded-xl border border-border/60 bg-white/60 p-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <Input
                    placeholder="ФИО"
                    value={contact.fullName}
                    onChange={(event) =>
                      setContacts((prev) =>
                        prev.map((item) =>
                          item.id === contact.id ? { ...item, fullName: event.target.value } : item
                        )
                      )
                    }
                  />
                  <Input
                    placeholder="Должность"
                    value={contact.role}
                    onChange={(event) =>
                      setContacts((prev) =>
                        prev.map((item) =>
                          item.id === contact.id ? { ...item, role: event.target.value } : item
                        )
                      )
                    }
                  />
                  <Input
                    placeholder="Телефоны (через запятую)"
                    value={contact.phones}
                    onChange={(event) =>
                      setContacts((prev) =>
                        prev.map((item) =>
                          item.id === contact.id ? { ...item, phones: event.target.value } : item
                        )
                      )
                    }
                  />
                  <Input
                    placeholder="Emails (через запятую)"
                    value={contact.emails}
                    onChange={(event) =>
                      setContacts((prev) =>
                        prev.map((item) =>
                          item.id === contact.id ? { ...item, emails: event.target.value } : item
                        )
                      )
                    }
                  />
                </div>
                {contacts.length > 1 && (
                  <div className="mt-2 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setContacts((prev) => prev.filter((item) => item.id !== contact.id))}
                    >
                      Удалить
                    </Button>
                  </div>
                )}
                {index === 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">Можно добавить несколько телефонов и email.</p>
                )}
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            onClick={() =>
              onCreate({
                name: form.name,
                phone: contacts[0]?.phones?.split(",")[0]?.trim() || "",
                email: form.email,
                addresses: [],
                status: "new",
                region: form.region,
                city: form.city,
                activityType: form.activityType,
                productCategory: form.productCategory,
                website: form.website,
                clientType: form.clientType,
                sourceChannel: form.sourceChannel,
                communicationStatus: "none",
                nextContactAt: null,
                lastCommunicationAt: null,
                reminderAt: null,
                isFavorite: false,
                discounts: 0,
                bonusPoints: 0,
                responsibleId: currentUserId,
                managerId: currentUserId,
                contacts: contacts.map((contact) => ({
                  id: contact.id,
                  name: contact.fullName,
                  position: contact.role,
                  phones: contact.phones
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                  emails: contact.emails
                    .split(",")
                    .map((item) => item.trim())
                    .filter(Boolean),
                })),
              })
            }
            disabled={!form.name || !form.city || !form.clientType}
          >
            Создать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ClientDetailSheet = ({
  open,
  onOpenChange,
  onPointerDownCapture,
  client,
  initialTab,
  employees,
  updateClient,
  updateMockClient,
  currentUserId,
  currentUserName,
  isDirector,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPointerDownCapture?: () => void;
  client: ClientRecord | null;
  initialTab?: "deals" | "communications";
  employees: Employee[];
  updateClient: (id: string, data: Partial<Client>) => void;
  updateMockClient: (id: string, data: Partial<ClientRecord>) => void;
  currentUserId: string;
  currentUserName: string;
  isDirector: boolean;
}) => {
  if (!client) return null;
  const [comments, setComments] = useState(client.comments ?? []);
  const [commentInput, setCommentInput] = useState("");
  const [note, setNote] = useState(client.lastComment ?? "");
  const [draft, setDraft] = useState<ClientRecord>(client);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"deals" | "communications">(
    initialTab ?? "deals"
  );

  useEffect(() => {
    if (!open) return;
    setComments(client.comments ?? []);
    setCommentInput("");
    setNote(client.lastComment ?? "");
    setDraft(client);
    setIsEditing(false);
    setActiveTab(initialTab ?? "deals");
  }, [client, open, initialTab]);

  const metaLine = [client.company, client.city, client.region].filter(Boolean).join(" • ");
  const deals = client.deals && client.deals.length ? client.deals : SAMPLE_DEALS;
  const contactList = draft.contacts ?? [];
  const communications = client.communications ?? [];
  const responsible = employees.find((emp) => emp.id === (client.responsibleId || client.ownerId));
  const tabs = [
    {
      value: "deals",
      label: "Сделки",
      hint: "Просчеты и расчеты",
      icon: FileSpreadsheet,
    },
    {
      value: "communications",
      label: "Коммуникации",
      hint: "Лента и заметки",
      icon: MessageCircle,
    },
  ];

  const updateDraft = <K extends keyof ClientRecord>(key: K, value: ClientRecord[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const updateContact = (index: number, data: Partial<ClientContact>) => {
    setDraft((prev) => {
      const nextContacts = [...(prev.contacts ?? [])];
      const current = nextContacts[index] ?? {
        id: `contact-${Date.now()}-${index}`,
        name: "",
        position: "",
        phones: [],
        emails: [],
      };
      nextContacts[index] = { ...current, ...data };
      return { ...prev, contacts: nextContacts };
    });
  };

  const handleAddContact = () => {
    setDraft((prev) => ({
      ...prev,
      contacts: [
        ...(prev.contacts ?? []),
        {
          id: `contact-${Date.now()}`,
          name: "",
          position: "",
          phones: [],
          emails: [],
        },
      ],
    }));
  };

  const handleRemoveContact = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      contacts: (prev.contacts ?? []).filter((_, idx) => idx !== index),
    }));
  };

  const handleAddComment = () => {
    if (!commentInput.trim()) return;
    const next = {
      id: `comment-${Date.now()}`,
      text: commentInput,
      createdAt: new Date(),
      authorId: currentUserId,
      authorName: currentUserName,
    };
    setComments((prev) => [next, ...prev]);
    setCommentInput("");
  };

  const handleDeleteComment = (id: string) => {
    setComments((prev) => prev.filter((comment) => comment.id !== id));
  };

  const handleCancelEdit = () => {
    setDraft(client);
    setNote(client.lastComment ?? "");
    setIsEditing(false);
  };

  const handleSave = () => {
    if (!draft.name?.trim()) return;
    const responsibleName = employees.find((emp) => emp.id === draft.responsibleId)?.name || "—";
    const cleanedContacts =
      draft.contacts
        ?.map((contact) => ({
          ...contact,
          name: contact.name?.trim() ?? "",
          position: contact.position?.trim() ?? "",
          phones: (contact.phones ?? []).map((phone) => phone.trim()).filter(Boolean),
          emails: (contact.emails ?? []).map((email) => email.trim()).filter(Boolean),
        }))
        .filter((contact) => contact.name) ?? [];
    if (client.id.startsWith("mock-")) {
      updateMockClient(client.id, {
        ...draft,
        responsibleName,
        lastComment: note,
        contacts: cleanedContacts,
      });
    } else {
      const updates: Partial<Client> = {
        name: draft.name,
        company: draft.company,
        phone: draft.phone ?? "",
        email: draft.email ?? "",
        website: draft.website,
        region: draft.region,
        city: draft.city,
        activityType: draft.activityType,
        productCategory: draft.productCategory,
        clientType: draft.clientType,
        responsibleId: draft.responsibleId,
        communicationStatus: draft.status,
        sourceChannel: draft.sourceChannel,
        contacts: cleanedContacts,
      };
      const trimmedNote = note.trim();
      if (trimmedNote && trimmedNote !== (client.lastComment ?? "").trim()) {
        updates.comments = [
          ...(client.comments ?? []),
          { id: `comment-${Date.now()}`, text: trimmedNote, createdAt: new Date() },
        ];
      }
      updateClient(client.id, updates);
    }
    setIsEditing(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setIsEditing(false);
      }}
    >
      <DialogContent
        className="client-details-modal modal-surface flex max-h-[90vh] w-[min(96vw,1280px)] max-w-6xl flex-col overflow-hidden rounded-[28px] p-6 bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-100/50 !translate-x-[-50%] !translate-y-[-50%] data-[state=open]:animate-none data-[state=closed]:animate-none"
        onPointerDownCapture={onPointerDownCapture}
        onPointerDownOutside={onPointerDownCapture}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-sky-200/40 blur-3xl" />
          <div className="absolute top-32 -left-24 h-72 w-72 rounded-full bg-rose-200/30 blur-3xl" />
          <div className="absolute bottom-0 right-24 h-56 w-56 rounded-full bg-emerald-200/30 blur-3xl" />
        </div>
        <div className="relative flex min-h-0 flex-col gap-6">
          <div className="glass-panel rounded-[24px] p-4 sm:p-5 flex flex-wrap items-start justify-between gap-4 animate-fade-up">
            <div className="min-w-[240px] space-y-2">
              {isEditing ? (
                <div className="space-y-2">
                  <Input
                    className="h-10 text-lg font-semibold"
                    value={draft.name}
                    onChange={(event) => updateDraft("name", event.target.value)}
                    placeholder="Название клиента"
                  />
                  <Input
                    className="h-9"
                    value={draft.company ?? ""}
                    onChange={(event) => updateDraft("company", event.target.value)}
                    placeholder="Компания"
                  />
                  <Select
                    value={draft.clientType ?? "none"}
                    onValueChange={(value) =>
                      updateDraft("clientType", value === "none" ? undefined : (value as ClientType))
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Тип клиента" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Без типа</SelectItem>
                      {CLIENT_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {clientTypeLabel[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <>
                  <DialogTitle className="text-2xl">{client.name}</DialogTitle>
                  <p className="text-sm text-muted-foreground">{metaLine || "Карточка клиента"}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {client.clientType && (
                      <Badge className={cn("text-xs shadow-sm", clientTypeTone[client.clientType])}>
                        {clientTypeLabel[client.clientType]}
                      </Badge>
                    )}
                    {client.activityType && (
                      <Badge variant="secondary" className="text-xs shadow-sm">
                        {client.activityType}
                      </Badge>
                    )}
                    {client.productCategory && (
                      <Badge variant="secondary" className="text-xs shadow-sm">
                        {client.productCategory}
                      </Badge>
                    )}
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSave} disabled={!draft.name?.trim()}>
                    Сохранить
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                    Отменить
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4" />
                  Редактировать
                </Button>
              )}
            </div>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "deals" | "communications")}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-[1.65fr,0.95fr]">
              <div className="flex min-h-0 flex-col">
                <TabsList className="grid h-auto w-full shrink-0 grid-cols-1 gap-3 bg-transparent p-0 sm:grid-cols-2 animate-fade-up">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="group h-auto w-full flex-col items-start justify-start gap-2 rounded-[18px] border border-transparent bg-white/70 px-4 py-3 text-left text-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-white/90 data-[state=active]:border-primary/40 data-[state=active]:bg-white data-[state=active]:shadow-lg"
                      >
                        <div className="flex items-center gap-2 text-sm font-semibold">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-sky-600 shadow-inner">
                            <Icon className="h-4 w-4" />
                          </span>
                          {tab.label}
                        </div>
                        <span className="text-xs text-muted-foreground">{tab.hint}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                <div className="mt-4 flex-1 min-h-0 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                <TabsContent value="deals" className="mt-0 space-y-4">
                  <InfoCard title="Сделки">
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-border/60 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            <th className="px-3 py-2 text-left">Дата</th>
                            <th className="px-3 py-2 text-left">Товар / услуга</th>
                            <th className="px-3 py-2 text-left">Ед.</th>
                            <th className="px-3 py-2 text-left">Кол-во</th>
                            <th className="px-3 py-2 text-left">Цена</th>
                            <th className="px-3 py-2 text-left">№ дек.</th>
                            <th className="px-3 py-2 text-left">Комментарий</th>
                            <th className="px-3 py-2 text-left">Сумма</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deals.map((deal) => (
                            <tr key={deal.id} className="border-b border-border/50 last:border-b-0">
                              <td className="px-3 py-3 text-xs text-muted-foreground">
                                {formatDate(deal.createdAt)}
                              </td>
                              <td className="px-3 py-3">
                                <div className="text-sm font-medium text-foreground">{deal.title}</div>
                              </td>
                              <td className="px-3 py-3 text-xs text-muted-foreground">{deal.unit}</td>
                              <td className="px-3 py-3 text-sm">{formatAmount(deal.qty)}</td>
                              <td className="px-3 py-3 text-sm">{formatAmount(deal.price)}</td>
                              <td className="px-3 py-3 text-xs text-muted-foreground">
                                {deal.declarationNumber || "—"}
                              </td>
                              <td className="px-3 py-3 text-sm">{deal.comment || "—"}</td>
                              <td className="px-3 py-3 text-sm font-semibold">{formatAmount(deal.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </InfoCard>
                </TabsContent>

                <TabsContent value="communications" className="mt-0 space-y-4">
                  <InfoCard title="План коммуникации">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <InfoRow label="Следующая связь" value={formatDateTime(client.nextCommunicationAt)} />
                      <InfoRow label="Последняя связь" value={formatDateTime(client.lastCommunicationAt)} />
                    </div>
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground">Шпаргалка</p>
                      <Input
                        className="mt-2"
                        placeholder="Короткая заметка для звонка"
                        value={note}
                        onChange={(event) => setNote(event.target.value)}
                      />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary">
                        Закрыть коммуникацию
                      </Button>
                      <Button size="sm" variant="secondary">
                        Перенести
                      </Button>
                      <ReminderDropdown
                        onSelect={(minutes) => {
                          toast({
                            title: "Напоминание установлено",
                            description: `Через ${minutes} мин.`,
                          });
                        }}
                      />
                    </div>
                  </InfoCard>

                  <InfoCard title="История коммуникаций">
                    {communications.length ? (
                      <div className="space-y-2">
                        {communications.map((item) => (
                          <div key={item.id} className="rounded-xl bg-white/70 px-3 py-2 text-sm">
                            <p className="font-medium">{formatDateTime(item.scheduledAt)}</p>
                            <p className="text-xs text-muted-foreground">{item.note || "—"}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">История пока пуста.</p>
                    )}
                  </InfoCard>

                  <CommentsTimeline
                    title="Лента общения"
                    items={comments}
                    value={commentInput}
                    onChange={setCommentInput}
                    onSubmit={handleAddComment}
                    onDelete={handleDeleteComment}
                    currentUserName={currentUserName}
                    currentUserId={currentUserId}
                    isDirector={isDirector}
                    fallbackAuthorName={client.responsibleName || currentUserName}
                  />
                </TabsContent>

                </div>
              </div>

              <div className="space-y-4 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
                <InfoCard title="Ответственный" className="animate-fade-up">
                  {responsible ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-sm font-semibold text-primary">
                          {getInitials(responsible.name)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{responsible.name}</p>
                          <p className="text-xs text-muted-foreground">{responsible.position || "—"}</p>
                        </div>
                      </div>
                      {responsible.email && (
                        <button
                          type="button"
                          className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-white/70 px-3 py-1 text-xs text-muted-foreground shadow-sm transition hover:bg-white hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                          onClick={() => {
                            navigator.clipboard.writeText(responsible.email || "");
                            toast({ title: "Email скопирован", description: responsible.email });
                          }}
                        >
                          <Mail className="h-3.5 w-3.5" />
                          <span>{responsible.email}</span>
                        </button>
                      )}
                      {responsible.phones?.length ? (
                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                          {responsible.phones.map((phone) => (
                            <button
                              key={phone}
                              type="button"
                              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-white/70 px-3 py-1 shadow-sm transition hover:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                              onClick={() => {
                                navigator.clipboard.writeText(phone);
                                toast({ title: "Телефон скопирован", description: phone });
                              }}
                            >
                              <Phone className="h-3 w-3" />
                              {phone}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Ответственный не назначен.</p>
                  )}
                </InfoCard>

                <InfoCard title={`Контактные лица (${contactList.length})`} className="animate-fade-up">
                  {isEditing ? (
                    <div className="space-y-3">
                      {contactList.length ? (
                        contactList.map((contact, index) => (
                          <div
                            key={contact.id}
                            className="rounded-2xl border border-border/60 bg-white/70 p-3 space-y-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <Input
                                className="h-9"
                                value={contact.name}
                                placeholder="Имя и фамилия"
                                onChange={(event) =>
                                  updateContact(index, { name: event.target.value })
                                }
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-9 w-9"
                                onClick={() => handleRemoveContact(index)}
                                aria-label="Удалить контакт"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                            <Input
                              className="h-9"
                              value={contact.position ?? ""}
                              placeholder="Должность"
                              onChange={(event) =>
                                updateContact(index, { position: event.target.value })
                              }
                            />
                            <Input
                              className="h-9"
                              value={(contact.phones ?? []).join(", ")}
                              placeholder="Телефоны через запятую"
                              onChange={(event) =>
                                updateContact(index, {
                                  phones: event.target.value
                                    .split(",")
                                    .map((item) => item.trim())
                                    .filter(Boolean),
                                })
                              }
                            />
                            <Input
                              className="h-9"
                              value={(contact.emails ?? []).join(", ")}
                              placeholder="Email через запятую"
                              onChange={(event) =>
                                updateContact(index, {
                                  emails: event.target.value
                                    .split(",")
                                    .map((item) => item.trim())
                                    .filter(Boolean),
                                })
                              }
                            />
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">Контактов нет.</p>
                      )}
                      <Button size="sm" variant="secondary" onClick={handleAddContact}>
                        Добавить контакт
                      </Button>
                    </div>
                  ) : (
                    <Collapsible defaultOpen={false}>
                    <CollapsibleTrigger className="group flex w-full items-center justify-between rounded-xl border border-border/60 bg-white/70 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-white collapsible-trigger">
                      Показать контакты
                      <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]:rotate-90" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="mt-3 space-y-3 collapsible-content">
                        {contactList.length ? (
                          <div className="space-y-3">
                            {contactList.map((contact) => (
                              <div key={contact.id} className="rounded-2xl border border-border/60 bg-white/70 p-3">
                                <div className="flex items-start gap-3">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-xs font-semibold text-primary">
                                    {getInitials(contact.name)}
                                  </div>
                                  <div className="flex-1 space-y-1">
                                    <p className="text-sm font-semibold">{contact.name}</p>
                                    <p className="text-xs text-muted-foreground">{contact.position || "—"}</p>
                                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                                      {contact.phones.map((phone) => (
                                        <div key={phone} className="flex items-center gap-2">
                                          <Phone className="h-3.5 w-3.5" />
                                          <span>{phone}</span>
                                        </div>
                                      ))}
                                      {contact.emails.map((email) => (
                                        <div key={email} className="flex items-center gap-2">
                                          <Mail className="h-3.5 w-3.5" />
                                          <span>{email}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Контактов нет.</p>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </InfoCard>

                <InfoCard title="Информация о компании">
                  {isEditing ? (
                    <div className="grid gap-3">
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Область</p>
                        <Input
                          className="h-9"
                          value={draft.region ?? ""}
                          onChange={(event) => updateDraft("region", event.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Город</p>
                        <Input
                          className="h-9"
                          value={draft.city ?? ""}
                          onChange={(event) => updateDraft("city", event.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Вид деятельности</p>
                        <Input
                          className="h-9"
                          value={draft.activityType ?? ""}
                          onChange={(event) => updateDraft("activityType", event.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Продукция</p>
                        <Input
                          className="h-9"
                          value={draft.productCategory ?? ""}
                          onChange={(event) => updateDraft("productCategory", event.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Почта</p>
                        <Input
                          className="h-9"
                          value={draft.email ?? ""}
                          onChange={(event) => updateDraft("email", event.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Сайт</p>
                        <Input
                          className="h-9"
                          value={draft.website ?? ""}
                          onChange={(event) => updateDraft("website", event.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Канал привлечения</p>
                        <Select
                          value={draft.sourceChannel ?? "none"}
                          onValueChange={(value) =>
                            updateDraft("sourceChannel", value === "none" ? undefined : value)
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Канал привлечения" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Не выбран</SelectItem>
                            {SOURCE_CHANNELS.map((option) => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Телефон</p>
                        <Input
                          className="h-9"
                          value={draft.phone ?? ""}
                          onChange={(event) => updateDraft("phone", event.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">Ответственный</p>
                        <Select
                          value={draft.responsibleId ?? "none"}
                          onValueChange={(value) =>
                            updateDraft("responsibleId", value === "none" ? undefined : value)
                          }
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Ответственный" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Не назначен</SelectItem>
                            {employees.map((emp) => (
                              <SelectItem key={emp.id} value={emp.id}>
                                {emp.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : (
                    <>
                      <InfoRow label="Область" value={client.region || "—"} />
                      <InfoRow label="Город" value={client.city || "—"} />
                      <InfoRow label="Вид деятельности" value={client.activityType || "—"} />
                      <InfoRow label="Продукция" value={client.productCategory || "—"} />
                      <InfoRow label="Телефон" value={client.phone || "—"} />
                      <InfoRow label="Почта" value={client.email || "—"} />
                      <InfoRow label="Сайт" value={client.website || "—"} />
                      <InfoRow label="Канал привлечения" value={client.sourceChannel || "—"} />
                      <InfoRow label="Ответственный" value={client.responsibleName || "—"} />
                    </>
                  )}
                </InfoCard>
              </div>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const InfoCard = ({
  title,
  titleAddon,
  className,
  children,
}: {
  title: React.ReactNode;
  titleAddon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) => (
  <div className={cn("glass-card rounded-[20px] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg", className)}>
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className="text-sm font-semibold">{title}</div>
      {titleAddon}
    </div>
    <div className="space-y-2 text-sm">{children}</div>
  </div>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm text-foreground">{value}</p>
  </div>
);

const ReminderDropdown = ({ onSelect }: { onSelect: (minutes: number) => void }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button size="sm" variant="secondary">
        Напомнить
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      {[5, 10, 30, 60].map((minutes) => (
        <DropdownMenuCheckboxItem key={minutes} onCheckedChange={() => onSelect(minutes)}>
          Через {minutes} мин.
        </DropdownMenuCheckboxItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);

const CommentsTimeline = ({
  title = "Комментарии",
  items,
  value,
  onChange,
  onSubmit,
  onDelete,
  currentUserName,
  currentUserId,
  isDirector,
  fallbackAuthorName,
}: {
  title?: string;
  items: { id: string; text: string; createdAt: Date; authorId?: string; authorName?: string }[];
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onDelete: (id: string) => void;
  currentUserName: string;
  currentUserId: string;
  isDirector: boolean;
  fallbackAuthorName: string;
}) => (
  <InfoCard title={title}>
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <textarea
          className="ios-input min-h-[90px] flex-1"
          placeholder="Добавить комментарий"
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        <button onClick={onSubmit} className="ios-button-primary text-xs">
          Добавить
        </button>
      </div>
      {items.length === 0 && (
        <p className="text-xs text-muted-foreground">Комментарии отсутствуют.</p>
      )}
      <div className="space-y-3 max-h-80 overflow-y-auto no-scrollbar pr-1 scroll-fade-vertical pt-2 pb-2">
        {items
          .slice()
          .sort((a, b) => (toDate(b.createdAt)?.getTime() || 0) - (toDate(a.createdAt)?.getTime() || 0))
          .map((comment) => {
            const authorName = comment.authorName || fallbackAuthorName || currentUserName || "Менеджер";
            const canDelete = isDirector || comment.authorId === currentUserId;
            return (
              <div key={comment.id} className="flex gap-3 rounded-2xl bg-muted/50 p-3">
                <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                  {getInitials(authorName)}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">{authorName}</span>
                    <div className="flex items-center gap-3">
                      <span>{formatDateTime(comment.createdAt)}</span>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(comment.id)}
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
              </div>
            );
          })}
      </div>
    </div>
  </InfoCard>
);

const NotificationsStack = ({
  items,
  onDismiss,
}: {
  items: { id: string; title: string; text: string; time: string }[];
  onDismiss: (id: string) => void;
}) => (
  <div className="fixed bottom-6 right-6 z-[220] flex flex-col gap-3">
    <AnimatePresence>
      {items.map((item) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          className="glass-card rounded-[18px] p-4 w-[280px] shadow-lg"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.text}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.time}</p>
            </div>
            <button onClick={() => onDismiss(item.id)} className="text-muted-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="secondary">
              Открыть
            </Button>
            <Button size="sm" variant="ghost" onClick={() => onDismiss(item.id)}>
              Скрыть
            </Button>
          </div>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

export default ClientsPage;

