# AKPOS Expo App Structure

## Goal

Create a separate mobile app workspace while keeping the current Next.js app as the behavior reference.

Recommended new folder:

`/Users/ethanhtoon/Documents/theo/projects/vopos/mobile`

## Proposed Structure

```text
mobile/
  app/
    (auth)/
      login.tsx
    (main)/
      sale.tsx
      orders.tsx
      products.tsx
      customers.tsx
      suppliers.tsx
      reports.tsx
      coupons.tsx
      settings.tsx
      day-session.tsx
    _layout.tsx
  src/
    components/
      sale/
      cart/
      forms/
      common/
    features/
      auth/
      day-session/
      products/
      cart/
      sales/
      customers/
      suppliers/
      reports/
      coupons/
      settings/
      sync/
    db/
      client.ts
      migrations/
      repositories/
        products-repository.ts
        customers-repository.ts
        sales-repository.ts
        vouchers-repository.ts
        sync-queue-repository.ts
    services/
      api/
        client.ts
        auth-api.ts
        sync-api.ts
      sync/
        sync-engine.ts
        push-sync.ts
        pull-sync.ts
        conflict-policy.ts
    store/
      session-store.ts
      ui-store.ts
    hooks/
      use-online-status.ts
      use-sync.ts
    types/
      domain.ts
      db.ts
      api.ts
    utils/
      currency.ts
      ids.ts
      dates.ts
  assets/
    icon.png
    splash.png
  app.json
  eas.json
  package.json
  tsconfig.json
```

## Navigation Recommendation

Use Expo Router or React Navigation tabs + stacks.

Recommended primary flow:

- `Sale`
- `Orders`
- `Products`
- `More`

Inside `More`:

- `Customers`
- `Suppliers`
- `Coupons`
- `Reports`
- `Day Session`
- `Settings`

Staff-only flow can stay restricted just like the current web app.

## State Recommendation

Avoid keeping all business data in one big in-memory reducer for mobile.

Use:

- SQLite repositories for persisted data
- lightweight UI store for temporary screen state
- query hooks for reading data

## First Port Order

### 1. Auth

- login
- user session restore
- device registration

### 2. Sale flow

- product grid
- search/category
- cart review
- customer select
- coupon apply
- complete sale
- receipt popup

### 3. Orders

- sales history
- sale detail
- coupon creation from order profit

### 4. Customers and suppliers

- customer list
- credit summary
- payment records
- supplier vouchers

## Mobile UX Notes

- keep product grid dense for tablets
- optimize cart review for touch
- keep primary actions color-led, not hover-led
- support large tap targets
- make bottom nav stable

## Offline Boot Flow

On app start:

1. open SQLite
2. run migrations
3. restore auth token
4. load local settings and current session
5. load cached products/customers
6. start background sync if online

## Sync Service Responsibilities

- watch network state
- push pending queue
- pull remote updates
- mark sync status
- expose sync banner/indicator to UI

## Local Repositories Needed First

- `productsRepository`
- `customersRepository`
- `salesRepository`
- `salePaymentsRepository`
- `daySessionRepository`
- `settingsRepository`
- `syncQueueRepository`

## Android Release Setup

### Internal testing

- build APK with EAS for direct install

### Production

- build AAB with EAS
- upload to Google Play internal track first

## Environment Variables

Mobile app should support:

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_SHOP_ID`
- `EXPO_PUBLIC_ENV_NAME`

## First Real Coding Milestone

The first mobile code milestone should include:

- Expo app scaffold
- SQLite bootstrap and migrations
- login screen
- product list and cart
- complete sale locally
- local order history
- sync queue creation

That gives a real offline POS shell before full sync and reports are finished.
