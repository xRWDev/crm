import { useState, useMemo } from 'react';
import { Search, ArrowRight, Edit, Trash2 } from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { useCRMStore, Lead } from '@/store/crmStore';
import { cn } from '@/lib/utils';

const leadStatuses: Lead['status'][] = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

export default function Leads() {
  const { leads, employees, addLead, updateLead, deleteLead, convertLeadToClient } = useCRMStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Partial<Lead>>({});
  const [statusFilter, setStatusFilter] = useState<Lead['status'] | 'all'>('all');

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => 
      lead.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.source.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [leads, searchQuery]);

  const leadsByStatus = useMemo(() => {
    return leadStatuses.reduce((acc, status) => {
      acc[status] = filteredLeads.filter(l => l.status === status);
      return acc;
    }, {} as Record<string, Lead[]>);
  }, [filteredLeads]);

  const visibleLeads = useMemo(() => {
    if (statusFilter === 'all') return filteredLeads;
    return leadsByStatus[statusFilter] || [];
  }, [filteredLeads, leadsByStatus, statusFilter]);

  const handleAddLead = () => {
    setEditingLead({
      contact: '',
      source: '',
      status: 'new',
      phone: '',
      email: ''
    });
    setIsModalOpen(true);
  };

  const handleEditLead = (lead: Lead) => {
    setEditingLead(lead);
    setIsModalOpen(true);
  };

  const handleSaveLead = () => {
    if (editingLead.id) {
      updateLead(editingLead.id, editingLead);
    } else {
      addLead(editingLead as Omit<Lead, 'id' | 'createdAt'>);
    }
    setIsModalOpen(false);
    setEditingLead({});
  };

  const handleDeleteLead = (id: string) => {
    if (confirm('Are you sure you want to delete this lead?')) {
      deleteLead(id);
    }
  };

  const handleConvert = (leadId: string) => {
    if (confirm('Convert this lead to a client?')) {
      convertLeadToClient(leadId);
    }
  };

  const handleStatusChange = (leadId: string, newStatus: Lead['status']) => {
    updateLead(leadId, { status: newStatus });
  };

  return (
    <AppLayout title="Leads" subtitle={`${leads.length} total leads`}>
      <div className="space-y-6 animate-fade-up">
        {/* Search */}
        <div className="search-bar w-full max-w-md">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-all",
              statusFilter === 'all'
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            All
          </button>
          {leadStatuses.map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all inline-flex items-center gap-2",
                statusFilter === status
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
              <span className="text-xs text-foreground/60">
                ({leadsByStatus[status]?.length || 0})
              </span>
            </button>
          ))}
        </div>

        {/* Leads Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {visibleLeads.map((lead) => {
            const manager = employees.find(e => e.id === lead.managerId);
            const status = lead.status;
            return (
              <div 
                key={lead.id}
                className="glass-card rounded-xl p-4 hover:shadow-lg transition-all duration-200 group"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-foreground">{lead.contact}</h4>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditLead(lead)}
                      className="p-1.5 rounded-lg hover:bg-muted"
                    >
                      <Edit className="h-3 w-3 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDeleteLead(lead.id)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-3">
                  <StatusBadge status={status} type="lead" />
                </div>

                <div className="space-y-1 text-sm text-muted-foreground mb-3">
                  <p>Source: {lead.source}</p>
                  {lead.interestedProduct && (
                    <p>Interested: {lead.interestedProduct}</p>
                  )}
                  {lead.email && <p>{lead.email}</p>}
                </div>

                {manager && (
                  <p className="text-xs text-muted-foreground mb-3">
                    Assigned to: {manager.name}
                  </p>
                )}

                <div className="flex gap-2">
                  {status !== 'won' && status !== 'lost' && (
                    <select
                      value={status}
                      onChange={(e) => handleStatusChange(lead.id, e.target.value as Lead['status'])}
                      className="flex-1 text-xs ios-input py-1.5 px-2"
                    >
                      {leadStatuses.map(s => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                      ))}
                    </select>
                  )}
                  {status === 'won' && (
                    <button
                      onClick={() => handleConvert(lead.id)}
                      className="flex-1 ios-button-primary text-xs py-1.5"
                    >
                      <ArrowRight className="h-3 w-3" /> Create Order
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {visibleLeads.length === 0 && (
            <div className="glass-card rounded-xl p-6 text-center col-span-full">
              <p className="text-sm text-muted-foreground">No leads</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingLead.id ? 'Edit Lead' : 'Add New Lead'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Contact Name *</label>
            <input
              type="text"
              className="ios-input"
              value={editingLead.contact || ''}
              onChange={(e) => setEditingLead({ ...editingLead, contact: e.target.value })}
              placeholder="Alex Turner"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Email</label>
              <input
                type="email"
                className="ios-input"
                value={editingLead.email || ''}
                onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                placeholder="alex@email.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Phone</label>
              <input
                type="tel"
                className="ios-input"
                value={editingLead.phone || ''}
                onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                placeholder="+1-555-0100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Source *</label>
              <select
                className="ios-input"
                value={editingLead.source || ''}
                onChange={(e) => setEditingLead({ ...editingLead, source: e.target.value })}
              >
                <option value="">Select source</option>
                <option value="Website">Website</option>
                <option value="LinkedIn">LinkedIn</option>
                <option value="Referral">Referral</option>
                <option value="Trade Show">Trade Show</option>
                <option value="Cold Call">Cold Call</option>
                <option value="Advertisement">Advertisement</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Status</label>
              <select
                className="ios-input"
                value={editingLead.status || 'new'}
                onChange={(e) => setEditingLead({ ...editingLead, status: e.target.value as Lead['status'] })}
              >
                {leadStatuses.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Interested Product</label>
            <input
              type="text"
              className="ios-input"
              value={editingLead.interestedProduct || ''}
              onChange={(e) => setEditingLead({ ...editingLead, interestedProduct: e.target.value })}
              placeholder="MacBook Pro"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Assigned Manager</label>
            <select
              className="ios-input"
              value={editingLead.managerId || ''}
              onChange={(e) => setEditingLead({ ...editingLead, managerId: e.target.value })}
            >
              <option value="">Unassigned</option>
              {employees.filter(e => e.role === 'manager' || e.role === 'admin').map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Notes</label>
            <textarea
              className="ios-input min-h-[80px] resize-none"
              value={editingLead.notes || ''}
              onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })}
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <button onClick={() => setIsModalOpen(false)} className="ios-button-secondary">
              Cancel
            </button>
            <button onClick={handleSaveLead} className="ios-button-primary">
              {editingLead.id ? 'Save Changes' : 'Add Lead'}
            </button>
          </div>
        </div>
      </Modal>

      <FloatingActionButton onClick={handleAddLead} offsetX={96} offsetY={72} />
    </AppLayout>
  );
}
