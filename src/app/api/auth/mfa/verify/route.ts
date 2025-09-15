// @ts-nocheck
// MFA Verification API - Verify TOTP codes
// Production-ready verification with rate limiting

import { NextRequest } from 'next/server'
import { createSuccessResponse, createErrorResponse } from '@/lib/error-handler'
import { verifyToken, checkAuthRateLimit } from '@/lib/auth'
import { authenticator } from 'otplib'

export async function POST(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return createErrorResponse('Authentication required', 401)
    }

    const body = await request.json()
    const { code, secret } = body

    if (!code || !secret) {
      return createErrorResponse('Verification code and secret are required', 400)
    }

    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      return createErrorResponse('Invalid code format. Please enter a 6-digit code.', 400)
    }

    // Rate limiting for MFA attempts
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitKey = `mfa:${user.id}:${clientIp}`
    const rateCheck = checkAuthRateLimit(rateLimitKey)

    if (!rateCheck.allowed) {
      return createErrorResponse(
        'Too many verification attempts. Please try again later.',
        429
      )
    }

    try {
      // Configure TOTP options
      authenticator.options = {
        window: 2, // Allow 2 time steps (60 seconds) of drift
        step: 30   // 30-second time step
      }

      // Verify the TOTP code
      const isValid = authenticator.verify({
        token: code,
        secret: secret
      })

      if (!isValid) {
        return createErrorResponse('Invalid verification code', 400)
      }

      // Success - code is valid
      return createSuccessResponse({
        verified: true,
        timestamp: new Date().toISOString()
      }, 'Code verified successfully')

    } catch (verificationError) {
      console.error('TOTP verification error:', verificationError)
      return createErrorResponse('Code verification failed', 500)
    }

  } catch (error) {
    console.error('MFA verification error:', error)
    return createErrorResponse('Verification request failed', 500)
  }
}

// Verify backup code
export async function PUT(request: NextRequest) {
  try {
    const user = await verifyToken(request)
    if (!user) {
      return createErrorResponse('Authentication required', 401)
    }

    const body = await request.json()
    const { backupCode } = body

    if (!backupCode) {
      return createErrorResponse('Backup code is required', 400)
    }

    // Rate limiting for backup code attempts
    const clientIp = request.headers.get('x-forwarded-for') || 'unknown'
    const rateLimitKey = `backup:${user.id}:${clientIp}`
    const rateCheck = checkAuthRateLimit(rateLimitKey)

    if (!rateCheck.allowed) {
      return createErrorResponse(
        'Too many backup code attempts. Please try again later.',
        429
      )
    }

    try {
      const userRecord = await prisma.user.findUnique({
        where: { id: user.id },
        select: { backup_codes: true, two_factor_enabled: true }
      })

      if (!userRecord?.two_factor_enabled) {
        return createErrorResponse('MFA is not enabled for this account', 400)
      }

      if (!userRecord.backup_codes) {
        return createErrorResponse('No backup codes found', 400)
      }

      const backupCodes = JSON.parse(userRecord.backup_codes)
      const codeIndex = backupCodes.indexOf(backupCode.toUpperCase())

      if (codeIndex === -1) {
        return createErrorResponse('Invalid backup code', 400)
      }

      // Remove used backup code
      backupCodes.splice(codeIndex, 1)

      // Update user record
      await prisma.user.update({
        where: { id: user.id },
        data: { backup_codes: JSON.stringify(backupCodes) }
      })

      return createSuccessResponse({
        verified: true,
        remainingCodes: backupCodes.length,
        timestamp: new Date().toISOString()
      }, 'Backup code verified successfully')

    } catch (dbError) {
      console.error('Database backup code verification failed:', dbError)
      return createErrorResponse('Backup code verification failed', 500)
    }

  } catch (error) {
    console.error('Backup code verification error:', error)
    return createErrorResponse('Backup code verification request failed', 500)
  }
}