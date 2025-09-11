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
npm run analyze:bundle

# Database operations
npx prisma db push
npx prisma generate
npx prisma studio

# Additional utilities
npm run backup
npm run postinstall  # Regenerates Prisma client after install
```

## Architecture Overview

### Technology Stack
- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **Backend**: Node.js API routes with Next.js
- **Database**: SQLite with Prisma ORM (configured for PostgreSQL in production)
- **Authentication**: NextAuth.js with credentials provider
- **Styling**: Tailwind CSS with custom neural/cyber theme
- **AI Integration**: OpenAI API for Ashley AI assistant

### Core System Architecture (5 Phases)

**Phase 1: Backend Foundation**
- Authentication and user management
- Database schema with 50+ models
- Order management system
- Client and brand management

**Phase 2: Production Workflows**
- Multi-stage manufacturing (Cutting, Printing, Sewing, QC, Finishing)
- Real-time production tracking
- Equipment and maintenance management
- Inventory and material management

**Phase 3: Frontend & UI**
- TikTok-style professional interface
- Multiple dashboard variants
- Mobile-responsive design
- Client portal for customer self-service

**Phase 4: AI Integration**
- Ashley AI assistant with GPT-4
- Production optimization and forecasting
- Automated insights and recommendations
- Real-time anomaly detection

**Phase 5: HR & Finance**
- Complete HR management with Philippine compliance
- Financial management with BIR tax compliance
- Accounts receivable/payable with aging reports
- Payroll processing and employee management

### Project Structure
```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes (170+ endpoints)
│   │   ├── ai/            # AI integration endpoints
│   │   ├── ashley-ai/     # Ashley AI specific routes
│   │   ├── auth/          # Authentication
│   │   ├── finance/       # Financial management
│   │   ├── hr/            # Human resources
│   │   ├── orders/        # Order management
│   │   ├── production/    # Manufacturing
│   │   ├── qc/            # Quality control
│   │   └── portal/        # Client portal
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main dashboard
│   ├── orders/            # Order management
│   ├── production/        # Production workflows
│   ├── sewing/           # Sewing operations
│   ├── printing/         # Printing operations
│   ├── qc/               # Quality control
│   ├── hr/               # Human resources
│   ├── finance/          # Finance and invoicing
│   └── client-portal/    # Client-facing portal
├── components/           # React components
│   ├── ui/              # Reusable UI components
│   └── Layout.tsx       # Main application layout
├── lib/                 # Utilities and configurations
├── hooks/               # Custom React hooks
└── types/               # TypeScript type definitions
```

## Database Schema Architecture

The system uses a comprehensive Prisma schema organized by manufacturing stages:

### Core Entities
- **Workspace**: Multi-tenant support
- **User**: System authentication with Role enum (ADMIN, MANAGER, OPERATOR, CLIENT)
- **Client/Brand**: Customer and brand management
- **Order**: Purchase orders with routing workflows

### Manufacturing Workflow
1. **Client & Order Intake**: Order creation and management
2. **Design & Approval**: Asset management and client approvals
3. **Cutting System**: Fabric cutting with optimization
4. **Printing System**: Multi-method printing (Silkscreen, Sublimation, DTF, Embroidery)
5. **Sewing System**: Operations with piece-rate tracking
6. **Quality Control**: AQL-based inspection system
7. **Finishing & Packing**: Final assembly and packaging
8. **Delivery Management**: Driver and 3PL logistics

### Business Systems
- **Finance**: AR/AP with BIR compliance (Philippine tax)
- **HR**: Employee management with Philippine compliance (SSS, PhilHealth, Pag-IBIG, TIN)
- **Maintenance**: Equipment and facility management
- **Client Portal**: Self-service customer interface

## Development Guidelines

### Authentication
- Mock authentication in development with predefined users
- Test credentials: admin@example.com / admin123
- Production authentication checks database first, fallback to mock
- Role-based access control throughout the system

### API Structure
- 170+ API endpoints following RESTful patterns
- Located in `src/app/api/[module]/`
- Comprehensive error handling and validation
- Session-based authentication with NextAuth

### Component Organization
- UI components in `src/components/ui/` using shadcn/ui patterns
- Feature-specific components grouped by domain
- Multiple dashboard variants (Modern, Professional, Clean, Analytics)
- Consistent neural/cyber theming across all interfaces

### Philippine Compliance Features
- **BIR (Bureau of Internal Revenue)**: VAT returns, withholding tax, annual ITR
- **HR Compliance**: Government IDs, 13th month pay, labor law compliance
- **Financial Reporting**: P&L, Balance Sheet, Cash Flow with local requirements
- **Payroll**: SSS, PhilHealth, Pag-IBIG contributions

## Key Files and Configurations

### Database
- **prisma/schema.prisma**: Comprehensive schema with 50+ models covering entire manufacturing workflow
- **src/lib/prisma.ts**: Database client configuration
- **src/lib/db.ts**: Database utilities and audit logging

### Authentication
- **src/lib/auth.ts**: NextAuth configuration with mock users and production database fallback
- **src/app/api/auth/**: Authentication API routes including 2FA support

### Business Logic
- **src/lib/po-generator.ts**: Purchase order number generation
- **src/lib/routing-engine.ts**: Manufacturing routing logic
- **src/lib/finance-calculations.ts**: BIR tax calculations and financial utilities
- **src/lib/ashley-ai.ts**: AI integration and validation logic

### AI Integration (Ashley)
- OpenAI GPT-4 integration for insights and recommendations
- Production optimization and demand forecasting
- Automated task assignment and routing optimization
- Real-time anomaly detection and quality prediction

### Performance Optimizations
- Next.js 15 with turbopack and optimized imports
- Bundle analysis available via `npm run analyze`
- Image optimization and static generation
- Component-level code splitting

### Development Notes
- Uses `@` path alias for imports (`@/` = `./src/`)
- TypeScript strict mode enabled with config in `config/tsconfig.json`
- ESLint configuration with Next.js rules in `config/eslint.config.mjs`
- Comprehensive audit logging system
- Multi-tenant workspace architecture
- Configuration files centralized in `config/` directory

## Philippine Business Compliance

### BIR (Bureau of Internal Revenue)
- Automated VAT return generation (Form 2550M/Q)
- Withholding tax certificates (Form 2307)
- Electronic books of accounts
- Annual income tax return preparation

### Employment Compliance
- SSS, PhilHealth, Pag-IBIG, TIN integration
- 13th month pay automation
- Philippine labor law compliance
- Attendance and payroll with local requirements

## Testing Strategy
- Mock data and test scenarios available in root directory
- Database seeding scripts in `src/lib/seed.ts`
- Comprehensive API testing across all 170+ endpoints
- Role-based access testing for all user types

## Production Considerations
- Database migration from SQLite to PostgreSQL
- Environment configuration in `config/` directory
- Backup and restore scripts available
- Health monitoring and audit trail implementation

When working on this codebase, always consider the comprehensive manufacturing workflow context and the multi-phase architecture. The system follows enterprise ERP patterns with proper separation of concerns, role-based security, and scalable multi-tenant architecture.
- to memorize