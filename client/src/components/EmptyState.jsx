import React from 'react';

export default function EmptyState({ title = 'No records found', description = 'There are no items matching this criteria at the moment.', action }) {
  return (
    <div className="state-box">
      <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎨</div>
      <h3 className="state-title">{title}</h3>
      <p className="state-text">{description}</p>
      {action && <div style={{ marginTop: '1.25rem' }}>{action}</div>}
    </div>
  );
}
