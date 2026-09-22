import React, { useEffect, useRef, useState } from 'react';
import Quill from 'quill';
import 'quill/dist/quill.snow.css';
import { LatexModal } from './QuillEditor';
import { OPTION_LATEX_SYMBOLS } from '../utils/latexSymbols';

// Toolbar minimal untuk opsi jawaban
const TOOLBAR_OPTIONS = [
  ['bold', 'italic', 'underline'],
  [{ color: [] }],
  ['clean'],
];

export default function OptionQuillEditor({ value, onChange, placeholder = 'Tulis opsi...' }) {
  const containerRef  = useRef(null);
  const quillRef      = useRef(null);
  const isUpdatingRef = useRef(false);
  const [showLatex, setShowLatex] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    if (quillRef.current) return;

    const editorEl = containerRef.current.appendChild(
      document.createElement('div')
    );

    const quill = new Quill(editorEl, {
      theme: 'snow',
      placeholder,
      modules: { toolbar: TOOLBAR_OPTIONS },
    });

    quillRef.current = quill;

    // Capture paste listener to preserve raw code and HTML document tags cleanly
    const handlePaste = (e) => {
      const text = e.clipboardData?.getData('text/plain');
      if (text && /<(!doctype|html|head|meta|link|script|style|body|header|footer|nav)[\s>/]/i.test(text)) {
        e.preventDefault();
        e.stopPropagation();
        const selection = quill.getSelection(true);
        const idx = selection ? selection.index : quill.getLength();
        quill.insertText(idx, text, 'user');
        quill.setSelection(idx + text.length, 0);
      }
    };
    editorEl.addEventListener('paste', handlePaste, true);

    if (value) {
      try {
        quill.clipboard.dangerouslyPasteHTML(value);
      } catch {
        quill.setText(value);
      }
    }

    quill.on('text-change', (delta, oldDelta, source) => {
      if (isUpdatingRef.current) return;
      if (source === 'user') {
        const html = quill.root.innerHTML;
        const isEmpty =
          html === '<p><br></p>' || html === '<p></p>' || html.trim() === '';
        onChange(isEmpty ? '' : html);
      }
    });

    return () => {
      editorEl.removeEventListener('paste', handlePaste, true);
    };
  }, []);

  // Sync value dari luar kalau berubah (mis. reset)
  useEffect(() => {
    if (!quillRef.current) return;
    const quill = quillRef.current;
    if (quill.hasFocus()) return;

    const currentHtml = quill.root.innerHTML;
    const normValue   = value || '';
    const normCurrent =
      currentHtml === '<p><br></p>' || currentHtml === '<p></p>'
        ? ''
        : currentHtml;

    if (normValue !== normCurrent) {
      isUpdatingRef.current = true;
      if (normValue) {
        try {
          quill.clipboard.dangerouslyPasteHTML(normValue);
        } catch {
          quill.setText(normValue);
        }
      } else {
        quill.setText('');
      }
      isUpdatingRef.current = false;
    }
  }, [value]);

  // Insert teks / formula ke posisi kursor
  function insertAtCursor(text) {
    const quill = quillRef.current;
    if (!quill) return;
    const range = quill.getSelection(true);
    const idx   = range ? range.index : quill.getLength();
    quill.insertText(idx, text, 'user');
    quill.setSelection(idx + text.length, 0);
  }

  return (
    <>
      <div className="option-quill-wrapper flex-1 min-w-0 rounded-lg border border-gray-200 bg-white hover:border-[#1a4fa0] focus-within:border-[#1a4fa0] focus-within:ring-2 focus-within:ring-[#1a4fa0]/15 transition-all flex flex-col relative">
        <div ref={containerRef} className="flex-1" />
        {/* Tombol sisipkan rumus di toolbar kanan */}
        <div className="flex items-center justify-end px-2 py-1 bg-gray-50/70 border-t border-gray-100 dark:border-slate-700/60 dark:bg-slate-800/50">
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setShowLatex(true); }}
            title="Insert rumus matematika / LaTeX ($...$)"
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-[#1a4fa0] dark:text-[#60a5fa] hover:bg-[#eef5fb] dark:hover:bg-slate-700/60 border border-transparent hover:border-[#d4e5fa] transition cursor-pointer"
          >
            <span className="font-serif text-[13px] leading-none font-bold">∑</span>
            <span>Rumus</span>
          </button>
        </div>
      </div>

      {showLatex && (
        <LatexModal
          symbols={OPTION_LATEX_SYMBOLS}
          onInsert={insertAtCursor}
          onClose={() => setShowLatex(false)}
        />
      )}
    </>
  );
}
