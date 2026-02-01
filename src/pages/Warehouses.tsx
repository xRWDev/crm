import { useState, useMemo } from 'react';
import { ArrowRightLeft, AlertTriangle, Package, Edit, Plus } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Modal } from '@/components/ui/Modal';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { useCRMStore, Warehouse } from '@/store/crmStore';
import { cn } from '@/lib/utils';

export default function Warehouses() {
  const { warehouses, products, addWarehouse, updateWarehouse, updateStock, transferStock } = useCRMStore();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isStockOpen, setIsStockOpen] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Partial<Warehouse>>({});
  const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);
  const [transfer, setTransfer] = useState({ fromId: '', toId: '', productId: '', quantity: 0 });
  const [stockEdit, setStockEdit] = useState({ warehouseId: '', productId: '', quantity: 0 });

  const warehouseStats = useMemo(() => {
    return warehouses.map(wh => {
      const totalStock = wh.stock.reduce((sum, s) => sum + s.quantity, 0);
      const reservedStock = wh.stock.reduce((sum, s) => sum + s.reserved, 0);
      const lowStock = wh.stock.filter(s => s.quantity - s.reserved < s.minLevel);
      const overStock = wh.stock.filter(s => s.quantity > s.minLevel * 5);
      
      return {
        ...wh,
        totalStock,
        reservedStock,
        availableStock: totalStock - reservedStock,
        lowStock,
        overStock
      };
    });
  }, [warehouses]);

  const handleAddWarehouse = () => {
    setEditingWarehouse({ name: '', location: '', stock: [] });
    setIsModalOpen(true);
  };

  const handleEditWarehouse = (wh: Warehouse) => {
    setEditingWarehouse(wh);
    setIsModalOpen(true);
  };

  const handleSaveWarehouse = () => {
    if (editingWarehouse.id) {
      updateWarehouse(editingWarehouse.id, editingWarehouse);
    } else {
      addWarehouse(editingWarehouse as Omit<Warehouse, 'id'>);
    }
    setIsModalOpen(false);
    setEditingWarehouse({});
  };

  const handleTransfer = () => {
    if (transfer.fromId && transfer.toId && transfer.productId && transfer.quantity > 0) {
      transferStock(transfer.fromId, transfer.toId, transfer.productId, transfer.quantity);
      setIsTransferOpen(false);
      setTransfer({ fromId: '', toId: '', productId: '', quantity: 0 });
    }
  };

  const handleStockUpdate = () => {
    if (stockEdit.warehouseId && stockEdit.productId) {
      updateStock(stockEdit.warehouseId, stockEdit.productId, stockEdit.quantity);
      setIsStockOpen(false);
      setStockEdit({ warehouseId: '', productId: '', quantity: 0 });
    }
  };

  const openStockEdit = (warehouseId: string, productId: string, currentQty: number) => {
    setStockEdit({ warehouseId, productId, quantity: currentQty });
    setIsStockOpen(true);
  };

  return (
    <AppLayout title="Warehouses" subtitle={`${warehouses.length} locations`}>
      <div className="space-y-6 animate-fade-up">
        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => setIsTransferOpen(true)} className="ios-button-secondary">
            <ArrowRightLeft className="h-4 w-4" /> Transfer Stock
          </button>
        </div>

        {/* Warehouses Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {warehouseStats.map((warehouse) => (
            <div key={warehouse.id} className="glass-card rounded-2xl overflow-hidden">
              {/* Header */}
              <div className="p-5 border-b border-border">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{warehouse.name}</h3>
                    <p className="text-sm text-muted-foreground">{warehouse.location}</p>
                  </div>
                  <button
                    onClick={() => handleEditWarehouse(warehouse)}
                    className="p-2 rounded-lg hover:bg-muted"
                  >
                    <Edit className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="text-center p-3 rounded-xl bg-muted/50">
                    <p className="text-2xl font-bold text-foreground">{warehouse.totalStock}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-muted/50">
                    <p className="text-2xl font-bold text-foreground">{warehouse.availableStock}</p>
                    <p className="text-xs text-muted-foreground">Available</p>
                  </div>
                  <div className="text-center p-3 rounded-xl bg-muted/50">
                    <p className="text-2xl font-bold text-foreground">{warehouse.reservedStock}</p>
                    <p className="text-xs text-muted-foreground">Reserved</p>
                  </div>
                </div>

                {/* Alerts */}
                {warehouse.lowStock.length > 0 && (
                  <div className="mt-4 p-3 rounded-xl bg-warning/10 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    <span className="text-sm text-warning">{warehouse.lowStock.length} products low on stock</span>
                  </div>
                )}
              </div>

              {/* Stock List */}
              <div className="max-h-80 overflow-y-auto custom-scrollbar">
                {warehouse.stock.map((item) => {
                  const product = products.find(p => p.id === item.productId);
                  const available = item.quantity - item.reserved;
                  const isLow = available < item.minLevel;
                  
                  return (
                    <div 
                      key={item.productId}
                      className="flex items-center justify-between px-5 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer"
                      onClick={() => openStockEdit(warehouse.id, item.productId, item.quantity)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{product?.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{product?.sku}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "font-semibold",
                          isLow ? "text-destructive" : "text-foreground"
                        )}>
                          {available} <span className="text-xs text-muted-foreground font-normal">/ {item.quantity}</span>
                        </p>
                        {item.reserved > 0 && (
                          <p className="text-xs text-muted-foreground">{item.reserved} reserved</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Warehouse Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingWarehouse.id ? 'Edit Warehouse' : 'Add Warehouse'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Name *</label>
            <input
              type="text"
              className="ios-input"
              value={editingWarehouse.name || ''}
              onChange={(e) => setEditingWarehouse({ ...editingWarehouse, name: e.target.value })}
              placeholder="Main Warehouse"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Location *</label>
            <input
              type="text"
              className="ios-input"
              value={editingWarehouse.location || ''}
              onChange={(e) => setEditingWarehouse({ ...editingWarehouse, location: e.target.value })}
              placeholder="San Francisco, CA"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button onClick={() => setIsModalOpen(false)} className="ios-button-secondary">Cancel</button>
            <button onClick={handleSaveWarehouse} className="ios-button-primary">
              {editingWarehouse.id ? 'Save' : 'Add'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        title="Transfer Stock"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">From Warehouse</label>
              <select
                className="ios-input"
                value={transfer.fromId}
                onChange={(e) => setTransfer({ ...transfer, fromId: e.target.value })}
              >
                <option value="">Select</option>
                {warehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>{wh.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">To Warehouse</label>
              <select
                className="ios-input"
                value={transfer.toId}
                onChange={(e) => setTransfer({ ...transfer, toId: e.target.value })}
              >
                <option value="">Select</option>
                {warehouses.filter(wh => wh.id !== transfer.fromId).map(wh => (
                  <option key={wh.id} value={wh.id}>{wh.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Product</label>
            <select
              className="ios-input"
              value={transfer.productId}
              onChange={(e) => setTransfer({ ...transfer, productId: e.target.value })}
            >
              <option value="">Select product</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Quantity</label>
            <input
              type="number"
              className="ios-input"
              value={transfer.quantity}
              onChange={(e) => setTransfer({ ...transfer, quantity: Number(e.target.value) })}
              min="1"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button onClick={() => setIsTransferOpen(false)} className="ios-button-secondary">Cancel</button>
            <button onClick={handleTransfer} className="ios-button-primary">Transfer</button>
          </div>
        </div>
      </Modal>

      {/* Stock Edit Modal */}
      <Modal
        isOpen={isStockOpen}
        onClose={() => setIsStockOpen(false)}
        title="Update Stock"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Product: {products.find(p => p.id === stockEdit.productId)?.name}
          </p>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Quantity</label>
            <input
              type="number"
              className="ios-input"
              value={stockEdit.quantity}
              onChange={(e) => setStockEdit({ ...stockEdit, quantity: Number(e.target.value) })}
              min="0"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button onClick={() => setIsStockOpen(false)} className="ios-button-secondary">Cancel</button>
            <button onClick={handleStockUpdate} className="ios-button-primary">Update</button>
          </div>
        </div>
      </Modal>

      <FloatingActionButton onClick={handleAddWarehouse} offsetX={96} offsetY={72} />
    </AppLayout>
  );
}
