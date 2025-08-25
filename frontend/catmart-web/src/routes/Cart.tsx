import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useCartStore } from '../store/cart';
import { useAuthStore } from '../store/auth';
import { goApiClient } from '../api/goClient';

const Cart: React.FC = () => {
  const navigate = useNavigate();
  const { items, removeItem, updateQuantity, clearCart, getTotal } = useCartStore();
  const { user, token } = useAuthStore();

  const total = getTotal();

  const handleQuantityChange = (id: string, newQuantity: number) => {
    if (newQuantity < 1) {
      removeItem(id);
    } else {
      updateQuantity(id, newQuantity);
    }
  };

  const handleCheckout = async () => {
    if (!user || !token) {
      alert('Please login to checkout');
      navigate('/profile');
      return;
    }

    if (items.length === 0) {
      alert('Your cart is empty');
      return;
    }

    try {
      const orderData = {
        items: items.map(item => ({
          productId: item.id,
          qty: item.quantity
        }))
      };

      const result = await goApiClient.createOrder(orderData, token);
      
      alert(`Order created successfully! Order ID: ${result.orderId.substring(0, 8)}...`);
      clearCart();
      navigate('/orders');
    } catch (error) {
      console.error('Checkout failed:', error);
      alert('Failed to create order. Please try again.');
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="card">
            <div className="card-body py-5">
              <h2 className="card-title">🛒 Your Cart is Empty</h2>
              <p className="card-text text-muted">
                Looks like you haven't added any items to your cart yet.
              </p>
              <button 
                className="btn btn-primary btn-lg"
                onClick={() => navigate('/')}
              >
                Start Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h1 className="mb-4">🛒 Shopping Cart</h1>
      
      <div className="row">
        <div className="col-lg-8">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Cart Items ({items.length})</h5>
              <button 
                className="btn btn-outline-danger btn-sm"
                onClick={clearCart}
              >
                Clear Cart
              </button>
            </div>
            <div className="card-body p-0">
              {items.map((item) => (
                <div key={item.id} className="row align-items-center p-3 border-bottom">
                  <div className="col-md-2 col-3">
                    <img 
                      src={item.image} 
                      alt={item.title}
                      className="img-fluid rounded"
                      style={{ maxHeight: '80px', objectFit: 'cover' }}
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/80x80?text=Product';
                      }}
                    />
                  </div>
                  
                  <div className="col-md-4 col-9">
                    <h6 className="mb-1">{item.title}</h6>
                    <p className="text-success mb-0">${item.price.toFixed(2)} each</p>
                  </div>
                  
                  <div className="col-md-3 col-6 mt-2 mt-md-0">
                    <div className="input-group">
                      <button 
                        className="btn btn-outline-secondary"
                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                      >
                        -
                      </button>
                      <span className="form-control text-center">{item.quantity}</span>
                      <button 
                        className="btn btn-outline-secondary"
                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                  
                  <div className="col-md-2 col-4 mt-2 mt-md-0 text-md-end">
                    <strong>${(item.price * item.quantity).toFixed(2)}</strong>
                  </div>
                  
                  <div className="col-md-1 col-2 mt-2 mt-md-0 text-end">
                    <button 
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => removeItem(item.id)}
                      title="Remove item"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        <div className="col-lg-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Order Summary</h5>
            </div>
            <div className="card-body">
              <div className="d-flex justify-content-between mb-2">
                <span>Items ({items.reduce((sum, item) => sum + item.quantity, 0)}):</span>
                <span>${total.toFixed(2)}</span>
              </div>
              
              <div className="d-flex justify-content-between mb-2">
                <span>Shipping:</span>
                <span className="text-success">FREE</span>
              </div>
              
              <div className="d-flex justify-content-between mb-2">
                <span>Tax:</span>
                <span>${(total * 0.08).toFixed(2)}</span>
              </div>
              
              <hr />
              
              <div className="d-flex justify-content-between mb-3">
                <strong>Total:</strong>
                <strong className="text-success">${(total * 1.08).toFixed(2)}</strong>
              </div>
              
              {!user ? (
                <div className="alert alert-info">
                  <small>Please login to checkout</small>
                </div>
              ) : null}
              
              <div className="d-grid gap-2">
                <button 
                  className="btn btn-success btn-lg"
                  onClick={handleCheckout}
                  disabled={!user || !token}
                >
                  {user ? 'Proceed to Checkout' : 'Login to Checkout'}
                </button>
                
                <button 
                  className="btn btn-outline-primary"
                  onClick={() => navigate('/')}
                >
                  Continue Shopping
                </button>
              </div>
            </div>
          </div>
          
          {/* Checkout Info */}
          <div className="card mt-3">
            <div className="card-body">
              <h6>✅ Free Shipping</h6>
              <p className="small text-muted mb-2">On all orders over $25</p>
              
              <h6>🔒 Secure Checkout</h6>
              <p className="small text-muted mb-2">Your payment info is safe</p>
              
              <h6>📦 Fast Delivery</h6>
              <p className="small text-muted mb-0">2-3 business days</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
