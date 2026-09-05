# Frontend Architecture

## Framework
React 18 with functional components and hooks only (no class components)

## UI Library
Material-UI (MUI) v5

## State Management
- Local state: `useState`, `useReducer`
- Server state: React Query (TanStack Query)
- Global auth state: React Context

## Routing
React Router v6

## Build
Vite (fast dev server + production build)

## Key Libraries
| Library | Purpose |
|:---|:---|
| @mui/material | UI components |
| recharts | Charts for Audit Dashboard |
| react-query | API data fetching/caching |
| axios | HTTP client |
| jose | JWT parsing (client-side, for display only) |
| itext (PDF) | — (server-side only; not in frontend) |

## Protected Renderer
Implemented as a standalone React component: `<ProtectedRenderer />`
Uses Canvas API internally. No third-party rendering libraries.

## Code Organization
```
src/
├── components/   — Reusable UI components
├── pages/        — Page-level components (Login, Wallet, AssetHub, etc.)
├── hooks/        — Custom React hooks
├── services/     — API service modules
├── context/      — React context providers
├── renderer/     — ProtectedRenderer engine
└── utils/        — Utilities
```
