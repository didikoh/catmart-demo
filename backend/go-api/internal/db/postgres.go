package db

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"os"
	"path/filepath"

	_ "github.com/lib/pq"
)

type DB struct {
	*sql.DB
}

// Product represents the product structure for seeding
type Product struct {
	Title         string  `json:"title"`
	Price         float64 `json:"price"`
	Category      string  `json:"category"`
	Image         string  `json:"image"`
	Description   string  `json:"description"`
	StockQuantity int     `json:"stock_quantity"`
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

func RunMigrations(db *DB) error {
	// Check if migrations have been applied by checking if tables exist
	var exists bool
	query := `SELECT EXISTS (
		SELECT FROM information_schema.tables 
		WHERE table_schema = 'public' 
		AND table_name = 'users'
	);`
	
	if err := db.QueryRow(query).Scan(&exists); err != nil {
		return fmt.Errorf("failed to check if migrations exist: %w", err)
	}

	if exists {
		log.Println("Database already migrated, skipping migration")
		return nil
	}

	log.Println("Running database migrations...")
	
	// The migration will be automatically applied by docker-compose
	// using the init script in docker-entrypoint-initdb.d
	return nil
}

func SeedProducts(db *DB) error {
	// Check if products already exist
	var count int
	if err := db.QueryRow("SELECT COUNT(*) FROM products").Scan(&count); err != nil {
		return fmt.Errorf("failed to check existing products: %w", err)
	}

	if count > 0 {
		log.Println("Products already seeded, skipping")
		return nil
	}

	log.Println("Seeding products...")

	// Try to read seed file from mounted volume first, then from relative path
	seedPaths := []string{
		"/app/seed/seed_products.json",
		"./seed/seed_products.json",
		"../../infra/seed/seed_products.json",
	}

	var seedData []byte
	var err error

	for _, path := range seedPaths {
		seedData, err = ioutil.ReadFile(path)
		if err == nil {
			log.Printf("Found seed file at: %s", path)
			break
		}
	}

	if err != nil {
		return fmt.Errorf("failed to read seed file from any location: %w", err)
	}

	var products []Product
	if err := json.Unmarshal(seedData, &products); err != nil {
		return fmt.Errorf("failed to unmarshal seed data: %w", err)
	}

	// Insert products
	query := `
		INSERT INTO products (title, price, category, image, description, stock_quantity) 
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	for _, product := range products {
		_, err := db.Exec(query, 
			product.Title, 
			product.Price, 
			product.Category, 
			product.Image, 
			product.Description, 
			product.StockQuantity,
		)
		if err != nil {
			return fmt.Errorf("failed to insert product %s: %w", product.Title, err)
		}
	}

	log.Printf("Successfully seeded %d products", len(products))
	return nil
}

func findSeedFile() string {
	// Look for seed file in common locations
	possiblePaths := []string{
		"./seed/seed_products.json",
		"../seed/seed_products.json", 
		"../../infra/seed/seed_products.json",
		"/app/seed/seed_products.json",
	}

	for _, path := range possiblePaths {
		if _, err := os.Stat(path); err == nil {
			absPath, _ := filepath.Abs(path)
			return absPath
		}
	}

	return ""
}
