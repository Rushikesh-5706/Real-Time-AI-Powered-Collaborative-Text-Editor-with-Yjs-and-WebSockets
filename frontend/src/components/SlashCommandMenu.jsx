import React, { forwardRef, useImperativeHandle, useState } from 'react';

const COMMANDS = [
  { id: 'slash-cmd-expand', label: 'Expand', description: 'Expand text with more detail', icon: '↗', color: '#3b82f6' },
  { id: 'slash-cmd-summarise', label: 'Summarise', description: 'Summarise text above cursor', icon: '⊞', color: '#10b981' },
  { id: 'slash-cmd-rewrite', label: 'Rewrite', description: 'Rewrite selected text', icon: '↺', color: '#f59e0b' },
  { id: 'slash-cmd-todo', label: 'To-do list', description: 'Convert to checklist', icon: '☑', color: '#8b5cf6' },
  { id: 'slash-cmd-translate', label: 'Translate', description: 'Translate to Hindi', icon: '⇄', color: '#f43f5e' },
];

const SlashCommandMenu = forwardRef((props, ref) => {
  const { command } = props;
  const [selectedIndex, setSelectedIndex] = useState(0);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((i) => (i - 1 + COMMANDS.length) % COMMANDS.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((i) => (i + 1) % COMMANDS.length);
        return true;
      }
      if (event.key === 'Enter') {
        command(COMMANDS[selectedIndex]);
        return true;
      }
      return false;
    },
  }));

  return (
    <div data-testid="slash-command-menu" className="slash-command-menu">
      <div className="slash-menu-header">AI Commands</div>
      {COMMANDS.map((cmd, index) => (
        <button
          key={cmd.id}
          data-testid={cmd.id}
          className={`slash-menu-item${selectedIndex === index ? ' selected' : ''}`}
          onClick={() => command(cmd)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <span
            className="slash-menu-icon"
            style={{ background: `${cmd.color}22`, color: cmd.color }}
          >
            {cmd.icon}
          </span>
          <span className="slash-menu-item-text">
            <span className="slash-menu-label">{cmd.label}</span>
            <span className="slash-menu-desc">{cmd.description}</span>
          </span>
        </button>
      ))}
    </div>
  );
});

SlashCommandMenu.displayName = 'SlashCommandMenu';

export default SlashCommandMenu;
