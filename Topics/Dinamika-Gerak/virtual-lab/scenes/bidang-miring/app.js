const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const btnPlayPause = document.getElementById('btnPlayPause');
const btnReset = document.getElementById('btnReset');

const scenarioSelect = document.getElementById('scenarioSelect');
const genericControls = document.getElementById('genericControls');
const tarikTambangControls = document.getElementById('tarikTambangControls');
const customControls = document.getElementById('customControls');

const force1Input = document.getElementById('force1');
const dir1Select = document.getElementById('dir1');
const force2Input = document.getElementById('force2');
const dir2Select = document.getElementById('dir2');

const numPeopleLeftInput = document.getElementById('numPeopleLeft');
const numPeopleRightInput = document.getElementById('numPeopleRight');

const customObject = document.getElementById('customObject');
const customVelocity = document.getElementById('customVelocity');
const btnSetVelocity = document.getElementById('btnSetVelocity');

const frictionForceInput = document.getElementById('frictionForce');
const massInput = document.getElementById('mass');

const velValue = document.getElementById('velValue');
const netForceValue = document.getElementById('netForceValue');
const timeValue = document.getElementById('timeValue');
const statusMessage = document.getElementById('statusMessage');
const conclusionText = document.getElementById('conclusionText');

// Tabs
const tabP1 = document.getElementById('tabP1');
const tabP2 = document.getElementById('tabP2');

// Simulation State
let isPlaying = false;
let lastTime = 0;
let elapsedTime = 0;

// Physics Object
const box = {
    x: 0, 
    y: 0,
    width: 1.2, 
    height: 1.2, 
    mass: 50,
    velocity: 0,
    acceleration: 0
};

const SCALE = 100;
const PIXELS_PER_NEWTON = 0.5;
const FORCE_PER_PERSON = 50; // N

function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function getEffectiveForces() {
    if (scenarioSelect.value === 'tariktambang') {
        const numLeft = parseInt(numPeopleLeftInput.value) || 0;
        const numRight = parseInt(numPeopleRightInput.value) || 0;
        return {
            f1: numLeft * FORCE_PER_PERSON, dir1: 'left',
            f2: numRight * FORCE_PER_PERSON, dir2: 'right'
        };
    } else {
        return {
            f1: parseFloat(force1Input.value) || 0, dir1: dir1Select.value,
            f2: parseFloat(force2Input.value) || 0, dir2: dir2Select.value
        };
    }
}

function drawArrow(x, y, length, direction, color, label) {
    if (length === 0) return;
    
    const arrowWidth = 12;
    const arrowHeadSize = 15;
    const actualLength = Math.abs(length);
    const sign = direction === 'right' ? 1 : -1;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + sign * Math.max(1, actualLength - arrowHeadSize), y);
    ctx.lineWidth = arrowWidth;
    ctx.strokeStyle = color;
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(x + sign * Math.max(1, actualLength - arrowHeadSize), y - arrowHeadSize);
    ctx.lineTo(x + sign * actualLength, y);
    ctx.lineTo(x + sign * Math.max(1, actualLength - arrowHeadSize), y + arrowHeadSize);
    ctx.fillStyle = color;
    ctx.fill();
    
    ctx.fillStyle = color;
    ctx.font = '14px Inter, sans-serif';
    ctx.fontWeight = 'bold';
    ctx.textAlign = 'center';
    
    ctx.fillText(label, x + sign * (actualLength / 2), y - arrowHeadSize - 5);
}

function updatePhysics(dt) {
    if (!isPlaying) return;

    const forces = getEffectiveForces();
    const frictionLimit = parseFloat(frictionForceInput.value) || 0;
    box.mass = parseFloat(massInput.value) || 50;

    let fApp = (forces.dir1 === 'right' ? forces.f1 : -forces.f1) + (forces.dir2 === 'right' ? forces.f2 : -forces.f2);
    let fFrictionActual = 0;

    if (Math.abs(box.velocity) < 0.05) { 
        if (Math.abs(fApp) <= frictionLimit) {
            fFrictionActual = -fApp; 
        } else {
            fFrictionActual = -Math.sign(fApp) * frictionLimit;
        }
    } else {
        fFrictionActual = -Math.sign(box.velocity) * frictionLimit;
    }
    
    let netForce = fApp + fFrictionActual;

    if (Math.abs(box.velocity) > 0) {
        let nextVel = box.velocity + (netForce / box.mass) * dt;
        if (Math.sign(box.velocity) !== Math.sign(nextVel) && fApp === 0) {
            box.velocity = 0;
            netForce = 0;
        }
    }
    
    if (Math.abs(box.velocity) < 0.05 && netForce === 0) {
        box.velocity = 0;
    }

    box.acceleration = netForce / box.mass;
    box.velocity += box.acceleration * dt;
    box.x += box.velocity * dt;
    
    let isCar = (scenarioSelect.value === 'konstan' || (scenarioSelect.value === 'custom' && customObject.value === 'car'));
    
    if (!isCar) {
        const maxDistance = Math.floor((canvas.width / 2) / SCALE - (box.width / 2));
        if (box.x >= maxDistance) {
            box.x = maxDistance;
            isPlaying = false; 
            btnPlayPause.textContent = 'Mulai Simulasi';
            btnPlayPause.style.backgroundColor = '';
        } else if (box.x <= -maxDistance) {
            box.x = -maxDistance;
            isPlaying = false; 
            btnPlayPause.textContent = 'Mulai Simulasi';
            btnPlayPause.style.backgroundColor = '';
        }
    }
    
    elapsedTime += dt;
    
    netForceValue.textContent = netForce.toFixed(1);
    velValue.textContent = box.velocity.toFixed(2);
    timeValue.textContent = elapsedTime.toFixed(2);
    
    updateStatusMessage(netForce);
}

function updateStatusMessage(netForce) {
    if (Math.abs(box.velocity) < 0.01 && netForce === 0) {
        statusMessage.textContent = "Benda Diam (Resultan Gaya = 0)";
        statusMessage.style.borderColor = "rgba(255, 255, 255, 0.1)";
        conclusionText.textContent = "Sesuai Hukum I Newton: Benda yang diam akan tetap diam karena Resultan Gaya = 0.";
    } else if (Math.abs(box.velocity) >= 0.01 && netForce === 0) {
        statusMessage.textContent = "Benda Bergerak Kecepatan Konstan (Resultan Gaya = 0)";
        statusMessage.style.borderColor = "#10b981";
        conclusionText.textContent = "Sesuai Hukum I Newton: Benda yang bergerak akan terus bergerak dengan kecepatan konstan karena Resultan Gaya = 0.";
    } else {
        statusMessage.textContent = "Benda Mengalami Percepatan (Resultan Gaya ≠ 0)";
        statusMessage.style.borderColor = "#3b82f6";
        conclusionText.textContent = "Resultan Gaya tidak nol menyebabkan benda berubah gerak (dipercepat/diperlambat).";
    }
}

function drawPerson(x, y, actionDir, faceDir, color) {
    ctx.fillStyle = color;
    
    // Head
    ctx.beginPath();
    ctx.arc(x, y - 40, 15, 0, Math.PI * 2);
    ctx.fill();
    
    // Body
    ctx.fillRect(x - 5, y - 25, 10, 30);
    
    // Arms
    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.strokeStyle = color;
    ctx.moveTo(x, y - 15);
    
    const armTargetX = actionDir === 'right' ? x + 30 : x - 30;
    ctx.lineTo(armTargetX, y - 5);
    ctx.stroke();
    
    // Legs
    ctx.beginPath();
    ctx.moveTo(x, y + 5);
    ctx.lineTo(x - 10, y + 25);
    ctx.moveTo(x, y + 5);
    ctx.lineTo(x + 10, y + 25);
    ctx.stroke();
}

function drawTable(x, y, w, h) {
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(x - w/2, y + h/2, w, 15);
    ctx.fillRect(x - w/2 + 10, y + h/2 + 15, 10, h/2 - 15);
    ctx.fillRect(x + w/2 - 20, y + h/2 + 15, 10, h/2 - 15);
}

function drawCar(x, y, w, h) {
    // Car Body
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.roundRect(x - w/2, y + h/2.5, w, h/2.5, 10);
    ctx.fill();
    
    // Cabin
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.roundRect(x - w/4, y + h/6, w/2, h/3, [20, 20, 0, 0]);
    ctx.fill();
    
    // Windows
    ctx.fillStyle = '#bae6fd'; // Light blue glass
    ctx.fillRect(x - w/4 + 10, y + h/6 + 10, w/4 - 15, h/3 - 10); // Left window
    ctx.fillRect(x + 5, y + h/6 + 10, w/4 - 15, h/3 - 10); // Right window
    
    // Headlights
    ctx.fillStyle = '#fde047'; // Yellow light
    ctx.beginPath();
    // Assuming car faces right if velocity > 0, else just default to right
    let facing = box.velocity >= 0 ? 1 : -1;
    if (facing > 0) {
        ctx.arc(x + w/2 - 5, y + h/2.5 + 15, 8, 0, Math.PI*2);
    } else {
        ctx.arc(x - w/2 + 5, y + h/2.5 + 15, 8, 0, Math.PI*2);
    }
    ctx.fill();

    // Wheels
    const drawWheel = (wx, wy) => {
        ctx.fillStyle = '#0f172a';
        ctx.beginPath();
        ctx.arc(wx, wy, 20, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#cbd5e1'; // Rim
        ctx.beginPath();
        ctx.arc(wx, wy, 10, 0, Math.PI * 2);
        ctx.fill();
    };
    
    drawWheel(x - w/3, y + h - 10);
    drawWheel(x + w/3, y + h - 10);
}

function drawScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 + 80;
    
    let isCar = (scenarioSelect.value === 'konstan' || (scenarioSelect.value === 'custom' && customObject.value === 'car'));

    // Draw Floor with some perspective/road marks if car
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvas.width, centerY);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#475569';
    ctx.stroke();
    
    if (isCar) {
        // Efek jalan bergerak (kamera mengikuti mobil)
        ctx.beginPath();
        ctx.setLineDash([40, 30]);
        ctx.lineDashOffset = box.x * SCALE; // Animasi jalan bergerak berlawanan dengan arah mobil
        ctx.moveTo(0, centerY + 15);
        ctx.lineTo(canvas.width, centerY + 15);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#cbd5e1';
        ctx.stroke();
        ctx.setLineDash([]);
    } else if (scenarioSelect.value === 'searah' || scenarioSelect.value === 'berlawanan' || scenarioSelect.value === 'gesekan') {
        // Draw distance markers with clean integers
        const maxDist = Math.floor((canvas.width / 2) / SCALE - (box.width / 2));
        ctx.fillStyle = '#e2e8f0';
        ctx.font = 'bold 13px Inter, sans-serif';
        ctx.textAlign = 'center';

        const drawMarker = (xPos, label) => {
            ctx.beginPath();
            ctx.moveTo(xPos, centerY + 5);
            ctx.lineTo(xPos, centerY + 20);
            ctx.lineWidth = 4;
            ctx.strokeStyle = '#f59e0b'; // Orange marker
            ctx.stroke();
            ctx.fillText(label, xPos, centerY + 40);
        };

        drawMarker(centerX, "Start (0 m)");
        drawMarker(centerX + maxDist * SCALE, `${maxDist} m`);
        drawMarker(centerX - maxDist * SCALE, `-${maxDist} m`);
    }
    
    const boxPixelX = isCar ? centerX : centerX + box.x * SCALE;
    const boxPixelY = centerY - box.height * SCALE;
    const boxPixelW = box.width * SCALE;
    const boxPixelH = box.height * SCALE;
    
    const forces = getEffectiveForces();
    const scenario = scenarioSelect.value;
    
    // Determine which object to draw based on scenario OR custom object choice
    let drawShape = 'box';
    if (scenario === 'searah' || scenario === 'berlawanan' || scenario === 'gesekan') drawShape = 'table';
    else if (scenario === 'konstan') drawShape = 'car';
    else if (scenario === 'tariktambang') drawShape = 'rope';
    else if (scenario === 'custom') drawShape = customObject.value;
    
    if (drawShape === 'table') {
        drawTable(boxPixelX, boxPixelY, boxPixelW, boxPixelH);
    } else if (drawShape === 'car') {
        drawCar(boxPixelX, boxPixelY, boxPixelW, boxPixelH);
    } else if (drawShape === 'rope') {
        ctx.strokeStyle = '#d4d4d8';
        ctx.lineWidth = 10;
        ctx.beginPath();
        // Super long rope
        ctx.moveTo(boxPixelX - boxPixelW * 3, boxPixelY + boxPixelH/2);
        ctx.lineTo(boxPixelX + boxPixelW * 3, boxPixelY + boxPixelH/2);
        ctx.stroke();
        
        // Knot at center
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(boxPixelX, boxPixelY + boxPixelH/2, 12, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(boxPixelX - boxPixelW/2, boxPixelY, boxPixelW, boxPixelH);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 4;
        ctx.strokeRect(boxPixelX - boxPixelW/2, boxPixelY, boxPixelW, boxPixelH);
    }
    
    // Draw People (Avatars)
    let personY = centerY - 25;
    
    if (scenario === 'tariktambang') {
        const numLeft = parseInt(numPeopleLeftInput.value) || 0;
        const numRight = parseInt(numPeopleRightInput.value) || 0;
        
        // Draw people on the left (pulling left, facing right towards the knot)
        for(let i=0; i<numLeft; i++) {
            drawPerson(boxPixelX - 50 - (i * 40), personY, 'right', 'right', '#ef4444'); 
        }
        
        // Draw people on the right (pulling right, facing left towards the knot)
        for(let i=0; i<numRight; i++) {
            drawPerson(boxPixelX + 50 + (i * 40), personY, 'left', 'left', '#10b981'); 
        }

    } else if (scenario !== 'konstan' && !(scenario === 'custom' && customObject.value === 'car')) { 
        if (forces.f1 > 0) {
            if (forces.dir1 === 'right') {
                drawPerson(boxPixelX - boxPixelW/2 - 30, personY, 'right', 'right', '#ef4444');
            } else {
                drawPerson(boxPixelX + boxPixelW/2 + 30, personY, 'left', 'left', '#ef4444');
            }
        }
        
        if (forces.f2 > 0) {
            if (forces.dir2 === 'right') {
                drawPerson(boxPixelX - boxPixelW/2 - 70, personY, 'right', 'right', '#10b981'); 
            } else {
                drawPerson(boxPixelX + boxPixelW/2 + 70, personY, 'left', 'left', '#10b981');
            }
        }
    }

    // Label Mass ditaruh di tempat yang aman (tidak tumpang tindih)
    ctx.fillStyle = 'white';
    ctx.font = 'bold 18px Inter, sans-serif';
    ctx.textAlign = 'center';
    
    // Tambahkan bayangan agar teks massa menonjol
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 4;
    
    if (scenario === 'tariktambang' || drawShape === 'rope') {
        ctx.fillText(`${box.mass} kg`, boxPixelX, boxPixelY + boxPixelH/2 - 25);
    } else if (scenario === 'konstan' || drawShape === 'car') {
        ctx.fillText(`${box.mass} kg`, boxPixelX, boxPixelY + boxPixelH/4 - 10);
    } else if (scenario === 'searah' || scenario === 'berlawanan' || scenario === 'gesekan' || drawShape === 'table') {
        ctx.fillText(`${box.mass} kg`, boxPixelX, boxPixelY + boxPixelH/2 - 10);
    } else {
        ctx.fillText(`${box.mass} kg`, boxPixelX, boxPixelY + boxPixelH/2);
    }
    
    ctx.shadowBlur = 0; // Reset bayangan
    
    // Forces Vectors (Disusun lebih rendah dan rapat agar tidak nabrak panel atas)
    let yForceBase = boxPixelY - 30; 
    
    if (forces.f1 > 0) {
        let xStart = forces.dir1 === 'right' ? boxPixelX - boxPixelW/2 : boxPixelX + boxPixelW/2;
        if (scenario === 'tariktambang') xStart = boxPixelX;
        drawArrow(xStart, yForceBase, forces.f1 * PIXELS_PER_NEWTON, forces.dir1, '#ef4444', `Aksi 1: ${forces.f1}N`);
    }
    
    if (forces.f2 > 0) {
        let xStart = forces.dir2 === 'right' ? boxPixelX - boxPixelW/2 : boxPixelX + boxPixelW/2;
        if (scenario === 'tariktambang') xStart = boxPixelX;
        drawArrow(xStart, yForceBase - 40, forces.f2 * PIXELS_PER_NEWTON, forces.dir2, '#10b981', `Aksi 2: ${forces.f2}N`);
    }
    
    // Net Force (Paling atas)
    let netForce = parseFloat(netForceValue.textContent);
    
    if (Math.abs(netForce) > 0) {
        const dir = netForce > 0 ? 'right' : 'left';
        drawArrow(boxPixelX, yForceBase - 80, Math.abs(netForce) * PIXELS_PER_NEWTON, dir, '#f59e0b', `ΣF: ${Math.abs(netForce).toFixed(1)} N`);
    }
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

// Event Listeners
btnPlayPause.addEventListener('click', () => {
    isPlaying = !isPlaying;
    btnPlayPause.textContent = isPlaying ? 'Jeda Simulasi' : 'Mulai Simulasi';
    btnPlayPause.classList.toggle('primary', !isPlaying);
    btnPlayPause.style.backgroundColor = isPlaying ? '#f59e0b' : '';
});

function resetSim() {
    box.x = 0;
    box.velocity = 0;
    box.acceleration = 0;
    elapsedTime = 0;
    isPlaying = false;
    btnPlayPause.textContent = 'Mulai Simulasi';
    btnPlayPause.style.backgroundColor = '';
    
    velValue.textContent = '0.00';
    netForceValue.textContent = '0';
    timeValue.textContent = '0.00';
    
    updateStatusMessage(0);
    drawScene();
}

btnReset.addEventListener('click', resetSim);

scenarioSelect.addEventListener('change', (e) => {
    resetSim();
    
    if (e.target.value === 'tariktambang') {
        genericControls.style.display = 'none';
        tarikTambangControls.style.display = 'block';
        customControls.style.display = 'none';
    } else if (e.target.value === 'custom') {
        genericControls.style.display = 'block';
        tarikTambangControls.style.display = 'none';
        customControls.style.display = 'block';
    } else {
        genericControls.style.display = 'block';
        tarikTambangControls.style.display = 'none';
        customControls.style.display = 'none';
    }

    switch(e.target.value) {
        case 'searah':
            force1Input.value = 100; dir1Select.value = 'right';
            force2Input.value = 50; dir2Select.value = 'right';
            frictionForceInput.value = 0;
            break;
        case 'berlawanan':
            force1Input.value = 100; dir1Select.value = 'right';
            force2Input.value = 100; dir2Select.value = 'left';
            frictionForceInput.value = 0;
            break;
        case 'tariktambang':
            numPeopleLeftInput.value = 3;
            numPeopleRightInput.value = 3;
            frictionForceInput.value = 0;
            break;
        case 'gesekan':
            force1Input.value = 100; dir1Select.value = 'right';
            force2Input.value = 0;
            frictionForceInput.value = 150;
            break;
        case 'konstan':
            force1Input.value = 0;
            force2Input.value = 0;
            frictionForceInput.value = 0;
            box.velocity = 2; // Initial velocity
            break;
    }
    drawScene();
});

[force1Input, force2Input, frictionForceInput, massInput, numPeopleLeftInput, numPeopleRightInput].forEach(el => {
    el.addEventListener('input', () => {
        if (!isPlaying) drawScene();
    });
});

[dir1Select, dir2Select].forEach(el => {
    el.addEventListener('change', () => {
        if (!isPlaying) drawScene();
    });
});

btnSetVelocity.addEventListener('click', () => {
    box.velocity = parseFloat(customVelocity.value) || 0;
    velValue.textContent = box.velocity.toFixed(2);
    if (!isPlaying) drawScene();
});

customObject.addEventListener('change', () => {
    if (!isPlaying) drawScene();
});

if(tabP2) {
    tabP2.addEventListener('click', () => {
        alert("Modul Pertemuan 2 (Hukum II & III Newton) sedang dikunci. Silakan selesaikan Pertemuan 1 terlebih dahulu!");
    });
}

// Init
scenarioSelect.value = 'searah';
scenarioSelect.dispatchEvent(new Event('change'));

requestAnimationFrame(simulationLoop);
