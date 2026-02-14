import { useState, useMemo } from 'react';
import { Search, Plus, Minus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useCRMStore, Order, OrderItem } from '@/store/crmStore';
import { useAuthStore } from '@/store/authStore';
import { cn } from '@/lib/utils';

const inWorkStatuses: Order['status'][] = ['new', 'confirmed', 'picking', 'shipped'];
const completedStatuses: Order['status'][] = ['delivered', 'returned', 'cancelled'];

const statusLabels: Record<Order['status'], string> = {
  new: 'Новая',
  confirmed: 'Подтверждена',
  picking: 'Комплектуется',
  shipped: 'Отправлена',
  delivered: 'Доставлена',
  returned: 'Возврат',
  cancelled: 'Отменена',
};

const orderReasonLabels: Record<Order['status'], string> = {
  new: 'Новый заказ',
  confirmed: 'Подтверждение заказа',
  picking: 'Комплектация заказа',
  shipped: 'Отправка заказа',
  delivered: 'Доставка завершена',
  returned: 'Возврат товара',
  cancelled: 'Отмена заказа',
};

const orderStatusStyles: Record<Order['status'], string> = {
  new: 'status-new',
  confirmed: 'status-confirmed',
  picking: 'status-picking',
  shipped: 'status-shipped',
  delivered: 'status-delivered',
  returned: 'status-returned',
  cancelled: 'status-cancelled',
};

export default function Orders() {
  const {
    orders, clients, products, warehouses, employees,
    addOrder, updateOrder, updateOrderStatus, deleteOrder,
    getOrderTotal
  } = useCRMStore();
  const { role } = useAuthStore();
  const isDirector = role === 'director';
  const adminId = useMemo(
    () => employees.find((emp) => emp.role === 'admin')?.id || employees[0]?.id || '1',
    [employees]
  );
  const managerId = useMemo(
    () => employees.find((emp) => emp.role === 'manager')?.id || employees[0]?.id || '2',
    [employees]
  );
  const currentUserId = isDirector ? adminId : managerId;

  const [searchQuery, setSearchQuery] = useState('');
  const [scopeFilter, setScopeFilter] = useState<'all' | 'mine'>(isDirector ? 'all' : 'mine');
  const [statusGroupFilter, setStatusGroupFilter] = useState<'all' | 'in_work' | 'not_completed' | 'completed'>('all');
  const [responsibleFilter, setResponsibleFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Partial<Order & { newItems: OrderItem[] }>>({});

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const client = clients.find(c => c.id === order.clientId);
      const managerMatch = scopeFilter === 'all' || order.managerId === currentUserId;
      const responsibleMatch = responsibleFilter === 'all' || order.managerId === responsibleFilter;
      const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client?.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatusGroup =
        statusGroupFilter === 'all' ||
        (statusGroupFilter === 'in_work' && inWorkStatuses.includes(order.status)) ||
        (statusGroupFilter === 'completed' && completedStatuses.includes(order.status)) ||
        (statusGroupFilter === 'not_completed' && !completedStatuses.includes(order.status));
      return matchesSearch && matchesStatusGroup && managerMatch && responsibleMatch;
    });
  }, [orders, clients, searchQuery, statusGroupFilter, scopeFilter, currentUserId, responsibleFilter]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

  const formatShortDate = (value: Date) =>
    value.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });

  const formatShortTime = (value: Date) =>
    value.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

  const formatOrderCode = (id: string) => `#${id.replace(/^ORD-/, '')}`;

  const getOrderDevice = (order: Order) => {
    const firstItem = order.items[0];
    const product = products.find((p) => p.id === firstItem?.productId);
    return {
      name: product?.name || '—',
      sku: product?.sku || '—',
    };
  };

  const getOrderReason = (order: Order) => order.comments?.trim() || orderReasonLabels[order.status];

  const getOrderDeadline = (order: Order) => {
    const lastEntry = order.statusHistory[order.statusHistory.length - 1];
    const baseDate = lastEntry?.date ? new Date(lastEntry.date) : new Date(order.createdAt);
    const deadline = new Date(baseDate);
    if (inWorkStatuses.includes(order.status)) {
      deadline.setDate(deadline.getDate() + 3);
    }
    return deadline;
  };

  const getInitials = (value?: string) => {
    if (!value) return '—';
    return value
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('');
  };

  const handleAddOrder = () => {
    setEditingOrder({
      clientId: '',
      items: [],
      newItems: [{ productId: '', quantity: 1, price: 0, discount: 0 }],
      status: 'new',
      paymentStatus: 'pending',
      deliveryMethod: 'Standard',
      warehouseId: warehouses[0]?.id || '',
      deliveryCost: 0
    });
    setIsModalOpen(true);
  };

  const handleEditOrder = (order: Order) => {
    setEditingOrder({ 
      ...order, 
      newItems: order.items.length > 0 ? order.items : [{ productId: '', quantity: 1, price: 0, discount: 0 }]
    });
    setIsModalOpen(true);
  };

  const handleSaveOrder = () => {
    const validItems = (editingOrder.newItems || []).filter(item => item.productId);
    if (editingOrder.id) {
      updateOrder(editingOrder.id, { ...editingOrder, items: validItems });
    } else {
      addOrder({ ...editingOrder, items: validItems } as Omit<Order, 'id' | 'createdAt' | 'statusHistory'>);
    }
    setIsModalOpen(false);
    setEditingOrder({});
  };

  const handleDeleteOrder = (id: string) => {
    if (confirm('Are you sure you want to delete this order?')) {
      deleteOrder(id);
    }
  };

  const handleStatusChange = (orderId: string, newStatus: Order['status']) => {
    updateOrderStatus(orderId, newStatus);
  };

  const addOrderItem = () => {
    setEditingOrder({
      ...editingOrder,
      newItems: [...(editingOrder.newItems || []), { productId: '', quantity: 1, price: 0, discount: 0 }]
    });
  };

  const updateOrderItem = (index: number, field: keyof OrderItem, value: string | number) => {
    const newItems = [...(editingOrder.newItems || [])];
    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      newItems[index] = { 
        ...newItems[index], 
        productId: value as string,
        price: product?.price || 0
      };
    } else {
      newItems[index] = { ...newItems[index], [field]: value };
    }
    setEditingOrder({ ...editingOrder, newItems });
  };

  const removeOrderItem = (index: number) => {
    const newItems = (editingOrder.newItems || []).filter((_, i) => i !== index);
    setEditingOrder({ ...editingOrder, newItems });
  };

  const openOrderDetail = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailOpen(true);
  };

  const calculateEditingTotal = () => {
    const itemsTotal = (editingOrder.newItems || []).reduce((sum, item) => {
      const discountedPrice = item.price * (1 - item.discount / 100);
      return sum + discountedPrice * item.quantity;
    }, 0);
    return itemsTotal + (editingOrder.deliveryCost || 0);
  };

  return (
    <AppLayout title="Сделки" subtitle={`Всего сделок: ${orders.length}`}>
      <div className="space-y-6 animate-fade-up">
        {/* Filters */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="search-bar flex-1 min-w-[420px]">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Поиск сделки..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <select
              value={responsibleFilter}
              onChange={(event) => setResponsibleFilter(event.target.value)}
              className="ios-input text-xs"
            >
              <option value="all">Ответственный: все</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2 flex-wrap">
            {isDirector && (
              <button
                onClick={() => setScopeFilter('all')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium transition-all',
                  scopeFilter === 'all'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                Все заказы
              </button>
            )}
            <button
              onClick={() => setScopeFilter('mine')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-all',
                scopeFilter === 'mine'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              Мои заказы
            </button>
            <button
              onClick={() => setStatusGroupFilter('in_work')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-all',
                statusGroupFilter === 'in_work'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              В работе
            </button>
            <button
              onClick={() => setStatusGroupFilter('not_completed')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-all',
                statusGroupFilter === 'not_completed'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              Не завершенные
            </button>
            <button
              onClick={() => setStatusGroupFilter('completed')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-all',
                statusGroupFilter === 'completed'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              Завершенные
            </button>
            <button
              onClick={() => setStatusGroupFilter('all')}
              className={cn(
                'px-3 py-1.5 text-xs font-medium transition-all',
                statusGroupFilter === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              )}
            >
              Все статусы
            </button>
          </div>
        </div>

        {/* Orders Table */}
        <div className="glass-card rounded-2xl border border-border p-0 m-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="service-table min-w-[1200px]">
              <thead>
                <tr className="bg-white/80 backdrop-blur-sm">
                  <th>Заказ №</th>
                  <th>Статус</th>
                  <th>Крайний срок</th>
                  <th>Менеджер</th>
                  <th>Устройство</th>
                  <th>Причина обращения</th>
                  <th>Клиент</th>
                  <th className="text-right">Итого</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const client = clients.find(c => c.id === order.clientId);
                  const total = getOrderTotal(order);
                  const manager = employees.find((emp) => emp.id === order.managerId);
                  const deadline = getOrderDeadline(order);
                  const device = getOrderDevice(order);
                  const reason = getOrderReason(order);
                  return (
                    <tr
                      key={order.id}
                      onClick={() => openOrderDetail(order)}
                      className="cursor-pointer"
                    >
                      <td className="whitespace-nowrap">
                        <div className="cell-title">{formatOrderCode(order.id)}</div>
                        <div className="cell-subtitle">{formatShortDate(new Date(order.createdAt))}</div>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className={cn('status-badge', orderStatusStyles[order.status])}>
                          {statusLabels[order.status]}
                        </span>
                      </td>
                      <td className="whitespace-nowrap">
                        <div className="cell-title">{formatShortDate(deadline)}</div>
                        <div className="cell-subtitle">{formatShortTime(deadline)}</div>
                      </td>
                      <td>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="text-[10px] font-semibold text-muted-foreground">
                              {getInitials(manager?.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="cell-title">{manager?.name || '—'}</div>
                            <div className="cell-subtitle">{manager?.position || 'Менеджер'}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="cell-title">{device.name}</div>
                        <div className="cell-subtitle">{device.sku}</div>
                      </td>
                      <td>
                        <div className="cell-title">{reason}</div>
                        <div className="cell-subtitle">Позиций: {order.items.length}</div>
                      </td>
                      <td>
                        <div className="cell-title">{client?.name || '—'}</div>
                        <div className="cell-subtitle">{client?.phone || '—'}</div>
                      </td>
                      <td className="text-right whitespace-nowrap">
                        <div className="cell-title tabular-nums">{formatCurrency(total)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {filteredOrders.length === 0 && (
          <div className="glass-card rounded-2xl p-12 text-center">
            <p className="text-muted-foreground">No orders found</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingOrder.id ? 'Edit Order' : 'Create New Order'}
        size="xl"
      >
        <div className="space-y-6">
          {/* Client & Warehouse */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Client *</label>
              <select
                className="ios-input"
                value={editingOrder.clientId || ''}
                onChange={(e) => setEditingOrder({ ...editingOrder, clientId: e.target.value })}
              >
                <option value="">Select client</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Warehouse *</label>
              <select
                className="ios-input"
                value={editingOrder.warehouseId || ''}
                onChange={(e) => setEditingOrder({ ...editingOrder, warehouseId: e.target.value })}
              >
                {warehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>{wh.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Order Items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-foreground">Products</label>
              <button onClick={addOrderItem} className="ios-button-secondary text-xs py-1.5">
                <Plus className="h-3 w-3" /> Add Product
              </button>
            </div>
            <div className="space-y-2">
              {(editingOrder.newItems || []).map((item, index) => (
                <div key={index} className="flex gap-2 items-end p-3 rounded-xl bg-muted/50">
                  <div className="flex-1">
                    <label className="text-xs text-muted-foreground">Product</label>
                    <select
                      className="ios-input text-sm"
                      value={item.productId}
                      onChange={(e) => updateOrderItem(index, 'productId', e.target.value)}
                    >
                      <option value="">Select product</option>
                      {products.filter(p => p.status === 'active').map(p => (
                        <option key={p.id} value={p.id}>{p.name} - {formatCurrency(p.price)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-20">
                    <label className="text-xs text-muted-foreground">Qty</label>
                    <input
                      type="number"
                      className="ios-input text-sm"
                      value={item.quantity}
                      onChange={(e) => updateOrderItem(index, 'quantity', Number(e.target.value))}
                      min="1"
                    />
                  </div>
                  <div className="w-24">
                    <label className="text-xs text-muted-foreground">Price</label>
                    <input
                      type="number"
                      className="ios-input text-sm"
                      value={item.price}
                      onChange={(e) => updateOrderItem(index, 'price', Number(e.target.value))}
                    />
                  </div>
                  <div className="w-20">
                    <label className="text-xs text-muted-foreground">Disc %</label>
                    <input
                      type="number"
                      className="ios-input text-sm"
                      value={item.discount}
                      onChange={(e) => updateOrderItem(index, 'discount', Number(e.target.value))}
                      min="0"
                      max="100"
                    />
                  </div>
                  <button
                    onClick={() => removeOrderItem(index)}
                    className="p-2 rounded-lg hover:bg-destructive/10"
                  >
                    <Minus className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery & Payment */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Delivery Method</label>
              <select
                className="ios-input"
                value={editingOrder.deliveryMethod || 'Standard'}
                onChange={(e) => setEditingOrder({ ...editingOrder, deliveryMethod: e.target.value })}
              >
                <option value="Standard">Standard</option>
                <option value="Express">Express</option>
                <option value="Same Day">Same Day</option>
                <option value="Pickup">Pickup</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Delivery Cost</label>
              <input
                type="number"
                className="ios-input"
                value={editingOrder.deliveryCost || 0}
                onChange={(e) => setEditingOrder({ ...editingOrder, deliveryCost: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Payment Status</label>
              <select
                className="ios-input"
                value={editingOrder.paymentStatus || 'pending'}
                onChange={(e) => setEditingOrder({ ...editingOrder, paymentStatus: e.target.value as Order['paymentStatus'] })}
              >
                <option value="pending">Pending</option>
                <option value="partial">Partial</option>
                <option value="paid">Paid</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>
          </div>

          {/* Total */}
          <div className="glass-card rounded-xl p-4 flex items-center justify-between">
            <span className="font-semibold text-foreground">Order Total</span>
            <span className="text-2xl font-bold text-primary">{formatCurrency(calculateEditingTotal())}</span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button onClick={() => setIsModalOpen(false)} className="ios-button-secondary">
              Cancel
            </button>
            <button onClick={handleSaveOrder} className="ios-button-primary">
              {editingOrder.id ? 'Save Changes' : 'Create Order'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Order Detail Modal */}
      <Modal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        title={`Order ${selectedOrder?.id}`}
        size="xl"
      >
        {selectedOrder && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">
                  {new Date(selectedOrder.createdAt).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div className="flex gap-2">
                <StatusBadge status={selectedOrder.status} type="order" />
                <StatusBadge status={selectedOrder.paymentStatus} type="payment" />
              </div>
            </div>

            {/* Client Info */}
            <div className="glass-card rounded-xl p-4">
              <h4 className="font-semibold text-foreground mb-2">Client</h4>
              {(() => {
                const client = clients.find(c => c.id === selectedOrder.clientId);
                return client ? (
                  <div className="text-sm">
                    <p className="font-medium text-foreground">{client.name}</p>
                    <p className="text-muted-foreground">{client.email}</p>
                    <p className="text-muted-foreground">{client.phone}</p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Unknown client</p>
                );
              })()}
            </div>

            {/* Order Items */}
            <div className="glass-card rounded-xl p-4">
              <h4 className="font-semibold text-foreground mb-3">Products</h4>
              <div className="space-y-2">
                {selectedOrder.items.map((item, index) => {
                  const product = products.find(p => p.id === item.productId);
                  const discountedPrice = item.price * (1 - item.discount / 100);
                  return (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium text-foreground">{product?.name || 'Unknown'}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatCurrency(item.price)} × {item.quantity}
                          {item.discount > 0 && ` (-${item.discount}%)`}
                        </p>
                      </div>
                      <p className="font-semibold text-foreground">
                        {formatCurrency(discountedPrice * item.quantity)}
                      </p>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <p className="text-muted-foreground">Delivery ({selectedOrder.deliveryMethod})</p>
                  <p className="font-medium text-foreground">{formatCurrency(selectedOrder.deliveryCost)}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                <span className="font-semibold text-lg text-foreground">Total</span>
                <span className="font-bold text-xl text-primary">{formatCurrency(getOrderTotal(selectedOrder))}</span>
              </div>
            </div>

            {/* Status History */}
            <div className="glass-card rounded-xl p-4">
              <h4 className="font-semibold text-foreground mb-3">Status History</h4>
              <div className="space-y-3">
                {selectedOrder.statusHistory.map((entry, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground capitalize">{entry.status}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(entry.date).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <FloatingActionButton onClick={handleAddOrder} offsetX={96} offsetY={72} />
    </AppLayout>
  );
}

