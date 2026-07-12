// ============================================================
// Slash Command Extension for TipTap v3
// Triggered by typing "/" at the start of a line.
// Uses tippy.js for the floating suggestion dropdown.
// ============================================================

import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import type { Instance as TippyInstance } from 'tippy.js';

// ============================================================
// Types
// ============================================================

export interface SlashCommandItem {
  title: string;
  description: string;
  searchTerms: string[];
  icon: string;
  command: (props: { editor: any; range: any }) => void;
}

// ============================================================
// Command Items
// ============================================================

const COMMAND_ITEMS: SlashCommandItem[] = [
  {
    title: 'Heading 1',
    description: 'Large heading',
    searchTerms: ['h1', 'heading1', 'heading 1'],
    icon: 'H1',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 1 }).run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium heading',
    searchTerms: ['h2', 'heading2', 'heading 2'],
    icon: 'H2',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 2 }).run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small heading',
    searchTerms: ['h3', 'heading3', 'heading 3'],
    icon: 'H3',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleHeading({ level: 3 }).run();
    },
  },
  {
    title: 'Bullet List',
    description: 'Unordered list',
    searchTerms: ['ul', 'list', 'bullet'],
    icon: '•≡',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Ordered list',
    searchTerms: ['ol', 'numbered', 'ordered'],
    icon: '1.',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    title: 'Blockquote',
    description: 'Insert a quote',
    searchTerms: ['quote', 'blockquote', 'citation'],
    icon: '"',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    title: 'Code Block',
    description: 'Code with syntax highlighting',
    searchTerms: ['code', 'pre', 'snippet'],
    icon: '</>',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    title: 'Table',
    description: 'Insert a 3x3 table',
    searchTerms: ['table', 'grid', 'cells'],
    icon: '⊞',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
    },
  },
  {
    title: 'Divider',
    description: 'Horizontal rule',
    searchTerms: ['hr', 'divider', 'line', 'separator'],
    icon: '―',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
  {
    title: 'Image',
    description: 'Insert an image',
    searchTerms: ['img', 'image', 'picture', 'photo'],
    icon: '🖼',
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      // Trigger file input – we store a flag so the editor can open the picker
      window.dispatchEvent(new CustomEvent('editor:trigger-image-upload'));
    },
  },
];

function getFilteredItems(query: string): SlashCommandItem[] {
  const q = query.toLowerCase();
  return COMMAND_ITEMS.filter(
    (item) =>
      item.title.toLowerCase().includes(q) ||
      item.searchTerms.some((t) => t.includes(q)) ||
      item.description.toLowerCase().includes(q),
  ).slice(0, 10);
}

// ============================================================
// Extension
// ============================================================

export const SlashCommandExtension = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        startOfLine: true,
        allowSpaces: true,
      },
    };
  },

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      Suggestion({
        editor,
        char: this.options.suggestion.char,
        startOfLine: this.options.suggestion.startOfLine,
        allowSpaces: this.options.suggestion.allowSpaces,

        items: ({ query }: { query: string }) => getFilteredItems(query),

        render: () => {
          let popup: TippyInstance | null = null;
          let container: HTMLDivElement | null = null;
          let selectedIndex = 0;

          function renderItems(items: SlashCommandItem[], onSelect: (item: SlashCommandItem) => void) {
            if (!container) return;
            // Local const for proper TS narrowing inside callbacks
            const el = container;
            el.innerHTML = '';
            selectedIndex = 0;

            if (items.length === 0) {
              el.innerHTML = '<div class="p-md text-body-sm text-ink-muted min-w-[200px]">No results</div>';
              return;
            }

            items.forEach((item, i) => {
              const btn = document.createElement('button');
              btn.className =
                'w-full flex items-center gap-sm px-md py-sm text-left transition-colors hover:bg-surface-1';
              btn.innerHTML = `
                <span class="w-8 h-8 flex items-center justify-center bg-surface-1 border border-hairline text-body-sm font-medium text-ink flex-shrink-0">${item.icon}</span>
                <div class="flex-1 min-w-0">
                  <span class="text-body-sm font-medium text-ink block truncate">${item.title}</span>
                  <span class="text-caption text-ink-subtle block truncate">${item.description}</span>
                </div>
              `;
              btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                onSelect(item);
              });
              btn.addEventListener('mouseenter', () => {
                selectedIndex = i;
                updateHighlight();
              });
              el.appendChild(btn);
            });

            updateHighlight();
          }

          function updateHighlight() {
            if (!container) return;
            Array.from(container.children).forEach((el, i) => {
              if (i === selectedIndex) {
                (el as HTMLElement).style.backgroundColor = 'rgba(15, 98, 254, 0.08)';
              } else {
                (el as HTMLElement).style.backgroundColor = '';
              }
            });
          }

          function navigateItems(direction: -1 | 1) {
            if (!container) return;
            const count = container.children.length;
            selectedIndex = Math.max(0, Math.min(selectedIndex + direction, count - 1));
            updateHighlight();
            const selected = container.children[selectedIndex] as HTMLElement;
            selected?.scrollIntoView({ block: 'nearest' });
          }

          return {
            onStart: (props: any) => {
              container = document.createElement('div');
              container.style.cssText = 'min-width: 220px; background: white; border: 1px solid #e0e0e0; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-height: 320px; overflow-y: auto;';

              renderItems(props.items, (item: SlashCommandItem) => {
                props.command(item);
              });

              popup = tippy('body', {
                getReferenceClientRect: props.clientRect,
                appendTo: () => document.body,
                content: container,
                showOnCreate: true,
                interactive: true,
                trigger: 'manual',
                placement: 'bottom-start',
                arrow: false,
                maxWidth: 320,
                theme: 'light',
                zIndex: 99999,
              })[0];
            },

            onUpdate: (props: any) => {
              renderItems(props.items, (item: SlashCommandItem) => {
                props.command(item);
              });
              popup?.setProps({
                getReferenceClientRect: props.clientRect,
              });
            },

            onKeyDown: (props: any) => {
              if (props.event.key === 'ArrowDown') {
                navigateItems(1);
                return true;
              }
              if (props.event.key === 'ArrowUp') {
                navigateItems(-1);
                return true;
              }
              if (props.event.key === 'Enter' || props.event.key === 'Tab') {
                if (container?.children[selectedIndex]) {
                  (container.children[selectedIndex] as HTMLElement).click();
                  return true;
                }
              }
              if (props.event.key === 'Escape') {
                popup?.hide();
                return true;
              }
              return false;
            },

            onExit: () => {
              popup?.destroy();
              popup = null;
              container = null;
              selectedIndex = 0;
            },
          };
        },

        command: ({ editor: ed, range, props }: { editor: any; range: any; props: SlashCommandItem }) => {
          props.command({ editor: ed, range });
        },
      }),
    ];
  },
});
