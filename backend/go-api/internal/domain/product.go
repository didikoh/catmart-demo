package domain

import (
	"time"
	"github.com/google/uuid"
)

type Product struct {
	ID            uuid.UUID `json:"id" db:"id"`
	Title         string    `json:"title" db:"title"`
	Price         float64   `json:"price" db:"price"`
	Category      string    `json:"category" db:"category"`
	Image         string    `json:"image" db:"image"`
	Description   string    `json:"description" db:"description"`
	StockQuantity int       `json:"stock_quantity" db:"stock_quantity"`
	CreatedAt     time.Time `json:"created_at" db:"created_at"`
	UpdatedAt     time.Time `json:"updated_at" db:"updated_at"`
}

type ProductFilter struct {
	Query    string `form:"q"`
	Category string `form:"category"`
	Limit    int    `form:"limit"`
	Offset   int    `form:"offset"`
}
