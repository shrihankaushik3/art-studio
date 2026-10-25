import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Alert from '../components/Alert';

export default function MyOrdersPage({ onNavigateToCatalog }) {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('paintings');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [orders, setOrders] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [potteryRequests, setPotteryRequests] = useState([]);

  // Pottery Edit Modal
  const [editingPottery, setEditingPottery] = useState(null);
  const [editQty, setEditQty] = useState(1);
  const [editDate, setEditDate] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    loadCustomerData();
  }, []);

  async function loadCustomerData() {
    setLoading(true);
    setError('');
    try {
      const [orderRes, bookingRes, potteryRes] = await Promise.all([
        apiRequest('/paintings/orders/my'),
        apiRequest('/bookings/my'),
        apiRequest('/pottery/requests/my')
      ]);

      setOrders(orderRes.orders || []);
      setBookings(bookingRes.bookings || []);
      setPotteryRequests(potteryRes.requests || []);
    } catch (err) {
      setError(err.message || 'Failed to load your orders.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelOrder(orderId) {
    if (!window.confirm('Are you sure you want to cancel this painting purchase? The painting will return to available status for other buyers.')) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      await apiRequest(`/paintings/orders/${orderId}/cancel`, { method: 'POST' });
      setSuccess('Painting order cancelled successfully.');
      await loadCustomerData();
    } catch (err) {
      setError(err.message || 'Could not cancel painting order.');
    }
  }

  async function handleCancelBooking(bookingId, bookingDate) {
    if (!window.confirm(`Are you sure you want to cancel your wall booking for ${bookingDate}?`)) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      await apiRequest(`/bookings/${bookingId}/cancel`, { method: 'POST' });
      setSuccess('Wall booking cancelled successfully. The reserved date is now released.');
      await loadCustomerData();
    } catch (err) {
      setError(err.message || 'Could not cancel wall booking.');
    }
  }

  async function handleCancelPottery(requestId) {
    if (!window.confirm('Are you sure you want to cancel this custom pottery commission?')) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      await apiRequest(`/pottery/requests/${requestId}/cancel`, { method: 'POST' });
      setSuccess('Pottery request cancelled successfully.');
      await loadCustomerData();
    } catch (err) {
      setError(err.message || 'Could not cancel pottery request.');
    }
  }

  function openPotteryEdit(req) {
    setEditingPottery(req);
    setEditQty(req.quantity);
    setEditDate(req.neededByDate);
    setEditNotes(req.notes || '');
  }

  async function handleSavePotteryEdit(e) {
    e.preventDefault();
    if (!editingPottery) return;

    setEditLoading(true);
    setError('');
    try {
      await apiRequest(`/pottery/requests/${editingPottery._id}`, {
        method: 'PUT',
        body: {
          quantity: Number(editQty),
          neededByDate: editDate,
          notes: editNotes.trim()
        }
      });
      setSuccess('Pottery request updated successfully.');
      setEditingPottery(null);
      await loadCustomerData();
    } catch (err) {
      setError(err.message || 'Failed to update pottery request.');
    } finally {
      setEditLoading(false);
    }
  }

  // Calculate earliest allowed date for pottery editing (14 days ahead)
  const minPotteryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Orders & Commissions</h1>
          <p className="page-subtitle">
            Manage your purchases, wall bookings, and custom pottery commissions.
          </p>
        </div>
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'paintings' ? 'active' : ''}`}
          onClick={() => setActiveTab('paintings')}
        >
          Paintings ({orders.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'bookings' ? 'active' : ''}`}
          onClick={() => setActiveTab('bookings')}
        >
          Wall Murals ({bookings.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'pottery' ? 'active' : ''}`}
          onClick={() => setActiveTab('pottery')}
        >
          Custom Pottery ({potteryRequests.length})
        </button>
      </div>

      {loading ? (
        <LoadingSpinner message="Fetching your orders and requests..." />
      ) : (
        <>
          {/* TAB 1: PAINTINGS */}
          {activeTab === 'paintings' && (
            orders.length === 0 ? (
              <EmptyState
                title="No painting purchases yet"
                description="Explore our gallery of traditional paintings and find something you love."
                action={
                  <button className="btn btn-primary" onClick={onNavigateToCatalog}>
                    Browse Paintings Catalog
                  </button>
                }
              />
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th>Painting Title</th>
                      <th>Price</th>
                      <th>Date Placed</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o._id}>
                        <td><code>{o._id.slice(-6)}</code></td>
                        <td><strong>{o.paintingTitle}</strong> ({o.paintingId})</td>
                        <td>₹{o.price.toLocaleString('en-IN')}</td>
                        <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                        <td>
                          <span className={`badge badge-${o.status}`}>
                            {o.status}
                          </span>
                        </td>
                        <td>
                          {o.status === 'placed' && (
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleCancelOrder(o._id)}
                            >
                              Cancel Order
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* TAB 2: WALL BOOKINGS */}
          {activeTab === 'bookings' && (
            bookings.length === 0 ? (
              <EmptyState
                title="No wall bookings found"
                description="Book a dedicated studio artist to paint an original mural on your wall."
              />
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Booking Date</th>
                      <th>Area (Sq Ft)</th>
                      <th>Total Price</th>
                      <th>Site Address</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => {
                      const isCancelled = b.status === 'cancelled';
                      const isDeclined = b.status === 'declined';
                      const canCancel = !isCancelled && !isDeclined;

                      return (
                        <tr key={b._id}>
                          <td><strong>{b.date}</strong></td>
                          <td>{b.areaSqFt} sq ft</td>
                          <td>₹{b.price.toLocaleString('en-IN')}</td>
                          <td style={{ maxWidth: '250px' }}>{b.address}</td>
                          <td>
                            <span className={`badge badge-${b.status}`}>
                              {b.status}
                            </span>
                          </td>
                          <td>
                            {canCancel && (
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleCancelBooking(b._id, b.date)}
                                title="Allowed up to 3 days prior to the date"
                              >
                                Cancel Booking
                              </button>
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

          {/* TAB 3: CUSTOM POTTERY */}
          {activeTab === 'pottery' && (
            potteryRequests.length === 0 ? (
              <EmptyState
                title="No pottery commissions"
                description="Choose handcrafted terracotta pieces with traditional glazes."
              />
            ) : (
              <div className="table-responsive">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Item Form</th>
                      <th>Glaze</th>
                      <th>Quantity</th>
                      <th>Needed By</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {potteryRequests.map((p) => {
                      const isRequested = p.status === 'requested';

                      return (
                        <tr key={p._id}>
                          <td><strong>{p.potteryItemName}</strong></td>
                          <td>{p.glazeName}</td>
                          <td>{p.quantity} pcs</td>
                          <td>{p.neededByDate}</td>
                          <td>
                            <span className={`badge badge-${p.status}`}>
                              {p.status}
                            </span>
                          </td>
                          <td>
                            {isRequested ? (
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => openPotteryEdit(p)}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleCancelPottery(p._id)}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                Locked ({p.status})
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
        </>
      )}

      {/* Edit Pottery Modal */}
      {editingPottery && (
        <div className="modal-overlay" onClick={() => setEditingPottery(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Pottery Commission</h3>
              <button onClick={() => setEditingPottery(null)}>&times;</button>
            </div>

            <form onSubmit={handleSavePotteryEdit}>
              <div className="form-group">
                <label className="form-label">Item & Glaze</label>
                <input
                  type="text"
                  className="form-input"
                  value={`${editingPottery.potteryItemName} + ${editingPottery.glazeName}`}
                  disabled
                />
              </div>

              <div className="form-group">
                <label className="form-label">Quantity (1–12)</label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="12"
                  value={editQty}
                  onChange={(e) => setEditQty(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Needed-By Date</label>
                <input
                  type="date"
                  className="form-input"
                  min={minPotteryDate}
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  required
                />
                <p className="form-helper">Must be at least 14 days in advance.</p>
              </div>

              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-textarea"
                  rows="2"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                ></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingPottery(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={editLoading}
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
