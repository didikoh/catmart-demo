package domain

import (
	"time"
	"github.com/google/uuid"
)

type Order struct {
	ID          uuid.UUID   `json:"id" db:"id"`
	UserID      uuid.UUID   `json:"user_id" db:"user_id"`
	TotalAmount float64     `json:"total_amount" db:"total_amount"`
	Status      string      `json:"status" db:"status"`
	Items       []OrderItem `json:"items,omitempty"`
	CreatedAt   time.Time   `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at" db:"updated_at"`
}

type OrderItem struct {
	ID        uuid.UUID `json:"id" db:"id"`
	OrderID   uuid.UUID `json:"order_id" db:"order_id"`
	ProductID uuid.UUID `json:"product_id" db:"product_id"`
	Quantity  int       `json:"quantity" db:"quantity"`
	Price     float64   `json:"price" db:"price"`
	Product   *Product  `json:"product,omitempty"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type CreateOrderRequest struct {
	Items []OrderItemRequest `json:"items" binding:"required,dive"`
}

type OrderItemRequest struct {
	ProductID uuid.UUID `json:"productId" binding:"required"`
	Qty       int       `json:"qty" binding:"required,min=1"`
}

type CreateOrderResponse struct {
	OrderID uuid.UUID `json:"orderId"`
	Total   float64   `json:"total"`
}
