import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { goApiClient, Product } from '../api/goClient';
import { useCartStore } from '../store/cart';

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addItem } = useCartStore();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (id) {
      fetchProduct(id);
    }
  }, [id]);

  const fetchProduct = async (productId: string) => {
    try {
      setLoading(true);
      const data = await goApiClient.getProduct(productId);
      setProduct(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Product not found');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    
    for (let i = 0; i < quantity; i++) {
      addItem({
        id: product.id,
        title: product.title,
        price: product.price,
        image: product.image
      });
    }
    
    // Show success message or navigate to cart
    alert(`Added ${quantity} ${product.title}(s) to cart!`);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    navigate('/cart');
  };

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger">
          <h4>Product Not Found</h4>
          <p>{error || 'The requested product could not be found.'}</p>
          <button className="btn btn-primary" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <nav aria-label="breadcrumb">
        <ol className="breadcrumb">
          <li className="breadcrumb-item">
            <button className="btn btn-link p-0" onClick={() => navigate('/')}>
              Home
            </button>
          </li>
          <li className="breadcrumb-item">
            <span className="text-capitalize">{product.category}</span>
          </li>
          <li className="breadcrumb-item active" aria-current="page">
            {product.title}
          </li>
        </ol>
      </nav>

      <div className="row">
        <div className="col-md-6">
          <img 
            src={product.image} 
            alt={product.title}
            className="img-fluid rounded shadow"
            onError={(e) => {
              e.currentTarget.src = 'https://via.placeholder.com/500x400?text=Product+Image';
            }}
          />
        </div>
        
        <div className="col-md-6">
          <div className="product-details">
            <span className="badge bg-secondary mb-2 text-capitalize">
              {product.category}
            </span>
            
            <h1 className="display-5">{product.title}</h1>
            
            <p className="lead text-muted">{product.description}</p>
            
            <div className="price-section mb-4">
              <h2 className="text-success">${product.price.toFixed(2)}</h2>
            </div>
            
            <div className="stock-info mb-3">
              {product.stock_quantity > 0 ? (
                <>
                  <span className="text-success">✓ In Stock</span>
                  {product.stock_quantity <= 5 && (
                    <small className="text-warning d-block">
                      Only {product.stock_quantity} left!
                    </small>
                  )}
                </>
              ) : (
                <span className="text-danger">✗ Out of Stock</span>
              )}
            </div>
            
            {product.stock_quantity > 0 && (
              <div className="purchase-section">
                <div className="row align-items-center mb-3">
                  <div className="col-auto">
                    <label htmlFor="quantity" className="form-label">Quantity:</label>
                  </div>
                  <div className="col-auto">
                    <select 
                      id="quantity"
                      className="form-select" 
                      value={quantity} 
                      onChange={(e) => setQuantity(parseInt(e.target.value))}
                      style={{ width: '80px' }}
                    >
                      {[...Array(Math.min(product.stock_quantity, 10))].map((_, i) => (
                        <option key={i + 1} value={i + 1}>{i + 1}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col">
                    <small className="text-muted">
                      Total: ${(product.price * quantity).toFixed(2)}
                    </small>
                  </div>
                </div>
                
                <div className="d-grid gap-2 d-md-flex">
                  <button 
                    className="btn btn-primary btn-lg flex-md-fill"
                    onClick={handleAddToCart}
                  >
                    Add to Cart
                  </button>
                  <button 
                    className="btn btn-success btn-lg flex-md-fill"
                    onClick={handleBuyNow}
                  >
                    Buy Now
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Additional product information */}
      <div className="row mt-5">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5>Product Information</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <h6>Details</h6>
                  <ul className="list-unstyled">
                    <li><strong>Category:</strong> <span className="text-capitalize">{product.category}</span></li>
                    <li><strong>Price:</strong> ${product.price.toFixed(2)}</li>
                    <li><strong>Availability:</strong> {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of stock'}</li>
                  </ul>
                </div>
                <div className="col-md-6">
                  <h6>Description</h6>
                  <p>{product.description}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
