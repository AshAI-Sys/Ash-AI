# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**ASH AI** (Apparel Smart Hub - Artificial Intelligence) is a comprehensive ERP system for apparel manufacturing built with Next.js 15, TypeScript, and Prisma. The system covers end-to-end manufacturing operations from order intake to delivery, with AI-powered insights and automation.

## Development Commands

```bash
# Development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Build and analyze
npm run build
npm run analyze

# Database operations
npx prisma db push
npx prisma generate
npx prisma studio

# Scripts
npm run backup
npm run analyze:bundle
```

## Architecture Overview

### Technology Stack
- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Backend**: Node.js API routes with Next.js
- **Database**: SQLite with Prisma ORM (configured for PostgreSQL in production)
- **Authentication**: NextAuth.js with credentials provider
- **Styling**: Tailwind CSS with custom neural/cyber theme
- **AI Integration**: OpenAI API for Ashley AI assistant

### Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes for all modules
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main dashboard
│   ├── orders/            # Order management
│   ├── production/        # Production workflows
│   ├── sewing/           # Sewing operations
│   ├── printing/         # Printing operations
│   ├── qc/               # Quality control
│   ├── hr/               # Human resources
│   ├── finance/          # Finance and invoicing
│   ├── maintenance/      # Equipment maintenance
│   └── client-portal/    # Client-facing portal
├── components/           # React components
├── lib/                 # Utilities and configurations
├── hooks/               # Custom React hooks
└── types/               # TypeScript type definitions
```

## Database Schema Architecture

The system uses a comprehensive Prisma schema organized by manufacturing stages:

### Core Entities
- **Workspace**: Multi-tenant support
- **User**: System authentication and roles
- **Client/Brand**: Customer and brand management
- **Order**: Purchase orders with routing workflows

### Manufacturing Stages
1. **Client & Order Intake**: Order creation and management
2. **Design & Approval**: Asset management and client approvals
3. **Cutting System**: Fabric cutting with optimization
4. **Printing System**: Multi-method printing (Silkscreen, Sublimation, DTF, Embroidery)
5. **Sewing System**: Operations with piece-rate tracking
6. **Quality Control**: AQL-based inspection system
7. **Finishing & Packing**: Final assembly and packaging
8. **Delivery Management**: Driver and 3PL logistics

### Support Systems
- **Finance**: AR/AP with BIR compliance (Philippine tax)
- **HR**: Employee management with Philippine compliance
- **Maintenance**: Equipment and facility management
- **Client Portal**: Self-service customer interface

## Development Guidelines

### Authentication
- Uses mock authentication in development with predefined users
- Test credentials: admin@example.com / admin123
- Role-based access control with comprehensive Role enum

### API Structure
- All API routes follow RESTful patterns
- Located in `src/app/api/[module]/`
- Use Prisma for database operations
- Implement proper error handling and validation

### Component Organization
- UI components in `src/components/ui/`
- Feature-specific components grouped by domain
- Multiple dashboard variants (Modern, Professional, Clean, etc.)

### Styling Approach
- Tailwind CSS with custom neural/cyber theme
- CSS custom properties for theming
- Component-based styling with shadcn/ui patterns
- Responsive design with mobile-first approach

### State Management
- React Context for global state (Providers component)
- Server state managed through API routes
- Client state using React hooks

## Key Files and Configurations

### Database
- **prisma/schema.prisma**: Comprehensive schema with 50+ models
- **src/lib/prisma.ts**: Database client configuration
- **src/lib/db.ts**: Database utilities

### Authentication
- **src/lib/auth.ts**: NextAuth configuration with mock users
- **src/app/api/auth/**: Authentication API routes

### Business Logic
- **src/lib/po-generator.ts**: Purchase order number generation
- **src/lib/routing-engine.ts**: Manufacturing routing logic
- **src/lib/*-calculations.ts**: Various calculation utilities

### UI Components
- **src/components/ui/**: Reusable UI components
- **src/components/Layout.tsx**: Main application layout
- **src/app/providers.tsx**: React context providers

## Important Considerations

### Performance
- Uses Next.js 15 optimizations (turbopack, optimized imports)
- Bundle analysis available via `npm run analyze`
- Image optimization configured
- Static optimization enabled

### Security
- Field-level encryption for PII mentioned in architecture
- RBAC implementation through Role enum
- Audit logging system (AuditLog model)

### Philippine Compliance
- BIR (Bureau of Internal Revenue) tax compliance
- Philippine employment law compliance in HR module
- Government ID fields (SSS, PhilHealth, Pag-IBIG, TIN)

### Development Notes
- Uses `@` path alias for imports (`@/` = `./src/`)
- TypeScript strict mode enabled
- ESLint configuration with Next.js rules
- Tailwind forms and animate plugins installed

## AI Integration (Ashley)
- AI assistant integrated throughout the system
- OpenAI API for insights and recommendations
- AI-powered forecasting and optimization
- Automated task assignment and routing optimization

## Testing Strategy
- Multiple test files in root directory for different workflows
- Mock data and test scenarios available
- Database seeding scripts in `src/lib/seed.ts`

When working on this codebase, always consider the manufacturing workflow context and the comprehensive nature of the ERP system. The code follows enterprise patterns with proper separation of concerns and scalable architecture.