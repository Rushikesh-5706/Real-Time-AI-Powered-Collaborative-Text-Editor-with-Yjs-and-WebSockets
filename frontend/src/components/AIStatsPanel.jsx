import React from 'react';

export default function AIStatsPanel({ accepted, rejected }) {
  return (
    <div className="panel">
      <div className="panel-title">AI Suggestions</div>
      <div className="stats-grid">
        <div className="stat-card">
          <div
            data-testid="ai-stats-accepted"
            className="stat-value accepted"
          >
            {accepted}
          </div>
          <div className="stat-label">Accepted</div>
        </div>
        <div className="stat-card">
          <div
            data-testid="ai-stats-rejected"
            className="stat-value rejected"
          >
            {rejected}
          </div>
          <div className="stat-label">Rejected</div>
        </div>
      </div>
    </div>
  );
}
