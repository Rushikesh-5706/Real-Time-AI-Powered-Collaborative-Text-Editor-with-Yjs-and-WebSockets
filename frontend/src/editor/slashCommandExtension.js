import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import SlashCommandMenu from '../components/SlashCommandMenu.jsx';

const COMMANDS = [
  {
    id: 'slash-cmd-expand',
    label: 'Expand',
    description: 'Expand text with more detail',
    icon: '↗',
    intent: 'expand',
    color: '#3b82f6',
  },
  {
    id: 'slash-cmd-summarise',
    label: 'Summarise',
    description: 'Summarise text above cursor',
    icon: '⊞',
    intent: 'summarise',
    color: '#10b981',
  },
  {
    id: 'slash-cmd-rewrite',
    label: 'Rewrite',
    description: 'Rewrite selected text',
    icon: '↺',
    intent: 'rewrite_selection',
    color: '#f59e0b',
  },
  {
    id: 'slash-cmd-todo',
    label: 'To-do list',
    description: 'Convert to checklist',
    icon: '☑',
    intent: 'todo',
    color: '#8b5cf6',
  },
  {
    id: 'slash-cmd-translate',
    label: 'Translate',
    description: 'Translate to Hindi',
    icon: '⇄',
    intent: 'translate',
    color: '#f43f5e',
  },
];

export function createSlashCommandExtension({ onCommand }) {
  return Extension.create({
    name: 'slashCommand',

    addOptions() {
      return {
        onCommand,
        suggestion: {
          char: '/',
          allowedPrefixes: null,
          startOfLine: true,
          command: ({ editor, range, props }) => {
            editor.chain().focus().deleteRange(range).run();
            onCommand(props.intent, editor);
          },
          items: ({ query }) =>
            COMMANDS.filter((cmd) =>
              cmd.label.toLowerCase().includes(query.toLowerCase())
            ),
          render: () => {
            let reactRenderer;
            let menuContainer;

            return {
              onStart: (props) => {
                reactRenderer = new ReactRenderer(SlashCommandMenu, {
                  props: { ...props, commands: COMMANDS },
                  editor: props.editor,
                });

                // Create a positioned container
                menuContainer = document.createElement('div');
                menuContainer.style.cssText = `
                  position: absolute;
                  z-index: 9999;
                `;
                menuContainer.appendChild(reactRenderer.element);

                const rect = props.clientRect?.();
                if (rect) {
                  menuContainer.style.top = `${rect.bottom + window.scrollY + 4}px`;
                  menuContainer.style.left = `${rect.left + window.scrollX}px`;
                }

                document.body.appendChild(menuContainer);
              },

              onUpdate: (props) => {
                reactRenderer?.updateProps({ ...props, commands: COMMANDS });

                const rect = props.clientRect?.();
                if (rect && menuContainer) {
                  menuContainer.style.top = `${rect.bottom + window.scrollY + 4}px`;
                  menuContainer.style.left = `${rect.left + window.scrollX}px`;
                }
              },

              onKeyDown: (props) => {
                if (props.event.key === 'Escape') {
                  menuContainer?.remove();
                  return true;
                }
                return reactRenderer?.ref?.onKeyDown?.(props) ?? false;
              },

              onExit: () => {
                menuContainer?.remove();
                menuContainer = null;
                reactRenderer?.destroy();
                reactRenderer = null;
              },
            };
          },
        },
      };
    },

    addProseMirrorPlugins() {
      return [
        Suggestion({
          editor: this.editor,
          ...this.options.suggestion,
        }),
      ];
    },
  });
}

export { COMMANDS };
