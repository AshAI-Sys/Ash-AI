import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { randomBytes } from 'crypto'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()
  
  // Get client IP for rate limiting and logging
  const clientIP = request.headers.get('x-forwarded-for')?.split(',')[0] || 
    request.headers.get('x-real-ip') || 
    request.headers.get('cf-connecting-ip') ||
    'unknown'

  // Generate cryptographically secure nonce for CSP
  const nonce = randomBytes(16).toString('base64')
  
  // Comprehensive security headers for 100/100 security score
  const securityHeaders = {
    // Content Security Policy - Maximum security
    'Content-Security-Policy': [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' https://api.openai.com https://api.stripe.com https://api.paymongo.com",
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "manifest-src 'self'",
      "worker-src 'self'",
      "upgrade-insecure-requests"
    ].join('; '),
    
    // Prevent clickjacking attacks
    'X-Frame-Options': 'DENY',
    
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // XSS Protection
    'X-XSS-Protection': '1; mode=block',
    
    // Strict referrer policy for privacy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions Policy - Block all unnecessary features
    'Permissions-Policy': [
      'camera=()',
      'microphone=()',
      'geolocation=()',
      'payment=()',
      'usb=()',
      'accelerometer=()',
      'gyroscope=()',
      'magnetometer=()',
      'serial=()',
      'bluetooth=()',
      'fullscreen=(self)',
      'autoplay=()'
    ].join(', '),
    
    // HSTS - Force HTTPS (critical for production)
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    
    // Prevent DNS prefetching leaks
    'X-DNS-Prefetch-Control': 'off',
    
    // Remove server identification
    'X-Powered-By': '',
    'Server': '',
    
    // Cross-Origin policies for isolation
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    
    // Additional hardening headers
    'X-Permitted-Cross-Domain-Policies': 'none',
    'X-Download-Options': 'noopen',
    'X-Request-ID': nonce,
    
    // Prevent caching of sensitive data
    'Cache-Control': request.nextUrl.pathname.startsWith('/api/') ? 
      'no-store, no-cache, must-revalidate, proxy-revalidate' : 
      'public, max-age=31536000, immutable'
  }

  // Apply all security headers
  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (value) response.headers.set(key, value)
  })

  // Authentication middleware for protected routes
  const protectedPaths = [
    '/dashboard',
    '/orders',
    '/inventory', 
    '/users',
    '/settings',
    '/ashley-ai',
    '/api/ash',
    '/api/orders',
    '/api/inventory',
    '/api/users',
    '/api/automation',
    '/api/finance',
    '/api/hr'
  ]

  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  if (isProtectedPath && !request.nextUrl.pathname.startsWith('/api/portal')) {
    const token = await getToken({ 
      req: request,
      secret: process.env.NEXTAUTH_SECRET 
    })

    // Redirect to login if not authenticated (non-API routes)
    if (!token && !request.nextUrl.pathname.startsWith('/api/')) {
      const loginUrl = new URL('/auth/signin', request.url)
      loginUrl.searchParams.set('callbackUrl', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // API routes return 401 if not authenticated
    if (!token && request.nextUrl.pathname.startsWith('/api/')) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401,
          headers: { 
            'Content-Type': 'application/json',
            ...securityHeaders
          }
        }
      )
    }
  }

  // CORS configuration for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Only allow requests from same origin in production
    const allowedOrigins = process.env.NODE_ENV === 'production' 
      ? [process.env.NEXTAUTH_URL]
      : ['http://localhost:3000', 'http://localhost:3001']
    
    const origin = request.headers.get('origin')
    if (origin && allowedOrigins.includes(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin)
    }
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With')
    response.headers.set('Access-Control-Allow-Credentials', 'true')
    response.headers.set('Access-Control-Max-Age', '86400')
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers })
    }
  }

  // Security monitoring - Log suspicious activities
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // Log all API requests for monitoring
    const userAgent = request.headers.get('user-agent') || 'unknown'
    console.log(`[SECURITY] ${request.method} ${request.nextUrl.pathname} - IP: ${clientIP} - UA: ${userAgent}`)
    
    // Detect suspicious patterns
    const suspiciousPatterns = [
      '/api/../',
      'wp-admin',
      'phpmyadmin',
      '.env',
      'config.php',
      'shell',
      'cmd',
      'exec'
    ]
    
    if (suspiciousPatterns.some(pattern => request.nextUrl.pathname.includes(pattern))) {
      console.warn(`[SECURITY ALERT] Suspicious request blocked: ${request.nextUrl.pathname} from ${clientIP}`)
      return new NextResponse('Forbidden', { status: 403, headers: securityHeaders })
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}