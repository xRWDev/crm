import { useMemo, useState } from 'react';
import {
  Folder,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  File,
  Search,
  Upload,
  Download,
  Trash2,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Users,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

type FileKind = 'folder' | 'doc' | 'pdf' | 'xls' | 'img' | 'zip' | 'other';

type DocItem = {
  id: string;
  name: string;
  kind: FileKind;
  size?: string;
  updatedAt: string;
  owner: string;
  shared: boolean;
  access: Array<'director' | 'manager'>;
  verified: boolean;
};

const files: DocItem[] = [
  {
    id: 'f-1',
    name: 'Коммерческие предложения',
    kind: 'folder',
    updatedAt: '26.01.2026',
    owner: 'Директор',
    shared: true,
    access: ['director', 'manager'],
    verified: true,
  },
  {
    id: 'f-2',
    name: 'Договоры',
    kind: 'folder',
    updatedAt: '25.01.2026',
    owner: 'Директор',
    shared: false,
    access: ['director'],
    verified: true,
  },
  {
    id: 'd-1',
    name: 'КП TechCorp.pdf',
    kind: 'pdf',
    size: '420 KB',
    updatedAt: '25.01.2026',
    owner: 'Jim Halpert',
    shared: true,
    access: ['director', 'manager'],
    verified: true,
  },
  {
    id: 'd-2',
    name: 'Прайс-лист.xlsx',
    kind: 'xls',
    size: '1.2 MB',
    updatedAt: '24.01.2026',
    owner: 'Dwight Schrute',
    shared: true,
    access: ['director', 'manager'],
    verified: true,
  },
  {
    id: 'd-3',
    name: 'Счет_ORD-003.docx',
    kind: 'doc',
    size: '180 KB',
    updatedAt: '23.01.2026',
    owner: 'dexzr',
    shared: false,
    access: ['director'],
    verified: true,
  },
  {
    id: 'd-4',
    name: 'Фото_витрины_01.jpg',
    kind: 'img',
    size: '2.6 MB',
    updatedAt: '22.01.2026',
    owner: 'Jim Halpert',
    shared: true,
    access: ['director', 'manager'],
    verified: false,
  },
  {
    id: 'd-5',
    name: 'Архив_договора.zip',
    kind: 'zip',
    size: '6.4 MB',
    updatedAt: '21.01.2026',
    owner: 'dexzr',
    shared: false,
    access: ['director'],
    verified: true,
  },
];

const kindIcon = (kind: FileKind) => {
  switch (kind) {
    case 'folder':
      return Folder;
    case 'doc':
    case 'pdf':
      return FileText;
    case 'xls':
      return FileSpreadsheet;
    case 'img':
      return FileImage;
    case 'zip':
      return FileArchive;
    default:
      return File;
  }
};

export default function Documents() {
  const { role } = useAuthStore();
  const isDirector = role === 'director';
  const [searchQuery, setSearchQuery] = useState('');
  const [folderFilter, setFolderFilter] = useState<'all' | 'shared' | 'mine'>('all');
  const [allowManagerDelete, setAllowManagerDelete] = useState(true);
  const [allowManagerDownload, setAllowManagerDownload] = useState(true);

  const visibleFiles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return files.filter((item) => {
      if (!item.access.includes(role)) return false;
      if (folderFilter === 'shared' && !item.shared) return false;
      if (folderFilter === 'mine' && item.owner !== 'dexzr' && role === 'director') return false;
      if (query && !item.name.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [searchQuery, folderFilter, role]);

  const canUpload = role === 'director' || role === 'manager';
  const canDelete = role === 'director' || (role === 'manager' && allowManagerDelete);
  const canDownload = role === 'director' || allowManagerDownload;

  return (
    <AppLayout title="Документы" subtitle="Обмен файлами, доступы и контроль">
      <div className="grid grid-cols-12 gap-6 animate-fade-up">
        <aside className="col-span-12 xl:col-span-3 space-y-4">
          <div className="glass-card p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Фильтры</h3>
            <button
              onClick={() => setFolderFilter('all')}
              className={cn(
                'flex items-center justify-between px-3 py-2 text-sm transition-all',
                folderFilter === 'all'
                  ? 'bg-primary/10 text-primary shadow-[0_12px_26px_rgba(15,23,42,0.12)] -translate-y-[1px]'
                  : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
              )}
            >
              <span className="flex items-center gap-2">
                <Folder className="h-4 w-4" />
                Все файлы
              </span>
            </button>
            <button
              onClick={() => setFolderFilter('shared')}
              className={cn(
                'flex items-center justify-between px-3 py-2 text-sm transition-all',
                folderFilter === 'shared'
                  ? 'bg-primary/10 text-primary shadow-[0_12px_26px_rgba(15,23,42,0.12)] -translate-y-[1px]'
                  : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
              )}
            >
              <span className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Общие
              </span>
            </button>
            <button
              onClick={() => setFolderFilter('mine')}
              className={cn(
                'flex items-center justify-between px-3 py-2 text-sm transition-all',
                folderFilter === 'mine'
                  ? 'bg-primary/10 text-primary shadow-[0_12px_26px_rgba(15,23,42,0.12)] -translate-y-[1px]'
                  : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
              )}
            >
              <span className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Мои
              </span>
            </button>
          </div>

          {isDirector && (
            <div className="glass-card p-4 space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Права менеджеров</h3>
              <label className="flex items-center justify-between text-sm text-muted-foreground">
                Разрешить скачивание
                <input
                  type="checkbox"
                  checked={allowManagerDownload}
                  onChange={(event) => setAllowManagerDownload(event.target.checked)}
                />
              </label>
              <label className="flex items-center justify-between text-sm text-muted-foreground">
                Разрешить удаление
                <input
                  type="checkbox"
                  checked={allowManagerDelete}
                  onChange={(event) => setAllowManagerDelete(event.target.checked)}
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Можно ограничить доступ к папкам и файлам.
              </p>
            </div>
          )}
        </aside>

        <section className="col-span-12 xl:col-span-9 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="search-bar flex-1 min-w-[420px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Поиск документа..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            {canUpload && (
              <button className="ios-button-primary text-xs">
                <Upload className="h-4 w-4" /> Загрузить
              </button>
            )}
          </div>

          <div className="glass-card rounded-2xl border border-border p-0 m-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] border-separate border-spacing-y-2 text-sm">
                <thead>
                  <tr className="bg-white/90 backdrop-blur-md">
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Файл</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Размер</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Владелец</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Доступ</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Антивирус</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Обновлено</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleFiles.map((item) => {
                    const Icon = kindIcon(item.kind);
                    return (
                      <tr
                        key={item.id}
                        className="group cursor-pointer bg-white transition-all duration-200 ease-out hover:bg-primary/10 hover:-translate-y-[2px]"
                      >
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-muted/40 flex items-center justify-center">
                              <Icon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-foreground">{item.name}</div>
                              <div className="text-xs text-muted-foreground">
                                {item.kind === 'folder' ? 'Папка' : item.kind.toUpperCase()}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 align-middle text-sm text-muted-foreground">
                          {item.size || '—'}
                        </td>
                        <td className="px-4 py-3 align-middle text-sm text-foreground">
                          {item.owner}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            {item.shared ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                            {item.shared ? 'Общий' : 'Ограничен'}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <span className={cn(
                            'inline-flex items-center gap-1 text-xs',
                            item.verified ? 'text-emerald-600' : 'text-amber-500'
                          )}>
                            {item.verified ? <ShieldCheck className="h-3.5 w-3.5" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                            {item.verified ? 'Проверено' : 'Проверка'}
                          </span>
                        </td>
                        <td className="px-4 py-3 align-middle text-sm text-muted-foreground">
                          {item.updatedAt}
                        </td>
                        <td className="px-4 py-3 align-middle">
                          <div className="flex items-center gap-2">
                            {canDownload && (
                              <button className="inline-flex h-8 w-8 items-center justify-center bg-muted/40 text-foreground/80 transition-colors hover:bg-muted hover:text-foreground">
                                <Download className="h-4 w-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button className="inline-flex h-8 w-8 items-center justify-center bg-muted/40 text-foreground/80 transition-colors hover:bg-destructive/10 hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {visibleFiles.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        Нет доступных документов
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </AppLayout>
  );
}
