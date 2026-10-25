import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import Alert from '../components/Alert';

export default function PotteryPage({ onNavigateToAuth, onNavigateToOrders }) {
  const { user } = useAuth();

  const [items, setItems] = useState([]);
  const [glazes, setGlazes] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedItem, setSelectedItem] = useState('');
  const [selectedGlaze, setSelectedGlaze] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [neededByDate, setNeededByDate] = useState('');
  const [notes, setNotes] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Minimum date is 14 days in the future
  const today = new Date();
  const minDateObj = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  const minDateStr = minDateObj.toISOString().split('T')[0];

  useEffect(() => {
    async function loadOptions() {
      setLoading(true);
      try {
        const data = await apiRequest('/pottery/options');
        setItems(data.items || []);
        setGlazes(data.glazes || []);
        if (data.items?.length > 0) setSelectedItem(data.items[0].id);
        if (data.glazes?.length > 0) setSelectedGlaze(data.glazes[0].id);
      } catch (err) {
        setError(err.message || 'Failed to load pottery specifications.');
      } finally {
        setLoading(false);
      }
    }

    loadOptions();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!user) {
      if (onNavigateToAuth) onNavigateToAuth();
      return;
    }

    if (!selectedItem || !selectedGlaze) {
      setError('Please select both a pottery item and an artisan glaze.');
      return;
    }

    const qty = Number(quantity);
    if (!qty || qty < 1 || qty > 12) {
      setError('Quantity must be between 1 and 12 pieces.');
      return;
    }

    if (!neededByDate) {
      setError('Please provide a needed-by date.');
      return;
    }

    setSubmitting(true);
    try {
      const data = await apiRequest('/pottery/requests', {
        method: 'POST',
        body: {
          potteryItemId: selectedItem,
          glazeId: selectedGlaze,
          quantity: qty,
          neededByDate,
          notes: notes.trim()
        }
      });

      setSuccess(`Custom pottery request submitted for ${qty}x ${data.request.potteryItemName} with ${data.request.glazeName} glaze!`);
      setQuantity(1);
      setNeededByDate('');
      setNotes('');
    } catch (err) {
      setError(err.message || 'Failed to submit pottery request.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingSpinner message="Loading pottery and glaze options..." />;
  }

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto' }}>
      <div className="page-header" style={{ textAlign: 'center', display: 'block' }}>
        <h1 className="page-title">Bespoke Terracotta & Studio Pottery</h1>
        <p className="page-subtitle">
          Hand-thrown on traditional potter's wheels, finished with mineral glazes, and kiln-fired to perfection.
        </p>
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      <div className="form-card">
        <div style={{ background: 'var(--primary-light)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          <strong>Pottery Commission Guidelines:</strong>
          <ul style={{ paddingLeft: '1.25rem', marginTop: '0.35rem', color: 'var(--text-dark)' }}>
            <li>Order Size: <strong>1 to 12 pieces</strong> per custom batch.</li>
            <li>Handcrafting & Curing Lead Time: <strong>At least 14 days</strong> from request date.</li>
            <li>Customer Control: You may freely edit or cancel your request anytime while in <strong>Requested</strong> status.</li>
          </ul>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Select Pottery Form</label>
            <select
              className="form-select"
              value={selectedItem}
              onChange={(e) => setSelectedItem(e.target.value)}
              required
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name} ({it.id})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Select Artisan Mineral Glaze</label>
            <select
              className="form-select"
              value={selectedGlaze}
              onChange={(e) => setSelectedGlaze(e.target.value)}
              required
            >
              {glazes.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.id})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Quantity (1 to 12)</label>
            <input
              type="number"
              className="form-input"
              min="1"
              max="12"
              step="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
            <p className="form-helper">Batch size limit: Maximum 12 handcrafted items per request.</p>
          </div>

          <div className="form-group">
            <label className="form-label">Needed-By Date</label>
            <input
              type="date"
              className="form-input"
              min={minDateStr}
              value={neededByDate}
              onChange={(e) => setNeededByDate(e.target.value)}
              required
            />
            <p className="form-helper">Must be at least 14 days in advance (Earliest: {minDateStr}) to permit sun-drying and kiln firing.</p>
          </div>

          <div className="form-group">
            <label className="form-label">Customization Notes (Optional)</label>
            <textarea
              className="form-textarea"
              rows="2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Matte finish, engraved rim, gift packaging..."
            ></textarea>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={submitting}
          >
            {submitting ? 'Submitting Commission...' : user ? 'Submit Pottery Request' : 'Sign In to Request Pottery'}
          </button>
        </form>
      </div>
    </div>
  );
}
