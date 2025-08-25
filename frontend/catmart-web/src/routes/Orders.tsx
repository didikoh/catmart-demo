import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import { goApiClient, Order } from '../api/goClient';

const Orders: React.FC = () => {
  const { user, token } = useAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && token) {
      fetchOrders();
    } else {
      setLoading(false);
    }
  }, [user, token]);

  const fetchOrders = async () => {
    if (!token) return;

    try {
      setLoading(true);
      const data = await goApiClient.getMyOrders(token);
      setOrders(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'bg-success';
      case 'pending': return 'bg-warning';
      case 'cancelled': return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  if (!user) {
    return (
      <div className="container mt-4">
        <div className="text-center">
          <div className="card">
            <div className="card-body py-5">
              <h2 className="card-title">🔐 Please Login</h2>
              <p className="card-text text-muted">
                You need to be logged in to view your orders.
              </p>
              <a href="/profile" className="btn btn-primary btn-lg">
                Login
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1>📦 My Orders</h1>
        {orders.length > 0 && (
          <button className="btn btn-outline-primary" onClick={fetchOrders}>
            Refresh
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading orders...</span>
          </div>
          <p className="mt-2">Loading your orders...</p>
        </div>
      ) : error ? (
        <div className="alert alert-danger">
          <h4>Error Loading Orders</h4>
          <p>{error}</p>
          <button className="btn btn-outline-danger" onClick={fetchOrders}>
            Try Again
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-5">
          <div className="card">
            <div className="card-body">
              <h3>📭 No Orders Yet</h3>
              <p className="text-muted">You haven't placed any orders yet.</p>
              <a href="/" className="btn btn-primary">
                Start Shopping
              </a>
            </div>
          </div>
        </div>
      ) : (
        <div className="row">
          {orders.map((order) => (
            <div key={order.id} className="col-12 mb-4">
              <div className="card">
                <div className="card-header">
                  <div className="row align-items-center">
                    <div className="col-md-3">
                      <h6 className="mb-0">
                        Order #{order.id.substring(0, 8)}...
                      </h6>
                    </div>
                    <div className="col-md-3">
                      <span className={`badge ${getStatusBadgeClass(order.status)}`}>
                        {order.status.toUpperCase()}
                      </span>
                    </div>
                    <div className="col-md-3">
                      <small className="text-muted">
                        {formatDate(order.created_at)}
                      </small>
                    </div>
                    <div className="col-md-3 text-md-end">
                      <h6 className="mb-0 text-success">
                        ${order.total_amount.toFixed(2)}
                      </h6>
                    </div>
                  </div>
                </div>
                
                <div className="card-body">
                  {order.items && order.items.length > 0 ? (
                    <div className="row">
                      {order.items.map((item) => (
                        <div key={item.id} className="col-md-6 col-lg-4 mb-3">
                          <div className="d-flex align-items-center">
                            {item.product?.image && (
                              <img 
                                src={item.product.image} 
                                alt={item.product.title}
                                className="rounded me-3"
                                style={{ width: '60px', height: '60px', objectFit: 'cover' }}
                                onError={(e) => {
                                  e.currentTarget.src = 'https://via.placeholder.com/60x60?text=Product';
                                }}
                              />
                            )}
                            <div className="flex-grow-1">
                              <h6 className="mb-1">
                                {item.product?.title || 'Product'}
                              </h6>
                              <p className="mb-0 small text-muted">
                                Qty: {item.quantity} × ${item.price.toFixed(2)}
                              </p>
                              <p className="mb-0 small text-success">
                                <strong>${(item.quantity * item.price).toFixed(2)}</strong>
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted">No items found for this order.</p>
                  )}
                </div>
                
                <div className="card-footer bg-light">
                  <div className="row align-items-center">
                    <div className="col-md-6">
                      <small className="text-muted">
                        Items: {order.items?.length || 0} | 
                        Total: ${order.total_amount.toFixed(2)}
                      </small>
                    </div>
                    <div className="col-md-6 text-md-end">
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-outline-primary" disabled>
                          View Details
                        </button>
                        {order.status === 'pending' && (
                          <button className="btn btn-outline-secondary" disabled>
                            Cancel Order
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {orders.length > 0 && (
        <div className="text-center mt-4 py-3">
          <small className="text-muted">
            Showing {orders.length} order{orders.length !== 1 ? 's' : ''}
          </small>
        </div>
      )}
    </div>
  );
};

export default Orders;
