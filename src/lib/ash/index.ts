// ASH AI System Exports
// Apparel Smart Hub - Artificial Intelligence

export { AshEventBus } from './event-bus'
export { AuditLogger } from './audit'
export { RoutingTemplateService } from './routing-templates'
export { AshleyAI } from './ashley'

export type {
  AshEvent
} from './event-bus'

export type {
  AuditLogEntry
} from './audit'

export type {
  RoutingStep
} from './routing-templates'

export type {
  AshleyAssessment,
  AshleyIssue,
  AshleyInsight,
  CapacityAnalysis,
  RouteValidationResult
} from './ashley'

// System constants
export const ASH_SYSTEM_VERSION = '1.0.0'
export const ASH_AI_AGENTS = [
  'ashley', // Production monitoring, forecasting, capacity analysis
  'kai',    // Inventory optimization, procurement planning
  'mira',   // Quality control, defect pattern analysis
  'nova',   // Financial analysis, cost optimization  
  'aria',   // HR optimization, skill matching
  'orion',  // Maintenance scheduling, equipment optimization
  'leo'     // Customer insights, demand forecasting
] as const

export type AshAgent = typeof ASH_AI_AGENTS[number]

// Workcenter constants
export const WORKCENTERS = [
  'DESIGN',
  'CUTTING', 
  'PRINTING',
  'HEAT_PRESS',
  'EMB',
  'SEWING',
  'QC',
  'PACKING',
  'WAREHOUSE'
] as const

export type Workcenter = typeof WORKCENTERS[number]

// Event types
export const ASH_EVENTS = [
  'ash.po.created',
  'ash.po.shared',
  'ash.design.version.created',
  'ash.design.approval.sent',
  'ash.design.approved',
  'ash.design.changes_requested',
  'ash.routing.applied',
  'ash.routing.customized',
  'ash.cutting.issue.created',
  'ash.cutting.lay.created',
  'ash.bundles.created',
  'ash.printing.run.started',
  'ash.printing.run.completed',
  'ash.sewing.run.started',
  'ash.sewing.run.completed',
  'ash.ashley.intake_risk_assessed',
  'ash.ashley.capacity.analyzed',
  'ash.ashley.printability.checked'
] as const

export type AshEventType = typeof ASH_EVENTS[number]

// Risk levels
export const RISK_LEVELS = ['GREEN', 'AMBER', 'RED'] as const
export type RiskLevel = typeof RISK_LEVELS[number]

// Priority levels
export const PRIORITY_LEVELS = ['LOW', 'MEDIUM', 'HIGH'] as const
export type PriorityLevel = typeof PRIORITY_LEVELS[number]

// System utilities
export const formatPONumber = (brandCode: string, year: number, sequence: number): string => {
  return `${brandCode}-${year}-${String(sequence).padStart(6, '0')}`
}

export const formatBundleQR = (bundleId: string): string => {
  return `ash://bundle/${bundleId}`
}

export const parseQRCode = (qrCode: string): { type: string; id: string } | null => {
  const match = qrCode.match(/^ash:\/\/(\w+)\/(.+)$/)
  if (match) {
    return { type: match[1], id: match[2] }
  }
  return null
}