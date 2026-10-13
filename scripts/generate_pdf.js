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

async function convertHtmlToPdf() {
  const htmlFile = 'C:/Users/saroo/OneDrive/Desktop/LifeBlood_Project_Report.html';
  const outPdfDesktop = 'C:/Users/saroo/OneDrive/Desktop/LifeBlood_Final_Year_Project_Report.pdf';
  const outPdfDownloads = 'C:/Users/saroo/Downloads/LifeBlood_Final_Year_Project_Report.pdf';

  console.log('🚀 Launching Edge Headless for direct PDF generation...');
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
    console.log('🔌 Connected to Edge DevTools WebSocket:', wsUrl);

    const targetUrl = `file:///${htmlFile.replace(/\\/g, '/')}`;
    const newTabRes = await fetch(`http://127.0.0.1:9222/json/new?${encodeURIComponent(targetUrl)}`, { method: 'PUT' });
    const tabData = await newTabRes.json();
    const tabWsUrl = tabData.webSocketDebuggerUrl;

    const ws = new WebSocket(tabWsUrl);

    let id = 1;
    const pending = new Map();
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const msgId = id++;
        pending.set(msgId, { resolve, reject });
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) p.reject(msg.error);
        else p.resolve(msg.result);
      }
    };

    await new Promise(resolve => { ws.onopen = resolve; });

    await send('Page.enable');
    await send('DOM.enable');

    console.log('⏳ Rendering full document and loading embedded assets...');
    await sleep(3000);

    console.log('🖨️ Generating high-definition A4 PDF with background graphics...');
    const pdfResult = await send('Page.printToPDF', {
      landscape: false,
      displayHeaderFooter: false,
      printBackground: true,
      paperWidth: 8.27,      // A4 width in inches
      paperHeight: 11.69,    // A4 height in inches
      marginTop: 0.4,
      marginBottom: 0.4,
      marginLeft: 0.4,
      marginRight: 0.4,
      preferCSSPageSize: true
    });

    const pdfBuffer = Buffer.from(pdfResult.data, 'base64');
    console.log(`📄 PDF generated successfully (${(pdfBuffer.length / (1024 * 1024)).toFixed(2)} MB)!`);

    fs.writeFileSync(outPdfDesktop, pdfBuffer);
    console.log('✅ PDF saved to Desktop:', outPdfDesktop);

    fs.writeFileSync(outPdfDownloads, pdfBuffer);
    console.log('✅ PDF saved to Downloads:', outPdfDownloads);

    ws.close();
  } catch (err) {
    console.error('❌ PDF Generation Error:', err);
  } finally {
    edgeProc.kill();
  }
}

convertHtmlToPdf();
