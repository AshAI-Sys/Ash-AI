#!/usr/bin/env python3
"""
Script to automatically fix camelCase to snake_case field names in TypeScript files
"""

import os
import re
import subprocess
from typing import Dict, List

# Field mappings based on Prisma schema
FIELD_MAPPINGS = {
    # Primary keys and foreign keys
    'orderId': 'order_id',
    'brandId': 'brand_id', 
    'clientId': 'client_id',
    'workspaceId': 'workspace_id',
    'userId': 'user_id',
    'designId': 'design_id',
    'templateId': 'template_id',
    'actorId': 'actor_id',
    'entityId': 'entity_id',
    'entityType': 'entity_type',
    'machineId': 'machine_id',
    'inspectionId': 'inspection_id',
    'operationId': 'operation_id',
    'routeTemplateId': 'route_template_id',
    'routingStepId': 'routing_step_id',
    
    # Common fields
    'createdAt': 'created_at',
    'updatedAt': 'updated_at',
    'targetDate': 'target_date',
    'startDate': 'start_date',
    'endDate': 'end_date',
    'dueDate': 'due_date',
    'completedAt': 'completed_at',
    'approvedAt': 'approved_at',
    
    # Order related
    'poNumber': 'po_number',
    'productType': 'product_type',
    'totalQty': 'total_qty',
    'unitPrice': 'unit_price',
    'totalValue': 'total_value',
    'targetDelivery': 'target_delivery',
    'targetDeliveryDate': 'target_delivery_date',
    'actualDelivery': 'actual_delivery',
    'actualDeliveryDate': 'actual_delivery_date',
    
    # Design related
    'designAssets': 'design_assets',
    'assetId': 'asset_id',
    'fileSize': 'file_size',
    'fileName': 'file_name',
    'filePath': 'file_path',
    'mimeType': 'mime_type',
    
    # Production related
    'standardSpec': 'standard_spec',
    'actualSpec': 'actual_spec',
    'qcStatus': 'qc_status',
    'defectCode': 'defect_code',
    'defectCount': 'defect_count',
    'rejectQty': 'reject_qty',
    'passQty': 'pass_qty',
    
    # Routing related
    'routingSteps': 'routing_steps',
    'stepName': 'step_name',
    'stepId': 'step_id',
    'workCenter': 'work_center',
    'plannedStart': 'planned_start',
    'plannedEnd': 'planned_end',
    'actualStart': 'actual_start',
    'actualEnd': 'actual_end',
    
    # Boolean fields
    'isActive': 'is_active',
    'isDefault': 'is_default',
    'isComplete': 'is_complete',
    'isApproved': 'is_approved',
    'isRejected': 'is_rejected',
    'canEdit': 'can_edit',
    'canDelete': 'can_delete',
    'canApprove': 'can_approve',
    
    # Financial
    'costPerUnit': 'cost_per_unit',
    'laborCost': 'labor_cost',
    'materialCost': 'material_cost',
    'totalCost': 'total_cost',
    'pricingData': 'pricing_data',
    'invoiceData': 'invoice_data',
    
    # Timestamps and dates
    'lastModified': 'last_modified',
    'dateCreated': 'date_created',
    'dateUpdated': 'date_updated',
    'scheduledFor': 'scheduled_for',
}

# Property access patterns that need to be updated
PROPERTY_PATTERNS = [
    # Database field access
    (r'\.orderId\b', '.order_id'),
    (r'\.brandId\b', '.brand_id'),
    (r'\.clientId\b', '.client_id'),
    (r'\.workspaceId\b', '.workspace_id'),
    (r'\.userId\b', '.user_id'),
    (r'\.designId\b', '.design_id'),
    (r'\.templateId\b', '.template_id'),
    (r'\.createdAt\b', '.created_at'),
    (r'\.updatedAt\b', '.updated_at'),
    (r'\.poNumber\b', '.po_number'),
    (r'\.totalQty\b', '.total_qty'),
    (r'\.isActive\b', '.is_active'),
    (r'\.isDefault\b', '.is_default'),
    (r'\.targetDeliveryDate\b', '.target_delivery_date'),
    (r'\.routingSteps\b', '.routing_steps'),
    (r'\.designAssets\b', '.design_assets'),
]

# Object literal patterns in Prisma queries
OBJECT_PATTERNS = [
    (r'\borderId:', 'order_id:'),
    (r'\bbrandId:', 'brand_id:'),
    (r'\bclientId:', 'client_id:'),
    (r'\bworkspaceId:', 'workspace_id:'),
    (r'\buserId:', 'user_id:'),
    (r'\bdesignId:', 'design_id:'),
    (r'\btemplateId:', 'template_id:'),
    (r'\bcreatedAt:', 'created_at:'),
    (r'\bupdatedAt:', 'updated_at:'),
    (r'\bpoNumber:', 'po_number:'),
    (r'\btotalQty:', 'total_qty:'),
    (r'\bisActive:', 'is_active:'),
    (r'\bisDefault:', 'is_default:'),
    (r'\btargetDeliveryDate:', 'target_delivery_date:'),
    (r'\broutingSteps:', 'routing_steps:'),
    (r'\bdesignAssets:', 'design_assets:'),
    (r'\bstandardSpec:', 'standard_spec:'),
]

# Variable name patterns (for variable declarations and usage)
VARIABLE_PATTERNS = [
    (r'\buserId\b', 'user_id'),
    (r'\borderId\b', 'order_id'),
    (r'\bbrandId\b', 'brand_id'),
    (r'\bclientId\b', 'client_id'),
    (r'\bworkspaceId\b', 'workspace_id'),
    (r'\bdesignId\b', 'design_id'),
    (r'\btemplateId\b', 'template_id'),
    (r'\broutingStepId\b', 'routing_step_id'),
    (r'\brouteTemplateId\b', 'route_template_id'),
    (r'\bstandardSpec\b', 'standard_spec'),
    (r'\btotalQty\b', 'total_qty'),
    (r'\btargetDeliveryDate\b', 'target_delivery_date'),
]

def fix_file(file_path: str) -> int:
    """Fix field names in a single file. Returns number of changes made."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        changes = 0
        
        # Apply property access patterns
        for pattern, replacement in PROPERTY_PATTERNS:
            new_content = re.sub(pattern, replacement, content)
            if new_content != content:
                changes += len(re.findall(pattern, content))
                content = new_content
        
        # Apply object literal patterns
        for pattern, replacement in OBJECT_PATTERNS:
            new_content = re.sub(pattern, replacement, content)
            if new_content != content:
                changes += len(re.findall(pattern, content))
                content = new_content
        
        # Apply variable name patterns
        for pattern, replacement in VARIABLE_PATTERNS:
            new_content = re.sub(pattern, replacement, content)
            if new_content != content:
                changes += len(re.findall(pattern, content))
                content = new_content
        
        # Only write if changes were made
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
        
        return changes
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return 0

def main():
    """Main function to process all TypeScript files."""
    src_dir = "src"
    total_changes = 0
    files_changed = 0
    
    # Find all TypeScript files
    for root, dirs, files in os.walk(src_dir):
        for file in files:
            if file.endswith(('.ts', '.tsx')):
                file_path = os.path.join(root, file)
                changes = fix_file(file_path)
                if changes > 0:
                    files_changed += 1
                    total_changes += changes
                    print(f"Fixed {changes} patterns in {file_path}")
    
    print(f"\nCompleted!")
    print(f"Files changed: {files_changed}")
    print(f"Total changes: {total_changes}")

if __name__ == "__main__":
    main()