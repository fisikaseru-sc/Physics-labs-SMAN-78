const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");

const massInput = document.getElementById("massInput");
const theta1Input = document.getElementById("theta1Input");
const theta2Input = document.getElementById("theta2Input");
const gravityInput = document.getElementById("gravityInput");

const btnPlayPause = document.getElementById("btnPlayPause");
const btnReset = document.getElementById("btnReset");

const weightVal = document.getElementById("weightVal");
const t1Val = document.getElementById("t1Val");
const t2Val = document.getElementById("t2Val");
const netForceValue = document.getElementById("netForceValue");
const statusMessage = document.getElementById("statusMessage");
const conclusionText = document.getElementById("conclusionText");

let isPlaying = false;
let elapsedTime = 0;
let lastTime = 0;

function resizeCanvas() {
  const container = canvas.parentElement;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function updatePhysicsState() {
  const m = Math.max(1, parseFloat(massInput.value) || 50);
  const th1Deg = Math.max(5, Math.min(85, parseFloat(theta1Input.value) || 45));
  const th2Deg = Math.max(5, Math.min(85, parseFloat(theta2Input.value) || 45));
  const g = Math.max(0.1, parseFloat(gravityInput.value) || 9.8);

  const th1 = (th1Deg * Math.PI) / 180;
  const th2 = (th2Deg * Math.PI) / 180;

  const W = m * g;

  // Equilibrium equations:
  // T1 * cos(th1) = T2 * cos(th2) => T2 = T1 * cos(th1) / cos(th2)
  // T1 * sin(th1) + T2 * sin(th2) = W
  // T1 * sin(th1) + T1 * cos(th1) * tan(th2) = W
  // T1 = W / (sin(th1) + cos(th1) * tan(th2))
  const T1 = W / (Math.sin(th1) + Math.cos(th1) * Math.tan(th2));
  const T2 = (T1 * Math.cos(th1)) / Math.cos(th2);

  const netFx = T2 * Math.cos(th2) - T1 * Math.cos(th1);
  const netFy = T1 * Math.sin(th1) + T2 * Math.sin(th2) - W;
  const netF = Math.hypot(netFx, netFy);

  weightVal.textContent = W.toFixed(1);
  t1Val.textContent = T1.toFixed(1);
  t2Val.textContent = T2.toFixed(1);
  netForceValue.textContent = netF.toFixed(1);

  statusMessage.textContent = `Partikel Seimbang (ΣFx = 0 N, ΣFy = 0 N)`;
  statusMessage.style.borderColor = "#10b981";

  conclusionText.textContent = `Gaya Berat W = ${W.toFixed(1)} N ditahan oleh Tegangan Tali T1 = ${T1.toFixed(1)} N (sudut ${th1Deg}°) dan T2 = ${T2.toFixed(1)} N (sudut ${th2Deg}°). Komponen horizontal saling meniadakan (T1·cosθ1 = T2·cosθ2) dan komponen vertikal menyeimbangkan W.`;

  return { m, th1Deg, th2Deg, th1, th2, g, W, T1, T2, netF };
}

function drawArrow(x, y, length, angle, color, label) {
  if (Math.abs(length) < 1) return;
  const arrowHead = 10;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(length - arrowHead, 0);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(length, 0);
  ctx.lineTo(length - arrowHead, -6);
  ctx.lineTo(length - arrowHead, 6);
  ctx.fill();

  ctx.font = "bold 12px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, length / 2, -10);

  ctx.restore();
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const phys = updatePhysicsState();

  const knotX = canvas.width / 2;
  const knotY = canvas.height / 2;

  const ceilingY = knotY - 120;

  // Ceiling line
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(knotX - 250, ceilingY);
  ctx.lineTo(knotX + 250, ceilingY);
  ctx.stroke();

  // Attach points on ceiling
  const L1 = 120 / Math.sin(phys.th1);
  const L2 = 120 / Math.sin(phys.th2);

  const attach1X = knotX - 120 / Math.tan(phys.th1);
  const attach2X = knotX + 120 / Math.tan(phys.th2);

  // Ropes
  ctx.strokeStyle = "#d97706";
  ctx.lineWidth = 4;

  // Rope 1
  ctx.beginPath();
  ctx.moveTo(knotX, knotY);
  ctx.lineTo(attach1X, ceilingY);
  ctx.stroke();

  // Rope 2
  ctx.beginPath();
  ctx.moveTo(knotX, knotY);
  ctx.lineTo(attach2X, ceilingY);
  ctx.stroke();

  // Rope 3 (hanging weight)
  ctx.beginPath();
  ctx.moveTo(knotX, knotY);
  ctx.lineTo(knotX, knotY + 60);
  ctx.stroke();

  // Angle Arcs
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(attach1X, ceilingY, 30, 0, phys.th1, false);
  ctx.stroke();
  ctx.fillText(`θ1=${phys.th1Deg}°`, attach1X + 40, ceilingY + 20);

  ctx.beginPath();
  ctx.arc(attach2X, ceilingY, 30, Math.PI - phys.th2, Math.PI, false);
  ctx.stroke();
  ctx.fillText(`θ2=${phys.th2Deg}°`, attach2X - 40, ceilingY + 20);

  // Hanging Box
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(knotX - 30, knotY + 60, 60, 60);
  ctx.strokeStyle = "#3b82f6";
  ctx.lineWidth = 3;
  ctx.strokeRect(knotX - 30, knotY + 60, 60, 60);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 13px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${phys.m} kg`, knotX, knotY + 95);

  // Central Knot Ring
  ctx.fillStyle = "#e2e8f0";
  ctx.beginPath();
  ctx.arc(knotX, knotY, 8, 0, Math.PI * 2);
  ctx.fill();

  // Force Vectors at Central Knot
  const scale = 0.2;
  // W down
  drawArrow(knotX, knotY, phys.W * scale, Math.PI / 2, "#ef4444", `W=${phys.W.toFixed(0)}N`);

  // T1 along rope 1
  const angleT1 = Math.PI + (Math.PI / 2 - phys.th1);
  drawArrow(knotX, knotY, phys.T1 * scale, angleT1, "#10b981", `T1=${phys.T1.toFixed(0)}N`);

  // T2 along rope 2
  const angleT2 = - (Math.PI / 2 - phys.th2);
  drawArrow(knotX, knotY, phys.T2 * scale, angleT2, "#3b82f6", `T2=${phys.T2.toFixed(0)}N`);
}

function simulationLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  drawScene();
  requestAnimationFrame(simulationLoop);
}

btnPlayPause.addEventListener("click", () => {
  isPlaying = !isPlaying;
  btnPlayPause.textContent = isPlaying ? "Jeda Simulasi" : "Mulai Simulasi";
});

function resetSim() {
  elapsedTime = 0;
  isPlaying = false;
  btnPlayPause.textContent = "Mulai Simulasi";
  updatePhysicsState();
  drawScene();
}

btnReset.addEventListener("click", resetSim);

[massInput, theta1Input, theta2Input, gravityInput].forEach((el) => {
  if (el) {
    el.addEventListener("input", () => {
      updatePhysicsState();
      drawScene();
    });
  }
});

updatePhysicsState();
requestAnimationFrame(simulationLoop);
