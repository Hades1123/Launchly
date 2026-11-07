# API Contract: Public Job Search and Discovery

## Endpoint Overview

- **Path**: `GET /jobs` and `GET /api/jobs`
- **Authentication**: None (Public access for guests and signed-in candidates)
- **Content-Type**: `application/json`

---

## Request Query Parameters

Validated against `jobFilterQuerySchema` from `@launchly/shared`:

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `keyword` | string | No | `undefined` | Keyword matching job title or company name (accent-tolerant). |
| `industry` | string | No | `undefined` | Industry category (case-insensitive). |
| `level` | string | No | `undefined` | Must be one of `INTERN`, `FRESHER`, `SENIOR`. |
| `location` | string | No | `undefined` | Location substring (e.g. "Ho Chi Minh City", "Remote"). |
| `page` | integer | No | `1` | 1-based page index (must be positive). |
| `limit` | integer | No | `10` | Records per page (maximum 50). |

---

## Success Response (`200 OK`)

Response matches `publicJobListResponseSchema` from `@launchly/shared`:

```json
{
  "data": [
    {
      "id": "00000000-0000-4000-8000-000000000401",
      "title": "Senior Frontend Engineer",
      "level": "SENIOR",
      "location": "Remote",
      "industry": "Technology",
      "requirements": ["React", "TypeScript"],
      "benefits": ["Remote-first", "Flexible hours"],
      "salaryMin": 2000,
      "salaryMax": 4000,
      "createdAt": "2026-11-01T10:00:00.000Z",
      "company": {
        "id": "00000000-0000-4000-8000-000000000301",
        "name": "Nimbus Labs",
        "website": "https://nimbus.launchly.test"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

## Validation Error Response (`400 Bad Request`)

When an invalid query parameter is provided (e.g. `level=INVALID`):

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request",
    "details": [
      {
        "field": "query.level",
        "message": "Invalid enum value. Expected 'INTERN' | 'FRESHER' | 'SENIOR', received 'INVALID'"
      }
    ]
  }
}
```
