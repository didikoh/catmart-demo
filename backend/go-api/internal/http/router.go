package http

import (
	"catmart-go-api/internal/config"
	"catmart-go-api/internal/db"
	"catmart-go-api/internal/http/handlers"
	"catmart-go-api/internal/service"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
)

func NewRouter(database *db.DB, cfg *config.Config) *gin.Engine {
	router := gin.Default()

	// Middleware
	router.Use(otelgin.Middleware("catmart-go-api"))
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:5173", "http://localhost:3000"},
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
	}))

	// Initialize services
	authService := service.NewAuthService(database, cfg.JWTSecret)
	productService := service.NewProductService(database)
	orderService := service.NewOrderService(database)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(authService)
	productHandler := handlers.NewProductHandler(productService)
	orderHandler := handlers.NewOrderHandler(orderService)

	// Health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{"status": "ok"})
	})

	// API routes
	api := router.Group("/api")
	{
		// Auth routes
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
		}

		// Product routes
		api.GET("/products", productHandler.GetProducts)
		api.GET("/products/:id", productHandler.GetProduct)

		// Protected routes
		protected := api.Group("", JWTAuthMiddleware(cfg.JWTSecret))
		{
			protected.POST("/orders", orderHandler.CreateOrder)
			protected.GET("/orders/my", orderHandler.GetMyOrders)
		}
	}

	return router
}
