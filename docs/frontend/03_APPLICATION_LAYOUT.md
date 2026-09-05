# Application Layout

## Page Structure
```
AppShell
├── TopNav (DID display, org, notifications bell, logout)
├── SideNav (page links — conditional on role)
└── PageContent
    ├── Login / Register
    ├── Identity Wallet
    ├── Asset Hub
    ├── Access Requests
    ├── Admin Panel (admin only)
    ├── Audit Dashboard (auditor/admin only)
    └── Protected Viewers (modal/fullscreen overlay)
```

## Protected Viewer Layout
Protected viewers (document, exam, video) open as full-screen overlays.
Background application is not accessible during protected viewing.
