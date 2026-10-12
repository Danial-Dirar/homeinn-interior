"use client";

import { cn } from "@homeinn/ui";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote, Redo2, Underline, Undo2, type LucideIcon,
} from "lucide-react";

/**
 * The editor for page text. It offers only what the public site's sanitiser
 * keeps (lib/rich-text.ts): paragraphs, two heading levels, bold, italic,
 * underline, strike, lists, quotes and links. Anything else would be written
 * here and silently dropped there.
 */
export function RichTextEditor({
  id, value, onChange, invalid,
}: {
  id: string;
  value: string;
  onChange: (html: string) => void;
  invalid?: boolean;
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noreferrer noopener" } },
      }),
    ],
    content: value,
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-multiline": "true",
        "aria-labelledby": `${id}-label`,
        ...(invalid ? { "aria-invalid": "true" } : {}),
        class: "admin-prose min-h-48 px-4 py-3 text-sm leading-relaxed focus:outline-none",
      },
    },
    onUpdate: ({ editor: e }) => onChange(e.isEmpty ? "" : e.getHTML()),
  });

  return (
    <div className={cn(
      "border bg-white focus-within:outline-2 focus-within:outline-offset-1 focus-within:outline-brand",
      invalid ? "border-[#9B2C1F]" : "border-ink/20",
    )}>
      {editor ? <Toolbar editor={editor} /> : <div className="h-10 border-b border-ink/10" />}
      <EditorContent editor={editor} />
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const tools: { label: string; icon: LucideIcon; active?: boolean; run: () => void }[] = [
    { label: "Bold", icon: Bold, active: editor.isActive("bold"), run: () => editor.chain().focus().toggleBold().run() },
    { label: "Italic", icon: Italic, active: editor.isActive("italic"), run: () => editor.chain().focus().toggleItalic().run() },
    { label: "Underline", icon: Underline, active: editor.isActive("underline"), run: () => editor.chain().focus().toggleUnderline().run() },
    { label: "Heading", icon: Heading2, active: editor.isActive("heading", { level: 2 }), run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Subheading", icon: Heading3, active: editor.isActive("heading", { level: 3 }), run: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
    { label: "Bulleted list", icon: List, active: editor.isActive("bulletList"), run: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Numbered list", icon: ListOrdered, active: editor.isActive("orderedList"), run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Quote", icon: Quote, active: editor.isActive("blockquote"), run: () => editor.chain().focus().toggleBlockquote().run() },
    {
      label: "Link", icon: Link2, active: editor.isActive("link"),
      run: () => {
        const previous = editor.getAttributes("link").href as string | undefined;
        const href = window.prompt("Link address (leave empty to remove the link)", previous ?? "https://");
        if (href === null) return;
        if (href.trim() === "" || href.trim() === "https://") editor.chain().focus().unsetLink().run();
        else editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
      },
    },
    { label: "Undo", icon: Undo2, run: () => editor.chain().focus().undo().run() },
    { label: "Redo", icon: Redo2, run: () => editor.chain().focus().redo().run() },
  ];

  return (
    <div role="toolbar" aria-label="Formatting" className="flex flex-wrap gap-0.5 border-b border-ink/10 bg-[#F7F3EC] p-1">
      {tools.map((tool) => (
        <button
          key={tool.label}
          type="button"
          title={tool.label}
          aria-label={tool.label}
          aria-pressed={tool.active === undefined ? undefined : tool.active}
          onClick={tool.run}
          className={cn(
            "grid size-8 place-items-center text-ink/75 hover:bg-ink/[0.06] hover:text-ink",
            tool.active && "bg-ink/10 text-ink",
          )}
        >
          <tool.icon aria-hidden="true" className="size-4" />
        </button>
      ))}
    </div>
  );
}
