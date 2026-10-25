import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import PaintingsPage from './pages/PaintingsPage';
import WallBookingPage from './pages/WallBookingPage';
import PotteryPage from './pages/PotteryPage';
import MyOrdersPage from './pages/MyOrdersPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import AuthPage from './pages/AuthPage';

function AppContent() {
  const [activeTab, setActiveTab] = useState('paintings');
  const { user, isAdmin, isCustomer } = useAuth();

  return (
    <div className="app-container">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="main-content">
        {activeTab === 'paintings' && (
          <PaintingsPage
            onNavigateToAuth={() => setActiveTab('auth')}
            onNavigateToOrders={() => setActiveTab('my-orders')}
          />
        )}

        {activeTab === 'wall-bookings' && (
          <WallBookingPage
            onNavigateToAuth={() => setActiveTab('auth')}
            onNavigateToOrders={() => setActiveTab('my-orders')}
          />
        )}

        {activeTab === 'pottery' && (
          <PotteryPage
            onNavigateToAuth={() => setActiveTab('auth')}
            onNavigateToOrders={() => setActiveTab('my-orders')}
          />
        )}

        {activeTab === 'my-orders' && (
          isCustomer ? (
            <MyOrdersPage onNavigateToCatalog={() => setActiveTab('paintings')} />
          ) : (
            <AuthPage onSuccess={() => setActiveTab('my-orders')} />
          )
        )}

        {activeTab === 'admin' && (
          isAdmin ? (
            <AdminDashboardPage />
          ) : (
            <AuthPage onSuccess={() => setActiveTab('admin')} />
          )
        )}

        {activeTab === 'auth' && (
          <AuthPage
            onSuccess={() => {
              if (isAdmin) setActiveTab('admin');
              else setActiveTab('paintings');
            }}
          />
        )}
      </main>

      <footer style={{
        marginTop: 'auto',
        borderTop: '1px solid var(--border-light)',
        padding: '2rem 1.5rem',
        background: '#fff',
        textAlign: 'center',
        fontSize: '0.85rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <p style={{ fontWeight: 600, color: 'var(--text-dark)', marginBottom: '0.25rem' }}>
            Art Studio &bull; Handcrafted Heritage Artworks & Ceramic Studio
          </p>
          <p>
            MERN Stack (React + Vite, Node.js + Express, MongoDB + Mongoose, bcryptjs, JWT).
          </p>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
