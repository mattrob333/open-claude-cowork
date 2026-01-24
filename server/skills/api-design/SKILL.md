---
name: API Design
description: Design RESTful APIs with OpenAPI specs and best practices
triggers:
  - "design api"
  - "api endpoint"
  - "rest api"
  - "create api"
  - "api design"
  - "endpoint design"
version: 1.0.0
author: open-claude-cowork
---

# API Design Skill

## Overview
This skill provides guidance for designing robust, scalable, and developer-friendly RESTful APIs following industry best practices.

## RESTful Principles

### Resource Naming
```
# Use nouns, not verbs
GET /users          # List users (not GET /getUsers)
GET /users/123      # Get single user
POST /users         # Create user
PUT /users/123      # Update user (full)
PATCH /users/123    # Update user (partial)
DELETE /users/123   # Delete user

# Use plural nouns
/users, /products, /orders

# Nest for relationships
GET /users/123/orders
GET /users/123/orders/456

# Use query params for filtering
GET /users?status=active&role=admin
GET /products?category=electronics&sort=-price
```

### HTTP Methods
| Method | Purpose | Idempotent | Safe |
|--------|---------|------------|------|
| GET | Retrieve resource(s) | Yes | Yes |
| POST | Create resource | No | No |
| PUT | Replace resource | Yes | No |
| PATCH | Update resource | Yes | No |
| DELETE | Remove resource | Yes | No |

### Status Codes
```
# Success
200 OK              # Successful GET, PUT, PATCH
201 Created         # Successful POST (include Location header)
204 No Content      # Successful DELETE

# Client Errors
400 Bad Request     # Malformed request, validation failed
401 Unauthorized    # Authentication required
403 Forbidden       # Authenticated but not authorized
404 Not Found       # Resource doesn't exist
409 Conflict        # State conflict (duplicate, etc.)
422 Unprocessable   # Semantic errors in valid JSON
429 Too Many        # Rate limit exceeded

# Server Errors
500 Internal Error  # Unexpected server error
502 Bad Gateway     # Upstream service error
503 Unavailable     # Service temporarily unavailable
```

## Request/Response Patterns

### Standard Response Envelope
```json
{
  "data": {
    "id": "123",
    "type": "user",
    "attributes": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0"
  }
}
```

### Collection Response with Pagination
```json
{
  "data": [
    { "id": "1", "name": "Item 1" },
    { "id": "2", "name": "Item 2" }
  ],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 100,
    "totalPages": 5
  },
  "links": {
    "self": "/items?page=1",
    "first": "/items?page=1",
    "prev": null,
    "next": "/items?page=2",
    "last": "/items?page=5"
  }
}
```

### Error Response
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format",
        "code": "INVALID_FORMAT"
      }
    ]
  },
  "meta": {
    "requestId": "req-abc123",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## OpenAPI Specification

### Basic Structure
```yaml
openapi: 3.0.3
info:
  title: My API
  description: API description
  version: 1.0.0
  contact:
    email: api@example.com

servers:
  - url: https://api.example.com/v1
    description: Production
  - url: https://staging-api.example.com/v1
    description: Staging

paths:
  /users:
    get:
      summary: List users
      operationId: listUsers
      tags:
        - Users
      parameters:
        - name: page
          in: query
          schema:
            type: integer
            default: 1
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
            maximum: 100
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserList'
        '401':
          $ref: '#/components/responses/Unauthorized'

    post:
      summary: Create user
      operationId: createUser
      tags:
        - Users
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUser'
      responses:
        '201':
          description: User created
          headers:
            Location:
              schema:
                type: string
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'

components:
  schemas:
    User:
      type: object
      required:
        - id
        - email
      properties:
        id:
          type: string
          format: uuid
        email:
          type: string
          format: email
        name:
          type: string
        createdAt:
          type: string
          format: date-time

    CreateUser:
      type: object
      required:
        - email
      properties:
        email:
          type: string
          format: email
        name:
          type: string

  responses:
    Unauthorized:
      description: Authentication required
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

security:
  - bearerAuth: []
```

## Best Practices

### 1. Versioning
```
# URL versioning (recommended)
/v1/users
/v2/users

# Header versioning
Accept: application/vnd.api+json; version=1

# Query parameter versioning
/users?version=1
```

### 2. Filtering & Sorting
```
# Filtering
GET /products?category=electronics&price_min=100&price_max=500

# Sorting (prefix with - for descending)
GET /products?sort=-price,name

# Field selection
GET /users?fields=id,name,email
```

### 3. Rate Limiting Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
Retry-After: 60
```

### 4. HATEOAS Links
```json
{
  "data": { "id": "123", "status": "pending" },
  "links": {
    "self": "/orders/123",
    "cancel": "/orders/123/cancel",
    "items": "/orders/123/items"
  }
}
```

### 5. Idempotency
```
# Client sends idempotency key
POST /payments
Idempotency-Key: unique-request-id-123

# Server returns same response for duplicate requests
```

### 6. Bulk Operations
```
# Batch create
POST /users/batch
{
  "data": [
    { "email": "user1@example.com" },
    { "email": "user2@example.com" }
  ]
}

# Batch update
PATCH /users/batch
{
  "data": [
    { "id": "1", "status": "active" },
    { "id": "2", "status": "inactive" }
  ]
}
```

## Security Considerations

1. **Authentication**: Use OAuth 2.0 / JWT for stateless auth
2. **Authorization**: Implement RBAC or ABAC
3. **Input Validation**: Validate all inputs server-side
4. **Rate Limiting**: Protect against abuse
5. **HTTPS Only**: Never allow plain HTTP
6. **CORS**: Configure appropriate origins
7. **Audit Logging**: Log all sensitive operations
