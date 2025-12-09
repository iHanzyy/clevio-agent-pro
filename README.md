# Status & Feature Gating

This project now ships with a complete trio of status pages (404, Coming Soon, Under Development) plus helper utilities so any feature button can redirect to the correct state-specific screen.

## Routes & Components

| Route | Component | Purpose |
| --- | --- | --- |
| `/not-found` | `@/components/NotFound404` | Decorative glitch 404 page that powers the global App Router `not-found.js`. |
| `/coming-soon` | `@/components/ComingSoon` | Countdown-driven placeholder when a feature has not shipped yet. |
| `/under-development` | `@/components/UnderDevelopment` | Communicates that a feature exists but is being maintained. |

Each component includes parallax gradient orbs, 50 animated particles, Lucide icons, and responsive layouts.

## Navigation Helper (`@/lib/navigation`)

Import `navigateTo` anywhere in the client to map simple `onClick` handlers without repeating route logic:

```jsx
import { navigateTo } from '@/lib/navigation';

<button onClick={navigateTo.comingSoon}>Coming Soon Feature</button>
<button onClick={navigateTo.underDevelopment}>Fix In Progress</button>
```

When you already have a Next.js router instance:

```jsx
import { useRouter } from 'next/navigation';
import { navigateTo } from '@/lib/navigation';

const router = useRouter();
<button onClick={() => navigateTo.comingSoonWithRouter(router)} />
```

## Feature Registry (`@/config/features`)

`FEATURES` centralizes the status for every dashboard card. Update the `status` field (`active`, `coming-soon`, `under-development`) and, when active, provide a `path`:

```js
FEATURES.ANALYTICS.status = 'active';
FEATURES.ANALYTICS.path = '/dashboard/analytics';
```

Helpers:

- `getFeatureStatus('AI_CHAT')`
- `isFeatureActive('SETTINGS')`
- `getActiveFeatures()`
- `getComingSoonFeatures()`

## Dashboard Example (`@/components/DashboardNav.jsx`)

`DashboardNav` demonstrates how to wire everything together. It imports `FEATURES`, `navigateTo`, and `useRouter`, then renders eight status-aware cards with hover glows:

- Active → direct router push via `feature.path`
- Coming soon → `navigateTo.comingSoon()`
- Under development → `navigateTo.underDevelopment()`

Drop `<DashboardNav />` anywhere inside a client component (e.g., the dashboard landing page) to reuse the predefined UX.
