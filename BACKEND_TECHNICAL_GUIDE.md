# CatMart Backend Technical Guide

A comprehensive guide to the backend architecture, technologies, and implementation details of the CatMart e-commerce demo.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Go API Service](#go-api-service)
3. [Python ML Service](#python-ml-service)
4. [Database Design](#database-design)
5. [API Documentation](#api-documentation)
6. [Security Implementation](#security-implementation)
7. [Observability & Monitoring](#observability--monitoring)
8. [Development Workflow](#development-workflow)

---

## Architecture Overview

The CatMart backend follows a **microservices architecture** with two main services:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React Web     │    │   Go REST API   │    │  Python ML API  │
│   Frontend      │◄──►│   (Port 8080)   │◄──►│   (Port 8090)   │
│  (Port 5173)    │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌─────────────────┐    ┌─────────────────┐
                       │   PostgreSQL    │    │   File Storage  │
                       │   Database      │    │   (Reports)     │
                       │  (Port 5432)    │    │                 │
                       └─────────────────┘    └─────────────────┘
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **API Gateway** | Go + Gin Framework | RESTful API, Authentication, Business Logic |
| **ML Service** | Python + FastAPI | Machine Learning, Recommendations, Analytics |
| **Database** | PostgreSQL 16 | Primary data storage |
| **Authentication** | JWT (JSON Web Tokens) | Stateless authentication |
| **Observability** | OpenTelemetry | Distributed tracing |
| **Containerization** | Docker + Docker Compose | Service orchestration |

---

## Go API Service

### Framework & Dependencies

The Go API service is built with modern Go practices and libraries:

```go
// Key dependencies in go.mod
module catmart-go-api

go 1.22

require (
    github.com/gin-gonic/gin v1.9.1           // Web framework
    github.com/gin-contrib/cors v1.4.0        // CORS middleware
    github.com/lib/pq v1.10.9                 // PostgreSQL driver
    github.com/golang-jwt/jwt/v5 v5.0.0       // JWT implementation
    github.com/google/uuid v1.3.1             // UUID generation
    golang.org/x/crypto v0.12.0               // Password hashing
    go.opentelemetry.io/otel v1.17.0          // Observability
)
```

### Project Structure

```
backend/go-api/
├── cmd/
│   └── server/
│       └── main.go                 # Application entry point
├── internal/
│   ├── config/                     # Configuration management
│   │   └── config.go
│   ├── db/                         # Database layer
│   │   ├── postgres.go             # Connection & migrations
│   │   └── seed.go                 # Sample data seeding
│   ├── domain/                     # Domain models & DTOs
│   │   ├── user.go
│   │   ├── product.go
│   │   └── order.go
│   ├── http/                       # HTTP layer
│   │   ├── handlers/               # Request handlers
│   │   ├── middleware.go           # Custom middleware
│   │   └── router.go               # Route definitions
│   ├── service/                    # Business logic layer
│   │   ├── auth_service.go
│   │   ├── product_service.go
│   │   └── order_service.go
│   └── telemetry/                  # Observability setup
│       └── otel.go
├── Dockerfile                      # Container definition
└── go.mod                          # Go dependencies
```

### Core Components

#### 1. **Domain Models**

The domain layer defines core business entities:

```go
// internal/domain/user.go
type User struct {
    ID        uuid.UUID `json:"id" db:"id"`
    Email     string    `json:"email" db:"email"`
    Name      string    `json:"name" db:"name"`
    Password  string    `json:"-" db:"password_hash"`
    CreatedAt time.Time `json:"created_at" db:"created_at"`
    UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

// internal/domain/product.go
type Product struct {
    ID          uuid.UUID `json:"id" db:"id"`
    Title       string    `json:"title" db:"title"`
    Description string    `json:"description" db:"description"`
    Price       float64   `json:"price" db:"price"`
    Category    string    `json:"category" db:"category"`
    Image       string    `json:"image" db:"image"`
    CreatedAt   time.Time `json:"created_at" db:"created_at"`
    UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}
```

#### 2. **Service Layer Pattern**

Business logic is encapsulated in service layers:

```go
// internal/service/auth_service.go
type AuthService struct {
    db        *db.DB
    jwtSecret string
}

func (s *AuthService) Register(ctx context.Context, req RegisterRequest) (*AuthResponse, error) {
    // Hash password using bcrypt
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
    if err != nil {
        return nil, err
    }

    // Create user in database
    user := &domain.User{
        ID:       uuid.New(),
        Email:    req.Email,
        Name:     req.Name,
        Password: string(hashedPassword),
    }

    // Generate JWT token
    token, err := s.generateJWT(user)
    if err != nil {
        return nil, err
    }

    return &AuthResponse{
        Token: token,
        User:  user,
    }, nil
}
```

#### 3. **HTTP Handlers**

Clean separation between HTTP concerns and business logic:

```go
// internal/http/handlers/auth_handler.go
type AuthHandler struct {
    authService *service.AuthService
}

func (h *AuthHandler) Register(c *gin.Context) {
    var req service.RegisterRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Delegate to service layer
    response, err := h.authService.Register(c.Request.Context(), req)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
        return
    }

    c.JSON(http.StatusCreated, response)
}
```

#### 4. **Middleware Implementation**

Custom middleware for cross-cutting concerns:

```go
// internal/http/middleware.go
func JWTAuthMiddleware(secretKey string) gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
            c.Abort()
            return
        }

        tokenString := strings.TrimPrefix(authHeader, "Bearer ")
        token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
            return []byte(secretKey), nil
        })

        if err != nil || !token.Valid {
            c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
            c.Abort()
            return
        }

        if claims, ok := token.Claims.(jwt.MapClaims); ok {
            c.Set("userID", claims["user_id"])
            c.Set("userEmail", claims["email"])
        }

        c.Next()
    }
}
```

### Database Integration

#### Connection Management

```go
// internal/db/postgres.go
type DB struct {
    *sql.DB
}

func NewPostgresDB(databaseURL string) (*DB, error) {
    db, err := sql.Open("postgres", databaseURL)
    if err != nil {
        return nil, fmt.Errorf("failed to open database: %w", err)
    }

    if err := db.Ping(); err != nil {
        return nil, fmt.Errorf("failed to ping database: %w", err)
    }

    return &DB{db}, nil
}
```

#### Migration System

```go
func RunMigrations(db *DB) error {
    migrationSQL := `
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `
    
    _, err := db.Exec(migrationSQL)
    return err
}
```

---

## Python ML Service

### Framework & Dependencies

The Python ML service uses FastAPI for high-performance async APIs:

```python
# requirements.txt
fastapi==0.104.1              # Modern async web framework
uvicorn[standard]==0.24.0      # ASGI server with performance extras
pydantic==2.4.2               # Data validation and parsing
pandas==2.1.2                 # Data manipulation and analysis
numpy==1.24.3                 # Numerical computing
matplotlib==3.8.1             # Data visualization
seaborn==0.13.0               # Statistical data visualization
requests==2.31.0              # HTTP client for Go API communication
aiofiles==24.1.0              # Async file operations
```

### Project Structure

```
backend/py-ml/
├── app/
│   ├── __init__.py
│   ├── main.py                     # FastAPI application
│   ├── models/                     # Data models
│   │   ├── __init__.py
│   │   ├── recommendations.py
│   │   └── reports.py
│   ├── services/                   # Business logic
│   │   ├── __init__.py
│   │   ├── recommendation_service.py
│   │   └── report_service.py
│   └── utils/                      # Utilities
│       ├── __init__.py
│       └── go_api_client.py
├── requirements.txt
├── Dockerfile
└── README.md
```

### Core Components

#### 1. **FastAPI Application Setup**

```python
# app/main.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(
    title="CatMart ML Service",
    description="Machine Learning and Analytics API for CatMart",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "ml-api"}
```

#### 2. **Pydantic Models**

Strong typing with automatic validation:

```python
# app/models/recommendations.py
from pydantic import BaseModel, Field
from typing import List, Optional
from uuid import UUID

class ProductRecommendation(BaseModel):
    product_id: UUID
    title: str
    price: float
    category: str
    image: str
    score: float = Field(..., ge=0.0, le=1.0, description="Recommendation confidence score")
    reason: str = Field(..., description="Why this product is recommended")

class RecommendationRequest(BaseModel):
    user_id: UUID
    limit: Optional[int] = Field(default=10, ge=1, le=50)
    categories: Optional[List[str]] = None

class RecommendationResponse(BaseModel):
    user_id: UUID
    recommendations: List[ProductRecommendation]
    generated_at: str
    algorithm_version: str = "1.0"
```

#### 3. **Recommendation Engine**

```python
# app/services/recommendation_service.py
import pandas as pd
import numpy as np
from typing import List
import httpx
from app.models.recommendations import ProductRecommendation

class RecommendationService:
    def __init__(self):
        self.go_api_base = "http://go-api:8080"
        
    async def get_user_recommendations(
        self, 
        user_id: str, 
        limit: int = 10
    ) -> List[ProductRecommendation]:
        """
        Generate product recommendations for a user.
        Current implementation uses rule-based logic but can be extended with ML models.
        """
        
        # Fetch user's order history
        user_orders = await self._fetch_user_orders(user_id)
        
        # Fetch all products
        all_products = await self._fetch_products()
        
        if not all_products:
            return []
            
        # Convert to DataFrame for easier manipulation
        df_products = pd.DataFrame(all_products)
        
        if user_orders:
            # User has order history - use collaborative filtering approach
            recommendations = await self._generate_personalized_recommendations(
                user_orders, df_products, limit
            )
        else:
            # New user - use popularity-based recommendations
            recommendations = await self._generate_popularity_recommendations(
                df_products, limit
            )
            
        return recommendations
    
    async def _generate_personalized_recommendations(
        self, 
        user_orders: List[dict], 
        df_products: pd.DataFrame, 
        limit: int
    ) -> List[ProductRecommendation]:
        """Generate recommendations based on user's purchase history."""
        
        # Extract purchased categories
        purchased_categories = set()
        purchased_products = set()
        
        for order in user_orders:
            for item in order.get('items', []):
                if 'product' in item:
                    purchased_categories.add(item['product']['category'])
                    purchased_products.add(item['product']['id'])
        
        # Score products based on category preference and novelty
        recommendations = []
        
        for _, product in df_products.iterrows():
            if product['id'] in purchased_products:
                continue  # Don't recommend already purchased items
                
            # Calculate recommendation score
            category_score = 0.8 if product['category'] in purchased_categories else 0.3
            price_score = self._calculate_price_preference_score(product['price'])
            
            final_score = (category_score * 0.7) + (price_score * 0.3)
            
            reason = self._generate_recommendation_reason(
                product, purchased_categories, category_score
            )
            
            recommendations.append(ProductRecommendation(
                product_id=product['id'],
                title=product['title'],
                price=product['price'],
                category=product['category'],
                image=product['image'],
                score=final_score,
                reason=reason
            ))
        
        # Sort by score and return top recommendations
        recommendations.sort(key=lambda x: x.score, reverse=True)
        return recommendations[:limit]
```

#### 4. **Sales Report Generation**

```python
# app/services/report_service.py
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
from datetime import datetime, timedelta
import io
import base64

class ReportService:
    async def generate_sales_report(self, range_days: int = 30) -> dict:
        """Generate comprehensive sales analytics report."""
        
        # Fetch sales data from Go API
        sales_data = await self._fetch_sales_data(range_days)
        
        if not sales_data:
            return {"error": "No sales data available"}
        
        # Convert to DataFrame
        df = pd.DataFrame(sales_data)
        df['created_at'] = pd.to_datetime(df['created_at'])
        
        # Generate analytics
        analytics = {
            "summary": self._generate_summary_stats(df),
            "trends": self._generate_trend_analysis(df),
            "categories": self._analyze_category_performance(df),
            "charts": await self._generate_charts(df)
        }
        
        return analytics
    
    def _generate_summary_stats(self, df: pd.DataFrame) -> dict:
        """Calculate key summary statistics."""
        return {
            "total_orders": len(df),
            "total_revenue": float(df['total_amount'].sum()),
            "average_order_value": float(df['total_amount'].mean()),
            "unique_customers": df['user_id'].nunique(),
            "date_range": {
                "start": df['created_at'].min().isoformat(),
                "end": df['created_at'].max().isoformat()
            }
        }
    
    async def _generate_charts(self, df: pd.DataFrame) -> dict:
        """Generate base64-encoded chart images."""
        charts = {}
        
        # Sales over time chart
        plt.figure(figsize=(12, 6))
        daily_sales = df.groupby(df['created_at'].dt.date)['total_amount'].sum()
        plt.plot(daily_sales.index, daily_sales.values, marker='o')
        plt.title('Daily Sales Revenue')
        plt.xlabel('Date')
        plt.ylabel('Revenue ($)')
        plt.xticks(rotation=45)
        plt.tight_layout()
        
        # Save to base64
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png', bbox_inches='tight', dpi=150)
        buffer.seek(0)
        charts['daily_revenue'] = base64.b64encode(buffer.getvalue()).decode()
        plt.close()
        
        return charts
```

### API Endpoints

```python
# app/main.py (continued)

@app.get("/ml/recommendations")
async def get_recommendations(
    userId: str,
    limit: int = 10,
    categories: Optional[str] = None
):
    """Get product recommendations for a user."""
    try:
        service = RecommendationService()
        recommendations = await service.get_user_recommendations(userId, limit)
        
        return {
            "user_id": userId,
            "recommendations": recommendations,
            "generated_at": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/ml/reports/sales")
async def get_sales_report(range: str = "30d"):
    """Generate sales analytics report."""
    try:
        # Parse range parameter
        range_days = int(range.replace('d', ''))
        
        service = ReportService()
        report = await service.generate_sales_report(range_days)
        
        return report
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## Database Design

### Schema Overview

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Products table
CREATE TABLE products (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    image TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE order_items (
    id UUID PRIMARY KEY,
    order_id UUID REFERENCES orders(id),
    product_id UUID REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Indexing Strategy

```sql
-- Performance indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
```

### Sample Data

```sql
-- Sample products (cat-themed e-commerce)
INSERT INTO products (id, title, description, price, category, image) VALUES
(
    gen_random_uuid(),
    'Premium Cat Food - Salmon Delight',
    'High-quality salmon-based cat food for adult cats',
    24.99,
    'food',
    'https://example.com/images/cat-food-salmon.jpg'
),
(
    gen_random_uuid(),
    'Interactive Feather Wand Toy',
    'Keep your cat entertained with this interactive feather toy',
    12.99,
    'toys',
    'https://example.com/images/feather-wand.jpg'
);
```

---

## API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "name": "John Doe",
    "email": "john@example.com",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

#### POST /api/auth/login
Authenticate and receive a JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword"
}
```

### Product Endpoints

#### GET /api/products
List all products with optional filtering.

**Query Parameters:**
- `search` (string): Search in product titles
- `category` (string): Filter by category
- `limit` (int): Number of products to return (default: 20)

**Response:**
```json
{
  "products": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "Premium Cat Food",
      "description": "High-quality cat food",
      "price": 24.99,
      "category": "food",
      "image": "https://example.com/image.jpg",
      "created_at": "2024-01-15T10:30:00Z"
    }
  ],
  "total": 1
}
```

### Order Endpoints (Protected)

#### POST /api/orders
Create a new order (requires authentication).

**Headers:**
```
Authorization: Bearer <jwt_token>
```

**Request Body:**
```json
{
  "items": [
    {
      "product_id": "550e8400-e29b-41d4-a716-446655440001",
      "quantity": 2
    }
  ]
}
```

### ML Service Endpoints

#### GET /ml/recommendations?userId={id}
Get personalized product recommendations.

**Response:**
```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "recommendations": [
    {
      "product_id": "550e8400-e29b-41d4-a716-446655440001",
      "title": "Premium Cat Food",
      "price": 24.99,
      "category": "food",
      "score": 0.85,
      "reason": "Based on your previous purchases in the food category"
    }
  ],
  "generated_at": "2024-01-15T10:30:00Z"
}
```

---

## Security Implementation

### JWT Authentication

```go
func generateJWT(user *domain.User, secret string) (string, error) {
    claims := jwt.MapClaims{
        "user_id": user.ID.String(),
        "email":   user.Email,
        "exp":     time.Now().Add(time.Hour * 24).Unix(), // 24 hours
        "iat":     time.Now().Unix(),
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    return token.SignedString([]byte(secret))
}
```

### Password Hashing

```go
import "golang.org/x/crypto/bcrypt"

func hashPassword(password string) (string, error) {
    hashedPassword, err := bcrypt.GenerateFromPassword(
        []byte(password), 
        bcrypt.DefaultCost,
    )
    return string(hashedPassword), err
}

func checkPassword(hashedPassword, password string) error {
    return bcrypt.CompareHashAndPassword(
        []byte(hashedPassword), 
        []byte(password),
    )
}
```

### CORS Configuration

```go
router.Use(cors.New(cors.Config{
    AllowOrigins:     []string{"http://localhost:5173"},
    AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
    AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
    ExposeHeaders:    []string{"Content-Length"},
    AllowCredentials: true,
    MaxAge:          12 * time.Hour,
}))
```

---

## Observability & Monitoring

### OpenTelemetry Integration

```go
// internal/telemetry/otel.go
func InitTracing(serviceName string) (func(), error) {
    exporter, err := stdouttrace.New(stdouttrace.WithPrettyPrint())
    if err != nil {
        return nil, err
    }

    res := resource.NewWithAttributes(
        "https://opentelemetry.io/schemas/1.20.0",
        semconv.ServiceNameKey.String(serviceName),
    )

    tp := trace.NewTracerProvider(
        trace.WithBatcher(exporter),
        trace.WithResource(res),
    )

    otel.SetTracerProvider(tp)

    return func() {
        if err := tp.Shutdown(context.Background()); err != nil {
            log.Printf("Error shutting down tracer provider: %v", err)
        }
    }, nil
}
```

### Health Checks

```go
// Health check endpoint
router.GET("/health", func(c *gin.Context) {
    // Check database connectivity
    if err := database.Ping(); err != nil {
        c.JSON(http.StatusServiceUnavailable, gin.H{
            "status": "unhealthy",
            "database": "down",
            "timestamp": time.Now().UTC(),
        })
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "status": "healthy",
        "database": "up",
        "timestamp": time.Now().UTC(),
        "version": "1.0.0",
    })
})
```

### Logging Strategy

```go
// Structured logging with context
func (h *ProductHandler) GetProducts(c *gin.Context) {
    span := trace.SpanFromContext(c.Request.Context())
    
    log.Printf("GetProducts request: traceID=%s, userAgent=%s", 
        span.SpanContext().TraceID(), 
        c.GetHeader("User-Agent"))
    
    // Business logic...
    
    log.Printf("GetProducts response: count=%d, duration=%v", 
        len(products), time.Since(start))
}
```

---

## Development Workflow

### Local Development Setup

1. **Prerequisites:**
   ```bash
   # Install Go 1.22+
   go version
   
   # Install Python 3.11+
   python --version
   
   # Install Docker & Docker Compose
   docker --version
   docker compose version
   ```

2. **Environment Configuration:**
   ```bash
   cd infra
   cp .env.example .env
   # Edit .env with your local settings
   ```

3. **Database Setup:**
   ```bash
   # Start only the database
   docker compose up -d db
   
   # Run migrations
   cd backend/go-api
   go run cmd/server/main.go
   ```

4. **Run Services Individually:**
   ```bash
   # Terminal 1: Go API
   cd backend/go-api
   go run cmd/server/main.go
   
   # Terminal 2: Python ML Service
   cd backend/py-ml
   pip install -r requirements.txt
   python -m uvicorn app.main:app --reload --port 8090
   
   # Terminal 3: Frontend
   cd frontend/catmart-web
   npm install
   npm run dev
   ```

### Testing Strategy

```go
// Example unit test for Go service
func TestAuthService_Register(t *testing.T) {
    // Setup test database
    db := setupTestDB(t)
    defer teardownTestDB(t, db)
    
    authService := service.NewAuthService(db, "test-secret")
    
    // Test successful registration
    req := service.RegisterRequest{
        Name:     "Test User",
        Email:    "test@example.com",
        Password: "password123",
    }
    
    response, err := authService.Register(context.Background(), req)
    
    assert.NoError(t, err)
    assert.NotEmpty(t, response.Token)
    assert.Equal(t, req.Email, response.User.Email)
}
```

### Docker Development

```dockerfile
# Multi-stage Go build for development
FROM golang:1.22-alpine AS development

WORKDIR /app

# Install air for hot reloading
RUN go install github.com/cosmtrek/air@latest

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Use air for hot reloading in development
CMD ["air", "-c", ".air.toml"]
```

### API Testing with curl

```bash
# Register a new user
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","password":"password123"}'

# Get products
curl -X GET "http://localhost:8080/api/products?category=food&limit=5"

# Get recommendations
curl -X GET "http://localhost:8090/ml/recommendations?userId=550e8400-e29b-41d4-a716-446655440000"
```

---

## Performance Considerations

### Database Optimization

1. **Connection Pooling:**
   ```go
   db.SetMaxOpenConns(25)
   db.SetMaxIdleConns(5)
   db.SetConnMaxLifetime(5 * time.Minute)
   ```

2. **Query Optimization:**
   ```sql
   -- Use prepared statements
   PREPARE get_user_orders AS 
   SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2;
   ```

### Caching Strategy

```go
// Redis integration example
type CachedProductService struct {
    productService *ProductService
    cache          *redis.Client
    cacheTTL       time.Duration
}

func (s *CachedProductService) GetProducts(ctx context.Context) ([]Product, error) {
    cacheKey := "products:all"
    
    // Try cache first
    cached, err := s.cache.Get(ctx, cacheKey).Result()
    if err == nil {
        var products []Product
        json.Unmarshal([]byte(cached), &products)
        return products, nil
    }
    
    // Fallback to database
    products, err := s.productService.GetProducts(ctx)
    if err != nil {
        return nil, err
    }
    
    // Cache the result
    data, _ := json.Marshal(products)
    s.cache.Set(ctx, cacheKey, data, s.cacheTTL)
    
    return products, nil
}
```

---

## Deployment & Production

### Production Configuration

```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  go-api:
    image: catmart-go-api:${VERSION}
    environment:
      - GIN_MODE=release
      - JWT_SECRET=${JWT_SECRET}
      - DATABASE_URL=${DATABASE_URL}
    restart: unless-stopped
    
  py-ml:
    image: catmart-py-ml:${VERSION}
    environment:
      - ENVIRONMENT=production
      - GO_API_URL=http://go-api:8080
    restart: unless-stopped
```

### Health Check Implementation

```yaml
services:
  go-api:
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

This comprehensive guide provides a deep dive into the backend architecture, implementation details, and best practices used in the CatMart demo project. The combination of Go and Python services demonstrates modern microservices patterns while maintaining simplicity and performance.
