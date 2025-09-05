import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

interface CartonType {
  name: string
  length_cm: number
  width_cm: number
  height_cm: number
  max_weight_kg: number
  cost: number
}

interface PackingItem {
  sku: string
  qty: number
  length_cm: number
  width_cm: number
  height_cm: number
  weight_kg: number
}

interface PackingSolution {
  carton_type: string
  contents: { sku: string; qty: number }[]
  utilization: number
  weight: number
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { orderId, cartonTypes, items, algorithm = "ASHLEY_AI" } = body

    // Validate input
    if (!orderId || !cartonTypes || !items) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Ashley AI Packing Optimization Algorithm
    const solution = await optimizePackingWithAshley(cartonTypes, items, algorithm)

    // Save optimization results
    const optimization = await prisma.packingOptimization.create({
      data: {
        orderId,
        algorithm,
        cartonTypes,
        items,
        solution: solution.cartons,
        totalCartons: solution.totalCartons,
        utilizationPct: solution.avgUtilization,
        estimatedCost: solution.estimatedCost
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        optimization,
        solution
      }
    })

  } catch (error) {
    console.error("Error optimizing packing:", error)
    return NextResponse.json(
      { success: false, error: "Failed to optimize packing" },
      { status: 500 }
    )
  }
}

async function optimizePackingWithAshley(
  cartonTypes: CartonType[],
  items: PackingItem[],
  algorithm: string
): Promise<{
  cartons: PackingSolution[]
  totalCartons: number
  avgUtilization: number
  estimatedCost: number
}> {
  
  if (algorithm === "ASHLEY_AI") {
    return ashleyAIOptimization(cartonTypes, items)
  } else if (algorithm === "BIN_PACKING") {
    return binPackingOptimization(cartonTypes, items)
  } else {
    return manualOptimization(cartonTypes, items)
  }
}

function ashleyAIOptimization(cartonTypes: CartonType[], items: PackingItem[]) {
  // Ashley's smart packing algorithm
  const cartons: PackingSolution[] = []
  const remainingItems = [...items]
  
  // Sort carton types by efficiency (volume/cost ratio)
  const sortedCartonTypes = [...cartonTypes].sort((a, b) => {
    const volumeA = a.length_cm * a.width_cm * a.height_cm
    const volumeB = b.length_cm * b.width_cm * b.height_cm
    const efficiencyA = volumeA / a.cost
    const efficiencyB = volumeB / b.cost
    return efficiencyB - efficiencyA
  })

  // Group items by size similarity for better packing
  const itemGroups = groupItemsBySimilarity(remainingItems)

  for (const group of itemGroups) {
    while (group.length > 0) {
      let bestCarton: PackingSolution | null = null
      let bestCartonType: CartonType | null = null
      let bestUtilization = 0

      // Try each carton type
      for (const cartonType of sortedCartonTypes) {
        const solution = packIntoCarton(cartonType, group)
        
        if (solution.contents.length > 0) {
          const utilization = calculateUtilization(cartonType, solution.contents.flatMap(c => 
            group.filter(item => item.sku === c.sku).slice(0, c.qty)
          ))

          if (utilization > bestUtilization) {
            bestUtilization = utilization
            bestCarton = solution
            bestCartonType = cartonType
          }
        }
      }

      if (bestCarton && bestCartonType) {
        bestCarton.carton_type = bestCartonType.name
        bestCarton.utilization = bestUtilization
        cartons.push(bestCarton)

        // Remove packed items
        for (const content of bestCarton.contents) {
          const itemIndex = group.findIndex(item => item.sku === content.sku)
          if (itemIndex !== -1) {
            group[itemIndex].qty -= content.qty
            if (group[itemIndex].qty <= 0) {
              group.splice(itemIndex, 1)
            }
          }
        }
      } else {
        // Force pack remaining items in largest carton
        const largestCarton = sortedCartonTypes[0]
        const forceSolution = forcePackIntoCarton(largestCarton, group)
        forceSolution.carton_type = largestCarton.name
        cartons.push(forceSolution)
        break
      }
    }
  }

  const avgUtilization = cartons.reduce((sum, c) => sum + c.utilization, 0) / cartons.length
  const estimatedCost = cartons.reduce((sum, c) => {
    const cartonType = cartonTypes.find(ct => ct.name === c.carton_type)
    return sum + (cartonType?.cost || 0)
  }, 0)

  return {
    cartons,
    totalCartons: cartons.length,
    avgUtilization: Math.round(avgUtilization * 100) / 100,
    estimatedCost
  }
}

function binPackingOptimization(cartonTypes: CartonType[], items: PackingItem[]) {
  // Traditional bin packing algorithm
  const cartons: PackingSolution[] = []
  const remainingItems = [...items]

  // Sort items by volume (largest first)
  remainingItems.sort((a, b) => {
    const volumeA = a.length_cm * a.width_cm * a.height_cm
    const volumeB = b.length_cm * b.width_cm * b.height_cm
    return volumeB - volumeA
  })

  // Use smallest fitting carton for each item
  for (const item of remainingItems) {
    let packed = false

    // Try to add to existing carton
    for (const carton of cartons) {
      const cartonType = cartonTypes.find(ct => ct.name === carton.carton_type)
      if (cartonType && canFitInCarton(cartonType, carton, item)) {
        const existingContent = carton.contents.find(c => c.sku === item.sku)
        if (existingContent) {
          existingContent.qty += item.qty
        } else {
          carton.contents.push({ sku: item.sku, qty: item.qty })
        }
        carton.weight += item.weight_kg * item.qty
        packed = true
        break
      }
    }

    // Create new carton if needed
    if (!packed) {
      const suitableCarton = cartonTypes.find(ct => 
        item.length_cm <= ct.length_cm &&
        item.width_cm <= ct.width_cm &&
        item.height_cm <= ct.height_cm &&
        item.weight_kg <= ct.max_weight_kg
      )

      if (suitableCarton) {
        cartons.push({
          carton_type: suitableCarton.name,
          contents: [{ sku: item.sku, qty: item.qty }],
          utilization: calculateUtilization(suitableCarton, [item]),
          weight: item.weight_kg * item.qty
        })
      }
    }
  }

  const avgUtilization = cartons.reduce((sum, c) => sum + c.utilization, 0) / cartons.length
  const estimatedCost = cartons.reduce((sum, c) => {
    const cartonType = cartonTypes.find(ct => ct.name === c.carton_type)
    return sum + (cartonType?.cost || 0)
  }, 0)

  return {
    cartons,
    totalCartons: cartons.length,
    avgUtilization: Math.round(avgUtilization * 100) / 100,
    estimatedCost
  }
}

function manualOptimization(cartonTypes: CartonType[], items: PackingItem[]) {
  // Simple manual packing - one item type per carton
  const cartons: PackingSolution[] = []
  
  for (const item of items) {
    const suitableCarton = cartonTypes.find(ct => 
      item.length_cm <= ct.length_cm &&
      item.width_cm <= ct.width_cm &&
      item.height_cm <= ct.height_cm
    )

    if (suitableCarton) {
      const maxFit = Math.floor(suitableCarton.max_weight_kg / item.weight_kg)
      const qtyPerCarton = Math.min(item.qty, maxFit)
      const cartonsNeeded = Math.ceil(item.qty / qtyPerCarton)

      for (let i = 0; i < cartonsNeeded; i++) {
        const qtyInThisCarton = Math.min(qtyPerCarton, item.qty - (i * qtyPerCarton))
        cartons.push({
          carton_type: suitableCarton.name,
          contents: [{ sku: item.sku, qty: qtyInThisCarton }],
          utilization: calculateUtilization(suitableCarton, [{ ...item, qty: qtyInThisCarton }]),
          weight: item.weight_kg * qtyInThisCarton
        })
      }
    }
  }

  const avgUtilization = cartons.reduce((sum, c) => sum + c.utilization, 0) / cartons.length || 0
  const estimatedCost = cartons.reduce((sum, c) => {
    const cartonType = cartonTypes.find(ct => ct.name === c.carton_type)
    return sum + (cartonType?.cost || 0)
  }, 0)

  return {
    cartons,
    totalCartons: cartons.length,
    avgUtilization: Math.round(avgUtilization * 100) / 100,
    estimatedCost
  }
}

function groupItemsBySimilarity(items: PackingItem[]): PackingItem[][] {
  // Group items by similar dimensions for better packing
  const groups: PackingItem[][] = []
  const processed = new Set<string>()

  for (const item of items) {
    if (processed.has(item.sku)) continue

    const group = [item]
    processed.add(item.sku)

    // Find similar items
    for (const otherItem of items) {
      if (processed.has(otherItem.sku)) continue

      const sizeDiff = Math.abs(
        (item.length_cm * item.width_cm * item.height_cm) -
        (otherItem.length_cm * otherItem.width_cm * otherItem.height_cm)
      )
      const avgSize = ((item.length_cm * item.width_cm * item.height_cm) +
                      (otherItem.length_cm * otherItem.width_cm * otherItem.height_cm)) / 2

      if (sizeDiff / avgSize < 0.3) { // Similar size (within 30%)
        group.push(otherItem)
        processed.add(otherItem.sku)
      }
    }

    groups.push(group)
  }

  return groups
}

function packIntoCarton(cartonType: CartonType, items: PackingItem[]): PackingSolution {
  const contents: { sku: string; qty: number }[] = []
  let totalWeight = 0

  for (const item of items) {
    if (totalWeight + (item.weight_kg * item.qty) <= cartonType.max_weight_kg &&
        item.length_cm <= cartonType.length_cm &&
        item.width_cm <= cartonType.width_cm &&
        item.height_cm <= cartonType.height_cm) {
      
      contents.push({ sku: item.sku, qty: item.qty })
      totalWeight += item.weight_kg * item.qty
    }
  }

  return {
    carton_type: cartonType.name,
    contents,
    utilization: 0, // Will be calculated later
    weight: totalWeight
  }
}

function forcePackIntoCarton(cartonType: CartonType, items: PackingItem[]): PackingSolution {
  const contents: { sku: string; qty: number }[] = []
  let totalWeight = 0

  for (const item of items) {
    const maxQty = Math.floor(cartonType.max_weight_kg / item.weight_kg)
    const qtyToPack = Math.min(item.qty, maxQty)
    
    if (qtyToPack > 0) {
      contents.push({ sku: item.sku, qty: qtyToPack })
      totalWeight += item.weight_kg * qtyToPack
    }
  }

  return {
    carton_type: cartonType.name,
    contents,
    utilization: totalWeight / cartonType.max_weight_kg,
    weight: totalWeight
  }
}

function canFitInCarton(cartonType: CartonType, carton: PackingSolution, item: PackingItem): boolean {
  return (carton.weight + (item.weight_kg * item.qty)) <= cartonType.max_weight_kg &&
         item.length_cm <= cartonType.length_cm &&
         item.width_cm <= cartonType.width_cm &&
         item.height_cm <= cartonType.height_cm
}

function calculateUtilization(cartonType: CartonType, items: PackingItem[]): number {
  const cartonVolume = cartonType.length_cm * cartonType.width_cm * cartonType.height_cm
  const itemsVolume = items.reduce((sum, item) => 
    sum + (item.length_cm * item.width_cm * item.height_cm * item.qty), 0
  )
  
  return Math.min(itemsVolume / cartonVolume, 1)
}