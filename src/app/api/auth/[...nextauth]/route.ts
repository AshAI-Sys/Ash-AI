import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

// For Next.js 13+ App Router compatibility
const handler = NextAuth(authOptions)

export const GET = handler
export const POST = handler