import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UA_CITIES_RU } from "@/data/uaCitiesRu";

export type DirectoryKey =
  | "activity"
  | "region"
  | "city"
  | "postal"
  | "product"
  | "clientType"
  | "tag"
  | "refusal"
  | "orderStatus"
  | "sourceChannel";

export type Directories = Record<DirectoryKey, string[]>;

type DirectoryState = {
  directories: Directories;
  addDirectoryItem: (key: DirectoryKey, value: string) => void;
  removeDirectoryItem: (key: DirectoryKey, value: string) => void;
  setDirectoryItems: (key: DirectoryKey, items: string[]) => void;
};

const DEFAULT_DIRECTORIES: Directories = {
  activity: ["Аптеки", "Банки", "Прачечные", "Розница"],
  region: ["Киевская", "Львовская", "Одесская"],
  city: [...UA_CITIES_RU],
  postal: ["Новая Почта", "Укрпочта", "DHL"],
  product: ["Канцелярия", "Одежда", "Игрушки"],
  clientType: ["Клиент", "Поставщик", "Конкурент", "Партнер"],
  tag: ["VIP", "Важно", "Просрочка"],
  refusal: ["Есть свой поставщик", "Не используют", "Закрылись", "Дорого"],
  orderStatus: ["Новая", "В работе", "Завершена", "Отменена"],
  sourceChannel: ["Сайт", "Рекомендация", "Выставка", "Холодный звонок", "Партнер"],
};

const PLACE_REPLACEMENTS = new Map([
  ["Київська", "Киевская"],
  ["Київ", "Киев"],
  ["Львівська", "Львовская"],
  ["Львів", "Львов"],
  ["Одеська", "Одесская"],
  ["Одеса", "Одесса"],
  ["Харківська", "Харьковская"],
  ["Харків", "Харьков"],
  ["Дніпро", "Днепр"],
  ["Киевская", "Киевская"],
  ["Киев", "Киев"],
  ["Львовская", "Львовская"],
  ["Львов", "Львов"],
  ["Одесская", "Одесская"],
  ["Одесса", "Одесса"],
  ["Харьковская", "Харьковская"],
  ["Харьков", "Харьков"],
  ["Днепр", "Днепр"],
]);

const normalizeItem = (value: string) => {
  const trimmed = value.trim().replace(/\s+/g, " ");
  return PLACE_REPLACEMENTS.get(trimmed) ?? trimmed;
};

export const useDirectoryStore = create<DirectoryState>()(
  persist(
    (set) => ({
      directories: DEFAULT_DIRECTORIES,
      addDirectoryItem: (key, value) => {
        const normalized = normalizeItem(value);
        if (!normalized) return;
        set((state) => {
          const prev = state.directories[key] ?? [];
          if (prev.some((item) => item.toLowerCase() === normalized.toLowerCase())) return state;
          return {
            directories: {
              ...state.directories,
              [key]: [...prev, normalized],
            },
          };
        });
      },
      removeDirectoryItem: (key, value) => {
        const normalized = normalizeItem(value);
        if (!normalized) return;
        set((state) => ({
          directories: {
            ...state.directories,
            [key]: (state.directories[key] ?? []).filter((item) => item !== normalized),
          },
        }));
      },
      setDirectoryItems: (key, items) => {
        set((state) => ({
          directories: {
            ...state.directories,
            [key]: Array.from(
              new Set((items ?? []).map((item) => normalizeItem(item)).filter(Boolean))
            ),
          },
        }));
      },
    }),
    {
      name: "crm-directories",
      version: 4,
      migrate: (state) => {
        if (!state || typeof state !== "object") return state as DirectoryState;
        const typedState = state as DirectoryState;
        if (!typedState.directories || typeof typedState.directories !== "object") return typedState;

        // Ensure newly added directory keys always exist.
        const merged: Directories = { ...DEFAULT_DIRECTORIES, ...typedState.directories } as Directories;
        (Object.keys(DEFAULT_DIRECTORIES) as DirectoryKey[]).forEach((key) => {
          merged[key] = Array.isArray(merged[key]) ? merged[key].map(normalizeItem).filter(Boolean) : [];
        });

        return {
          ...typedState,
          directories: merged,
        };
      },
    }
  )
);
