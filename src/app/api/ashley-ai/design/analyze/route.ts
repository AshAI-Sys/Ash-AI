// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'

interface DesignData {
  palette?: Array<string>;
  meta?: {
    hasFinelines?: boolean;
    hasGradients?: boolean;
    hasWhiteInk?: boolean;
    fabricType?: string;
    stitchCount?: number;
    hasSmallText?: boolean;
    complexity?: string;
  };
  type?: string;
  placements?: Array<{
    widthCm?: number;
    heightCm?: number;
  }>;
}

interface Issue {
  type: string;
  title: string;
  description: string;
  severity: string;
  impact: string;
}

interface Recommendation {
  type: string;
  title: string;
  description: string;
  potentialSaving?: string;
  required?: boolean;
  alternativeMethods?: string[];
  maxRecommended?: string;
}

interface Optimization {
  type: string;
  title: string;
  description: string;
  benefit: string;
}

interface Analysis {
  printabilityScore: number;
  issues: Issue[];
  recommendations: Recommendation[];
  optimizations: Optimization[];
  costEstimate: {
    setupCost: number;
    perPieceCost: number;
    materialCost: number;
    complexity: string;
  };
  bestSellerPotential: {
    score: number;
    factors: string[];
    marketTrends: string[];
  };
}

// POST /api/ashley-ai/design/analyze - Analyze design for printability and optimization
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate required fields
    if (!body.method || !body.designData) {
      return NextResponse.json({ 
        error: 'Missing required fields: method and designData' 
      }, { status: 400 })
    }

    // Ashley AI Design Analysis
    const analysis = await analyzeDesignPrintability(body.method, body.designData)

    return NextResponse.json({
      success: true,
      analysis
    })

  } catch (_error) {
    console.error('Error in Ashley AI design analysis:', _error)
    return NextResponse.json({ 
      error: 'Internal server error',
      analysis: getDefaultAnalysis()
    }, { status: 500 })
  }
}

async function analyzeDesignPrintability(method: string, designData: DesignData): Promise<Analysis> {
  const analysis = {
    printabilityScore: 0,
    issues: [] as Issue[],
    recommendations: [] as Recommendation[],
    optimizations: [] as Optimization[],
    costEstimate: {
      setupCost: 0,
      perPieceCost: 0,
      materialCost: 0,
      complexity: 'LOW'
    },
    bestSellerPotential: {
      score: 0,
      factors: [] as string[],
      marketTrends: [] as string[]
    }
  }

  // Method-specific analysis
  switch (method) {
    case 'SILKSCREEN':
      return analyzeSilkscreenDesign(designData, analysis)
    case 'SUBLIMATION':
      return analyzeSublimationDesign(designData, analysis)
    case 'DTF':
      return analyzeDTFDesign(designData, analysis)
    case 'EMBROIDERY':
      return analyzeEmbroideryDesign(designData, analysis)
    default:
      return getDefaultAnalysis()
  }
}

function analyzeSilkscreenDesign(designData: DesignData, analysis: Analysis): Analysis {
  const colors = designData.palette?.length || 1
  const hasFinelines = designData.meta?.hasFinelines || false
  const hasGradients = designData.meta?.hasGradients || false

  // Printability Score (0-100)
  let score = 90
  
  if (colors > 4) {
    score -= 15
    analysis.issues.push({
      type: 'WARNING',
      title: 'High Color Count',
      description: `Design has ${colors} colors. Silkscreen is most cost-effective with 1-4 colors.`,
      severity: 'MEDIUM',
      impact: 'Cost and complexity increase with each additional color'
    })
    analysis.recommendations.push({
      type: 'COLOR_OPTIMIZATION',
      title: 'Reduce Color Count',
      description: 'Consider combining similar colors or using color blending techniques',
      potentialSaving: '15-30%'
    })
  }

  if (hasFinelines) {
    score -= 10
    analysis.issues.push({
      type: 'WARNING',
      title: 'Fine Line Details',
      description: 'Design contains lines thinner than 0.5pt',
      severity: 'HIGH',
      impact: 'May not print clearly or may clog screens'
    })
    analysis.recommendations.push({
      type: 'DESIGN_MODIFICATION',
      title: 'Increase Line Weight',
      description: 'Minimum line weight should be 0.75pt for silkscreen',
      required: true
    })
  }

  if (hasGradients) {
    score -= 20
    analysis.issues.push({
      type: 'ERROR',
      title: 'Gradient Effects Detected',
      description: 'Silkscreen cannot reproduce smooth gradients',
      severity: 'HIGH',
      impact: 'Gradients will print as halftone dots or require process printing'
    })
    analysis.recommendations.push({
      type: 'METHOD_CHANGE',
      title: 'Consider DTF or Sublimation',
      description: 'For gradient effects, DTF or sublimation would be more suitable',
      alternativeMethods: ['DTF', 'SUBLIMATION']
    })
  }

  // Cost Estimation
  analysis.costEstimate = {
    setupCost: 25 + (colors * 15), // Base setup + per color
    perPieceCost: 6 + (colors * 1.5),
    materialCost: colors * 0.8,
    complexity: colors > 3 ? 'HIGH' : colors > 1 ? 'MEDIUM' : 'LOW'
  }

  // Best-seller Analysis
  analysis.bestSellerPotential = {
    score: score > 80 ? 85 : score > 60 ? 70 : 50,
    factors: [
      score > 80 ? 'Simple, cost-effective design' : 'Complex design may limit appeal',
      colors <= 2 ? 'Low color count reduces costs' : 'High color count increases price'
    ],
    marketTrends: [
      'Minimalist designs trending +15%',
      'Corporate logos remain steady demand',
      colors <= 2 ? 'Single/dual color designs popular' : 'Multi-color complexity'
    ]
  }

  analysis.printabilityScore = Math.max(score, 0)
  return analysis
}

function analyzeSublimationDesign(designData: DesignData, analysis: Analysis): Analysis {
  const isFullColor = designData.type === 'full_color'
  const hasWhiteInk = designData.meta?.hasWhiteInk || false
  const fabricType = designData.meta?.fabricType || 'polyester'

  let score = 95

  if (fabricType !== 'polyester') {
    score -= 30
    analysis.issues.push({
      type: 'ERROR',
      title: 'Incompatible Fabric',
      description: `Sublimation requires polyester fabric. Current: ${fabricType}`,
      severity: 'HIGH',
      impact: 'Colors will not properly transfer or will fade quickly'
    })
    analysis.recommendations.push({
      type: 'FABRIC_CHANGE',
      title: 'Use Polyester Fabric',
      description: 'Sublimation only works on polyester or poly-blend fabrics (min 65% poly)',
      required: true
    })
  }

  if (hasWhiteInk) {
    score -= 25
    analysis.issues.push({
      type: 'ERROR',
      title: 'White Ink Not Supported',
      description: 'Sublimation cannot print white ink - relies on fabric color',
      severity: 'HIGH',
      impact: 'White areas will be transparent, showing fabric color'
    })
    analysis.recommendations.push({
      type: 'DESIGN_MODIFICATION',
      title: 'Remove White Elements',
      description: 'Use fabric color for white areas or consider DTF method',
      alternativeMethods: ['DTF']
    })
  }

  // Cost Estimation
  analysis.costEstimate = {
    setupCost: 30,
    perPieceCost: isFullColor ? 12 : 8,
    materialCost: 3.5,
    complexity: isFullColor ? 'HIGH' : 'MEDIUM'
  }

  // Best-seller Analysis
  analysis.bestSellerPotential = {
    score: isFullColor && fabricType === 'polyester' ? 90 : 65,
    factors: [
      'Full-color designs have strong visual impact',
      'Sports and activewear market growing',
      fabricType === 'polyester' ? 'Optimal fabric choice' : 'Fabric compatibility issue'
    ],
    marketTrends: [
      'All-over prints trending +25%',
      'Athletic wear demand increasing',
      'Photo-realistic designs popular'
    ]
  }

  analysis.printabilityScore = Math.max(score, 0)
  return analysis
}

function analyzeDTFDesign(designData: DesignData, analysis: Analysis): Analysis {
  const colors = designData.palette?.length || 1
  const hasWhiteInk = designData.meta?.hasWhiteInk || false
  const designSize = designData.placements?.[0]?.widthCm * designData.placements?.[0]?.heightCm || 100

  let score = 88

  if (designSize > 300) { // 30cm x 10cm or equivalent
    score -= 10
    analysis.issues.push({
      type: 'WARNING',
      title: 'Large Design Size',
      description: `Design area is ${designSize.toFixed(0)}cm². Large designs may crack or peel.`,
      severity: 'MEDIUM',
      impact: 'Durability may be reduced with washing'
    })
    analysis.recommendations.push({
      type: 'SIZE_OPTIMIZATION',
      title: 'Consider Smaller Size',
      description: 'Optimal DTF size is under 300cm² for best durability',
      maxRecommended: '20cm x 15cm'
    })
  }

  if (colors > 6 && hasWhiteInk) {
    analysis.optimizations.push({
      type: 'PRINT_OPTIMIZATION',
      title: 'White Base Optimization',
      description: 'DTF can use white ink as base for vibrant colors on dark fabrics',
      benefit: 'Enhanced color vibrancy on dark garments'
    })
  }

  // Cost Estimation
  analysis.costEstimate = {
    setupCost: 15,
    perPieceCost: 6 + (designSize / 100 * 2),
    materialCost: 2.5,
    complexity: colors > 4 ? 'HIGH' : 'MEDIUM'
  }

  // Best-seller Analysis  
  analysis.bestSellerPotential = {
    score: designSize <= 300 ? 80 : 65,
    factors: [
      'DTF allows full-color printing on any fabric',
      'Good for small to medium runs',
      designSize <= 300 ? 'Optimal size for durability' : 'Large size may affect longevity'
    ],
    marketTrends: [
      'DTF popularity increasing +40%',
      'Small batch custom printing in demand',
      'Works well for detailed designs'
    ]
  }

  analysis.printabilityScore = Math.max(score, 0)
  return analysis
}

function analyzeEmbroideryDesign(designData: DesignData, analysis: Analysis): Analysis {
  const stitchCount = designData.meta?.stitchCount || 5000
  const hasSmallText = designData.meta?.hasSmallText || false
  const _complexity = designData.meta?.complexity || 'medium'

  let score = 85

  if (stitchCount > 15000) {
    score -= 15
    analysis.issues.push({
      type: 'WARNING', 
      title: 'High Stitch Count',
      description: `Design has ${stitchCount} stitches. High stitch count increases cost and production time.`,
      severity: 'MEDIUM',
      impact: 'Each additional 1000 stitches adds ~$0.10 per piece'
    })
    analysis.recommendations.push({
      type: 'STITCH_OPTIMIZATION',
      title: 'Reduce Stitch Density',
      description: 'Consider using fill patterns instead of solid fills to reduce stitch count',
      potentialSaving: '20-35%'
    })
  }

  if (hasSmallText) {
    score -= 20
    analysis.issues.push({
      type: 'ERROR',
      title: 'Small Text Detected',
      description: 'Text smaller than 4mm height will not embroider clearly',
      severity: 'HIGH',
      impact: 'Text may be illegible or require manual cleanup'
    })
    analysis.recommendations.push({
      type: 'TEXT_MODIFICATION',
      title: 'Increase Text Size',
      description: 'Minimum text height should be 4-5mm for clear embroidery',
      required: true
    })
  }

  // Cost Estimation
  analysis.costEstimate = {
    setupCost: 45,
    perPieceCost: 15 + (stitchCount / 1000 * 0.8),
    materialCost: 4.5,
    complexity: stitchCount > 10000 ? 'HIGH' : stitchCount > 5000 ? 'MEDIUM' : 'LOW'
  }

  // Best-seller Analysis
  analysis.bestSellerPotential = {
    score: stitchCount <= 8000 && !hasSmallText ? 75 : 55,
    factors: [
      'Embroidery perceived as premium quality',
      'Excellent durability and wash resistance',
      stitchCount <= 8000 ? 'Reasonable stitch count' : 'High stitch count affects pricing'
    ],
    marketTrends: [
      'Corporate embroidery steady demand',
      'Premium positioning opportunities',
      'Higher margins than print methods'
    ]
  }

  analysis.printabilityScore = Math.max(score, 0)
  return analysis
}

function getDefaultAnalysis() {
  return {
    printabilityScore: 75,
    issues: [],
    recommendations: [],
    optimizations: [],
    costEstimate: {
      setupCost: 20,
      perPieceCost: 8,
      materialCost: 2,
      complexity: 'MEDIUM'
    },
    bestSellerPotential: {
      score: 70,
      factors: ['Standard design complexity'],
      marketTrends: ['Steady market demand']
    }
  }
}