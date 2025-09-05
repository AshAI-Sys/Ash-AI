# ASH AI - Apparel Smart Hub with Artificial Intelligence

## Project Overview

**ASH AI** is an AI-powered ERP system for apparel manufacturing with end-to-end coverage:

- **Orders & Production** (Silkscreen, Sublimation, DTF, Embroidery)
- **Warehouse & Inventory** (QR batches, wastage tracking)
- **Finance & Payroll** (auto-compute, invoicing, PH compliance)
- **HR** (attendance, performance, training recommendations)
- **Maintenance** (machines & vehicles, reminders)
- **Client Portal** (tracking, approvals, payments, reorders)
- **Merchandising AI** (reprints, theme suggestions)
- **Automation Engine** (reminders for bills/deadlines/follow-ups)

## Project Identity

- **Project Name:** ASH AI
- **Meaning:** Apparel Smart Hub – Artificial Intelligence
- **Services:**
  - `ash-core` (orders, routing, inventory, HR/finance integration)
  - `ash-ai` (Ashley: monitor, forecast, advise)
  - `ash-admin` (backoffice UI)
  - `ash-staff` (mobile/PWA for workers)
  - `ash-portal` (client portal)
  - `ash-api` (BFF/API gateway)

## Technology Stack

- **Frontend:** Next.js 15 with TypeScript and Tailwind CSS
- **Backend:** Node.js/TypeScript with tRPC
- **Database:** PostgreSQL with Prisma ORM
- **Mobile:** PWA (Progressive Web App)
- **Queue:** Redis/BullMQ for job processing
- **Storage:** AWS S3 or compatible for files
- **Payments:** Stripe, PayMongo, GCash integration
- **AI/ML:** OpenAI API for Ashley recommendations

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ash-portal    │    │   ash-admin     │    │   ash-staff     │
│  (Client UI)    │    │ (Backoffice)    │    │  (Mobile PWA)   │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │       ash-api           │
                    │   (API Gateway/BFF)     │
                    └────────────┬────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                       │                        │
┌───────▼───────┐    ┌──────────▼──────────┐    ┌───────▼───────┐
│   ash-core    │    │      ash-ai         │    │    Database   │
│ (Main Logic)  │    │   (Ashley AI)       │    │  PostgreSQL   │
└───────────────┘    └─────────────────────┘    └───────────────┘
```

## Development Stages

### Phase 1: Core Foundation
1. **Stage 1:** Client & Order Intake
2. **Stage 2:** Design & Approval
3. **Stage 3:** Cutting Operations

### Phase 2: Production Flow
4. **Stage 4:** Printing (All Methods)
5. **Stage 5:** Sewing Operations
6. **Stage 6:** Quality Control

### Phase 3: Fulfillment
7. **Stage 7:** Finishing & Packing
8. **Stage 8:** Delivery Management
9. **Stage 9:** Finance Integration

### Phase 4: Operations
10. **Stage 10:** HR Management
11. **Stage 11:** Maintenance
12. **Stage 12:** Client Portal

### Phase 5: Intelligence
13. **Stage 13:** Merchandising AI
14. **Stage 14:** Automation & Reminders

## Key Principles

- **Auditability:** Immutable audit logs, idempotent writes
- **Security:** RBAC + 2FA, field-level encryption for PII
- **Reliability:** Daily backups, job retries, error handling
- **Performance:** p95 < 300ms for reads, async heavy operations
- **Offline-first:** PWA with queue & sync for staff apps

## Environment Variables

All environment variables use `ASH_` prefix:
- `ASH_DATABASE_URL`
- `ASH_JWT_SECRET`
- `ASH_AI_API_KEY`
- `ASH_STRIPE_SECRET`
- `ASH_S3_BUCKET`

## Event Bus

Events use `ash.` prefix:
- `ash.po.created`
- `ash.design.approved`
- `ash.qc.failed`
- `ash.shipment.delivered`

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
├── src/
│   ├── app/              # Next.js app router
│   ├── components/       # Reusable UI components
│   ├── server/           # tRPC backend logic
│   │   ├── api/          # API routes
│   │   ├── db/           # Database schema & client
│   │   └── services/     # Business logic services
│   ├── lib/              # Utility functions
│   └── types/            # TypeScript type definitions
├── prisma/               # Database schema & migrations
├── docs/                 # Documentation
└── public/               # Static assets
```

## Documentation

- [API Documentation](docs/api/)
- [Database Schema](docs/database/)
- [Ashley AI Logic](docs/ashley/)
- [Deployment Guide](docs/deployment/)

## License

Proprietary - Sorbetes Apparel Studio
