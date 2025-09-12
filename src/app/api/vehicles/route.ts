// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server'

import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const active = searchParams.get("active")
    const type = searchParams.get("type")

    const where: any = {}
    
    if (active !== null) {
      where.active = active === "true"
    }
    
    if (type) {
      where.type = type
    }

    const vehicles = await prisma.vehicle.findMany({
      where,
      orderBy: {
        plateNumber: "asc"
      }
    })

    return NextResponse.json({
      success: true,
      data: vehicles
    })

  } catch (_error) {
    console.error("Error fetching vehicles:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to fetch vehicles" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      plateNumber,
      type,
      active = true
    } = body

    // Validate required fields
    if (!plateNumber || !type) {
      return NextResponse.json(
        { success: false, error: "Plate number and type are required" },
        { status: 400 }
      )
    }

    // Check if plate number already exists
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { plateNumber }
    })

    if (existingVehicle) {
      return NextResponse.json(
        { success: false, error: "Vehicle with this plate number already exists" },
        { status: 409 }
      )
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        plateNumber,
        type,
        active
      }
    })

    return NextResponse.json({
      success: true,
      data: vehicle
    })

  } catch (_error) {
    console.error("Error creating vehicle:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to create vehicle" },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, plateNumber, type, active } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Vehicle ID is required" },
        { status: 400 }
      )
    }

    // Check if vehicle exists
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { id }
    })

    if (!existingVehicle) {
      return NextResponse.json(
        { success: false, error: "Vehicle not found" },
        { status: 404 }
      )
    }

    // If updating plate number, check for duplicates
    if (plateNumber && plateNumber !== existingVehicle.plateNumber) {
      const duplicateVehicle = await prisma.vehicle.findUnique({
        where: { plateNumber }
      })

      if (duplicateVehicle) {
        return NextResponse.json(
          { success: false, error: "Vehicle with this plate number already exists" },
          { status: 409 }
        )
      }
    }

    const updatedVehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        ...(plateNumber && { plateNumber }),
        ...(type && { type }),
        ...(active !== undefined && { active })
      }
    })

    return NextResponse.json({
      success: true,
      data: updatedVehicle
    })

  } catch (_error) {
    console.error("Error updating vehicle:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to update vehicle" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Vehicle ID is required" },
        { status: 400 }
      )
    }

    // Check if vehicle exists
    const existingVehicle = await prisma.vehicle.findUnique({
      where: { id }
    })

    if (!existingVehicle) {
      return NextResponse.json(
        { success: false, error: "Vehicle not found" },
        { status: 404 }
      )
    }

    // Check if vehicle is in use (has active trips)
    const activeTrips = await prisma.trip.count({
      where: {
        vehicleId: id,
        status: {
          in: ["PLANNED", "IN_PROGRESS"]
        }
      }
    })

    if (activeTrips > 0) {
      return NextResponse.json(
        { success: false, error: "Cannot delete vehicle with active trips" },
        { status: 400 }
      )
    }

    // Soft delete by marking as inactive
    const deactivatedVehicle = await prisma.vehicle.update({
      where: { id },
      data: { active: false }
    })

    return NextResponse.json({
      success: true,
      data: deactivatedVehicle,
      message: "Vehicle deactivated successfully"
    })

  } catch (_error) {
    console.error("Error deleting vehicle:", _error)
    return NextResponse.json(
      { success: false, error: "Failed to delete vehicle" },
      { status: 500 }
    )
  }
}