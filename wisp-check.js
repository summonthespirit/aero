export function normalizeWisp(input) {
  let s = String(input ?? '').trim();
  if (!s) return null;
  if (/^https:\/\//i.test(s)) s = 'wss://' + s.slice(8);
  else if (/^http:\/\//i.test(s)) s = 'ws://' + s.slice(7);
  else if (!/^wss?:\/\//i.test(s)) s = 'wss://' + s;
  try {
    const u = new URL(s);
    if (!u.hostname) return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function testWisp(url, timeoutMs = 5000) {
  return new Promise(resolve => {
    let done = false;
    let ws = null;
    const timer = setTimeout(() => finish(false), timeoutMs);
    function finish(ok) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { ws && ws.close(); } catch {}
      resolve(ok);
    }
    if (location.protocol === 'https:' && /^ws:\/\//i.test(url)) return finish(false);
    try {
      ws = new WebSocket(url);
    } catch {
      return finish(false);
    }
    ws.onopen = () => finish(true);
    ws.onerror = () => finish(false);
    ws.onclose = () => finish(false);
  });
}

export async function chooseWisp({ servers, onStatus } = {}) {
  const list = [...new Set((servers || []).map(normalizeWisp).filter(Boolean))];

  if (list.length) {
    onStatus?.(`checking ${list.length} wisp server${list.length === 1 ? '' : 's'}…`);
    const tests = list.map(u => testWisp(u));
    for (let i = 0; i < list.length; i++) {
      if (await tests[i]) return { url: list[i], manual: false };
    }
  }
  onStatus?.('no wisp server reachable');
  return promptForWisp(list);
}

const STYLE_ID = 'wisp-check-style';

function injectStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const css = `
    #wisp-prompt { position: fixed; inset: 0; z-index: 2147483647; display: flex;
      align-items: center; justify-content: center; padding: 16px;
      background: rgba(10, 14, 20, 0.88); backdrop-filter: blur(6px); }
    #wisp-prompt .box { width: min(92vw, 460px); padding: 24px; border-radius: 12px;
      background: var(--surface, rgba(22,29,41,0.95)); border: 1.5px solid var(--border, #2a384d);
      box-shadow: 0 16px 48px rgba(0,0,0,0.7); color: var(--text-color, #fff);
      font-family: "Sora", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    #wisp-prompt h3 { margin: 0 0 10px; font-size: 1.05rem; letter-spacing: 1px; text-transform: uppercase; }
    #wisp-prompt p { margin: 0 0 12px; font-size: 0.9rem; line-height: 1.45; color: var(--text-muted, #8a9bb5); }
    #wisp-prompt ul { margin: 0 0 12px; padding-left: 18px; font-size: 0.82rem; color: #f87171; word-break: break-all; }
    #wisp-prompt input { width: 100%; margin-bottom: 10px; padding: 10px 14px; border-radius: 8px;
      border: 1px solid var(--border, #2a384d); background: rgba(15,20,28,0.75); color: #fff; font-size: 0.95rem; }
    #wisp-prompt input:focus { outline: none; border-color: var(--glow, #0084ff); }
    #wisp-prompt .row { display: flex; gap: 8px; flex-wrap: wrap; }
    #wisp-prompt button { padding: 9px 16px; border-radius: 8px; border: 1px solid var(--border, #2a384d);
      background: var(--surface, rgba(22,29,41,0.9)); color: #fff; font-weight: 600; cursor: pointer; }
    #wisp-prompt button.primary { border-color: var(--glow, #0084ff); }
    #wisp-prompt button:disabled { opacity: 0.5; cursor: default; }
    #wisp-prompt .msg { min-height: 1.2em; margin: 4px 0 10px; font-size: 0.82rem; color: #f87171; }
    #wisp-prompt .msg.ok { color: #4ade80; }
  `;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = css;
  document.head.append(style);
}

function promptForWisp(failedUrls) {
  injectStyle();
  return new Promise(resolve => {
    const root = document.createElement('div');
    root.id = 'wisp-prompt';

    const box = document.createElement('div');
    box.className = 'box';

    const h = document.createElement('h3');
    h.textContent = "couldnt connect to a wisp server.";

    const p = document.createElement('p');
    p.textContent = failedUrls.length
      ? 'these servers are either blocked on your network or are offline. enter another wisp server to continue.'
      : 'no wisp server is set up. enter one to continue.';

    box.append(h, p);

    if (failedUrls.length) {
      const ul = document.createElement('ul');
      for (const u of failedUrls) {
        const li = document.createElement('li');
        li.textContent = u;
        ul.append(li);
      }
      box.append(ul);
    }

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'wss://your-wisp-server/wisp/';
    input.autocomplete = 'off';
    input.spellcheck = false;

    const msg = document.createElement('div');
    msg.className = 'msg';

    const row = document.createElement('div');
    row.className = 'row';
    const connect = document.createElement('button');
    connect.className = 'primary';
    connect.textContent = 'Test & connect';
    const anyway = document.createElement('button');
    anyway.textContent = 'Use anyway';
    row.append(connect, anyway);

    box.append(input, msg, row);
    root.append(box);
    document.body.append(root);
    input.focus();

    const finish = url => {
      root.remove();
      resolve({ url, manual: true });
    };

    async function submit() {
      const url = normalizeWisp(input.value);
      msg.className = 'msg';
      if (!url) {
        msg.textContent = 'enter a valid address, e.g. wss://example.com/wisp/';
        return;
      }
      if (location.protocol === 'https:' && url.startsWith('ws://')) {
        msg.textContent = 'this page is https, so the server must use wss://';
        return;
      }
      connect.disabled = anyway.disabled = true;
      msg.textContent = 'testing…';
      const ok = await testWisp(url);
      connect.disabled = anyway.disabled = false;
      if (ok) {
        msg.className = 'msg ok';
        msg.textContent = 'connected';
        finish(url);
      } else {
        msg.textContent = "couldn't connect to that server (blocked, offline, or wrong address).";
      }
    }

    connect.addEventListener('click', submit);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
    anyway.addEventListener('click', () => {
      const url = normalizeWisp(input.value);
      if (!url) {
        msg.textContent = 'enter an address first.';
        return;
      }
      finish(url);
    });
  });
}