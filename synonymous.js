const DICTIONARY_API = 'https://api.dictionaryapi.dev/api/v2/entries/en';

/* ── Shared state ─────────────────────────────────────────────── */
let activePopover = null; // currently visible popover / trigger button

/* ── Helpers ───────────────────────────────────────────────────── */

const getSelectedText = () => window.getSelection()?.toString().trim() ?? '';

/**
 * Injects a minimal stylesheet once into the page for the popover UI.
 */
const injectStyles = (() => {
  let injected = false;
  return () => {
    if (injected) return;
    injected = true;

    const style = document.createElement('style');
    style.textContent = `
      /* ── Light theme (default) ── */
      .syn-trigger, .syn-popover {
        --syn-bg: #ffffff;
        --syn-fg: #1e1e2e;
        --syn-accent: #2563eb;
        --syn-border: #d1d5db;
        --syn-hover-bg: #f3f4f6;
        --syn-muted: #6b7280;
        --syn-error: #dc2626;
        --syn-shadow: rgba(0, 0, 0, .12);
        --syn-radius: 8px;
        font-family: system-ui, -apple-system, sans-serif;
        z-index: 2147483647;
      }

      /* ── Dark theme ── */
      @media (prefers-color-scheme: dark) {
        .syn-trigger, .syn-popover {
          --syn-bg: #1e1e2e;
          --syn-fg: #cdd6f4;
          --syn-accent: #89b4fa;
          --syn-border: #45475a;
          --syn-hover-bg: #313244;
          --syn-muted: #a6adc8;
          --syn-error: #f38ba8;
          --syn-shadow: rgba(0, 0, 0, .4);
        }
      }

      /* ── Floating "Define" button ── */
      .syn-trigger {
        position: absolute;
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 10px;
        font-size: 13px;
        font-weight: 500;
        color: var(--syn-fg);
        background: var(--syn-bg);
        border: 1px solid var(--syn-border);
        border-radius: var(--syn-radius);
        cursor: pointer;
        box-shadow: 0 4px 16px var(--syn-shadow);
        animation: syn-fade-in .15s ease;
        user-select: none;
        line-height: 1;
      }
      .syn-trigger:hover {
        background: var(--syn-hover-bg);
        border-color: var(--syn-accent);
      }

      /* ── Definition popover ── */
      .syn-popover {
        position: absolute;
        max-width: 340px;
        min-width: 180px;
        padding: 12px 14px;
        font-size: 13.5px;
        line-height: 1.55;
        color: var(--syn-fg);
        background: var(--syn-bg);
        border: 1px solid var(--syn-border);
        border-radius: var(--syn-radius);
        box-shadow: 0 8px 32px var(--syn-shadow);
        animation: syn-fade-in .15s ease;
        user-select: text;
      }
      .syn-popover-word {
        font-weight: 600;
        color: var(--syn-accent);
        margin-bottom: 4px;
      }
      .syn-popover-pos {
        font-size: 12px;
        font-style: italic;
        color: var(--syn-muted);
        margin-bottom: 6px;
      }
      .syn-popover-def {
        margin: 0;
      }
      .syn-popover-loading {
        display: flex;
        align-items: center;
        gap: 6px;
        color: var(--syn-muted);
      }
      .syn-popover-loading::before {
        content: '';
        width: 14px; height: 14px;
        border: 2px solid var(--syn-border);
        border-top-color: var(--syn-accent);
        border-radius: 50%;
        animation: syn-spin .6s linear infinite;
      }
      .syn-popover-error {
        color: var(--syn-error);
      }

      @keyframes syn-fade-in {
        from { opacity: 0; transform: translateY(4px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes syn-spin {
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  };
})();

/**
 * Removes any currently active popover / trigger from the DOM.
 */
const cleanup = () => {
  if (activePopover) {
    activePopover.remove();
    activePopover = null;
  }
};

/**
 * Creates and positions an element near the current text selection.
 * Returns the element (already appended to the DOM).
 */
const positionNearSelection = (el) => {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return el;

  const range = sel.getRangeAt(0);
  const rect = range.getBoundingClientRect();

  // Place below the selection, horizontally centered
  const top = rect.bottom + window.scrollY + 6;
  const left = Math.max(4, rect.left + window.scrollX + rect.width / 2 - el.offsetWidth / 2);

  el.style.top = `${top}px`;
  el.style.left = `${left}px`;

  // If it overflows the right edge, pull it back
  requestAnimationFrame(() => {
    const elRect = el.getBoundingClientRect();
    if (elRect.right > window.innerWidth - 8) {
      el.style.left = `${window.innerWidth - elRect.width - 8 + window.scrollX}px`;
    }
  });

  return el;
};

/* ── Core ──────────────────────────────────────────────────────── */

/**
 * Shows a floating "📖 Define" button near the selection.
 */
const showTrigger = (selectedText) => {
  injectStyles();
  cleanup();

  const btn = document.createElement('button');
  btn.className = 'syn-trigger';
  btn.textContent = '📖 Define';
  btn.setAttribute('aria-label', `Define "${selectedText}"`);

  document.body.appendChild(btn);
  positionNearSelection(btn);
  activePopover = btn;

  btn.addEventListener('mousedown', (e) => {
    e.preventDefault(); // keep the text selection alive
    e.stopPropagation();
    fetchAndShowDefinition(selectedText);
  });
};

/**
 * Fetches the definition and replaces the trigger button with a popover.
 */
async function fetchAndShowDefinition(word) {
  cleanup();
  injectStyles();

  // Show loading state
  const popover = document.createElement('div');
  popover.className = 'syn-popover';
  popover.innerHTML = `<span class="syn-popover-loading">Looking up "${word}"…</span>`;

  document.body.appendChild(popover);
  positionNearSelection(popover);
  activePopover = popover;

  try {
    const res = await fetch(`${DICTIONARY_API}/${encodeURIComponent(word)}`);

    if (!res.ok) {
      popover.innerHTML = `<span class="syn-popover-error">No definition found for "${word}".</span>`;
      return;
    }

    const data = await res.json();
    const entry = data?.[0];
    const meaning = entry?.meanings?.[0];
    const definition = meaning?.definitions?.[0]?.definition;
    const partOfSpeech = meaning?.partOfSpeech;

    if (!definition) {
      popover.innerHTML = `<span class="syn-popover-error">No definition found for "${word}".</span>`;
      return;
    }

    popover.innerHTML = `
      <div class="syn-popover-word">${entry.word}</div>
      ${partOfSpeech ? `<div class="syn-popover-pos">${partOfSpeech}</div>` : ''}
      <p class="syn-popover-def">${definition}</p>
    `;

    // Re-position since content size may have changed
    positionNearSelection(popover);
  } catch (err) {
    console.error(`Failed to fetch definition for "${word}":`, err);
    popover.innerHTML = `<span class="syn-popover-error">Something went wrong. Please try again.</span>`;
  }
}

/* ── Event listeners ──────────────────────────────────────────── */

// Show the "Define" button when the user finishes selecting text
document.addEventListener('mouseup', (e) => {
  // Ignore clicks on our own UI
  if (e.target.closest('.syn-trigger, .syn-popover')) return;

  // Small delay lets the browser finalise the selection
  setTimeout(() => {
    const text = getSelectedText();
    if (text && text.split(/\s+/).length <= 5) {
      showTrigger(text.toLowerCase());
    } else {
      cleanup();
    }
  }, 10);
});

// Dismiss when clicking outside
document.addEventListener('mousedown', (e) => {
  if (activePopover && !e.target.closest('.syn-trigger, .syn-popover')) {
    cleanup();
  }
});

// Dismiss on scroll or Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') cleanup();
});
