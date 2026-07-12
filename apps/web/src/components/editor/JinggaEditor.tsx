'use client';

import React, { useCallback, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import ImageExt from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import type { WebsocketProvider } from 'y-websocket';
import { common, createLowlight } from 'lowlight';
import { API_BASE, getAuthToken } from '@/lib/api';
import { SlashCommandExtension } from './slash-command';

// Load lowlight for syntax highlighting
const lowlight = createLowlight(common);

// ============================================================
// Types
// ============================================================

interface CollaborationConfig {
  ydoc: Y.Doc;
  provider: WebsocketProvider;
  user: { name: string; color: string };
}

interface JinggaEditorProps {
  initialContent?: string;
  onChange?: (html: string, json: unknown) => void;
  editable?: boolean;
  placeholder?: string;
  minHeight?: number;
  /** Enable real-time Yjs collaboration */
  collaboration?: CollaborationConfig;
}

// ============================================================
// Toolbar Button Components
// ============================================================

function ToolbarButton({
  onClick,
  active,
  disabled,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-xs rounded-none transition-colors ${
        active
          ? 'bg-surface-2 text-ink font-medium'
          : 'text-ink-muted hover:bg-surface-1 hover:text-ink'
      } ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-md bg-hairline mx-xs" />;
}

// ============================================================
// Image Resize Extension (custom, extends @tiptap/extension-image)
// ============================================================

const ResizableImage = ImageExt.extend({
  addAttributes() {
    return {
      width: {
        default: 'auto',
        parseHTML: (el: HTMLElement) => el.getAttribute('width') || 'auto',
        renderHTML: (attrs: any) => {
          if (attrs.width && attrs.width !== 'auto') {
            return { width: attrs.width };
          }
          return {};
        },
      },
      height: { default: 'auto' },
      align: { default: 'center' },
    };
  },
});

// ============================================================
// Main Editor Component
// ============================================================

export default function JinggaEditor({
  initialContent = '',
  onChange,
  editable = true,
  placeholder = 'Start writing your masterpiece...',
  minHeight = 500,
  collaboration,
}: JinggaEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        // Disable codeBlock from StarterKit — we use CodeBlockLowlight instead
        codeBlock: false,
      }),
      ResizableImage.configure({
        inline: false,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-primary underline hover:text-primary-hover' },
      }),
      Placeholder.configure({
        placeholder,
        showOnlyWhenEditable: true,
      }),
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'javascript',
      }),
      // Tables
      Table.configure({
        resizable: true,
        allowTableNodeSelection: true,
      }),
      TableRow,
      TableCell,
      TableHeader,
      // Slash Commands
      SlashCommandExtension,
      // Collaboration (real-time co-editing via Yjs)
      // (Cursor overlay is handled by a separate component via Yjs awareness)
      ...(collaboration
        ? [
            Collaboration.configure({
              document: collaboration.ydoc,
            }),
          ]
        : []),
    ],
    content: initialContent || '<p></p>',
    editable,
    onUpdate: ({ editor: e }) => {
      // Don't send empty paragraphs as content
      const html = e.getHTML();
      const trimmed = html.replace(/<br[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
      const isEmpty =
        trimmed === '<p></p>' || trimmed === '<p> </p>' || trimmed === '<p>\n</p>' || trimmed === '';
      onChange?.(isEmpty ? '' : html, isEmpty ? null : e.getJSON());
    },
  });

  // ============================================================
  // Custom slash command image trigger
  // ============================================================
  useEffect(() => {
    const handler = () => {
      fileInputRef.current?.click();
    };
    window.addEventListener('editor:trigger-image-upload', handler);
    return () => {
      window.removeEventListener('editor:trigger-image-upload', handler);
    };
  }, []);

  // ============================================================
  // Image Upload Handler
  // ============================================================
  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!editor) return;

      // For small images, use base64 inline
      if (file.size < 500 * 1024) {
        const reader = new FileReader();
        reader.onload = () => {
          editor
            .chain()
            .focus()
            .setImage({ src: reader.result as string })
            .run();
        };
        reader.readAsDataURL(file);
        return;
      }

      // For larger images, upload to server
      try {
        const formData = new FormData();
        formData.append('file', file);
        const token = getAuthToken();
        const res = await fetch(`${API_BASE}/api/v1/upload/image`, {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: formData,
        });
        if (res.ok) {
          const { url } = await res.json();
          editor.chain().focus().setImage({ src: url }).run();
        } else {
          // Fallback to base64
          const reader = new FileReader();
          reader.onload = () => {
            editor
              .chain()
              .focus()
              .setImage({ src: reader.result as string })
              .run();
          };
          reader.readAsDataURL(file);
        }
      } catch {
        // Fallback to base64
        const reader = new FileReader();
        reader.onload = () => {
          editor
            .chain()
            .focus()
            .setImage({ src: reader.result as string })
            .run();
        };
        reader.readAsDataURL(file);
      }
    },
    [editor],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && file.type.startsWith('image/')) {
        handleImageUpload(file);
      }
      e.target.value = '';
    },
    [handleImageUpload],
  );

  const addLink = useCallback(() => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href || '';
    const url = window.prompt('Enter URL:', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().unsetLink().run();
      return;
    }
    editor.chain().focus().setLink({ href: url }).run();
  }, [editor]);

  if (!editor) return null;

  const isTableActive = editor.isActive('table');
  const hasImageSelection = editor.isActive('image');

  return (
    <div className="border border-hairline bg-canvas rounded-none">
      {/* ------------------------------------------------------- */}
      {/* Toolbar */}
      {/* ------------------------------------------------------- */}
      {editable && (
        <div className="flex flex-wrap items-center gap-xxs px-sm py-xs border-b border-hairline bg-surface-1 sticky top-0 z-10 overflow-x-auto">
          {/* === Text Formatting === */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold (Ctrl+B)"
          >
            <strong>B</strong>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic (Ctrl+I)"
          >
            <em>I</em>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="Underline (Ctrl+U)"
          >
            <span className="underline">U</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            title="Strikethrough"
          >
            <span className="line-through">S</span>
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive('code')}
            title="Inline Code"
          >
            {'<>'}
          </ToolbarButton>

          <ToolbarDivider />

          {/* === Headings === */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            active={editor.isActive('heading', { level: 1 })}
            title="Heading 1"
          >
            H1
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            active={editor.isActive('heading', { level: 2 })}
            title="Heading 2"
          >
            H2
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            active={editor.isActive('heading', { level: 3 })}
            title="Heading 3"
          >
            H3
          </ToolbarButton>

          <ToolbarDivider />

          {/* === Lists & Blocks === */}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet List"
          >
            &bull;=
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Numbered List"
          >
            1.
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            title="Blockquote"
          >
            &ldquo;
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            title="Code Block"
          >
            {'{ }'}
          </ToolbarButton>

          <ToolbarDivider />

          {/* === Alignment === */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            active={editor.isActive({ textAlign: 'left' })}
            title="Align Left"
          >
            ≡←
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            active={editor.isActive({ textAlign: 'center' })}
            title="Align Center"
          >
            ≡↔
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            active={editor.isActive({ textAlign: 'right' })}
            title="Align Right"
          >
            ≡→
          </ToolbarButton>

          <ToolbarDivider />

          {/* === Table Controls === */}
          <ToolbarButton
            onClick={() =>
              editor
                .chain()
                .focus()
                .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                .run()
            }
            active={isTableActive}
            title="Insert Table"
          >
            ⊞
          </ToolbarButton>
          {isTableActive && (
            <>
              <ToolbarButton
                onClick={() => editor.chain().focus().addColumnBefore().run()}
                title="Add Column Before"
              >
                ◀⊞
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                title="Add Column After"
              >
                ⊞▶
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().addRowBefore().run()}
                title="Add Row Above"
              >
                ▲⊞
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().addRowAfter().run()}
                title="Add Row Below"
              >
                ⊞▼
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeaderColumn().run()}
                active={editor.isActive('tableHeader')}
                title="Toggle Header Column"
              >
                HC
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeaderRow().run()}
                active={false}
                title="Toggle Header Row"
              >
                HR
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().deleteColumn().run()}
                title="Delete Column"
              >
                ⊞✕
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().deleteRow().run()}
                title="Delete Row"
              >
                ⊟
              </ToolbarButton>
            </>
          )}

          <ToolbarDivider />

          {/* === Image Size Controls (when image selected) === */}
          {hasImageSelection && (
            <>
              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().updateAttributes('image', { width: '40%' }).run()
                }
                title="Small image"
              >
                □S
              </ToolbarButton>
              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().updateAttributes('image', { width: '70%' }).run()
                }
                title="Medium image"
              >
                □M
              </ToolbarButton>
              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().updateAttributes('image', { width: '100%' }).run()
                }
                title="Full width image"
              >
                □L
              </ToolbarButton>
              <ToolbarButton
                onClick={() =>
                  editor.chain().focus().updateAttributes('image', { width: 'auto' }).run()
                }
                title="Auto (original size)"
              >
                □
              </ToolbarButton>
              <ToolbarDivider />
            </>
          )}

          {/* === Link === */}
          <ToolbarButton
            onClick={addLink}
            active={editor.isActive('link')}
            title="Add Link"
          >
            Link
          </ToolbarButton>

          {/* === Image Upload === */}
          <ToolbarButton
            onClick={() => fileInputRef.current?.click()}
            title="Insert Image"
          >
            Img
          </ToolbarButton>

          {/* === HR === */}
          <ToolbarButton
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal Rule"
          >
            ―
          </ToolbarButton>

          {/* === Undo/Redo === */}
          <ToolbarDivider />
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo (Ctrl+Z)"
          >
            ↩
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo (Ctrl+Shift+Z)"
          >
            ↪
          </ToolbarButton>
        </div>
      )}

      {/* Hidden file input for image upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* ------------------------------------------------------- */}
      {/* Editor Content — Paper-like A4 pages */}
      {/* ------------------------------------------------------- */}
      <div className="paper-editor-wrapper">
        <EditorContent
          editor={editor}
          style={{ minHeight: `${minHeight}px` }}
          className="prose prose-lg max-w-none px-lg py-xl focus:outline-none paper-editor"
        />
      </div>

      {/* ------------------------------------------------------- */}
      {/* Footer Stats */}
      {/* ------------------------------------------------------- */}
      {editable && editor && (
        <div className="border-t border-hairline bg-surface-1 px-md py-xs flex items-center justify-between text-caption text-ink-subtle">
          <div className="flex items-center gap-md">
            <span>
              Words: <strong className="text-ink-muted">{getWordCount(editor.getText())}</strong>
            </span>
            <span>
              Characters: <strong className="text-ink-muted">{editor.getText().length}</strong>
            </span>
          </div>
          <div>
            {isTableActive && (
              <span className="text-ink-subtle">Table selected</span>
            )}
            {hasImageSelection && (
              <span className="text-ink-subtle">Image selected &mdash; resize in toolbar</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Helper
// ============================================================

function getWordCount(text: string): number {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}
