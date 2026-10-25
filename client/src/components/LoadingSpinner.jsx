import React from 'react';

export default function LoadingSpinner({ message = 'Loading art collection...' }) {
  return (
    <div className="state-box">
      <div className="spinner"></div>
      <p className="state-text">{message}</p>
    </div>
  );
}
