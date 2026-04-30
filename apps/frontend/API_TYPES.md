# API Types Documentation

This document describes all backend API routes and their corresponding frontend TypeScript types.

## Table of Contents

- [Auth Routes](#auth-routes)
- [User Routes](#user-routes)
- [Account Routes](#account-routes)
- [Supplier API Key Routes](#supplier-api-key-routes)
- [Supplier Routes](#supplier-routes)
- [Supplies Routes](#supplies-routes)
- [Warehouse Routes](#warehouse-routes)
- [Autobooking Routes](#autobooking-routes)
- [Reschedule Routes](#reschedule-routes)
- [Trigger Routes](#trigger-routes)
- [Payment Routes](#payment-routes)
- [Coefficient Routes](#coefficient-routes)

---

## Auth Routes

Base path: `/api/v1/auth`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/verify-phone` | Start phone verification | `{ phoneNumber: string }` | `VerifyPhoneResponse` |
| POST | `/verify-sms` | Verify SMS code | `{ smsCode: string, sessionId: string }` | `VerifySMSResponse` |
| POST | `/verify-two-factor` | Verify 2FA code | `{ twoFactorCode: string, sessionId: string }` | `VerifyTwoFactorResponse` |
| POST | `/cancel` | Cancel auth session | `{ sessionId: string }` | `CancelAuthResponse` |
| POST | `/logout` | Logout user/account | `{ accountId?: string }` | `{ success: boolean, message: string }` |

### Types

```typescript
interface VerifyPhoneResponse {
  success: boolean;
  sessionId: string;
  message: string;
  requiresSMSCode: boolean;
}

interface VerifySMSResponse {
  success: boolean;
  sessionId?: string;
  message: string;
  requiresTwoFactor?: boolean;
  supplierName?: string;
}

interface VerifyTwoFactorResponse {
  success: boolean;
  message: string;
  supplierName?: string;
}

interface CancelAuthResponse {
  success: boolean;
  message: string;
}
```

---

## User Routes

Base path: `/api/v1/user`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/` | Get current user | - | `User` |
| POST | `/update` | Update user | `{ agreeTerms?: boolean, selectedAccountId?: string }` | `{ success: boolean }` |

### Types

```typescript
interface User {
  name?: string;
  subscriptionTier?: 'LITE' | 'PRO' | 'MAX';
  subscriptionExpiresAt: string | null;
  agreeTerms: boolean;
  selectedAccountId?: string;
  payments: Payment[];
  supplierApiKey?: {
    isExistAPIKey: boolean;
    createdAt: string;
    updatedAt: string;
  };
  accounts: Account[];
}
```

---

## Account Routes

Base path: `/api/v1/accounts`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/` | Get all accounts | - | `AccountsResponse` |
| GET | `/:id` | Get single account | - | `AccountResponse` |
| DELETE | `/:id` | Delete account | - | `{ success: boolean, message: string }` |
| PATCH | `/supplier` | Update selected supplier | `{ accountId: string, supplierId: string }` | `UpdateSupplierResponse` |
| GET | `/:accountId/suppliers` | Sync & get suppliers | - | `SyncSuppliersResponse` |
| POST | `/:accountId/suppliers/sync` | Explicit sync suppliers | - | `SyncSuppliersResponse` |

### Types

```typescript
interface Account {
  id: string;
  phoneWb?: string;
  selectedSupplierId?: string;
  suppliers: Supplier[];
  createdAt: string;
  updatedAt: string;
}

interface Supplier {
  supplierId: string;
  supplierName: string;
}
```

---

## Supplier API Key Routes

Base path: `/api/v1/supplier-api-keys`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/` | Get API key status | - | `ApiKeyStatus` |
| POST | `/` | Create/update API key | `{ apiKey: string }` | `CreateApiKeyResponse` |
| DELETE | `/` | Delete API key | - | `{ success: boolean, message: string }` |

### Types

```typescript
interface ApiKeyStatus {
  success: boolean;
  hasApiKey: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
```

---

## Supplier Routes

Base path: `/api/v1/suppliers`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/balances` | Get warehouse balances | Query: `accountId?`, `supplierId?` | `WarehouseBalance[]` |
| POST | `/drafts/list` | List drafts | `{ accountId?, supplierId?, limit?, offset?, orderBy? }` | `DraftsResponse` |
| POST | `/goods/draft` | Get draft goods | `{ draftID, accountId?, supplierId?, search?, brands?, subjects?, limit?, offset? }` | `DraftGoodsResponse` |

### Types

```typescript
interface GoodBalance {
  goodName: string;
  brand: string;
  subject: string;
  supplierArticle: string;
  quantity: number;
}

interface WarehouseBalance {
  warehouseId: number;
  goods: GoodBalance[];
}

interface Draft {
  draftID: string;
  supplierId: string;
  draftName: string;
  goodsCount: number;
}

interface DraftGood {
  imgSrc?: string;
  imtName?: string;
  quantity?: number;
  barcode?: string;
  brandName?: string;
  subjectName?: string;
  colorName?: string;
}
```

---

## Supplies Routes

Base path: `/api/v1/supplies`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/list` | List supplies | `{ accountId?, supplierId? }` | `SuppliesResponse` |
| GET | `/supply-details` | Get supply details | Query: `supplyId` | `SupplyDetailsResponse` |

### Types

```typescript
interface Supply {
  supplyId: number;
  supplyDate: string;
  warehouseId: number;
  warehouseName: string;
  boxTypeName: string;
  statusId: number;
  statusName: string;
}

interface SupplyDetails {
  id: number;
  supplyId: number;
  supplyDate: string;
  warehouseId: number;
  warehouseName: string;
  boxTypeName: string;
  statusId: number;
  statusName: string;
}

interface SupplyGood {
  imgSrc?: string;
  imtName?: string;
  quantity?: number;
  barcode?: string;
  brandName?: string;
  subjectName?: string;
  colorName?: string;
}
```

---

## Warehouse Routes

Base path: `/api/v1/warehouses`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/` | Get all warehouses | - | `WarehousesResponse` |
| POST | `/transits` | Get transit offices | `{ accountId, warehouseId }` | `TransitsResponse` |
| POST | `/validate` | Validate warehouse goods | `{ accountId?, draftID, warehouseId, transitWarehouseId?, supplierId? }` | `ValidationResponse` |
| GET | `/cache/status` | Get cache status | - | `CacheStatusResponse` |
| POST | `/cache/clear` | Clear cache | - | `{ success: boolean, message: string }` |

### Types

```typescript
interface Warehouse {
  ID: number;
  name: string;
  address?: string;
  workTime?: string;
  acceptsQr?: boolean;
}

interface TransitItem {
  transitWarehouseId: number;
  transitWarehouseName: string;
  storeBox: boolean;
  storePallet: boolean;
  storeSupersafe: boolean;
}
```

---

## Autobooking Routes

Base path: `/api/v1/autobooking`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/` | Get autobookings | Query: `page?` | `AutobookingsResponse` |
| POST | `/` | Create autobooking | `AutobookingCreateData` | `CreateAutobookingResponse` |
| PUT | `/` | Update autobooking | `{ id, ...AutobookingUpdateData }` | `UpdateAutobookingResponse` |
| DELETE | `/` | Delete autobooking | `{ id }` | `DeleteAutobookingResponse` |

### Types

```typescript
interface Autobooking {
  id: string;
  userId: number;
  supplierId: string;
  draftId: string;
  warehouseId: number;
  transitWarehouseId?: number | null;
  transitWarehouseName?: string | null;
  supplyType: 'BOX' | 'MONOPALLETE' | 'SUPERSAFE';
  dateType: 'WEEK' | 'MONTH' | 'CUSTOM_PERIOD' | 'CUSTOM_DATES' | 'CUSTOM_DATES_SINGLE';
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  customDates?: Date[] | string[];
  maxCoefficient: number;
  monopalletCount?: number | null;
  status: 'ACTIVE' | 'ARCHIVED' | 'COMPLETED' | 'ERROR';
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface AutobookingCreateData {
  accountId: string;
  draftId: string;
  warehouseId: number;
  transitWarehouseId?: number | null;
  transitWarehouseName?: string | null;
  supplyType: 'BOX' | 'MONOPALLETE' | 'SUPERSAFE';
  dateType: 'WEEK' | 'MONTH' | 'CUSTOM_PERIOD' | 'CUSTOM_DATES' | 'CUSTOM_DATES_SINGLE';
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  customDates?: Date[] | string[];
  maxCoefficient: number;
  monopalletCount?: number | null;
}

interface AutobookingUpdateData {
  draftId?: string;
  warehouseId?: number;
  transitWarehouseId?: number | null;
  transitWarehouseName?: string | null;
  supplyType?: 'BOX' | 'MONOPALLETE' | 'SUPERSAFE';
  dateType?: 'WEEK' | 'MONTH' | 'CUSTOM_PERIOD' | 'CUSTOM_DATES' | 'CUSTOM_DATES_SINGLE';
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  customDates?: Date[] | string[];
  maxCoefficient?: number;
  monopalletCount?: number | null;
  status?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
}
```

---

## Reschedule Routes

Base path: `/api/v1/reschedule`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/` | Get reschedules | Query: `page?` | `ReschedulesResponse` |
| POST | `/` | Create reschedule | `CreateAutobookingRescheduleRequest` | `AutobookingReschedule` |
| PUT | `/` | Update reschedule | `{ id, ...UpdateAutobookingRescheduleRequest }` | `AutobookingReschedule` |
| DELETE | `/` | Delete reschedule | `{ id }` | `DeleteRescheduleResponse` |

### Types

```typescript
interface AutobookingReschedule {
  id: string;
  userId: number;
  supplierId: string;
  warehouseId: number;
  dateType: 'WEEK' | 'MONTH' | 'CUSTOM_PERIOD' | 'CUSTOM_DATES_SINGLE';
  startDate: Date | string | null;
  endDate: Date | string | null;
  currentDate: Date | string;
  customDates: Date[] | string[];
  completedDates: Date[] | string[];
  maxCoefficient: number;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  supplyType: 'BOX' | 'MONOPALLETE' | 'SUPERSAFE';
  supplyId: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface CreateAutobookingRescheduleRequest {
  warehouseId: number;
  dateType: 'WEEK' | 'MONTH' | 'CUSTOM_PERIOD' | 'CUSTOM_DATES_SINGLE';
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  currentDate: Date | string;
  customDates?: Date[] | string[];
  maxCoefficient: number;
  supplyType: 'BOX' | 'MONOPALLETE' | 'SUPERSAFE';
  supplyId: string;
}

interface UpdateAutobookingRescheduleRequest {
  id: string;
  warehouseId?: number;
  dateType?: 'WEEK' | 'MONTH' | 'CUSTOM_PERIOD' | 'CUSTOM_DATES_SINGLE';
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  customDates?: Date[] | string[];
  maxCoefficient?: number;
  supplyType?: 'BOX' | 'MONOPALLETE' | 'SUPERSAFE';
  supplyId?: string;
  status?: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
}
```

---

## Trigger Routes

Base path: `/api/v1/triggers`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/` | Get all triggers | - | `SupplyTrigger[]` |
| POST | `/` | Create trigger | `CreateTriggerRequest` | `SupplyTrigger` |
| PUT | `/` | Update trigger | `UpdateTriggerRequest` | `SupplyTrigger` |
| PATCH | `/` | Toggle trigger | `{ triggerId }` | `SupplyTrigger` |
| DELETE | `/` | Delete trigger | `{ triggerId }` | `{ success: boolean }` |

### Types

```typescript
type SearchMode = 'TODAY' | 'TOMORROW' | 'WEEK' | 'UNTIL_FOUND' | 'CUSTOM_DATES';

interface SupplyTrigger {
  id: string;
  userId: number;
  warehouseIds: number[];
  supplyTypes: ('BOX' | 'MONOPALLETE' | 'SUPERSAFE')[];
  isActive: boolean;
  checkInterval: number;
  maxCoefficient: number;
  createdAt: Date | string;
  updatedAt: Date | string;
  status: 'RELEVANT' | 'COMPLETED' | 'EXPIRED';
  lastNotificationAt: Date | string | null;
  searchMode: SearchMode;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  selectedDates: Date[] | string[];
}

interface CreateTriggerRequest {
  warehouseIds: number[];
  supplyTypes: ('BOX' | 'MONOPALLETE' | 'SUPERSAFE')[];
  checkInterval?: number;
  maxCoefficient: number;
  searchMode?: SearchMode;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  selectedDates?: Date[] | string[];
}

interface UpdateTriggerRequest {
  triggerId: string;
  warehouseIds?: number[];
  supplyTypes?: ('BOX' | 'MONOPALLETE' | 'SUPERSAFE')[];
  isActive?: boolean;
}
```

---

## Payment Routes

Base path: `/api/v1/payments`

| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| POST | `/create` | Create payment | `{ tariffId, email }` | `Payment` |
| GET | `/check` | Check payment status | Query: `key` | HTML Page |
| GET | `/history` | Get payment history | - | `Payment[]` |

### Types

```typescript
interface Payment {
  id: string;
  paymentId?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'canceled' | 'waiting_for_capture';
  tariffId: string;
  createdAt: string;
  paidAt?: string | null;
  confirmation?: {
    confirmation_url?: string;
  };
}

interface PaymentTariff {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'subscription' | 'bookings';
  days?: number;
  bookingCount?: number;
}
```

---

## Coefficient Routes

Base path: `/api/v1/coefficients`

| Method | Endpoint | Description | Query Params | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/` | Get coefficients | `warehouseIDs?` | `CoefficientsResponse` |

### Types

```typescript
interface Coefficient {
  warehouseId: number;
  warehouseName: string;
  boxTypeId: number;
  boxTypeName: string;
  coefficient: number;
  date: string;
}
```

---

## Notes

### Missing Backend Routes

The following routes are referenced in the frontend but not implemented in the backend:

1. **Reports Routes** (`/api/v1/reports`, `/api/v1/reports/sales`) - The controller exists but no routes are defined.

### Authentication

All routes except `/api/v1/auth/*` and `/api/v1/webhooks/*` require authentication via the `Authorization: Bearer <token>` header.

### Date Handling

Dates can be either `Date` objects or ISO strings (`string`) in the frontend types. The backend stores and returns dates as ISO strings.
