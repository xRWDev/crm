import { useMemo } from 'react';
import { MapPinned } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useCRMStore } from '@/store/crmStore';

export default function AnalyticsRegions() {
  const { orders, clients } = useCRMStore();

  const salesByRegion = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((order) => {
      const client = clients.find((c) => c.id === order.clientId);
      const region = client?.region || 'Не указан';
      map.set(region, (map.get(region) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count);
  }, [orders, clients]);

  return (
    <AppLayout title="Отчеты по регионам" subtitle="Продажи по регионам (карта)">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-up">
        <div className="lg:col-span-2 glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <MapPinned className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-foreground">Интерактивная карта</h3>
          </div>
          <div className="h-96 rounded-xl border border-dashed border-border/60 bg-muted/20 flex items-center justify-center text-sm text-muted-foreground">
            Карта страны появится здесь. Уточните страну и формат карты (SVG/GeoJSON).
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="font-semibold text-foreground mb-4">Продажи по регионам</h3>
          <div className="space-y-3">
            {salesByRegion.map((item) => (
              <div key={item.region} className="flex items-center justify-between text-sm">
                <span className="text-foreground">{item.region}</span>
                <span className="text-muted-foreground">{item.count}</span>
              </div>
            ))}
            {salesByRegion.length === 0 && (
              <p className="text-sm text-muted-foreground">Нет данных по регионам</p>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
