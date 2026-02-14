import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { useAuthStore } from '@/store/authStore';

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const navigate = useNavigate();
  const { role, logout } = useAuthStore();
  const roleLabel = role === 'director' ? 'Директор' : 'Менеджер';
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);

  const [accountForm, setAccountForm] = useState({
    fullName: 'dexzr',
    email: 'dexzr@crm.com',
    role: roleLabel,
    phone: '+380123456789',
    timezone: 'America/New_York',
    language: 'en',
    avatarUrl: '',
    twoFactor: true,
    notifyEmail: true,
    notifyPush: true,
    notifySlack: false,
  });

  const updateAccountField = (field: keyof typeof accountForm, value: string | boolean) => {
    setAccountForm((prev) => ({ ...prev, [field]: value }));
  };

  useEffect(() => {
    setAccountForm((prev) => ({ ...prev, role: roleLabel }));
  }, [roleLabel]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const notifications = [
    { id: 1, text: 'Новый заказ #ORD-006 получен', time: '2 мин назад', unread: true },
    { id: 2, text: 'Низкий остаток: iPhone 15 Pro Max', time: '15 мин назад', unread: true },
    { id: 3, text: 'Оплата по ORD-003 зачислена', time: '1 час назад', unread: false },
  ];

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <>
      <header className="sticky top-0 z-30 h-16 mx-6 mt-6 rounded-[22px] glass-panel topbar-outline">
      <div className="flex h-full items-center justify-between px-6">
        {/* Title */}
        <div className="animate-fade-in">
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="search-bar w-64">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl hover:bg-muted transition-colors"
            >
              <Bell className="h-5 w-5 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 glass-card rounded-2xl shadow-xl animate-scale-in overflow-hidden notification-panel">
                <div className="px-4 py-3 border-b border-border">
                  <h3 className="font-semibold text-sm">Уведомления</h3>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "px-4 py-3 border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer",
                        notification.unread && "bg-primary/5"
                      )}
                    >
                      <p className="text-sm text-foreground">{notification.text}</p>
                      <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-3 text-center">
                  <button className="text-sm font-medium text-primary hover:underline">
                    Все уведомления
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Profile */}
          <button
            onClick={() => setShowAccountSettings(true)}
            className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-muted transition-colors"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <User className="h-4 w-4" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-foreground">dexzr</p>
              <p className="text-xs text-muted-foreground">{roleLabel}</p>
            </div>
          </button>
        </div>
      </div>
    </header>

    <Modal
      isOpen={showAccountSettings}
      onClose={() => setShowAccountSettings(false)}
      title="Настройки аккаунта"
      size="lg"
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Полное имя *</label>
            <input
              type="text"
              className="ios-input"
              value={accountForm.fullName}
              onChange={(e) => updateAccountField('fullName', e.target.value)}
              placeholder="Введите имя"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Почта *</label>
            <input
              type="email"
              className="ios-input"
              value={accountForm.email}
              onChange={(e) => updateAccountField('email', e.target.value)}
              placeholder="email@company.com"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Роль</label>
            <input
              type="text"
              className="ios-input"
              value={accountForm.role}
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Телефон</label>
            <input
              type="tel"
              className="ios-input"
              value={accountForm.phone}
              onChange={(e) => updateAccountField('phone', e.target.value)}
              placeholder="+380123456789"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Часовой пояс</label>
            <select
              className="ios-input"
              value={accountForm.timezone}
              onChange={(e) => updateAccountField('timezone', e.target.value)}
            >
              <option value="America/New_York">America/New_York (UTC-05)</option>
              <option value="America/Chicago">America/Chicago (UTC-06)</option>
              <option value="America/Denver">America/Denver (UTC-07)</option>
              <option value="America/Los_Angeles">America/Los_Angeles (UTC-08)</option>
              <option value="Europe/London">Europe/London (UTC+00)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Язык</label>
            <select
              className="ios-input"
              value={accountForm.language}
              onChange={(e) => updateAccountField('language', e.target.value)}
            >
              <option value="en">English</option>
              <option value="ru">Русский</option>
              <option value="uk">Українська</option>
              <option value="es">Español</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Ссылка на аватар</label>
          <input
            type="url"
            className="ios-input"
            value={accountForm.avatarUrl}
            onChange={(e) => updateAccountField('avatarUrl', e.target.value)}
            placeholder="https://..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Новый пароль</label>
            <input type="password" className="ios-input" placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Повторите пароль</label>
            <input type="password" className="ios-input" placeholder="••••••••" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { key: 'twoFactor', label: 'Двухфакторная аутентификация', value: accountForm.twoFactor },
            { key: 'notifyEmail', label: 'Email-уведомления', value: accountForm.notifyEmail },
            { key: 'notifyPush', label: 'Push-уведомления', value: accountForm.notifyPush },
            { key: 'notifySlack', label: 'Slack-уведомления', value: accountForm.notifySlack },
          ].map((item) => (
            <div key={item.key} className="ios-setting-card">
              <span className="text-sm text-foreground">{item.label}</span>
              <label className="ios-switch">
                <input
                  type="checkbox"
                  checked={item.value}
                  onChange={(e) => updateAccountField(item.key as keyof typeof accountForm, e.target.checked)}
                />
                <span className="ios-switch-track" />
              </label>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border/60">
          <button onClick={handleLogout} className="text-sm font-medium text-destructive hover:underline">
            Выйти
          </button>
          <div className="flex gap-3">
            <button onClick={() => setShowAccountSettings(false)} className="ios-button-secondary">
              Отмена
            </button>
            <button onClick={() => setShowAccountSettings(false)} className="ios-button-primary">
              Сохранить
            </button>
          </div>
        </div>
      </div>
    </Modal>
    </>
  );
}
