
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  ChevronRight,
  FileSpreadsheet,
  Filter,
  Globe,
  Mail,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { useCRMStore, Client, ClientContact } from "@/store/crmStore";
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

const MOCK_ACTIVITIES = ["Аптеки", "Банки", "Прачечная", "HoReCa", "Строительство", "Ритейл"];
const MOCK_PRODUCTS = ["Канцелярия", "Одежда", "Игрушки", "Медтовары", "Техника"];
const MOCK_REGIONS = ["Киевская", "Львовская", "Одесская", "Харьковская", "Днепр"];
const MOCK_CITIES = ["Киев", "Львов", "Одесса", "Харьков", "Днепр"];

const randomFrom = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const randomBool = (chance = 0.5) => Math.random() < chance;
const randomPhone = () =>
  `+380 ${Math.floor(50 + Math.random() * 49)} ${Math.floor(100 + Math.random() * 900)} ${Math.floor(
    10 + Math.random() * 90
  )} ${Math.floor(10 + Math.random() * 90)}`;

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
      lastCommunicationAt,
      nextCommunicationAt,
      lastComment: randomBool(0.4) ? "Запросили презентацию." : "—",
      responsibleId: responsible?.id,
      responsibleName: responsible?.name,
      ownerId: responsible?.id,
      ownerName: responsible?.name,
      starred: randomBool(0.25),
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

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const [columnOrder, setColumnOrder] = useLocalStorageState<ColumnKey[]>(
    "crm.clients.columns.order",
    [...columnsOrderDefault]
  );
  const [columnVisibility, setColumnVisibility] = useLocalStorageState<Record<ColumnKey, boolean>>(
    "crm.clients.columns.visibility",
    {
      starred: true,
      name: true,
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
      return filtered.length ? filtered : [...columnsOrderDefault];
    });
    setColumnVisibility((prev) => {
      const next = { ...prev } as Record<ColumnKey, boolean>;
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
              className="min-w-[180px] text-left"
              onClick={(event) => {
                event.stopPropagation();
                const selection = window.getSelection?.();
                if (selection && selection.toString()) return;
                handleOpenClient(client);
              }}
            >
              <div className="text-sm font-semibold text-foreground">{client.name}</div>
              {client.clientType && (
                <span className={cn("mt-1 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-semibold", clientTypeTone[client.clientType])}>
                  {clientTypeLabel[client.clientType]}
                </span>
              )}
            </button>
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
              if (url) window.open(url.startsWith("http") ? url : `https://${url}`, "_blank");
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
        cell: ({ getValue }) => {
          const value = getValue<string>();
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm text-foreground/80 max-w-[240px] truncate inline-block">
                    {value || "—"}
                  </span>
                </TooltipTrigger>
                <TooltipContent>{value || "—"}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
    data: filteredClients,
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

  const handleOpenClient = (client: ClientRecord) => {
    setSelectedClientId(client.id);
    setIsSheetOpen(true);
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
      <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-6">
        <aside className="space-y-4 max-h-[calc(100vh-220px)] sticky top-4 overflow-y-auto pr-1">
          <div className="glass-card rounded-[22px] p-4">
            <h3 className="text-sm font-semibold">Фильтры</h3>
            <div className="mt-4 space-y-2">
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

        </aside>

        <section className="space-y-4 min-w-0">
          <div className="glass-card rounded-[22px] p-4 sticky top-2 z-20">
            <div className="flex flex-wrap items-center gap-4">
              <div className="min-w-0 mr-auto">
                <h2 className="text-xl font-semibold">Клиенты</h2>
                <p className="text-sm text-muted-foreground">
                  {filteredClients.length.toLocaleString()} клиентов
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 w-full lg:w-auto">
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
                <Button onClick={() => setIsAddOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Добавить клиента
                </Button>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-[22px] p-4 overflow-hidden">
            <div
              ref={tableContainerRef}
              className="h-[605px] w-full min-w-0 overflow-x-auto overflow-y-auto custom-scrollbar"
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
                        layout
                        initial={false}
                        className={cn(
                          "group transition-colors"
                        )}
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

          <div className="sticky bottom-4 z-10">
            <div className="glass-card rounded-[22px] px-4 py-3 flex items-center gap-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Поиск клиента..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>
          </div>

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

      <ClientDetailSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        client={selectedClient}
        employees={employeesList}
        updateClient={updateClient}
        updateMockClient={updateMockClient}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
        isDirector={isDirector}
      />
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
  const [open, setOpen] = useState(true);
  return (
    <div className="glass-card rounded-[22px] p-4">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Icon className="h-4 w-4 text-primary" />
            {title}
          </div>
          <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-2">
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
    email: "",
    website: "",
    clientType: "client" as ClientType,
  });
  const [products, setProducts] = useState<string[]>([]);
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
        email: "",
        website: "",
        clientType: "client",
      });
      setProducts([]);
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" className="justify-between">
                {products.length ? `Продукция (${products.length})` : "Продукция"}
                <ChevronRight className="h-4 w-4 rotate-90" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              {safeProducts.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option}
                  checked={products.includes(option)}
                  onCheckedChange={() =>
                    setProducts((prev) =>
                      prev.includes(option)
                        ? prev.filter((item) => item !== option)
                        : [...prev, option]
                    )
                  }
                >
                  {option}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
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
                productCategory: products.join(", "),
                website: form.website,
                clientType: form.clientType,
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
  client,
  employees,
  updateClient,
  updateMockClient,
  currentUserId,
  currentUserName,
  isDirector,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: ClientRecord | null;
  employees: { id: string; name: string }[];
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

  useEffect(() => {
    setComments(client.comments ?? []);
    setCommentInput("");
    setNote(client.lastComment ?? "");
    setDraft(client);
    setIsEditing(false);
  }, [client, open]);

  const updateDraft = <K extends keyof ClientRecord>(key: K, value: ClientRecord[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
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
    if (client.id.startsWith("mock-")) {
      updateMockClient(client.id, { ...draft, responsibleName, lastComment: note });
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
      <DialogContent className="client-details-modal modal-surface w-[min(96vw,1100px)] max-w-5xl max-h-[90vh] overflow-y-auto rounded-[28px] p-6">
        <div className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-[240px]">
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
                  <p className="text-sm text-muted-foreground">{client.company ?? "Карточка клиента"}</p>
                  {client.clientType && (
                    <Badge className={cn("mt-2", clientTypeTone[client.clientType])}>
                      {clientTypeLabel[client.clientType]}
                    </Badge>
                  )}
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="secondary">
                <Phone className="h-4 w-4" /> Позвонить
              </Button>
              <Button size="sm" variant="secondary">
                <CalendarClock className="h-4 w-4" /> Запланировать
              </Button>
              <Button size="sm" variant="secondary">
                <Plus className="h-4 w-4" /> Создать сделку
              </Button>
              {isEditing ? (
                <>
                  <Button size="sm" onClick={handleSave} disabled={!draft.name?.trim()}>
                    Сохранить
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleCancelEdit}>
                    Отменить
                  </Button>
                </>
              ) : null}
            </div>
          </div>

          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Обзор</TabsTrigger>
              <TabsTrigger value="deals">Сделки</TabsTrigger>
              <TabsTrigger value="files">Файлы</TabsTrigger>
              <TabsTrigger value="history">История</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <InfoRow label="Почта" value={client.email || "—"} />
                      <InfoRow label="Сайт" value={client.website || "—"} />
                      <InfoRow label="Ответственный" value={client.responsibleName || "—"} />
                    </>
                  )}
                </InfoCard>
                <InfoCard title="Контактные лица">
                  {client.contacts && client.contacts.length ? (
                    <div className="space-y-3">
                      {client.contacts.map((contact) => (
                        <div key={contact.id} className="rounded-xl bg-white/70 p-3">
                          <p className="text-sm font-semibold">{contact.name}</p>
                          <p className="text-xs text-muted-foreground">{contact.position}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            {contact.phones.map((phone, index) => (
                              <Badge key={index} variant="secondary">
                                {phone}
                              </Badge>
                            ))}
                            {contact.emails.map((email, index) => (
                              <Badge key={index} variant="secondary">
                                {email}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Контактов нет.</p>
                  )}
                </InfoCard>
              </div>

              <InfoCard title="Коммуникации">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <InfoRow label="Следующая связь" value={formatDate(client.nextCommunicationAt)} />
                  <InfoRow label="Последняя связь" value={formatDate(client.lastCommunicationAt)} />
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
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-muted-foreground">История коммуникаций</p>
                  {client.communications && client.communications.length ? (
                    client.communications.map((item) => (
                      <div key={item.id} className="rounded-xl bg-white/70 px-3 py-2 text-sm">
                        <p className="font-medium">{formatDate(item.scheduledAt)}</p>
                        <p className="text-xs text-muted-foreground">{item.note || "—"}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">История пока пуста.</p>
                  )}
                </div>
              </InfoCard>

              <CommentsTimeline
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
            <TabsContent value="deals" className="mt-4">
              <InfoCard title="Сделки">
                <p className="text-sm text-muted-foreground">Раздел сделок клиента.</p>
              </InfoCard>
            </TabsContent>
            <TabsContent value="files" className="mt-4">
              <InfoCard title="Файлы">
                <p className="text-sm text-muted-foreground">Файлы клиента.</p>
              </InfoCard>
            </TabsContent>
            <TabsContent value="history" className="mt-4">
              <InfoCard title="История">
                <p className="text-sm text-muted-foreground">История коммуникаций.</p>
              </InfoCard>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const InfoCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="glass-card rounded-[20px] p-4">
    <h4 className="text-sm font-semibold mb-3">{title}</h4>
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
  <InfoCard title="Комментарии">
    <textarea
      className="ios-input min-h-[90px]"
      placeholder="Добавить комментарий"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
    <div className="flex justify-end">
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
            <div key={comment.id} className="rounded-xl bg-muted/50 p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                    {getInitials(authorName)}
                  </span>
                  <span className="font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {authorName}
                  </span>
                </div>
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
          );
        })}
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
  <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-3">
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
