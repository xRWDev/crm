import { useState, useMemo } from 'react';
import { Search, Edit, Trash2, Archive, Package } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { Modal } from '@/components/ui/Modal';
import { useCRMStore, Product } from '@/store/crmStore';
import { cn } from '@/lib/utils';

export default function Products() {
  const { products, addProduct, updateProduct, deleteProduct, getProductStock } = useCRMStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});

  const categories = useMemo(() => {
    const cats = new Set(products.map(p => p.category));
    return ['all', ...Array.from(cats)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, categoryFilter]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'UAH' }).format(value);

  const handleAddProduct = () => {
    setEditingProduct({
      name: '',
      sku: '',
      category: '',
      description: '',
      price: 0,
      purchasePrice: 0,
      vat: 20,
      images: [],
      status: 'active'
    });
    setIsModalOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleSaveProduct = () => {
    if (editingProduct.id) {
      updateProduct(editingProduct.id, editingProduct);
    } else {
      addProduct(editingProduct as Omit<Product, 'id' | 'createdAt'>);
    }
    setIsModalOpen(false);
    setEditingProduct({});
  };

  const handleDeleteProduct = (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      deleteProduct(id);
    }
  };

  const handleArchiveProduct = (product: Product) => {
    updateProduct(product.id, { status: product.status === 'active' ? 'archived' : 'active' });
  };

  return (
    <AppLayout title="Справочник" subtitle={`Позиций в справочнике: ${products.length}`}>
      <div className="space-y-6 animate-fade-up">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="search-bar flex-1 max-w-md">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setCategoryFilter(category)}
                className={cn(
                  "px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize",
                  categoryFilter === category 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => {
            const stock = getProductStock(product.id);
            const margin = ((product.price - product.purchasePrice) / product.price * 100).toFixed(1);
            
            return (
              <div 
                key={product.id}
                className={cn(
                  "glass-card rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 group",
                  product.status === 'archived' && "opacity-60"
                )}
              >
                {/* Product Image Placeholder */}
                <div className="h-40 bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
                  <Package className="h-12 w-12 text-muted-foreground/30" />
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-foreground line-clamp-1">{product.name}</h3>
                      <p className="text-xs text-muted-foreground">{product.sku}</p>
                    </div>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-xs font-medium",
                      product.status === 'active' 
                        ? "bg-success/10 text-success" 
                        : "bg-muted text-muted-foreground"
                    )}>
                      {product.status}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mb-3">{product.category}</p>

                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <p className="text-2xl font-bold text-foreground">{formatCurrency(product.price)}</p>
                      <p className="text-xs text-muted-foreground">
                        Cost: {formatCurrency(product.purchasePrice)} • Margin: {margin}%
                      </p>
                    </div>
                    <div className={cn(
                      "text-right",
                      stock <= 10 ? "text-destructive" : stock <= 20 ? "text-warning" : "text-success"
                    )}>
                      <p className="text-lg font-semibold">{stock}</p>
                      <p className="text-xs">in stock</p>
                    </div>
                  </div>

                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleEditProduct(product)}
                      className="flex-1 ios-button-secondary text-xs py-2"
                    >
                      <Edit className="h-3 w-3" /> Edit
                    </button>
                    <button 
                      onClick={() => handleArchiveProduct(product)}
                      className="ios-button bg-muted text-muted-foreground text-xs py-2"
                    >
                      <Archive className="h-3 w-3" />
                    </button>
                    <button 
                      onClick={() => handleDeleteProduct(product.id)}
                      className="ios-button bg-destructive/10 text-destructive text-xs py-2"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredProducts.length === 0 && (
          <div className="glass-card rounded-2xl p-12 text-center">
            <p className="text-muted-foreground">No products found</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct.id ? 'Edit Product' : 'Add New Product'}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Product Name *</label>
              <input
                type="text"
                className="ios-input"
                value={editingProduct.name || ''}
                onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                placeholder="MacBook Pro 16"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">SKU *</label>
              <input
                type="text"
                className="ios-input"
                value={editingProduct.sku || ''}
                onChange={(e) => setEditingProduct({ ...editingProduct, sku: e.target.value })}
                placeholder="MBP-16-M3"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Category *</label>
            <input
              type="text"
              className="ios-input"
              value={editingProduct.category || ''}
              onChange={(e) => setEditingProduct({ ...editingProduct, category: e.target.value })}
              placeholder="Laptops"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Description</label>
            <textarea
              className="ios-input min-h-[80px] resize-none"
              value={editingProduct.description || ''}
              onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
              placeholder="Product description..."
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Price *</label>
              <input
                type="number"
                className="ios-input"
                value={editingProduct.price || 0}
                onChange={(e) => setEditingProduct({ ...editingProduct, price: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Purchase Price *</label>
              <input
                type="number"
                className="ios-input"
                value={editingProduct.purchasePrice || 0}
                onChange={(e) => setEditingProduct({ ...editingProduct, purchasePrice: Number(e.target.value) })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">VAT %</label>
              <input
                type="number"
                className="ios-input"
                value={editingProduct.vat || 20}
                onChange={(e) => setEditingProduct({ ...editingProduct, vat: Number(e.target.value) })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Status</label>
            <select
              className="ios-input"
              value={editingProduct.status || 'active'}
              onChange={(e) => setEditingProduct({ ...editingProduct, status: e.target.value as Product['status'] })}
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button onClick={() => setIsModalOpen(false)} className="ios-button-secondary">
              Cancel
            </button>
            <button onClick={handleSaveProduct} className="ios-button-primary">
              {editingProduct.id ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </div>
      </Modal>

      <FloatingActionButton onClick={handleAddProduct} offsetX={96} offsetY={72} />
    </AppLayout>
  );
}
