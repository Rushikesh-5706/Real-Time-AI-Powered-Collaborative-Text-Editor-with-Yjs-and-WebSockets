import React, { forwardRef, useImperativeHandle, useState } from 'react';

// IMPORTANT: This component intentionally has NO local COMMANDS list.
// The authoritative list (with `intent` fields) lives in slashCommandExtension.js
// and is passed in via props.commands. Duplicating it here previously caused
// intent: undefined to be sent on every slash-command click (Bug 1).

const SlashCommandMenu = forwardRef((props, ref) => {
  const { command, commands = [] } = props;
  const [selectedIndex, setSelectedIndex] = useState(0);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((i) => (i - 1 + commands.length) % commands.length);
        return true;
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((i) => (i + 1) % commands.length);
        return true;
      }
      if (event.key === 'Enter') {
        command(commands[selectedIndex]);
        return true;
      }
      return false;
    },
  }));

  return (
    <div data-testid="slash-command-menu" className="slash-command-menu">
      <div className="slash-menu-header">AI Commands</div>
      {commands.map((cmd, index) => (
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
