# CatMart Demo Project

A full-stack e-commerce demo with React frontend, Go API backend, and Python ML service.

## Architecture

- **Frontend**: React + Vite + TypeScript + Bootstrap
- **Backend**: Go with Gin framework, JWT auth, PostgreSQL
- **ML Service**: FastAPI with recommendations and sales reports
- **Infrastructure**: Docker Compose with PostgreSQL

## Quick Start

1. Clone and navigate to the project:
   ```bash
   cd catmart-demo
   ```

2. Set up environment:
   ```bash
   cd infra
   cp .env.example .env
   ```

3. Start all services:
   ```bash
   docker compose up --build
   ```

4. Access the application:
   - Web frontend: http://localhost:5173
   - Go API: http://localhost:8080
   - Python ML API: http://localhost:8090
   - PostgreSQL: localhost:5432

## Health Checks

- Go API: `GET http://localhost:8080/api/products`
- Python ML: `GET http://localhost:8090/ml/recommendations?userId=1`

## Features

- User registration and authentication
- Product catalog with search and filtering
- Shopping cart with Zustand state management
- Order creation and history
- ML-based product recommendations
- Sales reports with charts
- OpenTelemetry observability hooks

## Development

### Go API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/products` - List products (with search and category filter)
- `GET /api/products/:id` - Get product details
- `POST /api/orders` - Create order (authenticated)
- `GET /api/orders/my` - Get user orders (authenticated)

### Python ML Endpoints

- `GET /ml/recommendations?userId=X` - Get product recommendations
- `GET /ml/reports/sales?range=7d|30d` - Generate sales reports

## Extension Points

- **Recommendations**: Currently rule-based, can be replaced with ML models
- **Observability**: OpenTelemetry traces are set up for key endpoints
- **Database**: Migrations system ready for schema evolution
- **Testing**: Structure ready for unit and integration tests

## File Structure

```
CatMart-project-demo/
├── README.md
├── infra/                    # Infrastructure and configuration
├── shared/                   # Shared specifications
├── backend/
│   ├── go-api/              # Go REST API
│   └── py-ml/               # Python ML service
└── frontend/
    └── catmart-web/         # React frontend
```
