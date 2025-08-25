package service

import (
	"context"
	"time"

	"catmart-go-api/internal/db"
	"catmart-go-api/internal/domain"

	"github.com/google/uuid"
)

type OrderService struct {
	db *db.DB
}

func NewOrderService(database *db.DB) *OrderService {
	return &OrderService{
		db: database,
	}
}

func (s *OrderService) CreateOrder(ctx context.Context, userID uuid.UUID, req domain.CreateOrderRequest) (*domain.CreateOrderResponse, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Create order
	orderID := uuid.New()
	var totalAmount float64

	// Calculate total amount by fetching product prices
	for _, item := range req.Items {
		var price float64
		err := tx.QueryRowContext(ctx, 
			"SELECT price FROM products WHERE id = $1", item.ProductID).Scan(&price)
		if err != nil {
			return nil, err
		}
		totalAmount += price * float64(item.Qty)
	}

	// Insert order
	orderQuery := `
		INSERT INTO orders (id, user_id, total_amount, status, created_at, updated_at) 
		VALUES ($1, $2, $3, $4, $5, $6)
	`
	now := time.Now()
	_, err = tx.ExecContext(ctx, orderQuery, orderID, userID, totalAmount, "pending", now, now)
	if err != nil {
		return nil, err
	}

	// Insert order items
	itemQuery := `
		INSERT INTO order_items (id, order_id, product_id, quantity, price, created_at) 
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	for _, item := range req.Items {
		var price float64
		err := tx.QueryRowContext(ctx, 
			"SELECT price FROM products WHERE id = $1", item.ProductID).Scan(&price)
		if err != nil {
			return nil, err
		}

		itemID := uuid.New()
		_, err = tx.ExecContext(ctx, itemQuery, 
			itemID, orderID, item.ProductID, item.Qty, price, now)
		if err != nil {
			return nil, err
		}
	}

	if err = tx.Commit(); err != nil {
		return nil, err
	}

	return &domain.CreateOrderResponse{
		OrderID: orderID,
		Total:   totalAmount,
	}, nil
}

func (s *OrderService) GetUserOrders(ctx context.Context, userID uuid.UUID) ([]domain.Order, error) {
	query := `
		SELECT o.id, o.user_id, o.total_amount, o.status, o.created_at, o.updated_at
		FROM orders o 
		WHERE o.user_id = $1 
		ORDER BY o.created_at DESC
	`

	rows, err := s.db.QueryContext(ctx, query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var orders []domain.Order
	for rows.Next() {
		var order domain.Order
		err := rows.Scan(
			&order.ID, &order.UserID, &order.TotalAmount, 
			&order.Status, &order.CreatedAt, &order.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		// Fetch order items
		items, err := s.getOrderItems(ctx, order.ID)
		if err != nil {
			return nil, err
		}
		order.Items = items

		orders = append(orders, order)
	}

	return orders, nil
}

func (s *OrderService) getOrderItems(ctx context.Context, orderID uuid.UUID) ([]domain.OrderItem, error) {
	query := `
		SELECT oi.id, oi.order_id, oi.product_id, oi.quantity, oi.price, oi.created_at,
		       p.title, p.category, p.image, p.description
		FROM order_items oi
		JOIN products p ON oi.product_id = p.id
		WHERE oi.order_id = $1
	`

	rows, err := s.db.QueryContext(ctx, query, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []domain.OrderItem
	for rows.Next() {
		var item domain.OrderItem
		var product domain.Product
		
		err := rows.Scan(
			&item.ID, &item.OrderID, &item.ProductID, &item.Quantity, 
			&item.Price, &item.CreatedAt,
			&product.Title, &product.Category, &product.Image, &product.Description,
		)
		if err != nil {
			return nil, err
		}

		product.ID = item.ProductID
		product.Price = item.Price
		item.Product = &product

		items = append(items, item)
	}

	return items, nil
}
