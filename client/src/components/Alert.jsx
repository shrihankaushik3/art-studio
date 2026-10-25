import React from 'react';

export default function Alert({ type = 'danger', message, onClose }) {
  if (!message) return null;

  return (
    <div className={`alert alert-${type}`}>
      <span>{message}</span>
      {onClose && (
        <button onClick={onClose} style={{ marginLeft: '1rem', fontWeight: 'bold' }}>
          &times;
        </button>
      )}
    </div>
  );
}
