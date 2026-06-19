import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { YjsSocketProvider } from './yjsSocketProvider.js';
import { AISuggestionMark } from './aiSuggestionMark.js';
import { createGhostTextExtension } from './ghostTextExtension.js';
import { createSlashCommandExtension } from './slashCommandExtension.js';
import AIPresenceIndicator from '../components/AIPresenceIndicator.jsx';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// User cursor colors — distinct from AI color (#a78bfa)
const USER_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#f43f5e', '#06b6d4',
  '#84cc16', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
];

function pickColor(username) {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

export default function CollaborativeEditor({
  username,
  onStatsChange,
  onContextChange,
  onProviderReady,
}) {
  const providerRef = useRef(null);
  const [ghostText, setGhostTextState] = useState('');
  const [aiInFlight, setAiInFlight] = useState(false);
  const ghostTextRef = useRef('');

  const setGhostText = useCallback((text) => {
    ghostTextRef.current = text;
    setGhostTextState(text);
  }, []);

  const clearGhostText = useCallback(() => {
    ghostTextRef.current = '';
    setGhostTextState('');
  }, []);

  const getGhostText = useCallback(() => ghostTextRef.current, []);

  // Initialize Yjs provider once — stable across renders
  if (!providerRef.current) {
    const userColor = pickColor(username);
    providerRef.current = new YjsSocketProvider('main-doc', username, userColor);
  }

  useEffect(() => {
    // Notify parent so it can subscribe to awareness
    onProviderReady?.(providerRef.current);
    return () => {
      providerRef.current?.destroy();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleAICommand = useCallback(async (intent, editorInstance) => {
    const { doc, selection } = editorInstance.state;
    const cursorPos = selection.$head.pos;
    const fullText = doc.textContent;
    const precedingText = doc.textBetween(0, cursorPos, '\n', '\n');
    const followingText = doc.textBetween(cursorPos, doc.content.size, '\n', '\n');
    const { from, to } = selection;
    const selectedText = from !== to ? doc.textBetween(from, to, '\n') : null;

    setAiInFlight(true);
    onContextChange?.({ intent, charsCount: precedingText.length + followingText.length });

    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentContent: fullText,
          cursorPosition: cursorPos,
          precedingText,
          followingText,
          intent,
          selectedText,
        }),
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') break;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) break;
            if (parsed.token) {
              accumulated += parsed.token;
            }
          } catch {
            // ignore malformed SSE line
          }
        }
      }

      if (accumulated) {
        const insertPos = editorInstance.state.selection.$head.pos;
        const markType = editorInstance.state.schema.marks.aiSuggestion;
        editorInstance
          .chain()
          .focus()
          .insertContentAt(insertPos, {
            type: 'text',
            text: accumulated,
            marks: markType
              ? [{ type: 'aiSuggestion', attrs: { status: 'accepted' } }]
              : [],
          })
          .run();
        onStatsChange?.('accepted');
      }
    } catch (err) {
      console.error('slash command AI error intent=' + intent, err.message);
    } finally {
      setAiInFlight(false);
    }
  }, [onStatsChange, onContextChange]);

  // Build the ghost text extension with callbacks wired in
  const ghostExtension = createGhostTextExtension({
    onAIStart: () => setAiInFlight(true),
    onAIEnd: () => setAiInFlight(false),
    onAccepted: () => onStatsChange?.('accepted'),
    onRejected: () => onStatsChange?.('rejected'),
    getGhostText,
    setGhostText,
    clearGhostText,
  });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }), // history disabled — Yjs handles undo/redo
      Collaboration.configure({ document: providerRef.current.doc }),
      CollaborationCursor.configure({
        provider: providerRef.current,
        user: {
          name: username,
          color: pickColor(username),
        },
        render: (user) => {
          const cursor = document.createElement('span');
          cursor.classList.add('collaboration-cursor__caret');
          cursor.style.borderColor = user.color;

          // Sanitize: remove spaces for testid compliance (User1, User2 etc.)
          const sanitized = (user.name || 'User').replace(/\s+/g, '');
          cursor.setAttribute('data-testid', `user-cursor-${sanitized}`);

          const label = document.createElement('div');
          label.classList.add('collaboration-cursor__label');
          label.style.backgroundColor = user.color;
          label.textContent = user.name;

          cursor.appendChild(label);
          return cursor;
        },
      }),
      AISuggestionMark,
      ghostExtension,
      createSlashCommandExtension({ onCommand: handleAICommand }),
    ],
    editorProps: {
      attributes: {
        class: 'tiptap-editor',
        spellcheck: 'true',
      },
    },
    onUpdate: ({ editor: ed }) => {
      const { doc, selection } = ed.state;
      const cursorPos = selection.$head.pos;
      const precedingText = doc.textBetween(0, cursorPos, '\n', '\n');
      const followingText = doc.textBetween(cursorPos, doc.content.size, '\n', '\n');
      onContextChange?.({
        intent: 'continue_paragraph',
        charsCount: precedingText.length + followingText.length,
      });
    },
  });

  return (
    <div className="editor-area">
      {aiInFlight && <AIPresenceIndicator />}
      <div className="editor-container">
        <div className="editor-wrapper">
          <EditorContent editor={editor} />
        </div>
      </div>
      {ghostText && (
        <div className="ghost-text-hint">
          <span className="hint-key">Tab</span> accept
          <span style={{ margin: '0 4px' }}>·</span>
          <span className="hint-key">Esc</span> dismiss
        </div>
      )}
    </div>
  );
}
