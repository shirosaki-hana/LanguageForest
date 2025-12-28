# Backend API Documentation

Base URL: `/api`

## Authentication

Most endpoints require authentication via session cookie. The session cookie name is configurable via environment variables.

## API Endpoints

### Authentication Routes (`/api/auth`)

#### GET /api/auth/status

Check authentication status and initial setup state.

**Response:**

```json
{
  "isSetup": boolean,
  "isAuthenticated": boolean
}
```

#### POST /api/auth/setup

Initial password setup (only available when password is not set).

**Request Body:**

```json
{
  "password": string
}
```

**Password Requirements:**

- Minimum 8 characters, maximum 128 characters
- Must contain at least one letter (a-z or A-Z)
- Must contain at least one digit (0-9)

**Response:**

```json
{
  "success": true
}
```

#### POST /api/auth/login

Authenticate and receive session cookie.

**Request Body:**

```json
{
  "password": string
}
```

**Response:**

```json
{
  "success": true
}
```

Sets session cookie on success.

#### POST /api/auth/logout

Invalidate session and clear cookie.

**Response:**

```json
{
  "success": true
}
```

### Logs Management Routes (`/api/logs`)

All endpoints require authentication.

#### GET /api/logs

Get paginated log entries with optional filtering.

**Query Parameters:**

| Parameter    | Type                | Description                                   |
| ------------ | ------------------- | --------------------------------------------- |
| `level`      | string (optional)   | Filter by single level                        |
| `levels`     | string[] (optional) | Filter by multiple levels                     |
| `category`   | string (optional)   | Filter by single category                     |
| `categories` | string[] (optional) | Filter by multiple categories                 |
| `search`     | string (optional)   | Search in message text                        |
| `startDate`  | string (optional)   | Filter logs after this date (ISO 8601)        |
| `endDate`    | string (optional)   | Filter logs before this date (ISO 8601)       |
| `page`       | number (optional)   | Page number (default: 1)                      |
| `limit`      | number (optional)   | Items per page (1-100, default: 50)           |
| `sortOrder`  | string (optional)   | Sort order: "asc" or "desc" (default: "desc") |

**Response:**

```json
{
  "success": true,
  "logs": [
    {
      "id": number,
      "level": "ERROR" | "WARN" | "INFO" | "DEBUG",
      "category": "api" | "auth" | "system" | "database" | "server",
      "message": string,
      "meta": string | null,
      "createdAt": string
    }
  ],
  "pagination": {
    "page": number,
    "limit": number,
    "total": number,
    "totalPages": number
  }
}
```

#### GET /api/logs/stats

Get log statistics overview.

**Response:**

```json
{
  "success": true,
  "stats": {
    "total": number,
    "byLevel": {
      "ERROR": number,
      "WARN": number,
      "INFO": number,
      "DEBUG": number
    },
    "byCategory": {
      "api": number,
      "auth": number,
      "system": number,
      "database": number,
      "server": number
    },
    "last24h": number,
    "last7d": number
  }
}
```

#### DELETE /api/logs

Delete log entries based on criteria.

**Request Body:**

```json
{
  "ids"?: number[],        // Delete specific log IDs
  "olderThan"?: string,    // Delete logs older than date (ISO 8601)
  "level"?: string         // Delete logs with specific level
}
```

**Response:**

```json
{
  "success": true,
  "deletedCount": number
}
```

#### GET /api/logs/settings

Get current log settings.

**Response:**

```json
{
  "success": true,
  "settings": {
    "retentionDays": number,
    "maxLogs": number
  }
}
```

#### PUT /api/logs/settings

Update log settings.

**Request Body:**

```json
{
  "retentionDays"?: number,  // 1-365 days (default: 7)
  "maxLogs"?: number         // 100-1000000 (default: 10000)
}
```

**Response:**

```json
{
  "success": true,
  "settings": {
    "retentionDays": number,
    "maxLogs": number
  }
}
```

#### POST /api/logs/cleanup

Manually trigger log cleanup based on current settings.

**Response:**

```json
{
  "success": true,
  "deletedCount": number
}
```

## Error Responses

All endpoints may return error responses in the following format:

```json
{
  "error": string,
  "statusCode"?: number
}
```

Common HTTP status codes:

- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (authentication required)
- `404` - Not Found (resource not found)
- `500` - Internal Server Error
