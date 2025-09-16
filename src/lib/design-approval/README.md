# Design Approval Workflow

Complete implementation of design approval workflow as specified in CLIENT_UPDATED_PLAN.md Stage 2.

## Overview

The design approval workflow provides version control, client approval portal, and e-signature integration for design assets. It ensures proper approval before production while maintaining full audit trails.

## Features

### 1. Design Version Control
- **Immutable Versions**: Each design upload creates a new version
- **Version Locking**: Approved designs locked to prevent changes
- **Audit Trail**: Complete history of design changes and approvals

### 2. Client Approval Portal
- **Secure Links**: JWT-signed approval links with expiration
- **Visual Review**: Mockup preview with placement overlays
- **Approval/Rejection**: Simple approve or request changes workflow
- **E-signature**: Optional integration with DocuSign/Adobe Sign

### 3. Status Management
- **Design States**: DRAFT → PENDING_APPROVAL → APPROVED → LOCKED
- **Order Integration**: Approval triggers production planning
- **Change Requests**: Structured feedback and revision tracking

## API Endpoints

### Design Management

#### Create Design Version
```typescript
POST /api/designs
{
  "order_id": "uuid",
  "name": "Summer Collection Logo",
  "method": "SILKSCREEN",
  "files": {
    "mockup_url": "https://...",
    "prod_url": "https://...",
    "separations": ["https://..."]
  },
  "placements": [{
    "area": "front",
    "width_cm": 25,
    "height_cm": 20,
    "offset_x": 0,
    "offset_y": 5
  }],
  "palette": ["#000000", "#FF5733"],
  "meta": {
    "dpi": 300,
    "notes": "Centered placement"
  }
}
```

#### Send for Approval
```typescript
POST /api/designs/{asset_id}/versions/{version}/send-approval
{
  "client_id": "uuid",
  "require_esign": false,
  "approval_deadline": "2025-09-20T00:00:00Z",
  "custom_message": "Please review the updated logo placement"
}
```

### Client Portal

#### Get Approval Details
```typescript
GET /api/portal/approvals/{approval_id}?token={jwt_token}
```

#### Approve Design
```typescript
POST /api/portal/approvals/{approval_id}/approve
{
  "approval_token": "jwt_token",
  "approver_name": "John Smith",
  "comments": "Looks great, approved for production"
}
```

#### Request Changes
```typescript
POST /api/portal/approvals/{approval_id}/request-changes
{
  "approval_token": "jwt_token",
  "comments": "Please adjust logo size and position",
  "specific_changes": [{
    "area": "placement",
    "description": "Move logo 2cm to the right",
    "priority": "HIGH"
  }]
}
```

### Version Control

#### Lock Version
```typescript
POST /api/designs/{asset_id}/versions/{version}/lock
```

#### Emergency Unlock
```typescript
DELETE /api/designs/{asset_id}/versions/{version}/lock
```

## Workflow States

### Design Asset States
- **PENDING**: Initial upload, not ready for approval
- **PENDING_APPROVAL**: Sent to client for review
- **APPROVED**: Client approved, ready for production
- **REVISION_REQUESTED**: Client requested changes
- **LOCKED**: Approved and locked for production

### Approval States
- **SENT**: Approval request sent to client
- **APPROVED**: Client approved design
- **CHANGES_REQUESTED**: Client requested modifications
- **EXPIRED**: Approval deadline passed

## Client Portal Experience

### 1. Approval Link Access
- Client receives secure link via email/SMS
- Link contains JWT token with expiration
- Portal validates token and shows design details

### 2. Design Review Interface
- High-resolution mockup preview
- Placement visualization overlay
- Design specifications display
- Order context (PO#, quantity, delivery date)

### 3. Approval Actions
- **Approve**: Simple one-click approval
- **Request Changes**: Structured feedback form
- **E-signature**: Optional digital signature capture

### 4. Timeline Tracking
- Sent date and deadline
- View tracking (when client opened link)
- Response tracking with timestamps

## E-signature Integration

### Supported Providers
- DocuSign API integration
- Adobe Sign compatibility
- Generic e-signature workflow

### Document Generation
- Convert design mockup to PDF
- Add approval fields and signature areas
- Include order details and specifications

### Workflow
1. Create envelope with design PDF
2. Send to client for signature
3. Track completion status
4. Store signed document reference

## Security Features

### JWT Token Security
- Signed with ASH_JWT_SECRET
- Contains approval_id and client_id
- Expires after configurable time (default 7 days)
- Cannot be reused after response

### Access Control
- Tokens tied to specific approvals
- Client can only access their approvals
- Expired tokens automatically rejected

### Audit Logging
- All approval actions logged
- Design version changes tracked
- Lock/unlock operations recorded
- Client interaction timestamps

## Integration Points

### Order Management
- Design approval triggers production planning
- Order status updates based on approval state
- Delivery timeline adjustments for revisions

### Ashley AI Integration
- Printability checks before approval send
- Design quality validation
- Method-specific requirements verification

### Notification System
- Email/SMS approval requests
- Internal team notifications
- Deadline reminders
- Status change alerts

## Database Schema

### DesignVersion (New)
```sql
design_versions (
  id uuid,
  asset_id uuid,
  version int,
  files jsonb,           -- {mockup_url, prod_url, separations[], dst_url}
  placements jsonb,      -- [{area, width_cm, height_cm, offset_x, offset_y}]
  palette jsonb,         -- ["#000000", "#19e5a5"]
  meta jsonb,           -- {dpi, color_profile, notes}
  created_by uuid,
  created_at timestamp,
  unique(asset_id, version)
)
```

### DesignApproval (Enhanced)
```sql
design_approvals (
  id uuid,
  design_asset_id uuid,
  client_id uuid,
  status text,              -- SENT/APPROVED/CHANGES_REQUESTED/EXPIRED
  approver_name text,
  approver_email text,
  approver_signed_at timestamp,
  comments text,
  esign_envelope_id text,
  viewed_at timestamp,
  created_at timestamp
)
```

### DesignCheck (New)
```sql
design_checks (
  id uuid,
  asset_id uuid,
  version int,
  method text,             -- SILKSCREEN/SUBLIMATION/DTF/EMBROIDERY
  result text,             -- PASS/WARN/FAIL
  issues jsonb,            -- [{code, message, placement_ref}]
  metrics jsonb,           -- {min_dpi, expected_ink_g, stitch_count}
  created_at timestamp
)
```

## Error Handling

### Common Errors
- **Invalid Token**: 401 - Token expired or invalid
- **Already Responded**: 400 - Approval already processed
- **Design Not Found**: 404 - Invalid approval ID
- **Cannot Edit**: 400 - Design locked or in production

### Client Portal Errors
- Graceful error messages for clients
- Automatic retry for temporary failures
- Contact information for support

## Configuration

### Environment Variables
```bash
ASH_JWT_SECRET=your_jwt_secret
ASH_APP_URL=https://your-domain.com
ASH_APPROVAL_EXPIRY_HOURS=168  # 7 days default
```

### Feature Flags
```bash
ASH_ENABLE_ESIGNATURE=true
ASH_APPROVAL_REMINDERS=true
ASH_AUTO_LOCK_ON_APPROVE=false
```

## Testing

### Unit Tests
- Token generation and verification
- Approval workflow state transitions
- Security boundary testing

### Integration Tests
- End-to-end approval workflow
- Client portal functionality
- E-signature integration

### Example Test Scenarios
1. **Happy Path**: Upload → Send → Approve → Lock
2. **Change Request**: Upload → Send → Changes → Revise → Approve
3. **Security**: Invalid tokens rejected
4. **Expiration**: Expired approvals handled gracefully

## Performance Considerations

### Optimization
- JWT tokens avoid database lookups
- Design files served from CDN
- Approval status cached for dashboards
- Async notification sending

### Monitoring
- Approval response times
- Client portal usage analytics
- E-signature completion rates
- Design revision frequency

This implementation provides enterprise-grade design approval workflow with full client portal integration, security, and audit capabilities as specified in the CLIENT_UPDATED_PLAN.