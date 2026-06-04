export type Role = 'admin' | 'employee' | 'developer' | 'guest';

export interface StatusHistory {
  status: Quotation['status'];
  updatedAt: string;
  updatedBy: string;
  reason?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: Role;
  displayName?: string;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DimensionUnitMaster {
  unit: string;
  active: boolean;
  isDefaultLen?: boolean;
  isDefaultWid?: boolean;
}

export interface Product {
  name: string;
  category?: string;
  len: number;
  lenUnit?: string;
  wid: number;
  widUnit?: string;
  pcs: number;
  dimU?: string; // Standard Dim Unit (legacy)
  rate: number;
  rUnit: string;
  hsn: string;
  qty: number;
  total: number;
  unit?: string;
  baseUnit?: string;
  convertedRate?: number;
  standardWidth?: number;
  make?: string;
  colour?: string;
  thickness?: string;
  gsm?: string;
  costPrice?: number;
}

export interface Quotation {
  id?: string;
  estNo: string;
  custName: string;
  waNo: string;
  date: string;
  rawDate: string;
  notes: string;
  items: Product[];
  loadV: string;
  freightV: string;
  gross: string;
  gstAmt: string;
  grandTotal: string;
  status: 'Sent' | 'Material Dispatched' | 'In Production' | 'Order Booked' | 'Production' | 'Deal Loss' | 'Awaiting Client' | 'New' | 'Negotiation' | 'Approved' | 'Rejected' | 'Closed';
  reason?: string;
  statusHistory?: StatusHistory[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: any;
  deletedBy?: string;
  totalProfit?: number;
  isHotDeal?: boolean;
  isDeducted?: boolean;
  html?: string; // For compatibility with existing preview logic
}

export interface Client {
  id?: string;
  name: string;
  number: string;
  lastDate: string;
  updatedAt: string;
  deletedAt?: any;
  deletedBy?: string;
  totalValue?: number;
  quoteCount?: number;
}

export interface Rate {
  name: string;
  rate: number;
  costPrice?: number;
  unit: string;
  width: number;
  hsn: string;
  baseUnit?: string;
  standardWidth?: number;
  description?: string;
}

export interface InventoryItem {
  id?: string;
  productName: string; // Dynamic product name based on category logic
  category: string; // The normalized sheet name
  make?: string;
  colour?: string;
  thickness?: string;
  gsm?: string;
  stock: number; // Original stock count
  packedCoilStock?: number;
  openCoilStock?: number;
  used?: number; // Total consumed
  remaining: number; // Current balance
  unit: string; // RFT, PCS, RMT, etc.
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  lowStockLimit: number;
  sourceSheet: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: any;
  deletedBy?: string;
  lastUpdated?: string; // Keep for some backward compatibility
  dailyUsage?: number;
  estimatedDaysLeft?: number;
  pendingRFT?: number; // Kept for legacy compatibility if needed
  brand?: string;
  size?: string;
  dispatchFrom?: 'openCoilStock' | 'stock';
}

export interface DispatchLog {
  id?: string;
  quotationId: string;
  dispatchId: string;
  materialKey: string;
  materialName?: string;
  qtyDeducted: number;
  quantityUsedRFT?: number;
  userName?: string;
  createdAt: string;
}

export interface MaterialVariant {
  make: string;
  colour: string;
  thickness: string;
  gsm: string;
}

export interface DescTemplate {
  id: string;
  title: string;
  text: string;
}

export interface PriceList {
  id: string;
  fileName: string;
  uploadDate: string;
  uploadTs: number;
  products: {
    name: string;
    category: string;
    size: string;
    rate: number;
    unit: string;
  }[];
}

export interface EmployeePermissions {
  canAccessHistory: boolean;
  canAccessClients: boolean;
  canAccessSales: boolean;
  canAccessSettings: boolean;
  canAccessInventory: boolean;
}

export interface GlobalSettings {
  company: {
    name: string;
    tag: string;
    addr1: string;
    addr2: string;
    gst: string;
    udyam: string;
    phone: string;
    email: string;
    state: string;
    logo: string;
    social?: string;
    qrCode?: string;
    qrCodes?: { url: string; label: string }[];
  };
  pdfCfg: {
    title: string;
    color: string;
    footer: string;
    footerRegards?: string;
    bank: string;
    terms: string;
  };
  groupLink: string;
  scriptUrl: string;
  rates: Rate[];
  descTmpls: DescTemplate[];
  colors?: string[];
  thicknesses?: string[];
  units?: string[];
  estCounter: number;
  empPermissions?: EmployeePermissions;
  dimensionUnitMaster?: DimensionUnitMaster[];
  presetLengths?: number[];
  presetWidths?: number[];
}
