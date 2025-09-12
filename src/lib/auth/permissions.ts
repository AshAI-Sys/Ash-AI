// @ts-nocheck
import { Role } from '@prisma/client';

export interface Permission {
  resource: string;
  action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE';
  conditions?: Record<string, any>;
}

export interface UserContext {
  id: string;
  role: Role;
  brandIds?: string[];
}

export class RoleBasedAccessControl {
  private static permissions: Record<Role, Permission[]> = {
    ADMIN: [
      { resource: '*', action: 'CREATE' },
      { resource: '*', action: 'READ' },
      { resource: '*', action: 'UPDATE' },
      { resource: '*', action: 'DELETE' }
    ],
    
    MANAGER: [
      { resource: 'order', action: 'CREATE' },
      { resource: 'order', action: 'READ' },
      { resource: 'order', action: 'UPDATE' },
      { resource: 'task', action: 'CREATE' },
      { resource: 'task', action: 'READ' },
      { resource: 'task', action: 'UPDATE' },
      { resource: 'user', action: 'READ' },
      { resource: 'inventory', action: 'READ' },
      { resource: 'report', action: 'READ' },
      { resource: 'qc', action: 'READ' },
      { resource: 'finance', action: 'READ' }
    ],
    
    GRAPHIC_ARTIST: [
      { resource: 'task', action: 'READ', conditions: { assignedTo: 'self' } },
      { resource: 'task', action: 'UPDATE', conditions: { assignedTo: 'self', taskType: 'DESIGN' } },
      { resource: 'order', action: 'READ', conditions: { tasks: { assignedTo: 'self' } } }
    ],
    
    SILKSCREEN_OPERATOR: [
      { resource: 'task', action: 'READ', conditions: { assignedTo: 'self' } },
      { resource: 'task', action: 'UPDATE', conditions: { assignedTo: 'self', taskType: 'SILKSCREEN' } },
      { resource: 'material', action: 'UPDATE', conditions: { category: 'INK' } },
      { resource: 'order', action: 'READ', conditions: { printMethod: 'SILKSCREEN' } }
    ],
    
    SUBLIMATION_OPERATOR: [
      { resource: 'task', action: 'READ', conditions: { assignedTo: 'self' } },
      { resource: 'task', action: 'UPDATE', conditions: { assignedTo: 'self', taskType: 'SUBLIMATION' } },
      { resource: 'material', action: 'UPDATE', conditions: { category: 'SUBLIMATION_INK' } },
      { resource: 'order', action: 'READ', conditions: { printMethod: 'SUBLIMATION' } }
    ],
    
    DTF_OPERATOR: [
      { resource: 'task', action: 'READ', conditions: { assignedTo: 'self' } },
      { resource: 'task', action: 'UPDATE', conditions: { assignedTo: 'self', taskType: 'DTF' } },
      { resource: 'material', action: 'UPDATE', conditions: { category: 'DTF_FILM' } },
      { resource: 'order', action: 'READ', conditions: { printMethod: 'DTF' } }
    ],
    
    EMBROIDERY_OPERATOR: [
      { resource: 'task', action: 'READ', conditions: { assignedTo: 'self' } },
      { resource: 'task', action: 'UPDATE', conditions: { assignedTo: 'self', taskType: 'EMBROIDERY' } },
      { resource: 'material', action: 'UPDATE', conditions: { category: 'THREAD' } },
      { resource: 'order', action: 'READ', conditions: { printMethod: 'EMBROIDERY' } }
    ],
    
    SEWING_OPERATOR: [
      { resource: 'task', action: 'READ', conditions: { assignedTo: 'self' } },
      { resource: 'task', action: 'UPDATE', conditions: { assignedTo: 'self', taskType: 'SEWING' } },
      { resource: 'material', action: 'UPDATE', conditions: { category: 'FABRIC' } },
      { resource: 'time', action: 'CREATE', conditions: { employeeId: 'self' } }
    ],
    
    QC_INSPECTOR: [
      { resource: 'task', action: 'READ' },
      { resource: 'task', action: 'UPDATE', conditions: { taskType: 'QC' } },
      { resource: 'qc', action: 'CREATE' },
      { resource: 'qc', action: 'UPDATE', conditions: { inspectorId: 'self' } },
      { resource: 'reject', action: 'CREATE' },
      { resource: 'order', action: 'READ' },
      { resource: 'order', action: 'UPDATE', conditions: { field: 'status' } }
    ],
    
    FINISHING_STAFF: [
      { resource: 'task', action: 'READ', conditions: { assignedTo: 'self' } },
      { resource: 'task', action: 'UPDATE', conditions: { assignedTo: 'self', taskType: 'FINISHING' } },
      { resource: 'material', action: 'UPDATE', conditions: { category: 'PACKAGING' } },
      { resource: 'order', action: 'READ' }
    ],
    
    DRIVER: [
      { resource: 'delivery', action: 'READ', conditions: { driverId: 'self' } },
      { resource: 'delivery', action: 'UPDATE', conditions: { driverId: 'self' } },
      { resource: 'vehicle', action: 'READ' },
      { resource: 'fuel', action: 'CREATE', conditions: { driverId: 'self' } },
      { resource: 'order', action: 'READ', conditions: { status: 'READY_FOR_DELIVERY' } }
    ],
    
    PURCHASER: [
      { resource: 'purchase', action: 'CREATE' },
      { resource: 'purchase', action: 'READ' },
      { resource: 'purchase', action: 'UPDATE' },
      { resource: 'vendor', action: 'CREATE' },
      { resource: 'vendor', action: 'READ' },
      { resource: 'vendor', action: 'UPDATE' },
      { resource: 'inventory', action: 'READ' },
      { resource: 'inventory', action: 'UPDATE', conditions: { action: 'RECEIVE' } }
    ],
    
    WAREHOUSE_STAFF: [
      { resource: 'inventory', action: 'READ' },
      { resource: 'inventory', action: 'UPDATE' },
      { resource: 'stock', action: 'CREATE' },
      { resource: 'stock', action: 'READ' },
      { resource: 'stock', action: 'UPDATE' },
      { resource: 'material', action: 'READ' },
      { resource: 'material', action: 'UPDATE', conditions: { type: 'MOVEMENT' } }
    ],
    
    ACCOUNTANT: [
      { resource: 'finance', action: 'CREATE' },
      { resource: 'finance', action: 'READ' },
      { resource: 'finance', action: 'UPDATE' },
      { resource: 'payroll', action: 'CREATE' },
      { resource: 'payroll', action: 'READ' },
      { resource: 'payroll', action: 'UPDATE' },
      { resource: 'bill', action: 'CREATE' },
      { resource: 'bill', action: 'READ' },
      { resource: 'bill', action: 'UPDATE' },
      { resource: 'report', action: 'READ' },
      { resource: 'wallet', action: 'READ' },
      { resource: 'wallet', action: 'UPDATE' }
    ],
    
    LIVE_SELLER: [
      { resource: 'live-session', action: 'CREATE', conditions: { sellerId: 'self' } },
      { resource: 'live-session', action: 'READ', conditions: { sellerId: 'self' } },
      { resource: 'live-session', action: 'UPDATE', conditions: { sellerId: 'self' } },
      { resource: 'platform-sale', action: 'CREATE', conditions: { sellerId: 'self' } },
      { resource: 'platform-sale', action: 'READ', conditions: { sellerId: 'self' } },
      { resource: 'inventory', action: 'READ', conditions: { category: 'FINISHED_GOODS' } }
    ],
    
    CSR: [
      { resource: 'order', action: 'CREATE' },
      { resource: 'order', action: 'READ' },
      { resource: 'order', action: 'UPDATE', conditions: { field: 'status' } },
      { resource: 'client', action: 'CREATE' },
      { resource: 'client', action: 'READ' },
      { resource: 'client', action: 'UPDATE' },
      { resource: 'invoice', action: 'CREATE' },
      { resource: 'invoice', action: 'READ' },
      { resource: 'payment', action: 'CREATE' },
      { resource: 'payment', action: 'READ' },
      { resource: 'subcontractor', action: 'READ' },
      { resource: 'subcontractor', action: 'UPDATE', conditions: { field: 'task_status' } }
    ],
    
    SALES_STAFF: [
      { resource: 'client', action: 'CREATE' },
      { resource: 'client', action: 'READ' },
      { resource: 'client', action: 'UPDATE' },
      { resource: 'order', action: 'CREATE' },
      { resource: 'order', action: 'READ' },
      { resource: 'quote', action: 'CREATE' },
      { resource: 'quote', action: 'READ' },
      { resource: 'quote', action: 'UPDATE' },
      { resource: 'inventory', action: 'READ', conditions: { category: 'FINISHED_GOODS' } }
    ]
  };

  static hasPermission(
    user: UserContext,
    resource: string,
    action: 'CREATE' | 'READ' | 'UPDATE' | 'DELETE',
    target?: any
  ): boolean {
    const rolePermissions = this.permissions[user.role] || [];
    
    const matchingPermissions = rolePermissions.filter(permission => {
      return (permission.resource === '*' || permission.resource === resource) &&
             permission.action === action;
    });

    if (matchingPermissions.length === 0) {
      return false;
    }

    for (const permission of matchingPermissions) {
      if (this.evaluateConditions(permission.conditions, user, target)) {
        return true;
      }
    }

    return false;
  }

  private static evaluateConditions(
    conditions: Record<string, any> | undefined,
    user: UserContext,
    target?: any
  ): boolean {
    if (!conditions) {
      return true;
    }

    for (const [key, value] of Object.entries(conditions)) {
      if (value === 'self') {
        switch (key) {
          case 'assignedTo':
            if (target?.assignedTo !== user.id) return false;
            break;
          case 'sellerId':
            if (target?.sellerId !== user.id) return false;
            break;
          case 'employeeId':
            if (target?.employeeId !== user.id) return false;
            break;
          case 'inspectorId':
            if (target?.inspectorId !== user.id) return false;
            break;
          case 'driverId':
            if (target?.driverId !== user.id) return false;
            break;
          default:
            return false;
        }
      } else if (typeof value === 'string') {
        if (target?.[key] !== value) return false;
      } else if (Array.isArray(value)) {
        if (!value.includes(target?.[key])) return false;
      } else if (typeof value === 'object') {
        if (!this.evaluateNestedConditions(value, target?.[key], user)) return false;
      }
    }

    return true;
  }

  private static evaluateNestedConditions(
    conditions: Record<string, any>,
    targetValue: any,
    user: UserContext
  ): boolean {
    if (!targetValue) return false;

    for (const [key, value] of Object.entries(conditions)) {
      if (value === 'self' && targetValue[key] !== user.id) {
        return false;
      } else if (targetValue[key] !== value) {
        return false;
      }
    }

    return true;
  }

  static canCreateOrder(user: UserContext): boolean {
    return this.hasPermission(user, 'order', 'CREATE');
  }

  static canViewFinancials(user: UserContext): boolean {
    return this.hasPermission(user, 'finance', 'READ');
  }

  static canManageUsers(user: UserContext): boolean {
    return this.hasPermission(user, 'user', 'UPDATE');
  }

  static canAccessTask(user: UserContext, task: any): boolean {
    return this.hasPermission(user, 'task', 'READ', task);
  }

  static canUpdateTask(user: UserContext, task: any): boolean {
    return this.hasPermission(user, 'task', 'UPDATE', task);
  }

  static canAccessOrder(user: UserContext, order: any): boolean {
    return this.hasPermission(user, 'order', 'READ', order);
  }

  static getAccessibleResources(user: UserContext): string[] {
    const rolePermissions = this.permissions[user.role] || [];
    const resources = new Set<string>();
    
    rolePermissions.forEach(permission => {
      if (permission.resource === '*') {
        resources.add('all');
      } else {
        resources.add(permission.resource);
      }
    });
    
    return Array.from(resources);
  }
}