import { useState, useRef, useCallback } from "react";
import {
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Link,
  Code,
  Eye,
  Edit3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownPreview } from "./MarkdownPreview";
import { cn } from "@/lib/utils";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
}

type FormatAction = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  action: () => void;
  shortcut?: string;
};

export function MarkdownEditor({
  value,
  onChange,
  placeholder = "اكتب المحتوى هنا...",
  minHeight = "300px",
}: MarkdownEditorProps) {
  const [isPreview, setIsPreview] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertText = useCallback(
    (before: string, after: string = "", defaultText: string = "") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = value.substring(start, end) || defaultText;
      const newValue =
        value.substring(0, start) +
        before +
        selectedText +
        after +
        value.substring(end);

      onChange(newValue);

      // Restore cursor position
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = start + before.length + selectedText.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [value, onChange]
  );

  const insertAtLineStart = useCallback(
    (prefix: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const newValue =
        value.substring(0, lineStart) + prefix + value.substring(lineStart);

      onChange(newValue);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, start + prefix.length);
      }, 0);
    },
    [value, onChange]
  );

  const toolbarActions: FormatAction[] = [
    {
      icon: Bold,
      label: "نص عريض",
      action: () => insertText("**", "**", "نص عريض"),
      shortcut: "Ctrl+B",
    },
    {
      icon: Italic,
      label: "نص مائل",
      action: () => insertText("*", "*", "نص مائل"),
      shortcut: "Ctrl+I",
    },
    {
      icon: Heading1,
      label: "عنوان 1",
      action: () => insertAtLineStart("# "),
    },
    {
      icon: Heading2,
      label: "عنوان 2",
      action: () => insertAtLineStart("## "),
    },
    {
      icon: Heading3,
      label: "عنوان 3",
      action: () => insertAtLineStart("### "),
    },
    {
      icon: List,
      label: "قائمة نقطية",
      action: () => insertAtLineStart("- "),
    },
    {
      icon: ListOrdered,
      label: "قائمة مرقمة",
      action: () => insertAtLineStart("1. "),
    },
    {
      icon: Link,
      label: "رابط",
      action: () => insertText("[", "](https://)", "نص الرابط"),
    },
    {
      icon: Code,
      label: "كود",
      action: () => insertText("`", "`", "كود"),
    },
  ];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "b") {
        e.preventDefault();
        insertText("**", "**", "نص عريض");
      } else if (e.key === "i") {
        e.preventDefault();
        insertText("*", "*", "نص مائل");
      }
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 p-2 border-b bg-muted/30 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          {toolbarActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                type="button"
                variant="ghost"
                size="sm"
                onClick={action.action}
                className="h-8 w-8 p-0"
                title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
                disabled={isPreview}
              >
                <Icon className="h-4 w-4" />
              </Button>
            );
          })}
        </div>
        <Button
          type="button"
          variant={isPreview ? "default" : "outline"}
          size="sm"
          onClick={() => setIsPreview(!isPreview)}
          className="gap-2"
        >
          {isPreview ? (
            <>
              <Edit3 className="h-4 w-4" />
              تحرير
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              معاينة
            </>
          )}
        </Button>
      </div>

      {/* Content Area */}
      <div style={{ minHeight }}>
        {isPreview ? (
          <div className="p-4" style={{ minHeight }}>
            <MarkdownPreview content={value} />
          </div>
        ) : (
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              "border-0 rounded-none focus-visible:ring-0 resize-none font-mono text-sm",
            )}
            style={{ minHeight }}
            dir="rtl"
          />
        )}
      </div>
    </div>
  );
}
