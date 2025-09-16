# Ashley AI Manufacturing Validations

This module implements Ashley AI's manufacturing intelligence as specified in CLIENT_UPDATED_PLAN.md. Ashley provides real-time validation and optimization suggestions for the complete manufacturing workflow.

## Features

### 1. Order Intake Validation
Ashley validates orders during creation and modification, checking:

- **Capacity vs Deadlines**: Analyzes workcenter capacity against target delivery dates
- **Stock Availability**: Checks fabric/material inventory and creates PR suggestions
- **Route Safety**: Validates method/route combinations (e.g., blocks unsafe Silkscreen Option B)
- **Commercial Sanity**: Validates pricing against cost and margin requirements

### 2. Design Printability Checks
Ashley analyzes design files for production readiness:

- **DPI Validation**: Ensures adequate resolution for print method
- **File Requirements**: Validates separations, transparencies, digitized files
- **Placement Safety**: Checks for seam crossing and size constraints
- **Method-Specific Checks**: Specialized validation per printing method

## API Endpoints

### Order Validation
```typescript
// Pre-validate order before creation
POST /api/orders/validate
{
  "brand_id": "uuid",
  "method": "SILKSCREEN",
  "total_qty": 450,
  "target_delivery_date": "2025-09-25T00:00:00Z",
  "route_template_key": "SILKSCREEN_OPTION_A"
}

// Validate existing order
POST /api/ashley-ai/validate-order
{
  "order_id": "uuid",
  "trigger": "routing_change"
}
```

### Design Validation
```typescript
// Validate design printability
POST /api/ashley-ai/validate-design
{
  "asset_id": "uuid",
  "version": 1,
  "method": "SILKSCREEN"
}
```

## Validation Results

Ashley returns structured validation results:

```typescript
interface ValidationResult {
  risk: 'GREEN' | 'AMBER' | 'RED'
  issues: ValidationIssue[]
  advice: string[]
  assumptions: Record<string, any>
  blocking?: boolean
}
```

### Example Results

#### Capacity Warning
```json
{
  "risk": "AMBER",
  "issues": [{
    "type": "CAPACITY",
    "workcenter": "PRINTING",
    "details": "+18% over capacity in week of Sep 15",
    "severity": "WARN"
  }],
  "advice": [
    "Split run: 300 pcs this week, 150 next",
    "Consider subcontracting printing for 2 days"
  ],
  "assumptions": {
    "printing_rate_pcs_per_hr": 55,
    "utilization": 0.8
  }
}
```

#### Route Safety Block
```json
{
  "risk": "RED",
  "issues": [{
    "type": "ROUTE_SAFETY",
    "details": "Large print area with Sew → Print route poses high risk",
    "severity": "ERROR"
  }],
  "advice": ["Switch to Print → Sew route or reduce print area"],
  "blocking": true
}
```

#### Stock Shortage
```json
{
  "risk": "AMBER",
  "issues": [{
    "type": "STOCK",
    "item": "Black Fabric 240gsm",
    "details": "Short by 28 kg",
    "action": "PR_DRAFTED",
    "severity": "WARN"
  }],
  "advice": ["Create purchase request for 28 kg Black Fabric 240gsm"]
}
```

## Integration Examples

### 1. Order Creation with Validation

```typescript
// Step 1: Pre-validate order
const preValidation = await fetch('/api/orders/validate', {
  method: 'POST',
  body: JSON.stringify(orderData)
})

const { validation_result, can_proceed } = await preValidation.json()

if (!can_proceed) {
  // Show blocking issues to user
  return showValidationErrors(validation_result.issues)
}

// Step 2: Create order
const order = await createOrder(orderData)

// Step 3: Run full validation with order ID
await fetch('/api/ashley-ai/validate-order', {
  method: 'POST',
  body: JSON.stringify({
    order_id: order.id,
    trigger: 'create'
  })
})
```

### 2. Design Upload with Printability Check

```typescript
// After uploading design version
const designCheck = await fetch('/api/ashley-ai/validate-design', {
  method: 'POST',
  body: JSON.stringify({
    asset_id: design.asset_id,
    version: design.version,
    method: order.method
  })
})

const { check_result } = await designCheck.json()

if (check_result.result === 'FAIL') {
  // Block progression until issues resolved
  return showDesignIssues(check_result.issues)
}
```

### 3. Route Template Selection

```typescript
// Show route options with Ashley guidance
const routes = [
  {
    key: 'SILKSCREEN_OPTION_A',
    name: 'Cut → Print → Sew',
    recommended: true,
    ashley_note: 'Recommended for quality and efficiency'
  },
  {
    key: 'SILKSCREEN_OPTION_B',
    name: 'Cut → Sew → Print',
    recommended: false,
    ashley_note: 'High risk for large prints - use only for small placements'
  }
]
```

## Configuration

### Capacity Assumptions
```typescript
const capacitySettings = {
  operators_per_workcenter: {
    CUTTING: 2,
    PRINTING: 3,
    SEWING: 8,
    QC: 2,
    PACKING: 2
  },
  shift_minutes: 480,
  utilization: 0.8
}
```

### Standard Times (minutes per piece)
```typescript
const standardTimes = {
  CUTTING: 0.6,
  PRINTING: {
    SILKSCREEN: 1.5,
    SUBLIMATION: 2.0,
    DTF: 1.8,
    EMBROIDERY: 4.5
  },
  SEWING: 8.5,
  QC: 0.3,
  PACKING: 0.5
}
```

### Validation Thresholds
```typescript
const thresholds = {
  min_dpi: { standard: 150, aop: 200 },
  min_margin_percent: 25,
  max_capacity_utilization: 85,
  max_stitch_density: 1500 // per cm²
}
```

## Events

Ashley AI emits events for notifications and workflow automation:

- `ash.ashley.validation.critical` - Critical validation failures
- `ash.ashley.intake_risk_assessed` - Order intake assessment complete
- `ash.ashley.printability.checked` - Design validation complete
- `ash.ashley.capacity.warning` - Capacity threshold exceeded

## Database Storage

Validation results are stored in the `ai_insights` table:

```sql
-- AI insights and recommendations
ai_insights (
  id,
  workspace_id,
  type: 'ORDER_VALIDATION' | 'DESIGN_CHECK' | 'CAPACITY_ANALYSIS',
  entity_id, -- order_id, asset_id, etc.
  confidence,
  insights: jsonb, -- validation results
  metadata: jsonb,
  created_at
)

-- Design-specific checks
design_checks (
  id,
  asset_id,
  version,
  method,
  result: 'PASS' | 'WARN' | 'FAIL',
  issues: jsonb,
  metrics: jsonb,
  created_at
)
```

## Future Enhancements

1. **Machine Learning Integration**: Replace rule-based checks with ML models
2. **Historical Analysis**: Learn from past orders to improve predictions
3. **Real-time Monitoring**: Monitor production progress and adjust recommendations
4. **Predictive Maintenance**: Anticipate machine issues affecting capacity
5. **Customer Behavior Analysis**: Optimize recommendations based on client patterns

## Performance Notes

- Validation runs asynchronously where possible
- Results cached for 15 minutes to avoid re-computation
- Complex calculations offloaded to background jobs
- Database queries optimized with proper indexing

This implementation provides the foundation for Ashley AI's manufacturing intelligence, ensuring quality, efficiency, and profitability across all production workflows.