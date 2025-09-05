// Ashley AI - The Intelligent Assistant for ASH AI System

import { OpenAI } from 'openai';
import { ASHLEY_CONFIG, ASHLEY_EVENTS, ASHLEY_THRESHOLDS } from '../constants';
import { db } from '../db';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.ASH_OPENAI_API_KEY,
});

export class AshleyAI {
  private static instance: AshleyAI;
  
  public static getInstance(): AshleyAI {
    if (!AshleyAI.instance) {
      AshleyAI.instance = new AshleyAI();
    }
    return AshleyAI.instance;
  }

  /**
   * Stage 1: Order Intake Analysis
   * Validates capacity, checks BOM, suggests routing
   */
  async analyzeOrderIntake(params: {
    workspaceId: string;
    brandId: string;
    productType: string;
    method: string;
    totalQty: number;
    sizeCurve: Record<string, number>;
    targetDeliveryDate: Date;
  }) {
    const analysis = {
      canFulfill: true,
      warnings: [] as string[],
      suggestions: [] as string[],
      estimatedDelivery: new Date(),
      capacityUtilization: 0,
    };

    try {
      // 1. Capacity Check
      const capacityCheck = await this.checkCapacityAvailability({
        method: params.method,
        qty: params.totalQty,
        targetDate: params.targetDeliveryDate,
      });

      analysis.capacityUtilization = capacityCheck.utilization;
      
      if (capacityCheck.utilization > ASHLEY_THRESHOLDS.CAPACITY_WARNING) {
        analysis.warnings.push(`High capacity utilization: ${(capacityCheck.utilization * 100).toFixed(1)}%`);
      }

      // 2. Material Availability Check
      const materialCheck = await this.checkMaterialAvailability(params);
      if (!materialCheck.available) {
        analysis.canFulfill = false;
        analysis.warnings.push(`Insufficient materials: ${materialCheck.missing.join(', ')}`);
      }

      // 3. Delivery Feasibility
      const deliveryCheck = await this.calculateDeliveryFeasibility(params);
      analysis.estimatedDelivery = deliveryCheck.estimatedDate;
      
      if (deliveryCheck.riskLevel > ASHLEY_THRESHOLDS.DELIVERY_RISK) {
        analysis.warnings.push('Tight delivery schedule - consider earlier start date');
      }

      // 4. AI-Powered Suggestions
      const aiSuggestions = await this.generateOrderSuggestions(params);
      analysis.suggestions.push(...aiSuggestions);

      return analysis;
    } catch (error) {
      console.error('Ashley order intake analysis failed:', error);
      return {
        ...analysis,
        canFulfill: false,
        warnings: ['Analysis failed - manual review required'],
      };
    }
  }

  /**
   * Stage 2: Design Printability Analysis
   */
  async analyzeDesignPrintability(params: {
    assetId: string;
    method: string;
    files: any;
    placements: any[];
  }) {
    const analysis = {
      result: 'PASS' as 'PASS' | 'WARN' | 'FAIL',
      issues: [] as Array<{ code: string; message: string; placement_ref?: string }>,
      metrics: {} as Record<string, any>,
      estimatedCosts: {} as Record<string, number>,
    };

    try {
      switch (params.method) {
        case 'SILKSCREEN':
          return await this.analyzeSilkscreenDesign(params);
        case 'SUBLIMATION':
          return await this.analyzeSublimationDesign(params);
        case 'DTF':
          return await this.analyzeDTFDesign(params);
        case 'EMBROIDERY':
          return await this.analyzeEmbroideryDesign(params);
        default:
          analysis.result = 'FAIL';
          analysis.issues.push({ code: 'INVALID_METHOD', message: 'Unsupported print method' });
      }

      return analysis;
    } catch (error) {
      console.error('Ashley design analysis failed:', error);
      return {
        ...analysis,
        result: 'FAIL' as const,
        issues: [{ code: 'ANALYSIS_ERROR', message: 'Design analysis failed' }],
      };
    }
  }

  /**
   * Stage 3: Cutting Optimization
   */
  async optimizeCuttingLay(params: {
    orderId: string;
    fabricBatch: any;
    sizeCurve: Record<string, number>;
  }) {
    try {
      const optimization = {
        markerName: `MARKER_${params.orderId}_${Date.now()}`,
        efficiency: 0,
        expectedWaste: 0,
        layPlans: [] as any[],
        suggestions: [] as string[],
      };

      // Calculate optimal marker efficiency
      const markerAnalysis = await this.calculateMarkerEfficiency(params);
      optimization.efficiency = markerAnalysis.efficiency;
      optimization.expectedWaste = markerAnalysis.waste;

      if (markerAnalysis.efficiency < 0.85) {
        optimization.suggestions.push('Consider adjusting size ratios for better marker efficiency');
      }

      return optimization;
    } catch (error) {
      console.error('Ashley cutting optimization failed:', error);
      throw new Error('Cutting optimization failed');
    }
  }

  /**
   * Stage 6: Quality Control Analysis
   */
  async analyzeQualityTrends(params: {
    workspaceId: string;
    timeframe: 'DAILY' | 'WEEKLY' | 'MONTHLY';
    brandId?: string;
    method?: string;
  }) {
    try {
      // Get recent QC data
      const qcData = await db.qcInspection.findMany({
        where: {
          ...(params.brandId && { order: { brandId: params.brandId } }),
          createdAt: {
            gte: this.getTimeframeStart(params.timeframe),
          },
        },
        include: {
          qcDefects: true,
          order: {
            select: { method: true, brandId: true },
          },
        },
      });

      // Analyze trends
      const analysis = {
        defectRate: 0,
        topDefects: [] as Array<{ code: string; count: number; percentage: number }>,
        trends: {} as Record<string, number>,
        alerts: [] as string[],
        suggestions: [] as string[],
      };

      // Calculate overall defect rate
      const totalInspected = qcData.reduce((sum, inspection) => sum + inspection.sampleSize, 0);
      const totalDefects = qcData.reduce((sum, inspection) => 
        sum + inspection.qcDefects.reduce((defectSum, defect) => defectSum + defect.qty, 0), 0
      );

      analysis.defectRate = totalInspected > 0 ? totalDefects / totalInspected : 0;

      // Generate AI insights
      if (analysis.defectRate > 0.05) {
        analysis.alerts.push('Defect rate above 5% - investigate root causes');
        
        const aiSuggestions = await this.generateQualityImprovementSuggestions({
          defectRate: analysis.defectRate,
          defectTypes: analysis.topDefects,
        });
        analysis.suggestions.push(...aiSuggestions);
      }

      return analysis;
    } catch (error) {
      console.error('Ashley quality analysis failed:', error);
      throw new Error('Quality analysis failed');
    }
  }

  /**
   * Stage 13: Merchandising Recommendations
   */
  async generateReprintRecommendations(params: {
    designAssetId: string;
    horizonDays?: number;
  }) {
    try {
      const horizonDays = params.horizonDays || 90;
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - horizonDays * 24 * 60 * 60 * 1000);

      // Get design performance data
      const design = await db.designAsset.findUnique({
        where: { id: params.designAssetId },
        include: {
          order: {
            include: {
              // Get related sales/performance data
            },
          },
        },
      });

      if (!design) {
        throw new Error('Design asset not found');
      }

      // AI-powered demand forecasting
      const demandForecast = await this.forecastDemand({
        designId: params.designAssetId,
        historicalData: [], // Would include actual sales data
        seasonality: true,
      });

      const recommendation = {
        recommendedQty: Math.round(demandForecast.expectedDemand),
        sizeCurve: demandForecast.sizeCurve,
        colorSplit: demandForecast.colorSplit,
        forecastMargin: demandForecast.margin,
        rationale: `Based on ${horizonDays}-day analysis: ${demandForecast.reasoning}`,
        confidence: demandForecast.confidence,
      };

      return recommendation;
    } catch (error) {
      console.error('Ashley reprint recommendation failed:', error);
      throw new Error('Reprint recommendation failed');
    }
  }

  // Private helper methods
  private async checkCapacityAvailability(params: {
    method: string;
    qty: number;
    targetDate: Date;
  }) {
    // Simplified capacity calculation
    // In reality, this would check machine schedules, operator availability, etc.
    return {
      utilization: Math.random() * 0.9, // Mock utilization
      available: true,
    };
  }

  private async checkMaterialAvailability(params: any) {
    // Mock material availability check
    return {
      available: true,
      missing: [] as string[],
    };
  }

  private async calculateDeliveryFeasibility(params: any) {
    // Mock delivery calculation
    const leadTime = this.getEstimatedLeadTime(params.method, params.totalQty);
    const estimatedDate = new Date(Date.now() + leadTime * 24 * 60 * 60 * 1000);
    
    return {
      estimatedDate,
      riskLevel: Math.random(), // Mock risk assessment
    };
  }

  private async generateOrderSuggestions(params: any): Promise<string[]> {
    const suggestions: string[] = [];
    
    // AI-generated suggestions based on historical data and current conditions
    try {
      const prompt = `Analyze this apparel order and provide optimization suggestions:
        - Product: ${params.productType}
        - Method: ${params.method}  
        - Quantity: ${params.totalQty}
        - Delivery: ${params.targetDeliveryDate}
        
        Provide 3 actionable suggestions to optimize cost, quality, or delivery.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.7,
      });

      const aiSuggestions = response.choices[0]?.message?.content?.split('\n').filter(s => s.trim());
      if (aiSuggestions) {
        suggestions.push(...aiSuggestions.slice(0, 3));
      }
    } catch (error) {
      console.error('AI suggestion generation failed:', error);
    }

    return suggestions;
  }

  private getEstimatedLeadTime(method: string, qty: number): number {
    // Mock lead time calculation (in days)
    const baseLeadTime = {
      'SILKSCREEN': 5,
      'SUBLIMATION': 3,
      'DTF': 4,
      'EMBROIDERY': 7,
    }[method] || 5;

    // Add time based on quantity
    const qtyMultiplier = Math.ceil(qty / 100) * 0.5;
    return baseLeadTime + qtyMultiplier;
  }

  private async calculateMarkerEfficiency(params: any) {
    // Mock marker efficiency calculation
    return {
      efficiency: 0.75 + Math.random() * 0.2, // 75-95% efficiency
      waste: Math.random() * 0.1, // 0-10% waste
    };
  }

  private getTimeframeStart(timeframe: string): Date {
    const now = new Date();
    switch (timeframe) {
      case 'DAILY':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'WEEKLY':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'MONTHLY':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }
  }

  private async generateQualityImprovementSuggestions(params: {
    defectRate: number;
    defectTypes: any[];
  }): Promise<string[]> {
    // AI-generated quality improvement suggestions
    try {
      const prompt = `Quality analysis shows ${(params.defectRate * 100).toFixed(2)}% defect rate. 
        Suggest 3 specific actions to improve quality in apparel manufacturing.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 150,
        temperature: 0.7,
      });

      return response.choices[0]?.message?.content?.split('\n').filter(s => s.trim()).slice(0, 3) || [];
    } catch (error) {
      console.error('AI quality suggestion generation failed:', error);
      return ['Review operator training programs', 'Implement additional quality checkpoints'];
    }
  }

  private async forecastDemand(params: {
    designId: string;
    historicalData: any[];
    seasonality: boolean;
  }) {
    // Mock demand forecasting
    return {
      expectedDemand: 100 + Math.random() * 200,
      sizeCurve: { S: 0.1, M: 0.3, L: 0.4, XL: 0.2 },
      colorSplit: { Black: 0.6, White: 0.4 },
      margin: 0.3 + Math.random() * 0.2,
      confidence: 0.7 + Math.random() * 0.2,
      reasoning: 'Based on historical performance and seasonal trends',
    };
  }

  private async analyzeSilkscreenDesign(params: any) {
    // Method-specific design analysis
    return {
      result: 'PASS' as const,
      issues: [],
      metrics: {
        expectedInkUsage: Math.random() * 50 + 10, // grams
        printTime: Math.random() * 30 + 15, // seconds per piece
      },
      estimatedCosts: {
        ink: Math.random() * 5 + 2,
        setup: Math.random() * 100 + 50,
      },
    };
  }

  private async analyzeSublimationDesign(params: any) {
    return {
      result: 'PASS' as const,
      issues: [],
      metrics: {
        paperUsage: Math.random() * 0.5 + 0.2, // m2 per piece
        pressTime: Math.random() * 20 + 10, // seconds
      },
      estimatedCosts: {
        paper: Math.random() * 3 + 1,
        ink: Math.random() * 2 + 1,
      },
    };
  }

  private async analyzeDTFDesign(params: any) {
    return {
      result: 'PASS' as const,
      issues: [],
      metrics: {
        filmUsage: Math.random() * 0.3 + 0.1, // m2 per piece
        powderUsage: Math.random() * 5 + 2, // grams
      },
      estimatedCosts: {
        film: Math.random() * 4 + 2,
        powder: Math.random() * 3 + 1,
      },
    };
  }

  private async analyzeEmbroideryDesign(params: any) {
    return {
      result: 'PASS' as const,
      issues: [],
      metrics: {
        stitchCount: Math.floor(Math.random() * 5000 + 1000),
        runtime: Math.random() * 10 + 5, // minutes
      },
      estimatedCosts: {
        thread: Math.random() * 3 + 1,
        stabilizer: Math.random() * 2 + 0.5,
      },
    };
  }
}

// Export singleton instance
export const ashley = AshleyAI.getInstance();