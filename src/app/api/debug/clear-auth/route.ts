// @ts-nocheck
// Debug API to clear authentication attempts
// Development only - helps with testing login functionality

import { NextResponse } from 'next/server'
import { clearAllAuthAttempts } from '@/lib/auth'

export async function POST() {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'Not available in production' },
      { status: 403 }
    )
  }

  try {
    clearAllAuthAttempts()

    return NextResponse.json({
      success: true,
      message: 'All authentication attempts cleared',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Error clearing auth attempts:', error)
    return NextResponse.json(
      { error: 'Failed to clear auth attempts' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Use POST to clear authentication attempts',
    development_only: true,
    available: process.env.NODE_ENV === 'development'
  })
}