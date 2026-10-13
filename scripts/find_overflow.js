const { spawn } = require('child_process');

async function check() {
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgeProc = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 1000));
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const { webSocketDebuggerUrl } = await res.json();

  const tab = await (await fetch('http://127.0.0.1:9222/json/new?file:///C:/Users/saroo/.gemini/antigravity/scratch/lifeblood/FINAL_YEAR_PROJECT_REPORT_50P.html', { method: 'PUT' })).json();
  const ws = new WebSocket(tab.webSocketDebuggerUrl);

  let id = 1;
  function send(method, params = {}) {
    return new Promise(resolve => {
      const msgId = id++;
      const handler = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.id === msgId) {
          ws.removeEventListener('message', handler);
          resolve(msg.result);
        }
      };
      ws.addEventListener('message', handler);
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  await new Promise(r => ws.onopen = r);
  await send('Page.enable');
  await new Promise(r => setTimeout(r, 2000));

  const heights = await send('Runtime.evaluate', {
    expression: `
      Array.from(document.querySelectorAll('.page')).map((el, i) => {
        const h1 = el.querySelector('h1, h2, .prelim-heading');
        const title = h1 ? h1.innerText.split('\\n')[0].substring(0, 30) : 'No Title';
        return { index: i + 1, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, title };
      })
    `,
    returnByValue: true
  });

  console.log('--- Page Divisions Height Report ---');
  heights.result.value.forEach(p => {
    if (p.scrollHeight > 960) {
      console.log(`⚠️ OVERFLOW Page ${p.index}: scrollHeight=${p.scrollHeight} (client=${p.clientHeight}) -> ${p.title}`);
    } else {
      console.log(`✅ Page ${p.index}: scrollHeight=${p.scrollHeight} -> ${p.title}`);
    }
  });

  ws.close();
  edgeProc.kill();
}

check();
