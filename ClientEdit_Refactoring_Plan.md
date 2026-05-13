# ClientEdit.tsx Refactoring Plan

**File:** `client/src/pages/admin/ClientEdit.tsx`  
**Current Size:** 3,293 lines  
**Date:** January 16, 2026

---

## Executive Summary

The `ClientEdit.tsx` file is the largest component in the application, containing 33 useState hooks, 17 mutations, 19 queries, and 8 distinct tab sections. This document provides a specific, actionable refactoring plan to split it into smaller, more manageable components while maintaining functionality.

---

## Current Structure Analysis

### Tab Sections by Line Count

| Tab Section | Lines | Complexity | Priority to Extract |
|-------------|-------|------------|---------------------|
| **progress** | 751 | High | 🔴 Critical |
| **items** | 667 | High | 🔴 Critical |
| **details** | 329 | Medium | 🟡 Medium |
| **pricing** | 252 | Medium | 🟡 Medium |
| **comments** | 108 | Low | 🟢 Low |
| **clone-history** | 94 | Low | 🟢 Low |
| **coach-notes** | 50 | Low | 🟢 Low |
| **internal-notes** | 11 | Low | 🟢 Low |

### State Complexity

| Category | Count | Notes |
|----------|-------|-------|
| useState hooks | 33 | Many can be colocated with extracted components |
| useMutation hooks | 17 | Should move with their related UI |
| useQuery hooks | 19 | Some shared, some tab-specific |
| Dialog components | 114 | Multiple dialogs embedded inline |

---

## Proposed Component Structure

### New File Structure

```
client/src/pages/admin/
├── ClientEdit.tsx                    # Main orchestrator (reduced to ~400 lines)
├── client-edit/
│   ├── index.ts                      # Barrel export
│   ├── types.ts                      # Shared types
│   ├── hooks/
│   │   ├── useClientData.ts          # Client data fetching
│   │   ├── useClientMutations.ts     # All mutations
│   │   └── useProtocolItems.ts       # Protocol items state
│   ├── tabs/
│   │   ├── DetailsTab.tsx            # Client information form
│   │   ├── ItemsTab.tsx              # Protocol items management
│   │   ├── PricingTab.tsx            # Pricing and payment
│   │   ├── CommentsTab.tsx           # Comments/discussion
│   │   ├── CoachNotesTab.tsx         # Coach notes
│   │   ├── InternalNotesTab.tsx      # Internal notes
│   │   ├── CloneHistoryTab.tsx       # Clone history
│   │   └── ProgressTab.tsx           # Progress photos/journal
│   └── dialogs/
│       ├── CloneDialog.tsx           # Clone protocol dialog
│       ├── EmailDialog.tsx           # Send email dialog
│       ├── NewProductDialog.tsx      # Add new product dialog
│       ├── EditItemDialog.tsx        # Edit item customization
│       └── BulkEditDialog.tsx        # Bulk edit items dialog
```

---

## Phase 1: Extract Types and Shared Hooks (Day 1)

### Step 1.1: Create types.ts

Extract all type definitions to a shared types file:

```typescript
// client/src/pages/admin/client-edit/types.ts

export type ClientProtocolItem = {
  id: number;
  clientProtocolId: number;
  protocolItemId: number;
  quantity: number;
  isIncluded: boolean;
  isRecommended: boolean;
  customSchedule: string | null;
  customDuration: string | null;
  customPrice: string | null;
  customNotes: string | null;
  customCategoryName: string | null;
  sortOrder: number;
};

export type ProtocolItem = {
  id: number;
  categoryId: number;
  name: string;
  schedule: string | null;
  duration: string | null;
  price: string | null;
  defaultQty: number | null;
  purpose: string | null;
  notes: string | null;
  affiliateUrl: string | null;
  affiliateCode: string | null;
  itemType: string;
  isActive: boolean;
  sortOrder: number;
};

export type Category = {
  id: number;
  name: string;
  displayName: string | null;
  description: string | null;
  sortOrder: number;
};

export type ClientFormData = {
  clientName: string;
  clientEmail: string;
  templateId: string;
  durationMonths: number;
  status: "draft" | "pending_approval" | "approved" | "active" | "completed";
  coachingPackage: string;
  coachingPrice: string;
  discountPercent: string;
  paymentMethod: "venmo" | "cc" | "other";
  venmoHandle: string;
  customRequirements: string;
  notes: string;
  coachNotes: string;
  shippingName: string;
  shippingStreet: string;
  shippingCity: string;
  shippingState: string;
  shippingZip: string;
  shippingCountry: string;
  shippingPhone: string;
};
```

### Step 1.2: Create useClientData.ts

Extract all data fetching queries:

```typescript
// client/src/pages/admin/client-edit/hooks/useClientData.ts

import { trpc } from "@/lib/trpc";

export function useClientData(clientId: number | null) {
  const { data: client, isLoading: clientLoading } = trpc.clientProtocol.get.useQuery(
    { id: clientId! },
    { enabled: !!clientId }
  );
  
  const { data: clientItems, refetch: refetchClientItems } = trpc.clientProtocol.getItems.useQuery(
    { clientProtocolId: clientId! },
    { enabled: !!clientId }
  );
  
  const { data: templates } = trpc.template.list.useQuery();
  const { data: allItems, refetch: refetchAllItems } = trpc.protocolItem.list.useQuery();
  const { data: categories } = trpc.category.list.useQuery();
  const { data: programs } = trpc.program.list.useQuery();
  
  const { data: clientProgramInfo, refetch: refetchProgramInfo } = trpc.program.getClientProgramInfo.useQuery(
    { clientProtocolId: clientId! },
    { enabled: !!clientId }
  );

  const { data: templateItems } = trpc.template.getItems.useQuery(
    { templateId: client?.templateId! },
    { enabled: !!client?.templateId }
  );

  const { data: selectedTemplate } = trpc.template.get.useQuery(
    { id: client?.templateId! },
    { enabled: !!client?.templateId }
  );

  return {
    client,
    clientLoading,
    clientItems,
    refetchClientItems,
    templates,
    allItems,
    refetchAllItems,
    categories,
    programs,
    clientProgramInfo,
    refetchProgramInfo,
    templateItems,
    selectedTemplate,
    hidePricing: selectedTemplate?.hidePricing ?? false,
  };
}
```

---

## Phase 2: Extract Tab Components (Days 2-4)

### Step 2.1: Extract ProgressTab.tsx (751 lines → ~700 lines)

This is the largest tab and should be extracted first:

```typescript
// client/src/pages/admin/client-edit/tabs/ProgressTab.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Camera, Image, FileText, Smile, Frown, Meh } from "lucide-react";

interface ProgressTabProps {
  clientEmail: string;
  clientProtocolId: number;
}

export function ProgressTab({ clientEmail, clientProtocolId }: ProgressTabProps) {
  const { data: clientUser } = trpc.users.getByEmail.useQuery(
    { email: clientEmail },
    { enabled: !!clientEmail }
  );
  
  const { data: progressPhotos = [] } = trpc.progress.getPhotos.useQuery(
    { userId: clientUser?.id! },
    { enabled: !!clientUser?.id }
  );
  
  const { data: journalNotes = [] } = trpc.progress.getNotes.useQuery(
    { userId: clientUser?.id! },
    { enabled: !!clientUser?.id }
  );

  // ... rest of progress tab JSX (lines 2541-3292)
}
```

### Step 2.2: Extract ItemsTab.tsx (667 lines → ~600 lines)

The items tab has significant complexity with bulk editing:

```typescript
// client/src/pages/admin/client-edit/tabs/ItemsTab.tsx

interface ItemsTabProps {
  clientId: number;
  protocolItems: ClientProtocolItem[];
  setProtocolItems: React.Dispatch<React.SetStateAction<ClientProtocolItem[]>>;
  allItems: ProtocolItem[] | undefined;
  categories: Category[] | undefined;
  templateItems: any[] | undefined;
  hidePricing: boolean;
  onOpenNewProductDialog: () => void;
  onOpenEditItemDialog: (itemId: number) => void;
}

export function ItemsTab({
  clientId,
  protocolItems,
  setProtocolItems,
  allItems,
  categories,
  templateItems,
  hidePricing,
  onOpenNewProductDialog,
  onOpenEditItemDialog,
}: ItemsTabProps) {
  // Bulk edit state (moved from parent)
  const [selectedItemIds, setSelectedItemIds] = useState<Set<number>>(new Set());
  const [isBulkEditDialogOpen, setIsBulkEditDialogOpen] = useState(false);
  
  // ... rest of items tab logic and JSX
}
```

### Step 2.3: Extract DetailsTab.tsx (329 lines → ~300 lines)

```typescript
// client/src/pages/admin/client-edit/tabs/DetailsTab.tsx

interface DetailsTabProps {
  isNew: boolean;
  formData: ClientFormData;
  setFormData: React.Dispatch<React.SetStateAction<ClientFormData>>;
  templates: Template[] | undefined;
  clientProgramInfo: any;
  programs: Program[] | undefined;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
}

export function DetailsTab({ ... }: DetailsTabProps) {
  // Program assignment state (moved from parent)
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null);
  const [selectedPhaseId, setSelectedPhaseId] = useState<number | null>(null);
  
  // ... rest of details tab
}
```

### Step 2.4: Extract PricingTab.tsx (252 lines → ~250 lines)

```typescript
// client/src/pages/admin/client-edit/tabs/PricingTab.tsx

interface PricingTabProps {
  formData: ClientFormData;
  setFormData: React.Dispatch<React.SetStateAction<ClientFormData>>;
  protocolItems: ClientProtocolItem[];
  allItems: ProtocolItem[] | undefined;
  hidePricing: boolean;
  onSave: () => void;
}

export function PricingTab({ ... }: PricingTabProps) {
  // ... pricing calculations and JSX
}
```

### Step 2.5: Extract Remaining Tabs

| Tab | Target File | Estimated Lines |
|-----|-------------|-----------------|
| CommentsTab | `tabs/CommentsTab.tsx` | ~100 lines |
| CoachNotesTab | `tabs/CoachNotesTab.tsx` | ~50 lines |
| InternalNotesTab | `tabs/InternalNotesTab.tsx` | ~20 lines |
| CloneHistoryTab | `tabs/CloneHistoryTab.tsx` | ~90 lines |

---

## Phase 3: Extract Dialog Components (Day 5)

### Step 3.1: Extract CloneDialog.tsx

```typescript
// client/src/pages/admin/client-edit/dialogs/CloneDialog.tsx

interface CloneDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: number;
  allClients: ClientProtocol[] | undefined;
}

export function CloneDialog({ isOpen, onClose, clientId, allClients }: CloneDialogProps) {
  const [cloneMode, setCloneMode] = useState<"new" | "existing" | "bulk">("new");
  const [cloneClientName, setCloneClientName] = useState("");
  const [cloneClientEmail, setCloneClientEmail] = useState("");
  // ... rest of clone dialog logic
}
```

### Step 3.2: Extract Other Dialogs

| Dialog | Target File | State to Move |
|--------|-------------|---------------|
| EmailDialog | `dialogs/EmailDialog.tsx` | emailAddress, emailConfirmStep |
| NewProductDialog | `dialogs/NewProductDialog.tsx` | newProductData |
| EditItemDialog | `dialogs/EditItemDialog.tsx` | editItemData, templateSyncOption |
| BulkEditDialog | `dialogs/BulkEditDialog.tsx` | bulkEditType, bulkEditValue |

---

## Phase 4: Refactor Main Component (Day 6)

### Final ClientEdit.tsx Structure

After refactoring, the main component should look like:

```typescript
// client/src/pages/admin/ClientEdit.tsx (~400 lines)

import AdminLayout from "@/components/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientData } from "./client-edit/hooks/useClientData";
import { DetailsTab } from "./client-edit/tabs/DetailsTab";
import { ItemsTab } from "./client-edit/tabs/ItemsTab";
import { PricingTab } from "./client-edit/tabs/PricingTab";
import { CommentsTab } from "./client-edit/tabs/CommentsTab";
import { CoachNotesTab } from "./client-edit/tabs/CoachNotesTab";
import { InternalNotesTab } from "./client-edit/tabs/InternalNotesTab";
import { CloneHistoryTab } from "./client-edit/tabs/CloneHistoryTab";
import { ProgressTab } from "./client-edit/tabs/ProgressTab";
import { CloneDialog } from "./client-edit/dialogs/CloneDialog";
import { EmailDialog } from "./client-edit/dialogs/EmailDialog";
// ... other imports

export default function AdminClientEdit() {
  const params = useParams<{ id: string }>();
  const isNew = !params.id || params.id === "new";
  const clientId = isNew ? null : parseInt(params.id);
  
  // Centralized data fetching
  const clientData = useClientData(clientId);
  
  // Tab navigation with swipe support
  const [activeTab, setActiveTab] = useState("details");
  
  // Form state
  const [formData, setFormData] = useState<ClientFormData>({ ... });
  const [protocolItems, setProtocolItems] = useState<ClientProtocolItem[]>([]);
  
  // Dialog visibility state
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  
  // ... minimal orchestration logic
  
  return (
    <AdminLayout>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          {/* Tab triggers */}
        </TabsList>
        
        <TabsContent value="details">
          <DetailsTab {...detailsProps} />
        </TabsContent>
        
        <TabsContent value="items">
          <ItemsTab {...itemsProps} />
        </TabsContent>
        
        {/* ... other tabs */}
      </Tabs>
      
      <CloneDialog
        isOpen={isCloneDialogOpen}
        onClose={() => setIsCloneDialogOpen(false)}
        clientId={clientId!}
        allClients={clientData.allClients}
      />
      
      <EmailDialog
        isOpen={isEmailDialogOpen}
        onClose={() => setIsEmailDialogOpen(false)}
        clientId={clientId!}
        clientEmail={formData.clientEmail}
      />
    </AdminLayout>
  );
}
```

---

## Expected Results

### Before Refactoring

| Metric | Value |
|--------|-------|
| Total Lines | 3,293 |
| useState hooks | 33 |
| Cognitive Complexity | Very High |
| Testability | Low |

### After Refactoring

| Metric | Value |
|--------|-------|
| Main Component | ~400 lines |
| Largest Tab Component | ~700 lines (ProgressTab) |
| Average Tab Component | ~200 lines |
| Testability | High (isolated components) |

### File Count

| Category | Count |
|----------|-------|
| Main Component | 1 |
| Tab Components | 8 |
| Dialog Components | 5 |
| Hook Files | 3 |
| Type Files | 1 |
| **Total New Files** | **18** |

---

## Implementation Timeline

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Phase 1 | 1 day | Types and hooks extracted |
| Phase 2 | 3 days | All 8 tab components extracted |
| Phase 3 | 1 day | All 5 dialog components extracted |
| Phase 4 | 1 day | Main component refactored |
| **Total** | **6 days** | Complete refactoring |

---

## Testing Strategy

1. **Before refactoring:** Create snapshot tests of current behavior
2. **During refactoring:** Run tests after each component extraction
3. **After refactoring:** Verify all functionality works identically
4. **New tests:** Add unit tests for each extracted component

---

## Risk Mitigation

1. **Create a checkpoint** before starting refactoring
2. **Extract one component at a time** and verify functionality
3. **Keep the original file** until all tests pass
4. **Use TypeScript strictly** to catch prop mismatches

---

*Document prepared by Manus AI on January 16, 2026*
