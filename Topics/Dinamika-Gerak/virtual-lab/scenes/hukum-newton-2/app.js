// ===== CANVAS & CHART =====
const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");
const chartCanvas = document.getElementById("chartCanvas");

// UI references
const scenarioSelect = document.getElementById("scenarioSelect");
const trolleyControls = document.getElementById("trolleyControls");
const raceControls = document.getElementById("raceControls");
const rocketControls = document.getElementById("rocketControls");
const brakingControls = document.getElementById("brakingControls");

const trolleyMass = document.getElementById("trolleyMass");
const trolleyForce = document.getElementById("trolleyForce");
const trolleyFriction = document.getElementById("trolleyFriction");
const raceForce = document.getElementById("raceForce");
const carMass = document.getElementById("carMass");
const truckMass = document.getElementById("truckMass");
const rocketThrust = document.getElementById("rocketThrust");
const carSpeed = document.getElementById("carSpeed");
const brakingMass = document.getElementById("brakingMass");
const brakingForce = document.getElementById("brakingForce");
const btnBrake = document.getElementById("btnBrake");
const btnSpeed1 = document.getElementById("btnSpeed1");
const btnSpeed05 = document.getElementById("btnSpeed05");
const btnSpeed025 = document.getElementById("btnSpeed025");

const velValue = document.getElementById("velValue");
const accelValue = document.getElementById("accelValue");
const netForceValue = document.getElementById("netForceValue");
const timeValue = document.getElementById("timeValue");
const statusMessage = document.getElementById("statusMessage");
const conclusionText = document.getElementById("conclusionText");
const chartLabel = document.getElementById("chartLabel");
const btnPlayPause = document.getElementById("btnPlayPause");
const btnReset = document.getElementById("btnReset");

const btnViewSim = document.getElementById("btnViewSim");
const btnViewChart = document.getElementById("btnViewChart");
const simulationContainer = document.querySelector(".simulation-container");
const chartPanel = document.querySelector(".chart-panel");
const overlayStats = document.getElementById("overlayStats");

// ===== STATE =====
let isPlaying = false;
let elapsedTime = 0;
let lastTime = 0;
let simSpeed = 1.0;
let currentScenario = "trolley";

// Dynamic Camera state
let camX = 0;
let camY = 0;

// Per-scenario state
const trolleyState = { x: 0, v: 0 };
const raceState = { xCar: 0, xTruck: 0, vCar: 0, vTruck: 0, winner: null, finishTime: 0 };
const rocketState = { y: 0, v: 0, particles: [], flame: 0, reachedTarget: false, targetY: 500 };
const brakingState = { xCar: 0, vCar: 0, xBox: 0, vBox: 0, yBox: 0, boxFallen: false, braking: false, finished: false };

// ===== CANVAS RESIZE =====
function resizeCanvas() {
  const c = canvas.parentElement;
  canvas.width = c.clientWidth;
  canvas.height = c.clientHeight;
}
window.addEventListener("resize", () => { resizeCanvas(); drawScene(); });
resizeCanvas();

// ===== CHART =====
let chart = null;
const MAX_PTS = 80;

function initChart(label1, color1, label2, color2) {
  if (chart) chart.destroy();
  const ds = [{ label: label1, data: [], borderColor: color1, backgroundColor: color1 + "25", borderWidth: 2, pointRadius: 0, fill: true, tension: 0.3 }];
  if (label2) ds.push({ label: label2, data: [], borderColor: color2, backgroundColor: color2 + "15", borderWidth: 2, pointRadius: 0, fill: false, tension: 0.3 });
  chart = new Chart(chartCanvas, {
    type: "line",
    data: { labels: [], datasets: ds },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { labels: { color: "#334155", font: { family: "Inter", size: 10 }, boxWidth: 12 } } },
      scales: {
        x: { ticks: { color: "#64748b", maxTicksLimit: 8, font: { size: 9 } }, grid: { color: "rgba(0,0,0,0.05)" } },
        y: { ticks: { color: "#64748b", font: { size: 9 } }, grid: { color: "rgba(0,0,0,0.05)" } }
      }
    }
  });
}

function pushChart(t, v1, v2) {
  chart.data.labels.push(t.toFixed(1));
  chart.data.datasets[0].data.push(parseFloat(v1.toFixed(3)));
  if (v2 !== undefined && chart.data.datasets[1]) chart.data.datasets[1].data.push(parseFloat(v2.toFixed(3)));
  if (chart.data.labels.length > MAX_PTS) { chart.data.labels.shift(); chart.data.datasets.forEach(d => d.data.shift()); }
  chart.update("none");
}

// ===== ARROW UTIL =====
function drawArrow(x, y, dx, dy, color, label) {
  const len = Math.hypot(dx, dy);
  if (len < 2) return;
  const nx = dx / len, ny = dy / len, ah = 12;
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx - nx * ah, y + dy - ny * ah); ctx.stroke();
  const px = -ny * 6, py = nx * 6;
  ctx.beginPath(); ctx.moveTo(x + dx, y + dy); ctx.lineTo(x + dx - nx * ah + px, y + dy - ny * ah + py); ctx.lineTo(x + dx - nx * ah - px, y + dy - ny * ah - py); ctx.fill();
  if (label) { drawLabel(label, x + dx / 2 + px * 2, y + dy / 2 + py * 2 - 12, color, "#ffffff"); }
}

function drawLabel(text, x, y, bgCol, fgCol = "#ffffff", fontSize = 12) {
  ctx.font = `bold ${fontSize}px Inter`;
  const m = ctx.measureText(text);
  const w = m.width + 12;
  const h = fontSize + 8;
  ctx.fillStyle = bgCol;
  ctx.beginPath(); ctx.roundRect(x - w / 2, y - h / 2 - 2, w, h, 4); ctx.fill();
  ctx.fillStyle = fgCol;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y);
  ctx.textBaseline = "alphabetic"; // reset
}

function drawGround(y) {
  ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
  ctx.strokeStyle = "#94a3b855"; ctx.lineWidth = 1;
  for (let x = 0; x < canvas.width; x += 22) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 10, y + 12); ctx.stroke(); }
}

function drawWheel(x, y, r, rot, color) {
  ctx.strokeStyle = color; ctx.fillStyle = color + "33"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r * 0.25, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const a = rot + i * Math.PI / 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + r * 0.8 * Math.cos(a), y + r * 0.8 * Math.sin(a)); ctx.stroke();
  }
}

// ===== TROLLEY DRAW =====
function drawTrolleyScene() {
  const m = Math.max(1, parseFloat(trolleyMass.value) || 50);
  const F = Math.max(0, parseFloat(trolleyForce.value) || 200);
  const f = Math.max(0, parseFloat(trolleyFriction.value) || 20);
  const netF = Math.max(0, F - f);
  const a = netF / m;

  const groundY = canvas.height * 0.7;
  const cx = canvas.width * 0.4 + trolleyState.x;
  const rot = trolleyState.v * elapsedTime * 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, 0, groundY);
  grad.addColorStop(0, "#f1f5f9"); grad.addColorStop(1, "#e2e8f0");
  ctx.fillStyle = grad; ctx.fillRect(0, 0, canvas.width, groundY);
  drawGround(groundY);

  // Trolley body
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.12)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
  ctx.fillStyle = "#cbd5e1";
  ctx.beginPath(); ctx.roundRect(cx - 55, groundY - 70, 110, 60, 10); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "#64748b"; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.roundRect(cx - 55, groundY - 70, 110, 60, 10); ctx.stroke();

  // Basket handle
  ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 4; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx - 35, groundY - 70); ctx.quadraticCurveTo(cx, groundY - 100, cx + 35, groundY - 70); ctx.stroke();

  // Wheels
  drawWheel(cx - 35, groundY, 14, rot, "#475569");
  drawWheel(cx + 35, groundY, 14, rot, "#475569");

  // Mass text
  drawLabel(`m = ${m} kg`, cx, groundY - 45, "rgba(30,41,59,0.75)", "#ffffff", 14);

  // Person pushing (stick figure)
  const personX = cx - 90, personY = groundY;
  ctx.strokeStyle = "#f59e0b"; ctx.fillStyle = "#f59e0b"; ctx.lineWidth = 5; ctx.lineCap = "round";
  ctx.beginPath(); ctx.arc(personX, personY - 85, 13, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(personX, personY - 72); ctx.lineTo(personX + 15, personY - 35); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(personX + 15, personY - 35); ctx.lineTo(personX - 5, personY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(personX + 15, personY - 35); ctx.lineTo(personX + 32, personY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(personX + 3, personY - 65); ctx.lineTo(personX + 45, personY - 55); ctx.stroke();

  // Force arrows
  if (F > 0) drawArrow(cx + 55, groundY - 40, Math.min(100, F * 0.08 + 20), 0, "#ef4444", `F=${F}N`);
  if (f > 0) drawArrow(cx - 55, groundY - 40, -Math.min(80, f * 0.07 + 15), 0, "#8b5cf6", `f=${f}N`);

  // Stats
  velValue.textContent = trolleyState.v.toFixed(2);
  accelValue.textContent = a.toFixed(2);
  netForceValue.textContent = netF.toFixed(1);
  timeValue.textContent = elapsedTime.toFixed(2);

  if (netF === 0) {
    statusMessage.textContent = `Troli ${trolleyState.v > 0 ? "bergerak konstan (ΣF = 0)" : "diam (ΣF = 0)"}`;
    statusMessage.style.borderColor = "#10b981";
    conclusionText.textContent = `ΣF = F − f = ${F} − ${f} = 0 N. Troli ${trolleyState.v > 0 ? "bergerak dengan kecepatan konstan v = " + trolleyState.v.toFixed(1) + " m/s (Hukum I Newton)" : "tetap diam (Hukum I Newton)"}.`;
  } else {
    statusMessage.textContent = `Troli dipercepat! a = F/m = ${a.toFixed(2)} m/s²`;
    statusMessage.style.borderColor = "#3b82f6";
    conclusionText.textContent = `ΣF = F − f = ${F} − ${f} = ${netF} N. Dari Hukum II Newton: a = ΣF/m = ${netF}/${m} = ${a.toFixed(2)} m/s². Semakin besar massa, semakin kecil percepatan untuk gaya yang sama.`;
  }
}

// ===== RACE DRAW (TOP-DOWN POV & DYNAMIC CAMERA) =====
function drawRaceScene() {
  const F = Math.max(1, parseFloat(raceForce.value) || 10000);
  const mCar = Math.max(500, parseFloat(carMass.value) || 1000);
  const mTruck = Math.max(1000, parseFloat(truckMass.value) || 8000);
  const aCar = F / mCar, aTruck = F / mTruck;

  const PX_PER_M = 1; // 1 px = 1 metre
  const finishDistance = 1000; // Finish line at 1000m
  const startX = 60;
  const finishX = startX + finishDistance * PX_PER_M;

  // Dynamic Camera tracking leading vehicle (in metres, convert to px)
  const leadingX = Math.max(raceState.xCar, raceState.xTruck);
  const targetCamX = Math.max(0, (leadingX * PX_PER_M) - canvas.width * 0.35);
  camX += (targetCamX - camX) * 0.1;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-camX, 0);

  // Background grass & circuit area
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(camX - 50, 0, canvas.width + 100, canvas.height);

  // Track lanes (Top View)
  const laneH = canvas.height * 0.35;
  const lane1Y = canvas.height * 0.12;
  const lane2Y = canvas.height * 0.52;

  // Asphalt Track
  ctx.fillStyle = "#334155";
  ctx.fillRect(-50, lane1Y, finishX + 400, laneH * 2 + 20);

  // Track Curbs (Red and White Kerbs at top and bottom edges)
  const curbStep = 20;
  for (let x = -50; x < finishX + 400; x += curbStep) {
    const isRed = Math.floor(x / curbStep) % 2 === 0;
    ctx.fillStyle = isRed ? "#ef4444" : "#ffffff";
    // Top curb
    ctx.fillRect(x, lane1Y - 8, curbStep, 8);
    // Middle divider kerb
    ctx.fillRect(x, lane1Y + laneH + 6, curbStep, 8);
    // Bottom curb
    ctx.fillRect(x, lane2Y + laneH + 12, curbStep, 8);
  }

  // Dashed lane lines
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth = 3;
  ctx.setLineDash([25, 20]);
  ctx.beginPath();
  ctx.moveTo(-50, lane1Y + laneH / 2);
  ctx.lineTo(finishX + 400, lane1Y + laneH / 2);
  ctx.moveTo(-50, lane2Y + laneH / 2);
  ctx.lineTo(finishX + 400, lane2Y + laneH / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Distance Markers along the track
  ctx.font = "bold 12px Inter";
  ctx.fillStyle = "#94a3b8";
  ctx.textAlign = "center";
  for (let dist = 100; dist <= 1000; dist += 100) {
    const markX = startX + dist;
    ctx.strokeStyle = "#64748b88";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(markX, lane1Y);
    ctx.lineTo(markX, lane2Y + laneH);
    ctx.stroke();
    ctx.fillText(`${dist}m`, markX, lane1Y - 14);
  }

  // Start Line
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(startX, lane1Y, 8, laneH * 2 + 20);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 11px Inter";
  ctx.fillText("START", startX - 22, lane1Y - 14);

  // Checkered Finish Line & Gantry Arch Structure
  const finW = 32;
  for (let y = lane1Y; y < lane2Y + laneH + 12; y += 16) {
    for (let x = finishX; x < finishX + finW; x += 16) {
      const isBlack = (Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0;
      ctx.fillStyle = isBlack ? "#090d16" : "#f8fafc";
      ctx.fillRect(x, y, 16, 16);
    }
  }

  // Gantry Overhead Arch Posts (3D Metallic Poles)
  ctx.fillStyle = "#475569";
  ctx.fillRect(finishX - 4, lane1Y - 20, 8, laneH * 2 + 40);
  ctx.fillRect(finishX + finW - 4, lane1Y - 20, 8, laneH * 2 + 40);

  // Overhead Gantry Sign Board
  const gantryY = lane1Y - 32;
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(finishX - 10, gantryY, finW + 20, 22);
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2;
  ctx.strokeRect(finishX - 10, gantryY, finW + 20, 22);
  
  drawLabel("FINISH 1000m", finishX + finW / 2, gantryY + 11, "#f59e0b", "#0f172a", 12);

  // --- VEHICLE 1: MOBIL SPORT (TOP VIEW) ---
  const carX = startX + raceState.xCar * PX_PER_M;
  const carY = lane1Y + laneH / 2;
  ctx.save();
  ctx.translate(carX, carY);

  // Headlight Beams (Glow ahead)
  const headGrad = ctx.createRadialGradient(80, 0, 5, 120, 0, 45);
  headGrad.addColorStop(0, "rgba(254, 240, 138, 0.7)");
  headGrad.addColorStop(1, "rgba(254, 240, 138, 0)");
  ctx.fillStyle = headGrad;
  ctx.beginPath();
  ctx.moveTo(35, -12); ctx.lineTo(130, -35); ctx.lineTo(130, 35); ctx.lineTo(35, 12);
  ctx.fill();

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.roundRect(-38, -16, 80, 36, 10); ctx.fill();

  // Wheels (Top view tires)
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(-26, -20, 16, 6);
  ctx.fillRect(16, -20, 16, 6);
  ctx.fillRect(-26, 14, 16, 6);
  ctx.fillRect(16, 14, 16, 6);

  // Car Body (Aerodynamic Red Sports Car)
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.moveTo(-35, -12);
  ctx.quadraticCurveTo(0, -18, 30, -10);
  ctx.lineTo(35, 0);
  ctx.lineTo(30, 10);
  ctx.quadraticCurveTo(0, 18, -35, 12);
  ctx.closePath();
  ctx.fill();

  // Racing Stripes
  ctx.fillStyle = "#fef08a";
  ctx.fillRect(-35, -3, 68, 6);

  // Windshield & Cockpit
  ctx.fillStyle = "#1e293b";
  ctx.beginPath(); ctx.ellipse(0, 0, 14, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#38bdf8";
  ctx.beginPath(); ctx.ellipse(2, 0, 10, 6, 0, 0, Math.PI * 2); ctx.fill();

  // Rear Spoiler Wing
  ctx.fillStyle = "#b91c1c";
  ctx.fillRect(-36, -16, 6, 32);

  ctx.restore();

  // Label Mobil Sport
  drawLabel(`Mobil Sport: ${raceState.vCar.toFixed(1)} m/s (a=${aCar.toFixed(1)}m/s²)`, carX, carY - 30, "#ef4444", "#ffffff", 11);


  // --- VEHICLE 2: TRUK BEBAN (TOP VIEW) ---
  const truckX = startX + raceState.xTruck * PX_PER_M;
  const truckY = lane2Y + laneH / 2;
  ctx.save();
  ctx.translate(truckX, truckY);

  // Shadow
  ctx.fillStyle = "rgba(0,0,0,0.3)";
  ctx.beginPath(); ctx.roundRect(-60, -22, 120, 48, 8); ctx.fill();

  // Truck Wheels (6 Wheels)
  ctx.fillStyle = "#020617";
  ctx.fillRect(-52, -25, 18, 6); ctx.fillRect(-28, -25, 18, 6); ctx.fillRect(32, -25, 18, 6);
  ctx.fillRect(-52, 19, 18, 6); ctx.fillRect(-28, 19, 18, 6); ctx.fillRect(32, 19, 18, 6);

  // Cargo Trailer Body
  ctx.fillStyle = "#1e40af";
  ctx.beginPath(); ctx.roundRect(-58, -20, 78, 40, 4); ctx.fill();
  ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 1.5;
  for (let rx = -50; rx <= 10; rx += 10) {
    ctx.beginPath(); ctx.moveTo(rx, -20); ctx.lineTo(rx, 20); ctx.stroke();
  }

  // Connection hitch
  ctx.fillStyle = "#475569";
  ctx.fillRect(20, -5, 10, 10);

  // Cabin Top View
  ctx.fillStyle = "#2563eb";
  ctx.beginPath(); ctx.roundRect(28, -20, 30, 40, 6); ctx.fill();

  // Windshield & Roof lights
  ctx.fillStyle = "#93c5fd";
  ctx.fillRect(45, -15, 8, 30);
  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(30, -18, 4, 4); ctx.fillRect(30, 14, 4, 4);

  // Side Mirrors
  ctx.fillStyle = "#1e3a8a";
  ctx.fillRect(42, -24, 4, 5); ctx.fillRect(42, 19, 4, 5);

  ctx.restore();

  // Label Truk
  drawLabel(`Truk Beban: ${raceState.vTruck.toFixed(1)} m/s (a=${aTruck.toFixed(2)}m/s²)`, truckX, truckY - 35, "#3b82f6", "#ffffff", 11);

  ctx.restore();

  velValue.textContent = `${raceState.vCar.toFixed(1)} / ${raceState.vTruck.toFixed(2)}`;
  accelValue.textContent = `${aCar.toFixed(2)} / ${aTruck.toFixed(2)}`;
  netForceValue.textContent = F.toFixed(0);
  timeValue.textContent = elapsedTime.toFixed(2);

  if (raceState.winner) {
    statusMessage.textContent = `Pemenang: ${raceState.winner}! (Waktu Finish: ${raceState.finishTime.toFixed(2)}s)`;
    statusMessage.style.borderColor = "#10b981";
    conclusionText.textContent = `Pemenang balapan: ${raceState.winner}! Karena gaya dorong sama (F = ${F} N), kendaraan bermassa lebih ringan (Mobil Sport ${mCar}kg) menghasilkan percepatan jauh lebih besar (a = ${aCar.toFixed(2)} m/s²) dibanding Truk (${mTruck}kg, a = ${aTruck.toFixed(2)} m/s²). Ini membuktikan Hukum II Newton (a = F/m)!`;

    // Winner Overlay Badge over Finish Line
    drawLabel(`PEMENANG: ${raceState.winner.toUpperCase()}!`, finishX + 15, lane1Y + laneH, "#10b981", "#ffffff", 14);
  } else {
    statusMessage.textContent = `a_mobil=${aCar.toFixed(2)} m/s² >> a_truk=${aTruck.toFixed(2)} m/s² — Hukum II Newton!`;
    statusMessage.style.borderColor = "#3b82f6";
    conclusionText.textContent = `Gaya mesin sama F = ${F} N. a = F/m → Mobil sport (${mCar}kg): a = ${aCar.toFixed(2)} m/s². Truk (${mTruck}kg): a = ${aTruck.toFixed(2)} m/s². Massa lebih kecil meningkatkan percepatan secara drastis (Hukum II Newton).`;
  }
}

// ===== ROCKET DRAW (TARGET FINISH LINE & DYNAMIC CAMERA) =====
function drawRocketScene() {
  const F = Math.max(0, parseFloat(rocketThrust.value) || 2000);
  const m = 100;
  const g = 9.8;
  const W = m * g;
  const netF = F - W;
  const a = netF / m;

  const targetAltitude = 500; // Target Finish line at 500m
  const launchPadY = canvas.height * 0.85;

  // Dynamic Camera Y tracking rocket height
  const targetCamY = Math.max(0, rocketState.y - canvas.height * 0.4);
  camY += (targetCamY - camY) * 0.1;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Environment Gradient based on camera altitude
  const altRatio = Math.min(1, camY / 600);
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  if (altRatio < 0.3) {
    skyGrad.addColorStop(0, "#1e3a5f"); skyGrad.addColorStop(1, "#38bdf8");
  } else if (altRatio < 0.7) {
    skyGrad.addColorStop(0, "#0f172a"); skyGrad.addColorStop(0.5, "#1e3a5f"); skyGrad.addColorStop(1, "#3b82f6");
  } else {
    skyGrad.addColorStop(0, "#020617"); skyGrad.addColorStop(0.7, "#0f172a"); skyGrad.addColorStop(1, "#1e1b4b");
  }
  ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Stars in high atmosphere & space
  if (altRatio > 0.2) {
    for (let i = 0; i < 50; i++) {
      const sx = (i * 137.5) % canvas.width;
      const sy = (i * 73.1) % canvas.height;
      ctx.fillStyle = `rgba(255,255,255,${Math.min(1, altRatio * 1.2 * (0.4 + (i % 5) * 0.12))})`;
      ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI * 2); ctx.fill();
    }
  }

  // Earth Curvature visible in deep space
  if (camY > 300) {
    ctx.save();
    ctx.fillStyle = "#0284c7";
    ctx.beginPath();
    ctx.ellipse(canvas.width / 2, canvas.height + (camY - 300) * 0.5 + 400, canvas.width * 1.2, 500, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.translate(0, camY);

  const cx = canvas.width / 2;
  const rocketY = launchPadY - 80 - rocketState.y;

  // Ground level launchpad (visible when camera near ground)
  if (camY < canvas.height) {
    ctx.fillStyle = "#94a3b8";
    ctx.fillRect(cx - 70, launchPadY, 140, 20);
    ctx.fillStyle = "#475569";
    ctx.fillRect(cx - 45, launchPadY - 10, 90, 15);
  }

  // Altitude Ruler Grid Lines (100m, 200m, 300m, 400m, 500m TARGET)
  ctx.font = "bold 12px Inter";
  ctx.textAlign = "left";
  for (let alt = 100; alt <= targetAltitude; alt += 100) {
    const markY = launchPadY - 80 - alt;
    const isFinish = (alt === targetAltitude);
    ctx.strokeStyle = isFinish ? "#f59e0b" : "rgba(255,255,255,0.3)";
    ctx.lineWidth = isFinish ? 3 : 1;
    ctx.setLineDash(isFinish ? [15, 10] : [5, 5]);
    ctx.beginPath();
    ctx.moveTo(50, markY);
    ctx.lineTo(canvas.width - 50, markY);
    ctx.stroke();
    ctx.setLineDash([]);

    if (isFinish) {
      // TARGET MOON FINISH LINE BANNER
      drawLabel("FINISH: Mendarat di Bulan (500m)", canvas.width - 150, markY, "#f59e0b", "#0f172a", 12);
    } else {
      drawLabel(`Ketinggian: ${alt}m`, 80, markY, "rgba(0,0,0,0.4)", "#ffffff", 11);
    }
  }

  // Draw Moon at Finish Line (500m)
  const moonY = launchPadY - 80 - targetAltitude;
  ctx.save();
  ctx.fillStyle = "#e2e8f0"; // Moon surface
  ctx.shadowColor = "#f8fafc";
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(cx, moonY - 30, 85, 0, Math.PI * 2);
  ctx.fill();

  // Moon Craters
  ctx.fillStyle = "#cbd5e1";
  ctx.beginPath(); ctx.arc(cx - 30, moonY - 45, 16, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 25, moonY - 20, 22, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx + 5, moonY - 60, 12, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(cx - 35, moonY - 10, 10, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // Rocket Body
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 10;
  ctx.translate(cx, rocketY);

  // Main Hull
  ctx.fillStyle = "#f8fafc";
  ctx.beginPath(); 
  ctx.ellipse(0, -20, 15, 60, 0, 0, Math.PI * 2); 
  ctx.fill();
  
  // Nose cone (gradient)
  const noseGrad = ctx.createLinearGradient(0, -80, 0, -40);
  noseGrad.addColorStop(0, "#ef4444"); noseGrad.addColorStop(1, "#991b1b");
  ctx.fillStyle = noseGrad;
  ctx.beginPath();
  ctx.moveTo(0, -85); ctx.quadraticCurveTo(15, -60, 14, -40); ctx.lineTo(-14, -40); ctx.quadraticCurveTo(-15, -60, 0, -85);
  ctx.fill();
  
  // Window glass
  ctx.fillStyle = "#38bdf8";
  ctx.beginPath(); ctx.arc(0, -20, 8, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 2; ctx.stroke();
  
  // Rocket Fins
  ctx.fillStyle = "#475569";
  ctx.beginPath(); ctx.moveTo(-10, 10); ctx.lineTo(-25, 40); ctx.lineTo(-10, 40); ctx.fill();
  ctx.beginPath(); ctx.moveTo(10, 10); ctx.lineTo(25, 40); ctx.lineTo(10, 40); ctx.fill();
  
  // Engine nozzle
  ctx.fillStyle = "#334155";
  ctx.fillRect(-8, 38, 16, 12);
  ctx.restore();

  // Exhaust Flame & Thrust Action Vector
  if (F > 100) {
    const flameH = Math.min(90, netF * 0.04 + 25) * (0.85 + 0.3 * Math.sin(rocketState.flame * 0.6));
    rocketState.flame++;
    const flameGrad = ctx.createLinearGradient(cx, rocketY + 50, cx, rocketY + 50 + flameH);
    flameGrad.addColorStop(0, "#f59e0b"); flameGrad.addColorStop(0.5, "#ef4444"); flameGrad.addColorStop(1, "rgba(239,68,68,0)");
    ctx.fillStyle = flameGrad;
    ctx.beginPath(); ctx.ellipse(cx, rocketY + 50, 12, flameH, 0, 0, Math.PI * 2); ctx.fill();

    // Particle plume
    if (isPlaying && Math.random() < 0.6) {
      rocketState.particles.push({ x: cx + (Math.random() - 0.5) * 16, y: rocketY + 55, vx: (Math.random() - 0.5) * 4, vy: Math.random() * 7 + 3, life: 1 });
    }
    rocketState.particles = rocketState.particles.filter(p => p.life > 0);
    rocketState.particles.forEach(p => {
      ctx.fillStyle = `rgba(251,191,36,${p.life})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
      p.x += p.vx; p.y += p.vy; p.life -= 0.05;
    });
  }

  // Action-Reaction Labels & Vectors
  if (F > 0) {
    drawLabel(`AKSI: Gas → Roket F=${F}N`, cx + 110, rocketY - 25, "rgba(16,185,129,0.9)", "#ffffff", 11);
    drawLabel(`REAKSI: Roket → Gas ${F}N`, cx + 110, rocketY + 5, "rgba(239,68,68,0.9)", "#ffffff", 11);
    if (netF > 0) { 
      drawLabel(`a = (F−W)/m = ${a.toFixed(2)} m/s²`, cx + 120, rocketY + 35, "rgba(245,158,11,0.9)", "#ffffff", 11); 
    } else { 
      drawLabel(`F < W, roket belum terbang!`, cx + 115, rocketY + 35, "rgba(239,68,68,0.9)", "#ffffff", 11); 
    }
  }

  // Force W arrow down
  drawArrow(cx, rocketY - 20, 0, W * 0.06 + 20, "#ef4444", `W=${W}N`);
  // Force F arrow up
  if (F > 0) drawArrow(cx, rocketY - 20, 0, -(F * 0.04 + 20), "#10b981", `F=${F}N`);

  ctx.restore();

  velValue.textContent = rocketState.v.toFixed(2);
  accelValue.textContent = Math.max(0, a).toFixed(2);
  netForceValue.textContent = netF.toFixed(0);
  timeValue.textContent = elapsedTime.toFixed(2);

  if (F <= W) {
    statusMessage.textContent = `Roket Diam — F (${F}N) ≤ W (${W}N), butuh lebih dari 980 N!`;
    statusMessage.style.borderColor = "#ef4444";
    conclusionText.textContent = `Roket diam karena gaya dorong F = ${F} N ≤ berat W = m·g = 100×9.8 = 980 N. Gaya reaksi gas belum cukup kuat meluncurkan roket.`;
  } else if (rocketState.reachedTarget) {
    statusMessage.textContent = `Mendarat di Bulan! (Target 500m Selesai)`;
    statusMessage.style.borderColor = "#10b981";
    conclusionText.textContent = `Misi Berhasil! Roket meluncur dengan gaya aksi-reaksi F = ${F} N dan berhasil mendarat di permukaan Bulan pada ketinggian 500m!`;
  } else {
    statusMessage.textContent = `Roket Meluncur ke Bulan! — Ketinggian: ${rocketState.y.toFixed(0)}m / 500m (a = ${a.toFixed(2)} m/s²)`;
    statusMessage.style.borderColor = "#10b981";
    conclusionText.textContent = `Hukum III Newton: Roket mendorong gas ke bawah (aksi) → gas mendorong roket ke atas (reaksi) dengan F = ${F} N. ΣF = F − W = ${netF.toFixed(0)} N. a = ${a.toFixed(2)} m/s². Roket meluncur menuju Bulan!`;
  }
}

// ===== BRAKING DRAW (PHYSICS INERTIA OVERHAUL & DYNAMIC CAMERA) =====
function drawBrakingScene() {
  const v0 = Math.max(1, parseFloat(carSpeed.value) || 20);
  const m = Math.max(500, parseFloat(brakingMass.value) || 1500);
  const Fbrak = Math.max(1000, parseFloat(brakingForce.value) || 8000);
  const deccel = -Fbrak / m;

  const PX_PER_M = 28; // scale: 1 metre = 28 pixels
  const groundY = canvas.height * 0.72;
  const baseX = 80;
  const carX = baseX + brakingState.xCar * PX_PER_M;
  const boxX = baseX + brakingState.xBox * PX_PER_M;
  const currentBoxDropY = brakingState.yBox * PX_PER_M; // how far it's fallen in px

  // Dynamic Camera tracking average position of Car and Box
  const centerPos = (carX + boxX) / 2;
  const targetCamX = Math.max(0, centerPos - canvas.width * 0.4);
  camX += (targetCamX - camX) * 0.1;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.translate(-camX, 0);

  // Sky background
  const skyGrad = ctx.createLinearGradient(0, 0, 0, groundY);
  skyGrad.addColorStop(0, "#f1f5f9"); skyGrad.addColorStop(1, "#cbd5e1");
  ctx.fillStyle = skyGrad; ctx.fillRect(camX - 50, 0, canvas.width + 100, groundY);

  // Asphalt Road
  const roadGrad = ctx.createLinearGradient(0, groundY - 30, 0, groundY + 25);
  roadGrad.addColorStop(0, "#374151"); roadGrad.addColorStop(1, "#1f2937");
  ctx.fillStyle = roadGrad; ctx.fillRect(camX - 50, groundY - 30, canvas.width + 100, 55);

  // Dashed lane lines
  ctx.strokeStyle = "#f59e0b66"; ctx.lineWidth = 3; ctx.setLineDash([25, 20]);
  ctx.beginPath(); ctx.moveTo(camX - 50, groundY - 10); ctx.lineTo(camX + canvas.width + 50, groundY - 10); ctx.stroke();
  ctx.setLineDash([]);

  // Tire skid marks during braking
  if (brakingState.braking && brakingState.vCar > 0.5) {
    ctx.strokeStyle = "#111827"; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.moveTo(baseX + 25, groundY - 6); ctx.lineTo(carX + 25, groundY - 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(baseX + 90, groundY - 6); ctx.lineTo(carX + 90, groundY - 6); ctx.stroke();
  }

  // --- CAR BODY (PICKUP TRUCK) ---
  const cW = 120, cH = 30;
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.2)"; ctx.shadowBlur = 10;
  
  // Flatbed (back part)
  ctx.fillStyle = "#1e3a8a"; // Darker blue
  ctx.beginPath(); ctx.roundRect(carX, groundY - cH - 18, 70, cH, 4); ctx.fill();
  
  // Cabin (front part)
  ctx.fillStyle = "#1d4ed8"; // Blue
  ctx.beginPath(); ctx.roundRect(carX + 65, groundY - cH - 40, 55, cH + 22, 10); ctx.fill();

  // Window
  ctx.fillStyle = "#bfdbfe";
  ctx.beginPath(); ctx.roundRect(carX + 75, groundY - cH - 35, 30, 20, 4); ctx.fill();
  ctx.restore();

  // Driver Mannequin (Inertia effect: tilts forward when braking)
  const driverX = carX + 85;
  const driverY = groundY - cH - 25;
  const tilt = brakingState.braking && brakingState.vCar > 0.1 ? 0.35 : 0; // forward tilt angle
  ctx.save();
  ctx.translate(driverX, driverY);
  ctx.rotate(tilt);
  ctx.fillStyle = "#f59e0b"; ctx.beginPath(); ctx.arc(0, -10, 5, 0, Math.PI * 2); ctx.fill(); // Head
  ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(0, 8); ctx.stroke(); // Torso
  ctx.restore();

  // Wheels
  const rot = brakingState.vCar * elapsedTime * 2;
  drawWheel(carX + 25, groundY - 14, 15, rot, "#111827");
  drawWheel(carX + 90, groundY - 14, 15, rot, "#111827");

  // Brake Tail Lights
  if (brakingState.braking) {
    ctx.fillStyle = "#ef4444"; ctx.shadowColor = "#ef4444"; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(carX + 5, groundY - cH - 6, 6, 0, Math.PI * 2); ctx.fill();
  }

  // --- BOX ON FLATBED / SLIDING ON ROAD (HUKUM I NEWTON INERSIA) ---
  const bxW = 40, bxH = 30;
  // Normal position: on top of flatbed; drop = currentBoxDropY pixels from initial resting pos
  const flatbedY = groundY - cH - 18 - bxH; // Y when box sits on flatbed
  const currentBoxY = flatbedY + currentBoxDropY;
  const rotAngle = brakingState.boxFallen && currentBoxDropY > 5 ? (currentBoxDropY / 60) * Math.PI * 1.5 : 0;

  ctx.save();
  ctx.translate(boxX + 15 + bxW/2, currentBoxY + bxH/2);
  ctx.rotate(rotAngle);
  ctx.fillStyle = "#fef3c7"; ctx.strokeStyle = "#d97706"; ctx.lineWidth = 2;
  ctx.shadowColor = "rgba(0,0,0,0.15)"; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.roundRect(-bxW/2, -bxH/2, bxW, bxH, 5); ctx.fill(); ctx.stroke();
  // Draw crate cross pattern
  ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(-bxW/2, -bxH/2); ctx.lineTo(bxW/2, bxH/2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bxW/2, -bxH/2); ctx.lineTo(-bxW/2, bxH/2); ctx.stroke();
  ctx.restore();

  // Forces & Inertia Arrow Indicator
  if (brakingState.braking && brakingState.vCar > 0) {
    // F_rem on car (pointing left)
    drawArrow(carX + cW / 2, groundY - cH / 2 - 18, -Math.min(80, Fbrak * 0.005 + 20), 0, "#ef4444", `F_rem=${Fbrak}N`);
  }

  if (brakingState.vBox > 0.1 && (brakingState.vBox > brakingState.vCar + 0.5)) {
    // Arrow showing Box Inertia (v_inersia continuing forward)
    drawArrow(boxX + 35, currentBoxY - 12, Math.min(60, brakingState.vBox * 2 + 15), 0, "#f59e0b", `INERSIA v=${brakingState.vBox.toFixed(1)}m/s`);
  }

  // Labels
  drawLabel(`Mobil: ${brakingState.vCar.toFixed(1)} m/s`, carX + cW / 2, groundY + 22, "#1e3a8a", "#ffffff", 12);
  drawLabel(`Kotak: ${brakingState.vBox.toFixed(1)} m/s`, boxX + 35, groundY + 44, "#d97706", "#ffffff", 12);

  ctx.restore();

  velValue.textContent = `${brakingState.vCar.toFixed(1)} / ${brakingState.vBox.toFixed(1)}`;
  accelValue.textContent = brakingState.braking ? deccel.toFixed(2) : "0.00";
  netForceValue.textContent = brakingState.braking ? (-Fbrak).toFixed(0) : "0";
  timeValue.textContent = elapsedTime.toFixed(2);

  if (!brakingState.braking) {
    statusMessage.textContent = `Mobil Melaju ${v0} m/s, Kotak Ikut di Atas → Tekan REM MENDADAK!`;
    statusMessage.style.borderColor = "#f59e0b";
    conclusionText.textContent = `Mobil dan kotak bergerak bersama dengan kecepatan v0 = ${v0} m/s. Kotak tidak terikat ke atap mobil. Tekan REM MENDADAK untuk mengamati Hukum I Newton (Inersia)!`;
  } else if (brakingState.vCar > 0.1) {
    statusMessage.textContent = `REM! Mobil melambat (a=${deccel.toFixed(2)}m/s²), Kotak terus meluncur ke depan (Inersia)!`;
    statusMessage.style.borderColor = "#ef4444";
    conclusionText.textContent = `Mobil direm: a_mobil = -F_rem/m = ${deccel.toFixed(2)} m/s². Menurut Hukum I Newton, kotak tidak mendapat gaya pengereman langsung, sehingga mempertahankan kecepatannya dan terlempar ke depan!`;
  } else {
    statusMessage.textContent = `Mobil Berhenti! Kotak Terus Meluncur dan Jatuh ke Jalan (Inersia)!`;
    statusMessage.style.borderColor = "#ef4444";
  }
}

// ===== PHYSICS UPDATE =====
function updatePhysics(dt) {
  if (!isPlaying || dt <= 0) return;
  const scaledDt = dt * simSpeed;

  if (currentScenario === "trolley") {
    const m = Math.max(1, parseFloat(trolleyMass.value) || 50);
    const F = Math.max(0, parseFloat(trolleyForce.value) || 200);
    const f = Math.max(0, parseFloat(trolleyFriction.value) || 20);
    const netF = Math.max(0, F - f);
    const a = netF / m;
    trolleyState.v += a * scaledDt;
    trolleyState.x += trolleyState.v * scaledDt * 40;
    if (trolleyState.x > canvas.width * 0.5) { trolleyState.x = canvas.width * 0.5; isPlaying = false; btnPlayPause.textContent = "Mulai Simulasi"; }
    pushChart(elapsedTime, trolleyState.v, a);
  } else if (currentScenario === "race") {
    const F = Math.max(1, parseFloat(raceForce.value) || 10000);
    const mC = Math.max(500, parseFloat(carMass.value) || 1000);
    const mT = Math.max(1000, parseFloat(truckMass.value) || 8000);
    const aCar = F / mC;
    const aTruck = F / mT;
    // Vehicle 1 (Car): Accelerate before 1000m, brake smoothly after 1000m
    if (raceState.xCar < 1000) {
      raceState.vCar += aCar * scaledDt;
    } else {
      // Brake after crossing 1000m finish line
      raceState.vCar = Math.max(0, raceState.vCar - 18 * scaledDt);
    }
    raceState.xCar += raceState.vCar * scaledDt;

    // Vehicle 2 (Truck): Accelerate before 1000m, brake smoothly after 1000m
    if (raceState.xTruck < 1000) {
      raceState.vTruck += aTruck * scaledDt;
    } else {
      // Brake after crossing 1000m finish line
      raceState.vTruck = Math.max(0, raceState.vTruck - 12 * scaledDt);
    }
    raceState.xTruck += raceState.vTruck * scaledDt;

    // Check winner at finish line 1000m
    if ((raceState.xCar >= 1000 || raceState.xTruck >= 1000) && !raceState.winner) {
      raceState.winner = raceState.xCar >= raceState.xTruck ? "Mobil Sport" : "Truk Beban";
      raceState.finishTime = elapsedTime;
    }

    // Stop simulation when BOTH vehicles have come to a complete stop after finish
    if ((raceState.xCar >= 1000 && raceState.vCar === 0) && (raceState.xTruck >= 1000 && raceState.vTruck === 0)) {
      isPlaying = false;
      btnPlayPause.textContent = "Mulai Simulasi";
    }
    pushChart(elapsedTime, raceState.vCar, raceState.vTruck);
  } else if (currentScenario === "rocket") {
    const F = Math.max(0, parseFloat(rocketThrust.value) || 2000);
    const m = 100, g = 9.8;
    const netF = F - m * g;
    const a = netF / m; // Can be negative (thrust < weight = rocket stays)
    if (F > m * g) {
      // Only accelerate upward when thrust exceeds weight
      rocketState.v += a * scaledDt;
      if (rocketState.v < 0) rocketState.v = 0;
    } else {
      // Thrust insufficient: decelerate and stop
      rocketState.v = Math.max(0, rocketState.v - 9.8 * scaledDt);
    }
    // y in metres (real physics scale)
    rocketState.y += rocketState.v * scaledDt;

    // Check target orbit reached (500m)
    if (rocketState.y >= 500 && !rocketState.reachedTarget) {
      rocketState.reachedTarget = true;
    }
    if (rocketState.y > 600) {
      isPlaying = false;
      btnPlayPause.textContent = "Mulai Simulasi";
    }
    pushChart(elapsedTime, rocketState.v, Math.max(0, a));
  } else if (currentScenario === "braking") {
    const v0 = Math.max(1, parseFloat(carSpeed.value) || 20);
    const g = 9.8;

    if (!brakingState.braking) {
      // Cruising together at v0 — move both at same speed
      brakingState.vCar = v0;
      brakingState.vBox = v0;
      brakingState.xCar += brakingState.vCar * scaledDt;
      brakingState.xBox += brakingState.vBox * scaledDt;
    } else {
      const m = Math.max(500, parseFloat(brakingMass.value) || 1500);
      const Fbrak = Math.max(1000, parseFloat(brakingForce.value) || 8000);
      const deccel = Fbrak / m; // car deceleration m/s²

      // Car brakes: decelerates due to braking force
      brakingState.vCar = Math.max(0, brakingState.vCar - deccel * scaledDt);
      brakingState.xCar += brakingState.vCar * scaledDt;

      // Box: inertia keeps it going — no braking force on box!
      // Once box slides off front of car, road friction acts
      const carFrontX = brakingState.xCar + 0.7; // 0.7m = front of car flatbed
      const boxRelX = brakingState.xBox - brakingState.xCar;

      if (boxRelX > 1.5) {
        // Box has left the car — apply gravity drop + road sliding friction
        brakingState.boxFallen = true;
        brakingState.yBox = Math.min(1.2, brakingState.yBox + g * scaledDt * 0.25);
        const roadFrictionDecel = 3.5; // μ*g roughly for crate on asphalt
        brakingState.vBox = Math.max(0, brakingState.vBox - roadFrictionDecel * scaledDt);
      }
      // Box position: keep moving until velocity reaches 0
      brakingState.xBox += brakingState.vBox * scaledDt;

      if (brakingState.vCar <= 0 && brakingState.vBox <= 0) {
        brakingState.vCar = 0;
        brakingState.vBox = 0;
        isPlaying = false;
        btnPlayPause.textContent = "Mulai Simulasi";
      }
    }
    pushChart(elapsedTime, brakingState.vCar, brakingState.vBox);
  }

  elapsedTime += dt;
}

// ===== DRAW SCENE =====
function drawScene() {
  if (currentScenario === "trolley") drawTrolleyScene();
  else if (currentScenario === "race") drawRaceScene();
  else if (currentScenario === "rocket") drawRocketScene();
  else if (currentScenario === "braking") drawBrakingScene();
}

// ===== ANIMATION LOOP =====
function simulationLoop(ts) {
  if (!lastTime) lastTime = ts;
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  updatePhysics(dt);
  drawScene();
  requestAnimationFrame(simulationLoop);
}

// ===== RESET =====
function resetSim(rebuildChart = true) {
  isPlaying = false; elapsedTime = 0; lastTime = 0;
  camX = 0; camY = 0;
  trolleyState.x = 0; trolleyState.v = 0;
  raceState.xCar = 0; raceState.xTruck = 0; raceState.vCar = 0; raceState.vTruck = 0; raceState.winner = null; raceState.finishTime = 0;
  rocketState.y = 0; rocketState.v = 0; rocketState.particles = []; rocketState.flame = 0; rocketState.reachedTarget = false;
  brakingState.xCar = 0; brakingState.xBox = 0; brakingState.yBox = 0;
  brakingState.vCar = parseFloat(carSpeed.value) || 20; brakingState.vBox = brakingState.vCar;
  brakingState.braking = false; brakingState.boxFallen = false;

  btnPlayPause.textContent = "Mulai Simulasi";
  if (rebuildChart && chart) { chart.data.labels = []; chart.data.datasets.forEach(d => d.data = []); chart.update("none"); }
  drawScene();
}

// ===== SCENARIO SWITCH =====
function switchScenario() {
  currentScenario = scenarioSelect.value;
  [trolleyControls, raceControls, rocketControls, brakingControls].forEach(el => el.style.display = "none");
  if (currentScenario === "trolley") {
    trolleyControls.style.display = "block";
    chartLabel.textContent = "Grafik Kecepatan v & Percepatan a vs Waktu";
    initChart("v troli (m/s)", "#3b82f6", "a (m/s²)", "#ef4444");
  } else if (currentScenario === "race") {
    raceControls.style.display = "block";
    chartLabel.textContent = "Grafik Kecepatan: Mobil vs Truk (m/s)";
    initChart("v Mobil Sport (m/s)", "#ef4444", "v Truk (m/s)", "#3b82f6");
  } else if (currentScenario === "rocket") {
    rocketControls.style.display = "block";
    chartLabel.textContent = "Grafik Kecepatan Roket v vs Waktu";
    initChart("v roket (m/s)", "#10b981", "a (m/s²)", "#f59e0b");
  } else if (currentScenario === "braking") {
    brakingControls.style.display = "block";
    chartLabel.textContent = "Grafik Kecepatan Mobil vs Kotak (m/s)";
    initChart("v Mobil (m/s)", "#1d4ed8", "v Kotak (m/s)", "#f59e0b");
  }
  resetSim(false);
}

// ===== EVENT LISTENERS =====
btnPlayPause.addEventListener("click", () => {
  isPlaying = !isPlaying;
  btnPlayPause.textContent = isPlaying ? "Jeda Simulasi" : "Lanjutkan";
});
btnReset.addEventListener("click", () => resetSim(true));
scenarioSelect.addEventListener("change", switchScenario);

btnViewSim?.addEventListener("click", () => {
  btnViewSim.classList.add("active");
  btnViewChart.classList.remove("active");
  simulationContainer.classList.remove("hidden");
  overlayStats.classList.remove("hidden");
  chartPanel.classList.remove("active");
  resizeCanvas();
  drawScene();
});
btnViewChart?.addEventListener("click", () => {
  btnViewChart.classList.add("active");
  btnViewSim.classList.remove("active");
  simulationContainer.classList.add("hidden");
  overlayStats.classList.add("hidden");
  chartPanel.classList.add("active");
});

btnBrake?.addEventListener("click", () => {
  if (!brakingState.braking) {
    brakingState.braking = true;
    isPlaying = true;
    btnPlayPause.textContent = "Jeda Simulasi";
  }
});

[btnSpeed1, btnSpeed05, btnSpeed025].forEach(btn => {
  btn.addEventListener("click", () => {
    [btnSpeed1, btnSpeed05, btnSpeed025].forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    simSpeed = btn === btnSpeed1 ? 1.0 : btn === btnSpeed05 ? 0.5 : 0.25;
  });
});

[trolleyMass, trolleyForce, trolleyFriction, raceForce, carMass, truckMass, rocketThrust, carSpeed, brakingMass, brakingForce].forEach(el => {
  if (el) el.addEventListener("input", () => { if (!isPlaying) drawScene(); });
});

// ===== INIT =====
switchScenario();
requestAnimationFrame(simulationLoop);
