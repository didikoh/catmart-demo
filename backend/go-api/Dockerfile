# Go API for CatMart
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy go mod file and source code
COPY go.mod ./
COPY . .

# Generate go.sum and download dependencies
RUN go mod tidy && go mod download

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main cmd/server/main.go

# Use distroless for runtime
FROM gcr.io/distroless/static:nonroot

WORKDIR /

# Copy the binary from builder stage
COPY --from=builder /app/main .

# Expose port (will be set by environment variable)
EXPOSE 8080

# Run the binary
ENTRYPOINT ["./main"]
