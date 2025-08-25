import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../store/auth';
import { goApiClient } from '../api/goClient';
import { pyApiClient, SalesReportResponse } from '../api/pyClient';

const Profile: React.FC = () => {
  const { user, login, logout } = useAuthStore();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Sales report state
  const [reportLoading, setReportLoading] = useState(false);
  const [reportData, setReportData] = useState<SalesReportResponse | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      if (isLogin) {
        const response = await goApiClient.login(email, password);
        login(response.token, response.user);
        setSuccess('Login successful!');
      } else {
        await goApiClient.register(email, password);
        setSuccess('Registration successful! Please login.');
        setIsLogin(true);
      }
      
      setEmail('');
      setPassword('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    setEmail('');
    setPassword('');
    setSuccess('Logged out successfully!');
  };

  const generateSalesReport = async (range: '7d' | '30d') => {
    setReportLoading(true);
    try {
      const report = await pyApiClient.generateSalesReport(range);
      setReportData(report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setReportLoading(false);
    }
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => {
        setError(null);
        setSuccess(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  if (user) {
    return (
      <div className="container mt-4">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card">
              <div className="card-header">
                <h4>👋 Welcome, {user.email}!</h4>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6>Account Information</h6>
                    <p><strong>Email:</strong> {user.email}</p>
                    <p><strong>Member Since:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
                    
                    <div className="d-grid gap-2">
                      <a href="/orders" className="btn btn-primary">
                        📦 View My Orders
                      </a>
                      <a href="/cart" className="btn btn-outline-primary">
                        🛒 View Cart
                      </a>
                      <button className="btn btn-outline-danger" onClick={handleLogout}>
                        🚪 Logout
                      </button>
                    </div>
                  </div>
                  
                  <div className="col-md-6">
                    <h6>📊 Sales Reports <small className="text-muted">(Demo Feature)</small></h6>
                    <p className="small text-muted">
                      Generate sales analytics reports with charts. This demonstrates the ML/Analytics service integration.
                    </p>
                    
                    <div className="d-grid gap-2">
                      <button 
                        className="btn btn-info btn-sm"
                        onClick={() => generateSalesReport('7d')}
                        disabled={reportLoading}
                      >
                        📈 7-Day Report
                      </button>
                      <button 
                        className="btn btn-info btn-sm"
                        onClick={() => generateSalesReport('30d')}
                        disabled={reportLoading}
                      >
                        📈 30-Day Report
                      </button>
                    </div>
                    
                    {reportLoading && (
                      <div className="text-center mt-2">
                        <div className="spinner-border spinner-border-sm" role="status">
                          <span className="visually-hidden">Generating report...</span>
                        </div>
                        <small className="d-block">Generating report...</small>
                      </div>
                    )}
                    
                    {reportData && (
                      <div className="mt-3 p-3 bg-light rounded">
                        <h6>📋 Latest Report ({reportData.range})</h6>
                        <p className="small mb-2">
                          <strong>Total Sales:</strong> ${reportData.totalSales.toFixed(2)}<br />
                          <strong>Total Orders:</strong> {reportData.totalOrders}
                        </p>
                        <div className="d-grid gap-1">
                          <a 
                            href={pyApiClient.getStaticUrl(reportData.csvUrl)} 
                            className="btn btn-outline-success btn-sm"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            📄 Download CSV
                          </a>
                          <a 
                            href={pyApiClient.getStaticUrl(reportData.pngUrl)} 
                            className="btn btn-outline-info btn-sm"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            📊 View Chart
                          </a>
                        </div>
                        <small className="text-muted d-block mt-2">
                          Generated: {new Date(reportData.generatedAt).toLocaleString()}
                        </small>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Display messages */}
            {error && (
              <div className="alert alert-danger mt-3" role="alert">
                {error}
              </div>
            )}
            {success && (
              <div className="alert alert-success mt-3" role="alert">
                {success}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header text-center">
              <h4>{isLogin ? '🔐 Login' : '📝 Register'}</h4>
              <p className="mb-0 text-muted">
                {isLogin ? 'Access your CatMart account' : 'Create a new account'}
              </p>
            </div>
            
            <div className="card-body">
              {/* Toggle between Login/Register */}
              <div className="text-center mb-4">
                <div className="btn-group" role="group">
                  <button
                    className={`btn ${isLogin ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => {
                      setIsLogin(true);
                      setError(null);
                      setSuccess(null);
                    }}
                  >
                    Login
                  </button>
                  <button
                    className={`btn ${!isLogin ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => {
                      setIsLogin(false);
                      setError(null);
                      setSuccess(null);
                    }}
                  >
                    Register
                  </button>
                </div>
              </div>

              {/* Login/Register Form */}
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    Email address
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Enter your email"
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="password" className="form-label">
                    Password
                  </label>
                  <input
                    type="password"
                    className="form-control"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="Enter your password"
                    minLength={6}
                  />
                  {!isLogin && (
                    <div className="form-text">
                      Password must be at least 6 characters long.
                    </div>
                  )}
                </div>

                <div className="d-grid">
                  <button
                    type="submit"
                    className={`btn btn-${isLogin ? 'primary' : 'success'} btn-lg`}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </span>
                        {isLogin ? 'Logging in...' : 'Registering...'}
                      </>
                    ) : (
                      isLogin ? '🔐 Login' : '📝 Register'
                    )}
                  </button>
                </div>
              </form>

              {/* Demo account info */}
              <div className="mt-4 p-3 bg-light rounded">
                <h6>🧪 Demo Account</h6>
                <p className="small mb-2">
                  For testing, you can use:
                </p>
                <p className="small mb-0">
                  <strong>Email:</strong> demo@catmart.com<br />
                  <strong>Password:</strong> demo123
                </p>
                <p className="small text-muted mt-2 mb-0">
                  Or register a new account with any email.
                </p>
              </div>
            </div>
          </div>

          {/* Display messages */}
          {error && (
            <div className="alert alert-danger mt-3" role="alert">
              {error}
            </div>
          )}
          {success && (
            <div className="alert alert-success mt-3" role="alert">
              {success}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
