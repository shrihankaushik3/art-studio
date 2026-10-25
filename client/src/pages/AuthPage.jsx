import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/Alert';

export default function AuthPage({ onSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, register } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: '440px', margin: '3rem auto' }}>
      <div className="form-card">
        <h2 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
          {isRegister ? 'Create Customer Account' : 'Welcome to Art Studio'}
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
          {isRegister
            ? 'Sign up to purchase original paintings, book wall murals and request custom pottery.'
            : 'Sign in to access your orders, bookings or studio management.'}
        </p>

        <Alert type="danger" message={error} onClose={() => setError('')} />

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. yourname@example.com"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem' }}
            disabled={loading}
          >
            {loading ? 'Please wait...' : isRegister ? 'Register Account' : 'Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          {isRegister ? (
            <span>
              Already have an account?{' '}
              <button
                style={{ color: 'var(--primary)', fontWeight: '600' }}
                onClick={() => { setIsRegister(false); setError(''); }}
              >
                Sign In
              </button>
            </span>
          ) : (
            <span>
              New to the Art Studio?{' '}
              <button
                style={{ color: 'var(--primary)', fontWeight: '600' }}
                onClick={() => { setIsRegister(true); setError(''); }}
              >
                Create an account
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
