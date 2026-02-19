
import { type ReactNode, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowDown,
  ArrowUp,
  CalendarClock,
  BadgeDollarSign,
  ChevronDown,
  ChevronRight,
  Clock,
  Building2,
  Briefcase,
  FileSpreadsheet,
  FileImage,
  FileText,
  Filter,
  Globe,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  MoreVertical,
  CornerUpLeft,
  Paperclip,
  Pencil,
  PhoneCall,
  Phone,
  Plus,
  Package,
  Copy,
  Scale,
  Search,
  Smile,
  SlidersHorizontal,
  Star,
  Truck,
  Trash2,
  User,
  Users,
  CheckCircle2,
  X,
} from "lucide-react";
import { addDays, format, isAfter, isBefore, isSameDay, parseISO, setHours, setMinutes } from "date-fns";
import { ru } from "date-fns/locale";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { toast } from "@/components/ui/use-toast";
import { useCRMStore, Client, ClientContact, Employee } from "@/store/crmStore";
import { useAuthStore } from "@/store/authStore";
import { useDirectoryStore } from "@/store/directoryStore";

const CLIENT_TYPES = ["client", "supplier", "competitor", "partner"] as const;
type ClientType = (typeof CLIENT_TYPES)[number];

const COMMUNICATION_STATUS = ["none", "refused", "in_progress", "success"] as const;
type CommunicationStatus = (typeof COMMUNICATION_STATUS)[number];

type CommunicationResult = "success" | "failed";
type CommunicationFormStatus = "planned" | CommunicationResult;
type DealStage = "quote" | "deal";

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
  createdAt?: Date | string;
  starred?: boolean;
  contacts?: ClientContact[];
  comments?: {
    id: string;
    text: string;
    createdAt: Date;
    authorId?: string;
    authorName?: string;
    updatedAt?: Date;
    attachments?: {
      id: string;
      name: string;
      size: number;
      type?: string;
    }[];
    replyTo?: {
      id: string;
      authorName?: string;
      text?: string;
    };
  }[];
  allowManagerDeleteComments?: boolean;
  communications?: {
    id: string;
    kind?: "call" | "meeting";
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
    stage?: DealStage;
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
    recipientCity?: string;
    recipientOffice?: string;
    documents?: string[];
  }[];
};

type ClientCommunicationRecord = NonNullable<ClientRecord["communications"]>[number];

type MessageAttachment = {
  id: string;
  name: string;
  size: number;
  type?: string;
};

type MessageReply = {
  id: string;
  authorName?: string;
  text?: string;
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
  recipientCity: string;
  recipientOffice: string;
  documents: string;
  comment: string;
  stage: DealStage;
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
  "communication",
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
  communication: "Коммуникация",
  lastComment: "Комментарий",
  activityType: "Вид деятельности",
  productCategory: "Продукция",
  responsibleName: "Ответственный",
};


const SOURCE_CHANNELS = ["Сайт", "Рекомендация", "Выставка", "Холодный звонок", "Партнер"] as const;
const MOCK_ACTIVITIES = ["Аптеки", "Банки", "Прачечная", "HoReCa", "Строительство", "Ритейл"];
const MOCK_PRODUCTS = ["Канцелярия", "Одежда", "Игрушки", "Медтовары", "Техника"];
const MOCK_REGIONS = ["Киевская", "Львовская", "Одесская", "Харьковская", "Днепропетровская"];
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

const deriveCommunicationStatus = (
  items?: NonNullable<ClientRecord["communications"]>,
  fallback: CommunicationStatus = "none"
): CommunicationStatus => {
  if (!items || items.length === 0) return fallback ?? "none";
  const latest = items
    .map((item) => {
      const time = toDate(
        item.status === "closed"
          ? item.closedAt ?? item.createdAt ?? item.scheduledAt
          : item.createdAt ?? item.scheduledAt
      );
      return {
        item,
        time: time?.getTime() ?? 0,
        priority: item.status === "closed" ? 1 : 0,
      };
    })
    .sort((a, b) => (b.time - a.time) || (b.priority - a.priority))[0]?.item;

  if (!latest) return fallback ?? "none";
  if (latest.status === "planned") return "in_progress";
  return latest.result === "success" ? "success" : "refused";
};

const formatDate = (value?: Date | string | null) => {
  const date = toDate(value);
  return date ? format(date, "dd.MM.yyyy") : "—";
};

const formatDateTime = (value?: Date | string | null) => {
  const date = toDate(value);
  return date ? format(date, "dd.MM.yyyy, HH:mm") : "—";
};

const capitalizeFirstLetter = (value: string) =>
  value ? `${value.charAt(0).toUpperCase()}${value.slice(1)}` : value;

const formatDayLabel = (value?: Date | string | null) => {
  const date = toDate(value);
  return date ? capitalizeFirstLetter(format(date, "EEEE, d MMMM", { locale: ru })) : "—";
};

const formatClockTime = (value?: Date | string | null) => {
  const date = toDate(value);
  return date ? format(date, "H:mm") : "—";
};

const formatAmount = (value?: number | null) => {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(value);
};

const normalizeDocumentName = (value?: string) => {
  const trimmed = (value ?? "").trim();
  if (!trimmed) return "document.txt";
  return trimmed.replace(/[\\/:*?"<>|]+/g, "_");
};

const isDocumentUrl = (value: string) => /^https?:\/\//i.test(value) || value.startsWith("/");

const getDocumentMeta = (value: string) => {
  const name = value.toLowerCase();
  const ext = name.includes(".") ? name.split(".").pop() ?? "" : "";
  const has = (keys: string[]) => keys.some((key) => name.includes(key));

  if (["xls", "xlsx", "csv"].includes(ext) || has(["excel", "xls"])) {
    return { icon: FileSpreadsheet, label: "XLS", className: "deal-doc deal-doc--sheet" };
  }
  if (["doc", "docx", "rtf"].includes(ext) || has(["word", "doc"])) {
    return { icon: FileText, label: "DOC", className: "deal-doc deal-doc--doc" };
  }
  if (["pdf"].includes(ext) || has(["pdf"])) {
    return { icon: FileText, label: "PDF", className: "deal-doc deal-doc--pdf" };
  }
  if (["ppt", "pptx", "key"].includes(ext) || has(["ppt", "presentation"])) {
    return { icon: FileText, label: "PPT", className: "deal-doc deal-doc--ppt" };
  }
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp"].includes(ext) || has(["jpg", "png", "image"])) {
    return { icon: FileImage, label: "IMG", className: "deal-doc deal-doc--image" };
  }
  if (["zip", "rar", "7z"].includes(ext)) {
    return { icon: FileText, label: "ZIP", className: "deal-doc deal-doc--archive" };
  }
  return { icon: FileText, label: ext ? ext.toUpperCase().slice(0, 4) : "FILE", className: "deal-doc" };
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

    const createdAt = addDays(new Date(), -Math.floor(Math.random() * 365));
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
      status: "none",
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
      createdAt,
      starred: randomBool(0.25),
      contacts,
      communications: [],
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
  const latest = sorted[0];
  const text = latest?.text?.trim();
  if (text) return text;
  if (latest?.attachments?.length) {
    return latest.attachments.length === 1
      ? latest.attachments[0]?.name ?? "Вложение"
      : `Вложения (${latest.attachments.length})`;
  }
  return "—";
};

const mapClientFromStore = (
  client: Client,
  employees: { id: string; name: string }[]
): ClientRecord => {
  const responsibleName =
    employees.find((emp) => emp.id === (client.responsibleId || client.managerId))?.name || "—";
  const communicationStatus = deriveCommunicationStatus(
    client.communications,
    client.communicationStatus ?? "none"
  );
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
    status: communicationStatus,
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
    createdAt: client.createdAt,
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

const sortClients = (clients: ClientRecord[]) => {
  return [...clients].sort((a, b) => {
    const starredDiff = Number(Boolean(b.starred)) - Number(Boolean(a.starred));
    if (starredDiff !== 0) return starredDiff;
    const timeA = toDate(a.createdAt)?.getTime() ?? 0;
    const timeB = toDate(b.createdAt)?.getTime() ?? 0;
    if (timeA !== timeB) return timeB - timeA;
    return a.name.localeCompare(b.name);
  });
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
  const directoryActivities = useDirectoryStore((state) => state.directories.activity);
  const directoryProducts = useDirectoryStore((state) => state.directories.product);
  const directoryRegions = useDirectoryStore((state) => state.directories.region);
  const directoryCities = useDirectoryStore((state) => state.directories.city);

  const employeesList = useMemo(
    () => employees.map((emp) => ({ id: emp.id, name: emp.name })),
    [employees]
  );

  const [mockClients, setMockClients] = useState<ClientRecord[]>([]);
  useEffect(() => {
    setMockClients(buildMockClients(0, employeesList));
  }, [employeesList]);

  const allClients = useMemo(() => {
    const mapped = storeClients.map((client) => mapClientFromStore(client, employeesList));
    return [...mapped, ...mockClients];
  }, [storeClients, employeesList, mockClients]);

  const [baseFilter, setBaseFilter] = useState<"all" | "mine" | "favorites">(
    isDirector ? "all" : "mine"
  );
  const [communicationFilter, setCommunicationFilter] = useState<ClientFilterKey[]>([]);
  const [typeFilter, setTypeFilter] = useState<ClientType[]>([]);
  const [activityFilter, setActivityFilter] = useState<string | "all">("all");
  const [productFilter, setProductFilter] = useState<string[]>([]);
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
      communication: true,
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

  const resetClientFilters = () => {
    setCommunicationFilter([]);
    setTypeFilter([]);
    setActivityFilter("all");
    setProductFilter([]);
    setRegionFilter("all");
    setCityFilter("all");
    setSearchQuery("");
  };

  const scopedClients = useMemo(() => {
    return allClients.filter((client) => {
      if (baseFilter === "favorites" && !client.starred) return false;
      if (baseFilter === "mine" && client.ownerId !== currentUserId) return false;
      if (typeFilter.length && (!client.clientType || !typeFilter.includes(client.clientType))) {
        return false;
      }
      if (activityFilter !== "all" && client.activityType !== activityFilter) return false;
      if (productFilter.length && !productFilter.includes(client.productCategory ?? "")) return false;
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
    typeFilter,
    activityFilter,
    productFilter,
    regionFilter,
    cityFilter,
    searchQuery,
    employeesList,
    currentUserId,
  ]);

  const filteredClients = useMemo(() => {
    const next =
      communicationFilter.length === 0
        ? scopedClients
        : scopedClients.filter((client) =>
            communicationFilter.some((filter) => filterByCommunication(client, filter))
          );
    return sortClients(next);
  }, [scopedClients, communicationFilter]);

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
      today: scopedClients.filter((client) => filterByCommunication(client, "today")).length,
      overdue: scopedClients.filter((client) => filterByCommunication(client, "overdue")).length,
      planned: scopedClients.filter((client) => filterByCommunication(client, "planned")).length,
      none: scopedClients.filter((client) => filterByCommunication(client, "none")).length,
      refused: scopedClients.filter((client) => filterByCommunication(client, "refused")).length,
      in_progress: scopedClients.filter((client) => filterByCommunication(client, "in_progress")).length,
      success: scopedClients.filter((client) => filterByCommunication(client, "success")).length,
    };
  }, [allClients, scopedClients, currentUserId]);

  const activityOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...directoryActivities,
          ...allClients.map((client) => client.activityType).filter(Boolean),
        ])
      ) as string[],
    [allClients, directoryActivities]
  );

  const productOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...directoryProducts,
          ...allClients.map((client) => client.productCategory).filter(Boolean),
        ])
      ) as string[],
    [allClients, directoryProducts]
  );

  const regionOptions = useMemo(
    () =>
      Array.from(
        new Set([...directoryRegions, ...allClients.map((client) => client.region).filter(Boolean)])
      ) as string[],
    [allClients, directoryRegions]
  );

  const cityOptions = useMemo(
    () =>
      Array.from(
        new Set([...directoryCities, ...allClients.map((client) => client.city).filter(Boolean)])
      ) as string[],
    [allClients, directoryCities]
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
              className="clients-icon-btn h-8 w-8 rounded-full flex items-center justify-center"
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
            className="clients-icon-btn h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground"
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
            className="clients-icon-btn h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground"
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
          id: "communication",
          header: () => <span className="table-head-text">Коммуникация</span>,
          cell: ({ row }) => {
            const client = row.original;
            const status = client.status ?? "none";
            const note = (client.communicationNote || "").trim();
            const communications = client.communications ?? [];
            let primaryKind: ClientCommunicationRecord["kind"] | undefined;
            let primaryTime: Date | null = null;
            let refusalLabel = "";
            if (communications.length) {
              const plannedWithTime = communications
                .filter((item) => item.status === "planned")
                .map((item) => ({ item, time: toDate(item.scheduledAt) }))
                .filter((entry) => entry.time) as { item: ClientCommunicationRecord; time: Date }[];
              plannedWithTime.sort((a, b) => a.time.getTime() - b.time.getTime());
              const nextPlanned = plannedWithTime[0];

              const closedWithTime = communications
                .filter((item) => item.status === "closed")
                .map((item) => ({ item, time: toDate(item.closedAt ?? item.scheduledAt) }))
                .filter((entry) => entry.time) as { item: ClientCommunicationRecord; time: Date }[];
              closedWithTime.sort((a, b) => b.time.getTime() - a.time.getTime());
              const lastClosed = closedWithTime[0];
              if (lastClosed?.item.result === "failed" && lastClosed.item.reason) {
                refusalLabel =
                  communicationReasonLabel[lastClosed.item.reason] ?? lastClosed.item.reason;
              }

              const primary =
                status === "in_progress"
                  ? nextPlanned ?? lastClosed
                  : lastClosed ?? nextPlanned;
              primaryKind = primary?.item.kind;
              primaryTime = primary?.time ?? null;
            }
            const KindIcon =
              primaryKind === "call"
                ? PhoneCall
                : primaryKind === "meeting"
                ? Users
                : MessageCircle;
            const timeLabel =
              primaryTime ??
              (status === "in_progress" ? toDate(client.nextCommunicationAt ?? null) : null) ??
              toDate(client.lastCommunicationAt ?? null);
            const refusalNote = refusalLabel ? `Отказ: ${refusalLabel}` : "";
            const noteValue = refusalNote
              ? note
                ? `${note} · ${refusalNote}`
                : refusalNote
              : note;
            return (
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "inline-flex min-w-max items-center whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-semibold leading-none",
                      communicationStatusTone[status]
                    )}
                  >
                    {communicationStatusLabel[status]}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-foreground/70 whitespace-nowrap">
                    <KindIcon className="h-3.5 w-3.5 text-slate-400" />
                    {formatDateTime(timeLabel)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground line-clamp-2">
                  {noteValue || "—"}
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
      <div className={cn("clients-layout min-h-full", filtersOpen && "is-open")}>
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
                    onClick={() => {
                      setBaseFilter("all");
                      resetClientFilters();
                    }}
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
              onSelect={(key) =>
                setCommunicationFilter((prev) =>
                  prev.includes(key as ClientFilterKey)
                    ? prev.filter((item) => item !== (key as ClientFilterKey))
                    : [...prev, key as ClientFilterKey]
                )
              }
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
              onSelect={(key) =>
                setTypeFilter((prev) =>
                  prev.includes(key as ClientType)
                    ? prev.filter((item) => item !== (key as ClientType))
                    : [...prev, key as ClientType]
                )
              }
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
              onSelect={(key) =>
                setProductFilter((prev) =>
                  prev.includes(key)
                    ? prev.filter((item) => item !== key)
                    : [...prev, key]
                )
              }
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

        <section className="clients-main flex min-h-0 min-w-0 flex-col gap-4 relative">
          <div className="glass-card rounded-[22px] p-4 overflow-hidden relative flex min-h-0 flex-1 flex-col animate-fade-up">
            <div
              ref={tableContainerRef}
              className="flex-1 min-h-0 w-full min-w-0 overflow-x-auto overflow-y-auto floating-scrollbar"
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
  const entries = useMemo(() => {
    const next: { key: string; label: string; phone: string }[] = [];

    contacts.forEach((contact) => {
      const label = [contact.name, contact.position].filter(Boolean).join(" | ") || "—";
      const phones = (contact.phones ?? []).filter(Boolean);

      if (phones.length) {
        phones.forEach((phone, index) => {
          next.push({ key: `${contact.id}-${index}`, label, phone });
        });
        return;
      }

      next.push({ key: `${contact.id}-0`, label, phone: "—" });
    });

    return next;
  }, [contacts]);

  const previewEntry = entries[0];
  const extraCount = Math.max(0, entries.length - 1);
  const canOpen = extraCount > 0;
  const hasContacts = entries.length > 0;
  const cellRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [popoverSize, setPopoverSize] = useState({ w: 280, h: 180 });

    const toggleOpen = () => {
      if (!hasContacts || !canOpen) return;
      if (isOpen) {
        onClose();
      } else {
        onOpen();
      }
    };

    useLayoutEffect(() => {
      if (!isOpen || !hasContacts || !canOpen || !popoverRef.current) return;
      const rect = popoverRef.current.getBoundingClientRect();
      if (rect.width && rect.height) {
        setPopoverSize({ w: rect.width, h: rect.height });
      }
    }, [isOpen, hasContacts, canOpen, entries.length]);

    useLayoutEffect(() => {
      if (!isOpen || !hasContacts || !canOpen || !listRef.current) return;
      const listEl = listRef.current;
      const firstItem = listEl.querySelector<HTMLElement>(".contacts-popover__item");
      if (!firstItem) return;
      const itemHeight = firstItem.getBoundingClientRect().height;
      if (!itemHeight) return;
      const gap = 8;
      const maxHeight = itemHeight * 3 + gap * 2;
      listEl.style.setProperty("--contacts-list-max-height", `${Math.round(maxHeight)}px`);
    }, [isOpen, hasContacts, canOpen, entries.length]);

    useEffect(() => {
      if (!isOpen || !hasContacts || !canOpen) return;
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
    }, [isOpen, hasContacts, canOpen, onClose]);

    useEffect(() => {
      if (!isOpen || !hasContacts || !canOpen) return;
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") onClose();
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, hasContacts, canOpen, onClose]);

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
      left = triggerRect.left;
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
          className={cn("contacts-preview", isOpen && "is-open", !canOpen && "is-disabled")}
          onClick={(event) => {
            event.stopPropagation();
            if (!canOpen) return;
            toggleOpen();
          }}
          aria-expanded={isOpen}
        >
          <span className="contacts-preview__tag" title={previewEntry?.label ?? "—"}>
            {previewEntry?.label ?? "—"}
          </span>
          <span className="contacts-preview__phone-row">
            <span className="contacts-preview__phone-number">{previewEntry?.phone ?? "—"}</span>
            {extraCount > 0 && (
              <span className="contacts-preview__count">
                +{extraCount}
                <ChevronDown className="h-3 w-3" aria-hidden="true" />
              </span>
            )}
          </span>
        </button>
        {isOpen && canOpen && typeof document !== "undefined"
          ? createPortal(
              <div
                ref={popoverRef}
                className="contacts-popover"
                data-side={side}
                style={popoverStyle}
              >
                <div ref={listRef} className="contacts-popover__list">
                  {entries.map((entry) => (
                    <div key={entry.key} className="contacts-popover__item">
                      <span className="contacts-popover__tag" title={entry.label}>
                        {entry.label}
                      </span>
                      <span className="contacts-popover__item-phone">{entry.phone}</span>
                    </div>
                  ))}
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
  activeKey: string | "all" | string[];
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
              active={Array.isArray(activeKey) ? activeKey.includes(item.key) : activeKey === item.key}
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

const FieldWithIcon = ({
  icon: Icon,
  children,
}: {
  icon: typeof Users;
  children: ReactNode;
}) => (
  <div className="relative">
    <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    {children}
  </div>
);

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
  const createEmptyContact = (id?: string) => ({
    id: id ?? `contact-${Date.now()}`,
    fullName: "",
    role: "",
    phones: [] as string[],
    emails: [] as string[],
    phoneInput: "",
    emailInput: "",
  });
  const [contacts, setContacts] = useState(() => [createEmptyContact("contact-1")]);
  const safeActivities = activityOptions.length ? activityOptions : MOCK_ACTIVITIES;
  const safeProducts = productOptions.length ? productOptions : MOCK_PRODUCTS;
  const safeRegions = regionOptions.length ? regionOptions : MOCK_REGIONS;
  const safeCities = cityOptions.length ? cityOptions : MOCK_CITIES;
  const directorySourceChannels = useDirectoryStore((state) => state.directories.sourceChannel);
  const sourceChannelOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...directorySourceChannels,
          ...SOURCE_CHANNELS,
          ...(form.sourceChannel ? [form.sourceChannel] : []),
        ])
      ),
    [directorySourceChannels, form.sourceChannel]
  );

  const updateContact = (id: string, updater: (contact: typeof contacts[number]) => typeof contacts[number]) => {
    setContacts((prev) => prev.map((contact) => (contact.id === id ? updater(contact) : contact)));
  };

  const addContactPhone = (id: string) => {
    updateContact(id, (contact) => {
      const value = contact.phoneInput.trim();
      if (!value) return contact;
      if (contact.phones.includes(value)) {
        return { ...contact, phoneInput: "" };
      }
      return { ...contact, phones: [...contact.phones, value], phoneInput: "" };
    });
  };

  const addContactEmail = (id: string) => {
    updateContact(id, (contact) => {
      const value = contact.emailInput.trim();
      if (!value) return contact;
      if (contact.emails.includes(value)) {
        return { ...contact, emailInput: "" };
      }
      return { ...contact, emails: [...contact.emails, value], emailInput: "" };
    });
  };

  const removeContactPhone = (id: string, phone: string) => {
    updateContact(id, (contact) => ({
      ...contact,
      phones: contact.phones.filter((item) => item !== phone),
    }));
  };

  const removeContactEmail = (id: string, email: string) => {
    updateContact(id, (contact) => ({
      ...contact,
      emails: contact.emails.filter((item) => item !== email),
    }));
  };

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
      setContacts([createEmptyContact("contact-1")]);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Добавить клиента</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FieldWithIcon icon={User}>
            <Input
              className="pl-10"
              placeholder="Название"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            />
          </FieldWithIcon>
          <div className="space-y-1">
            <FieldWithIcon icon={MapPin}>
              <Input
                className="pl-10"
                placeholder="Область"
                value={form.region}
                list="add-client-region-options"
                onChange={(event) => setForm((prev) => ({ ...prev, region: event.target.value }))}
              />
            </FieldWithIcon>
            <datalist id="add-client-region-options">
              {safeRegions.map((option) => (
                <option key={option} value={option} />
              ))}
            </datalist>
          </div>
          <FieldWithIcon icon={Building2}>
            <Select value={form.city} onValueChange={(value) => setForm((prev) => ({ ...prev, city: value }))}>
              <SelectTrigger className="pl-10">
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
          </FieldWithIcon>
          <FieldWithIcon icon={Briefcase}>
            <Select
              value={form.activityType}
              onValueChange={(value) => setForm((prev) => ({ ...prev, activityType: value }))}
            >
              <SelectTrigger className="pl-10">
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
          </FieldWithIcon>
          <FieldWithIcon icon={Package}>
            <Select
              value={form.productCategory}
              onValueChange={(value) => setForm((prev) => ({ ...prev, productCategory: value }))}
            >
              <SelectTrigger className="pl-10">
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
          </FieldWithIcon>
          <FieldWithIcon icon={Mail}>
            <Input
              className="pl-10"
              placeholder="Почта"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
            />
          </FieldWithIcon>
          <FieldWithIcon icon={Globe}>
            <Input
              className="pl-10"
              placeholder="Сайт"
              value={form.website}
              onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))}
            />
          </FieldWithIcon>
          <FieldWithIcon icon={Megaphone}>
            <Select
              value={form.sourceChannel}
              onValueChange={(value) => setForm((prev) => ({ ...prev, sourceChannel: value }))}
            >
              <SelectTrigger className="pl-10">
                <SelectValue placeholder="Канал привлечения" />
              </SelectTrigger>
              <SelectContent>
                {sourceChannelOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldWithIcon>
          <FieldWithIcon icon={Users}>
            <Select
              value={form.clientType}
              onValueChange={(value) => setForm((prev) => ({ ...prev, clientType: value as ClientType }))}
            >
              <SelectTrigger className="pl-10">
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
          </FieldWithIcon>
        </div>
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Users className="h-4 w-4 text-primary" />
              Контактные лица
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="gap-1"
              onClick={() =>
                setContacts((prev) => [...prev, createEmptyContact()])
              }
            >
              <Plus className="h-4 w-4" />
              Добавить контакт
            </Button>
          </div>
          <div className="space-y-3">
            {contacts.map((contact, index) => (
              <div key={contact.id} className="rounded-2xl border border-slate-200/60 bg-white/70 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">
                    Контакт {index + 1}
                  </p>
                  {contacts.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-muted-foreground"
                      onClick={() => setContacts((prev) => prev.filter((item) => item.id !== contact.id))}
                    >
                      <Trash2 className="h-4 w-4" />
                      Удалить
                    </Button>
                  )}
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FieldWithIcon icon={User}>
                    <Input
                      className="pl-10"
                      placeholder="ФИО"
                      value={contact.fullName}
                      onChange={(event) =>
                        updateContact(contact.id, (item) => ({ ...item, fullName: event.target.value }))
                      }
                    />
                  </FieldWithIcon>
                  <FieldWithIcon icon={Briefcase}>
                    <Select
                      value={contact.role}
                      onValueChange={(value) =>
                        updateContact(contact.id, (item) => ({ ...item, role: value }))
                      }
                    >
                      <SelectTrigger className="pl-10">
                        <SelectValue placeholder="Должность" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTACT_POSITIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FieldWithIcon>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FieldWithIcon icon={Phone}>
                        <Input
                          className="pl-10"
                          placeholder="Телефон"
                          value={contact.phoneInput}
                          onChange={(event) =>
                            updateContact(contact.id, (item) => ({ ...item, phoneInput: event.target.value }))
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addContactPhone(contact.id);
                            }
                          }}
                        />
                      </FieldWithIcon>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={() => addContactPhone(contact.id)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {contact.phones.length === 0 && (
                        <span className="text-xs text-muted-foreground">Телефоны не добавлены</span>
                      )}
                      {contact.phones.map((phone) => (
                        <span
                          key={phone}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600 shadow-sm"
                        >
                          <Phone className="h-3 w-3 text-slate-400" />
                          {phone}
                          <button
                            type="button"
                            className="text-slate-400 transition hover:text-slate-600"
                            onClick={() => removeContactPhone(contact.id, phone)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <FieldWithIcon icon={Mail}>
                        <Input
                          className="pl-10"
                          placeholder="Email"
                          value={contact.emailInput}
                          onChange={(event) =>
                            updateContact(contact.id, (item) => ({ ...item, emailInput: event.target.value }))
                          }
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              addContactEmail(contact.id);
                            }
                          }}
                        />
                      </FieldWithIcon>
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        onClick={() => addContactEmail(contact.id)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {contact.emails.length === 0 && (
                        <span className="text-xs text-muted-foreground">Email не добавлены</span>
                      )}
                      {contact.emails.map((email) => (
                        <span
                          key={email}
                          className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-0.5 text-xs text-slate-600 shadow-sm"
                        >
                          <Mail className="h-3 w-3 text-slate-400" />
                          {email}
                          <button
                            type="button"
                            className="text-slate-400 transition hover:text-slate-600"
                            onClick={() => removeContactEmail(contact.id, email)}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                {index === 0 && (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Добавляйте телефоны и email через кнопку “плюс” или Enter.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="destructive" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            variant="default"
            onClick={() => {
              const normalizedContacts = contacts
                .map((contact) => ({
                  id: contact.id,
                  name: contact.fullName,
                  position: contact.role,
                  phones: contact.phones.map((item) => item.trim()).filter(Boolean),
                  emails: contact.emails.map((item) => item.trim()).filter(Boolean),
                }))
                .filter(
                  (contact) =>
                    contact.name ||
                    contact.position ||
                    contact.phones.length > 0 ||
                    contact.emails.length > 0
                );
              const primaryPhone = normalizedContacts[0]?.phones?.[0] ?? "";
              onCreate({
                name: form.name,
                phone: primaryPhone,
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
                contacts: normalizedContacts,
                communications: [],
                deals: [],
                comments: [],
                allowManagerDeleteComments: false,
                notes: "",
              });
            }}
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
  const buildEmptyDealForm = (stage: DealStage = "deal"): DealFormState => ({
    createdAt: format(new Date(), "yyyy-MM-dd"),
    title: "",
    unit: "",
    qty: "",
    price: "",
    amount: "",
    declarationNumber: "",
    recipientName: "",
    recipientPhone: "",
    recipientCity: "",
    recipientOffice: "",
    documents: "",
    comment: "",
    stage,
  });
  const activeClient = client ?? ({} as ClientRecord);

  const [comments, setComments] = useState(activeClient.comments ?? []);
  const [commentInput, setCommentInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<MessageAttachment[]>([]);
  const [replyToMessage, setReplyToMessage] = useState<MessageReply | null>(null);
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
  const [commType, setCommType] = useState<"call" | "meeting">("call");
  const [commStatus, setCommStatus] = useState<CommunicationFormStatus>("planned");
  const [commFailReason, setCommFailReason] = useState("");
  const [commFollowUpEnabled, setCommFollowUpEnabled] = useState(false);
  const [closingCommId, setClosingCommId] = useState<string | null>(null);
  const [closingResult, setClosingResult] = useState<CommunicationResult | null>(null);
  const [closingReason, setClosingReason] = useState("");
  const [reminderAt, setReminderAt] = useState<Date | null>(activeClient.reminderAt ?? null);
  const [dealList, setDealList] = useState(activeClient.deals ?? []);
  const [dealFormOpen, setDealFormOpen] = useState(false);
  const [editingDealId, setEditingDealId] = useState<string | null>(null);
  const [dealForm, setDealForm] = useState<DealFormState>(() => buildEmptyDealForm("deal"));
  const dealFileInputRef = useRef<HTMLInputElement | null>(null);
  const [commHistoryOpen, setCommHistoryOpen] = useState(true);
  const [commFormOpen, setCommFormOpen] = useState(false);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const popoverBoundaryRef = useRef<HTMLDivElement | null>(null);
  const chatFileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open || !client) return;
    setComments(client.comments ?? []);
    setCommentInput("");
    setPendingAttachments([]);
    setReplyToMessage(null);
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
    setCommType("call");
    setCommStatus("planned");
    setCommFailReason("");
    setCommFollowUpEnabled(false);
    setClosingCommId(null);
    setClosingResult(null);
    setClosingReason("");
    setReminderAt(client.reminderAt ?? null);
    setDealList(client.deals ?? []);
    setDealForm(buildEmptyDealForm((initialTab ?? "deals") === "quotes" ? "quote" : "deal"));
    setDealFormOpen(false);
    setEditingDealId(null);
    setCommHistoryOpen(true);
    setCommFormOpen(false);
    setActiveContactId((client.contacts ?? [])[0]?.id ?? null);
  }, [client, open, initialTab]);

  const metaLine = [draft.company, draft.city, draft.region].filter(Boolean).join(" • ");
  const contactList = draft.contacts ?? [];
  const responsible = employees.find(
    (emp) => emp.id === (draft.responsibleId || client.responsibleId || client.ownerId)
  );
  const directorySourceChannels = useDirectoryStore((state) => state.directories.sourceChannel);
  const sourceChannelOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...directorySourceChannels,
          ...SOURCE_CHANNELS,
          ...(draft.sourceChannel ? [draft.sourceChannel] : []),
        ])
      ),
    [directorySourceChannels, draft.sourceChannel]
  );

  useEffect(() => {
    if (!contactList.length) {
      setActiveContactId(null);
      return;
    }
    // Keep the view collapsible: if user closed the active contact (activeContactId === null),
    // do not auto-open the first contact again.
    if (activeContactId === null) return;
    if (contactList.some((contact) => contact.id === activeContactId)) return;
    setActiveContactId(contactList[0]?.id ?? null);
  }, [activeContactId, contactList]);

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
    items: { id: string; text: string; createdAt: Date; attachments?: MessageAttachment[] }[]
  ) => {
    if (!items.length) return "—";
    const sorted = [...items].sort(
      (a, b) =>
        (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0)
    );
    const latest = sorted[0];
    const text = latest?.text?.trim();
    if (text) return text;
    if (latest?.attachments?.length) {
      return latest.attachments.length === 1
        ? latest.attachments[0]?.name
        : `Вложения (${latest.attachments.length})`;
    }
    return "—";
  };

  const formatFileSize = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  };

  const getReplyPreviewText = (message: {
    text?: string;
    attachments?: MessageAttachment[];
  }) => {
    const text = message.text?.trim();
    if (text) return text;
    if (message.attachments?.length) {
      return message.attachments.length === 1
        ? message.attachments[0]?.name ?? ""
        : `Вложения (${message.attachments.length})`;
    }
    return "";
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
    if (!text && pendingAttachments.length === 0) return;
    const next = {
      id: `comment-${Date.now()}`,
      text,
      createdAt: new Date(),
      authorId: currentUserId,
      authorName: currentUserName,
      attachments: pendingAttachments.length ? pendingAttachments : undefined,
      replyTo: replyToMessage ? { ...replyToMessage } : undefined,
    };
    persistComments([next, ...comments]);
    setCommentInput("");
    setPendingAttachments([]);
    setReplyToMessage(null);
  };

  const handleAttachFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const timestamp = Date.now();
    const next = files.map((file, index) => ({
      id: `file-${timestamp}-${index}`,
      name: file.name,
      size: file.size,
      type: file.type,
    }));
    setPendingAttachments((prev) => [...prev, ...next]);
    event.target.value = "";
  };

  const handleRemoveAttachment = (id: string) => {
    setPendingAttachments((prev) => prev.filter((item) => item.id !== id));
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

  const handleEditDeal = (
    deal: NonNullable<ClientRecord["deals"]>[number],
    stageOverride?: DealStage
  ) => {
    setActiveTab("deals");
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
      recipientCity: deal.recipientCity ?? "",
      recipientOffice: deal.recipientOffice ?? "",
      documents: (deal.documents ?? []).join(", "),
      comment: deal.comment ?? "",
      stage: stageOverride ?? deal.stage ?? "deal",
    });
  };

  const handleDeleteDeal = (id: string) => {
    persistDeals(dealList.filter((deal) => deal.id !== id));
  };

  const handleMoveDealStage = (id: string, stage: DealStage) => {
    const nextDeals = dealList.map((deal) => (deal.id === id ? { ...deal, stage } : deal));
    persistDeals(nextDeals);
    setActiveTab(stage === "deal" ? "deals" : "quotes");
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
      stage: dealForm.stage ?? "deal",
      createdAt,
      title: dealForm.title.trim(),
      unit: dealForm.unit.trim() || "шт.",
      qty,
      price,
      amount,
      declarationNumber: dealForm.declarationNumber.trim() || undefined,
      recipientName: dealForm.recipientName.trim() || undefined,
      recipientPhone: dealForm.recipientPhone.trim() || undefined,
      recipientCity: dealForm.recipientCity.trim() || undefined,
      recipientOffice: dealForm.recipientOffice.trim() || undefined,
      documents,
      comment: dealForm.comment.trim() || undefined,
    };

    const nextDeals = editingDealId
      ? dealList.map((deal) => (deal.id === editingDealId ? nextDeal : deal))
      : [nextDeal, ...dealList];

    persistDeals(nextDeals);
    setDealForm(buildEmptyDealForm(activeTab === "quotes" ? "quote" : "deal"));
    setDealFormOpen(false);
    setEditingDealId(null);
  };

  const handleCancelDealForm = () => {
    setDealForm(buildEmptyDealForm(activeTab === "quotes" ? "quote" : "deal"));
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

  const createDocumentBlob = (name: string) =>
    new Blob([`Файл: ${name}\n\nСодержимое не прикреплено в демо-режиме.`], {
      type: "text/plain;charset=utf-8",
    });

  const handlePreviewDocument = (name: string) => {
    const safeName = normalizeDocumentName(name);
    if (isDocumentUrl(name)) {
      window.open(name, "_blank", "noopener,noreferrer");
      return;
    }
    const url = URL.createObjectURL(createDocumentBlob(safeName));
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
  };

  const handleDownloadDocument = (name: string) => {
    const safeName = normalizeDocumentName(name);
    const url = isDocumentUrl(name) ? name : URL.createObjectURL(createDocumentBlob(safeName));
    const link = document.createElement("a");
    link.href = url;
    link.download = safeName;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    if (!isDocumentUrl(name)) {
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    }
  };

  const computeCommunicationMeta = (items: NonNullable<ClientRecord["communications"]>) => {
    const planned = items.filter((item) => item.status === "planned");
    const plannedWithDate = planned
      .map((item) => ({ item, time: toDate(item.scheduledAt) }))
      .filter((entry) => entry.time) as { item: ClientCommunicationRecord; time: Date }[];
    plannedWithDate.sort((a, b) => a.time.getTime() - b.time.getTime());
    const nextPlanned = plannedWithDate[0]?.item;
    const next = plannedWithDate[0]?.time ?? null;

    const closed = items.filter((item) => item.status === "closed");
    const closedWithTime = closed
      .map((item) => ({
        item,
        time: toDate(item.closedAt ?? item.scheduledAt),
      }))
      .filter((entry) => entry.time) as { item: ClientCommunicationRecord; time: Date }[];
    closedWithTime.sort((a, b) => b.time.getTime() - a.time.getTime());
    const lastClosed = closedWithTime[0]?.item;
    const last = lastClosed ? toDate(lastClosed.closedAt ?? lastClosed.scheduledAt) : null;

    const latestAction = items
      .map((item) => {
        const time = toDate(
          item.status === "closed"
            ? item.closedAt ?? item.createdAt ?? item.scheduledAt
            : item.createdAt ?? item.scheduledAt
        );
        return {
          item,
          time: time?.getTime() ?? 0,
          priority: item.status === "closed" ? 1 : 0,
        };
      })
      .sort((a, b) => (b.time - a.time) || (b.priority - a.priority))[0]?.item;

    let status: CommunicationStatus = "none";
    if (latestAction) {
      if (latestAction.status === "planned") status = "in_progress";
      else status = latestAction.result === "success" ? "success" : "refused";
    }

    const lastClosedNote = (lastClosed?.note ?? "").trim();
    const nextPlannedNote = (nextPlanned?.note ?? "").trim();
    const refusalReasonLabel =
      lastClosed?.result === "failed" && lastClosed.reason
        ? communicationReasonLabel[lastClosed.reason] ?? lastClosed.reason
        : "";
    const refusalNote = refusalReasonLabel ? `Отказ: ${refusalReasonLabel}` : "";
    let note =
      status === "in_progress"
        ? nextPlannedNote || lastClosedNote
        : lastClosedNote || nextPlannedNote;
    if (refusalNote) {
      note = note ? `${note} · ${refusalNote}` : refusalNote;
    }

    return { next, last, status, note };
  };

  const persistCommunications = (
    nextCommunications: NonNullable<ClientRecord["communications"]>,
    noteValue: string = commNote
  ) => {
    setCommunications(nextCommunications);
    const { next, last, status, note } = computeCommunicationMeta(nextCommunications);
    const trimmedNote = noteValue.trim();
    const nextNote = note || trimmedNote;

    if (client.id.startsWith("mock-")) {
      updateMockClient(client.id, {
        communications: nextCommunications,
        nextCommunicationAt: next,
        lastCommunicationAt: last,
        status,
        communicationNote: nextNote,
      });
    } else {
      updateClient(client.id, {
        communications: nextCommunications,
        nextContactAt: next,
        lastCommunicationAt: last,
        communicationStatus: status,
        notes: nextNote,
      });
    }

    setDraft((prev) => ({
      ...prev,
      nextCommunicationAt: next,
      lastCommunicationAt: last,
      status,
      communicationNote: nextNote,
    }));
  };

  const handleSaveCommunication = () => {
    const noteValue = commNote.trim();
    const now = new Date();
    const scheduleTime = commDate ? new Date(`${commDate}T${commTime || "09:00"}`) : null;
    const nextItems: NonNullable<ClientRecord["communications"]> = [];

    if (commStatus === "planned") {
      if (!scheduleTime) {
        toast({ title: "Выберите дату", description: "Укажите дату и время коммуникации." });
        return;
      }
      nextItems.push({
        id: `comm-${Date.now()}`,
        kind: commType,
        scheduledAt: scheduleTime,
        note: noteValue || undefined,
        status: "planned",
        createdAt: now,
      });
      persistCommunications([...nextItems, ...communications], noteValue);
      toast({ title: "Коммуникация запланирована", description: formatDateTime(scheduleTime) });
      return;
    }

    if (commStatus === "failed" && !commFailReason) {
      toast({ title: "Укажите причину", description: "Выберите причину отказа." });
      return;
    }

    nextItems.push({
      id: `comm-${Date.now()}`,
      kind: commType,
      scheduledAt: now,
      note: noteValue || undefined,
      status: "closed",
      result: commStatus === "success" ? "success" : "failed",
      reason: commStatus === "failed" ? commFailReason : undefined,
      createdAt: now,
      closedAt: now,
    });

    if (commFollowUpEnabled) {
      if (!scheduleTime) {
        toast({ title: "Выберите дату", description: "Укажите дату и время повторного контакта." });
        return;
      }
      nextItems.unshift({
        id: `comm-${Date.now()}-next`,
        kind: commType,
        scheduledAt: scheduleTime,
        note: undefined,
        status: "planned",
        createdAt: now,
      });
    }

    persistCommunications([...nextItems, ...communications], noteValue);
    if (commStatus === "failed" && commFailReason) {
      const reasonLabel = communicationReasonLabel[commFailReason] ?? commFailReason;
      const nextComment = {
        id: `comment-${Date.now()}`,
        text: `Отказ: ${reasonLabel}`,
        createdAt: new Date(),
        authorId: currentUserId,
        authorName: currentUserName,
      };
      persistComments([nextComment, ...comments]);
    }
    toast({
      title: "Коммуникация сохранена",
      description: commStatus === "success" ? "Завершено удачно" : "Завершено неудачно",
    });
  };

  const handleClearCommunicationForm = () => {
    setCommNote("");
    setCommDate(format(new Date(), "yyyy-MM-dd"));
    setCommTime("09:00");
    setCommType("call");
    setCommStatus("planned");
    setCommFailReason("");
    setCommFollowUpEnabled(false);
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
    const closedAt = new Date();
    const nextList = communications.map((item) => {
      if (item.id !== closingCommId) return item;
      return {
        ...item,
        status: "closed" as const,
        result: closingResult,
        reason: closingResult === "failed" ? closingReason : undefined,
        closedAt,
      };
    });
    persistCommunications(nextList);
    if (closingResult === "failed" && closingReason) {
      const reasonLabel = communicationReasonLabel[closingReason] ?? closingReason;
      const nextComment = {
        id: `comment-${Date.now()}`,
        text: `Отказ: ${reasonLabel}`,
        createdAt: closedAt,
        authorId: currentUserId,
        authorName: currentUserName,
      };
      persistComments([nextComment, ...comments]);
    }
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

  const nextPlannedCommunication = useMemo(() => {
    const planned = communications.filter((item) => item.status === "planned");
    if (!planned.length) return null;
    return [...planned].sort(
      (a, b) =>
        (toDate(a.scheduledAt)?.getTime() ?? 0) - (toDate(b.scheduledAt)?.getTime() ?? 0)
    )[0]!;
  }, [communications]);

  const primaryCommunication = nextPlannedCommunication ?? sortedCommunications[0] ?? null;
  const primaryCommunicationDate = toDate(primaryCommunication?.scheduledAt ?? null);
  const primaryCommunicationStatusLabel = primaryCommunication
    ? primaryCommunication.status === "planned"
      ? "Запланирована"
      : primaryCommunication.result === "success"
      ? "Завершено удачно"
      : "Завершено неудачно"
    : "Без коммуникации";
  const primaryCommunicationStatusClass = primaryCommunication
    ? primaryCommunication.status === "planned"
      ? "bg-amber-100 text-amber-700"
      : primaryCommunication.result === "success"
      ? "bg-emerald-100 text-emerald-700"
      : "bg-rose-100 text-rose-700"
    : "bg-slate-100 text-slate-500";
  const primaryCommunicationNote = (primaryCommunication?.note || "").trim();
  const hasCommunications = Boolean(primaryCommunication);

  const chatTimeline = useMemo(() => {
    // Newest -> oldest (latest on top)
    const sorted = [...comments].sort(
      (a, b) => (toDate(b.createdAt)?.getTime() ?? 0) - (toDate(a.createdAt)?.getTime() ?? 0)
    );
    const result: Array<
      | { type: "day"; id: string; label: string }
      | { type: "msg"; id: string; msg: (typeof sorted)[number] }
    > = [];
    let lastLabel = "";

    sorted.forEach((msg) => {
      const label = formatDayLabel(msg.createdAt);
      if (label && label !== lastLabel) {
        result.push({ type: "day", id: `day-${label}`, label });
        lastLabel = label;
      }
      result.push({ type: "msg", id: msg.id, msg });
    });

    return result;
  }, [comments]);

  const quotesList = useMemo(
    () => dealList.filter((deal) => !deal.stage || deal.stage === "quote"),
    [dealList]
  );
  const dealsList = useMemo(
    () => dealList.filter((deal) => !deal.stage || deal.stage === "deal"),
    [dealList]
  );

  const renderDealDocuments = (documents?: string[]) => {
    const docs = (documents ?? []).map((doc) => doc.trim()).filter(Boolean);
    if (!docs.length) {
      return <span className="text-xs text-muted-foreground">—</span>;
    }
    const maxVisible = 4;
    const visibleDocs = docs.slice(0, maxVisible);
    const extraCount = docs.length - visibleDocs.length;

    return (
      <div className="deal-docs">
        {visibleDocs.map((doc, index) => {
          const meta = getDocumentMeta(doc);
          const Icon = meta.icon;
          return (
            <DropdownMenu key={`${doc}-${index}`}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={meta.className}
                  data-doc-name={doc}
                  title={doc}
                  aria-label={`Документ: ${doc}`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="deal-doc-label">{meta.label}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-40">
                <DropdownMenuItem onClick={() => handlePreviewDocument(doc)}>
                  Просмотреть
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownloadDocument(doc)}>
                  Скачать
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        })}
        {extraCount > 0 && (
          <span className="deal-docs-more" title={`Еще ${extraCount}`}>
            +{extraCount}
          </span>
        )}
      </div>
    );
  };

  const DealCarrierCard = ({
    declarationNumber,
    recipientName,
    recipientPhone,
    recipientCity,
    recipientOffice,
    senderName,
    originCity,
    amount,
    qty,
    createdAt,
  }: {
    declarationNumber?: string;
    recipientName?: string;
    recipientPhone?: string;
    recipientCity?: string;
    recipientOffice?: string;
    senderName?: string;
    originCity?: string;
    amount?: number;
    qty?: number;
    createdAt?: Date;
  }) => (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] border border-slate-200 bg-white text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.08)] transition hover:bg-slate-50"
          aria-label="Данные получателя"
          onClick={(event) => event.stopPropagation()}
        >
          <img
            src="/(20260211052550).png"
            alt="Почтовый оператор"
            className="h-4 w-4 object-contain"
            loading="lazy"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={12}
        alignOffset={-94}
        container={popoverBoundaryRef.current ?? undefined}
        collisionBoundary={popoverBoundaryRef.current ?? undefined}
        collisionPadding={16}
        sticky="always"
        avoidCollisions
        className="box-border !w-[314px] !min-w-[314px] !max-w-[314px] rounded-[18px] border border-slate-200 bg-white p-4 shadow-[0_18px_36px_rgba(15,23,42,0.16)]"
        style={{ width: 314, minWidth: 314, maxWidth: 314 }}
      >
        {(() => {
          const fallbackCity = recipientCity || "Киев";
          const fallbackOffice = recipientOffice || "Отделение №3";
          const fallbackSender = senderName || "—";
          const routeLabel = originCity ? `${originCity} → ${fallbackCity}` : fallbackCity;
          const weightValue =
            typeof qty === "number" && Number.isFinite(qty)
              ? `${Math.max(0.1, Math.round((qty / 1000) * 10) / 10)} кг`
              : "1.2 кг";
          const declaredValue =
            typeof amount === "number" && Number.isFinite(amount) && amount > 0
              ? `${formatAmount(amount)} грн`
              : "12 500 грн";
          const deliveryCost =
            typeof amount === "number" && Number.isFinite(amount) && amount > 0
              ? `${Math.max(30, Math.round(amount * 0.02))} грн`
              : "120 грн";
          const statusSteps = [
            { key: "created", label: "Создана накладная", icon: FileText },
            { key: "in_transit", label: "В пути", icon: Truck },
            { key: "arrived", label: "Прибыло в отделение", icon: MapPin },
            { key: "received", label: "Получено", icon: CheckCircle2 },
          ];
          const seedRaw = declarationNumber?.replace(/\D/g, "") || "1";
          const seed = Number.parseInt(seedRaw.slice(-2), 10) || 1;
          const statusIndex = Math.min(statusSteps.length - 1, seed % statusSteps.length);
          const statusLabel = statusSteps[statusIndex]?.label ?? "В пути";
          const progressValue =
            statusSteps.length > 1 ? Math.round((statusIndex / (statusSteps.length - 1)) * 100) : 0;
          const createdAtDate = toDate(createdAt ?? null) ?? new Date();
          const etaDate = addDays(createdAtDate, 2);
          const updatedAtDate = new Date();

          return (
            <div className="space-y-3">
              <div className="flex h-20 items-center justify-center rounded-[12px] bg-emerald-100/60">
              <div className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-white/70 shadow-[0_6px_14px_rgba(16,185,129,0.22)]">
                <img
                  src="/(20260211052550).png"
                  alt="Новая почта"
                  className="h-8 w-8 object-contain"
                  loading="lazy"
                />
              </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-1 text-[11px] font-semibold text-emerald-700">
                    <Truck className="h-3 w-3" />
                    {statusLabel}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                    <CalendarClock className="h-3 w-3" />
                    {formatDateTime(updatedAtDate)}
                  </span>
                </div>
                <div className="h-[6px] w-full rounded-full bg-slate-100">
                  <div
                    className="h-[6px] rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${progressValue}%` }}
                  />
                </div>
              </div>

              <div className="grid gap-2 rounded-[12px] border border-slate-200/70 bg-slate-50/60 p-2 text-[11px]">
                <div className="flex items-center gap-2 text-slate-600">
                  <MapPin className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-semibold text-slate-700">{routeLabel}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  <span>{fallbackOffice}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span>{fallbackSender}</span>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <div className="text-[11px] font-semibold text-slate-400">Получатель</div>
                  <div className="text-[13px] font-semibold text-slate-900">{recipientName || "—"}</div>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <Phone className="h-3.5 w-3.5 text-slate-400" />
                  {recipientPhone ? (
                    <>
                      <a
                        href={`tel:${recipientPhone.replace(/[^\\d+]/g, "")}`}
                        className="text-[13px] font-semibold text-slate-700"
                      >
                        {recipientPhone}
                      </a>
                      <button
                        type="button"
                        aria-label="Скопировать телефон"
                        className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                        onClick={() => {
                          navigator.clipboard?.writeText(recipientPhone);
                          toast({ title: "Телефон скопирован", description: recipientPhone });
                        }}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <span className="text-[12px] text-slate-400">—</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-600">
                <div className="rounded-[10px] border border-slate-200/70 bg-white p-2">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Scale className="h-3.5 w-3.5" />
                    Вес
                  </div>
                  <div className="text-[13px] font-semibold text-slate-700">{weightValue}</div>
                </div>
                <div className="rounded-[10px] border border-slate-200/70 bg-white p-2">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <BadgeDollarSign className="h-3.5 w-3.5" />
                    Доставка
                  </div>
                  <div className="text-[13px] font-semibold text-slate-700">{deliveryCost}</div>
                </div>
                <div className="rounded-[10px] border border-slate-200/70 bg-white p-2">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <BadgeDollarSign className="h-3.5 w-3.5" />
                    Стоимость
                  </div>
                  <div className="text-[13px] font-semibold text-slate-700">{declaredValue}</div>
                </div>
              </div>

              <div className="space-y-2 rounded-[12px] border border-slate-200/70 bg-slate-50/70 p-2.5">
                <div className="text-[11px] font-semibold text-slate-400">Таймлайн</div>
                <div className="space-y-1">
                  {statusSteps.map((step, idx) => {
                    const StepIcon = step.icon;
                    const isDone = idx <= statusIndex;
                    return (
                      <div key={step.key} className="flex items-start gap-2 text-[11px]">
                        <div
                          className={cn(
                            "flex h-5 w-5 items-center justify-center rounded-full border",
                            isDone ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-200 text-slate-400"
                          )}
                        >
                          <StepIcon className="h-3 w-3" />
                        </div>
                        <div className="flex-1">
                          <div className={cn("text-[12px] font-semibold", isDone ? "text-slate-800" : "text-slate-400")}>
                            {step.label}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {formatDate(idx === 0 ? createdAtDate : addDays(createdAtDate, idx))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-[11px] font-semibold text-slate-400">№ декларации</div>
                {declarationNumber ? (
                  <div className="flex items-center gap-2">
                    <div className="text-[13px] font-semibold text-slate-700">{declarationNumber}</div>
                    <button
                      type="button"
                      aria-label="Скопировать номер декларации"
                      className="inline-flex h-5 w-5 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      onClick={() => {
                        navigator.clipboard?.writeText(declarationNumber);
                        toast({ title: "Номер декларации скопирован", description: declarationNumber });
                      }}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="text-[12px] text-slate-400">—</div>
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Отправка: {formatDate(createdAtDate)}</span>
                <span>Доставка: {formatDate(etaDate)}</span>
              </div>
            </div>
          );
        })()}
      </PopoverContent>
    </Popover>
  );

  const DealRowMenu = ({
    deal,
    context,
  }: {
    deal: NonNullable<ClientRecord["deals"]>[number];
    context: DealStage;
  }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-100"
          aria-label="Действия"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        <DropdownMenuItem onClick={() => handleEditDeal(deal, context)}>
          Редактировать
        </DropdownMenuItem>
        {context === "quote" && (
          <DropdownMenuItem onClick={() => handleMoveDealStage(deal.id, "deal")}>
            Перенести в сделку
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleDeleteDeal(deal.id)}
          className="text-rose-600 focus:text-rose-600"
        >
          Удалить
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
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
        ref={popoverBoundaryRef}
        className="client-details-modal modal-surface flex max-h-[92vh] w-[min(98vw,1800px)] max-w-none flex-col overflow-hidden rounded-[20px] border border-slate-200/60 bg-slate-50 p-6 !translate-x-[-50%] !translate-y-[-50%] data-[state=open]:animate-none data-[state=closed]:animate-none"
        onPointerDownCapture={onPointerDownCapture}
        onPointerDownOutside={onPointerDownCapture}
      >
        <div className="relative flex min-h-0 flex-col gap-6">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/60 pb-4 pr-14">
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
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-full border border-slate-200/70 bg-white/70 px-2.5 py-1 text-xs font-medium text-foreground/80 shadow-sm transition hover:bg-white"
                          >
                            <span className="text-slate-500">+</span>
                            <span>Напоминание</span>
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onSelect={() => handleSetReminder(5)}>
                            через 5 минут
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() =>
                              handleSetReminderAt(new Date(Date.now() + 60 * 60000), "Через час")
                            }
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
                        <span className="text-xs font-medium text-slate-400">
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
                <Button
                  size="sm"
                  variant="secondary"
                  className="bg-[#e8eef3] text-slate-700 hover:bg-[#d9e3ea] shadow-[0_8px_18px_rgba(15,23,42,0.12)] hover:shadow-[0_12px_22px_rgba(15,23,42,0.16)] active:shadow-[0_6px_12px_rgba(15,23,42,0.14)] transition-shadow"
                  onClick={() => setIsEditing(true)}
                >
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
            <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-6 xl:grid-cols-[1fr,320px]">
              <div className="flex min-h-0 min-w-0 flex-col">
                <TabsList className="grid h-auto w-full grid-cols-2 gap-3 bg-transparent p-0">
                  <TabsTrigger
                    value="quotes"
                    className="group flex w-full items-center justify-between gap-3 rounded-[4px] border border-slate-200 bg-white px-4 py-2 text-left text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 data-[state=active]:border-sky-500 data-[state=active]:shadow-[0_0_0_1px_rgba(14,165,233,0.2)]"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate">Просчеты</span>
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-[2px] bg-slate-900 px-2 text-[11px] font-semibold leading-none text-white">
                        {quotesList.length}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </TabsTrigger>
                  <TabsTrigger
                    value="deals"
                    className="group flex w-full items-center justify-between gap-3 rounded-[4px] border border-slate-200 bg-white px-4 py-2 text-left text-[13px] font-semibold text-slate-700 transition hover:bg-slate-50 data-[state=active]:border-sky-500 data-[state=active]:shadow-[0_0_0_1px_rgba(14,165,233,0.2)]"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span className="truncate">Сделки</span>
                      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-[2px] bg-slate-900 px-2 text-[11px] font-semibold leading-none text-white">
                        {dealsList.length}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </TabsTrigger>
                </TabsList>

                <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                  <TabsContent value="quotes" className="mt-0 space-y-4">
                    <div className="overflow-hidden rounded-[4px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                      <div className="overflow-x-auto overflow-y-visible">
                        <table className="w-full border-collapse text-sm">
                          <thead>
                            <tr className="border-b border-slate-200/70 bg-slate-50 text-xs font-medium text-slate-500">
                              <th className="w-11 px-3 py-2.5" />
                              <th className="px-3 py-2.5 text-left">Статус</th>
                              <th className="px-3 py-2.5 text-left">Дата создания</th>
                              <th className="px-3 py-2.5 text-left">Товар или услуга</th>
                              <th className="px-3 py-2.5 text-left">Ед. измерения</th>
                              <th className="px-3 py-2.5 text-left">Кол-во</th>
                              <th className="px-3 py-2.5 text-left">Цена</th>
                              <th className="px-3 py-2.5 text-left">Сума</th>
                              <th className="px-3 py-2.5 text-left">Документы</th>
                              <th className="px-3 py-2.5 text-left">№ Дек, почты</th>
                              <th className="px-3 py-2.5 text-left">Комментарии</th>
                              <th className="px-3 py-2.5 text-right" />
                            </tr>
                          </thead>
                          <tbody>
                            {quotesList.length ? (
                              quotesList.map((deal, index) => {
                                const variant = index % 3;
                                const statusLabel =
                                  variant === 0 ? "Проектно" : variant === 1 ? "Новый" : "Отказ";
                                const statusTone =
                                  variant === 0
                                    ? "bg-amber-500"
                                    : variant === 1
                                    ? "bg-emerald-500"
                                    : "bg-rose-500";

                                return (
                                  <tr key={deal.id} className="border-b border-slate-200/60 last:border-b-0">
                                    <td className="px-3 py-2">
                                      <DealRowMenu deal={deal} context="quote" />
                                    </td>
                                    <td className="px-3 py-2">
                                      <span
                                        className={cn(
                                          "inline-flex items-center rounded-[4px] px-2 py-0.5 text-[11px] font-semibold text-white",
                                          statusTone
                                        )}
                                      >
                                        {statusLabel}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-xs text-muted-foreground">
                                      {formatDate(deal.createdAt)}
                                    </td>
                                    <td className="px-3 py-2">
                                      <div className="min-w-[220px] text-sm font-medium text-foreground">
                                        {deal.title}
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-xs text-muted-foreground">{deal.unit}</td>
                                    <td className="px-3 py-2 text-sm">{formatAmount(deal.qty)}</td>
                                    <td className="px-3 py-2 text-sm">{formatAmount(deal.price)}</td>
                                    <td className="px-3 py-2 text-sm">{formatAmount(deal.amount)}</td>
                                    <td className="px-3 py-2">
                                      {renderDealDocuments(deal.documents)}
                                    </td>
                                    <td className="px-3 py-2 text-xs text-muted-foreground">
                                    <div className="flex items-start gap-2">
                                      <DealCarrierCard
                                        declarationNumber={deal.declarationNumber}
                                        recipientName={deal.recipientName}
                                        recipientPhone={deal.recipientPhone}
                                        recipientCity={deal.recipientCity}
                                        recipientOffice={deal.recipientOffice}
                                        senderName={draft.company || draft.name}
                                        originCity={draft.city}
                                        amount={deal.amount}
                                        qty={deal.qty}
                                        createdAt={deal.createdAt}
                                      />
                                    </div>
                                    </td>
                                    <td className="px-3 py-2 text-sm">{deal.comment || "—"}</td>
                                    <td className="px-3 py-2 text-right">
                                      <button
                                        type="button"
                                        className="h-7 rounded-md border border-slate-200/70 bg-white px-3 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50"
                                      >
                                        Одобрить
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })
                            ) : (
                              <tr>
                                <td colSpan={12} className="px-3 py-10 text-center text-sm text-muted-foreground">
                                  Просчетов пока нет.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="deals" className="mt-0 space-y-4">
                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        variant="secondary"
                        className="clients-add-btn h-8 px-3 text-xs"
                        onClick={() => {
                          setEditingDealId(null);
                          setDealForm(buildEmptyDealForm("deal"));
                          setDealFormOpen(true);
                        }}
                      >
                        Добавить +
                      </Button>
                    </div>

                    <Dialog
                      open={dealFormOpen}
                      onOpenChange={(next) => {
                        if (!next) {
                          handleCancelDealForm();
                          return;
                        }
                        setDealFormOpen(true);
                      }}
                    >
                        <DialogContent className="deal-form-dialog flex h-[92vh] w-[min(92vw,1200px)] max-w-none flex-col gap-0 overflow-hidden rounded-[18px] border border-slate-200/70 bg-slate-50 p-0">
                          <DialogHeader className="border-b border-slate-200/70 bg-white px-5 py-3">
                            <DialogTitle className="text-lg font-semibold">
                              {editingDealId ? "Редактировать сделку" : "Новая сделка"}
                            </DialogTitle>
                            <p className="text-xs text-slate-500">
                              Заполните основные данные, доставку и документы.
                            </p>
                          </DialogHeader>
                          <div className="flex-1 overflow-hidden px-5 py-4">
                            <div className="deal-form-grid grid h-full gap-3 lg:grid-cols-2">
                              <div className="deal-form-section" data-tone="sky">
                                <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide deal-form-title">
                                  <span className="deal-form-icon">
                                    <CalendarClock className="h-4 w-4" />
                                  </span>
                                  Основное
                                </div>
                                <div className="grid gap-3 md:grid-cols-12">
                                  <div className="deal-form-field space-y-1.5 md:col-span-4">
                                    <div className="deal-form-label text-[11px] font-semibold text-slate-500">
                                      Дата
                                    </div>
                                    <Input
                                      type="date"
                                      className="h-10"
                                      value={dealForm.createdAt}
                                      onChange={(event) =>
                                        setDealForm((prev) => ({ ...prev, createdAt: event.target.value }))
                                      }
                                    />
                                  </div>
                                  <div className="deal-form-field space-y-1.5 md:col-span-8">
                                    <div className="deal-form-label text-[11px] font-semibold text-slate-500">
                                      Наименование
                                    </div>
                                    <Input
                                      className="h-10"
                                      placeholder="Наименование"
                                      value={dealForm.title}
                                      onChange={(event) =>
                                        setDealForm((prev) => ({ ...prev, title: event.target.value }))
                                      }
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="deal-form-section" data-tone="emerald">
                                <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide deal-form-title">
                                  <span className="deal-form-icon">
                                    <Scale className="h-4 w-4" />
                                  </span>
                                  Товар и сумма
                                </div>
                                <div className="grid gap-3 md:grid-cols-12">
                                  <div className="deal-form-field space-y-1.5 md:col-span-6">
                                    <div className="deal-form-label text-[11px] font-semibold text-slate-500">
                                      Ед. измерения
                                    </div>
                                    <Input
                                      className="h-10"
                                      placeholder="Ед. измерения"
                                      value={dealForm.unit}
                                      onChange={(event) =>
                                        setDealForm((prev) => ({ ...prev, unit: event.target.value }))
                                      }
                                    />
                                  </div>
                                  <div className="deal-form-field space-y-1.5 md:col-span-6">
                                    <div className="deal-form-label text-[11px] font-semibold text-slate-500">
                                      Количество
                                    </div>
                                    <Input
                                      className="h-10"
                                      placeholder="Количество"
                                      value={dealForm.qty}
                                      onChange={(event) =>
                                        setDealForm((prev) => ({ ...prev, qty: event.target.value }))
                                      }
                                    />
                                  </div>
                                  <div className="deal-form-field space-y-1.5 md:col-span-6">
                                    <div className="deal-form-label text-[11px] font-semibold text-slate-500">
                                      Цена
                                    </div>
                                    <Input
                                      className="h-10"
                                      placeholder="Цена"
                                      value={dealForm.price}
                                      onChange={(event) =>
                                        setDealForm((prev) => ({ ...prev, price: event.target.value }))
                                      }
                                    />
                                  </div>
                                  <div className="deal-form-field space-y-1.5 md:col-span-6">
                                    <div className="deal-form-label text-[11px] font-semibold text-slate-500">
                                      Сума
                                    </div>
                                    <Input
                                      className="h-10"
                                      placeholder="Сума"
                                      value={dealForm.amount}
                                      onChange={(event) =>
                                        setDealForm((prev) => ({ ...prev, amount: event.target.value }))
                                      }
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="deal-form-section" data-tone="amber">
                                <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide deal-form-title">
                                  <span className="deal-form-icon">
                                    <Truck className="h-4 w-4" />
                                  </span>
                                  Доставка
                                </div>
                                <div className="grid gap-3 md:grid-cols-12">
                                  <div className="deal-form-field space-y-1.5 md:col-span-7">
                                    <div className="deal-form-label text-[11px] font-semibold text-slate-500">
                                      Номер декларации
                                    </div>
                                    <Input
                                      className="h-10"
                                      placeholder="Номер декларации"
                                      value={dealForm.declarationNumber}
                                      onChange={(event) =>
                                        setDealForm((prev) => ({ ...prev, declarationNumber: event.target.value }))
                                      }
                                    />
                                  </div>
                                  <div className="deal-form-field space-y-1.5 md:col-span-5">
                                    <div className="deal-form-label text-[11px] font-semibold text-slate-500">
                                      Получатель
                                    </div>
                                    <Input
                                      className="h-10"
                                      placeholder="Получатель"
                                      value={dealForm.recipientName}
                                      onChange={(event) =>
                                        setDealForm((prev) => ({ ...prev, recipientName: event.target.value }))
                                      }
                                    />
                                  </div>
                                  <div className="deal-form-field space-y-1.5 md:col-span-6">
                                    <div className="deal-form-label text-[11px] font-semibold text-slate-500">
                                      Телефон получателя
                                    </div>
                                    <Input
                                      className="h-10"
                                      placeholder="Телефон получателя"
                                      value={dealForm.recipientPhone}
                                      onChange={(event) =>
                                        setDealForm((prev) => ({ ...prev, recipientPhone: event.target.value }))
                                      }
                                    />
                                  </div>
                                  <div className="deal-form-field space-y-1.5 md:col-span-6">
                                    <div className="deal-form-label text-[11px] font-semibold text-slate-500">
                                      Город получателя
                                    </div>
                                    <Input
                                      className="h-10"
                                      placeholder="Город получателя"
                                      value={dealForm.recipientCity}
                                      onChange={(event) =>
                                        setDealForm((prev) => ({ ...prev, recipientCity: event.target.value }))
                                      }
                                    />
                                  </div>
                                  <div className="deal-form-field space-y-1.5 md:col-span-12">
                                    <div className="deal-form-label text-[11px] font-semibold text-slate-500">
                                      Отделение
                                    </div>
                                    <Input
                                      className="h-10"
                                      placeholder="Отделение"
                                      value={dealForm.recipientOffice}
                                      onChange={(event) =>
                                        setDealForm((prev) => ({ ...prev, recipientOffice: event.target.value }))
                                      }
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="deal-form-section" data-tone="slate">
                                <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide deal-form-title">
                                  <span className="deal-form-icon">
                                    <FileText className="h-4 w-4" />
                                  </span>
                                  Документы и комментарий
                                </div>
                                <div className="grid gap-3 md:grid-cols-12">
                                  <div className="deal-form-field space-y-2 md:col-span-12">
                                    <div className="deal-form-label text-[11px] font-semibold text-slate-500">
                                      Документы
                                    </div>
                                    <Input
                                      className="h-10"
                                      placeholder="Документы (через запятую)"
                                      value={dealForm.documents}
                                      onChange={(event) =>
                                        setDealForm((prev) => ({ ...prev, documents: event.target.value }))
                                      }
                                      onDragOver={(event) => event.preventDefault()}
                                      onDrop={handleDealFilesDrop}
                                    />
                                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
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
                                        className="h-7 bg-sky-500 px-2 text-xs text-white hover:bg-sky-600"
                                        onClick={() => dealFileInputRef.current?.click()}
                                      >
                                        Загрузить
                                      </Button>
                                      <span>Перетащите файлы сюда или нажмите кнопку</span>
                                    </div>
                                  </div>
                                  <div className="deal-form-field space-y-1.5 md:col-span-12">
                                    <div className="deal-form-label text-[11px] font-semibold text-slate-500">
                                      Комментарий
                                    </div>
                                    <Input
                                      className="h-10"
                                      placeholder="Комментарий"
                                      value={dealForm.comment}
                                      onChange={(event) =>
                                        setDealForm((prev) => ({ ...prev, comment: event.target.value }))
                                      }
                                    />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <DialogFooter className="border-t border-slate-200/70 bg-white px-5 py-3 sm:justify-start">
                            <Button size="sm" onClick={handleSaveDeal}>
                              {editingDealId ? "Сохранить" : "Добавить"}
                            </Button>
                            <Button size="sm" variant="ghost" onClick={handleCancelDealForm}>
                              Отмена
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    <div className="overflow-hidden rounded-[4px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                      <div className="overflow-x-auto overflow-y-visible">
                        <table className="w-full border-collapse text-sm">
                        <thead>
                          <tr className="border-b border-slate-200/70 bg-slate-50 text-xs font-medium text-slate-500">
                            <th className="w-11 px-3 py-2" />
                            <th className="px-3 py-2 text-left">Статус</th>
                            <th className="px-3 py-2 text-left">Дата создания</th>
                            <th className="px-3 py-2 text-left">Товар или услуга</th>
                            <th className="px-3 py-2 text-left">Ед. измерения</th>
                            <th className="px-3 py-2 text-left">Кол-во</th>
                            <th className="px-3 py-2 text-left">Цена</th>
                            <th className="px-3 py-2 text-left">Сума</th>
                            <th className="px-3 py-2 text-left">Документы</th>
                            <th className="px-3 py-2 text-left">№ Дек, почты</th>
                            <th className="px-3 py-2 text-left">Комментарии</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dealsList.length ? (
                            dealsList.map((deal, index) => {
                              const variant = index % 3;
                              const statusLabel =
                                variant === 0 ? "В роботі" : variant === 1 ? "Завершено" : "Відмова";
                              const statusTone =
                                variant === 0
                                  ? "bg-amber-500"
                                  : variant === 1
                                  ? "bg-emerald-500"
                                  : "bg-rose-500";

                              return (
                                  <tr key={deal.id} className="border-b border-slate-200/60 last:border-b-0">
                                    <td className="px-3 py-2">
                                      <DealRowMenu deal={deal} context="deal" />
                                    </td>
                                  <td className="px-3 py-2">
                                    <span
                                      className={cn(
                                        "inline-flex items-center rounded-[4px] px-2 py-0.5 text-[11px] font-semibold text-white",
                                        statusTone
                                      )}
                                    >
                                      {statusLabel}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-xs text-muted-foreground">
                                    {formatDate(deal.createdAt)}
                                  </td>
                                  <td className="px-3 py-2">
                                    <div className="min-w-[220px] text-sm font-medium text-foreground">
                                      {deal.title}
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-xs text-muted-foreground">{deal.unit}</td>
                                  <td className="px-3 py-2 text-sm">{formatAmount(deal.qty)}</td>
                                  <td className="px-3 py-2 text-sm">{formatAmount(deal.price)}</td>
                                  <td className="px-3 py-2 text-sm">{formatAmount(deal.amount)}</td>
                                  <td className="px-3 py-2">
                                    {renderDealDocuments(deal.documents)}
                                  </td>
                                  <td className="px-3 py-2 text-xs text-muted-foreground">
                                    <div className="flex items-start gap-2">
                                      <DealCarrierCard
                                        declarationNumber={deal.declarationNumber}
                                        recipientName={deal.recipientName}
                                        recipientPhone={deal.recipientPhone}
                                        recipientCity={deal.recipientCity}
                                        recipientOffice={deal.recipientOffice}
                                        senderName={draft.company || draft.name}
                                        originCity={draft.city}
                                        amount={deal.amount}
                                        qty={deal.qty}
                                        createdAt={deal.createdAt}
                                      />
                                    </div>
                                  </td>
                                  <td className="px-3 py-2 text-sm">{deal.comment || "—"}</td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={12} className="px-3 py-10 text-center text-sm text-muted-foreground">
                                Сделок пока нет.
                              </td>
                            </tr>
                          )}
                        </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>

                  <div className="overflow-hidden rounded-[4px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <div className="bg-slate-50/80 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] text-slate-500 transition hover:bg-white/80"
                          aria-label="Прикрепить"
                          onClick={() => chatFileInputRef.current?.click()}
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>
                        <input
                          ref={chatFileInputRef}
                          type="file"
                          multiple
                          className="hidden"
                          onChange={handleAttachFiles}
                        />
                        <div className="relative flex-1">
                          <input
                            className="h-10 w-full rounded-[8px] border border-slate-200/70 bg-white px-3 pr-11 text-sm outline-none placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                            placeholder="Отправить сообщение"
                            value={commentInput}
                            onChange={(event) => setCommentInput(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                handleAddComment();
                              }
                            }}
                          />
                          <button
                            type="button"
                            className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-[6px] text-slate-400 transition hover:bg-slate-50"
                            aria-label="Эмодзи"
                          >
                            <Smile className="h-4 w-4" />
                          </button>
                        </div>
                        <button
                          type="button"
                          className="inline-flex h-10 items-center gap-2 rounded-[8px] bg-sky-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-600 disabled:cursor-default disabled:opacity-60"
                          onClick={handleAddComment}
                          disabled={!commentInput.trim() && pendingAttachments.length === 0}
                        >
                          Отправить
                          <ChevronRight className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] text-slate-500 transition hover:bg-slate-100"
                          aria-label="Меню"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                      {(replyToMessage || pendingAttachments.length > 0) && (
                        <div className="mt-2 space-y-2">
                          {replyToMessage && (
                            <div className="flex items-start justify-between rounded-[8px] border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                              <div className="min-w-0">
                                <div className="text-[10px] text-slate-400">Ответ на сообщение</div>
                                <div className="text-[12px] font-semibold text-slate-700">
                                  {replyToMessage.authorName || "Менеджер"}
                                </div>
                                <div className="truncate text-[11px] text-slate-500">
                                  {replyToMessage.text || "Вложение"}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="inline-flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                aria-label="Убрать ответ"
                                onClick={() => setReplyToMessage(null)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                          {pendingAttachments.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {pendingAttachments.map((file) => (
                                <div
                                  key={file.id}
                                  className="flex items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600"
                                >
                                  <Paperclip className="h-3 w-3 text-slate-400" />
                                  <span className="max-w-[140px] truncate">{file.name}</span>
                                  <span className="text-[10px] text-slate-400">{formatFileSize(file.size)}</span>
                                  <button
                                    type="button"
                                    className="inline-flex h-4 w-4 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                    aria-label="Удалить файл"
                                    onClick={() => handleRemoveAttachment(file.id)}
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="max-h-[420px] overflow-y-auto px-4 py-4 custom-scrollbar">
                      <div className="space-y-4">
                        {chatTimeline.length ? (
                          chatTimeline.map((item) => {
                            if (item.type === "day") {
                              return (
                                <div key={item.id} className="flex justify-center">
                                  <span className="text-[11px] font-medium text-slate-400">
                                    {item.label}
                                  </span>
                                </div>
                              );
                            }

                            const authorName =
                              item.msg.authorName || client.responsibleName || currentUserName || "Менеджер";
                            const canEdit = isDirector || item.msg.authorId === currentUserId;
                            const canDelete =
                              isDirector || (allowManagerDelete && item.msg.authorId === currentUserId);

                            return (
                              <div key={item.id} className="group flex gap-3">
                                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-[8px] border border-slate-200/60 bg-white text-slate-400">
                                  <User className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                                    <span className="font-semibold text-slate-700">{authorName}</span>
                                    <span>{formatClockTime(item.msg.createdAt)}</span>
                                    <div className="ml-auto flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                                      <button
                                        type="button"
                                        className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                        onClick={() =>
                                          setReplyToMessage({
                                            id: item.msg.id,
                                            authorName,
                                            text: getReplyPreviewText(item.msg),
                                          })
                                        }
                                        aria-label="Ответить"
                                      >
                                        <CornerUpLeft className="h-3.5 w-3.5" />
                                      </button>
                                      {canEdit && (
                                        <button
                                          type="button"
                                          className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                                          onClick={() => handleStartEditComment(item.msg.id, item.msg.text)}
                                          aria-label="Редактировать"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                      {canDelete && (
                                        <button
                                          type="button"
                                          className="inline-flex h-7 w-7 items-center justify-center rounded-[6px] text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                                          onClick={() => handleDeleteComment(item.msg.id)}
                                          aria-label="Удалить"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {editingCommentId === item.msg.id ? (
                                    <div className="mt-2 space-y-2">
                                      <textarea
                                        className="w-full rounded-[8px] border border-slate-200/70 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
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
                                    <div className="mt-1 space-y-2">
                                      {item.msg.replyTo && (
                                        <div className="rounded-[6px] border-l-2 border-sky-400 bg-sky-50/70 px-3 py-2 text-[11px] text-slate-600">
                                          <div className="text-[10px] text-slate-400">Ответ</div>
                                          <div className="font-semibold text-slate-700">
                                            {item.msg.replyTo.authorName || "Менеджер"}
                                          </div>
                                          <div className="truncate text-[11px] text-slate-500">
                                            {item.msg.replyTo.text || "Вложение"}
                                          </div>
                                        </div>
                                      )}
                                      {item.msg.text && (
                                        <div className="whitespace-pre-line rounded-[6px] bg-sky-50 px-3 py-2 text-sm text-slate-700">
                                          {item.msg.text}
                                        </div>
                                      )}
                                      {item.msg.attachments?.length ? (
                                        <div className="flex flex-wrap gap-2">
                                          {item.msg.attachments.map((file) => (
                                            <div
                                              key={file.id}
                                              className="flex items-center gap-2 rounded-[8px] border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600"
                                            >
                                              <Paperclip className="h-3 w-3 text-slate-400" />
                                              <span className="max-w-[180px] truncate">{file.name}</span>
                                              <span className="text-[10px] text-slate-400">{formatFileSize(file.size)}</span>
                                            </div>
                                          ))}
                                        </div>
                                      ) : null}
                                    </div>
                                  )}
                                  {item.msg.updatedAt && (
                                    <div className="mt-1 text-[10px] text-slate-400">(изменено)</div>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        ) : (
                          <p className="py-12 text-center text-sm text-muted-foreground">Сообщений нет.</p>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              <div className="client-details-side flex min-h-0 min-w-0 flex-col gap-3 overflow-y-auto pr-0 custom-scrollbar">
                <InfoCard
                  title="Коммуникация"
                  className="comm-card animate-fade-up"
                  titleAddon={
                    commFormOpen ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn(
                          "h-7 px-3 text-xs",
                          "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700"
                        )}
                        onClick={() => setCommFormOpen(false)}
                      >
                        Отмена
                      </Button>
                    ) : hasCommunications ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className={cn("h-7 px-3 text-xs", "clients-add-btn")}
                        onClick={() => setCommFormOpen(true)}
                      >
                        Добавить
                      </Button>
                    ) : null
                  }
                >
                  {commFormOpen ? (
                    <div className="comm-form space-y-3">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <Select
                        value={commType}
                        onValueChange={(value) => setCommType(value as "call" | "meeting")}
                      >
                        <SelectTrigger className="h-9 comm-field">
                          <SelectValue placeholder="Тип коммуникации" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="call">Звонок</SelectItem>
                          <SelectItem value="meeting">Встреча</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select
                        value={commStatus}
                        onValueChange={(value) => {
                          const nextStatus = value as CommunicationFormStatus;
                          setCommStatus(nextStatus);
                          if (nextStatus === "planned") {
                            setCommFollowUpEnabled(false);
                          }
                          if (nextStatus !== "failed") {
                            setCommFailReason("");
                          }
                        }}
                      >
                        <SelectTrigger className="h-9 comm-field">
                          <SelectValue placeholder="Статус" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planned">Запланирована</SelectItem>
                          <SelectItem value="success">Завершено удачно</SelectItem>
                          <SelectItem value="failed">Завершено неудачно</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {commStatus === "planned" && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Input
                          type="date"
                          className="h-9 comm-field"
                          value={commDate}
                          onChange={(event) => setCommDate(event.target.value)}
                        />
                        <Input
                          type="time"
                          className="h-9 comm-field"
                          value={commTime}
                          onChange={(event) => setCommTime(event.target.value)}
                        />
                      </div>
                    )}

                    <Input
                      className="h-9 comm-field"
                      placeholder="Короткая заметка для коммуникации"
                      value={commNote}
                      onChange={(event) => setCommNote(event.target.value)}
                    />

                    {commStatus === "failed" && (
                      <div className="comm-panel rounded-[6px] px-3 py-2 text-xs">
                        <div className="mb-2 font-semibold text-slate-500">Причина</div>
                        <div className="space-y-1">
                          {COMMUNICATION_FAIL_REASONS.map((reason) => (
                            <label key={reason.value} className="comm-option flex items-center gap-2 text-xs text-slate-600">
                              <input
                                type="radio"
                                name="comm-fail-reason"
                                checked={commFailReason === reason.value}
                                onChange={() => setCommFailReason(reason.value)}
                              />
                              {reason.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    {commStatus !== "planned" && (
                      <div className="comm-panel rounded-[6px] px-3 py-2 text-xs">
                        <label className="comm-option flex items-center gap-2 text-xs text-slate-600">
                          <input
                            type="checkbox"
                            checked={commFollowUpEnabled}
                            onChange={(event) => setCommFollowUpEnabled(event.target.checked)}
                          />
                          Назначить повторный контакт
                        </label>
                        {commFollowUpEnabled && (
                          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <Input
                              type="date"
                              className="h-9 comm-field"
                              value={commDate}
                              onChange={(event) => setCommDate(event.target.value)}
                            />
                            <Input
                              type="time"
                              className="h-9 comm-field"
                              value={commTime}
                              onChange={(event) => setCommTime(event.target.value)}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" className="comm-btn-primary" onClick={handleSaveCommunication}>
                        {commStatus === "planned" ? "Запланировать" : "Сохранить"}
                      </Button>
                      <Button size="sm" variant="ghost" className="comm-btn-ghost" onClick={handleClearCommunicationForm}>
                        Очистить
                      </Button>
                    </div>

                    <div className="comm-info-pill rounded-[10px] px-3 py-2 text-xs">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5" />
                        <span>
                          Следующая коммуникация: {formatDateTime(draft.nextCommunicationAt ?? null)}
                        </span>
                      </div>
                    </div>

                    <Collapsible open={commHistoryOpen} onOpenChange={setCommHistoryOpen}>
                      <CollapsibleTrigger asChild>
                        <button
                          type="button"
                          className="comm-history-toggle text-xs"
                          aria-label={commHistoryOpen ? "Свернуть историю" : "Показать историю"}
                        >
                          <span>История</span>
                          <ChevronDown
                            className={cn("h-4 w-4 transition-transform", !commHistoryOpen && "-rotate-90")}
                          />
                        </button>
                      </CollapsibleTrigger>
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
                                <div key={item.id} className="comm-history-item rounded-[10px] px-3 py-2 text-xs">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-foreground">
                                        {formatDateTime(item.scheduledAt)}
                                      </span>
                                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                        {item.kind === "meeting"
                                          ? "Встреча"
                                          : item.kind === "call"
                                          ? "Звонок"
                                          : "Коммуникация"}
                                      </span>
                                    </div>
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
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="comm-btn-outline"
                                        onClick={() => handleStartCloseCommunication(item.id)}
                                      >
                                        Закрыть
                                      </Button>
                                    </div>
                                  )}
                                  {closingCommId === item.id && (
                                    <div className="mt-2 rounded-[4px] border border-slate-200 bg-white p-2">
                                      <div className="flex flex-wrap gap-2">
                                        <Button
                                          size="sm"
                                          variant={closingResult === "success" ? "default" : "secondary"}
                                          className={cn(
                                            "comm-btn-toggle comm-btn-success",
                                            closingResult === "success" && "is-active"
                                          )}
                                          onClick={() => setClosingResult("success")}
                                        >
                                          Завершено удачно
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant={closingResult === "failed" ? "default" : "secondary"}
                                          className={cn(
                                            "comm-btn-toggle comm-btn-danger",
                                            closingResult === "failed" && "is-active"
                                          )}
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
                                        <Button size="sm" className="comm-btn-primary" onClick={handleConfirmCloseCommunication}>
                                          Сохранить
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="comm-btn-ghost"
                                          onClick={handleCancelCloseCommunication}
                                        >
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
                  ) : (
                    <div className="space-y-3">
                      {!hasCommunications ? (
                        <div className="rounded-[10px] border border-dashed border-slate-200/70 bg-slate-50/70 px-3 py-4 text-center">
                          <p className="text-sm font-semibold text-slate-700">Без коммуникации</p>
                          <p className="text-xs text-slate-400">
                            Добавьте первую коммуникацию с клиентом
                          </p>
                          <Button
                            size="sm"
                            className="comm-btn-primary mt-3"
                            onClick={() => setCommFormOpen(true)}
                          >
                            Добавить
                          </Button>
                        </div>
                      ) : (
                        <div className="rounded-[10px] border border-slate-200/60 bg-slate-50/70 px-3 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <p className="text-[11px] font-semibold text-slate-400">Дата и время</p>
                              <p className="text-sm font-semibold text-foreground">
                                {formatDateTime(primaryCommunicationDate)}
                              </p>
                            </div>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                                primaryCommunicationStatusClass
                              )}
                            >
                              {primaryCommunicationStatusLabel}
                            </span>
                          </div>
                          <p className="mt-2 text-[11px] font-semibold text-slate-400">Короткий текст</p>
                          <p className="comm-summary-note mt-1 text-xs text-slate-700">
                            {primaryCommunicationNote || "Без заметки"}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </InfoCard>
                <InfoCard title="Ответственный" className="animate-fade-up">
                  {responsible ? (
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-[4px] bg-slate-50 px-3 py-2 text-left transition hover:bg-slate-100"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-[8px] border border-slate-200/60 bg-white text-slate-400">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{responsible.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {responsible.position || "—"}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ) : (
                    <p className="text-sm text-muted-foreground">Ответственный не назначен.</p>
                  )}
                </InfoCard>

                <InfoCard title="Контактные лица" className="animate-fade-up" bodyClassName="space-y-0">
                  {isEditing ? (
                    <div className="space-y-3">
                      {contactList.length ? (
                        contactList.map((contact, index) => (
                          <div
                            key={contact.id}
                            className="space-y-2 rounded-[10px] border border-slate-200/60 bg-slate-50/50 p-3"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <Input
                                className="h-9"
                                value={contact.name}
                                placeholder="Имя и фамилия"
                                onChange={(event) => updateContact(index, { name: event.target.value })}
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
                              onChange={(event) => updateContact(index, { position: event.target.value })}
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
                    <div className="divide-y divide-slate-200/60">
                      {contactList.length ? (
                        contactList.map((contact) => {
                          const isActive = contact.id === activeContactId;
                          return (
                            <div key={contact.id} className={cn(isActive && "bg-sky-50")}>
                              <button
                                type="button"
                                className={cn(
                                  "flex w-full items-center gap-3 px-3 py-2 text-left transition",
                                  isActive ? "hover:bg-sky-100/60" : "hover:bg-slate-50"
                                )}
                                onClick={() => setActiveContactId(isActive ? null : contact.id)}
                              >
                                <div
                                  className={cn(
                                    "flex h-9 w-9 items-center justify-center rounded-[8px] border border-slate-200/60 bg-white text-slate-400",
                                    isActive && "border-sky-500 bg-sky-500 text-white"
                                  )}
                                >
                                  <User className="h-4 w-4" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="truncate text-sm font-semibold text-foreground">{contact.name}</p>
                                    {isActive ? (
                                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </div>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {contact.position || "—"}
                                  </p>
                                </div>
                              </button>

                              {isActive && (
                                <div className="space-y-3 px-3 pb-3 pl-[3.75rem] text-xs">
                                  {(contact.phones ?? []).map((phone, index) => {
                                    const label =
                                      index === 0
                                        ? "Телефон (мобильный)"
                                        : index === 1
                                        ? "Телефон (рабочий)"
                                        : `Телефон ${index + 1}`;
                                    return (
                                      <div key={`${phone}-${index}`} className="space-y-1">
                                        <div className="text-[11px] font-semibold text-slate-400">{label}</div>
                                        <a
                                          href={`tel:${phone.replace(/[^\\d+]/g, "")}`}
                                          className="text-sky-600 hover:underline"
                                        >
                                          {phone}
                                        </a>
                                      </div>
                                    );
                                  })}

                                  {(contact.emails ?? []).map((email, index) => (
                                    <div key={`${email}-${index}`} className="space-y-1">
                                      <div className="text-[11px] font-semibold text-slate-400">
                                        {index === 0 ? "Почта" : `Почта ${index + 1}`}
                                      </div>
                                      <a href={`mailto:${email}`} className="text-sky-600 hover:underline">
                                        {email}
                                      </a>
                                    </div>
                                  ))}
                                  {!((contact.phones ?? []).length || (contact.emails ?? []).length) && (
                                    <p className="text-xs text-muted-foreground">Контактов нет.</p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="px-3 py-2">
                          <p className="text-sm text-muted-foreground">Контактов нет.</p>
                        </div>
                      )}
                    </div>
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
                            {sourceChannelOptions.map((option) => (
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
      "rounded-[4px] border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
      className
    )}
  >
    <div className="mb-2 flex items-center justify-between gap-2">
      <div className="text-sm font-semibold text-slate-800">{title}</div>
      {titleAddon}
    </div>
    <div className={cn("space-y-2 text-[13px]", bodyClassName)}>{children}</div>
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
