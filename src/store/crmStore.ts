import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export interface ClientContact {
  id: string;
  name: string;
  position?: string;
  phones: string[];
  emails: string[];
}

export interface ClientComment {
  id: string;
  text: string;
  createdAt: Date;
  authorId?: string;
  authorName?: string;
  updatedAt?: Date;
}

export interface ClientCommunication {
  id: string;
  scheduledAt: Date;
  note?: string;
  status: 'planned' | 'closed';
  result?: 'success' | 'failed';
  reason?: string;
  createdAt: Date;
  closedAt?: Date | null;
}

export interface ClientDeal {
  id: string;
  createdAt: Date;
  title: string;
  unit: string;
  qty: number;
  price: number;
  amount: number;
  declarationNumber?: string;
  recipientName?: string;
  recipientPhone?: string;
  comment?: string;
  documents?: string[];
}

export interface TaskComment {
  id: string;
  text: string;
  createdAt: Date;
  authorId?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  createdAt: Date;
  dueDate?: Date | null;
  assigneeId: string;
  creatorId: string;
  status: 'open' | 'in_progress' | 'completed';
  priority: 'high' | 'medium' | 'low';
  isUrgent?: boolean;
  rewardAmount?: number;
  penaltyAmount?: number;
  completedAt?: Date | null;
  comments?: TaskComment[];
}

export interface Client {
  id: string;
  name: string;
  company?: string;
  phone: string;
  email: string;
  messengers?: { type: string; handle: string }[];
  addresses: { label: string; address: string }[];
  status: 'new' | 'regular' | 'vip' | 'problem';
  region?: string;
  city?: string;
  activityType?: string;
  productCategory?: string;
  website?: string;
  clientType?: 'client' | 'supplier' | 'competitor' | 'partner';
  communicationStatus?: 'none' | 'refused' | 'in_progress' | 'success';
  nextContactAt?: Date | null;
  lastCommunicationAt?: Date | null;
  reminderAt?: Date | null;
  isFavorite?: boolean;
  responsibleId?: string;
  sourceChannel?: string;
  contacts?: ClientContact[];
  comments?: ClientComment[];
  communications?: ClientCommunication[];
  deals?: ClientDeal[];
  allowManagerDeleteComments?: boolean;
  discounts: number;
  bonusPoints: number;
  managerId?: string;
  notes?: string;
  createdAt: Date;
}

export interface Lead {
  id: string;
  contact: string;
  phone?: string;
  email?: string;
  source: string;
  interestedProduct?: string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  managerId?: string;
  rejectionReason?: string;
  notes?: string;
  createdAt: Date;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  description?: string;
  price: number;
  purchasePrice: number;
  vat: number;
  images: string[];
  status: 'active' | 'archived';
  variations?: { type: string; value: string }[];
  relatedProducts?: string[];
  createdAt: Date;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  stock: { productId: string; quantity: number; reserved: number; minLevel: number }[];
}

export interface OrderItem {
  productId: string;
  quantity: number;
  price: number;
  discount: number;
}

export interface Order {
  id: string;
  clientId: string;
  items: OrderItem[];
  status: 'new' | 'confirmed' | 'picking' | 'shipped' | 'delivered' | 'returned' | 'cancelled';
  paymentStatus: 'pending' | 'partial' | 'paid' | 'refunded';
  paymentMethod?: string;
  deliveryMethod: string;
  warehouseId: string;
  deliveryAddress?: string;
  trackingNumber?: string;
  deliveryCost: number;
  managerId?: string;
  comments?: string;
  statusHistory: { status: string; date: Date; note?: string }[];
  createdAt: Date;
}

export interface Employee {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  email: string;
  phones?: string[];
  gender?: 'male' | 'female' | 'other';
  position?: string;
  login?: string;
  password?: string;
  role: 'admin' | 'manager' | 'warehouse' | 'logistics' | 'accounting';
  avatar?: string;
  isActive: boolean;
  employmentType?: 'staff' | 'contractor';
  employmentStatus?: 'active' | 'fired';
  hireDate?: Date | null;
  fireDate?: Date | null;
  birthday?: Date | null;
  city?: string;
  activityLog?: { id: string; type: 'login'; at: Date }[];
  salary?: Record<string, { salary?: number; bonus?: number; penalty?: number }>;
  efficiencyTargets?: { communications?: number; orders?: number; tasks?: number };
  efficiencyActual?: { communications?: number; orders?: number; tasks?: number };
  terminationComment?: string;
}

export interface Return {
  id: string;
  orderId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  resolution: 'refund' | 'replacement';
  photos?: string[];
  notes?: string;
  createdAt: Date;
}

export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  type: 'income' | 'refund' | 'fee';
  method: string;
  date: Date;
}

interface CRMState {
  clients: Client[];
  tasks: Task[];
  leads: Lead[];
  products: Product[];
  orders: Order[];
  warehouses: Warehouse[];
  employees: Employee[];
  returns: Return[];
  payments: Payment[];
  
  // Client actions
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => string;
  updateClient: (id: string, data: Partial<Client>) => void;
  deleteClient: (id: string) => void;

  // Task actions
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => string;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  
  // Lead actions
  addLead: (lead: Omit<Lead, 'id' | 'createdAt'>) => void;
  updateLead: (id: string, data: Partial<Lead>) => void;
  deleteLead: (id: string) => void;
  convertLeadToClient: (leadId: string) => string;
  
  // Product actions
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  updateProduct: (id: string, data: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
  
  // Order actions
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'statusHistory'>) => void;
  updateOrder: (id: string, data: Partial<Order>) => void;
  updateOrderStatus: (id: string, status: Order['status'], note?: string) => void;
  deleteOrder: (id: string) => void;
  
  // Warehouse actions
  addWarehouse: (warehouse: Omit<Warehouse, 'id'>) => void;
  updateWarehouse: (id: string, data: Partial<Warehouse>) => void;
  updateStock: (warehouseId: string, productId: string, quantity: number) => void;
  transferStock: (fromId: string, toId: string, productId: string, quantity: number) => void;
  
  // Employee actions
  addEmployee: (employee: Omit<Employee, 'id'>) => string;
  updateEmployee: (id: string, data: Partial<Employee>) => void;
  deleteEmployee: (id: string) => void;
  
  // Return actions
  addReturn: (ret: Omit<Return, 'id' | 'createdAt'>) => void;
  updateReturn: (id: string, data: Partial<Return>) => void;
  
  // Payment actions
  addPayment: (payment: Omit<Payment, 'id'>) => void;
  
  // Computed helpers
  getClientOrders: (clientId: string) => Order[];
  getClientRevenue: (clientId: string) => number;
  getClientAverageCheck: (clientId: string) => number;
  getProductStock: (productId: string) => number;
  getOrderTotal: (order: Order) => number;
  getOrderProfit: (order: Order) => number;
}

const generateId = () => Math.random().toString(36).substr(2, 9);
const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
};

// Initial mock data
const initialClients: Client[] = [
  {
    id: '1',
    name: 'John Smith',
    company: 'Tech Corp',
    phone: '+1-555-0101',
    email: 'john@techcorp.com',
    addresses: [{ label: 'Office', address: '123 Tech Blvd, San Francisco, CA' }],
    status: 'vip',
    region: 'California',
    city: 'San Francisco',
    activityType: 'Pharmacy',
    productCategory: 'Medical supplies',
    website: 'techcorp.com',
    clientType: 'client',
    communicationStatus: 'in_progress',
    nextContactAt: new Date('2026-01-25T10:00:00'),
    lastCommunicationAt: new Date('2026-01-23T15:30:00'),
    reminderAt: new Date('2026-01-25T09:45:00'),
    isFavorite: true,
    responsibleId: '1',
    sourceChannel: 'Referral',
    contacts: [
      {
        id: 'contact-1',
        name: 'Olivia Mills',
        position: 'Purchasing',
        phones: ['+1-555-0199'],
        emails: ['olivia@techcorp.com'],
      },
      {
        id: 'contact-2',
        name: 'Aaron Cole',
        position: 'Operations',
        phones: ['+1-555-0188'],
        emails: ['ops@techcorp.com'],
      },
      {
        id: 'contact-3',
        name: 'Michelle Hart',
        position: 'Finance Director',
        phones: ['+1-555-0170'],
        emails: ['finance@techcorp.com'],
      },
    ],
    comments: [
      {
        id: 'comment-1',
        text: 'Discussed renewal terms.',
        createdAt: new Date('2026-01-23T15:40:00'),
        authorId: '1',
        authorName: 'dexzr',
      },
    ],
    notes: 'Обсудили продление договора и сроки поставки.',
    communications: [
      {
        id: 'comm-1',
        scheduledAt: new Date('2026-01-23T15:30:00'),
        note: 'Обсудили продление договора.',
        status: 'closed',
        result: 'success',
        createdAt: new Date('2026-01-23T15:00:00'),
        closedAt: new Date('2026-01-23T15:45:00'),
      },
      {
        id: 'comm-2',
        scheduledAt: new Date('2026-01-25T10:00:00'),
        note: 'Уточнить условия поставки.',
        status: 'planned',
        createdAt: new Date('2026-01-24T10:10:00'),
      },
    ],
    deals: [
      {
        id: 'deal-1',
        createdAt: new Date('2026-01-21T09:30:00'),
        title: 'Пакет Банан 4x6 (ПВД)',
        unit: 'шт.',
        qty: 1200,
        price: 0.9,
        amount: 1080,
        declarationNumber: '06532/22/01/000122',
        recipientName: 'Иван Петров',
        recipientPhone: '+380 67 111 22 33',
        documents: ['Договор.pdf', 'Счет.pdf'],
        comment: 'Продление договора.',
      },
      {
        id: 'deal-2',
        createdAt: new Date('2026-01-22T11:10:00'),
        title: 'Пакет Банан 4x6 (ПВД) 50 мкм',
        unit: 'кг',
        qty: 100,
        price: 0.32,
        amount: 32,
        declarationNumber: '06532/22/01/000123',
        recipientName: 'Марина Дрозд',
        recipientPhone: '+380 67 222 44 55',
        documents: ['ТТН.pdf'],
        comment: 'Ожидаем подтверждение объема.',
      },
    ],
    allowManagerDeleteComments: true,
    discounts: 15,
    bonusPoints: 2500,
    managerId: '1',
    createdAt: new Date('2024-01-15'),
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    phone: '+1-555-0102',
    email: 'sarah@email.com',
    addresses: [{ label: 'Home', address: '456 Oak Street, New York, NY' }],
    status: 'regular',
    region: 'New York',
    city: 'New York',
    activityType: 'Bank',
    productCategory: 'Office supplies',
    website: 'sarahsupplies.com',
    clientType: 'supplier',
    communicationStatus: 'none',
    nextContactAt: null,
    lastCommunicationAt: null,
    reminderAt: null,
    isFavorite: true,
    responsibleId: '2',
    sourceChannel: 'Website',
    contacts: [
      {
        id: 'contact-2-1',
        name: 'Aaron Cole',
        position: 'Operations',
        phones: ['+1-555-0188'],
        emails: ['ops@sarahsupplies.com'],
      },
      {
        id: 'contact-2-2',
        name: 'Linda Perez',
        position: 'Purchasing Manager',
        phones: ['+1-555-0189'],
        emails: ['linda.perez@sarahsupplies.com'],
      },
      {
        id: 'contact-2-3',
        name: 'Brian Stone',
        position: 'Finance',
        phones: ['+1-555-0190'],
        emails: ['b.stone@sarahsupplies.com'],
      },
    ],
    comments: [
      {
        id: 'comment-2',
        text: 'Waiting for updated price list.',
        createdAt: new Date('2026-01-20T09:10:00'),
        authorId: '2',
        authorName: 'Jim Halpert',
      },
    ],
    notes: 'Ожидаем обновленный прайс от поставщика.',
    communications: [
      {
        id: 'comm-2-1',
        scheduledAt: new Date('2026-01-20T09:00:00'),
        note: 'Запросить новый прайс.',
        status: 'closed',
        result: 'failed',
        reason: 'expensive',
        createdAt: new Date('2026-01-20T08:40:00'),
        closedAt: new Date('2026-01-20T09:20:00'),
      },
    ],
    deals: [],
    allowManagerDeleteComments: false,
    discounts: 5,
    bonusPoints: 800,
    managerId: '2',
    createdAt: new Date('2024-02-20'),
  },
  {
    id: '3',
    name: 'Mike Wilson',
    company: 'StartupXYZ',
    phone: '+1-555-0103',
    email: 'mike@startupxyz.com',
    addresses: [{ label: 'Work', address: '789 Innovation Way, Austin, TX' }],
    status: 'new',
    region: 'Texas',
    city: 'Austin',
    activityType: 'Laundry',
    productCategory: 'Uniforms',
    website: 'startupxyz.com',
    clientType: 'competitor',
    communicationStatus: 'refused',
    nextContactAt: new Date('2026-01-24T14:00:00'),
    lastCommunicationAt: new Date('2026-01-18T10:00:00'),
    reminderAt: new Date('2026-01-24T13:30:00'),
    isFavorite: false,
    responsibleId: '1',
    sourceChannel: 'Cold outreach',
    contacts: [
      {
        id: 'contact-3-1',
        name: 'Olena Kovalenko',
        position: 'CEO',
        phones: ['+1-555-0211'],
        emails: ['olena@startupxyz.com'],
      },
      {
        id: 'contact-3-2',
        name: 'Dmytro Hnatyuk',
        position: 'Head of Procurement',
        phones: ['+1-555-0212'],
        emails: ['procurement@startupxyz.com'],
      },
      {
        id: 'contact-3-3',
        name: 'Yulia Markova',
        position: 'Accountant',
        phones: ['+1-555-0213'],
        emails: ['accounting@startupxyz.com'],
      },
    ],
    comments: [
      {
        id: 'comment-3',
        text: 'Not interested at the moment.',
        createdAt: new Date('2026-01-18T10:05:00'),
        authorId: '3',
        authorName: 'Dwight Schrute',
      },
    ],
    notes: 'Клиент пока не заинтересован.',
    communications: [
      {
        id: 'comm-3-1',
        scheduledAt: new Date('2026-01-18T10:00:00'),
        note: 'Предложить спецусловия.',
        status: 'closed',
        result: 'failed',
        reason: 'not_using',
        createdAt: new Date('2026-01-18T09:30:00'),
        closedAt: new Date('2026-01-18T10:10:00'),
      },
    ],
    deals: [],
    allowManagerDeleteComments: false,
    discounts: 0,
    bonusPoints: 100,
    managerId: '1',
    createdAt: new Date('2024-03-10'),
  },
  {
    id: '4',
    name: 'Emily Davis',
    phone: '+1-555-0104',
    email: 'emily.d@email.com',
    addresses: [{ label: 'Home', address: '321 Elm Avenue, Seattle, WA' }],
    status: 'regular',
    region: 'Washington',
    city: 'Seattle',
    activityType: 'Retail',
    productCategory: 'Toys',
    website: 'emilyretail.com',
    clientType: 'partner',
    communicationStatus: 'success',
    nextContactAt: new Date('2026-01-27T11:30:00'),
    lastCommunicationAt: new Date('2026-01-22T12:15:00'),
    reminderAt: new Date('2026-01-27T11:00:00'),
    isFavorite: false,
    responsibleId: '2',
    sourceChannel: 'Event',
    contacts: [
      {
        id: 'contact-4-1',
        name: 'Mark Davis',
        position: 'Owner',
        phones: ['+1-555-0155'],
        emails: ['mark@emilyretail.com'],
      },
      {
        id: 'contact-4-2',
        name: 'Sophia Reed',
        position: 'Sales Lead',
        phones: ['+1-555-0156'],
        emails: ['s.reed@emilyretail.com'],
      },
      {
        id: 'contact-4-3',
        name: 'Ivan Petrov',
        position: 'Operations',
        phones: ['+1-555-0157'],
        emails: ['ops@emilyretail.com'],
      },
    ],
    comments: [
      {
        id: 'comment-4',
        text: 'Signed partnership agreement.',
        createdAt: new Date('2026-01-22T12:20:00'),
        authorId: '2',
        authorName: 'Jim Halpert',
      },
    ],
    notes: 'Подписали партнерское соглашение.',
    communications: [
      {
        id: 'comm-4-1',
        scheduledAt: new Date('2026-01-22T12:00:00'),
        note: 'Финальное согласование договора.',
        status: 'closed',
        result: 'success',
        createdAt: new Date('2026-01-22T11:20:00'),
        closedAt: new Date('2026-01-22T12:15:00'),
      },
    ],
    deals: [],
    allowManagerDeleteComments: true,
    discounts: 10,
    bonusPoints: 1200,
    managerId: '2',
    createdAt: new Date('2024-01-28'),
  },
  {
    id: '5',
    name: 'Robert Brown',
    company: 'Enterprise Inc',
    phone: '+1-555-0105',
    email: 'rbrown@enterprise.com',
    addresses: [{ label: 'HQ', address: '555 Corporate Plaza, Chicago, IL' }],
    status: 'vip',
    region: 'Illinois',
    city: 'Chicago',
    activityType: 'Pharmacy',
    productCategory: 'Clothing',
    website: 'enterprise.com',
    clientType: 'client',
    communicationStatus: 'in_progress',
    nextContactAt: new Date('2026-01-26T09:00:00'),
    lastCommunicationAt: new Date('2026-01-24T16:20:00'),
    reminderAt: new Date('2026-01-26T08:30:00'),
    isFavorite: false,
    responsibleId: '1',
    sourceChannel: 'Partner',
    contacts: [
      {
        id: 'contact-5-1',
        name: 'Linda Stone',
        position: 'Procurement',
        phones: ['+1-555-0177'],
        emails: ['lstone@enterprise.com'],
      },
      {
        id: 'contact-5-2',
        name: 'Michael Grant',
        position: 'Logistics',
        phones: ['+1-555-0178'],
        emails: ['m.grant@enterprise.com'],
      },
      {
        id: 'contact-5-3',
        name: 'Iryna Koval',
        position: 'Finance',
        phones: ['+1-555-0179'],
        emails: ['ikoval@enterprise.com'],
      },
    ],
    comments: [
      {
        id: 'comment-5',
        text: 'Requested updated contract draft.',
        createdAt: new Date('2026-01-24T16:25:00'),
        authorId: '1',
        authorName: 'dexzr',
      },
    ],
    notes: 'Ожидаем обновленный договор.',
    communications: [
      {
        id: 'comm-5-1',
        scheduledAt: new Date('2026-01-26T09:00:00'),
        note: 'Согласовать договор и объем.',
        status: 'planned',
        createdAt: new Date('2026-01-24T16:40:00'),
      },
    ],
    deals: [],
    allowManagerDeleteComments: false,
    discounts: 20,
    bonusPoints: 5000,
    managerId: '1',
    createdAt: new Date('2023-11-05'),
  },
];

const initialTasks: Task[] = [
  {
    id: 'TSK-001',
    title: 'Подготовить коммерческое предложение',
    description: 'Сформировать КП для клиента Tech Corp, учесть скидку и сроки поставки.',
    createdAt: new Date('2026-01-22T09:00:00'),
    dueDate: new Date('2026-01-28T18:00:00'),
    assigneeId: '2',
    creatorId: '1',
    status: 'in_progress',
    priority: 'high',
    isUrgent: true,
    comments: [
      { id: 'task-comment-1', text: 'Нужны финальные цены от склада.', createdAt: new Date('2026-01-22T12:00:00'), authorId: '2' },
    ],
  },
  {
    id: 'TSK-002',
    title: 'Согласовать условия договора',
    description: 'Уточнить с юристом условия поставки и штрафы.',
    createdAt: new Date('2026-01-20T11:30:00'),
    dueDate: new Date('2026-01-24T17:00:00'),
    assigneeId: '3',
    creatorId: '1',
    status: 'open',
    priority: 'medium',
    comments: [],
  },
  {
    id: 'TSK-003',
    title: 'Контроль оплаты по счету',
    description: 'Проверить оплату по счету ORD-003, напомнить клиенту.',
    createdAt: new Date('2026-01-18T10:00:00'),
    dueDate: new Date('2026-01-23T12:00:00'),
    assigneeId: '2',
    creatorId: '1',
    status: 'completed',
    priority: 'high',
    isUrgent: false,
    completedAt: new Date('2026-01-23T11:15:00'),
    comments: [
      { id: 'task-comment-2', text: 'Оплата подтверждена.', createdAt: new Date('2026-01-23T11:10:00'), authorId: '2' },
    ],
  },
  {
    id: 'TSK-004',
    title: 'Подготовить отчет по сделкам',
    description: 'Сводный отчет по всем сделкам за месяц.',
    createdAt: new Date('2026-01-15T09:20:00'),
    dueDate: null,
    assigneeId: '2',
    creatorId: '2',
    status: 'open',
    priority: 'low',
    comments: [],
  },
  {
    id: 'TSK-005',
    title: 'Запланировать встречу с клиентом',
    description: 'Договориться о встрече на следующей неделе.',
    createdAt: new Date('2026-01-24T14:00:00'),
    dueDate: new Date('2026-01-30T16:00:00'),
    assigneeId: '3',
    creatorId: '2',
    status: 'in_progress',
    priority: 'medium',
    isUrgent: false,
    comments: [],
  },
];

const initialLeads: Lead[] = [
  { id: '1', contact: 'Alex Turner', phone: '+1-555-0201', email: 'alex@email.com', source: 'Website', interestedProduct: 'MacBook Pro', status: 'new', managerId: '1', createdAt: new Date('2024-03-15') },
  { id: '2', contact: 'Jessica Lee', email: 'jlee@company.com', source: 'LinkedIn', interestedProduct: 'iPhone 15 Pro', status: 'contacted', managerId: '2', createdAt: new Date('2024-03-14') },
  { id: '3', contact: 'David Chen', phone: '+1-555-0203', source: 'Referral', interestedProduct: 'iPad Pro', status: 'qualified', managerId: '1', createdAt: new Date('2024-03-12') },
  { id: '4', contact: 'Maria Garcia', email: 'mgarcia@startup.io', source: 'Trade Show', status: 'proposal', managerId: '2', createdAt: new Date('2024-03-10') },
];

const initialProducts: Product[] = [
  { id: '1', name: 'MacBook Pro 16"', sku: 'MBP-16-M3', category: 'Laptops', description: 'M3 Max chip, 36GB RAM, 1TB SSD', price: 3499, purchasePrice: 2800, vat: 20, images: [], status: 'active', createdAt: new Date('2024-01-01') },
  { id: '2', name: 'iPhone 15 Pro Max', sku: 'IP15-PM-256', category: 'Phones', description: '256GB, Natural Titanium', price: 1199, purchasePrice: 900, vat: 20, images: [], status: 'active', createdAt: new Date('2024-01-01') },
  { id: '3', name: 'iPad Pro 12.9"', sku: 'IPAD-PRO-12', category: 'Tablets', description: 'M2 chip, 256GB, Wi-Fi + Cellular', price: 1299, purchasePrice: 1000, vat: 20, images: [], status: 'active', createdAt: new Date('2024-01-01') },
  { id: '4', name: 'Apple Watch Ultra 2', sku: 'AW-ULTRA-2', category: 'Wearables', description: 'Titanium, 49mm', price: 799, purchasePrice: 600, vat: 20, images: [], status: 'active', createdAt: new Date('2024-01-01') },
  { id: '5', name: 'AirPods Pro 2', sku: 'APP-2-USB', category: 'Audio', description: 'USB-C, Active Noise Cancellation', price: 249, purchasePrice: 180, vat: 20, images: [], status: 'active', createdAt: new Date('2024-01-01') },
  { id: '6', name: 'Magic Keyboard', sku: 'MK-TOUCH', category: 'Accessories', description: 'Touch ID, Numeric Keypad', price: 199, purchasePrice: 140, vat: 20, images: [], status: 'active', createdAt: new Date('2024-01-01') },
];

const initialWarehouses: Warehouse[] = [
  { id: '1', name: 'Main Warehouse', location: 'San Francisco, CA', stock: [
    { productId: '1', quantity: 45, reserved: 5, minLevel: 10 },
    { productId: '2', quantity: 120, reserved: 15, minLevel: 20 },
    { productId: '3', quantity: 35, reserved: 3, minLevel: 8 },
    { productId: '4', quantity: 60, reserved: 8, minLevel: 15 },
    { productId: '5', quantity: 200, reserved: 20, minLevel: 50 },
    { productId: '6', quantity: 80, reserved: 5, minLevel: 20 },
  ]},
  { id: '2', name: 'East Coast Hub', location: 'New York, NY', stock: [
    { productId: '1', quantity: 30, reserved: 2, minLevel: 8 },
    { productId: '2', quantity: 80, reserved: 10, minLevel: 15 },
    { productId: '3', quantity: 20, reserved: 2, minLevel: 5 },
    { productId: '4', quantity: 40, reserved: 5, minLevel: 10 },
    { productId: '5', quantity: 150, reserved: 15, minLevel: 40 },
    { productId: '6', quantity: 50, reserved: 3, minLevel: 15 },
  ]},
];

const initialOrders: Order[] = [
  { id: 'ORD-001', clientId: '1', items: [{ productId: '1', quantity: 2, price: 3499, discount: 10 }], status: 'delivered', paymentStatus: 'paid', paymentMethod: 'Credit Card', deliveryMethod: 'Express', warehouseId: '1', deliveryCost: 50, managerId: '1', statusHistory: [{ status: 'new', date: daysAgo(3) }, { status: 'delivered', date: daysAgo(0) }], createdAt: daysAgo(3) },
  { id: 'ORD-002', clientId: '2', items: [{ productId: '2', quantity: 1, price: 1199, discount: 0 }, { productId: '5', quantity: 1, price: 249, discount: 0 }], status: 'shipped', paymentStatus: 'paid', paymentMethod: 'PayPal', deliveryMethod: 'Standard', warehouseId: '1', deliveryCost: 15, managerId: '2', statusHistory: [{ status: 'new', date: new Date('2024-03-10') }, { status: 'shipped', date: new Date('2024-03-12') }], createdAt: new Date('2024-03-10') },
  { id: 'ORD-003', clientId: '5', items: [{ productId: '1', quantity: 5, price: 3499, discount: 15 }, { productId: '3', quantity: 5, price: 1299, discount: 15 }], status: 'picking', paymentStatus: 'partial', paymentMethod: 'Wire Transfer', deliveryMethod: 'Express', warehouseId: '1', deliveryCost: 100, managerId: '1', statusHistory: [{ status: 'new', date: new Date('2024-03-14') }], createdAt: new Date('2024-03-14') },
  { id: 'ORD-004', clientId: '3', items: [{ productId: '4', quantity: 1, price: 799, discount: 0 }], status: 'new', paymentStatus: 'pending', deliveryMethod: 'Standard', warehouseId: '2', deliveryCost: 10, managerId: '1', statusHistory: [{ status: 'new', date: new Date('2024-03-15') }], createdAt: new Date('2024-03-15') },
  { id: 'ORD-005', clientId: '4', items: [{ productId: '2', quantity: 2, price: 1199, discount: 5 }, { productId: '6', quantity: 1, price: 199, discount: 5 }], status: 'confirmed', paymentStatus: 'paid', paymentMethod: 'Credit Card', deliveryMethod: 'Express', warehouseId: '1', deliveryCost: 30, managerId: '2', statusHistory: [{ status: 'new', date: new Date('2024-03-13') }, { status: 'confirmed', date: new Date('2024-03-14') }], createdAt: new Date('2024-03-13') },
  { id: 'ORD-006', clientId: '2', items: [{ productId: '5', quantity: 3, price: 249, discount: 0 }], status: 'delivered', paymentStatus: 'paid', paymentMethod: 'Credit Card', deliveryMethod: 'Standard', warehouseId: '1', deliveryCost: 15, managerId: '2', statusHistory: [{ status: 'new', date: daysAgo(5) }, { status: 'delivered', date: daysAgo(1) }], createdAt: daysAgo(5) },
  { id: 'ORD-007', clientId: '3', items: [{ productId: '4', quantity: 1, price: 799, discount: 0 }], status: 'cancelled', paymentStatus: 'refunded', paymentMethod: 'PayPal', deliveryMethod: 'Standard', warehouseId: '2', deliveryCost: 10, managerId: '2', statusHistory: [{ status: 'new', date: daysAgo(4) }, { status: 'cancelled', date: daysAgo(2) }], createdAt: daysAgo(4) },
];

const initialEmployees: Employee[] = [
  {
    id: '1',
    name: 'dexzr',
    firstName: 'dexzr',
    lastName: '',
    middleName: '',
    email: 'dexzr@crm.com',
    phones: ['+380 50 111 11 11'],
    gender: 'male',
    position: 'Директор',
    login: 'dexzr',
    password: '••••••',
    role: 'admin',
    isActive: true,
    employmentType: 'staff',
    employmentStatus: 'active',
    hireDate: new Date('2023-01-10'),
    birthday: new Date('1990-05-12'),
    city: 'Киев',
    activityLog: [
      { id: 'a1', type: 'login', at: new Date('2026-01-26T08:15:00') },
      { id: 'a2', type: 'login', at: new Date('2026-01-25T18:42:00') },
    ],
    efficiencyTargets: { communications: 50, orders: 20, tasks: 30 },
    efficiencyActual: { communications: 42, orders: 18, tasks: 27 },
  },
  {
    id: '2',
    name: 'Jim Halpert',
    firstName: 'Jim',
    lastName: 'Halpert',
    middleName: '',
    email: 'jhalpert@crm.com',
    phones: ['+1 555 0102', '+1 555 0103'],
    gender: 'male',
    position: 'Менеджер по продажам',
    login: 'jhalpert',
    password: '••••••',
    role: 'manager',
    isActive: true,
    employmentType: 'staff',
    employmentStatus: 'active',
    hireDate: new Date('2024-03-01'),
    birthday: new Date('1989-10-01'),
    city: 'Scranton',
    activityLog: [
      { id: 'b1', type: 'login', at: new Date('2026-01-26T09:05:00') },
      { id: 'b2', type: 'login', at: new Date('2026-01-25T17:30:00') },
    ],
    efficiencyTargets: { communications: 40, orders: 15, tasks: 25 },
    efficiencyActual: { communications: 33, orders: 11, tasks: 20 },
  },
  {
    id: '3',
    name: 'Dwight Schrute',
    firstName: 'Dwight',
    lastName: 'Schrute',
    middleName: '',
    email: 'dschrute@crm.com',
    phones: ['+1 555 0104'],
    gender: 'male',
    position: 'Старший менеджер',
    login: 'dschrute',
    password: '••••••',
    role: 'manager',
    isActive: true,
    employmentType: 'staff',
    employmentStatus: 'active',
    hireDate: new Date('2022-06-15'),
    birthday: new Date('1984-01-20'),
    city: 'Scranton',
    activityLog: [
      { id: 'c1', type: 'login', at: new Date('2026-01-26T08:50:00') },
      { id: 'c2', type: 'login', at: new Date('2026-01-25T19:05:00') },
    ],
    efficiencyTargets: { communications: 45, orders: 18, tasks: 28 },
    efficiencyActual: { communications: 40, orders: 16, tasks: 24 },
  },
  {
    id: '4',
    name: 'Andy Bernard',
    firstName: 'Andy',
    lastName: 'Bernard',
    middleName: '',
    email: 'abernard@crm.com',
    phones: ['+1 555 0106'],
    gender: 'male',
    position: 'Склад',
    login: 'abernard',
    password: '••••••',
    role: 'warehouse',
    isActive: true,
    employmentType: 'staff',
    employmentStatus: 'active',
    hireDate: new Date('2023-09-01'),
    birthday: new Date('1986-07-10'),
    city: 'New York',
    activityLog: [{ id: 'd1', type: 'login', at: new Date('2026-01-25T14:20:00') }],
  },
  {
    id: '5',
    name: 'Kevin Malone',
    firstName: 'Kevin',
    lastName: 'Malone',
    middleName: '',
    email: 'kmalone@crm.com',
    phones: ['+1 555 0107'],
    gender: 'male',
    position: 'Бухгалтер',
    login: 'kmalone',
    password: '••••••',
    role: 'accounting',
    isActive: true,
    employmentType: 'staff',
    employmentStatus: 'active',
    hireDate: new Date('2021-11-15'),
    birthday: new Date('1985-06-15'),
    city: 'Scranton',
    activityLog: [{ id: 'e1', type: 'login', at: new Date('2026-01-24T12:00:00') }],
  },
];

const initialReturns: Return[] = [
  { id: '1', orderId: 'ORD-001', reason: 'Defective screen', status: 'completed', resolution: 'replacement', createdAt: new Date('2024-03-06') },
];

const initialPayments: Payment[] = [
  { id: '1', orderId: 'ORD-001', amount: 6298.2, type: 'income', method: 'Credit Card', date: new Date('2024-03-01') },
  { id: '2', orderId: 'ORD-002', amount: 1463, type: 'income', method: 'PayPal', date: new Date('2024-03-10') },
  { id: '3', orderId: 'ORD-003', amount: 10000, type: 'income', method: 'Wire Transfer', date: new Date('2024-03-14') },
  { id: '4', orderId: 'ORD-005', amount: 2466.05, type: 'income', method: 'Credit Card', date: new Date('2024-03-13') },
];

const initialClientsById = new Map(initialClients.map((client) => [client.id, client]));

const fixMojibake = (value: unknown) => {
  if (typeof value !== 'string') return value;
  if (!/[РС]/.test(value)) return value;
  try {
    const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0) & 0xff);
    const decoded = new TextDecoder('utf-8').decode(bytes);
    if (decoded.includes('�')) return value;
    if (!/[А-Яа-яЁё]/.test(decoded)) return value;
    return decoded;
  } catch {
    return value;
  }
};

const mergeClientWithSeed = (client: Client) => {
  const seed = initialClientsById.get(client.id);
  if (!seed) return client;
  const merged = { ...client } as Client;
  const fillIfEmpty = <K extends keyof Client>(key: K) => {
    const value = merged[key];
    if (value === '' || value === null || value === undefined) {
      const seedValue = seed[key];
      if (seedValue !== undefined && seedValue !== null && seedValue !== '') {
        merged[key] = seedValue;
      }
    }
  };

  ([
    'region',
    'city',
    'activityType',
    'productCategory',
    'website',
    'email',
    'phone',
    'clientType',
    'notes',
    'lastCommunicationAt',
    'reminderAt',
    'responsibleId',
  ] as const).forEach(fillIfEmpty);

  if ((!merged.addresses || merged.addresses.length === 0) && seed.addresses?.length) {
    merged.addresses = seed.addresses;
  }
  if ((!merged.contacts || merged.contacts.length < 2) && seed.contacts?.length) {
    merged.contacts = seed.contacts;
  }
  if ((!merged.comments || merged.comments.length === 0) && seed.comments?.length) {
    merged.comments = seed.comments;
  }
  if ((!merged.communications || merged.communications.length === 0) && seed.communications?.length) {
    merged.communications = seed.communications;
  }
  if ((!merged.deals || merged.deals.length === 0) && seed.deals?.length) {
    merged.deals = seed.deals;
  }
  if (merged.allowManagerDeleteComments === undefined && seed.allowManagerDeleteComments !== undefined) {
    merged.allowManagerDeleteComments = seed.allowManagerDeleteComments;
  }

  return merged;
};

const initialEmployeesById = new Map(initialEmployees.map((employee) => [employee.id, employee]));

const isMojibake = (value: unknown) => typeof value === 'string' && /[РС]/.test(value);

const fixEmployeeText = (employee: Employee) => ({
  ...employee,
  name: fixMojibake(employee.name),
  firstName: fixMojibake(employee.firstName),
  lastName: fixMojibake(employee.lastName),
  middleName: fixMojibake(employee.middleName),
  email: fixMojibake(employee.email),
  position: fixMojibake(employee.position),
  login: fixMojibake(employee.login),
  city: fixMojibake(employee.city),
});

const mergeEmployeeWithSeed = (employee: Employee) => {
  const seed = initialEmployeesById.get(employee.id);
  if (!seed) return employee;
  const merged = { ...employee } as Employee;
  const fillIfEmpty = <K extends keyof Employee>(key: K) => {
    const value = merged[key];
    if (value === '' || value === null || value === undefined || isMojibake(value)) {
      const seedValue = seed[key];
      if (seedValue !== undefined && seedValue !== null && seedValue !== '') {
        merged[key] = seedValue;
      }
    }
  };

  ([
    'name',
    'firstName',
    'lastName',
    'middleName',
    'email',
    'gender',
    'position',
    'login',
    'role',
    'employmentType',
    'employmentStatus',
    'hireDate',
    'fireDate',
    'birthday',
    'city',
  ] as const).forEach(fillIfEmpty);

  if ((!merged.phones || merged.phones.length === 0) && seed.phones?.length) {
    merged.phones = seed.phones;
  }

  if (merged.isActive === undefined || merged.isActive === null) {
    merged.isActive = seed.isActive;
  }

  return merged;
};

export const useCRMStore = create<CRMState>()(
  persist(
    (set, get) => ({
      clients: initialClients,
      tasks: initialTasks,
      leads: initialLeads,
      products: initialProducts,
      orders: initialOrders,
      warehouses: initialWarehouses,
      employees: initialEmployees,
      returns: initialReturns,
      payments: initialPayments,

      // Client actions
      addClient: (client) => {
        const id = generateId();
        set((state) => ({
          clients: [...state.clients, { ...client, id, createdAt: new Date() }]
        }));
        return id;
      },
      updateClient: (id, data) => set((state) => ({
        clients: state.clients.map((c) => c.id === id ? { ...c, ...data } : c)
      })),
      deleteClient: (id) => set((state) => ({
        clients: state.clients.filter((c) => c.id !== id)
      })),

      // Task actions
      addTask: (task) => {
        const id = generateId();
        set((state) => ({
          tasks: [...state.tasks, { ...task, id, createdAt: new Date() }]
        }));
        return id;
      },
      updateTask: (id, data) => set((state) => ({
        tasks: state.tasks.map((t) => t.id === id ? { ...t, ...data } : t)
      })),
      deleteTask: (id) => set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id)
      })),

      // Lead actions
      addLead: (lead) => set((state) => ({
        leads: [...state.leads, { ...lead, id: generateId(), createdAt: new Date() }]
      })),
      updateLead: (id, data) => set((state) => ({
        leads: state.leads.map((l) => l.id === id ? { ...l, ...data } : l)
      })),
      deleteLead: (id) => set((state) => ({
        leads: state.leads.filter((l) => l.id !== id)
      })),
      convertLeadToClient: (leadId) => {
        const lead = get().leads.find((l) => l.id === leadId);
        if (!lead) return '';
        const clientId = generateId();
        set((state) => ({
          clients: [...state.clients, {
            id: clientId,
            name: lead.contact,
            phone: lead.phone || '',
            email: lead.email || '',
            addresses: [],
            status: 'new',
            clientType: 'client',
            communicationStatus: 'none',
            nextContactAt: null,
            lastCommunicationAt: null,
            reminderAt: null,
            isFavorite: false,
            region: '',
            city: '',
            activityType: '',
            productCategory: '',
            website: '',
            responsibleId: lead.managerId,
            sourceChannel: lead.source,
            contacts: [],
            comments: [],
            communications: [],
            deals: [],
            allowManagerDeleteComments: false,
            notes: '',
            discounts: 0,
            bonusPoints: 0,
            managerId: lead.managerId,
            createdAt: new Date()
          }],
          leads: state.leads.map((l) => l.id === leadId ? { ...l, status: 'won' as const } : l)
        }));
        return clientId;
      },

      // Product actions
      addProduct: (product) => set((state) => ({
        products: [...state.products, { ...product, id: generateId(), createdAt: new Date() }]
      })),
      updateProduct: (id, data) => set((state) => ({
        products: state.products.map((p) => p.id === id ? { ...p, ...data } : p)
      })),
      deleteProduct: (id) => set((state) => ({
        products: state.products.filter((p) => p.id !== id)
      })),

      // Order actions
      addOrder: (order) => set((state) => ({
        orders: [...state.orders, {
          ...order,
          id: `ORD-${String(state.orders.length + 1).padStart(3, '0')}`,
          createdAt: new Date(),
          statusHistory: [{ status: order.status, date: new Date() }]
        }]
      })),
      updateOrder: (id, data) => set((state) => ({
        orders: state.orders.map((o) => o.id === id ? { ...o, ...data } : o)
      })),
      updateOrderStatus: (id, status, note) => set((state) => ({
        orders: state.orders.map((o) => o.id === id ? {
          ...o,
          status,
          statusHistory: [...o.statusHistory, { status, date: new Date(), note }]
        } : o)
      })),
      deleteOrder: (id) => set((state) => ({
        orders: state.orders.filter((o) => o.id !== id)
      })),

      // Warehouse actions
      addWarehouse: (warehouse) => set((state) => ({
        warehouses: [...state.warehouses, { ...warehouse, id: generateId() }]
      })),
      updateWarehouse: (id, data) => set((state) => ({
        warehouses: state.warehouses.map((w) => w.id === id ? { ...w, ...data } : w)
      })),
      updateStock: (warehouseId, productId, quantity) => set((state) => ({
        warehouses: state.warehouses.map((w) => {
          if (w.id !== warehouseId) return w;
          const stockIndex = w.stock.findIndex((s) => s.productId === productId);
          if (stockIndex === -1) {
            return { ...w, stock: [...w.stock, { productId, quantity, reserved: 0, minLevel: 10 }] };
          }
          return {
            ...w,
            stock: w.stock.map((s, i) => i === stockIndex ? { ...s, quantity } : s)
          };
        })
      })),
      transferStock: (fromId, toId, productId, quantity) => set((state) => ({
        warehouses: state.warehouses.map((w) => {
          if (w.id === fromId) {
            return {
              ...w,
              stock: w.stock.map((s) => s.productId === productId ? { ...s, quantity: s.quantity - quantity } : s)
            };
          }
          if (w.id === toId) {
            const stockIndex = w.stock.findIndex((s) => s.productId === productId);
            if (stockIndex === -1) {
              return { ...w, stock: [...w.stock, { productId, quantity, reserved: 0, minLevel: 10 }] };
            }
            return {
              ...w,
              stock: w.stock.map((s) => s.productId === productId ? { ...s, quantity: s.quantity + quantity } : s)
            };
          }
          return w;
        })
      })),

      // Employee actions
      addEmployee: (employee) => {
        const id = generateId();
        set((state) => ({
          employees: [...state.employees, { ...employee, id }]
        }));
        return id;
      },
      updateEmployee: (id, data) => set((state) => ({
        employees: state.employees.map((e) => e.id === id ? { ...e, ...data } : e)
      })),
      deleteEmployee: (id) => set((state) => ({
        employees: state.employees.filter((e) => e.id !== id)
      })),

      // Return actions
      addReturn: (ret) => set((state) => ({
        returns: [...state.returns, { ...ret, id: generateId(), createdAt: new Date() }]
      })),
      updateReturn: (id, data) => set((state) => ({
        returns: state.returns.map((r) => r.id === id ? { ...r, ...data } : r)
      })),

      // Payment actions
      addPayment: (payment) => set((state) => ({
        payments: [...state.payments, { ...payment, id: generateId() }]
      })),

      // Computed helpers
      getClientOrders: (clientId) => get().orders.filter((o) => o.clientId === clientId),
      getClientRevenue: (clientId) => {
        const orders = get().orders.filter((o) => o.clientId === clientId && o.status !== 'cancelled' && o.status !== 'returned');
        return orders.reduce((sum, o) => sum + get().getOrderTotal(o), 0);
      },
      getClientAverageCheck: (clientId) => {
        const orders = get().orders.filter((o) => o.clientId === clientId && o.status !== 'cancelled' && o.status !== 'returned');
        if (orders.length === 0) return 0;
        return get().getClientRevenue(clientId) / orders.length;
      },
      getProductStock: (productId) => {
        return get().warehouses.reduce((sum, w) => {
          const stock = w.stock.find((s) => s.productId === productId);
          return sum + (stock ? stock.quantity - stock.reserved : 0);
        }, 0);
      },
      getOrderTotal: (order) => {
        const itemsTotal = order.items.reduce((sum, item) => {
          const discountedPrice = item.price * (1 - item.discount / 100);
          return sum + discountedPrice * item.quantity;
        }, 0);
        return itemsTotal + order.deliveryCost;
      },
      getOrderProfit: (order) => {
        const { products } = get();
        return order.items.reduce((sum, item) => {
          const product = products.find((p) => p.id === item.productId);
          if (!product) return sum;
          const discountedPrice = item.price * (1 - item.discount / 100);
          const profit = (discountedPrice - product.purchasePrice) * item.quantity;
          return sum + profit;
        }, 0) - order.deliveryCost;
      },
    }),
    {
      name: 'crm-storage',
      version: 7,
      migrate: (state) => {
        if (!state || typeof state !== 'object') return state as CRMState;
        const typedState = state as CRMState;
        if (!Array.isArray(typedState.clients)) return typedState;
        return {
          ...typedState,
          clients: typedState.clients.map(mergeClientWithSeed),
          employees: Array.isArray(typedState.employees)
            ? typedState.employees.map(fixEmployeeText).map(mergeEmployeeWithSeed)
            : typedState.employees,
        };
      },
    }
  )
);

