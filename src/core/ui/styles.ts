/**
 * Component styles for the settings UI. Injected as a <style> into each host: a shadow root in the
 * page (so NYT's CSS cannot reach it and ours cannot leak out) or the popup document.
 * Theme comes from `data-theme="dark|light"` on the `.nyte-ui` root.
 */
export const UI_STYLES = `
.nyte-ui {
  --bg: #ffffff; --surface: #f4f4f4; --border: #d9d9d9; --text: #121212; --muted: #5f5f5f;
  --accent: #2860d8; --warn-bg: #fff6d6; --warn-text: #6b4e00; --danger: #b3261e; --kbd-bg: #f0f0f0;
  --select-arrow: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' fill='none' stroke='%235f5f5f' stroke-width='1.6' stroke-linecap='round'/></svg>");
  color: var(--text); background: var(--bg);
  font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  box-sizing: border-box; text-align: left;
}
.nyte-ui[data-theme="dark"] {
  --bg: #121213; --surface: #1a1a1b; --border: #3a3a3c; --text: #d7dadc; --muted: #9a9a9b;
  --accent: #85b7ff; --warn-bg: #3d3414; --warn-text: #ffe08a; --danger: #ff6b6b; --kbd-bg: #272729;
  --select-arrow: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' fill='none' stroke='%239a9a9b' stroke-width='1.6' stroke-linecap='round'/></svg>");
}
.nyte-ui *, .nyte-ui *::before, .nyte-ui *::after { box-sizing: inherit; }
.nyte-ui h2, .nyte-ui h3 { margin: 0 0 8px; font-weight: 700; line-height: 1.3; }
.nyte-ui h2 { font-size: 16px; }
.nyte-ui h3 { font-size: 14px; }
.nyte-ui h3.nyte-game-title { font-size: 18px; }
.nyte-shortcuts > h3 { margin-top: 4px; }
.nyte-ui p { margin: 0; }
.nyte-section { padding: 12px 0; border-top: 1px solid var(--border); }
.nyte-disclaimer + .nyte-section { border-top: 0; padding-top: 0; }
/* A game section with no heading or options starts straight with the Shortcuts block: one divider, not two. */
.nyte-game > .nyte-shortcuts:first-child { border-top: 0; padding-top: 0; }
.nyte-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 6px 0; }
.nyte-row .nyte-label { flex: 1; min-width: 0; }
.nyte-help { color: var(--muted); font-size: 12px; margin: 2px 0 0; }
.nyte-radios { display: flex; flex-direction: column; gap: 6px; margin: 0; padding: 0; border: 0; min-width: 0; }
.nyte-radios label, .nyte-check { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.nyte-ui input[type="radio"], .nyte-ui input[type="checkbox"] { accent-color: var(--accent); margin: 0; width: 16px; height: 16px; flex: 0 0 auto; }
.nyte-ui button { font: inherit; color: var(--text); background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 4px 10px; cursor: pointer; line-height: 1.3; }
.nyte-ui button:hover:not(:disabled) { border-color: var(--accent); }
.nyte-ui select {
  font: inherit; color: var(--text); border: 1px solid var(--border); border-radius: 6px; max-width: 55%; cursor: pointer;
  appearance: none; -webkit-appearance: none; padding: 4px 32px 4px 10px;
  background: var(--surface) var(--select-arrow) no-repeat right 12px center;
}
.nyte-ui select:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.nyte-row.nyte-select { cursor: default; }
.nyte-ui button:disabled { opacity: .5; cursor: default; }
.nyte-ui button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }
.nyte-ui button.nyte-primary { background: var(--accent); color: var(--bg); border-color: var(--accent); }
.nyte-ui kbd, .nyte-ui button.nyte-kbd {
  font: 600 12px/1 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; background: var(--kbd-bg);
  border: 1px solid var(--border); border-bottom-width: 2px; border-radius: 5px; padding: 5px 8px;
  min-width: 56px; text-align: center; color: var(--text); white-space: nowrap;
}
.nyte-ui button.nyte-kbd.is-recording { border-color: var(--accent); color: var(--accent); animation: nyte-pulse 1s infinite; }
@keyframes nyte-pulse { 50% { opacity: .55; } }
.nyte-tag { font-size: 11px; color: var(--muted); border: 1px solid var(--border); border-radius: 999px; padding: 1px 7px; vertical-align: middle; }
.nyte-tag.is-custom { color: var(--accent); border-color: var(--accent); }
.nyte-shortcut { display: grid; grid-template-columns: 1fr auto; gap: 4px 10px; align-items: center; padding: 8px 0; border-top: 1px dashed var(--border); }
.nyte-shortcut:first-of-type { border-top: 0; }
.nyte-shortcut .nyte-label .nyte-help { margin-top: 3px; }
.nyte-shortcut-controls { display: flex; align-items: center; gap: 8px; }
.nyte-inline-option { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); cursor: default; }
.nyte-inline-option select { max-width: none; padding: 2px 26px 2px 8px; font-size: 12px; background-position: right 8px center; }
.nyte-note { grid-column: 1 / -1; font-size: 12px; padding: 6px 8px; border-radius: 6px; background: var(--surface); }
.nyte-note.is-warn { background: var(--warn-bg); color: var(--warn-text); }
.nyte-note.is-error { color: var(--danger); }
.nyte-shortcuts-hint { margin: -4px 0 6px; }
.nyte-muted { color: var(--muted); }
.nyte-disclaimer { margin: 0; padding-bottom: 12px; font-size: 12px; font-style: italic; font-weight: 400; color: var(--muted); }
dialog.nyte-dialog {
  border: 1px solid var(--border); border-radius: 12px; padding: 16px 18px; margin: auto;
  width: min(440px, calc(100vw - 32px)); max-height: calc(100vh - 32px); overflow: auto;
  box-shadow: 0 12px 40px rgba(0, 0, 0, .35);
}
dialog.nyte-dialog::backdrop { background: rgba(0, 0, 0, .45); }
.nyte-dialog-header { align-items: flex-start; margin-bottom: 4px; }
.nyte-dialog-header ::slotted(h2) { flex: 1; min-width: 0; }
.nyte-dialog-header ::slotted(button:focus-visible) { outline: 2px solid var(--accent); outline-offset: 2px; }
.nyte-embed { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); background: transparent; }
`;
