import React from 'react';

export default function AIContextPanel({ intent, charsCount }) {
  return (
    <div className="panel">
      <div className="panel-title">AI Context</div>
      <div className="context-row">
        <div className="context-item">
          <span className="context-key">Intent</span>
          <span
            data-testid="ai-context-intent"
            className="context-value"
          >
            {intent || 'continue_paragraph'}
          </span>
        </div>
        <div className="context-item">
          <span className="context-key">Context chars</span>
          <span
            data-testid="ai-context-chars"
            className="context-value"
          >
            {charsCount || 0}
          </span>
        </div>
      </div>
    </div>
  );
}
