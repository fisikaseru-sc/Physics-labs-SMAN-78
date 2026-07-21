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

// ===== STATE =====
let isPlaying = false;
let elapsedTime = 0;
let lastTime = 0;
let simSpeed = 1.0;
let currentScenario = "trolley";

// Per-scenario state
const trolleyState = { x: 0, v: 0 };
const raceState = { xCar: 0, xTruck: 0, vCar: 0, vTruck: 0 };
const rocketState = { y: 0, v: 0, particles: [], flame: 0 };
const brakingState = { xCar: 0, vCar: 0, xBox: 0, vBox: 0, braking: false };

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
  if (label) { ctx.font = "bold 12px Inter"; ctx.textAlign = "center"; ctx.fillText(label, x + dx / 2 + px * 2, y + dy / 2 + py * 2 - 6); }
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
  ctx.fillStyle = "#1e293b"; ctx.font = "bold 14px Inter"; ctx.textAlign = "center";
  ctx.fillText(`m = ${m} kg`, cx, groundY - 38);

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

// ===== RACE DRAW =====
function drawRaceScene() {
  const F = Math.max(1, parseFloat(raceForce.value) || 10000);
  const mCar = Math.max(500, parseFloat(carMass.value) || 1000);
  const mTruck = Math.max(1000, parseFloat(truckMass.value) || 8000);
  const aCar = F / mCar, aTruck = F / mTruck;

  const groundY = canvas.height * 0.72;
  const startX = 60;
  const carX = startX + raceState.xCar;
  const truckX = startX + raceState.xTruck;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawGround(groundY);

  // Road markings
  ctx.strokeStyle = "#94a3b844"; ctx.lineWidth = 3; ctx.setLineDash([30, 20]);
  ctx.beginPath(); ctx.moveTo(0, groundY - 25); ctx.lineTo(canvas.width, groundY - 25); ctx.stroke();
  ctx.setLineDash([]);

  // Car (sports car, smaller, lower)
  const carW = 90, carH = 36;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.15)"; ctx.shadowBlur = 8;
  // Body
  ctx.fillStyle = "#ef4444";
  ctx.beginPath(); ctx.roundRect(carX, groundY - carH - 14, carW, carH, 6); ctx.fill();
  // Windshield
  ctx.fillStyle = "#bfdbfe";
  ctx.beginPath(); ctx.moveTo(carX + 25, groundY - carH - 14); ctx.lineTo(carX + 45, groundY - carH - 26); ctx.lineTo(carX + 65, groundY - carH - 26); ctx.lineTo(carX + 75, groundY - carH - 14); ctx.fill();
  ctx.restore();
  drawWheel(carX + 20, groundY - 14, 13, raceState.vCar * elapsedTime * 2, "#1e293b");
  drawWheel(carX + 68, groundY - 14, 13, raceState.vCar * elapsedTime * 2, "#1e293b");
  ctx.fillStyle = "#1e293b"; ctx.font = "bold 11px Inter"; ctx.textAlign = "center";
  ctx.fillText(`Mobil Sport`, carX + carW/2, groundY - carH - 18);
  ctx.fillText(`m=${mCar}kg, a=${aCar.toFixed(1)}m/s²`, carX + carW/2, groundY - carH - 6);
  ctx.fillText(`v=${raceState.vCar.toFixed(1)}m/s`, carX + carW/2, groundY + 14);

  // Truck (bigger, taller)
  const truckY = groundY - 38;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.15)"; ctx.shadowBlur = 8;
  ctx.fillStyle = "#3b82f6";
  ctx.beginPath(); ctx.roundRect(truckX, truckY - 28, 150, 55, 6); ctx.fill();
  ctx.restore();
  drawWheel(truckX + 25, groundY - 14, 16, raceState.vTruck * elapsedTime * 1.5, "#1e293b");
  drawWheel(truckX + 80, groundY - 14, 16, raceState.vTruck * elapsedTime * 1.5, "#1e293b");
  drawWheel(truckX + 125, groundY - 14, 16, raceState.vTruck * elapsedTime * 1.5, "#1e293b");
  ctx.fillStyle = "#fff"; ctx.font = "bold 10px Inter"; ctx.textAlign = "center";
  ctx.fillText(`Truk`, truckX + 75, truckY - 22);
  ctx.fillText(`m=${mTruck}kg, a=${aTruck.toFixed(2)}m/s²`, truckX + 75, truckY - 10);
  ctx.fillStyle = "#1e293b"; ctx.fillText(`v=${raceState.vTruck.toFixed(2)}m/s`, truckX + 75, groundY + 18);

  // Force arrows
  if (F > 0) {
    drawArrow(carX + carW, groundY - carH/2 - 14, Math.min(60, F * 0.003 + 15), 0, "#ef4444", `F=${F}N`);
    drawArrow(truckX + 150, truckY + 14, Math.min(60, F * 0.003 + 15), 0, "#3b82f6", `F=${F}N`);
  }

  velValue.textContent = `${raceState.vCar.toFixed(1)} / ${raceState.vTruck.toFixed(2)}`;
  accelValue.textContent = `${aCar.toFixed(2)} / ${aTruck.toFixed(2)}`;
  netForceValue.textContent = F.toFixed(0);
  timeValue.textContent = elapsedTime.toFixed(2);
  statusMessage.textContent = `a_mobil=${aCar.toFixed(2)} m/s² >> a_truk=${aTruck.toFixed(2)} m/s² — Hukum II Newton!`;
  statusMessage.style.borderColor = "#3b82f6";
  conclusionText.textContent = `Gaya mesin sama F = ${F} N. a = F/m → Mobil sport (${mCar}kg): a = ${aCar.toFixed(2)} m/s². Truk (${mTruck}kg): a = ${aTruck.toFixed(2)} m/s². Massa lebih besar → percepatan lebih kecil (Hukum II Newton).`;
}

// ===== ROCKET DRAW =====
function drawRocketScene() {
  const F = Math.max(0, parseFloat(rocketThrust.value) || 2000);
  const m = 100;
  const g = 9.8;
  const W = m * g;
  const netF = F - W;
  const a = netF / m;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const launchPadY = canvas.height * 0.85;
  const rocketY = launchPadY - 80 - rocketState.y;

  // Sky gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  skyGrad.addColorStop(0, "#0f172a"); skyGrad.addColorStop(0.6, "#1e3a5f"); skyGrad.addColorStop(1, "#f59e0b44");
  ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Stars
  for (let i = 0; i < 40; i++) {
    const sx = (cx * Math.sin(i * 137.5) + cx * 0.9) % canvas.width;
    const sy = ((i * 73.1) % (launchPadY * 0.6));
    ctx.fillStyle = `rgba(255,255,255,${0.3 + (i % 5) * 0.12})`;
    ctx.beginPath(); ctx.arc(sx, sy, 1.5, 0, Math.PI * 2); ctx.fill();
  }

  // Launch pad
  ctx.fillStyle = "#94a3b8";
  ctx.fillRect(cx - 60, launchPadY, 120, 20);
  ctx.fillStyle = "#64748b";
  ctx.fillRect(cx - 40, launchPadY - 10, 80, 15);

  // Rocket body
  ctx.save();
  ctx.shadowColor = "#ef4444"; ctx.shadowBlur = 20;
  ctx.fillStyle = "#e2e8f0";
  ctx.beginPath(); ctx.roundRect(cx - 20, rocketY - 80, 40, 110, 8); ctx.fill();
  // Nose cone
  ctx.fillStyle = "#ef4444";
  ctx.beginPath(); ctx.moveTo(cx, rocketY - 110); ctx.lineTo(cx - 20, rocketY - 80); ctx.lineTo(cx + 20, rocketY - 80); ctx.fill();
  // Windows
  ctx.fillStyle = "#bfdbfe";
  ctx.beginPath(); ctx.arc(cx, rocketY - 60, 10, 0, Math.PI * 2); ctx.fill();
  // Fins
  ctx.fillStyle = "#64748b";
  ctx.beginPath(); ctx.moveTo(cx - 20, rocketY + 30); ctx.lineTo(cx - 40, rocketY + 60); ctx.lineTo(cx - 20, rocketY + 60); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx + 20, rocketY + 30); ctx.lineTo(cx + 40, rocketY + 60); ctx.lineTo(cx + 20, rocketY + 60); ctx.fill();
  ctx.restore();

  // Exhaust flame
  if (F > 100) {
    const flameH = Math.min(80, netF * 0.04 + 20) * (0.8 + 0.2 * Math.sin(rocketState.flame * 0.5));
    rocketState.flame++;
    const flameGrad = ctx.createLinearGradient(cx, rocketY + 60, cx, rocketY + 60 + flameH);
    flameGrad.addColorStop(0, "#f59e0b"); flameGrad.addColorStop(0.5, "#ef4444"); flameGrad.addColorStop(1, "rgba(239,68,68,0)");
    ctx.fillStyle = flameGrad;
    ctx.beginPath(); ctx.ellipse(cx, rocketY + 60, 15, flameH, 0, 0, Math.PI * 2); ctx.fill();

    // Exhaust particles
    if (isPlaying && Math.random() < 0.5) {
      rocketState.particles.push({ x: cx + (Math.random()-0.5)*20, y: rocketY + 70, vx: (Math.random()-0.5)*3, vy: Math.random()*6+2, life: 1 });
    }
    rocketState.particles = rocketState.particles.filter(p => p.life > 0);
    rocketState.particles.forEach(p => {
      ctx.fillStyle = `rgba(251,191,36,${p.life})`;
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
      p.x += p.vx; p.y += p.vy; p.life -= 0.06;
    });
  }

  // Aksi-reaksi labels
  if (F > 0) {
    ctx.fillStyle = "#10b981"; ctx.font = "bold 13px Inter"; ctx.textAlign = "left";
    ctx.fillText(`⬆ AKSI: Gas → Roket F=${F}N`, cx + 50, rocketY - 20);
    ctx.fillStyle = "#ef4444";
    ctx.fillText(`⬇ REAKSI: Roket → Gas ${F}N`, cx + 50, rocketY + 5);
    if (netF > 0) { ctx.fillStyle = "#f59e0b"; ctx.fillText(`🚀 a = (F−W)/m = ${a.toFixed(2)} m/s²`, cx + 50, rocketY + 28); }
    else { ctx.fillStyle = "#ef4444"; ctx.fillText(`❌ F < W, roket belum bisa terbang!`, cx + 50, rocketY + 28); }
  }

  // W arrow down
  drawArrow(cx, rocketY - 40, 0, W * 0.06 + 20, "#ef4444", `W=${W}N`);
  // F arrow up
  if (F > 0) drawArrow(cx, rocketY - 40, 0, -(F * 0.04 + 20), "#10b981", `F=${F}N`);

  velValue.textContent = rocketState.v.toFixed(2);
  accelValue.textContent = Math.max(0, a).toFixed(2);
  netForceValue.textContent = netF.toFixed(0);
  timeValue.textContent = elapsedTime.toFixed(2);

  if (F <= W) {
    statusMessage.textContent = `Roket Diam — F (${F}N) ≤ W (${W}N), butuh lebih dari 980 N!`;
    statusMessage.style.borderColor = "#ef4444";
    conclusionText.textContent = `Roket diam karena gaya dorong F = ${F} N ≤ berat W = m·g = 100×9.8 = 980 N. Gaya gas (reaksi) belum cukup kuat melawan gravitasi.`;
  } else {
    statusMessage.textContent = `🚀 Roket Meluncur! — a = ${a.toFixed(2)} m/s², v = ${rocketState.v.toFixed(1)} m/s`;
    statusMessage.style.borderColor = "#10b981";
    conclusionText.textContent = `Hukum III Newton: Roket mendorong gas ke bawah (aksi) → gas mendorong roket ke atas (reaksi) dengan F = ${F} N. ΣF = F − W = ${netF.toFixed(0)} N. a = ${a.toFixed(2)} m/s².`;
  }
}

// ===== BRAKING DRAW =====
function drawBrakingScene() {
  const v0 = Math.max(1, parseFloat(carSpeed.value) || 20);
  const m = Math.max(500, parseFloat(brakingMass.value) || 1500);
  const Fbrak = Math.max(1000, parseFloat(brakingForce.value) || 8000);
  const deccel = -Fbrak / m;

  const groundY = canvas.height * 0.72;
  const baseX = 80;
  const carX = baseX + brakingState.xCar;
  const boxX = baseX + brakingState.xBox;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Road
  const roadGrad = ctx.createLinearGradient(0, groundY - 30, 0, groundY + 15);
  roadGrad.addColorStop(0, "#374151"); roadGrad.addColorStop(1, "#1f2937");
  ctx.fillStyle = roadGrad; ctx.fillRect(0, groundY - 30, canvas.width, 45);
  ctx.strokeStyle = "#f59e0b44"; ctx.lineWidth = 3; ctx.setLineDash([25, 20]);
  ctx.beginPath(); ctx.moveTo(0, groundY - 10); ctx.lineTo(canvas.width, groundY - 10); ctx.stroke();
  ctx.setLineDash([]);

  // Tire skid marks
  if (brakingState.braking && brakingState.vCar > 0.5) {
    ctx.strokeStyle = "#1f2937"; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(baseX + 25, groundY - 5); ctx.lineTo(carX + 25, groundY - 5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(baseX + 70, groundY - 5); ctx.lineTo(carX + 70, groundY - 5); ctx.stroke();
  }

  // Car body
  const cW = 120, cH = 40;
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.2)"; ctx.shadowBlur = 10;
  ctx.fillStyle = "#1d4ed8";
  ctx.beginPath(); ctx.roundRect(carX, groundY - cH - 18, cW, cH, 8); ctx.fill();
  ctx.fillStyle = "#bfdbfe";
  ctx.beginPath(); ctx.moveTo(carX + 28, groundY - cH - 18); ctx.lineTo(carX + 50, groundY - cH - 36); ctx.lineTo(carX + 90, groundY - cH - 36); ctx.lineTo(carX + 105, groundY - cH - 18); ctx.fill();
  ctx.restore();
  drawWheel(carX + 25, groundY - 14, 15, brakingState.vCar * elapsedTime * 2, "#111827");
  drawWheel(carX + 90, groundY - 14, 15, brakingState.vCar * elapsedTime * 2, "#111827");

  // Box on roof
  const bxW = 40, bxH = 30;
  ctx.fillStyle = "#fef3c7"; ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(boxX + 40, groundY - cH - 18 - bxH, bxW, bxH, 4); ctx.fill(); ctx.stroke();
  ctx.fillStyle = "#92400e"; ctx.font = "bold 11px Inter"; ctx.textAlign = "center";
  ctx.fillText("📦", boxX + 60, groundY - cH - 18 - bxH/2 + 5);

  // Brake lights
  if (brakingState.braking) {
    ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(carX + 8, groundY - cH - 18 + cH/2, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(carX + cW - 8, groundY - cH - 18 + cH/2, 6, 0, Math.PI * 2); ctx.fill();
  }

  // Braking force arrow
  if (brakingState.braking && brakingState.vCar > 0) {
    drawArrow(carX + cW/2, groundY - cH/2 - 18, -Math.min(80, Fbrak * 0.005 + 20), 0, "#ef4444", `F_rem=${Fbrak}N`);
  }

  // Labels
  ctx.fillStyle = "#1e293b"; ctx.font = "bold 12px Inter"; ctx.textAlign = "center";
  ctx.fillText(`Mobil: ${brakingState.vCar.toFixed(1)} m/s`, carX + cW/2, groundY + 20);
  ctx.fillStyle = "#92400e"; ctx.fillText(`Kotak: ${brakingState.vBox.toFixed(1)} m/s`, boxX + 60, groundY + 36);

  velValue.textContent = `${brakingState.vCar.toFixed(1)} / ${brakingState.vBox.toFixed(1)}`;
  accelValue.textContent = brakingState.braking ? deccel.toFixed(2) : "0.00";
  netForceValue.textContent = brakingState.braking ? (-Fbrak).toFixed(0) : "0";
  timeValue.textContent = elapsedTime.toFixed(2);

  if (!brakingState.braking) {
    statusMessage.textContent = `Mobil Melaju ${v0} m/s, Kotak Ikut → Tekan REM MENDADAK!`;
    statusMessage.style.borderColor = "#f59e0b";
    conclusionText.textContent = `Mobil dan kotak bergerak bersama dengan kecepatan awal ${v0} m/s. Kotak tidak terikat ke mobil. Tekan REM MENDADAK untuk melihat efek inersia (Hukum I Newton).`;
  } else if (brakingState.vCar > 0.1) {
    statusMessage.textContent = `Rem! Mobil melambat tapi Kotak Terus Meluncur (Inersia)!`;
    statusMessage.style.borderColor = "#ef4444";
    conclusionText.textContent = `Mobil direm: a_mobil = -F_rem/m = ${deccel.toFixed(2)} m/s². Kotak tidak terikat → kotak terus dengan kecepatan semula (Hukum I Newton: benda mempertahankan gerak). Kotak meluncur ke depan!`;
  } else {
    statusMessage.textContent = `Mobil Berhenti. Kotak Terus Meluncur Ke Depan!`;
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
    raceState.vCar += (F / mC) * scaledDt;
    raceState.vTruck += (F / mT) * scaledDt;
    raceState.xCar += raceState.vCar * scaledDt * 30;
    raceState.xTruck += raceState.vTruck * scaledDt * 30;
    if (raceState.xCar > canvas.width * 0.8) { raceState.xCar = canvas.width * 0.8; isPlaying = false; btnPlayPause.textContent = "Mulai Simulasi"; }
    pushChart(elapsedTime, raceState.vCar, raceState.vTruck);
  } else if (currentScenario === "rocket") {
    const F = Math.max(0, parseFloat(rocketThrust.value) || 2000);
    const m = 100, g = 9.8;
    const a = Math.max(0, (F - m * g) / m);
    rocketState.v += a * scaledDt;
    rocketState.y += rocketState.v * scaledDt * 25;
    if (rocketState.y > canvas.height * 0.85) { isPlaying = false; btnPlayPause.textContent = "Mulai Simulasi"; }
    pushChart(elapsedTime, rocketState.v, a);
  } else if (currentScenario === "braking") {
    if (brakingState.braking) {
      const m = Math.max(500, parseFloat(brakingMass.value) || 1500);
      const Fbrak = Math.max(1000, parseFloat(brakingForce.value) || 8000);
      brakingState.vCar = Math.max(0, brakingState.vCar - (Fbrak / m) * scaledDt);
      brakingState.xCar += brakingState.vCar * scaledDt * 25;
      brakingState.xBox += brakingState.vBox * scaledDt * 25; // box continues at original speed
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
  trolleyState.x = 0; trolleyState.v = 0;
  raceState.xCar = 0; raceState.xTruck = 0; raceState.vCar = 0; raceState.vTruck = 0;
  rocketState.y = 0; rocketState.v = 0; rocketState.particles = []; rocketState.flame = 0;
  brakingState.xCar = 0; brakingState.xBox = 0; brakingState.vCar = parseFloat(carSpeed.value) || 20; brakingState.vBox = brakingState.vCar; brakingState.braking = false;
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
  if (currentScenario === "braking" && !brakingState.braking && !isPlaying) isPlaying = true; // keep running during braking setup
});
btnReset.addEventListener("click", () => resetSim(true));
scenarioSelect.addEventListener("change", switchScenario);

btnBrake?.addEventListener("click", () => {
  brakingState.vCar = parseFloat(carSpeed.value) || 20;
  brakingState.vBox = brakingState.vCar;
  brakingState.braking = true;
  isPlaying = true;
  btnPlayPause.textContent = "Jeda Simulasi";
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
