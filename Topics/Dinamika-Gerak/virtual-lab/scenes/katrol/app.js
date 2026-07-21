const canvas = document.getElementById("simCanvas");
const ctx = canvas.getContext("2d");

const m1Input = document.getElementById("m1Input");
const m2Input = document.getElementById("m2Input");
const gravityInput = document.getElementById("gravityInput");

const btnPlayPause = document.getElementById("btnPlayPause");
const btnReset = document.getElementById("btnReset");

const weightVal = document.getElementById("weightVal");
const tensionVal = document.getElementById("tensionVal");
const netForceValue = document.getElementById("netForceValue");
const accelVal = document.getElementById("accelVal");
const statusMessage = document.getElementById("statusMessage");
const conclusionText = document.getElementById("conclusionText");

let isPlaying = false;
let elapsedTime = 0;
let lastTime = 0;

const state = {
  y1: 0, // displacement of m1 (meters, positive = up)
  v: 0,  // velocity of system
};

function resizeCanvas() {
  const container = canvas.parentElement;
  canvas.width = container.clientWidth;
  canvas.height = container.clientHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function updatePhysicsState() {
  const m1 = Math.max(1, parseFloat(m1Input.value) || 20);
  const m2 = Math.max(1, parseFloat(m2Input.value) || 40);
  const g = Math.max(0.1, parseFloat(gravityInput.value) || 9.8);

  const W1 = m1 * g;
  const W2 = m2 * g;
  const netF = Math.abs(W2 - W1);
  const totalMass = m1 + m2;
  const a = netF / totalMass;
  const T = (2 * m1 * m2 * g) / totalMass;

  weightVal.textContent = `${W1.toFixed(0)}N / ${W2.toFixed(0)}N`;
  tensionVal.textContent = T.toFixed(1);
  netForceValue.textContent = netF.toFixed(1);
  accelVal.textContent = a.toFixed(2);

  if (m1 === m2) {
    statusMessage.textContent = "Sistem Seimbang (m1 = m2, a = 0 m/s²)";
    statusMessage.style.borderColor = "#10b981";
    conclusionText.textContent = `Karena m1 = m2 (${m1} kg), berat W1 = W2 = ${W1.toFixed(1)} N. Tegangan tali T = W1 = ${T.toFixed(1)} N. Sistem diam / seimbang (a = 0).`;
  } else if (m2 > m1) {
    statusMessage.textContent = `Beban m2 Turun, m1 Naik (a = ${a.toFixed(2)} m/s²)`;
    statusMessage.style.borderColor = "#3b82f6";
    conclusionText.textContent = `Beban m2 (${m2} kg) lebih berat dari m1 (${m1} kg). Perbedaan berat ΔW = ${netF.toFixed(1)} N mempercepat m2 turun dan m1 naik sebesar a = ${a.toFixed(2)} m/s² dengan Tegangan Tali T = ${T.toFixed(1)} N.`;
  } else {
    statusMessage.textContent = `Beban m1 Turun, m2 Naik (a = ${a.toFixed(2)} m/s²)`;
    statusMessage.style.borderColor = "#3b82f6";
    conclusionText.textContent = `Beban m1 (${m1} kg) lebih berat dari m2 (${m2} kg). Perbedaan berat ΔW = ${netF.toFixed(1)} N mempercepat m1 turun dan m2 naik sebesar a = ${a.toFixed(2)} m/s² dengan Tegangan Tali T = ${T.toFixed(1)} N.`;
  }

  return { m1, m2, g, W1, W2, netF, totalMass, a, T };
}

function updatePhysics(dt) {
  if (!isPlaying) return;

  const phys = updatePhysicsState();
  let dir = phys.m2 > phys.m1 ? 1 : phys.m1 > phys.m2 ? -1 : 0;

  if (dir !== 0) {
    state.v += dir * phys.a * dt;
    state.y1 += state.v * dt;

    const maxTravel = 2.5; // meters
    if (Math.abs(state.y1) >= maxTravel) {
      state.y1 = Math.sign(state.y1) * maxTravel;
      isPlaying = false;
      btnPlayPause.textContent = "Mulai Simulasi";
      toggleInputs(false);
    }
  }

  elapsedTime += dt;
}

function drawArrow(x, y, length, direction, color, label) {
  if (Math.abs(length) < 1) return;
  const arrowHead = 10;
  const sign = direction === "down" ? 1 : -1;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y + sign * (length - arrowHead));
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x, y + sign * length);
  ctx.lineTo(x - 6, y + sign * (length - arrowHead));
  ctx.lineTo(x + 6, y + sign * (length - arrowHead));
  ctx.fill();

  ctx.font = "bold 12px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(label, direction === "down" ? x + 35 : x - 35, y + sign * (length / 2));
  ctx.restore();
}

function drawScene() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const phys = updatePhysicsState();

  const centerX = canvas.width / 2;
  const pulleyY = 120;
  const pulleyRadius = 40;

  // Ceiling support
  ctx.strokeStyle = "#475569";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(centerX, 0);
  ctx.lineTo(centerX, pulleyY - pulleyRadius);
  ctx.stroke();

  // Pulley Wheel
  ctx.fillStyle = "#64748b";
  ctx.beginPath();
  ctx.arc(centerX, pulleyY, pulleyRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#94a3b8";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = "#1e293b";
  ctx.beginPath();
  ctx.arc(centerX, pulleyY, 10, 0, Math.PI * 2);
  ctx.fill();

  // Positions of m1 and m2
  const baseLen = 180;
  const scaleMetersToPixels = 50;
  const y1Pixels = pulleyY + baseLen - state.y1 * scaleMetersToPixels;
  const y2Pixels = pulleyY + baseLen + state.y1 * scaleMetersToPixels;

  const x1 = centerX - pulleyRadius;
  const x2 = centerX + pulleyRadius;

  // Strings
  ctx.strokeStyle = "#d97706";
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.moveTo(x1, y1Pixels);
  ctx.lineTo(x1, pulleyY);
  ctx.arc(centerX, pulleyY, pulleyRadius, Math.PI, 0, false);
  ctx.lineTo(x2, y2Pixels);
  ctx.stroke();

  // Box 1 (m1)
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(x1 - 30, y1Pixels, 60, 60);
  ctx.strokeStyle = "#ef4444";
  ctx.lineWidth = 3;
  ctx.strokeRect(x1 - 30, y1Pixels, 60, 60);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 13px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`m1=${phys.m1}kg`, x1, y1Pixels + 35);

  // Box 2 (m2)
  ctx.fillStyle = "#cbd5e1";
  ctx.fillRect(x2 - 30, y2Pixels, 60, 60);
  ctx.strokeStyle = "#10b981";
  ctx.lineWidth = 3;
  ctx.strokeRect(x2 - 30, y2Pixels, 60, 60);

  ctx.fillStyle = "#0f172a";
  ctx.font = "bold 13px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`m2=${phys.m2}kg`, x2, y2Pixels + 35);

  // Force Vectors
  const scaleF = 0.25;
  // W1 down, T1 up
  drawArrow(x1, y1Pixels + 60, phys.W1 * scaleF, "down", "#ef4444", `W1=${phys.W1.toFixed(0)}N`);
  drawArrow(x1, y1Pixels, phys.T * scaleF, "up", "#d97706", `T=${phys.T.toFixed(0)}N`);

  // W2 down, T2 up
  drawArrow(x2, y2Pixels + 60, phys.W2 * scaleF, "down", "#10b981", `W2=${phys.W2.toFixed(0)}N`);
  drawArrow(x2, y2Pixels, phys.T * scaleF, "up", "#d97706", `T=${phys.T.toFixed(0)}N`);
}

function simulationLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  if (dt < 0.1) {
    updatePhysics(dt);
  }
  drawScene();
  requestAnimationFrame(simulationLoop);
}

btnPlayPause.addEventListener("click", () => {
  isPlaying = !isPlaying;
  btnPlayPause.textContent = isPlaying ? "Jeda Simulasi" : "Mulai Simulasi";
  toggleInputs(isPlaying);
});

function resetSim() {
  state.y1 = 0;
  state.v = 0;
  elapsedTime = 0;
  isPlaying = false;
  btnPlayPause.textContent = "Mulai Simulasi";
  toggleInputs(false);
  updatePhysicsState();
  drawScene();
}

btnReset.addEventListener("click", resetSim);

function toggleInputs(disabled) {
  [m1Input, m2Input, gravityInput].forEach((el) => {
    if (el) el.disabled = disabled;
  });
}

[m1Input, m2Input, gravityInput].forEach((el) => {
  if (el) {
    el.addEventListener("input", () => {
      updatePhysicsState();
      if (!isPlaying) drawScene();
    });
  }
});

updatePhysicsState();
requestAnimationFrame(simulationLoop);
