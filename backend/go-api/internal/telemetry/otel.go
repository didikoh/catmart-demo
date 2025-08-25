package telemetry

import (
	"context"
	"log"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/stdout/stdouttrace"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/otel/sdk/trace"
	"go.opentelemetry.io/otel/semconv/v1.20.0"
)

// InitTracing initializes OpenTelemetry tracing with stdout exporter
func InitTracing(serviceName string) (func(), error) {
	// Create stdout trace exporter
	exporter, err := stdouttrace.New(
		stdouttrace.WithPrettyPrint(),
	)
	if err != nil {
		return nil, err
	}

	// Create resource with service name
	res := resource.NewWithAttributes(
		"https://opentelemetry.io/schemas/1.20.0",
		semconv.ServiceNameKey.String(serviceName),
	)

	// Create trace provider
	tp := trace.NewTracerProvider(
		trace.WithBatcher(exporter),
		trace.WithResource(res),
	)

	// Set global trace provider
	otel.SetTracerProvider(tp)

	log.Printf("OpenTelemetry tracing initialized for service: %s", serviceName)

	// Return cleanup function
	return func() {
		if err := tp.Shutdown(context.Background()); err != nil {
			log.Printf("Error shutting down tracer provider: %v", err)
		}
	}, nil
}
