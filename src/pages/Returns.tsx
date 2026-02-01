import { useState, useMemo } from 'react';
import { RotateCcw, Package, Check, X, Clock, Camera } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { useCRMStore, Return } from '@/store/crmStore';
import { cn } from '@/lib/utils';

const returnStatuses: Return['status'][] = ['pending', 'approved', 'rejected', 'completed'];

export default function Returns() {
  const { returns, orders, clients, addReturn, updateReturn } = useCRMStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReturn, setEditingReturn] = useState<Partial<Return>>({});

  const stats = useMemo(() => ({
    pending: returns.filter(r => r.status === 'pending').length,
    approved: returns.filter(r => r.status === 'approved').length,
    completed: returns.filter(r => r.status === 'completed').length,
    total: returns.length
  }), [returns]);

  const handleAddReturn = () => {
    setEditingReturn({
      orderId: '',
      reason: '',
      status: 'pending',
      resolution: 'refund'
    });
    setIsModalOpen(true);
  };

  const handleEditReturn = (ret: Return) => {
    setEditingReturn(ret);
    setIsModalOpen(true);
  };

  const handleSaveReturn = () => {
    if (editingReturn.id) {
      updateReturn(editingReturn.id, editingReturn);
    } else {
      addReturn(editingReturn as Omit<Return, 'id' | 'createdAt'>);
    }
    setIsModalOpen(false);
    setEditingReturn({});
  };

  const handleStatusChange = (id: string, status: Return['status']) => {
    updateReturn(id, { status });
  };

  return (
    <AppLayout title="Returns & Claims" subtitle="Manage product returns and complaints">
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
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10">
                <Check className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.approved}</p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <RotateCcw className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </div>
          <div className="metric-card">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <Package className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Returns</p>
              </div>
            </div>
          </div>
        </div>

        {/* Returns List */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="ios-table">
              <thead>
                <tr className="bg-muted/30">
                  <th>Return ID</th>
                  <th>Order</th>
                  <th>Client</th>
                  <th>Reason</th>
                  <th>Resolution</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {returns.map((ret) => {
                  const order = orders.find(o => o.id === ret.orderId);
                  const client = order ? clients.find(c => c.id === order.clientId) : null;
                  
                  return (
                    <tr key={ret.id}>
                      <td className="font-medium">RET-{ret.id}</td>
                      <td className="text-primary">{ret.orderId}</td>
                      <td>{client?.name || 'Unknown'}</td>
                      <td className="max-w-[200px] truncate">{ret.reason}</td>
                      <td>
                        <span className={cn(
                          "status-badge capitalize",
                          ret.resolution === 'refund' ? "bg-amber-500/10 text-amber-600" : "bg-primary/10 text-primary"
                        )}>
                          {ret.resolution}
                        </span>
                      </td>
                      <td>
                        <select
                          value={ret.status}
                          onChange={(e) => handleStatusChange(ret.id, e.target.value as Return['status'])}
                          className="text-xs ios-input py-1 px-2 w-28"
                        >
                          {returnStatuses.map(s => (
                            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="text-muted-foreground text-sm">
                        {new Date(ret.createdAt).toLocaleDateString()}
                      </td>
                      <td>
                        <button
                          onClick={() => handleEditReturn(ret)}
                          className="ios-button-secondary text-xs py-1.5"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {returns.length === 0 && (
          <div className="glass-card rounded-2xl p-12 text-center">
            <RotateCcw className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">No returns yet</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingReturn.id ? 'Return Details' : 'Create Return'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Order *</label>
            <select
              className="ios-input"
              value={editingReturn.orderId || ''}
              onChange={(e) => setEditingReturn({ ...editingReturn, orderId: e.target.value })}
              disabled={!!editingReturn.id}
            >
              <option value="">Select order</option>
              {orders.map(o => (
                <option key={o.id} value={o.id}>{o.id}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Reason *</label>
            <textarea
              className="ios-input min-h-[100px] resize-none"
              value={editingReturn.reason || ''}
              onChange={(e) => setEditingReturn({ ...editingReturn, reason: e.target.value })}
              placeholder="Describe the reason for return..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Resolution</label>
            <select
              className="ios-input"
              value={editingReturn.resolution || 'refund'}
              onChange={(e) => setEditingReturn({ ...editingReturn, resolution: e.target.value as Return['resolution'] })}
            >
              <option value="refund">Refund</option>
              <option value="replacement">Replacement</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Status</label>
            <select
              className="ios-input"
              value={editingReturn.status || 'pending'}
              onChange={(e) => setEditingReturn({ ...editingReturn, status: e.target.value as Return['status'] })}
            >
              {returnStatuses.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
            <textarea
              className="ios-input min-h-[80px] resize-none"
              value={editingReturn.notes || ''}
              onChange={(e) => setEditingReturn({ ...editingReturn, notes: e.target.value })}
              placeholder="Additional notes..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button onClick={() => setIsModalOpen(false)} className="ios-button-secondary">Cancel</button>
            <button onClick={handleSaveReturn} className="ios-button-primary">
              {editingReturn.id ? 'Save' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      <FloatingActionButton onClick={handleAddReturn} offsetX={96} offsetY={72} />
    </AppLayout>
  );
}
