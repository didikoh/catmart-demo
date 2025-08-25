import React, { useEffect, useState } from 'react';
import ProductCard from '../components/ProductCard';
import RecommendationPanel from '../components/RecommendationPanel';
import { goApiClient, Product } from '../api/goClient';

const Home: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const categories = ['food', 'toys', 'accessories'];

  useEffect(() => {
    fetchProducts();
  }, [searchQuery, selectedCategory]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await goApiClient.getProducts(
        searchQuery || undefined, 
        selectedCategory || undefined
      );
      setProducts(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Search is already triggered by useEffect when searchQuery changes
  };

  return (
    <div className="container mt-4">
      {/* Header */}
      <div className="row mb-4">
        <div className="col-12 text-center">
          <h1 className="display-4 text-primary mb-3">🐱 Welcome to CatMart</h1>
          <p className="lead text-muted">Your one-stop shop for premium cat products</p>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="row mb-4">
        <div className="col-md-8">
          <form onSubmit={handleSearch} className="d-flex">
            <input
              type="text"
              className="form-control me-2"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="btn btn-outline-primary" type="submit">
              Search
            </button>
          </form>
        </div>
        <div className="col-md-4">
          <select
            className="form-select"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Recommendations Panel */}
      <div className="row mb-4">
        <div className="col-12">
          <RecommendationPanel />
        </div>
      </div>

      {/* Products Grid */}
      <div className="row">
        {loading ? (
          <div className="col-12 text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading products...</p>
          </div>
        ) : error ? (
          <div className="col-12">
            <div className="alert alert-danger" role="alert">
              <h4 className="alert-heading">Oops!</h4>
              <p>{error}</p>
              <button className="btn btn-outline-danger" onClick={fetchProducts}>
                Try Again
              </button>
            </div>
          </div>
        ) : products.length === 0 ? (
          <div className="col-12 text-center">
            <div className="alert alert-info">
              <h4>No products found</h4>
              <p>Try adjusting your search or category filter.</p>
            </div>
          </div>
        ) : (
          products.map((product) => (
            <div key={product.id} className="col-lg-3 col-md-4 col-sm-6 mb-4">
              <ProductCard product={product} />
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="row mt-5">
        <div className="col-12 text-center text-muted">
          <hr />
          <p>CatMart Demo - Built with React, Go, and Python</p>
        </div>
      </div>
    </div>
  );
};

export default Home;
