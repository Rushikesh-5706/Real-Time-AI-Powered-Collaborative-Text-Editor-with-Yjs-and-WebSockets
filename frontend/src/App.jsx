import React, { useState, useCallback, useEffect, useRef } from 'react';
import CollaborativeEditor from './editor/CollaborativeEditor.jsx';
import AIStatsPanel from './components/AIStatsPanel.jsx';
import AIContextPanel from './components/AIContextPanel.jsx';
import PresenceCursors from './components/PresenceCursors.jsx';
import { useAIStats } from './hooks/useAIStats.js';

export default function App({ username }) {
  const { accepted, rejected, increment } = useAIStats();
  const [context, setContext] = useState({
    intent: 'continue_paragraph',
    charsCount: 0,
  });
  const [remoteUsers, setRemoteUsers] = useState([]);
  const providerCallbackRef = useRef(null);

  const handleStatsChange = useCallback((type) => {
    increment(type);
  }, [increment]);

  const handleContextChange = useCallback((newContext) => {
    setContext(newContext);
  }, []);

  // Receives the provider from CollaborativeEditor so we can subscribe to awareness
  const handleProviderReady = useCallback((provider) => {
    if (!provider) return;

    const updateUsers = () => {
      const states = provider.awareness.getStates();
      const users = [];
      states.forEach((state, clientId) => {
        if (clientId !== provider.doc.clientID && state.user) {
          users.push(state.user);
        }
      });
      setRemoteUsers(users);
    };

    provider.awareness.on('change', updateUsers);
    updateUsers(); // initial

    // Store cleanup ref
    providerCallbackRef.current = () => {
      provider.awareness.off('change', updateUsers);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      providerCallbackRef.current?.();
    };
  }, []);

  return (
    <div className="app-layout">
      <header className="app-header">
        <div className="app-header-logo">
          <div className="logo-mark">C</div>
          <div>
            <div className="app-title">Collaborative Editor</div>
            <div className="app-subtitle">Real-time · AI-powered · Yjs CRDT</div>
          </div>
        </div>
        <div className="header-right">
          <div className="user-badge">
            <span className="user-dot" />
            {username}
          </div>
        </div>
      </header>

      <div className="app-content">
        <CollaborativeEditor
          username={username}
          onStatsChange={handleStatsChange}
          onContextChange={handleContextChange}
          onProviderReady={handleProviderReady}
        />

        <aside className="sidebar">
          <PresenceCursors users={remoteUsers} />
          <AIStatsPanel accepted={accepted} rejected={rejected} />
          <AIContextPanel intent={context.intent} charsCount={context.charsCount} />
        </aside>
      </div>
    </div>
  );
}
