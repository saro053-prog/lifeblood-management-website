const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function getWsUrl() {
  for (let i = 0; i < 25; i++) {
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

async function capture() {
  const outDir = path.join(__dirname, '../public/images/screenshots');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  console.log('🚀 Launching Edge headless for high-res screenshot capture...');
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
  const edgeProc = spawn(edgePath, [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--window-size=1400,900',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank'
  ]);

  try {
    const wsUrl = await getWsUrl();
    console.log('🔌 Connected to DevTools WebSocket:', wsUrl);

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

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        pending.get(msg.id)(msg.result);
        pending.delete(msg.id);
      }
    };

    await new Promise((resolve) => { ws.onopen = resolve; });

    await send('Page.enable');
    await send('Runtime.enable');
    await send('DOM.enable');

    console.log('⏳ Waiting for page assets, 3D canvas and dynamic data...');
    await sleep(3500);

    // 1. Hero Screenshot
    console.log('📸 Capturing Hero section...');
    const heroShot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, 'fig1_hero_portal.png'), Buffer.from(heroShot.data, 'base64'));

    // 2. Inventory & Compatibility Matrix Section
    console.log('📸 Scrolling and capturing Live Blood Inventory...');
    await send('Runtime.evaluate', {
      expression: `
        const el = document.getElementById('inventory');
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
      `
    });
    await sleep(1000);
    const invShot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, 'fig2_inventory_grid.png'), Buffer.from(invShot.data, 'base64'));

    // 3. ML Analytics Section
    console.log('📸 Scrolling and capturing ML Forecast section...');
    await send('Runtime.evaluate', {
      expression: `
        const el = document.getElementById('ai-analytics') || document.querySelector('.ml-section') || document.getElementById('forecast');
        if (el) el.scrollIntoView({ behavior: 'instant', block: 'start' });
      `
    });
    await sleep(1000);
    const mlShot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, 'fig3_ml_forecast.png'), Buffer.from(mlShot.data, 'base64'));

    // 4. Emergency SOS Modal
    console.log('📸 Opening and capturing Emergency SOS Modal...');
    await send('Runtime.evaluate', {
      expression: `
        const sosBtn = document.querySelector('.btn-open-sos');
        if (sosBtn) sosBtn.click();
      `
    });
    await sleep(800);
    const sosShot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, 'fig4_emergency_sos.png'), Buffer.from(sosShot.data, 'base64'));

    // Close SOS Modal
    await send('Runtime.evaluate', {
      expression: `if (window.closeModal) window.closeModal();`
    });
    await sleep(500);

    // 5. Donor Registration Modal
    console.log('📸 Opening and capturing Donor Registration Modal...');
    await send('Runtime.evaluate', {
      expression: `
        const donorBtn = document.querySelector('.btn-open-donor-reg');
        if (donorBtn) donorBtn.click();
      `
    });
    await sleep(800);
    const donorShot = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(outDir, 'fig5_donor_registration.png'), Buffer.from(donorShot.data, 'base64'));

    console.log('✅ All 5 high-resolution screenshots captured successfully!');
    ws.close();
  } catch (err) {
    console.error('❌ Error during capture:', err);
  } finally {
    edgeProc.kill();
  }
}

capture();
