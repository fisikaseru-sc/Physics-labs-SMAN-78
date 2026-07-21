// ===== CANVAS & CHART =====
const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");
const chartCanvas = document.getElementById("chartCanvas");

const massInput = document.getElementById("massInput");
const theta1Input = document.getElementById("theta1Input");
const theta2Input = document.getElementById("theta2Input");
const inclineAngle = document.getElementById("inclineAngle");
const gravityInput = document.getElementById("gravityInput");
const btnPlayPause = document.getElementById("btnPlayPause");
const btnReset = document.getElementById("btnReset");
const tabSymm = document.getElementById("tabSymm");
const tabAsymm = document.getElementById("tabAsymm");
const tabIncline = document.getElementById("tabIncline");
const theta2Group = document.getElementById("theta2Group");
const inclineGroup = document.getElementById("inclineGroup");
const weightVal = document.getElementById("weightVal");
const t1Val = document.getElementById("t1Val");
const t2Val = document.getElementById("t2Val");
const netForceValue = document.getElementById("netForceValue");
const statusMessage = document.getElementById("statusMessage");
const conclusionText = document.getElementById("conclusionText");
const chartTitle = document.getElementById("chartTitle");

// ===== STATE =====
let scenario = "symm"; // symm | asymm | incline
let isAnimating = false;
let swayAngle = 0;
let swayDir = 1;
let lastTime = 0;
let chart = null;

// ===== CANVAS RESIZE =====
function resizeCanvas() {
  const c = canvas.parentElement;
  canvas.width = c.clientWidth;
  canvas.height = c.clientHeight;
}
window.addEventListener("resize", () => { resizeCanvas(); drawScene(); });
resizeCanvas();

// ===== CHART: T₁ & T₂ vs θ₁ =====
function buildChart() {
  if (chart) chart.destroy();
  const m = Math.max(1, parseFloat(massInput.value) || 50);
  const g = Math.max(1, parseFloat(gravityInput.value) || 9.8);
  const W = m * g;
  const th2Deg = Math.max(5, Math.min(85, parseFloat(theta2Input.value) || 45));
  const th2 = th2Deg * Math.PI / 180;
  const labels = [], T1data = [], T2data = [];

  for (let th1d = 5; th1d <= 85; th1d += 2) {
    const th1 = th1d * Math.PI / 180;
    const T1 = W / (Math.sin(th1) + Math.cos(th1) * Math.tan(th2));
    const T2 = T1 * Math.cos(th1) / Math.cos(th2);
    labels.push(th1d + "°");
    T1data.push(parseFloat(Math.max(0, T1).toFixed(1)));
    T2data.push(parseFloat(Math.max(0, T2).toFixed(1)));
  }

  chart = new Chart(chartCanvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "T₁ (N)", data: T1data, borderColor: "#10b981", backgroundColor: "#10b98120", borderWidth: 2, pointRadius: 0, fill: true, tension: 0.3 },
        { label: "T₂ (N)", data: T2data, borderColor: "#3b82f6", backgroundColor: "#3b82f615", borderWidth: 2, pointRadius: 0, fill: false, tension: 0.3 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { labels: { color: "#334155", font: { family: "Inter", size: 10 }, boxWidth: 12 } } },
      scales: {
        x: { ticks: { color: "#64748b", maxTicksLimit: 10, font: { size: 9 } }, grid: { color: "rgba(0,0,0,0.05)" } },
        y: { ticks: { color: "#64748b", font: { size: 9 } }, grid: { color: "rgba(0,0,0,0.05)" }, title: { display: true, text: "Tegangan (N)", color: "#64748b", font: { size: 10 } } }
      }
    }
  });
}

// ===== ARROW UTIL =====
function drawArrow(x1, y1, x2, y2, color, label, lw = 3) {
  const dx = x2 - x1, dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  if (len < 2) return;
  const nx = dx / len, ny = dy / len;
  const ah = 12;
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw;
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - nx * ah, y2 - ny * ah); ctx.stroke();
  ctx.beginPath();
  const perpX = -ny * 6, perpY = nx * 6;
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - nx * ah + perpX, y2 - ny * ah + perpY);
  ctx.lineTo(x2 - nx * ah - perpX, y2 - ny * ah - perpY);
  ctx.closePath(); ctx.fill();
  if (label) {
    const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    ctx.font = "bold 12px Inter,sans-serif"; ctx.textAlign = "center";
    const offset = 14;
    ctx.fillText(label, mx + perpX * 2 * (offset / 6), my + perpY * 2 * (offset / 6));
  }
}

// ===== DRAW CEILING =====
function drawCeiling(y) {
  ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(50, y); ctx.lineTo(canvas.width - 50, y); ctx.stroke();
  ctx.strokeStyle = "#94a3b855"; ctx.lineWidth = 1;
  for (let x = 60; x < canvas.width - 50; x += 22) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10, y - 12); ctx.stroke(); }
}

// ===== DRAW KNOT =====
function drawKnot(x, y) {
  ctx.fillStyle = "#e2e8f0"; ctx.strokeStyle = "#475569"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
}

// ===== SCENARIOS =====
function computeSymmetric() {
  const m = Math.max(1, parseFloat(massInput.value) || 50);
  const g = Math.max(1, parseFloat(gravityInput.value) || 9.8);
  const th1d = Math.max(5, Math.min(85, parseFloat(theta1Input.value) || 45));
  const th2d = Math.max(5, Math.min(85, parseFloat(theta2Input.value) || 45));
  const th1 = th1d * Math.PI / 180, th2 = th2d * Math.PI / 180;
  const W = m * g;
  const T1 = W / (Math.sin(th1) + Math.cos(th1) * Math.tan(th2));
  const T2 = T1 * Math.cos(th1) / Math.cos(th2);
  const netFx = T2 * Math.cos(th2) - T1 * Math.cos(th1);
  const netFy = T1 * Math.sin(th1) + T2 * Math.sin(th2) - W;
  return { m, g, W, th1d, th2d, th1, th2, T1, T2, netF: Math.hypot(netFx, netFy) };
}

function drawSymmetricScene(p) {
  const cx = canvas.width / 2, ceilY = 70;
  const knotY = ceilY + 130 + swayAngle * 8;
  const attach1X = cx - 130 / Math.tan(p.th1);
  const attach2X = cx + 130 / Math.tan(p.th2);

  drawCeiling(ceilY);

  // Wall anchors
  ctx.fillStyle = "#64748b"; ctx.beginPath(); ctx.arc(attach1X, ceilY, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#64748b"; ctx.beginPath(); ctx.arc(attach2X, ceilY, 8, 0, Math.PI * 2); ctx.fill();

  // Ropes
  ctx.strokeStyle = "#d97706"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(attach1X, ceilY); ctx.lineTo(cx + swayAngle * 4, knotY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(attach2X, ceilY); ctx.lineTo(cx + swayAngle * 4, knotY); ctx.stroke();

  // Hanging rope + box
  const boxTop = knotY + 10;
  ctx.strokeStyle = "#d97706"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(cx + swayAngle * 4, knotY); ctx.lineTo(cx + swayAngle * 4, boxTop + 30); ctx.stroke();

  // Box
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.15)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
  ctx.fillStyle = "#dbeafe";
  ctx.beginPath(); ctx.roundRect(cx + swayAngle * 4 - 35, boxTop + 30, 70, 60, 8); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(cx + swayAngle * 4 - 35, boxTop + 30, 70, 60, 8); ctx.stroke();
  ctx.fillStyle = "#0f172a"; ctx.font = "bold 13px Inter"; ctx.textAlign = "center";
  ctx.fillText(`${p.m}kg`, cx + swayAngle * 4, boxTop + 68);

  // Knot
  drawKnot(cx + swayAngle * 4, knotY);

  // Angle arcs
  ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2; ctx.setLineDash([4, 3]);
  ctx.beginPath(); ctx.moveTo(attach1X, ceilY); ctx.lineTo(attach1X + 40, ceilY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(attach1X, ceilY, 32, 0, p.th1); ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = "#f59e0b"; ctx.font = "bold 12px Inter"; ctx.textAlign = "center";
  ctx.fillText(`θ₁=${p.th1d}°`, attach1X + 50, ceilY + 22);

  ctx.setLineDash([4, 3]);
  ctx.strokeStyle = "#f59e0b"; ctx.beginPath(); ctx.moveTo(attach2X, ceilY); ctx.lineTo(attach2X - 40, ceilY); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(attach2X, ceilY, 32, Math.PI - p.th2, Math.PI); ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillText(`θ₂=${p.th2d}°`, attach2X - 50, ceilY + 22);

  // Force arrows at knot
  const kx = cx + swayAngle * 4;
  const scale = 0.18;
  // W down
  drawArrow(kx, knotY, kx, knotY + p.W * scale + 20, "#ef4444", `W=${p.W.toFixed(0)}N`);
  // T1 toward attach1
  const T1len = p.T1 * scale + 20;
  drawArrow(kx, knotY, kx - T1len * Math.cos(p.th1), knotY - T1len * Math.sin(p.th1), "#10b981", `T₁=${p.T1.toFixed(0)}N`);
  // T2 toward attach2
  const T2len = p.T2 * scale + 20;
  drawArrow(kx, knotY, kx + T2len * Math.cos(p.th2), knotY - T2len * Math.sin(p.th2), "#3b82f6", `T₂=${p.T2.toFixed(0)}N`);
}

function drawInclineScene() {
  const m = Math.max(1, parseFloat(massInput.value) || 50);
  const g = Math.max(1, parseFloat(gravityInput.value) || 9.8);
  const th = Math.max(5, Math.min(80, parseFloat(inclineAngle.value) || 30));
  const theta = th * Math.PI / 180;
  const W = m * g;
  // On incline + horizontal tali: N = mg cosθ, T_tali = mg sinθ, f = 0
  const N = W * Math.cos(theta);
  const T = W * Math.sin(theta);

  weightVal.textContent = W.toFixed(1);
  t1Val.textContent = N.toFixed(1);
  t2Val.textContent = T.toFixed(1);
  netForceValue.textContent = "0.0";
  statusMessage.textContent = `Kesetimbangan di Bidang Miring — T = mg·sinθ = ${T.toFixed(1)} N`;
  statusMessage.style.borderColor = "#10b981";
  conclusionText.textContent = `Benda diam pada bidang miring θ=${th}° ditahan tali horizontal T = mg·sinθ = ${W.toFixed(0)}×sin(${th}°) = ${T.toFixed(1)} N. Gaya Normal N = mg·cosθ = ${N.toFixed(1)} N. ΣF = 0 (seimbang).`;

  // Draw incline
  const bX = 50, bY = canvas.height - 50;
  const inclineLen = Math.min(canvas.width * 0.7, canvas.height * 0.7);
  const tX = bX + inclineLen * Math.cos(theta), tY = bY - inclineLen * Math.sin(theta);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#94a3b844";
  ctx.beginPath(); ctx.moveTo(bX, bY); ctx.lineTo(tX, tY); ctx.lineTo(tX, bY); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(bX, bY); ctx.lineTo(tX, tY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(bX, bY); ctx.lineTo(canvas.width, bY); ctx.stroke();

  // Box on incline
  const t_pos = 0.55;
  const bx = bX + t_pos * inclineLen * Math.cos(theta);
  const by = bY - t_pos * inclineLen * Math.sin(theta);
  const bs = 44;
  ctx.save(); ctx.translate(bx, by); ctx.rotate(-theta);
  ctx.shadowColor = "rgba(0,0,0,0.15)"; ctx.shadowBlur = 8;
  ctx.fillStyle = "#dbeafe"; ctx.beginPath(); ctx.roundRect(-bs/2, -bs, bs, bs, 6); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.translate(bx, by); ctx.rotate(-theta);
  ctx.strokeStyle = "#3b82f6"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(-bs/2, -bs, bs, bs, 6); ctx.stroke();
  ctx.fillStyle = "#0f172a"; ctx.font = "bold 12px Inter"; ctx.textAlign = "center"; ctx.fillText(`${m}kg`, 0, -bs/2 + 6);
  ctx.restore();

  // Horizontal tali to wall
  const wallX = Math.min(canvas.width - 30, bx + 150);
  ctx.strokeStyle = "#d97706"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(bx, by - bs/2); ctx.lineTo(wallX, by - bs/2); ctx.stroke();
  ctx.fillStyle = "#64748b"; ctx.fillRect(wallX, by - bs/2 - 20, 10, 40);

  // Force arrows
  drawArrow(bx, by - bs/2, bx + T * 0.12 + 20, by - bs/2, "#f59e0b", `T=${T.toFixed(0)}N`); // rope
  drawArrow(bx, by - bs/2 - bs/2, bx, by - bs/2 - bs/2 + W * 0.08 + 20, "#ef4444", `W=${W.toFixed(0)}N`); // W down
  drawArrow(bx, by - bs/2, bx - N * 0.07 * Math.sin(theta), by - bs/2 - N * 0.07 * Math.cos(theta), "#10b981", `N=${N.toFixed(0)}N`); // N perp

  // Angle
  ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(bX, bY, 40, -theta, 0); ctx.stroke();
  ctx.fillStyle = "#f59e0b"; ctx.font = "bold 12px Inter"; ctx.textAlign = "left"; ctx.fillText(`θ=${th}°`, bX + 44, bY - 10);
}

// ===== MAIN DRAW =====
function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (scenario === "incline") {
    drawInclineScene();
    return;
  }

  const p = computeSymmetric();

  // Update stats
  weightVal.textContent = p.W.toFixed(1);
  t1Val.textContent = p.T1.toFixed(1);
  t2Val.textContent = p.T2.toFixed(1);
  netForceValue.textContent = p.netF.toFixed(2);
  statusMessage.textContent = `Partikel Seimbang — ΣFx = 0, ΣFy = 0`;
  statusMessage.style.borderColor = "#10b981";
  conclusionText.textContent = `W = m·g = ${p.m}×${p.g.toFixed(1)} = ${p.W.toFixed(1)} N. T₁·cosθ₁ = T₂·cosθ₂ (horizontal). T₁·sinθ₁ + T₂·sinθ₂ = W (vertikal). Solusi: T₁ = ${p.T1.toFixed(1)} N, T₂ = ${p.T2.toFixed(1)} N.`;

  drawSymmetricScene(p);
}

// ===== ANIMATION LOOP =====
function simulationLoop(ts) {
  if (!lastTime) lastTime = ts;
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;

  if (isAnimating) {
    swayAngle += swayDir * dt * 1.2;
    if (swayAngle > 1) swayDir = -1;
    if (swayAngle < -1) swayDir = 1;
  }

  drawScene();
  requestAnimationFrame(simulationLoop);
}

// ===== SCENARIO SWITCH =====
function switchScenario(sc) {
  scenario = sc;
  [tabSymm, tabAsymm, tabIncline].forEach(b => b.classList.remove("active"));
  if (sc === "symm") {
    tabSymm.classList.add("active");
    theta2Group.style.display = ""; inclineGroup.style.display = "none";
    chartTitle.textContent = "Grafik T₁ & T₂ vs Sudut θ₁";
    buildChart();
  } else if (sc === "asymm") {
    tabAsymm.classList.add("active");
    theta2Group.style.display = ""; inclineGroup.style.display = "none";
    chartTitle.textContent = "Grafik T₁ & T₂ vs Sudut θ₁ (θ₂ berbeda)";
    buildChart();
  } else {
    tabIncline.classList.add("active");
    theta2Group.style.display = "none"; inclineGroup.style.display = "";
    chartTitle.textContent = "Grafik T vs Sudut Bidang Miring θ";
    buildInclineChart();
  }
}

function buildInclineChart() {
  if (chart) chart.destroy();
  const m = Math.max(1, parseFloat(massInput.value) || 50);
  const g = Math.max(1, parseFloat(gravityInput.value) || 9.8);
  const W = m * g;
  const labels = [], Tdata = [], Ndata = [];
  for (let th = 0; th <= 80; th += 2) {
    const rad = th * Math.PI / 180;
    labels.push(th + "°");
    Tdata.push(parseFloat((W * Math.sin(rad)).toFixed(1)));
    Ndata.push(parseFloat((W * Math.cos(rad)).toFixed(1)));
  }
  chart = new Chart(chartCanvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        { label: "T = mg·sinθ (N)", data: Tdata, borderColor: "#f59e0b", backgroundColor: "#f59e0b20", borderWidth: 2, pointRadius: 0, fill: true, tension: 0.3 },
        { label: "N = mg·cosθ (N)", data: Ndata, borderColor: "#10b981", backgroundColor: "#10b98115", borderWidth: 2, pointRadius: 0, fill: false, tension: 0.3 }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false, animation: false,
      plugins: { legend: { labels: { color: "#334155", font: { family: "Inter", size: 10 }, boxWidth: 12 } } },
      scales: {
        x: { ticks: { color: "#64748b", maxTicksLimit: 10, font: { size: 9 } }, grid: { color: "rgba(0,0,0,0.05)" } },
        y: { ticks: { color: "#64748b", font: { size: 9 } }, grid: { color: "rgba(0,0,0,0.05)" } }
      }
    }
  });
}

// ===== EVENT LISTENERS =====
btnPlayPause.addEventListener("click", () => {
  isAnimating = !isAnimating;
  btnPlayPause.textContent = isAnimating ? "Hentikan Animasi" : "Animasi Bergoyang";
  if (!isAnimating) swayAngle = 0;
});
btnReset.addEventListener("click", () => {
  isAnimating = false; swayAngle = 0;
  btnPlayPause.textContent = "Animasi Bergoyang";
  switchScenario(scenario);
});

tabSymm.addEventListener("click", () => switchScenario("symm"));
tabAsymm.addEventListener("click", () => switchScenario("asymm"));
tabIncline.addEventListener("click", () => switchScenario("incline"));

[massInput, theta1Input, theta2Input, gravityInput, inclineAngle].forEach(el => {
  if (el) el.addEventListener("input", () => { buildChart(); drawScene(); });
});

// ===== INIT =====
buildChart();
requestAnimationFrame(simulationLoop);
