import { Mark } from '@tiptap/core';

export const AISuggestionMark = Mark.create({
  name: 'aiSuggestion',

  addAttributes() {
    return {
      status: {
        default: 'accepted',
        parseHTML: (element) => element.getAttribute('data-status'),
        renderHTML: (attributes) => ({ 'data-status': attributes.status }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-testid="ai-suggestion-accepted"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      {
        ...HTMLAttributes,
        'data-testid': 'ai-suggestion-accepted',
        class: 'ai-suggestion',
      },
      0,
    ];
  },
});
