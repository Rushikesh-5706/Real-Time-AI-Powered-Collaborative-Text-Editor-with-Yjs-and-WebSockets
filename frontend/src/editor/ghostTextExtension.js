import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, PluginStateField } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

const GHOST_TEXT_KEY = new PluginKey('ghostText');
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
const DEBOUNCE_MS = 400;

// Store view reference for triggering re-renders
let _editorView = null;
let _ghostText = '';
let _debounceTimer = null;
let _abortController = null;

function setPluginGhostText(text) {
  _ghostText = text;
  // Dispatch a no-op meta transaction to force decoration re-computation
  if (_editorView) {
    const tr = _editorView.state.tr.setMeta(GHOST_TEXT_KEY, { ghostText: text });
    _editorView.dispatch(tr);
  }
}

function getPluginGhostText() {
  return _ghostText;
}

function cancelInFlight(callbacks) {
  if (_abortController) {
    _abortController.abort();
    _abortController = null;
  }
  if (_debounceTimer) {
    clearTimeout(_debounceTimer);
    _debounceTimer = null;
  }
  callbacks?.onAIEnd?.();
}

async function fetchGhostText(editor, callbacks) {
  const { doc, selection } = editor.state;
  const cursorPos = selection.$head.pos;
  const fullText = doc.textContent;
  const precedingText = doc.textBetween(0, cursorPos, '\n', '\n');
  const followingText = doc.textBetween(cursorPos, doc.content.size, '\n', '\n');

  if (!precedingText.trim() || precedingText.trim().length < 10) return;

  _abortController = new AbortController();
  callbacks.onAIStart();

  try {
    const response = await fetch(`${BACKEND_URL}/api/ai/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentContent: fullText,
        cursorPosition: cursorPos,
        precedingText,
        followingText,
        intent: 'continue_paragraph',
        selectedText: null,
      }),
      signal: _abortController.signal,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

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
          if (parsed.error) {
            setPluginGhostText('');
            callbacks.setGhostText('');
            return;
          }
          if (parsed.token) {
            const newText = _ghostText + parsed.token;
            setPluginGhostText(newText);
            callbacks.setGhostText(newText); // keep React state in sync for hint bar
          }
        } catch {
          // ignore malformed line
        }
      }
    }
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('ghost text fetch error', err.message);
    }
    setPluginGhostText('');
    callbacks.setGhostText('');
  } finally {
    callbacks.onAIEnd();
    _abortController = null;
  }
}

export function createGhostTextExtension(callbacks) {
  const {
    onAIStart,
    onAIEnd,
    onAccepted,
    onRejected,
    setGhostText,
    clearGhostText,
  } = callbacks;

  // Reset module-level state on each extension creation
  _ghostText = '';
  _editorView = null;
  _debounceTimer = null;
  _abortController = null;

  const allCallbacks = { onAIStart, onAIEnd, setGhostText, clearGhostText };

  return Extension.create({
    name: 'ghostText',

    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: GHOST_TEXT_KEY,

          state: {
            init: () => ({ ghostText: '' }),
            apply: (tr, prev) => {
              const meta = tr.getMeta(GHOST_TEXT_KEY);
              if (meta !== undefined) {
                return { ghostText: meta.ghostText };
              }
              return prev;
            },
          },

          view: (view) => {
            _editorView = view;
            return {
              destroy: () => {
                _editorView = null;
              },
            };
          },

          props: {
            decorations(state) {
              const pluginState = GHOST_TEXT_KEY.getState(state);
              const ghost = pluginState?.ghostText || '';
              if (!ghost) return DecorationSet.empty;

              const pos = state.selection.$head.pos;

              const widget = Decoration.widget(
                pos,
                () => {
                  const span = document.createElement('span');
                  span.setAttribute('data-testid', 'ghost-text');
                  span.className = 'ghost-text';
                  span.textContent = ghost;
                  return span;
                },
                { side: 1 }
              );

              return DecorationSet.create(state.doc, [widget]);
            },

            handleKeyDown(view, event) {
              const ghost = _ghostText;
              if (!ghost) return false;

              if (event.key === 'Tab') {
                event.preventDefault();
                const { state, dispatch } = view;
                const pos = state.selection.$head.pos;
                const markType = state.schema.marks.aiSuggestion;

                let tr = state.tr.insertText(ghost, pos);
                if (markType) {
                  tr = tr.addMark(pos, pos + ghost.length, markType.create({ status: 'accepted' }));
                }
                // Clear ghost text before dispatch to avoid re-triggering
                _ghostText = '';
                dispatch(tr);

                setPluginGhostText('');
                clearGhostText();
                cancelInFlight(allCallbacks);
                onAccepted();
                return true;
              }

              if (event.key === 'Escape') {
                event.preventDefault();
                _ghostText = '';
                setPluginGhostText('');
                clearGhostText();
                cancelInFlight(allCallbacks);
                onRejected();
                return true;
              }

              if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
                _ghostText = '';
                setPluginGhostText('');
                clearGhostText();
                cancelInFlight(allCallbacks);
                onRejected();
                return false; // let key insert normally
              }

              return false;
            },
          },
        }),
      ];
    },

    onUpdate() {
      // Don't trigger if ghost text is currently being shown
      if (_ghostText) return;

      // Cancel any previous pending fetch
      if (_debounceTimer) clearTimeout(_debounceTimer);
      if (_abortController) {
        _abortController.abort();
        _abortController = null;
      }

      // Debounce: only fetch after user stops typing for DEBOUNCE_MS
      _debounceTimer = setTimeout(() => {
        _debounceTimer = null;
        fetchGhostText(this.editor, allCallbacks);
      }, DEBOUNCE_MS);
    },

    onDestroy() {
      _ghostText = '';
      setPluginGhostText('');
      clearGhostText();
      cancelInFlight(allCallbacks);
    },
  });
}
