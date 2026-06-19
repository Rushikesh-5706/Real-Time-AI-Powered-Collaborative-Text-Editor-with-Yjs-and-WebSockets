import React from 'react';

export default function AIPresenceIndicator() {
  return (
    <div
      data-testid="ai-presence-indicator"
      className="ai-presence-indicator"
      role="status"
      aria-label="AI thinking"
    >
      <span className="ai-pulse" />
      AI thinking...
    </div>
  );
}
