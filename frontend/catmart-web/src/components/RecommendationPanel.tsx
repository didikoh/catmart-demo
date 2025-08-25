import React, { useEffect, useState } from 'react';
import { pyApiClient } from '../api/pyClient';
import { goApiClient, Product } from '../api/goClient';
import { useAuthStore } from '../store/auth';

const RecommendationPanel: React.FC = () => {
  const { user } = useAuthStore();
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchRecommendations();
    }
  }, [user]);

  const fetchRecommendations = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      // Get recommendations from ML service
      const mlResponse = await pyApiClient.getRecommendations(user.id);
      
      // If we have product IDs, fetch full product details
      if (mlResponse.items && mlResponse.items.length > 0) {
        // For demo purposes, get some products since ML service returns mock IDs
        const products = await goApiClient.getProducts();
        // Take first few products as "recommendations"
        setRecommendations(products.slice(0, 4));
      } else {
        // Fallback: get some popular products
        const products = await goApiClient.getProducts();
        setRecommendations(products.slice(0, 4));
      }
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
      setError('Failed to load recommendations');
      
      // Fallback: try to get some products anyway
      try {
        const products = await goApiClient.getProducts();
        setRecommendations(products.slice(0, 4));
      } catch (fallbackErr) {
        console.error('Fallback also failed:', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="card bg-light">
        <div className="card-body text-center">
          <h5 className="card-title">🎯 Personalized Recommendations</h5>
          <p className="card-text text-muted">
            Login to get personalized product recommendations based on your preferences!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">🎯 Recommended for You</h5>
        <small className="text-muted">Powered by ML</small>
      </div>
      <div className="card-body">
        {loading ? (
          <div className="text-center">
            <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            Getting your recommendations...
          </div>
        ) : error ? (
          <div className="alert alert-warning alert-sm mb-2">
            <small>{error}</small>
          </div>
        ) : null}
        
        {recommendations.length > 0 ? (
          <div className="row">
            {recommendations.map((product) => (
              <div key={product.id} className="col-md-3 col-6 mb-3">
                <div className="card card-sm h-100">
                  <img 
                    src={product.image} 
                    className="card-img-top" 
                    alt={product.title}
                    style={{ height: '120px', objectFit: 'cover' }}
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/200x120?text=Product';
                    }}
                  />
                  <div className="card-body p-2">
                    <h6 className="card-title small mb-1" style={{ fontSize: '0.875rem' }}>
                      {product.title.length > 30 
                        ? `${product.title.substring(0, 30)}...` 
                        : product.title}
                    </h6>
                    <p className="card-text text-success mb-1">
                      <strong>${product.price.toFixed(2)}</strong>
                    </p>
                    <a 
                      href={`/product/${product.id}`} 
                      className="btn btn-outline-primary btn-sm w-100"
                    >
                      View
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : !loading && (
          <p className="text-muted text-center mb-0">
            No recommendations available at the moment.
          </p>
        )}
        
        <div className="mt-2">
          <small className="text-muted">
            💡 <strong>Note:</strong> This uses a simple rule-based algorithm. 
            In production, this would be replaced with a sophisticated ML model analyzing your purchase history, 
            browsing behavior, and similar user preferences.
          </small>
        </div>
      </div>
    </div>
  );
};

export default RecommendationPanel;
