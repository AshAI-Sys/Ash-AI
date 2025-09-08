import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export class QueryOptimizer {
  private static queryCache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();
  private static readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

  static async getOrdersWithOptimization(
    filters: {
      status?: string;
      brandId?: string;
      clientId?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {},
    pagination: { page?: number; limit?: number } = {}
  ) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};
    
    if (filters.status) where.status = filters.status as Prisma.EnumOrderStatusFilter;
    if (filters.brandId) where.brandId = filters.brandId;
    if (filters.clientId) where.clientId = filters.clientId;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const [orders, totalCount] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          clientName: true,
          status: true,
          quantity: true,
          createdAt: true,
          dueDate: true,
          brand: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          client: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          _count: {
            select: {
              tasks: true
            }
          }
        }
      }),
      prisma.order.count({ where })
    ]);

    return {
      orders,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page
    };
  }

  static async getTasksWithOptimization(
    filters: {
      status?: string;
      assignedTo?: string;
      taskType?: string;
      priority?: number;
    } = {},
    pagination: { page?: number; limit?: number } = {}
  ) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.TaskWhereInput = {};
    
    if (filters.status) where.status = filters.status as Prisma.EnumTaskStatusFilter;
    if (filters.assignedTo) where.assignedTo = filters.assignedTo;
    if (filters.taskType) where.taskType = filters.taskType;
    if (filters.priority !== undefined) where.priority = filters.priority;

    const cacheKey = `tasks:${JSON.stringify({ where, skip, limit })}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const [tasks, totalCount] = await Promise.all([
      prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        select: {
          id: true,
          taskType: true,
          description: true,
          status: true,
          priority: true,
          dueDate: true,
          createdAt: true,
          assignee: {
            select: {
              id: true,
              name: true,
              role: true
            }
          },
          order: {
            select: {
              id: true,
              orderNumber: true,
              clientName: true,
              status: true
            }
          }
        }
      }),
      prisma.task.count({ where })
    ]);

    const result = {
      tasks,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page
    };

    this.setCache(cacheKey, result, this.DEFAULT_TTL);
    return result;
  }

  static async getInventoryWithOptimization(
    filters: {
      category?: string;
      lowStock?: boolean;
      brandId?: string;
      search?: string;
    } = {},
    pagination: { page?: number; limit?: number } = {}
  ) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryItemWhereInput = {};
    
    if (filters.category) where.category = filters.category;
    if (filters.brandId) where.brandId = filters.brandId;
    if (filters.lowStock) {
      where.OR = [
        { quantity: { lte: prisma.inventoryItem.fields.reorderPoint } },
        { quantity: { equals: 0 } }
      ];
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { sku: { contains: filters.search } }
      ];
    }

    const [items, totalCount] = await Promise.all([
      prisma.inventoryItem.findMany({
        where,
        skip,
        take: limit,
        orderBy: { lastUpdated: 'desc' },
        select: {
          id: true,
          name: true,
          sku: true,
          category: true,
          quantity: true,
          unit: true,
          unitCost: true,
          reorderPoint: true,
          location: true,
          lastUpdated: true,
          brand: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        }
      }),
      prisma.inventoryItem.count({ where })
    ]);

    return {
      items,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page
    };
  }

  static async getDashboardStats() {
    const cacheKey = 'dashboard:stats';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const [
      orderStats,
      taskStats,
      inventoryStats,
      recentOrders,
      urgentTasks
    ] = await Promise.all([
      this.getOrderStats(),
      this.getTaskStats(),
      this.getInventoryStats(),
      this.getRecentOrders(5),
      this.getUrgentTasks(10)
    ]);

    const result = {
      orderStats,
      taskStats,
      inventoryStats,
      recentOrders,
      urgentTasks,
      generatedAt: new Date()
    };

    this.setCache(cacheKey, result, 2 * 60 * 1000); // 2 minutes TTL for dashboard
    return result;
  }

  private static async getOrderStats() {
    const orders = await prisma.order.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    const total = orders.reduce((sum, group) => sum + group._count.id, 0);
    
    return {
      total,
      byStatus: orders.reduce((acc, group) => {
        acc[group.status] = group._count.id;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  private static async getTaskStats() {
    const tasks = await prisma.task.groupBy({
      by: ['status'],
      _count: {
        id: true
      }
    });

    const overdueTasks = await prisma.task.count({
      where: {
        dueDate: { lt: new Date() },
        status: { in: ['PENDING', 'IN_PROGRESS'] }
      }
    });

    const total = tasks.reduce((sum, group) => sum + group._count.id, 0);
    
    return {
      total,
      overdue: overdueTasks,
      byStatus: tasks.reduce((acc, group) => {
        acc[group.status] = group._count.id;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  private static async getInventoryStats() {
    const [lowStock, outOfStock, totalItems] = await Promise.all([
      prisma.inventoryItem.count({
        where: {
          AND: [
            { quantity: { gt: 0 } },
            { quantity: { lte: prisma.inventoryItem.fields.reorderPoint } }
          ]
        }
      }),
      prisma.inventoryItem.count({
        where: { quantity: 0 }
      }),
      prisma.inventoryItem.count()
    ]);

    return {
      total: totalItems,
      lowStock,
      outOfStock,
      inStock: totalItems - outOfStock
    };
  }

  private static async getRecentOrders(limit: number) {
    return prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        clientName: true,
        status: true,
        quantity: true,
        createdAt: true,
        brand: {
          select: {
            name: true,
            code: true
          }
        }
      }
    });
  }

  private static async getUrgentTasks(limit: number) {
    return prisma.task.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        OR: [
          { dueDate: { lte: new Date(Date.now() + 24 * 60 * 60 * 1000) } }, // Due within 24 hours
          { priority: { gte: 8 } } // High priority
        ]
      },
      take: limit,
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' }
      ],
      select: {
        id: true,
        taskType: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        assignee: {
          select: {
            name: true
          }
        },
        order: {
          select: {
            orderNumber: true,
            clientName: true
          }
        }
      }
    });
  }

  private static getFromCache(key: string) {
    const cached = this.queryCache.get(key);
    if (!cached) return null;
    
    if (Date.now() > cached.timestamp + cached.ttl) {
      this.queryCache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  private static setCache(key: string, data: unknown, ttl: number) {
    this.queryCache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  static clearCache(pattern?: string) {
    if (pattern) {
      for (const key of this.queryCache.keys()) {
        if (key.includes(pattern)) {
          this.queryCache.delete(key);
        }
      }
    } else {
      this.queryCache.clear();
    }
  }

  static async batchUpdateTasks(updates: Array<{ id: string; status?: string; notes?: string }>) {
    const batchSize = 50;
    const batches = [];
    
    for (let i = 0; i < updates.length; i += batchSize) {
      batches.push(updates.slice(i, i + batchSize));
    }

    const results = await Promise.all(
      batches.map(batch => 
        Promise.all(
          batch.map(update => 
            prisma.task.update({
              where: { id: update.id },
              data: {
                status: update.status as Prisma.EnumTaskStatusFilter,
                notes: update.notes
              },
              select: {
                id: true,
                status: true
              }
            })
          )
        )
      )
    );

    this.clearCache('tasks');
    return results.flat();
  }

  static async getAnalyticsData(dateRange: { from: Date; to: Date }) {
    const cacheKey = `analytics:${new Date(dateRange.from).getTime()}:${new Date(dateRange.to).getTime()}`;
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    const [
      orderTrends,
      productionMetrics,
      inventoryMovements,
      financialSummary
    ] = await Promise.all([
      this.getOrderTrends(dateRange),
      this.getProductionMetrics(dateRange),
      this.getInventoryMovements(dateRange),
      this.getFinancialSummary(dateRange)
    ]);

    const result = {
      orderTrends,
      productionMetrics,
      inventoryMovements,
      financialSummary,
      generatedAt: new Date()
    };

    this.setCache(cacheKey, result, 10 * 60 * 1000); // 10 minutes TTL
    return result;
  }

  private static async getOrderTrends(dateRange: { from: Date; to: Date }) {
    return prisma.order.groupBy({
      by: ['status'],
      where: {
        createdAt: {
          gte: dateRange.from,
          lte: dateRange.to
        }
      },
      _count: {
        id: true
      },
      _sum: {
        quantity: true
      }
    });
  }

  private static async getProductionMetrics(dateRange: { from: Date; to: Date }) {
    return prisma.task.groupBy({
      by: ['taskType', 'status'],
      where: {
        createdAt: {
          gte: dateRange.from,
          lte: dateRange.to
        }
      },
      _count: {
        id: true
      }
    });
  }

  private static async getInventoryMovements(dateRange: { from: Date; to: Date }) {
    return prisma.stockMovement.groupBy({
      by: ['type'],
      where: {
        createdAt: {
          gte: dateRange.from,
          lte: dateRange.to
        }
      },
      _count: {
        id: true
      },
      _sum: {
        quantity: true
      }
    });
  }

  private static async getFinancialSummary(dateRange: { from: Date; to: Date }) {
    const [revenue, expenses] = await Promise.all([
      prisma.payment.aggregate({
        where: {
          receivedDate: {
            gte: dateRange.from,
            lte: dateRange.to
          }
        },
        _sum: {
          amount: true
        }
      }),
      prisma.bill.aggregate({
        where: {
          paidDate: {
            gte: dateRange.from,
            lte: dateRange.to
          }
        },
        _sum: {
          amount: true
        }
      })
    ]);

    return {
      revenue: revenue._sum.amount || 0,
      expenses: expenses._sum.amount || 0,
      profit: (revenue._sum.amount || 0) - (expenses._sum.amount || 0)
    };
  }
}