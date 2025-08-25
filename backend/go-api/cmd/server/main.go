package main

import (
	"log"
	"os"

	"catmart-go-api/internal/config"
	"catmart-go-api/internal/db"
	"catmart-go-api/internal/http"
	"catmart-go-api/internal/telemetry"

	"github.com/gin-gonic/gin"
)

func main() {
	// Initialize configuration
	cfg := config.Load()

	// Initialize telemetry
	cleanup, err := telemetry.InitTracing("catmart-go-api")
	if err != nil {
		log.Printf("Failed to initialize tracing: %v", err)
	} else {
		defer cleanup()
	}

	// Initialize database
	database, err := db.NewPostgresDB(cfg.DatabaseURL())
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer database.Close()

	// Run migrations and seed data
	if err := db.RunMigrations(database); err != nil {
		log.Printf("Failed to run migrations: %v", err)
	}

	if err := db.SeedProducts(database); err != nil {
		log.Printf("Failed to seed products: %v", err)
	}

	// Set Gin mode
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize HTTP server
	router := http.NewRouter(database, cfg)

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
