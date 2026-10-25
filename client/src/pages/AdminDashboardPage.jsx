import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Alert from '../components/Alert';

export default function AdminDashboardPage() {
  const [activeTab, setActiveTab] = useState('bookings');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [bookings, setBookings] = useState([]);
  const [potteryRequests, setPotteryRequests] = useState([]);
  const [allOrders, setAllOrders] = useState([]);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  useEffect(() => {
    loadAdminData();
  }, []);

  async function loadAdminData() {
    setLoading(true);
    setError('');
    try {
      const [bookRes, potRes, ordRes] = await Promise.all([
        apiRequest('/bookings/all'),
        apiRequest('/pottery/requests/all'),
        apiRequest('/paintings/orders/all')
      ]);

      setBookings(bookRes.bookings || []);
      setPotteryRequests(potRes.requests || []);
      setAllOrders(ordRes.orders || []);
    } catch (err) {
      setError(err.message || 'Failed to load studio management data.');
    } finally {
      setLoading(false);
    }
  }

  async function handleBookingStatus(bookingId, newStatus) {
    setActionLoadingId(bookingId);
    setError('');
    setSuccess('');
    try {
      await apiRequest(`/bookings/${bookingId}/status`, {
        method: 'PATCH',
        body: { status: newStatus }
      });
      setSuccess(`Booking status marked as "${newStatus}".`);
      await loadAdminData();
    } catch (err) {
      setError(err.message || 'Failed to update booking status.');
    } finally {
      setActionLoadingId(null);
    }
  }

  async function handlePotteryStatus(requestId, newStatus) {
    setActionLoadingId(requestId);
    setError('');
    setSuccess('');
    try {
      await apiRequest(`/pottery/requests/${requestId}/status`, {
        method: 'PATCH',
        body: { status: newStatus }
      });
      setSuccess(`Pottery request marked as "${newStatus}".`);
      await loadAdminData();
    } catch (err) {
      setError(err.message || 'Failed to update pottery status.');
    } finally {
      setActionLoadingId(null);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Studio Administration</h1>
          <p className="page-subtitle">
            Review wall mural dates, evaluate pottery commissions, and audit painting purchases.
          </p>
        </div>
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          Wall Bookings ({bookings.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'pottery' ? 'active' : ''}`}
          onClick={() => setActiveTab('pottery')}
        >
          Pottery Commissions ({potteryRequests.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
          onClick={() => setActiveTab('orders')}
        >
          Painting Sales ({allOrders.length})
        </button>
      </div>

      {loading ? (
        <LoadingSpinner message="Loading studio administration records..." />
      ) : (
        <>
          {/* TAB 1: WALL BOOKINGS MANAGEMENT */}
          {activeTab === 'bookings' && (
            bookings.length === 0 ? (
              <EmptyState
                title="No wall bookings found"
                description="Client mural booking requests will appear here."
              />
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Customer</th>
                      <th>Area & Price</th>
                      <th>Address & Notes</th>
                      <th>Status</th>
                      <th>Studio Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => {
                      const isPending = b.status === 'requested';
                      const isBusy = actionLoadingId === b._id;

                      return (
                        <tr key={b._id}>
                          <td><strong>{b.date}</strong></td>
                          <td>
                            <div>{b.customerEmail}</div>
                            <small style={{ color: 'var(--text-muted)' }}><code>{b.customer}</code></small>
                          </td>
                          <td>
                            <div>{b.areaSqFt} sq ft</div>
                            <strong>₹{b.price.toLocaleString('en-IN')}</strong>
                          </td>
                          <td style={{ maxWidth: '280px' }}>
                            <div>{b.address}</div>
                            {b.notes && (
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                                <em>Notes: {b.notes}</em>
                              </div>
                            )}
                          </td>
                          <td>
                            <span className={`badge badge-${b.status}`}>
                              {b.status}
                            </span>
                          </td>
                          <td>
                            {isPending ? (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  className="btn btn-primary btn-sm"
                                  disabled={isBusy}
                                  onClick={() => handleBookingStatus(b._id, 'confirmed')}
                                >
                                  Confirm
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  disabled={isBusy}
                                  onClick={() => handleBookingStatus(b._id, 'declined')}
                                >
                                  Decline
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                {b.status === 'cancelled' ? 'Cancelled by Client' : `Decision: ${b.status}`}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* TAB 2: POTTERY COMMISSIONS MANAGEMENT */}
          {activeTab === 'pottery' && (
            potteryRequests.length === 0 ? (
              <EmptyState
                title="No pottery commissions"
                description="Client custom pottery requests will appear here."
              />
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Form & Glaze</th>
                      <th>Qty</th>
                      <th>Needed By</th>
                      <th>Status</th>
                      <th>Studio Decision</th>
                    </tr>
                  </thead>
                  <tbody>
                    {potteryRequests.map((p) => {
                      const isPending = p.status === 'requested';
                      const isBusy = actionLoadingId === p._id;

                      return (
                        <tr key={p._id}>
                          <td>{p.customerEmail}</td>
                          <td>
                            <strong>{p.potteryItemName}</strong>
                            <div style={{ fontSize: '0.85rem', color: 'var(--secondary)' }}>
                              Glaze: {p.glazeName}
                            </div>
                            {p.notes && (
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Notes: {p.notes}
                              </div>
                            )}
                          </td>
                          <td>{p.quantity} pcs</td>
                          <td>{p.neededByDate}</td>
                          <td>
                            <span className={`badge badge-${p.status}`}>
                              {p.status}
                            </span>
                          </td>
                          <td>
                            {isPending ? (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  className="btn btn-primary btn-sm"
                                  disabled={isBusy}
                                  onClick={() => handlePotteryStatus(p._id, 'accepted')}
                                >
                                  Accept
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  disabled={isBusy}
                                  onClick={() => handlePotteryStatus(p._id, 'declined')}
                                >
                                  Decline
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                {p.status === 'cancelled' ? 'Cancelled by Client' : `Decision: ${p.status}`}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* TAB 3: PAINTING PURCHASES AUDIT */}
          {activeTab === 'orders' && (
            allOrders.length === 0 ? (
              <EmptyState
                title="No painting purchases"
                description="Completed painting orders will be recorded here."
              />
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Customer Email</th>
                      <th>Painting Title</th>
                      <th>Amount</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allOrders.map((o) => (
                      <tr key={o._id}>
                        <td><code>{o._id.slice(-6)}</code></td>
                        <td>{o.customerEmail}</td>
                        <td><strong>{o.paintingTitle}</strong> ({o.paintingId})</td>
                        <td>₹{o.price.toLocaleString('en-IN')}</td>
                        <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge badge-${o.status}`}>
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
