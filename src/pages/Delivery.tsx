import { useState, useMemo } from 'react';
import { Truck, MapPin, Package, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { useCRMStore, Order } from '@/store/crmStore';
import { cn } from '@/lib/utils';

const deliveryStatuses = ['pending', 'in_transit', 'out_for_delivery', 'delivered', 'failed'];

export default function Delivery() {
  const { orders, clients, updateOrder } = useCRMStore();
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editData, setEditData] = useState({ trackingNumber: '', deliveryStatus: '' });

  // Filter orders that are shipped or being prepared
  const deliveryOrders = useMemo(() => {
    return orders.filter(o => 
      ['confirmed', 'picking', 'shipped', 'delivered'].includes(o.status)
    );
  }, [orders]);

  const stats = useMemo(() => ({
    pending: deliveryOrders.filter(o => o.status === 'confirmed' || o.status === 'picking').length,
    inTransit: deliveryOrders.filter(o => o.status === 'shipped').length,
    delivered: deliveryOrders.filter(o => o.status === 'delivered').length,
    totalDeliveryCost: deliveryOrders.reduce((sum, o) => sum + o.deliveryCost, 0)
  }), [deliveryOrders]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'UAH' }).format(value);

  const handleEditDelivery = (order: Order) => {
    setSelectedOrder(order);
    setEditData({
      trackingNumber: order.trackingNumber || '',
      deliveryStatus: order.status
    });
    setIsEditOpen(true);
  };

  const handleSave = () => {
    if (selectedOrder) {
      updateOrder(selectedOrder.id, {
        trackingNumber: editData.trackingNumber,
        status: editData.deliveryStatus as Order['status']
      });
      setIsEditOpen(false);
    }
  };

  return (
    <AppLayout title="Delivery & Logistics" subtitle="Track and manage shipments">
      <div className="space-y-6 animate-fade-up">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.inTransit}</p>
                <p className="text-sm text-muted-foreground">In Transit</p>
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                <CheckCircle className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.delivered}</p>
                <p className="text-sm text-muted-foreground">Delivered</p>
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalDeliveryCost)}</p>
                <p className="text-sm text-muted-foreground">Delivery Costs</p>
              </div>
            </div>
          </div>
        </div>

        {/* Deliveries List */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ios-table">
              <thead>
                <tr className="bg-muted/30">
                  <th>Order</th>
                  <th>Client</th>
                  <th>Method</th>
                  <th>Tracking</th>
                  <th>Address</th>
                  <th>Status</th>
                  <th>Cost</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {deliveryOrders.map((order) => {
                  const client = clients.find(c => c.id === order.clientId);
                  const address = client?.addresses[0]?.address || order.deliveryAddress || 'Not specified';
                  
                  return (
                    <tr key={order.id}>
                      <td className="font-medium text-primary">{order.id}</td>
                      <td>{client?.name || 'Unknown'}</td>
                      <td>
                        <span className="inline-flex items-center gap-1.5 text-sm">
                          <Truck className="h-4 w-4 text-muted-foreground" />
                          {order.deliveryMethod}
                        </span>
                      </td>
                      <td>
                        {order.trackingNumber ? (
                          <span className="font-mono text-sm">{order.trackingNumber}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </td>
                      <td>
                        <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground max-w-[200px] truncate">
                          <MapPin className="h-4 w-4 flex-shrink-0" />
                          {address}
                        </span>
                      </td>
                      <td><StatusBadge status={order.status} type="order" /></td>
                      <td className="font-medium">{formatCurrency(order.deliveryCost)}</td>
                      <td>
                        <button
                          onClick={() => handleEditDelivery(order)}
                          className="ios-button-secondary text-xs py-1.5"
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {deliveryOrders.length === 0 && (
          <div className="glass-card rounded-2xl p-12 text-center">
            <Truck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No deliveries to track</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title={`Update Delivery - ${selectedOrder?.id}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Tracking Number</label>
            <input
              type="text"
              className="ios-input"
              value={editData.trackingNumber}
              onChange={(e) => setEditData({ ...editData, trackingNumber: e.target.value })}
              placeholder="Enter tracking number"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Status</label>
            <select
              className="ios-input"
              value={editData.deliveryStatus}
              onChange={(e) => setEditData({ ...editData, deliveryStatus: e.target.value })}
            >
              <option value="confirmed">Confirmed</option>
              <option value="picking">Picking</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button onClick={() => setIsEditOpen(false)} className="ios-button-secondary">Cancel</button>
            <button onClick={handleSave} className="ios-button-primary">Save</button>
          </div>
        </div>
      </Modal>
    </AppLayout>
  );
}
