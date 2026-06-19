import React from 'react';

export default function PresenceCursors({ users }) {
  if (!users || users.length === 0) return null;

  return (
    <div className="panel">
      <div className="panel-title">Active Users</div>
      <div className="presence-list">
        {users.map((user) => {
          const sanitized = (user.name || 'User').replace(/\s+/g, '');
          return (
            <div
              key={sanitized}
              className="presence-item"
              data-testid={`user-cursor-${sanitized}`}
            >
              <div
                className="presence-avatar"
                style={{ background: user.color }}
              >
                {(user.name || 'U')[0].toUpperCase()}
              </div>
              <span className="presence-name">{user.name}</span>
              <span
                className="presence-dot"
                style={{ background: user.color, boxShadow: `0 0 6px ${user.color}` }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
