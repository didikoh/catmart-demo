import React from 'react';
import { Link } from 'react-router-dom';
import { useCartStore } from '../store/cart';
import { Product } from '../api/goClient';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { addItem } = useCartStore();

  const handleAddToCart = () => {
    addItem({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.image
    });
  };

  return (
    <div className="card h-100 shadow-sm">
      <img 
        src={product.image} 
        className="card-img-top" 
        alt={product.title}
        style={{ height: '200px', objectFit: 'cover' }}
        onError={(e) => {
          e.currentTarget.src = 'https://via.placeholder.com/300x200?text=Product+Image';
        }}
      />
      <div className="card-body d-flex flex-column">
        <h5 className="card-title">{product.title}</h5>
        <p className="card-text text-muted small flex-grow-1">
          {product.description}
        </p>
        <div className="d-flex justify-content-between align-items-center mt-auto">
          <span className="h5 text-success mb-0">${product.price.toFixed(2)}</span>
          <span className="badge bg-secondary">{product.category}</span>
        </div>
        <div className="mt-3">
          <div className="btn-group w-100" role="group">
            <Link 
              to={`/product/${product.id}`} 
              className="btn btn-outline-primary btn-sm"
            >
              View
            </Link>
            <button 
              className="btn btn-primary btn-sm"
              onClick={handleAddToCart}
              disabled={product.stock_quantity === 0}
            >
              {product.stock_quantity === 0 ? 'Out of Stock' : 'Add to Cart'}
            </button>
          </div>
        </div>
        {product.stock_quantity > 0 && product.stock_quantity <= 5 && (
          <small className="text-warning mt-1">Only {product.stock_quantity} left!</small>
        )}
      </div>
    </div>
  );
};

export default ProductCard;
