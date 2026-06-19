import React from 'react';

export default function AIPresenceIndicator({ coords }) {
  const style = coords
    ? { left: `${coords.left}px`, top: `${coords.top}px`, right: 'auto' }
    : {};

  return (
    <div
      data-testid="ai-presence-indicator"
      className="ai-presence-indicator"
      role="status"
      aria-label="AI thinking"
      style={style}
    >
      <span className="ai-pulse" />
      AI thinking...
    </div>
  );
}
