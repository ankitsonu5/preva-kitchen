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
  CircleHelp,
  Code2,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Pilcrow,
  Plus,
  Quote,
  Redo2,
  RemoveFormatting,
  Sparkles,
  Strikethrough,
  Table2,
  Trash2,
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
  // Set by openLink when the cursor was already inside an <a> — lets
  // applyLink update that link in place and lets the dialog offer "Remove link".
  const editingLinkRef = useRef(null);
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
  // Starts blank — this is a "build your own CTA" form, not a pre-filled
  // template. The Quick Presets pills (below) are the opt-in shortcut for
  // canned copy; the fields themselves only carry example placeholder text.
  const [ctaHeadline, setCtaHeadline] = useState('');
  const [ctaDescription, setCtaDescription] = useState('');
  const [ctaBtn1Text, setCtaBtn1Text] = useState('');
  const [ctaBtn1Url, setCtaBtn1Url] = useState('');
  const [ctaBtn2Text, setCtaBtn2Text] = useState('');
  const [ctaBtn2Url, setCtaBtn2Url] = useState('');
  const [ctaBtn3Text, setCtaBtn3Text] = useState('');
  const [ctaBtn3Url, setCtaBtn3Url] = useState('');
  const [faqOpen, setFaqOpen] = useState(false);
  const [faqTitle, setFaqTitle] = useState('Frequently Asked Questions');
  const [faqItems, setFaqItems] = useState([
    { question: '', answer: '' },
    { question: '', answer: '' }
  ]);

  useEffect(() => {
    setSource(value || '');
    if (!sourceMode && editorRef.current && document.activeElement !== editorRef.current) {
      if (editorRef.current.innerHTML !== (value || '')) editorRef.current.innerHTML = value || '';
      decorateDeletableBlocks();
    }
  }, [value, sourceMode]);

  const lastActiveBlockRef = useRef(null);
  const MARKER_ID = 'preva-editor-insert-marker';

  // The hover "×" on CTA/FAQ/table blocks (see decorateDeletableBlocks) is
  // editor-only chrome, injected as real DOM nodes — strip it from a clone
  // rather than the live editor before reading HTML out for saving or for
  // the Edit HTML view, so it never leaks into saved/published content.
  const readCleanHtml = () => {
    if (!editorRef.current) return '';
    if (!editorRef.current.querySelector('.rich-editor-block-delete')) return editorRef.current.innerHTML || '';
    const clone = editorRef.current.cloneNode(true);
    clone.querySelectorAll('.rich-editor-block-delete').forEach((btn) => btn.remove());
    clone.querySelectorAll('[data-block-controls]').forEach((el) => {
      el.removeAttribute('data-block-controls');
      el.classList.remove('rich-editor-removable-block');
    });
    return clone.innerHTML || '';
  };

  const emit = () => {
    const html = readCleanHtml();
    setSource(html);
    onChange(html);
  };

  const rememberSelection = () => {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !editorRef.current?.contains(selection.anchorNode)) return;
    savedRangeRef.current = selection.getRangeAt(0).cloneRange();
    const block = findEnclosingBlock(editorRef.current, selection.anchorNode);
    if (block && block !== editorRef.current) {
      lastActiveBlockRef.current = block;
    }
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    if (!selection || !savedRangeRef.current) return false;
    selection.removeAllRanges();
    selection.addRange(savedRangeRef.current);
    return true;
  };

  const plantMarker = () => {
    removeMarker();
    if (sourceMode || !editorRef.current) return;

    const marker = document.createElement('span');
    marker.id = MARKER_ID;
    marker.setAttribute('data-preva-marker', 'true');
    marker.style.display = 'none';

    const selection = window.getSelection();
    let range = null;
    if (selection?.rangeCount && editorRef.current.contains(selection.anchorNode)) {
      range = selection.getRangeAt(0).cloneRange();
    } else if (savedRangeRef.current && editorRef.current.contains(savedRangeRef.current.startContainer)) {
      range = savedRangeRef.current.cloneRange();
    }

    if (range) {
      const block = findEnclosingBlock(editorRef.current, range.startContainer);
      if (block && block !== editorRef.current && block.parentNode) {
        block.after(marker);
        return;
      } else {
        range.collapse(true);
        range.insertNode(marker);
        return;
      }
    }

    if (lastActiveBlockRef.current && editorRef.current.contains(lastActiveBlockRef.current) && lastActiveBlockRef.current !== editorRef.current && lastActiveBlockRef.current.parentNode) {
      lastActiveBlockRef.current.after(marker);
      return;
    }

    editorRef.current.appendChild(marker);
  };

  const removeMarker = () => {
    const marker = editorRef.current?.querySelector(`#${MARKER_ID}`);
    if (marker) marker.remove();
  };

  // CTA cards, FAQ accordions and tables are inserted as a few nested tags,
  // not one draggable "block" — there's no obvious way to select and delete
  // the whole thing by hand. Give each one a small hover "×" instead, wired
  // with a real DOM listener (not an inline HTML attribute) so it works
  // however the block got into the document — inserted just now, loaded
  // from a saved post, or pasted in via Edit HTML.
  const DELETABLE_BLOCK_SELECTOR = '.wp-block-group, .preva-faq-block, .blog-table-wrap';

  const decorateDeletableBlocks = () => {
    if (!editorRef.current) return;
    editorRef.current.querySelectorAll(DELETABLE_BLOCK_SELECTOR).forEach((block) => {
      if (block.dataset.blockControls) return;
      block.dataset.blockControls = '1';
      block.classList.add('rich-editor-removable-block');
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'rich-editor-block-delete';
      btn.setAttribute('aria-label', 'Remove this block');
      btn.setAttribute('contenteditable', 'false');
      btn.textContent = '×';
      btn.addEventListener('mousedown', (evt) => evt.preventDefault());
      btn.addEventListener('click', (evt) => {
        evt.preventDefault();
        evt.stopPropagation();
        block.remove();
        emit();
      });
      block.insertBefore(btn, block.firstChild);
    });
  };

  const updateCurrentBlockType = () => {
    const selection = window.getSelection();
    if (!selection?.rangeCount || !editorRef.current?.contains(selection.anchorNode)) return;
    const block = findEnclosingBlock(editorRef.current, selection.anchorNode);
    if (block) {
      lastActiveBlockRef.current = block;
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
      const next = `${source}\n\n${html}\n\n`;
      setSource(next);
      onChange(next);
      return;
    }

    const marker = editorRef.current?.querySelector(`#${MARKER_ID}`);
    const temp = document.createElement('div');
    temp.innerHTML = html;
    const frag = document.createDocumentFragment();
    let firstInsertedNode = null;
    let lastInsertedNode = null;
    while (temp.firstChild) {
      if (!firstInsertedNode) firstInsertedNode = temp.firstChild;
      lastInsertedNode = temp.firstChild;
      frag.appendChild(temp.firstChild);
    }

    const trailingP = document.createElement('p');
    trailingP.innerHTML = '<br>';

    if (marker && marker.parentNode) {
      marker.parentNode.insertBefore(frag, marker);
      marker.parentNode.insertBefore(trailingP, marker);
      marker.remove();
    } else {
      const selection = window.getSelection();
      let range = savedRangeRef.current;

      if (!range || !editorRef.current?.contains(range.startContainer)) {
        if (selection?.rangeCount && editorRef.current?.contains(selection.anchorNode)) {
          range = selection.getRangeAt(0);
        }
      }

      if (range && editorRef.current?.contains(range.startContainer)) {
        const block = findEnclosingBlock(editorRef.current, range.startContainer);
        if (block && block !== editorRef.current && block.parentNode) {
          block.after(frag);
          if (lastInsertedNode && lastInsertedNode.parentNode) {
            lastInsertedNode.after(trailingP);
          } else {
            block.after(trailingP);
          }
        } else {
          range.deleteContents();
          range.insertNode(frag);
          if (lastInsertedNode && lastInsertedNode.parentNode) {
            lastInsertedNode.after(trailingP);
          } else {
            editorRef.current?.appendChild(trailingP);
          }
        }
      } else if (lastActiveBlockRef.current && editorRef.current?.contains(lastActiveBlockRef.current) && lastActiveBlockRef.current !== editorRef.current && lastActiveBlockRef.current.parentNode) {
        lastActiveBlockRef.current.after(frag);
        if (lastInsertedNode && lastInsertedNode.parentNode) {
          lastInsertedNode.after(trailingP);
        } else {
          lastActiveBlockRef.current.after(trailingP);
        }
      } else {
        editorRef.current?.appendChild(frag);
        editorRef.current?.appendChild(trailingP);
      }
    }

    // Smoothly scroll the inserted block into view so user sees it right in front of them
    const targetToScroll = firstInsertedNode || trailingP;
    if (targetToScroll && typeof targetToScroll.scrollIntoView === 'function') {
      setTimeout(() => {
        try {
          targetToScroll.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } catch {}
      }, 60);
    }

    // Place cursor in the trailing paragraph
    const selection = window.getSelection();
    const newRange = document.createRange();
    newRange.setStart(trailingP, 0);
    newRange.collapse(true);
    selection?.removeAllRanges();
    selection?.addRange(newRange);
    savedRangeRef.current = newRange.cloneRange();

    decorateDeletableBlocks();
    emit();
  };

  useImperativeHandle(forwardedRef, () => ({
    insertImage(url, alt = '', caption = '') {
      const safeUrl = String(url || '').replace(/"/g, '&quot;');
      const safeAlt = String(alt || '').replace(/"/g, '&quot;');
      const safeCaption = String(caption || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      if (safeUrl) insertHtml(`<figure><img src="${safeUrl}" alt="${safeAlt}" loading="lazy"><figcaption>${safeCaption}</figcaption></figure><p><br></p>`);
    }
  }));

  const toggleSource = () => {
    if (sourceMode) {
      onChange(source);
      setSourceMode(false);
      requestAnimationFrame(() => {
        if (editorRef.current) {
          editorRef.current.innerHTML = source;
          decorateDeletableBlocks();
        }
      });
      return;
    }
    setSource(readCleanHtml() || value || '');
    setSourceMode(true);
  };

  const openLink = () => {
    rememberSelection();
    plantMarker();
    setTableOpen(false);
    setCtaOpen(false);
    setFaqOpen(false);

    // If the cursor is already inside a link, edit that link instead of
    // starting a blank one — pre-fill its URL/options and reveal "Remove link".
    const selection = window.getSelection();
    const anchorNode = selection?.anchorNode;
    const nodeEl = anchorNode ? (anchorNode.nodeType === Node.TEXT_NODE ? anchorNode.parentElement : anchorNode) : null;
    const existingAnchor = nodeEl?.closest?.('a');
    const editingExisting = existingAnchor && editorRef.current?.contains(existingAnchor);
    editingLinkRef.current = editingExisting ? existingAnchor : null;

    if (editingExisting) {
      setLinkUrl(existingAnchor.getAttribute('href') || 'https://');
      setLinkNewTab(existingAnchor.getAttribute('target') === '_blank');
      setLinkNoFollow((existingAnchor.getAttribute('rel') || '').includes('nofollow'));
    } else {
      setLinkUrl('https://');
      setLinkNewTab(false);
      setLinkNoFollow(false);
    }
    setLinkOpen(true);
  };

  const removeLink = () => {
    const anchor = editingLinkRef.current;
    editingLinkRef.current = null;
    removeMarker();
    if (anchor && editorRef.current?.contains(anchor)) {
      const parent = anchor.parentNode;
      while (anchor.firstChild) parent.insertBefore(anchor.firstChild, anchor);
      parent.removeChild(anchor);
      emit();
    }
    setLinkOpen(false);
  };

  const closeLink = () => {
    editingLinkRef.current = null;
    removeMarker();
    setLinkOpen(false);
  };

  const applyLink = () => {
    const url = linkUrl.trim();
    if (!isSafeEditorUrl(url)) return;

    const rel = [linkNewTab ? 'noopener' : '', linkNewTab ? 'noreferrer' : '', linkNoFollow ? 'nofollow' : '']
      .filter(Boolean)
      .join(' ');

    // Editing a link the cursor was already inside of (see openLink): update
    // it in place rather than re-running selection-based createLink, which
    // needs a live text selection that the dialog's own focus may have lost.
    const existingAnchor = editingLinkRef.current;
    if (existingAnchor && editorRef.current?.contains(existingAnchor)) {
      removeMarker();
      existingAnchor.setAttribute('href', url);
      if (linkNewTab) existingAnchor.setAttribute('target', '_blank');
      else existingAnchor.removeAttribute('target');
      if (rel) existingAnchor.setAttribute('rel', rel);
      else existingAnchor.removeAttribute('rel');
      existingAnchor.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      editingLinkRef.current = null;
      emit();
      setLinkOpen(false);
      return;
    }

    // preventScroll: focusing the whole (often very tall) editor div would
    // otherwise make the browser scroll to bring its top into view — losing
    // the spot the link was just added at. We scroll to the actual link
    // below instead, once we know exactly where it landed.
    editorRef.current?.focus({ preventScroll: true });
    const restored = restoreSelection();
    const selection = window.getSelection();
    const selectedText = restored ? selection?.toString() : '';
    let insertedAnchor = null;

    if (selectedText) {
      removeMarker();
      document.execCommand('createLink', false, url);
      const anchorNode = selection?.anchorNode?.nodeType === Node.TEXT_NODE
        ? selection.anchorNode.parentElement
        : selection?.anchorNode;
      insertedAnchor = anchorNode?.closest?.('a');
      if (insertedAnchor) {
        if (linkNewTab) insertedAnchor.setAttribute('target', '_blank');
        else insertedAnchor.removeAttribute('target');
        if (rel) insertedAnchor.setAttribute('rel', rel);
        else insertedAnchor.removeAttribute('rel');
      }
      insertedAnchor?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
      emit();
    } else {
      // insertHtml scrolls the newly-created <a> into view itself.
      const safeUrl = url.replace(/"/g, '&quot;');
      insertHtml(`<a href="${safeUrl}"${linkNewTab ? ' target="_blank"' : ''}${rel ? ` rel="${rel}"` : ''}>${safeUrl}</a>`);
    }

    setLinkOpen(false);
  };

  const openTable = () => {
    rememberSelection();
    plantMarker();
    setLinkOpen(false);
    setCtaOpen(false);
    setFaqOpen(false);
    setTableRows(3);
    setTableColumns(3);
    setTableHeader(true);
    setTableCaption('');
    setTableOpen(true);
  };

  const closeTable = () => {
    removeMarker();
    setTableOpen(false);
  };

  const insertTable = () => {
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
    plantMarker();
    setLinkOpen(false);
    setTableOpen(false);
    setFaqOpen(false);
    // Reset to a blank form every time, so a second CTA in the same session
    // doesn't reopen with whatever was typed into the last one.
    setCtaHeadline('');
    setCtaDescription('');
    setCtaBtn1Text('');
    setCtaBtn1Url('');
    setCtaBtn2Text('');
    setCtaBtn2Url('');
    setCtaBtn3Text('');
    setCtaBtn3Url('');
    setCtaOpen(true);
  };

  const closeCta = () => {
    removeMarker();
    setCtaOpen(false);
  };

  const openFaq = () => {
    rememberSelection();
    plantMarker();
    setLinkOpen(false);
    setTableOpen(false);
    setCtaOpen(false);
    setFaqTitle('Frequently Asked Questions');
    setFaqItems([{ question: '', answer: '' }, { question: '', answer: '' }]);
    setFaqOpen(true);
  };

  const closeFaq = () => {
    removeMarker();
    setFaqOpen(false);
  };

  const addFaqItem = () => {
    setFaqItems(prev => [...prev, { question: '', answer: '' }]);
  };

  const removeFaqItem = (index) => {
    setFaqItems(prev => prev.length <= 1 ? prev : prev.filter((_, i) => i !== index));
  };

  const updateFaqItem = (index, field, value) => {
    setFaqItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  const insertFaq = () => {
    const title = (faqTitle || '').trim();
    const validItems = faqItems.filter(item => item.question.trim());
    if (!validItems.length) {
      closeFaq();
      return;
    }

    const esc = (str) => String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    // Same `name` on every <details> in this block makes the browser open
    // only one at a time natively (no JS needed) — unique per block so two
    // FAQ sections on the same page don't accidentally close each other.
    const groupName = `preva-faq-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const itemsHtml = validItems.map(item =>
      `<details class="preva-faq-item" name="${groupName}"><summary class="preva-faq-question">${esc(item.question.trim())}</summary><div class="preva-faq-answer"><p>${item.answer.trim() ? esc(item.answer.trim()) : 'Answer coming soon.'}</p></div></details>`
    ).join('');

    const html = `<div class="preva-faq-block">${title ? `<h3 class="preva-faq-title">${esc(title)}</h3>` : ''}${itemsHtml}</div>`;
    insertHtml(html);
    setFaqOpen(false);
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

  const insertCta = () => {
    const headline = (ctaHeadline || '').trim();
    const desc = (ctaDescription || '').trim();
    // Headline + primary button are the fields marked "required" in the
    // dialog; without a real <form> there's no native validation stopping
    // an empty submit, so re-check it here instead.
    if (!headline || !ctaBtn1Text.trim() || !ctaBtn1Url.trim()) return;

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

  // The link/table/CTA/FAQ dialogs below are plain <div>s, not <form>s: they
  // already sit inside the page's own outer <form> (the Save button's form),
  // and a nested <form> there is invalid HTML — the browser's native
  // "submit" handling on it could fire a real navigation that wipes the
  // page's query string, which a preventDefault()/stopPropagation() pair
  // inside React cannot reliably head off once React's own DOM-nesting
  // recovery gets involved. This restores plain "Enter submits" behavior
  // without an actual <form> element.
  const submitOnEnter = (handler) => (event) => {
    if (event.key !== 'Enter' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT') return;
    event.preventDefault();
    handler();
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
          <ToolbarButton className="rich-editor-faq-tool" label="Insert FAQ Section" disabled={sourceMode} onRun={openFaq}>
            <CircleHelp size={16} />
            <span>FAQ</span>
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
        <div className="rich-editor-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) closeLink(); }}>
          <div className="rich-editor-link-popover rich-editor-modal-dialog" role="dialog" aria-modal="true" aria-label="Insert link">
            <div className="rich-editor-dialog-form" onKeyDown={submitOnEnter(applyLink)}>
              <div className="rich-editor-link-heading">
                <strong>{editingLinkRef.current ? 'Edit link' : 'Insert link'}</strong>
                <button type="button" onClick={closeLink} aria-label="Close link dialog">×</button>
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
                {editingLinkRef.current && (
                  <button type="button" className="btn btn-danger" onClick={removeLink}>Remove link</button>
                )}
                <button type="button" className="btn btn-secondary" onClick={closeLink}>Cancel</button>
                <button type="button" className="btn" onClick={applyLink}>{editingLinkRef.current ? 'Update link' : 'Add link'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tableOpen && (
        <div className="rich-editor-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) closeTable(); }}>
          <div className="rich-editor-link-popover rich-editor-table-popover rich-editor-modal-dialog" role="dialog" aria-modal="true" aria-label="Insert table">
            <div className="rich-editor-dialog-form" onKeyDown={submitOnEnter(insertTable)}>
              <div className="rich-editor-link-heading">
                <strong>Insert table</strong>
                <button type="button" onClick={closeTable} aria-label="Close table dialog">×</button>
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
                <button type="button" className="btn btn-secondary" onClick={closeTable}>Cancel</button>
                <button type="button" className="btn" onClick={insertTable}>Insert table</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {ctaOpen && (
        <div className="rich-editor-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) closeCta(); }}>
          <div className="rich-editor-link-popover rich-editor-cta-popover rich-editor-modal-dialog" role="dialog" aria-modal="true" aria-label="Insert CTA Box">
            <div className="rich-editor-dialog-form" onKeyDown={submitOnEnter(insertCta)}>
              <div className="rich-editor-link-heading">
                <strong style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={16} color="var(--gold)" /> Insert CTA Card
                </strong>
                <button type="button" onClick={closeCta} aria-label="Close CTA dialog">×</button>
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
                <button type="button" className="btn btn-secondary" onClick={closeCta}>Cancel</button>
                <button type="button" className="btn" onClick={insertCta}>Insert CTA Box</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {faqOpen && (
        <div className="rich-editor-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) closeFaq(); }}>
          <div className="rich-editor-link-popover rich-editor-faq-popover rich-editor-modal-dialog" role="dialog" aria-modal="true" aria-label="Insert FAQ">
            <div className="rich-editor-dialog-form" onKeyDown={submitOnEnter(insertFaq)}>
              <div className="rich-editor-link-heading">
                <strong style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CircleHelp size={18} color="var(--gold)" /> Insert FAQ Section
                </strong>
                <button type="button" onClick={closeFaq} aria-label="Close FAQ dialog">×</button>
              </div>

              <label htmlFor="editor-faq-title">Section Title</label>
              <input
                id="editor-faq-title"
                className="input"
                value={faqTitle}
                onChange={(e) => setFaqTitle(e.target.value)}
                placeholder="e.g. Frequently Asked Questions"
              />

              <div className="rich-editor-faq-items">
                {faqItems.map((item, index) => (
                  <div key={index} className="rich-editor-faq-item-row">
                    <div className="rich-editor-faq-item-header">
                      <span className="rich-editor-faq-item-num">Question {index + 1}</span>
                      {faqItems.length > 1 && (
                        <button type="button" className="rich-editor-faq-remove" onClick={() => removeFaqItem(index)} aria-label={`Remove question ${index + 1}`}>
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                    <input
                      className="input"
                      value={item.question}
                      onChange={(e) => updateFaqItem(index, 'question', e.target.value)}
                      placeholder={`Question ${index + 1}…`}
                      required
                    />
                    <textarea
                      className="input"
                      style={{ minHeight: '52px', resize: 'vertical', fontSize: '12.5px', lineHeight: '1.4', marginTop: '6px' }}
                      value={item.answer}
                      onChange={(e) => updateFaqItem(index, 'answer', e.target.value)}
                      placeholder="Answer (editable directly in canvas later)…"
                    />
                  </div>
                ))}
              </div>

              <button type="button" className="rich-editor-faq-add" onClick={addFaqItem}>
                <Plus size={14} /> Add Another Question
              </button>

              <p className="rich-editor-link-help" style={{ marginTop: '12px' }}>
                Inserts a luxury FAQ accordion at your cursor position. Both questions and answers remain directly editable in the canvas.
              </p>

              <div className="rich-editor-link-actions">
                <button type="button" className="btn btn-secondary" onClick={closeFaq}>Cancel</button>
                <button type="button" className="btn btn-primary" style={{ background: 'var(--gold)', color: '#000', fontWeight: 600 }} onClick={insertFaq}>Insert FAQ</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default RichTextEditor;
