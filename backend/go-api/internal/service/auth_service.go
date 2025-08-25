package service

import (
	"context"
	"errors"
	"time"

	"catmart-go-api/internal/db"
	"catmart-go-api/internal/domain"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	db        *db.DB
	jwtSecret string
}

func NewAuthService(database *db.DB, jwtSecret string) *AuthService {
	return &AuthService{
		db:        database,
		jwtSecret: jwtSecret,
	}
}

func (s *AuthService) RegisterUser(ctx context.Context, req domain.CreateUserRequest) (*domain.User, error) {
	// Check if user already exists
	var exists bool
	err := s.db.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)", req.Email).Scan(&exists)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, errors.New("user already exists")
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}

	// Create user
	user := domain.User{
		ID:           uuid.New(),
		Email:        req.Email,
		PasswordHash: string(hashedPassword),
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	query := `
		INSERT INTO users (id, email, password_hash, created_at, updated_at) 
		VALUES ($1, $2, $3, $4, $5)
	`
	_, err = s.db.ExecContext(ctx, query, user.ID, user.Email, user.PasswordHash, user.CreatedAt, user.UpdatedAt)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func (s *AuthService) LoginUser(ctx context.Context, req domain.LoginRequest) (*domain.AuthResponse, error) {
	var user domain.User
	query := "SELECT id, email, password_hash, created_at, updated_at FROM users WHERE email = $1"
	
	err := s.db.QueryRowContext(ctx, query, req.Email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Verify password
	err = bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password))
	if err != nil {
		return nil, errors.New("invalid credentials")
	}

	// Generate JWT token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"user_id": user.ID.String(),
		"email":   user.Email,
		"exp":     time.Now().Add(time.Hour * 24 * 7).Unix(), // 7 days
	})

	tokenString, err := token.SignedString([]byte(s.jwtSecret))
	if err != nil {
		return nil, err
	}

	return &domain.AuthResponse{
		Token: tokenString,
		User:  user,
	}, nil
}
