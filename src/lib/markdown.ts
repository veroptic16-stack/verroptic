import { marked } from 'marked';

// Texte rédigé dans l'admin (Markdown simple) → HTML. Le HTML brut saisi est neutralisé.
const renderer = new marked.Renderer();
renderer.html = ({ text }) => text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function renderMarkdown(text: string | null | undefined): string {
  if (!text) return '';
  return marked.parse(text, { renderer, async: false, gfm: true, breaks: true }) as string;
}
