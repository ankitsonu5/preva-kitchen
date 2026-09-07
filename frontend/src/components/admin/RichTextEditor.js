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
  Sparkles,
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

function findEnclosingBlock(editorEl, node) {
  if (!node || !editorEl) return null;
  let curr = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
  while (curr && curr !== editorEl) {
    const tag = curr.tagName?.toLowerCase();
    if (['h1', 'h2', 'h3', 'h4', 'blockquote', 'p', 'div', 'li', 'pre'].includes(tag)) {
      return curr;
    }
    curr = curr.parentElement;
  }
  return null;
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
  const [ctaOpen, setCtaOpen] = useState(false);
  const [ctaHeadline, setCtaHeadline] = useState('Plan Your Next Dining Experience');
  const [ctaDescription, setCtaDescription] = useState('Reserve your table now or browse our handcrafted menu to explore Chef Preva’s latest culinary creations.');
  const [ctaBtn1Text, setCtaBtn1Text] = useState('Reserve a Table');
  const [ctaBtn1Url, setCtaBtn1Url] = useState('/#prv-reservations');
  const [ctaBtn2Text, setCtaBtn2Text] = useState('View Menu');
  const [ctaBtn2Url, setCtaBtn2Url] = useState('/menu');
  const [ctaBtn3Text, setCtaBtn3Text] = useState('Contact Us');
  const [ctaBtn3Url, setCtaBtn3Url] = useState('/contact');

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

  const updateCurrentBlockType = () => {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !editorRef.current?.contains(selection.anchorNode)) return;
    const block = findEnclosingBlock(editorRef.current, selection.anchorNode);
    if (block) {
      const tag = block.tagName?.toLowerCase();
      if (['h1', 'h2', 'h3', 'h4', 'blockquote', 'p'].includes(tag)) {
        setBlockType(tag);
        return;
      }
    }
    setBlockType('p');
  };

  const run = (command, commandValue = null) => {
    if (sourceMode) return;
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false, commandValue);
    rememberSelection();
    updateCurrentBlockType();
    emit();
  };

  const setBlock = (tag) => {
    if (sourceMode) return;
    setBlockType(tag);
    editorRef.current?.focus();
    restoreSelection();

    const selection = window.getSelection();
    let anchorNode = selection?.anchorNode;
    if (!anchorNode && savedRangeRef.current) {
      anchorNode = savedRangeRef.current.startContainer;
    }

    const currentBlock = findEnclosingBlock(editorRef.current, anchorNode);

    if (currentBlock && currentBlock !== editorRef.current && currentBlock.tagName?.toLowerCase() !== 'li') {
      const currentTag = currentBlock.tagName.toLowerCase();
      if (currentTag !== tag) {
        const replacement = document.createElement(tag);
        replacement.innerHTML = currentBlock.innerHTML || '<br>';

        if (!replacement.textContent.trim() && !replacement.querySelector('img, table, iframe, br')) {
          replacement.innerHTML = '<br>';
        }

        currentBlock.parentNode?.replaceChild(replacement, currentBlock);

        const range = document.createRange();
        range.selectNodeContents(replacement);
        range.collapse(false);
        selection?.removeAllRanges();
        selection?.addRange(range);
        savedRangeRef.current = range.cloneRange();
        emit();
        return;
      }
    } else {
      try {
        const ok = document.execCommand('formatBlock', false, `<${tag}>`);
        if (!ok) {
          document.execCommand('formatBlock', false, tag);
        }
      } catch {
        document.execCommand('formatBlock', false, tag);
      }
    }

    rememberSelection();
    emit();
  };

  const handleKeyDown = (event) => {
    if (sourceMode) return;

    if (event.key === 'Enter' && !event.shiftKey) {
      const selection = window.getSelection();
      if (!selection?.rangeCount) return;

      const range = selection.getRangeAt(0);
      let anchorNode = range.startContainer;
      const currentBlock = findEnclosingBlock(editorRef.current, anchorNode);

      if (currentBlock && ['h1', 'h2', 'h3', 'h4'].includes(currentBlock.tagName?.toLowerCase())) {
        event.preventDefault();

        const newParagraph = document.createElement('p');

        const endRange = document.createRange();
        endRange.selectNodeContents(currentBlock);
        endRange.setStart(range.endContainer, range.endOffset);
        const textAfter = endRange.toString();

        if (!textAfter.trim() && !endRange.cloneContents().querySelector('img, table')) {
          newParagraph.innerHTML = '<br>';
          currentBlock.after(newParagraph);
        } else {
          const splitRange = document.createRange();
          splitRange.setStart(range.startContainer, range.startOffset);
          splitRange.setEndAfter(currentBlock.lastChild || currentBlock);
          const frag = splitRange.extractContents();
          if (frag.textContent.trim() || frag.querySelector('img, table')) {
            newParagraph.appendChild(frag);
          } else {
            newParagraph.innerHTML = '<br>';
          }
          currentBlock.after(newParagraph);
        }

        const newRange = document.createRange();
        newRange.setStart(newParagraph, 0);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        savedRangeRef.current = newRange.cloneRange();

        setBlockType('p');
        emit();
        return;
      }

      if (currentBlock && currentBlock.tagName?.toLowerCase() === 'blockquote') {
        const text = currentBlock.textContent.trim();
        if (!text) {
          event.preventDefault();
          const newParagraph = document.createElement('p');
          newParagraph.innerHTML = '<br>';
          currentBlock.parentNode?.replaceChild(newParagraph, currentBlock);
          const newRange = document.createRange();
          newRange.setStart(newParagraph, 0);
          newRange.collapse(true);
          selection.removeAllRanges();
          selection.addRange(newRange);
          savedRangeRef.current = newRange.cloneRange();
          setBlockType('p');
          emit();
          return;
        }
      }
    }
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
    rememberSelection();
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
    setCtaOpen(false);
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
    setCtaOpen(false);
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

  const openCta = () => {
    rememberSelection();
    setLinkOpen(false);
    setTableOpen(false);
    setCtaOpen(true);
  };

  const applyCtaPreset = (preset) => {
    if (preset === 'reservation') {
      setCtaHeadline('Plan Your Next Dining Experience');
      setCtaDescription('Reserve your table now or browse our handcrafted menu to explore Chef Preva’s latest culinary creations.');
      setCtaBtn1Text('Reserve a Table');
      setCtaBtn1Url('/#prv-reservations');
      setCtaBtn2Text('View Menu');
      setCtaBtn2Url('/menu');
      setCtaBtn3Text('Contact Us');
      setCtaBtn3Url('/contact');
    } else if (preset === 'menu') {
      setCtaHeadline('Taste the Art of Preva');
      setCtaDescription('Explore our seasonal flavors, artisanal cocktails, and signature chef-crafted plates.');
      setCtaBtn1Text('Explore Full Menu');
      setCtaBtn1Url('/menu');
      setCtaBtn2Text('Save a Table');
      setCtaBtn2Url('/#prv-reservations');
      setCtaBtn3Text('');
      setCtaBtn3Url('');
    } else if (preset === 'events') {
      setCtaHeadline('Host Your Private Gathering');
      setCtaDescription('From intimate celebrations to corporate dinners, craft unforgettable moments with Preva.');
      setCtaBtn1Text('Inquire for Events');
      setCtaBtn1Url('/contact');
      setCtaBtn2Text('Browse Menu');
      setCtaBtn2Url('/menu');
      setCtaBtn3Text('');
      setCtaBtn3Url('');
    }
  };

  const insertCta = (event) => {
    event.preventDefault();
    const headline = (ctaHeadline || '').trim();
    const desc = (ctaDescription || '').trim();

    let buttonsHtml = '';
    if (ctaBtn1Text.trim() && ctaBtn1Url.trim()) {
      buttonsHtml += `<div class="wp-block-button"><a class="wp-block-button__link" href="${ctaBtn1Url.trim().replace(/"/g, '&quot;')}">${ctaBtn1Text.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</a></div>`;
    }
    if (ctaBtn2Text.trim() && ctaBtn2Url.trim()) {
      buttonsHtml += `<div class="wp-block-button"><a class="wp-block-button__link" href="${ctaBtn2Url.trim().replace(/"/g, '&quot;')}">${ctaBtn2Text.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</a></div>`;
    }
    if (ctaBtn3Text.trim() && ctaBtn3Url.trim()) {
      buttonsHtml += `<div class="wp-block-button"><a class="wp-block-button__link" href="${ctaBtn3Url.trim().replace(/"/g, '&quot;')}">${ctaBtn3Text.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;')}</a></div>`;
    }

    const html = `<div class="wp-block-group has-background">${headline ? `<p style="text-align: center;"><strong>${headline.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</strong></p>` : ''}${desc ? `<p style="text-align: center;">${desc.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>` : ''}${buttonsHtml ? `<div class="wp-block-buttons">${buttonsHtml}</div>` : ''}</div><p><br></p>`;

    insertHtml(html);
    setCtaOpen(false);
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
            onFocus={rememberSelection}
            onMouseDown={rememberSelection}
            onChange={(event) => setBlock(event.target.value)}
          >
            <option value="p">Paragraph</option>
            <option value="h1">Heading 1</option>
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
          <ToolbarButton className="rich-editor-cta-tool" label="Insert Preva CTA Card" disabled={sourceMode} onRun={openCta}>
            <Sparkles size={16} />
            <span>CTA Box</span>
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
          onKeyDown={handleKeyDown}
          onKeyUp={() => { rememberSelection(); updateCurrentBlockType(); }}
          onMouseUp={() => { rememberSelection(); updateCurrentBlockType(); }}
          onClick={() => { rememberSelection(); updateCurrentBlockType(); }}
          onPointerUp={() => { rememberSelection(); updateCurrentBlockType(); }}
          onSelect={() => { rememberSelection(); updateCurrentBlockType(); }}
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

      {ctaOpen && (
        <div className="rich-editor-link-popover rich-editor-cta-popover" role="dialog" aria-modal="true" aria-label="Insert CTA Box">
          <form onSubmit={insertCta}>
            <div className="rich-editor-link-heading">
              <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={16} color="var(--gold)" /> Insert CTA Card
              </strong>
              <button type="button" onClick={() => setCtaOpen(false)} aria-label="Close CTA dialog">×</button>
            </div>

            <div className="rich-editor-cta-presets">
              <span>Quick Presets:</span>
              <button type="button" onClick={() => applyCtaPreset('reservation')} className="rich-editor-preset-pill">🍽️ Reservation</button>
              <button type="button" onClick={() => applyCtaPreset('menu')} className="rich-editor-preset-pill">📋 Menu</button>
              <button type="button" onClick={() => applyCtaPreset('events')} className="rich-editor-preset-pill">🥂 Events</button>
            </div>

            <label htmlFor="editor-cta-headline">Headline / Title</label>
            <input
              id="editor-cta-headline"
              className="input"
              value={ctaHeadline}
              onChange={(event) => setCtaHeadline(event.target.value)}
              placeholder="e.g. Plan Your Next Dining Experience"
              required
            />

            <label htmlFor="editor-cta-description" style={{ marginTop: '10px' }}>Description / Message</label>
            <textarea
              id="editor-cta-description"
              className="input"
              style={{ minHeight: '64px', resize: 'vertical', fontSize: '12.5px', lineHeight: '1.4' }}
              value={ctaDescription}
              onChange={(event) => setCtaDescription(event.target.value)}
              placeholder="e.g. Reserve your table now or browse our handcrafted menu..."
            />

            <div className="rich-editor-cta-btn-group" style={{ marginTop: '12px' }}>
              <strong className="rich-editor-cta-group-title">Primary Button (Required)</strong>
              <div className="rich-editor-table-fields">
                <label>
                  Button Text
                  <input className="input" value={ctaBtn1Text} onChange={(e) => setCtaBtn1Text(e.target.value)} placeholder="Reserve a Table" required />
                </label>
                <label>
                  Link URL
                  <input className="input" value={ctaBtn1Url} onChange={(e) => setCtaBtn1Url(e.target.value)} placeholder="/#prv-reservations" required />
                </label>
              </div>
            </div>

            <div className="rich-editor-cta-btn-group">
              <strong className="rich-editor-cta-group-title">Secondary Button (Optional)</strong>
              <div className="rich-editor-table-fields">
                <label>
                  Button Text
                  <input className="input" value={ctaBtn2Text} onChange={(e) => setCtaBtn2Text(e.target.value)} placeholder="View Menu" />
                </label>
                <label>
                  Link URL
                  <input className="input" value={ctaBtn2Url} onChange={(e) => setCtaBtn2Url(e.target.value)} placeholder="/menu" />
                </label>
              </div>
            </div>

            <div className="rich-editor-cta-btn-group">
              <strong className="rich-editor-cta-group-title">Tertiary Button (Optional)</strong>
              <div className="rich-editor-table-fields">
                <label>
                  Button Text
                  <input className="input" value={ctaBtn3Text} onChange={(e) => setCtaBtn3Text(e.target.value)} placeholder="Contact Us" />
                </label>
                <label>
                  Link URL
                  <input className="input" value={ctaBtn3Url} onChange={(e) => setCtaBtn3Url(e.target.value)} placeholder="/contact" />
                </label>
              </div>
            </div>

            <p className="rich-editor-link-help" style={{ marginTop: '8px' }}>
              Inserts a beautiful luxury dark callout card with gold pill buttons. You can also edit text directly in the visual editor canvas after inserting.
            </p>

            <div className="rich-editor-link-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setCtaOpen(false)}>Cancel</button>
              <button type="submit" className="btn">Insert CTA Box</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
});

export default RichTextEditor;
