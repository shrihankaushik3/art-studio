import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ activeTab, setActiveTab }) {
  const { user, logout, isAdmin, isCustomer } = useAuth();

  return (
    <header className="navbar">
      <div className="nav-container">
        <div className="brand" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('paintings')}>
          <div className="brand-icon">A</div>
          <span className="brand-title">Art Studio</span>
        </div>

        <nav>
          <ul className="nav-links">
            <li>
              <button
                className={`nav-link ${activeTab === 'paintings' ? 'active' : ''}`}
                onClick={() => setActiveTab('paintings')}
              >
                Paintings
              </button>
            </li>
            <li>
              <button
                className={`nav-link ${activeTab === 'wall-bookings' ? 'active' : ''}`}
                onClick={() => setActiveTab('wall-bookings')}
              >
                Wall Bookings
              </button>
            </li>
            <li>
              <button
                className={`nav-link ${activeTab === 'pottery' ? 'active' : ''}`}
                onClick={() => setActiveTab('pottery')}
              >
                Custom Pottery
              </button>
            </li>

            {isCustomer && (
              <li>
                <button
                  className={`nav-link ${activeTab === 'my-orders' ? 'active' : ''}`}
                  onClick={() => setActiveTab('my-orders')}
                >
                  My Orders
                </button>
              </li>
            )}

            {isAdmin && (
              <li>
                <button
                  className={`nav-link ${activeTab === 'admin' ? 'active' : ''}`}
                  onClick={() => setActiveTab('admin')}
                >
                  Studio Management
                </button>
              </li>
            )}
          </ul>
        </nav>

        <div className="nav-actions">
          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span className="user-badge">
                <span>{user.email}</span>
                <span className={`role-tag ${user.role}`}>{user.role}</span>
              </span>
              <button className="btn btn-secondary btn-sm" onClick={logout}>
                Logout
              </button>
            </div>
          ) : (
            <button
              className={`btn btn-primary btn-sm`}
              onClick={() => setActiveTab('auth')}
            >
              Sign In / Register
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
