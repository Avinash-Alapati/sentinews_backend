# SentiNews Backend API Integration & Specification

This document provides a comprehensive technical guide and specification for the API integration between the **SentiNews Frontend** (`sentinews-frontend`) and the **SentiNews Backend Service** (`sentinews_backend`).

---

## 1. Architecture Overview

SentiNews employs a **Backend-for-Frontend (BFF)** proxy pattern built on Next.js App Router API routes:

```
┌───────────────────────────┐         HTTP / JSON          ┌───────────────────────────┐
│     SentiNews Frontend    │   (Cookies & Proxy forwarding)│    SentiNews Backend      │
│  (Next.js Client / SSR)   │ ───────────────────────────► │  (Next.js API Service)    │
│   http://localhost:3000   │                              │   http://localhost:3002   │
└─────────────┬─────────────┘                              └─────────────┬─────────────┘
              │                                                          │
              │ BFF Proxy (/api/*)                                       ├─► Prisma ORM (PostgreSQL)
              │                                                          ├─► Finnhub Market API
              └──────────────────────────────────────────────────────────┴─► RSS News Ingestion
```

### Key Integration Principles

1. **BFF Proxying:** The frontend app calls local Next.js API routes (`/api/...`), which proxy requests to the standalone backend (`NEXT_PUBLIC_API_URL`, defaulting to `http://localhost:3002`).
2. **Session & Authentication State:** Authentication state is encapsulated in an HTTP-only cookie (`sentinews_session`). The BFF forwards this cookie to the backend in the `Cookie` header for authenticated endpoints.
3. **Decoupled Data Fetching:** Market quote updates, sentiment calculations, and RSS news aggregation execute server-side in the backend service.
4. **Rate Limiting & Security:** Login attempts are rate-limited per IP address and email using server-side tracking.

---

## 2. API Endpoints Summary Table

| Endpoint | Method | Auth Required | Description |
| :--- | :---: | :---: | :--- |
| `/api/auth/login` | `POST` | No | Validates credentials, checks rate limits, returns user profile. |
| `/api/auth/register` | `POST` | No | Registers new user account with mobile number support. |
| `/api/auth/request-password-reset` | `POST` | No | Generates & dispatches password reset token via email. |
| `/api/auth/reset-password` | `POST` | No | Resets account password given a valid reset token. |
| `/api/auth/verify-email` | `GET` | No | Verifies email address using verification token. |
| `/api/v1/news` | `GET` | No | Returns paginated news with search, company, sector, and trending filters. |
| `/api/v1/news/[id]` | `GET` | No | Fetches single article details along with related articles. |
| `/api/v1/companies/[ticker]` | `GET` | No | Returns real-time market quote, company metadata, 7-day sentiment trend & chart data, and ticker news. |
| `/api/v1/user/preferences` | `GET` | Yes | Retrieves user's notification preferences from database. |
| `/api/v1/user/preferences` | `PUT` | Yes | Upserts user's notification preferences into database. |
| `/api/health` | `GET` | No | Returns backend service health and timestamp. |

---

## 3. Authentication & User Management APIs

### 3.1 Login (`POST /api/auth/login`)

Authenticates user credentials and checks rate limits.

- **Request Headers:** `Content-Type: application/json`
- **Request Payload:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Login successful.",
  "user": {
    "id": "cm123abc456",
    "name": "Alex Mercer",
    "email": "user@example.com",
    "role": "FREE",
    "accountType": "Registered"
  }
}
```
- **Error Responses:**
  - `422 Unprocessable Entity`: Validation failure.
  - `401 Unauthorized`: Invalid email or password.
  - `403 Forbidden`: Email address unverified.
  - `429 Too Many Requests`: Rate limit exceeded (5 attempts per window).

---

### 3.2 Registration (`POST /api/auth/register`)

Registers a new user account.

- **Request Payload:**
```json
{
  "name": "Alex Mercer",
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "mobileNumber": "+1234567890"
}
```
- **Response (201 Created):**
```json
{
  "user": {
    "id": "cm123abc456",
    "name": "Alex Mercer",
    "email": "user@example.com",
    "role": "FREE"
  },
  "message": "Registration successful. Mobile number saved."
}
```

---

## 4. News Intelligence APIs

### 4.1 Get News Feed (`GET /api/v1/news`)

Retrieves news articles from RSS feeds and indexed sources.

- **Query Parameters:**
  - `page` (optional, default `1`): Page number.
  - `limit` (optional, default `20`): Page size.
  - `q` (optional): Free-text search term.
  - `company` (optional): Filter articles mentioning specific company.
  - `sector` (optional): Filter articles by sector (e.g. `Technology`, `Automotive`).
  - `trending` (optional, `true` | `false`): Filter for high-impact/trending news.

- **Response (200 OK):**
```json
{
  "success": true,
  "count": 2,
  "data": [
    {
      "id": "art_987",
      "title": "NVIDIA Unveils Next-Gen AI Chip Architecture",
      "description": "NVIDIA announced its newest GPU architecture designed for hyperscale AI compute.",
      "url": "https://example.com/news/nvda-ai-chip",
      "source": "TechCrunch",
      "publishedAt": "2026-08-04T12:00:00.000Z",
      "category": "Technology",
      "sentimentScore": 88
    }
  ]
}
```

---

### 4.2 Get Article Details (`GET /api/v1/news/[id]`)

Fetches detailed article content and related news from the same publisher.

- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "article": {
      "id": "art_987",
      "title": "NVIDIA Unveils Next-Gen AI Chip Architecture",
      "description": "NVIDIA announced its newest GPU architecture...",
      "content": "Full text of the article...",
      "source": "TechCrunch",
      "publishedAt": "2026-08-04T12:00:00.000Z"
    },
    "relatedArticles": [
      {
        "id": "art_985",
        "title": "Tech Earnings Preview: Semiconductors in Focus",
        "source": "TechCrunch"
      }
    ]
  }
}
```

---

## 5. Company & Market Intelligence APIs

### 5.1 Get Company Profile & Market Data (`GET /api/v1/companies/[ticker]`)

Aggregates real-time financial market quotes with news sentiment trend analysis.

- **URL Path Parameter:** `ticker` (e.g. `AAPL`, `NVDA`, `TSLA`, `MSFT`, `GOOGL`)

- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "company": {
      "ticker": "NVDA",
      "name": "NVIDIA Corporation",
      "sector": "Technology",
      "description": "NVIDIA Corporation provides graphics, computing, and networking solutions worldwide.",
      "sentimentScore": 78,
      "sentimentTrend": [65, 70, 72, 68, 75, 80, 78],
      "stockPrice": 128.50,
      "stockChange": 2.45
    },
    "relatedArticles": [
      {
        "id": "art_987",
        "title": "NVIDIA Unveils Next-Gen AI Chip Architecture",
        "source": "TechCrunch"
      }
    ],
    "chartData": [
      { "date": "Jul 29", "sentiment": 65 },
      { "date": "Jul 30", "sentiment": 70 },
      { "date": "Jul 31", "sentiment": 72 },
      { "date": "Aug 1", "sentiment": 68 },
      { "date": "Aug 2", "sentiment": 75 },
      { "date": "Aug 3", "sentiment": 80 },
      { "date": "Aug 4", "sentiment": 78 }
    ]
  }
}
```

---

## 6. User Preferences & Watchlist APIs

### 6.1 Get User Preferences (`GET /api/v1/user/preferences`)

- **Authentication:** Forwarded `sentinews_session` cookie containing session user details.
- **Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "emailAlerts": true,
    "inAppAlerts": true,
    "weeklyDigest": false
  }
}
```

---

### 6.2 Update User Preferences (`PUT /api/v1/user/preferences`)

- **Authentication:** Forwarded `sentinews_session` cookie.
- **Request Payload:**
```json
{
  "notificationPreferences": {
    "email": true,
    "push": false,
    "alerts": true
  }
}
```
- **Response (200 OK):**
```json
{
  "success": true,
  "message": "Preferences saved.",
  "data": {
    "notificationPreferences": {
      "email": true,
      "push": false,
      "alerts": true
    }
  }
}
```

---

## 7. System Health API

### 7.1 Health Check (`GET /api/health`)

- **Response (200 OK):**
```json
{
  "success": true,
  "service": "SentiNews Backend",
  "status": "healthy",
  "timestamp": "2026-08-04T14:57:00.000Z"
}
```

---

## 8. Integration Sequence Diagrams

### 8.1 Authentication & Session Forwarding Sequence

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend as SentiNews Frontend (BFF)
    participant Backend as SentiNews Backend Service
    participant DB as PostgreSQL Database

    User->>Frontend: Submit Login (Email/Password)
    Frontend->>Backend: POST /api/auth/login
    Backend->>Backend: Check Rate Limits (IP & Email)
    Backend->>DB: Query User & Verify Password Hash
    DB-->>Backend: Return User Object
    Backend-->>Frontend: Return User Profile & Role
    Frontend->>Frontend: Set HTTP-Only Cookie (`sentinews_session`)
    Frontend-->>User: Auth Success & Redirect to Dashboard
```

### 8.2 Company Data & Market Quote Retrieval Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Frontend as SentiNews Frontend
    participant Backend as Backend API (/api/v1/companies/[ticker])
    participant MarketFactory as Market Provider Factory
    participant NewsRepo as News Repository

    User->>Frontend: Visit /companies/NVDA
    Frontend->>Backend: GET /api/v1/companies/NVDA
    par Market Quote Fetch
        Backend->>MarketFactory: getRealTimeQuote("NVDA")
        MarketFactory-->>Backend: Return currentPrice & changePercent
    and Related News Fetch
        Backend->>NewsRepo: getLatestNews()
        NewsRepo-->>Backend: Return matching ticker articles
    end
    Backend->>Backend: Generate 7-day Sentiment Trend & Chart Data
    Backend-->>Frontend: Return Combined JSON Data
    Frontend-->>User: Render Stock Chart & Sentiment Summary
```

---

## 9. Environment Configuration

### Frontend Environment Variables (`.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

### Backend Environment Variables (`.env`)
```env
PORT=3002
DATABASE_URL=postgresql://user:password@localhost:5432/sentinews?sslmode=disable
FINNHUB_API_KEY=your_finnhub_api_key_here
NODE_ENV=development
```

---

## 10. Summary & Next Steps

1. **Active Integration Branch:** `feature/api-integration`
2. **Current Status:** Frontend BFF proxy routes and Backend API endpoints (`/api/auth/login`, `/api/v1/companies/[ticker]`, `/api/v1/news/[id]`, `/api/v1/user/preferences`) are fully integrated and committed.
3. **Future Enhancements:**
   - Integrate Gemini AI provider for real-time sentiment scoring on fetched news.
   - Expand database schema for user watchlist/favorite stocks persistence in `Preference` model.
