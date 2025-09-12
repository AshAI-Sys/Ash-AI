// @ts-nocheck
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
      workspace_id: string
    }
  }
  
  interface User {
    id: string
    email: string
    name: string
    full_name: string
    role: Role
    workspace_id: string
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

        // Production authentication - check database first, fallback to mock for demo
        try {
          // Try database authentication first
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });

          if (user && await bcrypt.compare(credentials.password, user.password)) {
            return {
              id: user.id,
              email: user.email,
              name: user.name,
              full_name: user.name,
              role: user.role
            };
          }
        } catch (_error) {
          console.warn('Database auth failed, using mock auth:', _error);
        }

        // Fallback to mock users for demo/development
        const mockUsers = [
          {
            id: '1',
            email: 'admin@example.com',
            password: 'admin123',
            full_name: 'System Administrator',
            role: 'ADMIN' as Role,
            workspace_id: 'workspace-1'
          },
          {
            id: '2',
            email: 'admin@ash-ai.com',
            password: 'AshAI2024!',
            full_name: 'ASH AI Administrator',
            role: 'ADMIN' as Role,
            workspace_id: 'workspace-1'
          },
          {
            id: '3',
            email: 'sewing@example.com',
            password: 'sewing123',
            full_name: 'Maria Santos',
            role: 'SEWING_OPERATOR' as Role,
            workspace_id: 'workspace-1'
          },
          {
            id: '4',
            email: 'manager@example.com',
            password: 'manager123',
            full_name: 'John Manager',
            role: 'MANAGER' as Role,
            workspace_id: 'workspace-1'
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
          workspace_id: user.workspace_id
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
        token.workspace_id = (user as { workspace_id: string }).workspace_id
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub!
        session.user.role = token.role as Role
        session.user.full_name = token.full_name as string
        session.user.workspace_id = token.workspace_id as string
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

    // Enhanced session validation - verify user exists and is active
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, email: true, name: true, role: true, active: true, workspace_id: true }
      })
      
      if (!user || !user.active) {
        return null
      }
      
      return {
        id: user.id,
        email: user.email,
        full_name: user.name,
        role: user.role,
        workspace_id: user.workspace_id,
        active: user.active
      }
    } catch (dbError) {
      console.warn('Database validation failed, using session data:', dbError)
      // Fallback to session data if database is unavailable
      return {
        id: session.user.id,
        email: session.user.email,
        full_name: session.user.full_name,
        role: session.user.role,
        workspace_id: session.user.workspace_id,
        active: true
      }
    }
  } catch (_error) {
    console.error('Token verification error:', _error)
    return null
  }
}