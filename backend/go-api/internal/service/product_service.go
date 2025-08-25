package service

import (
	"context"
	"errors"
	"fmt"

	"catmart-go-api/internal/db"
	"catmart-go-api/internal/domain"

	"github.com/google/uuid"
)

type ProductService struct {
	db *db.DB
}

func NewProductService(database *db.DB) *ProductService {
	return &ProductService{
		db: database,
	}
}

func (s *ProductService) GetProducts(ctx context.Context, filter domain.ProductFilter) ([]domain.Product, error) {
	query := "SELECT id, title, price, category, image, description, stock_quantity, created_at, updated_at FROM products"
	args := []interface{}{}
	argCount := 0
	
	var whereClauses []string
	
	if filter.Query != "" {
		argCount++
		whereClauses = append(whereClauses, fmt.Sprintf("(title ILIKE $%d OR description ILIKE $%d)", argCount, argCount))
		args = append(args, "%"+filter.Query+"%")
	}
	
	if filter.Category != "" {
		argCount++
		whereClauses = append(whereClauses, fmt.Sprintf("category = $%d", argCount))
		args = append(args, filter.Category)
	}
	
	if len(whereClauses) > 0 {
		query += " WHERE "
		for i, clause := range whereClauses {
			if i > 0 {
				query += " AND "
			}
			query += clause
		}
	}
	
	query += " ORDER BY created_at DESC"
	
	if filter.Limit > 0 {
		argCount++
		query += fmt.Sprintf(" LIMIT $%d", argCount)
		args = append(args, filter.Limit)
	}
	
	if filter.Offset > 0 {
		argCount++
		query += fmt.Sprintf(" OFFSET $%d", argCount)
		args = append(args, filter.Offset)
	}

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var products []domain.Product
	for rows.Next() {
		var product domain.Product
		err := rows.Scan(
			&product.ID, &product.Title, &product.Price, &product.Category,
			&product.Image, &product.Description, &product.StockQuantity,
			&product.CreatedAt, &product.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		products = append(products, product)
	}

	return products, nil
}

func (s *ProductService) GetProduct(ctx context.Context, id uuid.UUID) (*domain.Product, error) {
	query := `
		SELECT id, title, price, category, image, description, stock_quantity, created_at, updated_at 
		FROM products WHERE id = $1
	`
	
	var product domain.Product
	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&product.ID, &product.Title, &product.Price, &product.Category,
		&product.Image, &product.Description, &product.StockQuantity,
		&product.CreatedAt, &product.UpdatedAt,
	)
	if err != nil {
		return nil, errors.New("product not found")
	}

	return &product, nil
}
