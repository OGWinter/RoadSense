# RoadSense — Municipal Road Damage Monitoring (Frontend)

RoadSense is an AI-assisted municipal technology platform that detects potholes, transverse cracks, and alligator cracking from dashcam footage and road video surveys, visualizing geolocated road defects on an interactive GIS map and guiding triage work orders for municipal public works crews.

## 1. Tech Stack
- **Framework & Bundler:** React 18, Vite, TypeScript
- **Routing:** React Router v6 (`createBrowserRouter`, `RouterProvider`) with lazy code-splitting
- **State Architecture:**
  - **Server State:** TanStack React Query v5 (caching, invalidation, polling lifecycle)
  - **Client UI & Session:** Redux Toolkit + React Redux
- **Styling & UI System:** Tailwind CSS with shadcn/ui accessible component patterns
- **Mapping:** Leaflet & React Leaflet (OpenStreetMap tiles, severity-encoded DivIcons, FitBounds control, Map-Table split view)
- **Camera & Hardware APIs:** `navigator.mediaDevices.getUserMedia()`, `MediaRecorder`, and `navigator.geolocation.watchPosition()`
- **Analytics & Visualizations:** Recharts (damage distribution, status donuts, velocity trends, PCI rating)
- **Forms & Validation:** React Hook Form + Zod
- **Icons & Notifications:** Lucide React & Sonner

---

## 2. Directory Structure

```text
client/
├── src/
│   ├── app/
│   │   ├── router.tsx          # Route definitions, guards, and lazy Suspense
│   │   ├── store.ts           # Redux Toolkit store (auth, UI)
│   │   ├── queryClient.ts     # TanStack Query client & cache policies
│   │   └── providers.tsx      # Redux, React Query, Tooltip, Sonner Providers
│   ├── layouts/
│   │   ├── AuthLayout.tsx     # Civic-themed login and registration layout
│   │   └── DashboardLayout.tsx# Collapsible sidebar, header, role badge, responsive sheet
│   ├── features/
│   │   ├── auth/              # Login, Registration, authSlice, authApi, Zod schemas
│   │   ├── dashboard/         # KPIs, damage charts, recent defect alerts
│   │   ├── issues/            # Paginated table, URL filters, workflow stepper, video timestamps
│   │   ├── map/               # Fullscreen Leaflet map, severity markers, unmapped list fallback
│   │   ├── uploads/           # Dual-mode (File + Live Camera), GPS track capture, polling lifecycle
│   │   ├── reports/           # PCI index, condition breakdown, repair SLA trends
│   │   └── users/             # Admin-only user directory with officer approval controls
│   ├── hooks/
│   │   ├── useCameraRecorder.ts # Camera MediaRecorder, facingMode, GPS watchPosition hook
│   │   └── useRedux.ts        # Typed Redux dispatch and selector hooks
│   ├── components/
│   │   ├── ui/                # Button, Input, Table, Dialog, Select, Dropdown, Skeleton, Alert, Progress, Tooltip, Sheet
│   │   └── common/            # RequireAuth, RequireRole, PageHeader, EmptyState, DemoNoticeBadge, RouteErrorBoundary
│   ├── services/
│   │   ├── apiClient.ts       # Axios instance with 401 handling, bearer tokens, error normalization
│   │   ├── endpoints.ts       # Centralized REST endpoints
│   │   └── mockData.ts        # Realistic offline seed dataset for demo resilience
│   ├── types/                 # Domain types (User, Issue, Upload, Dashboard, Reports)
│   ├── utils/                 # cn, formatters, custom map markers
│   ├── main.tsx
│   └── index.css              # Civic theme tokens, custom Leaflet styling
├── .env.example
├── package.json
└── README.md
```

---

## 3. Environment Configuration

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

Default configuration:
```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

---

## 4. Installation & Running Locally

Install dependencies:
```bash
npm install
```

Start Vite development server:
```bash
npm run dev
```

Build production bundle and typecheck:
```bash
npm run build
```

---

## 5. Phase 3: Live Camera Recording & GPS Telemetry

The upload interface (`/app/uploads/new`) provides two modes:

1. **Upload Existing Video**:
   - Supports MP4, MOV, WebM, AVI up to 500MB with optional pre-recorded GPS CSV/GPX telemetry.
2. **Record Live Camera**:
   - **On-Demand Permission**: Camera access is requested only when the user explicitly clicks "Activate Camera Preview". Never opens on page load.
   - **Front/Rear Toggle**: Allows switching between Front and Rear (`facingMode: 'environment'`) cameras for dashcam road capture.
   - **Dynamic Format Selection**: Uses `MediaRecorder.isTypeSupported()` to record in WebM (VP9/VP8) or MP4 depending on browser capability.
   - **GPS Synchronized Sampling**: When GPS is toggled, `navigator.geolocation.watchPosition()` logs continuous GPS fixes (`timestamp`, `latitude`, `longitude`, `accuracy`) while recording.
   - **Automatic CSV Generation**: On stop, generates a synchronized `gps_track_<date>.csv` file automatically appended to the multipart upload.
   - **Review & Discard**: Review recorded clip in the embedded player, discard and re-record, or click **Upload & Analyze**.
   - **Resource Cleanup**: All media tracks are released with `track.stop()`, geolocation watchers cleared, and object URLs revoked on stop or page unmount.

> **HTTPS Requirement:** Web browser security policies require HTTPS for camera and geolocation access in deployed production environments; `http://localhost` is allowed for development.

---

## 6. Phase 3: Issue Map & GIS Enhancements

- **Strict Coordinate Validation**: Only issues with valid numeric coordinates (`lat: -90..90`, `lng: -180..180`) are placed on the map.
- **Unmapped Fallback**: Issues lacking GPS telemetry are separated and shown in a dedicated list without being placed at fake map locations.
- **View Modes**: Toggle between **Map View**, **Map + List Split View**, and **Table Fallback View**.
- **Fit to Markers**: Auto-centers all markers in view with one click.

---

## 7. Phase 3: Triage Workflow & Officer Approvals

- **Status Stepper**: `Detected → Verified → Repair Pending → Repaired` (plus `Rejected`).
- **Video Timestamp Evidence**: Displays frame timestamp (e.g. `00:14 (Frame #420)`) and links directly to the source upload pipeline.
- **Role Permissions & Officer Approval**:
  - **Volunteer**: Read-only inspection; can upload surveys and view issues.
  - **Pending Officer**: Newly registered municipal officers require Admin approval before status triage controls are unlocked.
  - **Approved Municipal Officer & Admin**: Full status mutation rights with confirmation modals.
  - **Admin User Directory (`/app/users`)**: Admins can approve or reject pending municipal officers with live queries.
