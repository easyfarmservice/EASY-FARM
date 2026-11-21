const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Detect all active IPv4 addresses
const nets = os.networkInterfaces();
const ips = [];
for (const name of Object.keys(nets)) {
  for (const net of nets[name]) {
    if (net.family === 'IPv4' && !net.internal) {
      ips.push({ name, ip: net.address });
    }
  }
}

console.log('Detected network interfaces:', ips);

// Both IPs that were active: 10.74.233.234 and 10.183.238.234
let primaryIp = '10.74.233.234';
if (ips.length > 0) {
  const wifi = ips.find(i => i.ip.startsWith('10.') || i.ip.startsWith('192.168.'));
  if (wifi) primaryIp = wifi.ip;
  else primaryIp = ips[0].ip;
}

console.log('Selected primary IP:', primaryIp);

const expoUrl = `exp://${primaryIp}:8081`;
console.log('Expo URL:', expoUrl);

async function run() {
  const publicDir = path.join(__dirname, '..', 'public');
  const pngPath = path.join(publicDir, 'expo_qr.png');
  const svgPath = path.join(publicDir, 'expo_qr.svg');

  // Generate high quality, scannable QR
  await QRCode.toFile(pngPath, expoUrl, {
    errorCorrectionLevel: 'M',
    type: 'png',
    margin: 2,
    scale: 10,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });

  const svgStr = await QRCode.toString(expoUrl, {
    type: 'svg',
    margin: 2,
    color: {
      dark: '#000000',
      light: '#ffffff'
    }
  });

  fs.writeFileSync(svgPath, svgStr);

  // Generate ASCII QR for terminal viewing
  const ascii = await QRCode.toString(expoUrl, { type: 'terminal', small: true });
  fs.writeFileSync(path.join(publicDir, 'qr_ascii.txt'), ascii);

  // Also create a direct data URI of the QR code so the HTML displays it instantly with no file caching issues!
  const dataUrl = await QRCode.toDataURL(expoUrl, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 8,
  });

  // Create crisp responsive HTML viewer
  const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <title>Easy Farm - Mobile Expo Go QR Code</title>
</head>
<body class="bg-gradient-to-br from-emerald-950 via-slate-900 to-black min-h-screen flex items-center justify-center p-4 font-sans text-white">
  <div class="bg-slate-900/90 backdrop-blur-xl rounded-3xl shadow-2xl p-8 max-w-md w-full text-center border border-emerald-500/30">
    <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-5 border border-emerald-500/30">
      <span class="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
      Metro Bundler Live • Port 8081
    </div>
    
    <h1 class="text-3xl font-extrabold text-white mb-2 tracking-tight">Easy Farm Mobile</h1>
    <p class="text-sm text-slate-400 mb-6 font-medium">Scan using the <strong>Expo Go</strong> app on Android or iOS</p>

    <!-- QR Code Container -->
    <div class="bg-white p-5 rounded-3xl border-4 border-emerald-500 shadow-2xl inline-block mb-6 transition-transform hover:scale-105 duration-300">
      <img src="${dataUrl}" width="280" height="280" alt="Expo Go QR Code" class="block mx-auto rounded-xl" />
    </div>

    <!-- Direct URL Box -->
    <div class="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 mb-5 text-left">
      <span class="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block mb-1">Direct Expo Connection URL</span>
      <div class="flex items-center justify-between gap-2">
        <code id="expoUrl" class="text-sm font-mono font-bold text-emerald-400 select-all overflow-x-auto">${expoUrl}</code>
        <button onclick="navigator.clipboard.writeText('${expoUrl}'); alert('Copied Expo URL to clipboard!');" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition">
          Copy
        </button>
      </div>
    </div>

    <div class="bg-emerald-950/40 border border-emerald-500/20 rounded-2xl p-4 text-xs text-slate-300 text-left space-y-2">
      <div class="flex items-start gap-2">
        <span class="text-emerald-400 font-bold">1.</span>
        <span>Ensure your phone is on the <strong>same Wi-Fi network</strong> as this PC.</span>
      </div>
      <div class="flex items-start gap-2">
        <span class="text-emerald-400 font-bold">2.</span>
        <span>Open <strong>Expo Go</strong>, tap <em>"Scan QR code"</em> and point camera at the QR above.</span>
      </div>
      <div class="flex items-start gap-2">
        <span class="text-emerald-400 font-bold">3.</span>
        <span>Or tap <em>"Enter URL manually"</em> in Expo Go and paste <code class="text-emerald-300">${expoUrl}</code>.</span>
      </div>
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync(path.join(publicDir, 'qr.html'), htmlContent);
  console.log('QR Code successfully generated at public/qr.html and public/expo_qr.png');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
