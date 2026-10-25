import React, { useState, useEffect } from 'react';
import { apiRequest } from '../services/api';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';
import Alert from '../components/Alert';

export default function PaintingsPage({ onNavigateToAuth, onNavigateToOrders }) {
  const { user, isAdmin, isCustomer } = useAuth();
  const [paintings, setPaintings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Admin Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingPainting, setEditingPainting] = useState(null);
  const [formData, setFormData] = useState({
    id: '',
    title: '',
    artist: '',
    description: '',
    price: '',
    imageUrl: 'images/p-001.jpg'
  });
  const [modalError, setModalError] = useState('');
  const [modalSubmitting, setModalSubmitting] = useState(false);

  useEffect(() => {
    fetchPaintings();
  }, []);

  async function fetchPaintings() {
    setLoading(true);
    setError('');
    try {
      const data = await apiRequest('/paintings');
      setPaintings(data.paintings || []);
    } catch (err) {
      setError(err.message || 'Failed to load paintings catalog.');
    } finally {
      setLoading(false);
    }
  }

  async function handlePurchase(painting) {
    if (!user) {
      if (onNavigateToAuth) onNavigateToAuth();
      return;
    }

    if (!isCustomer && !isAdmin) {
      setError('Please login as a customer to purchase art.');
      return;
    }

    setActionLoadingId(painting.id);
    setError('');
    setSuccess('');

    try {
      await apiRequest(`/paintings/${painting.id}/purchase`, { method: 'POST' });
      setSuccess(`Congratulations! "${painting.title}" has been purchased. You can view or cancel this order in My Orders.`);
      await fetchPaintings();
    } catch (err) {
      setError(err.message || 'Purchase could not be completed.');
      // Refresh to ensure latest status is shown
      await fetchPaintings();
    } finally {
      setActionLoadingId(null);
    }
  }

  function openCreateModal() {
    setEditingPainting(null);
    setFormData({
      id: `p-${Date.now().toString().slice(-4)}`,
      title: '',
      artist: '',
      description: '',
      price: '',
      imageUrl: 'images/p-001.jpg'
    });
    setModalError('');
    setShowModal(true);
  }

  function openEditModal(painting) {
    if (painting.status === 'sold') {
      setError('Sold paintings cannot be edited.');
      return;
    }
    setEditingPainting(painting);
    setFormData({
      id: painting.id,
      title: painting.title,
      artist: painting.artist,
      description: painting.description,
      price: painting.price,
      imageUrl: painting.imageUrl
    });
    setModalError('');
    setShowModal(true);
  }

  async function handleModalSubmit(e) {
    e.preventDefault();
    setModalError('');
    setModalSubmitting(true);

    try {
      if (editingPainting) {
        await apiRequest(`/paintings/${editingPainting.id}`, {
          method: 'PUT',
          body: {
            title: formData.title,
            artist: formData.artist,
            description: formData.description,
            price: Number(formData.price),
            imageUrl: formData.imageUrl
          }
        });
        setSuccess(`Painting "${formData.title}" updated successfully.`);
      } else {
        await apiRequest('/paintings', {
          method: 'POST',
          body: {
            ...formData,
            price: Number(formData.price)
          }
        });
        setSuccess(`New painting "${formData.title}" created successfully.`);
      }
      setShowModal(false);
      await fetchPaintings();
    } catch (err) {
      setModalError(err.message || 'Operation failed.');
    } finally {
      setModalSubmitting(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Traditional Indian Art Gallery</h1>
          <p className="page-subtitle">
            Authentic handcrafted folk and classical artworks by master artisans across India.
          </p>
        </div>

        {isAdmin && (
          <button className="btn btn-primary" onClick={openCreateModal}>
            + Add New Painting
          </button>
        )}
      </div>

      <Alert type="danger" message={error} onClose={() => setError('')} />
      <Alert type="success" message={success} onClose={() => setSuccess('')} />

      {loading ? (
        <LoadingSpinner message="Curating available artworks..." />
      ) : paintings.length === 0 ? (
        <EmptyState
          title="No paintings available"
          description="There are currently no paintings in the catalog. Check back soon!"
        />
      ) : (
        <div className="grid-cards">
          {paintings.map((painting) => {
            const isSold = painting.status === 'sold';
            const isActionBusy = actionLoadingId === painting.id;

            return (
              <div key={painting.id} className="card">
                <div className="card-img-wrap">
                  <img
                    src={`/${painting.imageUrl}`}
                    alt={painting.title}
                    className="card-img"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://placehold.co/600x400/9b381e/ffffff?text=' + encodeURIComponent(painting.title);
                    }}
                  />
                  <div className="card-badge-pos">
                    <span className={`badge badge-${painting.status}`}>
                      {painting.status}
                    </span>
                  </div>
                </div>

                <div className="card-body">
                  <h3 className="card-title">{painting.title}</h3>
                  <p className="card-artist">By {painting.artist}</p>
                  <p className="card-desc" title={painting.description}>
                    {painting.description}
                  </p>

                  <div className="card-footer">
                    <span className="card-price">
                      ₹{painting.price.toLocaleString('en-IN')}
                    </span>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {isAdmin && (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => openEditModal(painting)}
                          disabled={isSold}
                          title={isSold ? 'Sold paintings cannot be modified' : 'Edit painting details'}
                        >
                          Edit
                        </button>
                      )}

                      {!isAdmin && (
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={isSold || isActionBusy}
                          onClick={() => handlePurchase(painting)}
                        >
                          {isActionBusy ? 'Processing...' : isSold ? 'Sold' : 'Buy Now'}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Admin Modal for Adding / Editing Paintings */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingPainting ? 'Edit Painting Details' : 'Add New Art Piece'}</h3>
              <button
                onClick={() => setShowModal(false)}
                style={{ fontSize: '1.25rem', color: 'var(--text-muted)' }}
              >
                &times;
              </button>
            </div>

            <Alert type="danger" message={modalError} onClose={() => setModalError('')} />

            <form onSubmit={handleModalSubmit}>
              {!editingPainting && (
                <div className="form-group">
                  <label className="form-label">Painting ID</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Warli Festival Dance"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Artist Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.artist}
                  onChange={(e) => setFormData({ ...formData, artist: e.target.value })}
                  placeholder="e.g. Ramesh Varma"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Price (INR)</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="e.g. 12500"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Image Path / URL</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="images/p-001.jpg"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Details about art style, materials used, dimensions..."
                  required
                ></textarea>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={modalSubmitting}
                >
                  {modalSubmitting ? 'Saving...' : editingPainting ? 'Update Painting' : 'Create Painting'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
