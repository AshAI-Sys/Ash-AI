import { NextAuthOptions, User } from 'next-auth'
import { getServerSession } from 'next-auth/next'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'
import { Role } from '@prisma/client'
import { NextRequest } from 'next/server'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      full_name: string
      role: Role
    }
  }
  
  interface User {
    id: string
    email: string
    name: string
    full_name: string
    role: Role
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Mock user authentication for testing (bypass database)
        const mockUsers = [
          {
            id: '1',
            email: 'admin@example.com',
            password: 'admin123',
            full_name: 'System Administrator',
            role: 'ADMIN' as Role
          },
          {
            id: '2',
            email: 'sewing@example.com',
            password: 'sewing123',
            full_name: 'Maria Santos',
            role: 'SEWING_OPERATOR' as Role
          },
          {
            id: '3',
            email: 'manager@example.com',
            password: 'manager123',
            full_name: 'John Manager',
            role: 'MANAGER' as Role
          }
        ]

        const user = mockUsers.find(u => u.email === credentials.email)
        
        if (!user || user.password !== credentials.password) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.full_name,
          full_name: user.full_name,
          role: user.role,
        }
      }
    })
  ],
  session: {
    strategy: 'jwt'
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role: string }).role
        token.full_name = (user as { full_name: string }).full_name
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as Role
        session.user.full_name = token.full_name as string
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      },
    },
  },
}

// Token verification function for API routes
export async function verifyToken(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return null
    }

    // Return session user data directly (bypass database)
    return {
      id: session.user.id,
      email: session.user.email,
      full_name: session.user.full_name,
      role: session.user.role,
      active: true
    }
  } catch (_error) {
    console.error('Token verification error:', _error)
    return null
  }
}