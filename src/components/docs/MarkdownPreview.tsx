interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

export function MarkdownPreview({ content, className = "" }: MarkdownPreviewProps) {
  const renderMarkdown = (text: string): string => {
    if (!text) return '<p class="text-muted-foreground">لا يوجد محتوى</p>';

    let html = text
      // Code blocks (must be first to prevent other replacements inside)
      .replace(/```([\s\S]*?)```/gim, '<pre class="bg-muted p-4 rounded-lg overflow-x-auto my-4 text-sm"><code>$1</code></pre>')
      // Inline code
      .replace(/`([^`]+)`/gim, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm">$1</code>')
      // Headings
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-6 mb-3">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')
      // Bold and Italic
      .replace(/\*\*\*(.*?)\*\*\*/gim, '<strong><em>$1</em></strong>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" class="text-primary underline hover:no-underline" target="_blank" rel="noopener noreferrer">$1</a>')
      // Unordered lists
      .replace(/^\- (.*$)/gim, '<li class="mr-4 list-disc list-inside">$1</li>')
      // Ordered lists
      .replace(/^\d+\. (.*$)/gim, '<li class="mr-4 list-decimal list-inside">$1</li>')
      // Horizontal rule
      .replace(/^---$/gim, '<hr class="my-6 border-border" />')
      // Line breaks
      .replace(/\n/gim, '<br/>');

    // Wrap consecutive list items in ul/ol
    html = html.replace(
      /(<li class="mr-4 list-disc[^"]*">.*?<\/li>(<br\/>)?)+/gi,
      (match) => `<ul class="my-2 space-y-1">${match.replace(/<br\/>/g, '')}</ul>`
    );
    html = html.replace(
      /(<li class="mr-4 list-decimal[^"]*">.*?<\/li>(<br\/>)?)+/gi,
      (match) => `<ol class="my-2 space-y-1">${match.replace(/<br\/>/g, '')}</ol>`
    );

    return html;
  };

  return (
    <div
      className={`prose prose-sm max-w-none dark:prose-invert ${className}`}
      dir="rtl"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
    />
  );
}
