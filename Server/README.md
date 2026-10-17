# 🛣️ RoadSense — Backend API Server

Production-grade, clean-architecture backend for **RoadSense**, a pothole and road-damage monitoring platform.

Built with **Node.js, Express, TypeScript, MongoDB Atlas (Mongoose), JWT, Zod, Multer, Helmet, and Pino**.

---

## 🏗️ Mandatory Four-Layer Architecture

This backend adheres strictly to a unidirectional four-layer architecture (`Routes → Controllers → Services → Infrastructure`):

```
                   HTTP Request
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. Presentation / Routes                                   │
│    - Express route registration                             │
│    - JWT Authentication & Role Authorization Middleware     │
│    - Zod Request Validation                                 │
│    - Rate Limiting                                          │
└───────────────────────┬─────────────────────────────────────┘
                        │ Validated request DTOs
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Controllers                                              │
│    - HTTP status codes & Response DTO formatting            │
│    - Application error translation                          │
│    - Pure request orchestration (NO queries / NO rules)     │
└───────────────────────┬─────────────────────────────────────┘
                        │ Clean method parameters
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Services (Domain & Business Logic)                       │
│    - AuthService, UploadService, IssueService, AdminService │
│    - GPS parsing and video timestamp alignment              │
│    - Spatial deduplication (Haversine) & Priority scoring   │
│    - Asynchronous video processing orchestration            │
└───────────────────────┬─────────────────────────────────────┘
                        │ Domain entities
                        ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Infrastructure / Data Access                             │
│    - Mongoose Models with GeoJSON 2dsphere indexing         │
│    - Repositories (User, OfficerRequest, Upload, Issue)     │
│    - Storage Provider (Local filesystem / S3-ready)         │
│    - AI Detection Adapter (DemoHeuristic / YOLO ready)      │
│    - Video Processor (FFmpeg / Fallback simulation)         │
│    - Background Queue (In-memory async / BullMQ ready)      │
└─────────────────────────────────────────────────────────────┘
```

---

## 👥 Demo Accounts (Pre-Seeded)

The database automatically and idempotently seeds the following demo users upon startup:

| Role | Email | Password | Allowed Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@roadsense.demo` | `RoadSense123!` | Full access, user management (`/admin/users`), review officer applications (`/admin/officer-requests`), all status transitions |
| **Municipal Officer** | `officer@roadsense.demo` | `RoadSense123!` | View all issues, verify/reject issues, update repair status (cannot upload patrol videos) |
| **Volunteer** | `volunteer@roadsense.demo` | `RoadSense123!` | Public registration, upload patrol videos, view own uploads and public road issues |

---

## 🎥 Browser Camera Recording & Ingestion (Phase 3)

### Supported Formats & MediaRecorder Integration
The frontend can record video directly from the browser's `MediaRecorder` API and upload:
* **Formats**: `video/webm` (codecs: VP8/VP9/H264), `video/mp4`, `video/quicktime`.
* **Magic Bytes Validation**: File headers are inspected server-side (`0x1A 0x45 0xDF 0xA3` for WebM, `ftyp` for MP4) to reject disguised files even if MIME headers are spoofed.
* **Recording Timeline**: Accepts `recordingStartedAt` and `recordingEndedAt` (UTC ISO format).

### GPS Track Alignment & Non-Fabrication Guarantee
* Accepts CSV GPS file via `gpsFile` field: `timestamp,latitude,longitude,accuracy`.
* Strict latitude `[-90, 90]` and longitude `[-180, 180]` coordinate validation.
* **Non-Fabrication Policy**: When GPS track is absent or outside the matching tolerance window (3500ms), detections are created with `location: null`. Coordinates are **never** fabricated. Issues without GPS are safely omitted from map markers while remaining visible in lists and tables.

---

## 📡 Versioned API Contract (`http://localhost:5000/api/v1`)

### 1. Health & System
* **`GET /api/v1/health`**
  * Status: `200 OK`
  * Response: `{ success: true, service: "RoadSense Backend API", status: "healthy", database: { status: "connected" } }`

### 2. Authentication & Registration
* **`POST /api/v1/auth/login`**
  * Body: `{ "email": "volunteer@roadsense.demo", "password": "RoadSense123!" }`
  * Response: `{ success: true, data: { token: "...", user: { _id, name, email, role, isActive } } }`
* **`POST /api/v1/auth/register`**
  * Public volunteer self-registration. Server strictly assigns `role: "volunteer"`.
  * Body: `{ "name": "Jane Volunteer", "email": "jane@example.com", "password": "Password123!", "confirmPassword": "Password123!" }`
* **`POST /api/v1/auth/officer-register`**
  * Municipal officer application (pending admin approval).
  * Body: `{ "name": "Rajesh Kumar", "email": "rajesh@municipality.gov", "password": "Password123!", "confirmPassword": "Password123!", "municipality": "Central Works", "department": "Road Maintenance", "employeeId": "EMP-102" }`
* **`GET /api/v1/auth/me`**
  * Headers: `Authorization: Bearer <TOKEN>`
  * Response: `{ success: true, data: { _id, name, email, role } }`

### 3. Administrator Endpoints (Admin Only)
* **`GET /api/v1/admin/officer-requests`**
  * Query parameters: `status` (`pending`|`approved`|`rejected`), `page`, `limit`
* **`PATCH /api/v1/admin/officer-requests/:id`**
  * Body: `{ "status": "approved" | "rejected", "reason": "optional reason" }`
* **`POST /api/v1/admin/users`**
  * Provision user with explicit role (`admin` | `volunteer` | `municipal_officer`).
* **`GET /api/v1/admin/users`**
  * Paginated user list without secrets.

### 4. Road Issues
* **`GET /api/v1/issues`**
  * Query parameters: `severity` (`low`|`medium`|`high`|`critical`), `status` (`detected`|`verified`|`rejected`|`repair_pending`|`repaired`), `type` (`pothole`|`crack`), `sourceUploadId`, `page`, `limit`, `sortBy`, `sortOrder`.
  * Response:
    ```json
    {
      "success": true,
      "data": {
        "issues": [
          {
            "_id": "6ad3...",
            "title": "[Demo] CRITICAL POTHOLE #1",
            "type": "pothole",
            "severity": "critical",
            "confidence": 0.94,
            "priorityScore": 97,
            "location": { "lat": 28.6315, "lng": 77.2167 },
            "status": "repair_pending",
            "sourceUploadId": "...",
            "statusHistory": [
              {
                "previousStatus": "detected",
                "newStatus": "repair_pending",
                "actorId": "...",
                "actorRole": "municipal_officer",
                "reason": "Assigned to Ward 4 contractor",
                "timestamp": "2026-10-17T08:44:00.000Z"
              }
            ],
            "isDemo": true,
            "createdAt": "..."
          }
        ],
        "total": 1,
        "page": 1,
        "limit": 20
      }
    }
    ```
* **`GET /api/v1/issues/:id`**
* **`PATCH /api/v1/issues/:id/status`**
  * Restricted: `admin` or `municipal_officer` only (volunteers receive `403 Forbidden`).
  * Body: `{ "status": "verified" | "repair_pending" | "repaired" | "rejected", "reason": "optional audit note" }`
  * Appends tamper-proof entry to `statusHistory`.

### 5. Video Uploads & Ingestion
* **`POST /api/v1/uploads`**
  * Restricted: `volunteer` and `admin` only (`municipal_officer` blocked with `403 Forbidden`).
  * Multipart Form Data:
    * `video`: Binary file (`.webm`, `.mp4`, `.mov`, max 100MB)
    * `gpsFile`: Optional CSV (`timestamp,latitude,longitude,accuracy`)
    * `recordingStartedAt`: Optional ISO timestamp string
    * `recordingEndedAt`: Optional ISO timestamp string
  * Response (`202 Accepted`):
    ```json
    {
      "success": true,
      "message": "Video upload received and processing started",
      "data": {
        "_id": "6ad3...",
        "uploaderId": "...",
        "originalFilename": "patrol-recording.webm",
        "mimeType": "video/webm",
        "sizeBytes": 15480220,
        "status": "processing",
        "progress": 15,
        "recordingStartedAt": "2026-10-17T08:35:00.000Z",
        "recordingEndedAt": "2026-10-17T08:40:00.000Z",
        "gpsStatus": "available"
      }
    }
    ```
* **`GET /api/v1/uploads/:id`**
  * Returns upload progress, detection count, and GPS track status (`available`, `missing`, `unaligned`).

### 6. Dashboard & Analytics
* **`GET /api/v1/dashboard/stats`**
  * Response:
    ```json
    {
      "success": true,
      "data": {
        "totalIssues": 8,
        "criticalIssues": 2,
        "pendingRepairs": 3,
        "repairedIssues": 1,
        "byStatus": {
          "detected": 4,
          "verified": 1,
          "rejected": 0,
          "repair_pending": 2,
          "repaired": 1
        },
        "bySeverity": {
          "low": 1,
          "medium": 2,
          "high": 3,
          "critical": 2
        },
        "totalUploads": 5,
        "uploadsByStatus": {
          "uploaded": 0,
          "processing": 0,
          "completed": 5,
          "failed": 0
        }
      }
    }
    ```

---

## 🚀 How to Run

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
The `.env` file is pre-configured with MongoDB Atlas credentials:
```env
PORT=5000
MONGODB_URI=mongodb+srv://ugprakash006_db_user:TT7ldGbo3nOP9aJI@cluster0.tkwk5ax.mongodb.net/roadsense?retryWrites=true&w=majority
JWT_SECRET=roadsense_production_grade_jwt_secret_key_2026_secure_random
CLIENT_ORIGIN=http://localhost:5173
UPLOAD_DIR=uploads
MAX_FILE_SIZE_MB=100
NODE_ENV=development
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Run Automated Smoke Tests
```bash
npm run test:smoke
```
