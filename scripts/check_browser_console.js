const { spawn } = require('child_process');
const http = require('http');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 20; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json/version');
      const data = await res.json();
      if (data.webSocketDebuggerUrl) return data.webSocketDebuggerUrl;
    } catch (e) {
      await sleep(250);
    }
  }
  throw new Error('Could not connect to Edge DevTools port 9222');
}

async function run() {
  console.log('🚀 Launching Edge in headless mode...');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgeProc = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ]);

  try {
    const wsUrl = await getWsUrl();
    console.log('🔌 Connected to DevTools WebSocket:', wsUrl);

    // Create a new target/tab
    const newTabRes = await fetch('http://127.0.0.1:9222/json/new?http://localhost:5000', { method: 'PUT' });
    const tabData = await newTabRes.json();
    const tabWsUrl = tabData.webSocketDebuggerUrl;

    const ws = new WebSocket(tabWsUrl);

    let id = 1;
    const pending = new Map();
    function send(method, params = {}) {
      return new Promise((resolve) => {
        const msgId = id++;
        pending.set(msgId, resolve);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    const consoleLogs = [];
    const exceptions = [];

    await new Promise((resolve) => {
      ws.onopen = resolve;
    });

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg.result);
        pending.delete(msg.id);
      }
      if (msg.method === 'Runtime.consoleAPICalled') {
        consoleLogs.push({ type: msg.params.type, args: msg.params.args });
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        exceptions.push(msg.params.exceptionDetails);
      }
    };

    await send('Runtime.enable');
    await send('Page.enable');
    await send('Network.enable');

    console.log('🌐 Navigating to http://localhost:5000 ...');
    await send('Page.navigate', { url: 'http://localhost:5000' });

    // Wait 3 seconds for scripts and fetches
    await sleep(3000);

    const pageInfo = await send('Runtime.evaluate', {
      expression: 'JSON.stringify({ url: window.location.href, title: document.title, bodyLength: document.body ? document.body.innerHTML.length : 0 })'
    });
    console.log('Page Info:', pageInfo.result.value);

    // Test clicking buttons via Runtime.evaluate
    console.log('\n--- EVALUATING BUTTON CLICKS ---');
    const testResults = await send('Runtime.evaluate', {
      expression: `
        (function() {
          const results = [];
          
          // 1. Check SOS button
          const sosBtn = document.querySelector('.btn-open-sos');
          if (sosBtn) {
            sosBtn.click();
            const modal = document.getElementById('modal-emergency-sos');
            const isOpen = modal && modal.classList.contains('active');
            results.push({ name: 'SOS Button Opens Modal', success: isOpen });
            if (isOpen) window.closeModal();
          } else {
            results.push({ name: 'SOS Button Exists', success: false });
          }

          // 2. Check Sign In button
          const loginBtn = document.querySelector('.btn-open-login');
          if (loginBtn) {
            loginBtn.click();
            const modal = document.getElementById('modal-auth-login');
            const isOpen = modal && modal.classList.contains('active');
            results.push({ name: 'Login Button Opens Modal', success: isOpen });
            if (isOpen) window.closeModal();
          } else {
            results.push({ name: 'Login Button Exists', success: false });
          }

          // 3. Check Donor Reg button
          const regBtn = document.querySelector('.btn-open-donor-reg');
          if (regBtn) {
            regBtn.click();
            const modal = document.getElementById('modal-donor-reg');
            const isOpen = modal && modal.classList.contains('active');
            results.push({ name: 'Register Donor Button Opens Modal', success: isOpen });
            if (isOpen) window.closeModal();
          } else {
            results.push({ name: 'Register Donor Button Exists', success: false });
          }

          // 4. Check Blood card clicks
          const firstCard = document.querySelector('.blood-card');
          if (firstCard) {
            firstCard.click();
            results.push({ name: 'Blood Card Clickable', success: true });
          } else {
            results.push({ name: 'Blood Card Rendered', success: false });
          }

          // 5. Check Compatibility Pill Click
          const pill = document.querySelector('.selector-pill-btn');
          if (pill) {
            pill.click();
            results.push({ name: 'Compatibility Pill Clickable', success: true });
          } else {
            results.push({ name: 'Compatibility Pill Exists', success: false });
          }

          return results;
        })()
      `,
      returnByValue: true
    });

    console.log('Button Click Test Results:', JSON.stringify(testResults.result.value, null, 2));

    console.log('\n--- BROWSER CONSOLE ERRORS & EXCEPTIONS ---');
    if (exceptions.length === 0) {
      console.log('✅ ZERO uncaught JavaScript exceptions in browser!');
    } else {
      console.log(`❌ Found ${exceptions.length} exceptions:`);
      exceptions.forEach((e, idx) => {
        console.log(`[Exception ${idx + 1}]`, e.text, e.exception ? e.exception.description : '');
      });
    }

    const errorLogs = consoleLogs.filter(l => l.type === 'error');
    if (errorLogs.length === 0) {
      console.log('✅ ZERO console.error logs in browser!');
    } else {
      console.log(`⚠️ Found ${errorLogs.length} console.error logs:`);
      errorLogs.forEach((l, idx) => {
        console.log(`[Error ${idx + 1}]`, JSON.stringify(l.args));
      });
    }

    ws.close();
  } catch (err) {
    console.error('Test runner error:', err);
  } finally {
    edgeProc.kill();
  }
}

run();
