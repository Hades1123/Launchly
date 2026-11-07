# API Contract: Public Job Detail

- **Endpoint**: `GET /api/jobs/:id`
- **Auth**: None (Public)

## Request
- **Path Params**:
  - `id`: UUID (String)

## Responses
- **200 OK**:
```json
{
  "id": "uuid",
  "title": "Frontend Engineer",
  "company": {
    "id": "uuid",
    "name": "Acme Corp",
    "logoUrl": "https://..."
  },
  "stages": [
    {
      "id": "uuid",
      "name": "Technical Interview",
      "format": "Google Meet",
      "estimatedDuration": "60 mins",
      "position": 1
    }
  ],
  "notes": [
    {
      "id": "uuid",
      "content": "Please bring a valid photo ID.",
      "position": 1
    }
  ]
}