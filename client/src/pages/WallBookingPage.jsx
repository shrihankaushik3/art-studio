import React, { useState } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';

export default function WallBookingPage({ onNavigateToAuth, onNavigateToOrders }) {
  const { user } = useAuth();

  // Calculate minimum and maximum allowed booking dates (7 to 90 days in the future)
  const today = new Date();
  const minDateObj = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const maxDateObj = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);

  const minDateStr = minDateObj.toISOString().split('T')[0];
  const maxDateStr = maxDateObj.toISOString().split('T')[0];

  const RATE_PER_SQFT = 150; // INR

  const [date, setDate] = useState('');
  const [areaSqFt, setAreaSqFt] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const calculatedPrice = areaSqFt && Number(areaSqFt) >= 10 && Number(areaSqFt) <= 500
    ? Number(areaSqFt) * RATE_PER_SQFT
    : 0;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!user) {
      if (onNavigateToAuth) onNavigateToAuth();
      return;
    }

    if (!date) {
      setError('Please pick a booking date.');
      return;
    }

    const area = Number(areaSqFt);
    if (!area || area < 10 || area > 500) {
      setError('Wall area must be between 10 and 500 square feet.');
      return;
    }

    if (!address.trim()) {
      setError('Service address is required for wall bookings.');
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiRequest('/bookings', {
        method: 'POST',
        body: {
          date,
          areaSqFt: area,
          address: address.trim(),
          notes: notes.trim()
        }
      });

      setSuccess(`Wall mural booked for ${date} (${area} sq ft). Total: ₹${data.booking.price.toLocaleString('en-IN')}. Our artists will review and confirm.`);
      setDate('');
      setAreaSqFt('');
      setAddress('');
      setNotes('');
    } catch (err) {
      setError(err.message || 'Failed to submit wall booking request.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div className="page-header" style={{ textAlign: 'center', display: 'block' }}>
        <h1 className="page-title">Hand-Painted Wall Murals</h1>
        <p className="page-subtitle">
          Transform your home, office, or cafe with custom folk art, Pichwai, Kerala mural, or Warli art painted directly on your wall.
        </p>
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div className="form-card">
        <div style={{ background: 'var(--primary-light)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          <strong>Mural Booking Guidelines:</strong>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.35rem', color: 'var(--text-dark)' }}>
            <li>Standard Studio Rate: <strong>₹{RATE_PER_SQFT} per sq. ft.</strong></li>
            <li>Allowed Area: <strong>10 to 500 sq. ft.</strong></li>
            <li>Advance Notice: <strong>7 to 90 days</strong> in the future.</li>
            <li>Cancellation: Allowed freely up to <strong>3 days prior</strong> to scheduled date.</li>
            <li>Single Slot: Each calendar date supports at most <strong>one active studio team booking</strong>.</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Desired Mural Date</label>
            <input
              type="date"
              className="form-input"
              min={minDateStr}
              max={maxDateStr}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <p className="form-helper">
              Allowed date range: {minDateStr} to {maxDateStr} (7–90 days ahead)
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Estimated Wall Area (Square Feet)</label>
            <input
              type="number"
              className="form-input"
              min="10"
              max="500"
              step="1"
              value={areaSqFt}
              onChange={(e) => setAreaSqFt(e.target.value)}
              placeholder="e.g. 50"
              required
            />
            <p className="form-helper">Enter dimensions between 10 and 500 sq ft.</p>
          </div>

          {calculatedPrice > 0 && (
            <div style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 'var(--radius-sm)',
              padding: '1rem',
              marginBottom: '1.25rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Estimated Pricing Breakdown</div>
                <div style={{ fontSize: '0.95rem' }}>{areaSqFt} sq ft &times; ₹{RATE_PER_SQFT}/sq ft</div>
              </div>
              <div style={{ fontSize: '1.35rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                ₹{calculatedPrice.toLocaleString('en-IN')}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Site / Service Address</label>
            <textarea
              className="form-textarea"
              rows="3"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full physical address where the mural will be painted..."
              required
            ></textarea>
          </div>

          <div className="form-group">
            <label className="form-label">Artistic Preferences or Notes (Optional)</label>
            <textarea
              className="form-textarea"
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe requested motifs (e.g. Lotus pond, Warli tribal dance, Peacock theme)..."
            ></textarea>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={submitting}
          >
            {submitting ? 'Verifying & Submitting...' : user ? 'Book Mural Date' : 'Sign In to Book Mural'}
          </button>
        </form>
      </div>
    </div>
  );
}
