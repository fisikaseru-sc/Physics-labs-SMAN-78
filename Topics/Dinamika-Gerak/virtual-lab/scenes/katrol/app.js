// ===== CANVAS & CHART =====
const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");
const chartCanvas = document.getElementById("chartCanvas");

const m1Input = document.getElementById("m1Input");
const m2Input = document.getElementById("m2Input");
const gravityInput = document.getElementById("gravityInput");
const btnPlayPause = document.getElementById("btnPlayPause");
const btnReset = document.getElementById("btnReset");
const modeSingle = document.getElementById("modeSingle");
const modeMoving = document.getElementById("modeMoving");
const movingInfo = document.getElementById("movingInfo");
const weightVal = document.getElementById("weightVal");
const tensionVal = document.getElementById("tensionVal");
const accelVal = document.getElementById("accelVal");
const timeVal = document.getElementById("timeVal");
const statusMessage = document.getElementById("statusMessage");
const conclusionText = document.getElementById("conclusionText");

// Speed buttons
const btnSpeed1 = document.getElementById("btnSpeed1");
const btnSpeed05 = document.getElementById("btnSpeed05");
const btnSpeed025 = document.getElementById("btnSpeed025");

// ===== STATE =====
let isPlaying = false;
let elapsedTime = 0;
let lastTime = 0;
let simSpeed = 1.0;
let mode = "single"; // single | moving
let pulleyAngle = 0; // rotation angle for animation

const sys = { y: 0, v: 0 }; // y = displacement (m), v = velocity (m/s)
const MAX_DISP = 1.8; // meters

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
const MAX_CHART_PTS = 80;

function initChart() {
  if (chart) chart.destroy();
  chart = new Chart(chartCanvas, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        { label: "v sistem (m/s)", data: [], borderColor: "#3b82f6", backgroundColor: "#3b82f620", borderWidth: 2, pointRadius: 0, fill: true, tension: 0.3 },
        { label: "percepatan a (m/s²)", data: [], borderColor: "#ef4444", backgroundColor: "#ef444415", borderWidth: 2, pointRadius: 0, fill: false, tension: 0.3 }
      ]
    },
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

function pushChart(t, v, a) {
  chart.data.labels.push(t.toFixed(1));
  chart.data.datasets[0].data.push(parseFloat(v.toFixed(3)));
  chart.data.datasets[1].data.push(parseFloat(a.toFixed(3)));
  chart.update("none");
}

// ===== PHYSICS =====
function computePhysics() {
  const m1 = Math.max(0.5, parseFloat(m1Input.value) || 20);
  const m2 = Math.max(0.5, parseFloat(m2Input.value) || 40);
  const g = Math.max(1, parseFloat(gravityInput.value) || 9.8);
  const W1 = m1 * g, W2 = m2 * g;

  let a, T;
  if (mode === "single") {
    // Mesin Atwood: a = (m2-m1)*g / (m1+m2), T = 2*m1*m2*g/(m1+m2)
    a = (Math.abs(W2 - W1)) / (m1 + m2);
    T = 2 * m1 * m2 * g / (m1 + m2);
    if (m1 === m2) a = 0;
  } else {
    // Moving pulley: effort F attached to m1 ceiling, load is m2
    // a_load = (m2 - 2*m1)*g / (m2 + 4*m1)  [m1 provides effort force]
    // But here: m1 is effort mass, m2 is load
    const netF = m2 * g - 2 * m1 * g;
    const totalInertia = m2 + 4 * m1;
    a = Math.max(0, netF / totalInertia);
    T = m2 * g / 2 - m2 * a / 2; // simplified: T ≈ m2(g-a)/2
    T = Math.max(0, T);
  }

  return { m1, m2, g, W1, W2, a, T };
}

// ===== DRAW =====
function drawPulleyWheel(cx, cy, r, angle, color = "#64748b") {
  ctx.save();
  ctx.translate(cx, cy);
  // Outer ring
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = color + "22"; ctx.fill();
  ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.stroke();
  // Inner hub
  ctx.beginPath(); ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
  // Spokes
  ctx.strokeStyle = color; ctx.lineWidth = 2.5;
  for (let i = 0; i < 6; i++) {
    const a = angle + (i * Math.PI) / 3;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(r * 0.85 * Math.cos(a), r * 0.85 * Math.sin(a)); ctx.stroke();
  }
  ctx.restore();
}

function drawMass(x, y, w, h, label, sublabel, fillColor, strokeColor) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.15)"; ctx.shadowBlur = 10; ctx.shadowOffsetY = 4;
  ctx.fillStyle = fillColor;
  ctx.beginPath(); ctx.roundRect(x - w/2, y, w, h, 8); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = strokeColor; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.roundRect(x - w/2, y, w, h, 8); ctx.stroke();
  ctx.fillStyle = "#0f172a"; ctx.font = "bold 13px Inter,sans-serif"; ctx.textAlign = "center";
  ctx.fillText(label, x, y + h/2 + 2);
  if (sublabel) { ctx.font = "11px Inter"; ctx.fillStyle = "#475569"; ctx.fillText(sublabel, x, y + h/2 + 17); }
}

function drawScene() {
  const p = computePhysics();
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const cx = canvas.width / 2;
  const ceilY = 55;
  const pRadius = 28;

  // Ceiling hatching
  ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx - 280, ceilY); ctx.lineTo(cx + 280, ceilY); ctx.stroke();
  ctx.strokeStyle = "#94a3b855"; ctx.lineWidth = 1;
  for (let x = cx - 270; x <= cx + 280; x += 22) { ctx.beginPath(); ctx.moveTo(x, ceilY); ctx.lineTo(x + 10, ceilY - 12); ctx.stroke(); }

  const SCALE = (canvas.height - ceilY - 100) / MAX_DISP;
  const disp = sys.y * SCALE; // pixels

  if (mode === "single") {
    // Fixed pulley at center top
    ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, ceilY); ctx.lineTo(cx, ceilY + pRadius + 4); ctx.stroke();

    drawPulleyWheel(cx, ceilY + pRadius + 4, pRadius, pulleyAngle, "#475569");

    const pulleyBottom = ceilY + 2 * pRadius + 4;
    const m1X = cx - 70, m2X = cx + 70;
    const bw = 64, bh = 60;

    // m2 going down (positive disp)
    const y2 = pulleyBottom + disp;
    const y1 = pulleyBottom + (MAX_DISP * SCALE - disp);

    // Ropes
    ctx.strokeStyle = "#d97706"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(cx - pRadius, pulleyBottom); ctx.lineTo(m1X, Math.max(pulleyBottom, y1)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + pRadius, pulleyBottom); ctx.lineTo(m2X, Math.max(pulleyBottom, y2)); ctx.stroke();

    // Masses
    const isM2Down = p.m2 > p.m1;
    drawMass(m1X, Math.max(pulleyBottom, y1), bw, bh, `m₁=${p.m1}kg`, `W₁=${p.W1.toFixed(0)}N`, isM2Down ? "#fef3c7" : "#dbeafe", isM2Down ? "#f59e0b" : "#3b82f6");
    drawMass(m2X, Math.max(pulleyBottom, y2), bw, bh, `m₂=${p.m2}kg`, `W₂=${p.W2.toFixed(0)}N`, isM2Down ? "#dbeafe" : "#fef3c7", isM2Down ? "#3b82f6" : "#f59e0b");

    // Force arrows
    const arrowLen = Math.min(60, p.W1 * 0.05 + 20);
    ctx.strokeStyle = "#ef4444"; ctx.fillStyle = "#ef4444"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(m1X, Math.max(pulleyBottom, y1) + bh); ctx.lineTo(m1X, Math.max(pulleyBottom, y1) + bh + arrowLen); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(m1X, Math.max(pulleyBottom, y1) + bh + arrowLen); ctx.lineTo(m1X - 6, Math.max(pulleyBottom, y1) + bh + arrowLen - 10); ctx.lineTo(m1X + 6, Math.max(pulleyBottom, y1) + bh + arrowLen - 10); ctx.fill();
    ctx.fillStyle = "#ef4444"; ctx.font = "11px Inter"; ctx.textAlign = "center"; ctx.fillText(`W₁`, m1X - 18, Math.max(pulleyBottom, y1) + bh + arrowLen / 2 + 4);

    ctx.strokeStyle = "#10b981"; ctx.fillStyle = "#10b981"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(m1X, Math.max(pulleyBottom, y1)); ctx.lineTo(m1X, Math.max(pulleyBottom, y1) - arrowLen); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(m1X, Math.max(pulleyBottom, y1) - arrowLen); ctx.lineTo(m1X - 6, Math.max(pulleyBottom, y1) - arrowLen + 10); ctx.lineTo(m1X + 6, Math.max(pulleyBottom, y1) - arrowLen + 10); ctx.fill();
    ctx.fillStyle = "#10b981"; ctx.font = "11px Inter"; ctx.fillText(`T=${p.T.toFixed(0)}N`, m1X - 30, Math.max(pulleyBottom, y1) - arrowLen / 2);

    const a2Len = Math.min(60, p.W2 * 0.05 + 20);
    ctx.strokeStyle = "#ef4444"; ctx.fillStyle = "#ef4444"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(m2X, Math.max(pulleyBottom, y2) + bh); ctx.lineTo(m2X, Math.max(pulleyBottom, y2) + bh + a2Len); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(m2X, Math.max(pulleyBottom, y2) + bh + a2Len); ctx.lineTo(m2X - 6, Math.max(pulleyBottom, y2) + bh + a2Len - 10); ctx.lineTo(m2X + 6, Math.max(pulleyBottom, y2) + bh + a2Len - 10); ctx.fill();

    ctx.strokeStyle = "#10b981"; ctx.fillStyle = "#10b981"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(m2X, Math.max(pulleyBottom, y2)); ctx.lineTo(m2X, Math.max(pulleyBottom, y2) - a2Len); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(m2X, Math.max(pulleyBottom, y2) - a2Len); ctx.lineTo(m2X - 6, Math.max(pulleyBottom, y2) - a2Len + 10); ctx.lineTo(m2X + 6, Math.max(pulleyBottom, y2) - a2Len + 10); ctx.fill();
    ctx.fillStyle = "#10b981"; ctx.font = "11px Inter"; ctx.fillText(`T=${p.T.toFixed(0)}N`, m2X + 35, Math.max(pulleyBottom, y2) - a2Len / 2);

    // Labels
    if (p.m2 > p.m1) {
      ctx.fillStyle = "#3b82f6"; ctx.font = "bold 13px Inter"; ctx.textAlign = "center";
      ctx.fillText("▲ naik", m1X, Math.max(pulleyBottom, y1) - arrowLen - 10);
      ctx.fillText("▼ turun", m2X, Math.max(pulleyBottom, y2) - arrowLen - 10);
    } else if (p.m1 > p.m2) {
      ctx.fillStyle = "#3b82f6"; ctx.font = "bold 13px Inter";
      ctx.fillText("▼ turun", m1X, Math.max(pulleyBottom, y1) - arrowLen - 10);
      ctx.fillText("▲ naik", m2X, Math.max(pulleyBottom, y2) - arrowLen - 10);
    } else {
      ctx.fillStyle = "#10b981"; ctx.font = "bold 13px Inter";
      ctx.fillText("✓ SEIMBANG", cx, ceilY + pRadius * 2 + 30);
    }
  } else {
    // Moving pulley system
    const fixedPulX = cx + 80;
    const movPulX = cx - 60;

    // Fixed pulley on ceiling
    ctx.strokeStyle = "#94a3b8"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(fixedPulX, ceilY); ctx.lineTo(fixedPulX, ceilY + pRadius + 4); ctx.stroke();
    drawPulleyWheel(fixedPulX, ceilY + pRadius + 4, pRadius, pulleyAngle * 1.5, "#64748b");

    // Moving pulley (attached to load m2)
    const loadY = ceilY + pRadius * 3 + disp;
    drawPulleyWheel(movPulX, loadY, pRadius, -pulleyAngle, "#3b82f6");

    // Load m2 hanging from moving pulley
    drawMass(movPulX, loadY + pRadius, 70, 62, `m₂=${p.m2}kg`, `W₂=${p.W2.toFixed(0)}N`, "#dbeafe", "#3b82f6");

    // Effort mass m1 (pulling end of rope)
    const m1Y = ceilY + pRadius * 2 + disp * 0.5;
    drawMass(cx + 10, m1Y, 64, 56, `m₁=${p.m1}kg`, `F=${(p.m1*p.g).toFixed(0)}N`, "#fef3c7", "#f59e0b");

    // Ropes
    ctx.strokeStyle = "#d97706"; ctx.lineWidth = 3;
    // rope from ceiling to moving pulley
    ctx.beginPath(); ctx.moveTo(movPulX - pRadius, loadY); ctx.lineTo(movPulX - pRadius, ceilY); ctx.stroke();
    // rope from moving pulley over fixed pulley down to m1
    ctx.beginPath();
    ctx.moveTo(movPulX + pRadius, loadY);
    ctx.lineTo(fixedPulX - pRadius, ceilY + pRadius * 2 + 4);
    ctx.arc(fixedPulX, ceilY + pRadius + 4, pRadius, Math.PI, 0);
    ctx.lineTo(cx + 10, m1Y);
    ctx.stroke();

    // Keuntungan mekanis label
    ctx.fillStyle = "#3b82f6"; ctx.font = "bold 14px Inter"; ctx.textAlign = "center";
    ctx.fillText("Keuntungan Mekanis = 2", cx, ceilY + 30);
    ctx.font = "12px Inter"; ctx.fillStyle = "#64748b";
    ctx.fillText(`Gaya angkat F = W/2 ≈ ${(p.W2/2).toFixed(0)} N`, cx, ceilY + 48);
  }

  // ===== Update UI =====
  weightVal.textContent = `${p.W1.toFixed(0)} / ${p.W2.toFixed(0)}`;
  tensionVal.textContent = p.T.toFixed(1);
  accelVal.textContent = p.a.toFixed(2);
  timeVal.textContent = elapsedTime.toFixed(2);

  if (p.a < 0.001) {
    statusMessage.textContent = `Sistem Seimbang — m₁ = m₂ = ${p.m1} kg, a = 0`;
    statusMessage.style.borderColor = "#10b981";
    conclusionText.textContent = `m₁ = m₂ = ${p.m1} kg. Gaya berat kedua sisi sama (W₁ = W₂ = ${p.W1.toFixed(0)} N). Tegangan tali T = W = ${p.T.toFixed(1)} N. Sistem seimbang (a = 0).`;
  } else {
    const heavier = p.m2 > p.m1 ? "m₂" : "m₁";
    statusMessage.textContent = `${heavier} turun — a = ${p.a.toFixed(2)} m/s², T = ${p.T.toFixed(1)} N`;
    statusMessage.style.borderColor = "#3b82f6";
    if (mode === "single") {
      conclusionText.textContent = `|W₂ − W₁| = |${p.W2.toFixed(0)} − ${p.W1.toFixed(0)}| = ${Math.abs(p.W2-p.W1).toFixed(0)} N menggerakkan sistem total (m₁+m₂ = ${(p.m1+p.m2).toFixed(0)} kg). a = ΔW/(m₁+m₂) = ${p.a.toFixed(2)} m/s². Tegangan tali T = 2m₁m₂g/(m₁+m₂) = ${p.T.toFixed(1)} N.`;
    } else {
      conclusionText.textContent = `Katrol bergerak: Keuntungan mekanis = 2. Gaya angkat yang dibutuhkan hanya F = W₂/2 ≈ ${(p.W2/2).toFixed(0)} N. Tali bergerak 2× jarak beban.`;
    }
  }
}

// ===== PHYSICS UPDATE =====
function updatePhysics(dt) {
  if (!isPlaying || dt <= 0) return;
  const p = computePhysics();
  sys.v += p.a * dt * simSpeed;
  sys.y += sys.v * dt;
  pulleyAngle += sys.v * dt * 3;
  if (sys.y >= MAX_DISP || sys.y <= 0) {
    sys.v = 0;
    if (sys.y >= MAX_DISP) sys.y = MAX_DISP;
    if (sys.y <= 0) sys.y = 0;
    isPlaying = false;
    btnPlayPause.textContent = "Mulai Simulasi";
  }
  elapsedTime += dt;
  pushChart(elapsedTime, sys.v, p.a);
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
  isPlaying = false; elapsedTime = 0; lastTime = 0; pulleyAngle = 0;
  sys.y = 0; sys.v = 0;
  btnPlayPause.textContent = "Mulai Simulasi";
  if (chart) { chart.data.labels = []; chart.data.datasets.forEach(d => d.data = []); chart.update("none"); }
  drawScene();
}

// ===== EVENT LISTENERS =====
btnPlayPause.addEventListener("click", () => {
  isPlaying = !isPlaying;
  btnPlayPause.textContent = isPlaying ? "Jeda Simulasi" : "Lanjutkan";
});
btnReset.addEventListener("click", resetSim);

const btnViewSim = document.getElementById("btnViewSim");
const btnViewChart = document.getElementById("btnViewChart");
const simulationContainer = document.querySelector(".simulation-container");
const chartPanel = document.querySelector(".chart-panel");
const overlayStats = document.getElementById("overlayStats");

btnViewSim?.addEventListener("click", () => {
  btnViewSim.classList.add("active");
  btnViewChart.classList.remove("active");
  simulationContainer.classList.remove("hidden");
  overlayStats.classList.remove("hidden");
  chartPanel.classList.remove("active");
  drawScene();
});
btnViewChart?.addEventListener("click", () => {
  btnViewChart.classList.add("active");
  btnViewSim.classList.remove("active");
  simulationContainer.classList.add("hidden");
  overlayStats.classList.add("hidden");
  chartPanel.classList.add("active");
  if (chart) chart.update();
});


modeSingle.addEventListener("click", () => {
  mode = "single";
  modeSingle.classList.add("active"); modeMoving.classList.remove("active");
  movingInfo.style.display = "none";
  resetSim();
});
modeMoving.addEventListener("click", () => {
  mode = "moving";
  modeMoving.classList.add("active"); modeSingle.classList.remove("active");
  movingInfo.style.display = "";
  resetSim();
});

[btnSpeed1, btnSpeed05, btnSpeed025].forEach(btn => {
  btn.addEventListener("click", () => {
    [btnSpeed1, btnSpeed05, btnSpeed025].forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    simSpeed = btn === btnSpeed1 ? 1.0 : btn === btnSpeed05 ? 0.5 : 0.25;
  });
});

[m1Input, m2Input, gravityInput].forEach(el => {
  if (el) el.addEventListener("input", () => { resetSim(); });
});

// ===== INIT =====
initChart();
requestAnimationFrame(simulationLoop);
