// ===== CANVAS & CHART SETUP =====
const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");
const chartCanvas = document.getElementById("chartCanvas");

const angleInput = document.getElementById("angleInput");
const massInput = document.getElementById("massInput");
const muInput = document.getElementById("muInput");
const gravityInput = document.getElementById("gravityInput");
const btnPlayPause = document.getElementById("btnPlayPause");
const btnReset = document.getElementById("btnReset");
const btnCriticalAngle = document.getElementById("btnCriticalAngle");

const wParallelVal = document.getElementById("wParallelVal");
const wPerpVal = document.getElementById("wPerpVal");
const fricVal = document.getElementById("fricVal");
const accelVal = document.getElementById("accelVal");
const statusMessage = document.getElementById("statusMessage");
const conclusionText = document.getElementById("conclusionText");

// ===== STATE =====
let isPlaying = false;
let elapsedTime = 0;
let lastTime = 0;
const box = { dist: 0, speed: 0 };

// ===== CANVAS RESIZE =====
function resizeCanvas() {
  const c = canvas.parentElement;
  canvas.width = c.clientWidth;
  canvas.height = c.clientHeight;
}
window.addEventListener("resize", () => { resizeCanvas(); drawScene(); });
resizeCanvas();

// ===== CHART: a vs θ =====
let chart = null;
function buildChart() {
  if (chart) chart.destroy();
  const mu = Math.max(0, parseFloat(muInput.value) || 0.2);
  const g = Math.max(1, parseFloat(gravityInput.value) || 9.8);
  const labels = [], aNoFric = [], aWithFric = [];
  for (let th = 0; th <= 80; th += 2) {
    const rad = th * Math.PI / 180;
    labels.push(th + "°");
    aNoFric.push(parseFloat((g * Math.sin(rad)).toFixed(3)));
    const netA = g * Math.sin(rad) - mu * g * Math.cos(rad);
    aWithFric.push(parseFloat(Math.max(0, netA).toFixed(3)));
  }
  chart = new Chart(chartCanvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "a tanpa gesekan (m/s²)", data: aNoFric, borderColor: "#3b82f6", backgroundColor: "#3b82f620", borderWidth: 2, pointRadius: 0, fill: true, tension: 0.3 },
        { label: `a dengan μ=${mu.toFixed(2)} (m/s²)`, data: aWithFric, borderColor: "#ef4444", backgroundColor: "#ef444420", borderWidth: 2, pointRadius: 0, fill: true, tension: 0.3 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { labels: { color: "#334155", font: { family: "Inter", size: 10 }, boxWidth: 12 } } },
      scales: {
        x: { ticks: { color: "#64748b", maxTicksLimit: 10, font: { size: 9 } }, grid: { color: "rgba(0,0,0,0.05)" } },
        y: { ticks: { color: "#64748b", font: { size: 9 } }, grid: { color: "rgba(0,0,0,0.05)" }, title: { display: true, text: "a (m/s²)", color: "#64748b", font: { size: 10 } } }
      }
    }
  });
}

// ===== PHYSICS =====
function computePhysics() {
  const thetaDeg = Math.max(0, Math.min(80, parseFloat(angleInput.value) || 0));
  const theta = thetaDeg * Math.PI / 180;
  const m = Math.max(1, parseFloat(massInput.value) || 50);
  const mu = Math.max(0, parseFloat(muInput.value) || 0);
  const g = Math.max(1, parseFloat(gravityInput.value) || 9.8);
  const W = m * g;
  const wParallel = W * Math.sin(theta);
  const wPerp = W * Math.cos(theta);
  const N = wPerp;
  const fLimit = mu * N;
  let fActual = 0, netForce = 0, accel = 0;
  if (box.speed < 0.001 && wParallel <= fLimit) {
    fActual = wParallel; netForce = 0; accel = 0;
  } else {
    fActual = fLimit;
    netForce = Math.max(0, wParallel - fActual);
    accel = netForce / m;
  }
  return { thetaDeg, theta, m, g, mu, W, wParallel, wPerp, N, fLimit, fActual, netForce, accel };
}

// ===== DRAW UTILITIES =====
function drawArrowRotated(x, y, length, color, label, lw = 3) {
  if (length < 2) return;
  const ah = Math.min(14, length * 0.4);
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + length - ah, y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + length, y); ctx.lineTo(x + length - ah, y - 7); ctx.lineTo(x + length - ah, y + 7); ctx.fill();
  if (label) { ctx.font = "bold 12px Inter,sans-serif"; ctx.textAlign = "center"; ctx.fillText(label, x + length / 2, y - 10); }
  ctx.restore();
}

// ===== DRAW SCENE =====
function drawScene() {
  const p = computePhysics();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const W_px = canvas.width, H_px = canvas.height;
  const baseX = 40, baseY = H_px - 40;
  const inclineLen = Math.min(W_px * 0.65, H_px * 0.8);
  const theta = p.theta;
  const topX = baseX + inclineLen * Math.cos(theta);
  const topY = baseY - inclineLen * Math.sin(theta);

  // Ground
  ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, baseY); ctx.lineTo(W_px, baseY); ctx.stroke();
  ctx.strokeStyle = "#94a3b855"; ctx.lineWidth = 1;
  for (let x = 0; x < W_px; x += 20) { ctx.beginPath(); ctx.moveTo(x, baseY); ctx.lineTo(x - 10, baseY + 12); ctx.stroke(); }

  // Incline surface
  const surfName = document.querySelector(".surface-btn.active")?.dataset.name || "Beton";
  const surfColors = { Beton: "#94a3b8", Kayu: "#b45309", Es: "#bae6fd", Pasir: "#d97706" };
  ctx.strokeStyle = surfColors[surfName] || "#94a3b8"; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(baseX, baseY); ctx.lineTo(topX, topY); ctx.stroke();

  // Incline fill
  ctx.fillStyle = (surfColors[surfName] || "#94a3b8") + "44";
  ctx.beginPath(); ctx.moveTo(baseX, baseY); ctx.lineTo(topX, topY); ctx.lineTo(topX, baseY); ctx.closePath(); ctx.fill();

  // Angle arc
  ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(baseX, baseY, 40, -theta, 0); ctx.stroke();
  ctx.fillStyle = "#f59e0b"; ctx.font = "bold 13px Inter"; ctx.textAlign = "center";
  ctx.fillText(`θ=${p.thetaDeg}°`, baseX + 55, baseY - 12);

  // Box along incline
  const t = Math.min(0.85, box.dist / inclineLen + 0.1);
  const bx = baseX + t * inclineLen * Math.cos(theta);
  const by = baseY - t * inclineLen * Math.sin(theta);
  const bSize = 44;

  ctx.save();
  ctx.translate(bx, by);
  ctx.rotate(-theta);
  ctx.shadowColor = "rgba(0,0,0,0.18)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3;
  ctx.fillStyle = p.accel > 0 ? "#dbeafe" : "#fef3c7";
  ctx.beginPath(); ctx.roundRect(-bSize/2, -bSize, bSize, bSize, 6); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(bx, by); ctx.rotate(-theta);
  ctx.strokeStyle = p.accel > 0 ? "#3b82f6" : "#f59e0b"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(-bSize/2, -bSize, bSize, bSize, 6); ctx.stroke();
  ctx.fillStyle = "#0f172a"; ctx.font = "bold 12px Inter"; ctx.textAlign = "center";
  ctx.fillText(`${p.m}kg`, 0, -bSize/2 + 5);
  ctx.fillText(`v=${box.speed.toFixed(1)}`, 0, -bSize/2 + 20);

  // W∥ along incline (down)
  const wParScale = Math.min(100, p.wParallel * 0.15 + 15);
  ctx.strokeStyle = "#ef4444"; ctx.fillStyle = "#ef4444"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, -bSize/2); ctx.lineTo(-wParScale, -bSize/2); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-wParScale, -bSize/2); ctx.lineTo(-wParScale + 8, -bSize/2 - 5); ctx.lineTo(-wParScale + 8, -bSize/2 + 5); ctx.fill();
  ctx.fillStyle = "#ef4444"; ctx.font = "10px Inter"; ctx.fillText(`W∥=${p.wParallel.toFixed(0)}N`, -wParScale / 2, -bSize/2 - 12);

  // Friction (up incline)
  if (p.fActual > 1) {
    const fScale = Math.min(80, p.fActual * 0.12 + 12);
    ctx.strokeStyle = "#8b5cf6"; ctx.fillStyle = "#8b5cf6"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, -bSize/2); ctx.lineTo(fScale, -bSize/2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(fScale, -bSize/2); ctx.lineTo(fScale - 8, -bSize/2 - 5); ctx.lineTo(fScale - 8, -bSize/2 + 5); ctx.fill();
    ctx.fillStyle = "#8b5cf6"; ctx.font = "10px Inter"; ctx.fillText(`f=${p.fActual.toFixed(0)}N`, fScale/2, -bSize/2 - 12);
  }

  ctx.restore();

  // N arrow perpendicular to incline
  const nLen = Math.min(80, p.N * 0.06 + 20);
  ctx.strokeStyle = "#10b981"; ctx.fillStyle = "#10b981"; ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx - nLen * Math.sin(theta), by - nLen * Math.cos(theta));
  ctx.stroke();
  ctx.fillStyle = "#10b981"; ctx.font = "bold 11px Inter"; ctx.textAlign = "left";
  ctx.fillText(`N=${p.N.toFixed(0)}N`, bx - nLen * Math.sin(theta) + 6, by - nLen * Math.cos(theta));

  // W arrow vertical downward
  const wLen = Math.min(80, p.W * 0.06 + 20);
  ctx.strokeStyle = "#ef4444"; ctx.fillStyle = "#ef4444"; ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath(); ctx.moveTo(bx, by - bSize/2); ctx.lineTo(bx, by - bSize/2 + wLen); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = "#ef4444"; ctx.font = "10px Inter"; ctx.textAlign = "left";
  ctx.fillText(`W=${p.W.toFixed(0)}N`, bx + 6, by - bSize/2 + wLen/2);

  // ===== Update stats =====
  wParallelVal.textContent = p.wParallel.toFixed(1);
  wPerpVal.textContent = p.wPerp.toFixed(1);
  fricVal.textContent = p.fActual.toFixed(1);
  accelVal.textContent = p.accel.toFixed(2);

  if (p.accel < 0.001) {
    statusMessage.textContent = `Benda Diam — W∥ (${p.wParallel.toFixed(0)} N) ≤ f (${p.fLimit.toFixed(0)} N)`;
    statusMessage.style.borderColor = "#f59e0b";
    conclusionText.textContent = `θ = ${p.thetaDeg}°: Komponen berat sejajar bidang W∥ = mg·sinθ = ${p.wParallel.toFixed(1)} N masih dapat dilawan gaya gesek statis maksimum f = μN = ${p.mu.toFixed(2)}×${p.N.toFixed(0)} = ${p.fLimit.toFixed(1)} N. Benda tetap diam (a = 0).`;
  } else {
    statusMessage.textContent = `Benda Meluncur — a = ${p.accel.toFixed(2)} m/s², v = ${box.speed.toFixed(1)} m/s`;
    statusMessage.style.borderColor = "#3b82f6";
    conclusionText.textContent = `θ = ${p.thetaDeg}°: W∥ = ${p.wParallel.toFixed(1)} N > f = ${p.fLimit.toFixed(1)} N. ΣF = ${p.netForce.toFixed(1)} N → a = ΣF/m = ${p.accel.toFixed(2)} m/s². Semakin besar θ, semakin besar percepatan (lihat grafik a vs θ).`;
  }

  // Sudut kritis label
  const critAngleDeg = Math.atan(p.mu) * 180 / Math.PI;
  ctx.fillStyle = "#64748b"; ctx.font = "12px Inter"; ctx.textAlign = "right";
  ctx.fillText(`Sudut kritis: θc = arctan(μ) = ${critAngleDeg.toFixed(1)}°`, W_px - 10, 22);
  ctx.fillText(`Permukaan: ${surfName} | μ = ${p.mu.toFixed(2)}`, W_px - 10, 40);
}

// ===== PHYSICS INTEGRATION =====
function updatePhysics(dt) {
  if (!isPlaying || dt <= 0) return;
  const p = computePhysics();
  box.speed += p.accel * dt;
  if (box.speed < 0) box.speed = 0;
  box.dist += box.speed * dt * 50;
  const maxDist = canvas.width * 0.7;
  if (box.dist >= maxDist) {
    box.dist = maxDist;
    isPlaying = false;
    btnPlayPause.textContent = "Mulai Simulasi";
  }
  elapsedTime += dt;
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
function resetSim() {
  isPlaying = false; elapsedTime = 0; lastTime = 0;
  box.dist = 0; box.speed = 0;
  btnPlayPause.textContent = "Mulai Simulasi";
  drawScene(); buildChart();
}

// ===== EVENT LISTENERS =====
btnPlayPause.addEventListener("click", () => {
  isPlaying = !isPlaying;
  btnPlayPause.textContent = isPlaying ? "Jeda Simulasi" : "Lanjutkan";
});
btnReset.addEventListener("click", resetSim);

document.querySelectorAll(".angle-preset-btn[data-angle]").forEach(btn => {
  btn.addEventListener("click", () => {
    angleInput.value = btn.dataset.angle;
    resetSim();
  });
});

btnCriticalAngle?.addEventListener("click", () => {
  const mu = Math.max(0, parseFloat(muInput.value) || 0.2);
  const critAngle = Math.atan(mu) * 180 / Math.PI;
  angleInput.value = critAngle.toFixed(1);
  resetSim();
});

document.querySelectorAll(".surface-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".surface-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    muInput.value = btn.dataset.mu;
    resetSim();
  });
});

[angleInput, massInput, muInput, gravityInput].forEach(el => {
  if (el) el.addEventListener("input", () => { resetSim(); });
});

// ===== INIT =====
buildChart();
requestAnimationFrame(simulationLoop);
