import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, ShieldCheck } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuthStore, type UserRole } from '@/store/authStore';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const [role, setRole] = useState<UserRole>('manager');
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    login(role);
    navigate(role === 'director' ? '/dashboard/director' : '/dashboard/manager', { replace: true });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 crm-gradient" />
      <div className="absolute inset-0 crm-vignette" />

      <div className="relative w-[min(94vw,520px)] glass-card rounded-[28px] p-8 shadow-[0_24px_70px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-medium text-primary uppercase tracking-[0.2em]">crmPRO</p>
            <h1 className="mt-3 text-2xl font-semibold text-foreground">Вход в систему</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Доступ выдаётся администратором. Если забыли пароль — обратитесь к директору.
            </p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Логин</label>
            <div className="flex items-center gap-3 rounded-[18px] border border-border bg-background/40 px-4 py-2.5">
              <User className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={loginValue}
                onChange={(event) => setLoginValue(event.target.value)}
                placeholder="Введите логин"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                autoComplete="username"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Пароль</label>
            <div className="flex items-center gap-3 rounded-[18px] border border-border bg-background/40 px-4 py-2.5">
              <Lock className="h-4 w-4 text-muted-foreground" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Введите пароль"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                autoComplete="current-password"
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase">Роль</p>
            <ToggleGroup
              type="single"
              value={role}
              onValueChange={(value) => value && setRole(value as UserRole)}
              className="justify-start"
            >
              <ToggleGroupItem value="manager" size="sm">
                Менеджер
              </ToggleGroupItem>
              <ToggleGroupItem value="director" size="sm">
                Директор
              </ToggleGroupItem>
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">Роль назначается администратором (демо-переключатель).</p>
          </div>

          <button
            type="submit"
            className="ios-button-primary w-full justify-center"
            disabled={!loginValue || !password}
          >
            Войти
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-border/60 bg-muted/50 px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Восстановление пароля выполняет директор через свой аккаунт. Обратитесь в поддержку внутри компании.
          </p>
        </div>
      </div>
    </div>
  );
}
