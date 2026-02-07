
import { type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  Clock,
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
  Trash2,
  Users,
  X,
} from "lucide-react";
import { addDays, format, isAfter, isBefore, isSameDay, parseISO, setHours, setMinutes } from "date-fns";
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
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
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

type CommunicationResult = "success" | "failed";

const COMMUNICATION_FAIL_REASONS = [
  { value: "supplier", label: "Есть свой поставщик" },
  { value: "not_using", label: "Не используют" },
  { value: "closed", label: "Закрылись" },
  { value: "expensive", label: "Дорого" },
] as const;

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
  reminderAt?: Date | null;
  communicationNote?: string;
  lastComment?: string;
  responsibleId?: string;
  responsibleName?: string;
  ownerId?: string;
  ownerName?: string;
  starred?: boolean;
  contacts?: ClientContact[];
  comments?: {
    id: string;
    text: string;
    createdAt: Date;
    authorId?: string;
    authorName?: string;
    updatedAt?: Date;
  }[];
  allowManagerDeleteComments?: boolean;
  communications?: {
    id: string;
    scheduledAt: Date;
    note?: string;
    status: "planned" | "closed";
    result?: "success" | "failed";
    reason?: string;
    createdAt: Date;
    closedAt?: Date | null;
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
    recipientName?: string;
    recipientPhone?: string;
    documents?: string[];
  }[];
};

type DealFormState = {
  id?: string;
  createdAt: string;
  title: string;
  unit: string;
  qty: string;
  price: string;
  amount: string;
  declarationNumber: string;
  recipientName: string;
  recipientPhone: string;
  documents: string;
  comment: string;
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

const communicationStatusLabel: Record<CommunicationStatus, string> = {
  none: "Без статуса",
  refused: "Отказ",
  in_progress: "В работе",
  success: "Успешно",
};

const communicationStatusTone: Record<CommunicationStatus, string> = {
  none: "bg-slate-100 text-slate-500",
  refused: "bg-rose-100/70 text-rose-700",
  in_progress: "bg-amber-100/70 text-amber-700",
  success: "bg-emerald-100/70 text-emerald-700",
};

const communicationReasonLabel = Object.fromEntries(
  COMMUNICATION_FAIL_REASONS.map((reason) => [reason.value, reason.label])
) as Record<string, string>;

const columnsOrderDefault = [
  "starred",
  "name",
  "contacts",
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
  city: "Город",
  email: "Почта",
  website: "Сайт",
  clientType: "Статус",
  lastCommunicationAt: "Последняя коммуникация",
  lastComment: "Комментарий",
  activityType: "Вид деятельности",
  productCategory: "Продукция",
  responsibleName: "Ответственный",
};


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

const playReminderSound = () => {
  try {
    const AudioContextClass =
      window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const audio = new AudioContextClass();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = 880;
    gain.gain.value = 0.08;
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.25);
    oscillator.onended = () => {
      audio.close();
    };
  } catch {
    // ignore
  }
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
      reminderAt: null,
      communicationNote: randomBool(0.35) ? "Нужна повторная встреча." : "",
      lastComment: randomBool(0.4) ? "Запросили презентацию." : "—",
      responsibleId: responsible?.id,
      responsibleName: responsible?.name,
      ownerId: responsible?.id,
      ownerName: responsible?.name,
      starred: randomBool(0.25),
      contacts,
      allowManagerDeleteComments: false,
    });
  }
  return result;
};

const getLastCommentText = (client: Client) => {
  if (!client.comments || client.comments.length === 0) return "—";
  const sorted = [...client.comments].sort(
    (a, b) =>
      (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0)
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
    reminderAt: client.reminderAt ?? null,
    communicationNote: client.notes ?? "",
    lastComment: getLastCommentText(client),
    responsibleId: client.responsibleId,
    responsibleName,
    ownerId: client.managerId,
    ownerName: employees.find((emp) => emp.id === client.managerId)?.name || "—",
    starred: client.isFavorite ?? false,
    contacts: client.contacts,
    comments: client.comments,
    allowManagerDeleteComments: client.allowManagerDeleteComments,
    communications: client.communications ?? [],
    deals: client.deals ?? [],
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
  const [detailTab, setDetailTab] = useState<"deals" | "quotes">("deals");
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
      const contactsText = (client.contacts ?? [])
        .flatMap((contact) => [
          contact.name,
          contact.position,
          ...(contact.phones ?? []),
          ...(contact.emails ?? []),
        ])
        .filter(Boolean)
        .join(" ");

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
        client.communicationNote,
        client.responsibleName,
        contactsText,
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
          header: () => (
            <span className="table-head-icon" aria-label="Избранные">
              <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
            </span>
          ),
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
          header: () => <span className="table-head-text">ФИО / Название</span>,
          cell: ({ row }) => {
            const client = row.original;
            return (
              <button
                type="button"
                className="client-name-button"
                onClick={(event) => {
                  event.stopPropagation();
                  const selection = window.getSelection?.();
                  if (selection && selection.toString()) return;
                  handleOpenClient(client);
                }}
              >
                <div className="client-name-block">
                  <div className="client-name-title">{client.name}</div>
                  <div className="client-name-subtitle">
                    {client.clientType ? clientTypeLabel[client.clientType] : "—"}
                  </div>
                </div>
              </button>
            );
          },
      },
        {
          id: "contacts",
          header: () => <span className="table-head-text">Телефоны и сотрудники</span>,
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
          id: "city",
          accessorKey: "city",
          header: () => <span className="table-head-text">Город</span>,
        cell: ({ getValue }) => (
          <div className="text-sm text-foreground">{getValue<string>() ?? "—"}</div>
        ),
      },
        {
          id: "email",
          accessorKey: "email",
          header: () => <span className="table-head-text">Почта</span>,
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
          header: () => <span className="table-head-text">Сайт</span>,
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
          header: () => <span className="table-head-text">Статус</span>,
          cell: ({ row }) => {
            const status = row.original.status ?? "none";
            return (
              <span
                className={cn(
                  "inline-flex min-w-max items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold leading-none",
                  communicationStatusTone[status]
                )}
              >
                {communicationStatusLabel[status]}
              </span>
            );
          },
        },
        {
          id: "lastCommunicationAt",
          accessorKey: "lastCommunicationAt",
          header: () => <span className="table-head-text">Последняя коммуникация</span>,
        cell: ({ row }) => {
          const client = row.original;
          const note = (client.communicationNote || "").trim();
          return (
            <div className="flex flex-col gap-1">
              <span className="text-sm text-foreground/80 whitespace-nowrap">
                {formatDate(client.lastCommunicationAt ?? null)}
              </span>
              <span className="text-xs text-muted-foreground line-clamp-2">
                {note || "—"}
              </span>
            </div>
          );
        },
      },
        {
          id: "lastComment",
          accessorKey: "lastComment",
          header: () => <span className="table-head-text">Последний комментарий</span>,
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
              onClick={() => handleOpenClient(row.original)}
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
          header: () => <span className="table-head-text">Вид деятельности</span>,
        cell: ({ getValue }) => (
          <span className="text-sm text-foreground/80">{getValue<string>() ?? "—"}</span>
        ),
      },
        {
          id: "productCategory",
          accessorKey: "productCategory",
          header: () => <span className="table-head-text">Продукция</span>,
        cell: ({ getValue }) => (
          <span className="text-sm text-foreground/80">{getValue<string>() ?? "—"}</span>
        ),
      },
        {
          id: "responsibleName",
          accessorKey: "responsibleName",
          header: () => <span className="table-head-text">Ответственные</span>,
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

  const handleOpenClient = (client: ClientRecord, tab?: "deals" | "quotes") => {
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

  const [reminders, setReminders] = useState<
    { id: string; title: string; text: string; time: string }[]
  >([]);
  const reminderTimersRef = useRef(new Map<string, number>());

  useEffect(() => {
    const timers = reminderTimersRef.current;
    const activeKeys = new Set<string>();
    const now = Date.now();

    allClients.forEach((client) => {
      if (!client.reminderAt) return;
      const reminderTime = toDate(client.reminderAt)?.getTime();
      if (!reminderTime) return;
      const key = `${client.id}:${reminderTime}`;
      activeKeys.add(key);
      if (reminderTime <= now) return;
      if (timers.has(key)) return;

      const timeoutId = window.setTimeout(() => {
        const reminderText = (client.communicationNote || "").trim() || "Напоминание";
        setReminders((prev) => [
          ...prev,
          {
            id: key,
            title: client.name,
            text: reminderText,
            time: formatDateTime(client.reminderAt),
          },
        ]);
        playReminderSound();
        toast({
          title: "Напоминание",
          description: `${client.name} · ${reminderText}`,
        });
        timers.delete(key);
        if (client.id.startsWith("mock-")) {
          updateMockClient(client.id, { reminderAt: null });
        } else {
          updateClient(client.id, { reminderAt: null });
        }
      }, reminderTime - now);

      timers.set(key, timeoutId);
    });

    timers.forEach((timeoutId, key) => {
      if (activeKeys.has(key)) return;
      window.clearTimeout(timeoutId);
      timers.delete(key);
    });
  }, [allClients, updateClient, updateMockClient]);

  useEffect(() => {
    return () => {
      reminderTimersRef.current.forEach((timeoutId) => window.clearTimeout(timeoutId));
      reminderTimersRef.current.clear();
    };
  }, []);

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
              onScroll={(event) => {
                const target = event.currentTarget;
                if (target.scrollTop + target.clientHeight >= target.scrollHeight - 120) {
                  setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredClients.length));
                }
              }}
            >
              <table className="service-table clients-table min-w-full">
                <thead className="sticky top-0 z-10">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="table-head-row">
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className={cn(
                            "table-head-cell",
                            header.id !== "starred" && "table-head-cell--left",
                            header.id === "contacts" && "table-head-cell--tight"
                          )}
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
                            className={cn(
                              "px-4 py-3 align-middle text-foreground/90",
                              cell.column.id !== "starred" && "table-cell-left",
                              cell.column.id === "contacts" && "table-cell--tight"
                            )}
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

          <div className="sticky bottom-2 z-10 w-full">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "glass-card rounded-[22px] px-4 flex items-center gap-3 h-[42px] flex-1 min-w-0 max-w-full"
                )}
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
              <div
                className={cn(
                  "flex items-center gap-2 actions-safe",
                  filtersOpen && "compact-actions"
                )}
              >
                <Button variant="secondary" size="sm" onClick={handleExportSelected} className="action-btn">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="action-label">Экспорт</span>
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
              <Plus className="h-6 w-6" />
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
      "filters-row w-full flex items-center justify-between rounded-xl px-3 py-2 text-sm transition-all",
      active && "is-active"
    )}
  >
    <div className="flex items-center gap-2">
      <span
        className={cn(
          "filters-row__dot h-1.5 w-1.5 rounded-full",
          active && "is-active"
        )}
      />
      <Icon className="filters-row__icon h-4 w-4" />
      <span>{label}</span>
    </div>
    <span className="filters-row__count inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-2 text-[11px] font-semibold">
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
  const hasExtraContacts = extraContacts.length > 0;
  const hasContacts = contacts.length > 0;
  const cellRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [popoverSize, setPopoverSize] = useState({ w: 280, h: 180 });

    const handleCopy = (event: React.MouseEvent | React.KeyboardEvent, phone: string) => {
      event.stopPropagation();
      if (!phone || phone === "—") return;
      navigator.clipboard?.writeText(phone);
      toast({ title: "Телефон скопирован", description: phone });
    };

    const toggleOpen = () => {
      if (!contacts.length) return;
      if (isOpen) {
        onClose();
      } else {
        onOpen();
      }
    };

    useLayoutEffect(() => {
      if (!isOpen || !hasContacts || !popoverRef.current) return;
      const rect = popoverRef.current.getBoundingClientRect();
      if (rect.width && rect.height) {
        setPopoverSize({ w: rect.width, h: rect.height });
      }
    }, [isOpen, hasContacts, contacts.length]);

    useLayoutEffect(() => {
      if (!isOpen || !hasContacts || !listRef.current) return;
      const listEl = listRef.current;
      const firstItem = listEl.querySelector<HTMLElement>(".contacts-popover__item");
      if (!firstItem) return;
      const itemHeight = firstItem.getBoundingClientRect().height;
      if (!itemHeight) return;
      const gap = 8;
      const maxHeight = itemHeight * 3 + gap * 2;
      listEl.style.setProperty("--contacts-list-max-height", `${Math.round(maxHeight)}px`);
    }, [isOpen, hasContacts, contacts.length]);

    useEffect(() => {
      if (!isOpen || !hasContacts) return;
      const handlePointerDown = (event: PointerEvent) => {
        const target = event.target as HTMLElement | null;
        if (!cellRef.current || !target) return;
        if (target.closest("[data-contacts-keep-open]")) return;
        if (cellRef.current.contains(target)) return;
        if (popoverRef.current?.contains(target)) return;
        onClose();
      };
      window.addEventListener("pointerdown", handlePointerDown);
      return () => window.removeEventListener("pointerdown", handlePointerDown);
    }, [isOpen, hasContacts, onClose]);

    useEffect(() => {
      if (!isOpen || !hasContacts) return;
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, hasContacts, onClose]);

    if (!hasContacts) {
      return <span className="text-sm text-foreground/60">—</span>;
    }

    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 0;
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0;
    const padding = 12;
    const width = popoverSize.w || 280;
    const height = popoverSize.h || 180;
    const triggerRect = triggerRef.current?.getBoundingClientRect();
    let left = padding;
    let top = padding;
    let side: "top" | "bottom" = "bottom";
    if (triggerRect) {
      left = triggerRect.left + triggerRect.width / 2 - width / 2;
      left = clampValue(left, padding, Math.max(padding, viewportWidth - width - padding));
      top = triggerRect.bottom + 8;
      if (top + height > viewportHeight - padding) {
        top = Math.max(padding, triggerRect.top - height - 8);
        side = "top";
      }
    }
    const popoverStyle = {
      left,
      top,
    } as React.CSSProperties;

    return (
      <div
        ref={cellRef}
        className="contacts-cell"
      >
        <button
          ref={triggerRef}
          type="button"
          className={cn("contacts-preview", isOpen && "is-open")}
          onClick={(event) => {
            event.stopPropagation();
            toggleOpen();
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
          {hasExtraContacts && <span className="contacts-preview__count">{contacts.length}</span>}
        </button>
        {isOpen && typeof document !== "undefined"
          ? createPortal(
              <div
                ref={popoverRef}
                className="contacts-popover"
                data-side={side}
                style={popoverStyle}
              >
                <div className="contacts-popover__header">
                  <span>{contacts.length === 1 ? "Контакт" : "Контакты"}</span>
                </div>
                <div ref={listRef} className="contacts-popover__list">
                  {contacts.map((contact) => {
                    const phones = contact.phones ?? [];
                    const primaryPhone = phones[0] ?? "—";
                    return (
                      <div key={contact.id} className="contacts-popover__item">
                        <div className="contacts-popover__item-row">
                          <span className="contacts-popover__item-name">{contact.name || "—"}</span>
                          {contact.position && (
                            <span className="contacts-popover__item-role">{contact.position}</span>
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
                          <span className="contacts-popover__item-phone">—</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>,
              document.body
            )
          : null}
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
      <Button variant="secondary" size="sm" className="action-btn">
        <SlidersHorizontal className="h-4 w-4" />
        <span className="action-label">Колонки</span>
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
              <div key={contact.id} className="rounded-xl border border-slate-200/60 bg-white/70 p-3">
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
                communications: [],
                deals: [],
                comments: [],
                allowManagerDeleteComments: false,
                notes: "",
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
  initialTab?: "deals" | "quotes";
  employees: Employee[];
  updateClient: (id: string, data: Partial<Client>) => void;
  updateMockClient: (id: string, data: Partial<ClientRecord>) => void;
  currentUserId: string;
  currentUserName: string;
  isDirector: boolean;
}) => {
  const buildEmptyDealForm = (): DealFormState => ({
    createdAt: format(new Date(), "yyyy-MM-dd"),
    title: "",
    unit: "",
    qty: "",
    price: "",
    amount: "",
    declarationNumber: "",
    recipientName: "",
    recipientPhone: "",
    documents: "",
    comment: "",
  });
  const activeClient = client ?? ({} as ClientRecord);

  const [comments, setComments] = useState(activeClient.comments ?? []);
  const [commentInput, setCommentInput] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");
  const [draft, setDraft] = useState<ClientRecord>(activeClient);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"deals" | "quotes">(initialTab ?? "deals");
  const [allowManagerDelete, setAllowManagerDelete] = useState(
    activeClient.allowManagerDeleteComments ?? false
  );
  const [communications, setCommunications] = useState(activeClient.communications ?? []);
  const [commNote, setCommNote] = useState(activeClient.communicationNote ?? "");
  const [commDate, setCommDate] = useState(() => {
    const next = toDate(activeClient.nextCommunicationAt ?? null);
    return next ? format(next, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
  });
  const [commTime, setCommTime] = useState(() => {
    const next = toDate(activeClient.nextCommunicationAt ?? null);
    return next ? format(next, "HH:mm") : "09:00";
  });
  const [closingCommId, setClosingCommId] = useState<string | null>(null);
  const [closingResult, setClosingResult] = useState<CommunicationResult | null>(null);
  const [closingReason, setClosingReason] = useState("");
  const [reminderAt, setReminderAt] = useState<Date | null>(activeClient.reminderAt ?? null);
  const [dealList, setDealList] = useState(activeClient.deals ?? []);
  const [dealFormOpen, setDealFormOpen] = useState(false);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [dealForm, setDealForm] = useState<DealFormState>(() => buildEmptyDealForm());
  const dealFileInputRef = useRef<HTMLInputElement | null>(null);
  const [commHistoryOpen, setCommHistoryOpen] = useState(true);
  const [contactsOpen, setContactsOpen] = useState(true);

  useEffect(() => {
    if (!open || !client) return;
    setComments(client.comments ?? []);
    setCommentInput("");
    setEditingCommentId(null);
    setEditingCommentText("");
    setDraft(client);
    setIsEditing(false);
    setActiveTab(initialTab ?? "deals");
    setAllowManagerDelete(client.allowManagerDeleteComments ?? false);
    setCommunications(client.communications ?? []);
    setCommNote(client.communicationNote ?? "");
    const next = toDate(client.nextCommunicationAt ?? null);
    setCommDate(next ? format(next, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"));
    setCommTime(next ? format(next, "HH:mm") : "09:00");
    setClosingCommId(null);
    setClosingResult(null);
    setClosingReason("");
    setReminderAt(client.reminderAt ?? null);
    setDealList(client.deals ?? []);
    setDealForm(buildEmptyDealForm());
    setDealFormOpen(false);
    setEditingDealId(null);
    setCommHistoryOpen(true);
    setContactsOpen(true);
  }, [client, open, initialTab]);

  const metaLine = [draft.company, draft.city, draft.region].filter(Boolean).join(" • ");
  const contactList = draft.contacts ?? [];
  const responsible = employees.find(
    (emp) => emp.id === (draft.responsibleId || client.responsibleId || client.ownerId)
  );

  const updateDraft = <K extends keyof ClientRecord>(key: K, value: ClientRecord[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleClientTypeChange = (value?: ClientType) => {
    setDraft((prev) => ({ ...prev, clientType: value }));
    if (client.id.startsWith("mock-")) {
      updateMockClient(client.id, { clientType: value });
      return;
    }
    updateClient(client.id, { clientType: value });
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

  const getLatestCommentText = (
    items: { id: string; text: string; createdAt: Date }[]
  ) => {
    if (!items.length) return "—";
    const sorted = [...items].sort(
      (a, b) =>
        (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0)
    );
    return sorted[0]?.text || "—";
  };

  const persistComments = (nextComments: typeof comments) => {
    setComments(nextComments);
    if (client.id.startsWith("mock-")) {
      updateMockClient(client.id, {
        comments: nextComments,
        lastComment: getLatestCommentText(nextComments),
      });
      return;
    }
    updateClient(client.id, { comments: nextComments });
  };

  const handleAddComment = () => {
    const text = commentInput.trim();
    if (!text) return;
    const next = {
      id: `comment-${Date.now()}`,
      text,
      createdAt: new Date(),
      authorId: currentUserId,
      authorName: currentUserName,
    };
    persistComments([next, ...comments]);
    setCommentInput("");
  };

  const handleDeleteComment = (id: string) => {
    persistComments(comments.filter((comment) => comment.id !== id));
  };

  const handleStartEditComment = (id: string, text: string) => {
    setEditingCommentId(id);
    setEditingCommentText(text);
  };

  const handleSaveEditedComment = () => {
    if (!editingCommentId) return;
    const text = editingCommentText.trim();
    if (!text) return;
    const next = comments.map((comment) =>
      comment.id === editingCommentId ? { ...comment, text, updatedAt: new Date() } : comment
    );
    persistComments(next);
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentText("");
  };

  const handleToggleAllowManagerDelete = (value: boolean) => {
    setAllowManagerDelete(value);
    if (client.id.startsWith("mock-")) {
      updateMockClient(client.id, { allowManagerDeleteComments: value });
      return;
    }
    updateClient(client.id, { allowManagerDeleteComments: value });
  };

  const parseNumber = (value: string) => {
    const normalized = value.replace(/\s/g, "").replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const persistDeals = (nextDeals: typeof dealList) => {
    setDealList(nextDeals);
    if (client.id.startsWith("mock-")) {
      updateMockClient(client.id, { deals: nextDeals });
      return;
    }
    updateClient(client.id, { deals: nextDeals });
  };

  const handleEditDeal = (deal: NonNullable<ClientRecord["deals"]>[number]) => {
    setDealFormOpen(true);
    setEditingDealId(deal.id);
    setDealForm({
      id: deal.id,
      createdAt: format(toDate(deal.createdAt) ?? new Date(), "yyyy-MM-dd"),
      title: deal.title,
      unit: deal.unit,
      qty: String(deal.qty ?? ""),
      price: String(deal.price ?? ""),
      amount: String(deal.amount ?? ""),
      declarationNumber: deal.declarationNumber ?? "",
      recipientName: deal.recipientName ?? "",
      recipientPhone: deal.recipientPhone ?? "",
      documents: (deal.documents ?? []).join(", "),
      comment: deal.comment ?? "",
    });
  };

  const handleDeleteDeal = (id: string) => {
    persistDeals(dealList.filter((deal) => deal.id !== id));
  };

  const handleSaveDeal = () => {
    if (!dealForm.title.trim()) return;
    const qty = parseNumber(dealForm.qty);
    const price = parseNumber(dealForm.price);
    const amount = dealForm.amount.trim() ? parseNumber(dealForm.amount) : qty * price;
    const createdAt = dealForm.createdAt ? new Date(`${dealForm.createdAt}T00:00:00`) : new Date();
    const documents = dealForm.documents
      .split(",")
      .map((doc) => doc.trim())
      .filter(Boolean);

    const nextDeal = {
      id: editingDealId ?? `deal-${Date.now()}`,
      createdAt,
      title: dealForm.title.trim(),
      unit: dealForm.unit.trim() || "шт.",
      qty,
      price,
      amount,
      declarationNumber: dealForm.declarationNumber.trim() || undefined,
      recipientName: dealForm.recipientName.trim() || undefined,
      recipientPhone: dealForm.recipientPhone.trim() || undefined,
      documents,
      comment: dealForm.comment.trim() || undefined,
    };

    const nextDeals = editingDealId
      ? dealList.map((deal) => (deal.id === editingDealId ? nextDeal : deal))
      : [nextDeal, ...dealList];

    persistDeals(nextDeals);
    setDealForm(buildEmptyDealForm());
    setDealFormOpen(false);
    setEditingDealId(null);
  };

  const handleCancelDealForm = () => {
    setDealForm(buildEmptyDealForm());
    setDealFormOpen(false);
    setEditingDealId(null);
  };

  const appendDealDocuments = (files: File[]) => {
    if (!files.length) return;
    const names = files.map((file) => file.name).filter(Boolean);
    if (!names.length) return;
    setDealForm((prev) => {
      const existing = prev.documents
        .split(",")
        .map((doc) => doc.trim())
        .filter(Boolean);
      const next = Array.from(new Set([...existing, ...names]));
      return { ...prev, documents: next.join(", ") };
    });
  };

  const handleDealFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    appendDealDocuments(Array.from(event.target.files ?? []));
    event.target.value = "";
  };

  const handleDealFilesDrop = (event: React.DragEvent<HTMLInputElement>) => {
    event.preventDefault();
    appendDealDocuments(Array.from(event.dataTransfer.files ?? []));
  };

  const computeCommunicationMeta = (items: NonNullable<ClientRecord["communications"]>) => {
    const planned = items.filter((item) => item.status === "planned");
    const plannedDates = planned
      .map((item) => toDate(item.scheduledAt))
      .filter(Boolean) as Date[];
    const next = plannedDates.sort((a, b) => a.getTime() - b.getTime())[0] ?? null;

    const closed = items.filter((item) => item.status === "closed");
    const closedWithTime = closed
      .map((item) => ({
        item,
        time: toDate(item.closedAt ?? item.scheduledAt)?.getTime() ?? 0,
      }))
      .sort((a, b) => b.time - a.time);
    const lastClosed = closedWithTime[0]?.item;
    const last = lastClosed ? toDate(lastClosed.closedAt ?? lastClosed.scheduledAt) : null;

    let status: CommunicationStatus = "none";
    if (planned.length) status = "in_progress";
    else if (lastClosed?.result === "success") status = "success";
    else if (lastClosed?.result === "failed") status = "refused";

    return { next, last, status };
  };

  const persistCommunications = (
    nextCommunications: NonNullable<ClientRecord["communications"]>,
    noteValue: string = commNote
  ) => {
    setCommunications(nextCommunications);
    const { next, last, status } = computeCommunicationMeta(nextCommunications);
    const trimmedNote = noteValue.trim();

    if (client.id.startsWith("mock-")) {
      updateMockClient(client.id, {
        communications: nextCommunications,
        nextCommunicationAt: next,
        lastCommunicationAt: last,
        status,
        communicationNote: trimmedNote,
      });
    } else {
      updateClient(client.id, {
        communications: nextCommunications,
        nextContactAt: next,
        lastCommunicationAt: last,
        communicationStatus: status,
        notes: trimmedNote,
      });
    }

    setDraft((prev) => ({
      ...prev,
      nextCommunicationAt: next,
      lastCommunicationAt: last,
      status,
      communicationNote: trimmedNote,
    }));
  };

  const handleScheduleCommunication = () => {
    if (!commDate) return;
    const scheduledAt = new Date(`${commDate}T${commTime || "09:00"}`);
    const nextItem = {
      id: `comm-${Date.now()}`,
      scheduledAt,
      note: commNote.trim() || undefined,
      status: "planned" as const,
      createdAt: new Date(),
    };
    const nextList = [nextItem, ...communications];
    persistCommunications(nextList, commNote.trim());
    toast({ title: "Коммуникация запланирована", description: formatDateTime(scheduledAt) });
  };

  const handleClearCommunicationForm = () => {
    setCommNote("");
    setCommDate(format(new Date(), "yyyy-MM-dd"));
    setCommTime("09:00");
  };

  const handleStartCloseCommunication = (id: string) => {
    setClosingCommId(id);
    setClosingResult(null);
    setClosingReason("");
  };

  const handleConfirmCloseCommunication = () => {
    if (!closingCommId || !closingResult) return;
    if (closingResult === "failed" && !closingReason) {
      toast({ title: "Укажите причину", description: "Выберите причину отказа." });
      return;
    }
    const nextList = communications.map((item) => {
      if (item.id !== closingCommId) return item;
      return {
        ...item,
        status: "closed" as const,
        result: closingResult,
        reason: closingResult === "failed" ? closingReason : undefined,
        closedAt: new Date(),
      };
    });
    persistCommunications(nextList);
    setClosingCommId(null);
    setClosingResult(null);
    setClosingReason("");
  };

  const handleCancelCloseCommunication = () => {
    setClosingCommId(null);
    setClosingResult(null);
    setClosingReason("");
  };

  const handleSetReminderAt = (time: Date, label?: string) => {
    setReminderAt(time);
    if (client.id.startsWith("mock-")) {
      updateMockClient(client.id, { reminderAt: time });
    } else {
      updateClient(client.id, { reminderAt: time });
    }
    toast({
      title: "Напоминание установлено",
      description: label ?? formatDateTime(time),
    });
  };

  const handleSetReminder = (minutes: number) => {
    const time = new Date(Date.now() + minutes * 60000);
    handleSetReminderAt(time, `Через ${minutes} мин.`);
  };

  const handleClearReminder = () => {
    setReminderAt(null);
    if (client.id.startsWith("mock-")) {
      updateMockClient(client.id, { reminderAt: null });
    } else {
      updateClient(client.id, { reminderAt: null });
    }
    toast({ title: "Напоминание очищено" });
  };

  const handleCancelEdit = () => {
    setDraft(client);
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
        sourceChannel: draft.sourceChannel,
        contacts: cleanedContacts,
      };
      updateClient(client.id, updates);
    }
    setIsEditing(false);
  };

  const sortedCommunications = [...communications].sort(
    (a, b) =>
      (toDate(b.scheduledAt)?.getTime() ?? 0) - (toDate(a.scheduledAt)?.getTime() ?? 0)
  );

  const sortedComments = [...comments].sort(
    (a, b) =>
      (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0)
  );

  if (!client) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setIsEditing(false);
      }}
    >
      <DialogContent
        className="client-details-modal modal-surface flex max-h-[92vh] w-[min(96vw,1280px)] max-w-6xl flex-col overflow-hidden rounded-[20px] border border-slate-200/60 bg-slate-50 p-6 !translate-x-[-50%] !translate-y-[-50%] data-[state=open]:animate-none data-[state=closed]:animate-none"
        onPointerDownCapture={onPointerDownCapture}
        onPointerDownOutside={onPointerDownCapture}
      >
        <div className="relative flex min-h-0 flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/60 pb-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-[10px] border border-slate-200/60 bg-white/70" />
              <div className="space-y-2">
                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      className="h-10 text-lg font-semibold"
                      value={draft.name}
                      onChange={(event) => updateDraft("name", event.target.value)}
                      placeholder="Название клиента"
                    />
                    <div className="flex flex-wrap gap-2">
                      <Input
                        className="h-9 min-w-[220px]"
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
                        <SelectTrigger className="h-9 min-w-[180px]">
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
                  </div>
                ) : (
                  <>
                    <DialogTitle className="text-2xl font-semibold">{client.name}</DialogTitle>
                    <p className="text-xs text-muted-foreground">{metaLine || "Карточка клиента"}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "inline-flex items-center gap-1 rounded-full border border-slate-200/70 bg-white/70 px-2.5 py-1 text-xs font-medium text-foreground/80 shadow-sm transition hover:bg-white",
                              !draft.clientType && "text-muted-foreground"
                            )}
                          >
                            {draft.clientType ? clientTypeLabel[draft.clientType] : "Тип клиента"}
                            <ChevronDown className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuRadioGroup
                            value={draft.clientType ?? "none"}
                            onValueChange={(value) =>
                              handleClientTypeChange(value === "none" ? undefined : (value as ClientType))
                            }
                          >
                            <DropdownMenuRadioItem value="none">Без типа</DropdownMenuRadioItem>
                            {CLIENT_TYPES.map((type) => (
                              <DropdownMenuRadioItem key={type} value={type}>
                                {clientTypeLabel[type]}
                              </DropdownMenuRadioItem>
                            ))}
                          </DropdownMenuRadioGroup>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {client.activityType && (
                        <Badge variant="secondary" className="text-xs">
                          {client.activityType}
                        </Badge>
                      )}
                      {client.productCategory && (
                        <Badge variant="secondary" className="text-xs">
                          {client.productCategory}
                        </Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="sm" variant="secondary" className="h-7 px-2.5 text-xs">
                            + Напоминание
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onSelect={() => handleSetReminder(5)}>
                            через 5 минут
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => handleSetReminderAt(new Date(Date.now() + 60 * 60000), "Через час")}
                          >
                            через час
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              const tomorrow = addDays(new Date(), 1);
                              const morning = setHours(setMinutes(tomorrow, 0), 9);
                              handleSetReminderAt(morning, "Завтра с утра");
                            }}
                          >
                            завтра с утра
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => {
                              const nextWeek = addDays(new Date(), 7);
                              handleSetReminderAt(nextWeek, "Через неделю");
                            }}
                          >
                            через неделю
                          </DropdownMenuItem>
                          {reminderAt && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={handleClearReminder}>
                                убрать напоминание
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {reminderAt && (
                        <span className="text-xs text-muted-foreground">
                          {formatDateTime(reminderAt)}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>
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
            onValueChange={(value) => setActiveTab(value as "deals" | "quotes")}
            className="flex min-h-0 flex-1 flex-col"
          >
            <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-[1.65fr,0.95fr]">
              <div className="flex min-h-0 min-w-0 flex-col">
                <TabsList className="grid h-auto w-full grid-cols-1 gap-3 bg-transparent p-0 sm:grid-cols-2">
                  <TabsTrigger
                    value="quotes"
                    className="flex w-full items-center justify-between gap-2 rounded-[12px] border border-transparent bg-white/70 px-4 py-3 text-left text-sm font-medium text-foreground/80 shadow-sm transition hover:bg-white data-[state=active]:border-slate-200/70 data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow"
                  >
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Просчеты
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      0
                    </span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="deals"
                    className="flex w-full items-center justify-between gap-2 rounded-[12px] border border-transparent bg-white/70 px-4 py-3 text-left text-sm font-medium text-foreground/80 shadow-sm transition hover:bg-white data-[state=active]:border-slate-200/70 data-[state=active]:bg-white data-[state=active]:text-foreground data-[state=active]:shadow"
                  >
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      Сделки
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {dealList.length}
                    </span>
                  </TabsTrigger>
                </TabsList>

                <div className="mt-4 flex-1 min-h-0 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                <TabsContent value="quotes" className="mt-0 space-y-4">
                  <InfoCard title="Просчеты">
                    <p className="text-sm text-muted-foreground">Просчетов пока нет.</p>
                  </InfoCard>
                </TabsContent>

                <TabsContent value="deals" className="mt-0 space-y-4">
                  <InfoCard
                    title="Сделки"
                    titleAddon={
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          setDealFormOpen((prev) => {
                            const next = !prev;
                            if (next) {
                              setEditingDealId(null);
                              setDealForm(buildEmptyDealForm());
                            }
                            return next;
                          })
                        }
                      >
                        Добавить +
                      </Button>
                    }
                  >
                    {dealFormOpen && (
                      <div className="rounded-[12px] border border-slate-200/60 bg-white/70 p-3">
                        <div className="grid gap-3 md:grid-cols-2">
                          <Input
                            type="date"
                            className="h-9"
                            value={dealForm.createdAt}
                            onChange={(event) =>
                              setDealForm((prev) => ({ ...prev, createdAt: event.target.value }))
                            }
                          />
                          <Input
                            className="h-9"
                            placeholder="Наименование"
                            value={dealForm.title}
                            onChange={(event) =>
                              setDealForm((prev) => ({ ...prev, title: event.target.value }))
                            }
                          />
                          <Input
                            className="h-9"
                            placeholder="Ед. измерения"
                            value={dealForm.unit}
                            onChange={(event) =>
                              setDealForm((prev) => ({ ...prev, unit: event.target.value }))
                            }
                          />
                          <Input
                            className="h-9"
                            placeholder="Количество"
                            value={dealForm.qty}
                            onChange={(event) =>
                              setDealForm((prev) => ({ ...prev, qty: event.target.value }))
                            }
                          />
                          <Input
                            className="h-9"
                            placeholder="Цена"
                            value={dealForm.price}
                            onChange={(event) =>
                              setDealForm((prev) => ({ ...prev, price: event.target.value }))
                            }
                          />
                          <Input
                            className="h-9"
                            placeholder="Сумма"
                            value={dealForm.amount}
                            onChange={(event) =>
                              setDealForm((prev) => ({ ...prev, amount: event.target.value }))
                            }
                          />
                          <Input
                            className="h-9"
                            placeholder="Номер декларации"
                            value={dealForm.declarationNumber}
                            onChange={(event) =>
                              setDealForm((prev) => ({ ...prev, declarationNumber: event.target.value }))
                            }
                          />
                          <Input
                            className="h-9"
                            placeholder="Получатель"
                            value={dealForm.recipientName}
                            onChange={(event) =>
                              setDealForm((prev) => ({ ...prev, recipientName: event.target.value }))
                            }
                          />
                          <Input
                            className="h-9"
                            placeholder="Телефон получателя"
                            value={dealForm.recipientPhone}
                            onChange={(event) =>
                              setDealForm((prev) => ({ ...prev, recipientPhone: event.target.value }))
                            }
                          />
                          <div className="space-y-2">
                            <Input
                              className="h-9"
                              placeholder="Документы (через запятую)"
                              value={dealForm.documents}
                              onChange={(event) =>
                                setDealForm((prev) => ({ ...prev, documents: event.target.value }))
                              }
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={handleDealFilesDrop}
                            />
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <input
                                ref={dealFileInputRef}
                                type="file"
                                multiple
                                className="hidden"
                                onChange={handleDealFilesChange}
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => dealFileInputRef.current?.click()}
                              >
                                Загрузить
                              </Button>
                            </div>
                          </div>
                          <Input
                            className="h-9"
                            placeholder="Комментарий"
                            value={dealForm.comment}
                            onChange={(event) =>
                              setDealForm((prev) => ({ ...prev, comment: event.target.value }))
                            }
                          />
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" onClick={handleSaveDeal}>
                            {editingDealId ? "Сохранить" : "Добавить"}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={handleCancelDealForm}>
                            Отмена
                          </Button>
                        </div>
                      </div>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-slate-200/70 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                            <th className="px-3 py-2 text-left">Дата</th>
                            <th className="px-3 py-2 text-left">Товар / услуга</th>
                            <th className="px-3 py-2 text-left">Ед.</th>
                            <th className="px-3 py-2 text-left">Кол-во</th>
                            <th className="px-3 py-2 text-left">Цена</th>
                            <th className="px-3 py-2 text-left">№ дек.</th>
                            <th className="px-3 py-2 text-left">Документы</th>
                            <th className="px-3 py-2 text-left">Комментарий</th>
                            <th className="px-3 py-2 text-right">Сумма</th>
                            <th className="px-3 py-2 text-right"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {dealList.length ? (
                            dealList.map((deal) => (
                              <tr key={deal.id} className="border-b border-slate-200/60 last:border-b-0">
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
                                  <div>{deal.declarationNumber || "—"}</div>
                                  {deal.recipientName && (
                                    <div className="mt-1 text-xs text-foreground">{deal.recipientName}</div>
                                  )}
                                  {deal.recipientPhone && (
                                    <div className="text-[11px] text-muted-foreground">{deal.recipientPhone}</div>
                                  )}
                                </td>
                                <td className="px-3 py-3">
                                  {deal.documents && deal.documents.length ? (
                                    <div className="flex flex-wrap gap-1">
                                      {deal.documents.map((doc) => (
                                        <span
                                          key={doc}
                                          className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                                        >
                                          {doc}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </td>
                                <td className="px-3 py-3 text-sm">{deal.comment || "—"}</td>
                                <td className="px-3 py-3 text-right text-sm font-semibold">
                                  {formatAmount(deal.amount)}
                                </td>
                                <td className="px-3 py-3 text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <button
                                      type="button"
                                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200/60 text-muted-foreground transition hover:bg-slate-50/80"
                                      onClick={() => handleEditDeal(deal)}
                                      aria-label="Редактировать"
                                    >
                                      <Pencil className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200/60 text-rose-500 transition hover:bg-rose-50/80"
                                      onClick={() => handleDeleteDeal(deal.id)}
                                      aria-label="Удалить"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={10} className="px-3 py-6 text-center text-sm text-muted-foreground">
                                Сделок пока нет.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </InfoCard>
                  <InfoCard
                    title="Комментарии"
                  >
                    <div className="space-y-3">
                      <textarea
                        className="ios-input min-h-[90px]"
                        placeholder="Добавить комментарий"
                        value={commentInput}
                        onChange={(event) => setCommentInput(event.target.value)}
                      />
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Button size="sm" onClick={handleAddComment}>
                          Добавить
                        </Button>
                      </div>
                      <div className="space-y-3 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                        {sortedComments.length ? (
                          sortedComments.map((comment) => {
                            const authorName =
                              comment.authorName || client.responsibleName || currentUserName || "Менеджер";
                            const canEdit = isDirector || comment.authorId === currentUserId;
                            const canDelete =
                              isDirector || (allowManagerDelete && comment.authorId === currentUserId);
                            return (
                              <div
                                key={comment.id}
                                className="rounded-[12px] border border-slate-200/60 bg-white/70 px-3 py-2"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="text-xs text-muted-foreground">
                                    <span className="font-semibold text-foreground">{authorName}</span>
                                    <span className="ml-2">{formatDateTime(comment.createdAt)}</span>
                                    {comment.updatedAt && <span className="ml-2">(изменено)</span>}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {canEdit && (
                                      <button
                                        type="button"
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200/60 text-muted-foreground transition hover:bg-slate-50/80"
                                        onClick={() => handleStartEditComment(comment.id, comment.text)}
                                        aria-label="Редактировать"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                    {canDelete && (
                                      <button
                                        type="button"
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200/60 text-rose-500 transition hover:bg-rose-50/80"
                                        onClick={() => handleDeleteComment(comment.id)}
                                        aria-label="Удалить"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {editingCommentId === comment.id ? (
                                  <div className="mt-2 space-y-2">
                                    <textarea
                                      className="ios-input min-h-[70px]"
                                      value={editingCommentText}
                                      onChange={(event) => setEditingCommentText(event.target.value)}
                                    />
                                    <div className="flex gap-2">
                                      <Button size="sm" onClick={handleSaveEditedComment}>
                                        Сохранить
                                      </Button>
                                      <Button size="sm" variant="ghost" onClick={handleCancelEditComment}>
                                        Отмена
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="mt-2 text-sm text-foreground">{comment.text}</p>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-sm text-muted-foreground">Комментариев нет.</p>
                        )}
                      </div>
                    </div>
                  </InfoCard>
                </TabsContent>

                </div>
              </div>

              <div className="client-details-side flex min-h-0 min-w-0 flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                <InfoCard
                  title="Коммуникация"
                  titleAddon={
                    <Button
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      onClick={() => handleScheduleCommunication()}
                      aria-label="Запланировать"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  }
                >
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Input
                        type="date"
                        className="h-9"
                        value={commDate}
                        onChange={(event) => setCommDate(event.target.value)}
                      />
                      <Input
                        type="time"
                        className="h-9"
                        value={commTime}
                        onChange={(event) => setCommTime(event.target.value)}
                      />
                    </div>
                    <Input
                      className="h-9"
                      placeholder="Короткая заметка для коммуникации"
                      value={commNote}
                      onChange={(event) => setCommNote(event.target.value)}
                    />
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={handleScheduleCommunication}>
                        Запланировать
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleClearCommunicationForm}>
                        Очистить
                      </Button>
                    </div>

                    <div className="rounded-[10px] bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          Следующая коммуникация: {formatDateTime(draft.nextCommunicationAt ?? null)}
                        </span>
                      </div>
                    </div>

                    <Collapsible open={commHistoryOpen} onOpenChange={setCommHistoryOpen}>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>История</span>
                        <CollapsibleTrigger asChild>
                          <button
                            type="button"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200/60 text-muted-foreground transition hover:bg-slate-50/80"
                            aria-label="Свернуть историю"
                          >
                            <ChevronDown
                              className={cn("h-4 w-4 transition-transform", !commHistoryOpen && "-rotate-90")}
                            />
                          </button>
                        </CollapsibleTrigger>
                      </div>
                      <CollapsibleContent>
                        <div className="mt-2 max-h-64 overflow-y-auto pr-1 custom-scrollbar overscroll-auto space-y-2">
                          {sortedCommunications.length ? (
                            sortedCommunications.map((item) => {
                              const isPlanned = item.status === "planned";
                              const isSuccess = item.result === "success";
                              const badgeClass = isPlanned
                                ? "bg-amber-100 text-amber-700"
                                : isSuccess
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-rose-100 text-rose-700";
                              const badgeLabel = isPlanned
                                ? "В работе"
                                : isSuccess
                                ? "Завершено удачно"
                                : "Завершено неудачно";

                              return (
                                <div key={item.id} className="rounded-[10px] bg-slate-50 px-3 py-2 text-xs">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-semibold text-foreground">
                                      {formatDateTime(item.scheduledAt)}
                                    </span>
                                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", badgeClass)}>
                                      {badgeLabel}
                                    </span>
                                  </div>
                                  {item.note && <p className="mt-1 text-xs text-muted-foreground">{item.note}</p>}
                                  {item.status === "closed" && item.result === "failed" && item.reason && (
                                    <p className="mt-1 text-[11px] text-rose-500">
                                      Причина: {communicationReasonLabel[item.reason] ?? item.reason}
                                    </p>
                                  )}
                                  {isPlanned && (
                                    <div className="mt-2">
                                      <Button size="sm" variant="outline" onClick={() => handleStartCloseCommunication(item.id)}>
                                        Закрыть
                                      </Button>
                                    </div>
                                  )}
                                  {closingCommId === item.id && (
                                    <div className="mt-2 rounded-[10px] border border-slate-200/60 bg-white/70 p-2">
                                      <div className="flex flex-wrap gap-2">
                                        <Button
                                          size="sm"
                                          variant={closingResult === "success" ? "default" : "secondary"}
                                          onClick={() => setClosingResult("success")}
                                        >
                                          Завершено удачно
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant={closingResult === "failed" ? "default" : "secondary"}
                                          onClick={() => setClosingResult("failed")}
                                        >
                                          Завершено неудачно
                                        </Button>
                                      </div>
                                      {closingResult === "failed" && (
                                        <div className="mt-2 space-y-1">
                                          {COMMUNICATION_FAIL_REASONS.map((reason) => (
                                            <label key={reason.value} className="flex items-center gap-2 text-xs">
                                              <input
                                                type="radio"
                                                name={`reason-${item.id}`}
                                                checked={closingReason === reason.value}
                                                onChange={() => setClosingReason(reason.value)}
                                              />
                                              {reason.label}
                                            </label>
                                          ))}
                                        </div>
                                      )}
                                      <div className="mt-2 flex gap-2">
                                        <Button size="sm" onClick={handleConfirmCloseCommunication}>
                                          Сохранить
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={handleCancelCloseCommunication}>
                                          Отмена
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-sm text-muted-foreground">Коммуникаций нет.</p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  </div>
                </InfoCard>
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
                      <div className="space-y-1 text-xs text-muted-foreground">
                        {responsible.email && (
                          <button
                            type="button"
                            className="flex items-center gap-2 text-left transition hover:text-foreground"
                            onClick={() => {
                              navigator.clipboard.writeText(responsible.email || "");
                              toast({ title: "Email скопирован", description: responsible.email });
                            }}
                          >
                            <Mail className="h-3.5 w-3.5" />
                            <span>{responsible.email}</span>
                          </button>
                        )}
                        {responsible.phones?.map((phone) => (
                          <button
                            key={phone}
                            type="button"
                            className="flex items-center gap-2 text-left transition hover:text-foreground"
                            onClick={() => {
                              navigator.clipboard.writeText(phone);
                              toast({ title: "Телефон скопирован", description: phone });
                            }}
                          >
                            <Phone className="h-3.5 w-3.5" />
                            <span>{phone}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Ответственный не назначен.</p>
                  )}
                </InfoCard>

                <Collapsible open={contactsOpen} onOpenChange={setContactsOpen}>
                  <InfoCard
                    title={`Контактные лица (${contactList.length})`}
                    className="animate-fade-up"
                    titleAddon={
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200/60 text-muted-foreground transition hover:bg-slate-50/80"
                          aria-label="Свернуть контакты"
                        >
                          <ChevronDown
                            className={cn("h-4 w-4 transition-transform", !contactsOpen && "-rotate-90")}
                          />
                        </button>
                      </CollapsibleTrigger>
                    }
                  >
                    <CollapsibleContent>
                      {isEditing ? (
                        <div className="space-y-3">
                          {contactList.length ? (
                            contactList.map((contact, index) => (
                              <div
                                key={contact.id}
                                className="rounded-2xl border border-slate-200/60 bg-white/70 p-3 space-y-2"
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
                        <div className="space-y-3">
                          {contactList.length ? (
                            contactList.map((contact) => (
                              <div key={contact.id} className="rounded-[10px] bg-slate-50 px-3 py-2">
                                <div className="flex items-start gap-3">
                                  <div className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-primary/10 text-xs font-semibold text-primary">
                                    {getInitials(contact.name)}
                                  </div>
                                  <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <p className="text-sm font-semibold text-foreground">{contact.name}</p>
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    </div>
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
                            ))
                          ) : (
                            <p className="text-sm text-muted-foreground">Контактов нет.</p>
                          )}
                        </div>
                      )}
                    </CollapsibleContent>
                  </InfoCard>
                </Collapsible>

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
                      {isDirector && (
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Удаление комментариев менеджером</p>
                          <Select
                            value={allowManagerDelete ? "allowed" : "blocked"}
                            onValueChange={(value) => handleToggleAllowManagerDelete(value === "allowed")}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Удаление комментариев менеджером" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="blocked">Запрещено</SelectItem>
                              <SelectItem value="allowed">Разрешено</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
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
  bodyClassName,
  children,
}: {
  title: React.ReactNode;
  titleAddon?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) => (
  <div
    className={cn(
      "rounded-[10px] border border-slate-200/60 bg-white/80 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.05)]",
      className
    )}
  >
    <div className="mb-3 flex items-center justify-between gap-2">
      <div className="text-sm font-semibold">{title}</div>
      {titleAddon}
    </div>
    <div className={cn("space-y-2 text-sm", bodyClassName)}>{children}</div>
  </div>
);

const InfoRow = ({ label, value }: { label: string; value: string }) => (
  <div>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-sm text-foreground">{value}</p>
  </div>
);

const NotificationsStack = ({
  items,
  onDismiss,
}: {
  items: { id: string; title: string; text: string; time: string }[];
  onDismiss: (id: string) => void;
}) => {
  useEffect(() => {
    if (!items.length) return;
    const timers = items.map((item) =>
      window.setTimeout(() => onDismiss(item.id), 2000)
    );
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
    };
  }, [items, onDismiss]);

  return (
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
};

export default ClientsPage;

