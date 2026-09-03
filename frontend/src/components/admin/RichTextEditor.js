'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState
} from 'react';
import {
  AlignCenter,
  AlignLeft,
  Bold,
  Code2,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Pilcrow,
  Quote,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Table2,
  Underline,
  Undo2,
  Unlink
} from 'lucide-react';

const ToolbarButton = ({ label, children, onRun, active = false, disabled = false, className = '' }) => (
  <button
    type="button"
    className={`rich-editor-tool${className ? ` ${className}` : ''}${active ? ' is-active' : ''}`}
    title={label}
    aria-label={label}
    aria-pressed={active || undefined}
    disabled={disabled}
    onMouseDown={(event) => event.preventDefault()}
    onClick={onRun}
  >
    {children}
  </button>
);

function plainTextFromHtml(html) {
  if (typeof document === 'undefined') return String(html || '').replace(/<[^>]*>/g, ' ');
  const element = document.createElement('div');
  element.innerHTML = html || '';
  return element.textContent || '';
}

function isSafeEditorUrl(value) {
  const url = String(value || '').trim();
  return /^(https?:\/\/|mailto:|tel:|\/|#)/i.test(url);
}

const RichTextEditor = forwardRef(function RichTextEditor(
  { value = '', onChange, onOpenMedia, required = false },
  forwardedRef
) {
  const editorRef = useRef(null);
  const savedRangeRef = useRef(null);
  const [sourceMode, setSourceMode] = useState(false);
  const [source, setSource] = useState(value);
  const [blockType, setBlockType] = useState('p');
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('https://');
  const [linkNewTab, setLinkNewTab] = useState(false);
  const [linkNoFollow, setLinkNoFollow] = useState(false);
  const [tableOpen, setTableOpen] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableColumns, setTableColumns] = useState(3);
  const [tableHeader, setTableHeader] = useState(true);
  const [tableCaption, setTableCaption] = useState('');

  useEffect(() => {
    setSource(value || '');
    if (!sourceMode && editorRef.current && document.activeElement !== editorRef.current) {
      if (editorRef.current.innerHTML !== (value || '')) editorRef.current.innerHTML = value || '';
    }
  }, [value, sourceMode]);

  const emit = () => {
    const html = editorRef.current?.innerHTML || '';
    setSource(html);
    onChange(html);
  };

  const rememberSelection = () => {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !editorRef.current?.contains(selection.anchorNode)) return;
    savedRangeRef.current = selection.getRangeAt(0).cloneRange();
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (!selection || !savedRangeRef.current) return false;
    selection.removeAllRanges();
    selection.addRange(savedRangeRef.current);
    return true;
  };

  const run = (command, commandValue = null) => {
    if (sourceMode) return;
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    rememberSelection();
    emit();
  };

  const setBlock = (tag) => {
    setBlockType(tag);
    run('formatBlock', `<${tag}>`);
  };

  const insertHtml = (html) => {
    if (sourceMode) {
      const next = `${source}${html}`;
      setSource(next);
      onChange(next);
      return;
    }
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand('insertHTML', false, html);
    emit();
  };

  useImperativeHandle(forwardedRef, () => ({
    insertImage(url, alt = '') {
      const safeUrl = String(url || '').replace(/"/g, '&quot;');
      const safeAlt = String(alt || '').replace(/"/g, '&quot;');
      if (safeUrl) insertHtml(`<figure><img src="${safeUrl}" alt="${safeAlt}" loading="lazy"><figcaption></figcaption></figure><p><br></p>`);
    }
  }));

  const toggleSource = () => {
    if (sourceMode) {
      onChange(source);
      setSourceMode(false);
      requestAnimationFrame(() => {
        if (editorRef.current) editorRef.current.innerHTML = source;
      });
      return;
    }
    setSource(editorRef.current?.innerHTML || value || '');
    setSourceMode(true);
  };

  const openLink = () => {
    rememberSelection();
    setTableOpen(false);
    setLinkUrl('https://');
    setLinkNewTab(false);
    setLinkNoFollow(false);
    setLinkOpen(true);
  };

  const applyLink = (event) => {
    event.preventDefault();
    const url = linkUrl.trim();
    if (!isSafeEditorUrl(url)) return;

    editorRef.current?.focus();
    const restored = restoreSelection();
    const selection = window.getSelection();
    const selectedText = restored ? selection?.toString() : '';

    if (selectedText) {
      document.execCommand('createLink', false, url);
      const anchorNode = selection?.anchorNode?.nodeType === Node.TEXT_NODE
        ? selection.anchorNode.parentElement
        : selection?.anchorNode;
      const anchor = anchorNode?.closest?.('a');
      if (anchor) {
        if (linkNewTab) anchor.setAttribute('target', '_blank');
        else anchor.removeAttribute('target');
        const rel = [linkNewTab ? 'noopener' : '', linkNewTab ? 'noreferrer' : '', linkNoFollow ? 'nofollow' : '']
          .filter(Boolean)
          .join(' ');
        if (rel) anchor.setAttribute('rel', rel);
        else anchor.removeAttribute('rel');
      }
    } else {
      const safeUrl = url.replace(/"/g, '&quot;');
      const rel = [linkNewTab ? 'noopener' : '', linkNewTab ? 'noreferrer' : '', linkNoFollow ? 'nofollow' : '']
        .filter(Boolean)
        .join(' ');
      insertHtml(`<a href="${safeUrl}"${linkNewTab ? ' target="_blank"' : ''}${rel ? ` rel="${rel}"` : ''}>${safeUrl}</a>`);
    }

    emit();
    setLinkOpen(false);
  };

  const openTable = () => {
    rememberSelection();
    setLinkOpen(false);
    setTableRows(3);
    setTableColumns(3);
    setTableHeader(true);
    setTableCaption('');
    setTableOpen(true);
  };

  const insertTable = (event) => {
    event.preventDefault();
    const rows = Math.min(20, Math.max(1, Number(tableRows) || 1));
    const columns = Math.min(10, Math.max(1, Number(tableColumns) || 1));
    const captionText = tableCaption.trim();
    const caption = captionText
      ? `<caption>${captionText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</caption>`
      : '';
    const header = tableHeader
      ? `<thead><tr>${Array.from({ length: columns }, (_, index) => `<th scope="col">Column ${index + 1}</th>`).join('')}</tr></thead>`
      : '';
    const body = Array.from(
      { length: rows },
      () => `<tr>${Array.from({ length: columns }, () => '<td>Cell</td>').join('')}</tr>`
    ).join('');

    insertHtml(`<div class="blog-table-wrap"><table>${caption}${header}<tbody>${body}</tbody></table></div><p><br></p>`);
    setTableOpen(false);
  };

  const text = plainTextFromHtml(sourceMode ? source : value).trim();
  const wordCount = text ? text.split(/\s+/).filter(Boolean).length : 0;
  const readingMinutes = Math.max(1, Math.ceil(wordCount / 220));

  return (
    <div className="rich-editor-shell">
      <div className="rich-editor-toolbar" role="toolbar" aria-label="Content formatting">
        <div className="rich-editor-tool-group">
          <select
            className="rich-editor-format"
            aria-label="Text style"
            value={blockType}
            disabled={sourceMode}
            onChange={(event) => setBlock(event.target.value)}
          >
            <option value="p">Paragraph</option>
            <option value="h2">Heading 2</option>
            <option value="h3">Heading 3</option>
            <option value="h4">Heading 4</option>
            <option value="blockquote">Quote</option>
          </select>
        </div>

        <div className="rich-editor-tool-group">
          <ToolbarButton label="Bold" disabled={sourceMode} onRun={() => run('bold')}><Bold size={16} /></ToolbarButton>
          <ToolbarButton label="Italic" disabled={sourceMode} onRun={() => run('italic')}><Italic size={16} /></ToolbarButton>
          <ToolbarButton label="Underline" disabled={sourceMode} onRun={() => run('underline')}><Underline size={16} /></ToolbarButton>
          <ToolbarButton label="Strikethrough" disabled={sourceMode} onRun={() => run('strikeThrough')}><Strikethrough size={16} /></ToolbarButton>
        </div>

        <div className="rich-editor-tool-group">
          <ToolbarButton label="Bulleted list" disabled={sourceMode} onRun={() => run('insertUnorderedList')}><List size={16} /></ToolbarButton>
          <ToolbarButton label="Numbered list" disabled={sourceMode} onRun={() => run('insertOrderedList')}><ListOrdered size={16} /></ToolbarButton>
          <ToolbarButton label="Preva quote" disabled={sourceMode} onRun={() => setBlock('blockquote')}><Quote size={16} /></ToolbarButton>
          <ToolbarButton className="rich-editor-table-tool" label="Insert table" disabled={sourceMode} onRun={openTable}>
            <Table2 size={16} />
            <span>Table</span>
          </ToolbarButton>
        </div>

        <div className="rich-editor-tool-group">
          <ToolbarButton label="Align left" disabled={sourceMode} onRun={() => run('justifyLeft')}><AlignLeft size={16} /></ToolbarButton>
          <ToolbarButton label="Align center" disabled={sourceMode} onRun={() => run('justifyCenter')}><AlignCenter size={16} /></ToolbarButton>
          <ToolbarButton label="Insert link" disabled={sourceMode} onRun={openLink}><LinkIcon size={16} /></ToolbarButton>
          <ToolbarButton label="Remove link" disabled={sourceMode} onRun={() => run('unlink')}><Unlink size={16} /></ToolbarButton>
          <ToolbarButton label="Insert image from media" disabled={sourceMode || !onOpenMedia} onRun={() => { rememberSelection(); onOpenMedia?.(); }}><ImagePlus size={16} /></ToolbarButton>
        </div>

        <div className="rich-editor-tool-group rich-editor-tool-group-right">
          <ToolbarButton label="Undo" disabled={sourceMode} onRun={() => run('undo')}><Undo2 size={16} /></ToolbarButton>
          <ToolbarButton label="Redo" disabled={sourceMode} onRun={() => run('redo')}><Redo2 size={16} /></ToolbarButton>
          <ToolbarButton label="Clear formatting" disabled={sourceMode} onRun={() => run('removeFormat')}><RemoveFormatting size={16} /></ToolbarButton>
          <ToolbarButton label={sourceMode ? 'Visual editor' : 'Edit HTML'} active={sourceMode} onRun={toggleSource}>
            {sourceMode ? <Pilcrow size={16} /> : <Code2 size={16} />}
          </ToolbarButton>
        </div>
      </div>

      {sourceMode ? (
        <textarea
          className="rich-editor-source"
          value={source}
          required={required}
          spellCheck="false"
          aria-label="HTML source"
          onChange={(event) => {
            setSource(event.target.value);
            onChange(event.target.value);
          }}
        />
      ) : (
        <div
          ref={editorRef}
          className="rich-editor-canvas"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label="Post content"
          data-placeholder="Start writing your story…"
          onInput={emit}
          onKeyUp={rememberSelection}
          onMouseUp={rememberSelection}
          onBlur={rememberSelection}
        />
      )}

      <div className="rich-editor-status">
        <span>{sourceMode ? 'HTML source' : 'Visual editor'}</span>
        <span>{wordCount} words · about {readingMinutes} min read</span>
      </div>

      {linkOpen && (
        <div className="rich-editor-link-popover" role="dialog" aria-modal="true" aria-label="Insert link">
          <form onSubmit={applyLink}>
            <div className="rich-editor-link-heading">
              <strong>Insert link</strong>
              <button type="button" onClick={() => setLinkOpen(false)} aria-label="Close link dialog">×</button>
            </div>
            <label htmlFor="editor-link-url">URL</label>
            <input
              id="editor-link-url"
              className="input"
              value={linkUrl}
              autoFocus
              required
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://example.com/page"
            />
            <p className="rich-editor-link-help">Use a full URL, /internal-page, #section, mailto: or tel: link.</p>
            <label className="rich-editor-link-option">
              <input type="checkbox" checked={linkNewTab} onChange={(event) => setLinkNewTab(event.target.checked)} />
              Open in a new tab
            </label>
            <label className="rich-editor-link-option">
              <input type="checkbox" checked={linkNoFollow} onChange={(event) => setLinkNoFollow(event.target.checked)} />
              Mark as nofollow
            </label>
            <div className="rich-editor-link-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setLinkOpen(false)}>Cancel</button>
              <button type="submit" className="btn">Add link</button>
            </div>
          </form>
        </div>
      )}

      {tableOpen && (
        <div className="rich-editor-link-popover rich-editor-table-popover" role="dialog" aria-modal="true" aria-label="Insert table">
          <form onSubmit={insertTable}>
            <div className="rich-editor-link-heading">
              <strong>Insert table</strong>
              <button type="button" onClick={() => setTableOpen(false)} aria-label="Close table dialog">×</button>
            </div>
            <div className="rich-editor-table-fields">
              <label>
                Body rows
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="20"
                  value={tableRows}
                  onChange={(event) => setTableRows(event.target.value)}
                />
              </label>
              <label>
                Columns
                <input
                  className="input"
                  type="number"
                  min="1"
                  max="10"
                  value={tableColumns}
                  onChange={(event) => setTableColumns(event.target.value)}
                />
              </label>
            </div>
            <label htmlFor="editor-table-caption">
              Table caption <span className="rich-editor-optional">Optional</span>
            </label>
            <input
              id="editor-table-caption"
              className="input"
              value={tableCaption}
              maxLength={160}
              onChange={(event) => setTableCaption(event.target.value)}
              placeholder="For example: Current menu comparison"
            />
            <label className="rich-editor-link-option">
              <input type="checkbox" checked={tableHeader} onChange={(event) => setTableHeader(event.target.checked)} />
              Include a header row
            </label>
            <p className="rich-editor-link-help">After inserting, click directly inside any cell to replace its text.</p>
            <div className="rich-editor-link-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setTableOpen(false)}>Cancel</button>
              <button type="submit" className="btn">Insert table</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
});

export default RichTextEditor;
