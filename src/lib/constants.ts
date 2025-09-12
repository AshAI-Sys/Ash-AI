// @ts-nocheck
// ASH AI System Constants

// Event Bus Prefixes
export const ASH_EVENT_PREFIX = 'ash.';

// Ashley AI Configuration
export const ASHLEY_CONFIG = {
  CAPACITY_THRESHOLD: 0.85, // 85% capacity warning
  QUALITY_THRESHOLD: 0.95,  // 95% quality target
  MARGIN_FLOOR: 0.25,       // 25% minimum margin
  STOCK_SAFETY_DAYS: 7,     // 7 days safety stock
} as const;

// Order Status Flow
export const ORDER_STATUS_FLOW = [
  'INTAKE',
  'DESIGN_PENDING',
  'DESIGN_APPROVED', 
  'CUTTING',
  'PRINTING',
  'SEWING',
  'QC',
  'FINISHING',
  'PACKING',
  'SHIPPED',
  'DELIVERED'
] as const;

// Print Methods
export const PRINT_METHODS = {
  SILKSCREEN: 'SILKSCREEN',
  SUBLIMATION: 'SUBLIMATION',
  DTF: 'DTF',
  EMBROIDERY: 'EMBROIDERY'
} as const;

// Workcenters
export const WORKCENTERS = {
  DESIGN: 'DESIGN',
  CUTTING: 'CUTTING', 
  PRINTING: 'PRINTING',
  HEAT_PRESS: 'HEAT_PRESS',
  SEWING: 'SEWING',
  EMBROIDERY: 'EMBROIDERY',
  QC: 'QC',
  PACKING: 'PACKING',
  WAREHOUSE: 'WAREHOUSE'
} as const;

// User Roles and Permissions
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  CSR: 'CSR',
  DESIGNER: 'DESIGNER',
  CUTTER: 'CUTTER',
  PRINTER: 'PRINTER',
  SEWER: 'SEWER',
  QC_INSPECTOR: 'QC_INSPECTOR',
  PACKER: 'PACKER',
  DRIVER: 'DRIVER',
  FINANCE: 'FINANCE',
  HR: 'HR'
} as const;

// Permission Scopes
export const PERMISSIONS = {
  // Orders
  ORDER_CREATE: 'order.create',
  ORDER_VIEW: 'order.view',
  ORDER_UPDATE: 'order.update',
  ORDER_DELETE: 'order.delete',
  
  // Designs
  DESIGN_CREATE: 'design.create',
  DESIGN_APPROVE: 'design.approve',
  
  // Production
  PRODUCTION_VIEW: 'production.view',
  PRODUCTION_EXECUTE: 'production.execute',
  
  // QC
  QC_INSPECT: 'qc.inspect',
  QC_APPROVE: 'qc.approve',
  
  // Finance
  FINANCE_VIEW: 'finance.view',
  FINANCE_MANAGE: 'finance.manage',
  
  // HR
  HR_VIEW: 'hr.view',
  HR_MANAGE: 'hr.manage',
  
  // Reports
  REPORTS_VIEW: 'reports.view',
  REPORTS_EXPORT: 'reports.export'
} as const;

// Ashley Event Types
export const ASHLEY_EVENTS = {
  // Orders
  PO_CREATED: 'ash.po.created',
  PO_UPDATED: 'ash.po.updated',
  
  // Designs
  DESIGN_UPLOADED: 'ash.design.uploaded',
  DESIGN_APPROVED: 'ash.design.approved',
  DESIGN_REJECTED: 'ash.design.rejected',
  
  // Production
  CUTTING_STARTED: 'ash.cutting.started',
  CUTTING_COMPLETED: 'ash.cutting.completed',
  PRINTING_STARTED: 'ash.printing.started',
  PRINTING_COMPLETED: 'ash.printing.completed',
  SEWING_STARTED: 'ash.sewing.started',
  SEWING_COMPLETED: 'ash.sewing.completed',
  
  // Quality
  QC_STARTED: 'ash.qc.started',
  QC_PASSED: 'ash.qc.passed',
  QC_FAILED: 'ash.qc.failed',
  
  // Shipping
  SHIPMENT_CREATED: 'ash.shipment.created',
  SHIPMENT_DELIVERED: 'ash.shipment.delivered',
  
  // Finance
  INVOICE_CREATED: 'ash.invoice.created',
  PAYMENT_RECEIVED: 'ash.payment.received'
} as const;

// Quality Control Standards
export const QC_STANDARDS = {
  AQL_LEVELS: {
    CRITICAL: 0.0,
    MAJOR: 2.5,
    MINOR: 4.0
  },
  SAMPLE_SIZES: {
    GENERAL_II: [
      { lotSize: [2, 8], sample: 2, accept: 0, reject: 1 },
      { lotSize: [9, 15], sample: 3, accept: 0, reject: 1 },
      { lotSize: [16, 25], sample: 5, accept: 0, reject: 1 },
      { lotSize: [26, 50], sample: 8, accept: 0, reject: 1 },
      { lotSize: [51, 90], sample: 13, accept: 1, reject: 2 },
      { lotSize: [91, 150], sample: 20, accept: 2, reject: 3 },
      { lotSize: [151, 280], sample: 32, accept: 3, reject: 4 },
      { lotSize: [281, 500], sample: 50, accept: 5, reject: 6 },
      { lotSize: [501, 1200], sample: 80, accept: 7, reject: 8 }
    ]
  }
} as const;

// File Upload Limits
export const FILE_LIMITS = {
  DESIGN_FILE_SIZE: 50 * 1024 * 1024, // 50MB
  PHOTO_FILE_SIZE: 10 * 1024 * 1024,  // 10MB
  ALLOWED_EXTENSIONS: {
    DESIGN: ['.ai', '.eps', '.pdf', '.svg', '.psd', '.png', '.jpg'],
    PHOTO: ['.jpg', '.jpeg', '.png', '.webp'],
    DOCUMENT: ['.pdf', '.doc', '.docx']
  }
} as const;

// Currency and Locale
export const LOCALE_CONFIG = {
  CURRENCY: 'PHP',
  LOCALE: 'en-PH',
  TIMEZONE: 'Asia/Manila'
} as const;

// Ashley AI Thresholds
export const ASHLEY_THRESHOLDS = {
  CAPACITY_WARNING: 0.8,
  QUALITY_ALERT: 0.9,
  COST_VARIANCE: 0.15,
  DELIVERY_RISK: 0.7,
  STOCK_LOW: 10,
  MACHINE_EFFICIENCY: 0.75
} as const;