const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

// UI Elements
const btnPlayPause = document.getElementById('btnPlayPause');
const btnReset = document.getElementById('btnReset');

const scenarioSelect = document.getElementById('scenarioSelect');

const trolleyControls = document.getElementById('trolleyControls');
const trolleyMassSelect = document.getElementById('trolleyMassSelect');
const trolleyForce = document.getElementById('trolleyForce');

const rocketControls = document.getElementById('rocketControls');
const rocketThrust = document.getElementById('rocketThrust');
const btnLaunch = document.getElementById('btnLaunch');

const brakingControls = document.getElementById('brakingControls');
const carSpeed = document.getElementById('carSpeed');
const btnBrake = document.getElementById('btnBrake');

const raceControls = document.getElementById('raceControls');
const raceForce = document.getElementById('raceForce');

const tugOfWarControls = document.getElementById('tugOfWarControls');
const tugLeftForce = document.getElementById('tugLeftForce');
const tugRightForce = document.getElementById('tugRightForce');

const speedBar = document.getElementById('speedBar');

const velValue = document.getElementById('velValue');
const netForceValue = document.getElementById('netForceValue');
const accelValue = document.getElementById('accelValue');
const timeValue = document.getElementById('timeValue');
const statusMessage = document.getElementById('statusMessage');

// State
let isPlaying = false;
let lastTime = 0;
let elapsedTime = 0;

let currentScenario = 'trolley';
const GRAVITY = 10;
const SCALE = 50; // pixels per meter

// Objects
const trolley = { x: 0, y: 0, v: 0, a: 0, mass: 10 };
const rocket = { y: 0, v: 0, a: 0, mass: 100, thrusting: false };
const car = { x: 0, v: 0, braking: false };
const boxOnCar = { x: 0, v: 0, a: 0, mass: 50 };

const carRace = { x: 0, v: 0, a: 0, mass: 1000 };
const truckRace = { x: 0, v: 0, a: 0, mass: 5000 };
const tugBox = { x: 0, v: 0, a: 0, mass: 50 };
let particles = [];

function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function drawArrow(x, y, length, direction, color, label, isVertical = false) {
    if (length === 0) return;
    
    const arrowWidth = 8;
    const arrowHeadSize = 12;
    const actualLength = Math.max(20, Math.abs(length));
    const sign = direction === 'positive' ? 1 : -1;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    
    if (isVertical) {
        ctx.lineTo(x, y - sign * Math.max(1, actualLength - arrowHeadSize));
    } else {
        ctx.lineTo(x + sign * Math.max(1, actualLength - arrowHeadSize), y);
    }
    
    ctx.lineWidth = arrowWidth;
    ctx.strokeStyle = color;
    ctx.stroke();
    
    ctx.beginPath();
    if (isVertical) {
        ctx.moveTo(x - arrowHeadSize/2, y - sign * Math.max(1, actualLength - arrowHeadSize));
        ctx.lineTo(x + arrowHeadSize/2, y - sign * Math.max(1, actualLength - arrowHeadSize));
        ctx.lineTo(x, y - sign * actualLength);
    } else {
        ctx.moveTo(x + sign * Math.max(1, actualLength - arrowHeadSize), y - arrowHeadSize/2);
        ctx.lineTo(x + sign * actualLength, y);
        ctx.lineTo(x + sign * Math.max(1, actualLength - arrowHeadSize), y + arrowHeadSize/2);
    }
    
    ctx.fillStyle = color;
    ctx.fill();
    
    ctx.fillStyle = color;
    ctx.font = '14px Inter, sans-serif';
    ctx.fontWeight = 'bold';
    ctx.textAlign = 'center';
    
    if (isVertical) {
        ctx.fillText(label, x + 35, y - sign * (actualLength / 2));
    } else {
        ctx.fillText(label, x + sign * (actualLength / 2), y - arrowHeadSize - 5);
    }
}

function updatePhysics(dt) {
    if (!isPlaying) return;

    if (currentScenario === 'trolley') {
        const force = parseFloat(trolleyForce.value) || 0;
        trolley.mass = parseFloat(trolleyMassSelect.value) || 10;
        
        trolley.a = force / trolley.mass;
        trolley.v += trolley.a * dt;
        trolley.x += trolley.v * dt;
        
        netForceValue.textContent = force.toFixed(1);
        accelValue.textContent = trolley.a.toFixed(2);
        velValue.textContent = trolley.v.toFixed(2);
        updateStatusMessage(force > 0 ? `Troli dipercepat (a = ${trolley.a.toFixed(2)} m/s²)` : "Troli Diam");

    } else if (currentScenario === 'rocket') {
        const thrust = rocket.thrusting ? (parseFloat(rocketThrust.value) || 0) : 0;
        const weight = rocket.mass * GRAVITY; // 1000 N
        
        let netForce = thrust > 0 ? (thrust - weight) : (rocket.y > 0 ? -weight : 0);
        
        // Prevent falling through ground
        if (rocket.y <= 0 && netForce < 0) {
            netForce = 0;
            rocket.v = 0;
            rocket.y = 0;
        }

        rocket.a = netForce / rocket.mass;
        rocket.v += rocket.a * dt;
        rocket.y += rocket.v * dt;

        if (rocket.y < 0) {
            rocket.y = 0;
            rocket.v = 0;
            rocket.a = 0;
        }

        netForceValue.textContent = Math.abs(netForce).toFixed(1);
        accelValue.textContent = rocket.a.toFixed(2);
        velValue.textContent = rocket.v.toFixed(2);
        updateStatusMessage(rocket.a > 0 ? "Roket Meluncur Naik!" : (rocket.y > 0 ? "Roket Jatuh" : "Roket di Landasan"));

    } else if (currentScenario === 'braking') {
        // Car logic
        if (car.braking) {
            car.v -= 40 * dt; // High deceleration
            if (car.v < 0) car.v = 0;
        }
        car.x += car.v * dt;

        // Box logic (friction from car roof)
        // If box is moving faster than car, friction slows it down relative to ground
        let frictionForce = 0;
        const mu = 0.2;
        const maxFriction = mu * boxOnCar.mass * GRAVITY; // 0.2 * 50 * 10 = 100 N
        
        if (boxOnCar.v > car.v) {
            frictionForce = -maxFriction;
        } else if (boxOnCar.v < car.v) {
            frictionForce = maxFriction;
        }
        
        boxOnCar.a = frictionForce / boxOnCar.mass;
        boxOnCar.v += boxOnCar.a * dt;
        boxOnCar.x += boxOnCar.v * dt;

        // Cap to car speed if it catches up
        if (!car.braking) {
             boxOnCar.v = car.v;
             boxOnCar.x = car.x;
             boxOnCar.a = 0;
        }

        netForceValue.textContent = Math.abs(frictionForce).toFixed(1);
        accelValue.textContent = boxOnCar.a.toFixed(2);
        velValue.textContent = boxOnCar.v.toFixed(2);
        updateStatusMessage(car.braking ? "Mobil Direm! Kotak terdorong ke depan karena Inersia." : "Mobil Melaju Konstan");
    } else if (currentScenario === 'race') {
        const force = parseFloat(raceForce.value) || 0;
        
        carRace.a = force / carRace.mass;
        truckRace.a = force / truckRace.mass;
        
        carRace.v += carRace.a * dt;
        truckRace.v += truckRace.a * dt;
        
        carRace.x += carRace.v * dt;
        truckRace.x += truckRace.v * dt;
        
        if (force > 0 && Math.random() > 0.5) {
            particles.push({x: carRace.x * SCALE - 50, y: 0, vx: -Math.random()*20, life: 1});
        }
        
        netForceValue.textContent = force.toFixed(1);
        accelValue.textContent = carRace.a.toFixed(2) + " (Mobil)";
        velValue.textContent = carRace.v.toFixed(2);
        
        let maxSpeed = 50; 
        if(speedBar) speedBar.style.width = Math.min(100, (carRace.v / maxSpeed) * 100) + '%';
        
        updateStatusMessage(`Mobil sport jauh lebih cepat! a(mobil)=${carRace.a.toFixed(2)} vs a(truk)=${truckRace.a.toFixed(2)}`);
        
    } else if (currentScenario === 'tugofwar') {
        const leftF = parseFloat(tugLeftForce.value) || 0;
        const rightF = parseFloat(tugRightForce.value) || 0;
        
        const netForce = rightF - leftF;
        tugBox.a = netForce / tugBox.mass;
        tugBox.v += tugBox.a * dt;
        tugBox.x += tugBox.v * dt;
        
        netForceValue.textContent = netForce.toFixed(1);
        accelValue.textContent = tugBox.a.toFixed(2);
        velValue.textContent = Math.abs(tugBox.v).toFixed(2);
        
        if(speedBar) speedBar.style.width = Math.min(100, (Math.abs(tugBox.v) / 20) * 100) + '%';
        
        if (netForce > 0) updateStatusMessage("Benda Tertarik ke Kanan!");
        else if (netForce < 0) updateStatusMessage("Benda Tertarik ke Kiri!");
        else updateStatusMessage("Seimbang! (Resultan = 0)");
    }

    elapsedTime += dt;
    timeValue.textContent = elapsedTime.toFixed(2);
}

function updateStatusMessage(msg) {
    statusMessage.textContent = msg;
    statusMessage.style.backgroundColor = "rgba(0,0,0,0.8)";
}

function drawTrolley(x, y, isFull) {
    ctx.save();
    ctx.translate(x, y);
    
    // Wheels
    ctx.fillStyle = '#334155';
    ctx.beginPath(); ctx.arc(-30, 0, 10, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(30, 0, 10, 0, Math.PI*2); ctx.fill();
    
    // Basket
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-40, -10);
    ctx.lineTo(40, -10);
    ctx.lineTo(50, -60);
    ctx.lineTo(-50, -60);
    ctx.closePath();
    ctx.stroke();

    // Handle
    ctx.beginPath();
    ctx.moveTo(-50, -60);
    ctx.lineTo(-65, -80);
    ctx.stroke();

    if (isFull) {
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-35, -55, 30, 40);
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(0, -45, 30, 30);
        ctx.fillStyle = '#10b981';
        ctx.fillRect(-10, -50, 20, 35);
    }
    
    ctx.restore();
}

function drawPersonPushing(x, y) {
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    
    // Head
    ctx.beginPath(); ctx.arc(x, y - 80, 15, 0, Math.PI*2); ctx.stroke();
    // Body
    ctx.beginPath(); ctx.moveTo(x, y - 65); ctx.lineTo(x + 10, y - 30); ctx.stroke();
    // Legs
    ctx.beginPath(); ctx.moveTo(x + 10, y - 30); ctx.lineTo(x - 10, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 10, y - 30); ctx.lineTo(x + 25, y); ctx.stroke();
    // Arms
    ctx.beginPath(); ctx.moveTo(x + 5, y - 55); ctx.lineTo(x + 35, y - 50); ctx.stroke();
}

function drawRocketObj(x, y, thrusting) {
    ctx.save();
    ctx.translate(x, y);
    
    // Body
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(-20, -80, 40, 80);
    
    // Nose
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-20, -80);
    ctx.lineTo(0, -120);
    ctx.lineTo(20, -80);
    ctx.fill();
    
    // Fins
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath(); ctx.moveTo(-20, -20); ctx.lineTo(-40, 0); ctx.lineTo(-20, 0); ctx.fill();
    ctx.beginPath(); ctx.moveTo(20, -20); ctx.lineTo(40, 0); ctx.lineTo(20, 0); ctx.fill();

    // Fire
    if (thrusting) {
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(-15, 0);
        ctx.lineTo(0, 40 + Math.random()*20);
        ctx.lineTo(15, 0);
        ctx.fill();
    }
    
    ctx.restore();
}

function drawCarObj(x, y) {
    ctx.save();
    ctx.translate(x, y);
    
    // Tires
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.arc(-40, 0, 15, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(40, 0, 15, 0, Math.PI*2); ctx.fill();
    
    // Body
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.roundRect(-70, -30, 140, 30, 5);
    ctx.fill();
    
    // Cabin
    ctx.fillStyle = '#93c5fd';
    ctx.beginPath();
    ctx.roundRect(-30, -60, 60, 30, 5);
    ctx.fill();
    
    ctx.restore();
}

function drawSportsCar(x, y) {
    ctx.save();
    ctx.translate(x, y);
    // Tires
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.arc(-25, 0, 10, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(25, 0, 10, 0, Math.PI*2); ctx.fill();
    // Body (Sleek red)
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-40, -10);
    ctx.lineTo(40, -10);
    ctx.lineTo(30, -25);
    ctx.lineTo(-20, -25);
    ctx.fill();
    ctx.restore();
}

function drawTruckObj(x, y) {
    ctx.save();
    ctx.translate(x, y);
    // Tires
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.arc(-40, 0, 12, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(40, 0, 12, 0, Math.PI*2); ctx.fill();
    // Cabin
    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(20, -50, 30, 40);
    // Cargo
    ctx.fillStyle = '#64748b';
    ctx.fillRect(-50, -60, 70, 50);
    ctx.restore();
}

function drawTugBox(x, y) {
    ctx.fillStyle = '#8b5cf6';
    ctx.fillRect(x - 30, y - 60, 60, 60);
    ctx.fillStyle = 'white';
    ctx.font = '20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText("50kg", x, y - 25);
}

function drawScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const groundY = canvas.height - 50;
    
    // Draw Ground
    ctx.fillStyle = '#475569';
    ctx.fillRect(0, groundY, canvas.width, 50);
    
    if (currentScenario === 'trolley') {
        const isFull = trolleyMassSelect.value === "100";
        const pixelX = canvas.width/2 - 100 + (trolley.x * SCALE);
        
        drawTrolley(pixelX, groundY - 10, isFull);
        
        const force = parseFloat(trolleyForce.value) || 0;
        if (force > 0) {
            drawPersonPushing(pixelX - 100, groundY);
            drawArrow(pixelX - 60, groundY - 50, force * 0.5, 'positive', '#ef4444', `Dorong: ${force}N`);
        }
    } 
    else if (currentScenario === 'rocket') {
        const pixelY = groundY - (rocket.y * SCALE);
        const pixelX = canvas.width / 2;
        
        drawRocketObj(pixelX, pixelY, rocket.thrusting);
        
        // Draw forces
        const thrust = rocket.thrusting ? (parseFloat(rocketThrust.value) || 0) : 0;
        const weight = 1000;
        
        if (thrust > 0) {
            // Aksi (Gas buang ke bawah)
            drawArrow(pixelX - 40, pixelY + 20, thrust * 0.1, 'negative', '#ef4444', `Aksi (Gas): ${thrust}N`, true);
            // Reaksi (Roket ke atas)
            drawArrow(pixelX + 40, pixelY - 60, thrust * 0.1, 'positive', '#3b82f6', `Reaksi (Roket): ${thrust}N`, true);
        }
        
        // Weight
        drawArrow(pixelX, pixelY - 20, weight * 0.1, 'negative', '#10b981', `Berat: ${weight}N`, true);
        
    } 
    else if (currentScenario === 'braking') {
        const pixelXCar = canvas.width/2 - 100 + (car.x * SCALE);
        const pixelXBox = canvas.width/2 - 100 + (boxOnCar.x * SCALE);
        
        drawCarObj(pixelXCar, groundY - 15);
        
        // Box on top
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(pixelXBox - 20, groundY - 15 - 60 - 30, 40, 30);
        
        if (car.braking && boxOnCar.v > car.v) {
            // Draw inertia arrow
            drawArrow(pixelXBox, groundY - 120, 50, 'positive', '#ef4444', 'Inersia');
        }
    } else if (currentScenario === 'race') {
        // Draw track lines
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(0, groundY - 80, canvas.width, 2);
        
        const pCarX = canvas.width/4 - 100 + (carRace.x * SCALE);
        const pTruckX = canvas.width/4 - 100 + (truckRace.x * SCALE);
        
        drawSportsCar(pCarX, groundY - 15);
        drawTruckObj(pTruckX, groundY - 95);
        
        // Draw Particles
        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            p.x += p.vx;
            p.life -= 0.05;
            if (p.life <= 0) {
                particles.splice(i, 1);
            } else {
                ctx.fillStyle = `rgba(200, 200, 200, ${p.life})`;
                ctx.beginPath(); ctx.arc(canvas.width/4 - 100 + p.x, groundY - 5, 8, 0, Math.PI*2); ctx.fill();
            }
        }
    } else if (currentScenario === 'tugofwar') {
        const pBoxX = canvas.width/2 + (tugBox.x * SCALE);
        drawTugBox(pBoxX, groundY);
        
        const leftF = parseFloat(tugLeftForce.value) || 0;
        const rightF = parseFloat(tugRightForce.value) || 0;
        
        drawPersonPushing(pBoxX - 80, groundY); // Kiri
        drawPersonPushing(pBoxX + 80, groundY); // Kanan
        
        // Tali
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(pBoxX - 70, groundY - 40); ctx.lineTo(pBoxX - 30, groundY - 40); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(pBoxX + 30, groundY - 40); ctx.lineTo(pBoxX + 70, groundY - 40); ctx.stroke();
        
        drawArrow(pBoxX - 60, groundY - 80, leftF * 0.3, 'negative', '#ef4444', `${leftF}N`);
        drawArrow(pBoxX + 60, groundY - 80, rightF * 0.3, 'positive', '#3b82f6', `${rightF}N`);
        
        let netForce = rightF - leftF;
        if (netForce !== 0) {
            drawArrow(pBoxX, groundY - 120, Math.abs(netForce) * 0.3, netForce > 0 ? 'positive' : 'negative', '#10b981', `ΣF=${Math.abs(netForce)}N`);
        }
    }

    if (isPlaying) {
        requestAnimationFrame(simulationLoop);
    }
}

function simulationLoop(timestamp) {
    if (!isPlaying) return;
    if (lastTime === 0) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    updatePhysics(dt);
    drawScene();
}

function resetSim() {
    isPlaying = false;
    btnPlayPause.innerHTML = '▶ Mulai Simulasi';
    lastTime = 0;
    elapsedTime = 0;

    trolley.x = 0; trolley.v = 0; trolley.a = 0;
    rocket.y = 0; rocket.v = 0; rocket.a = 0; rocket.thrusting = false;
    car.x = 0; car.braking = false;
    car.v = parseFloat(carSpeed.value) || 15;
    boxOnCar.x = 0; boxOnCar.v = car.v; boxOnCar.a = 0;
    
    carRace.x = 0; carRace.v = 0; carRace.a = 0;
    truckRace.x = 0; truckRace.v = 0; truckRace.a = 0;
    tugBox.x = 0; tugBox.v = 0; tugBox.a = 0;
    particles = [];
    if(speedBar) speedBar.style.width = '0%';

    velValue.textContent = '0.00';
    netForceValue.textContent = '0';
    accelValue.textContent = '0.00';
    timeValue.textContent = '0.00';
    updateStatusMessage("Siap");
    
    drawScene();
}

btnPlayPause.addEventListener('click', () => {
    isPlaying = !isPlaying;
    if (isPlaying) {
        btnPlayPause.innerHTML = '⏸ Jeda';
        lastTime = performance.now();
        requestAnimationFrame(simulationLoop);
    } else {
        btnPlayPause.innerHTML = '▶ Lanjut';
    }
});

btnReset.addEventListener('click', resetSim);

scenarioSelect.addEventListener('change', (e) => {
    currentScenario = e.target.value;
    
    trolleyControls.style.display = currentScenario === 'trolley' ? 'block' : 'none';
    rocketControls.style.display = currentScenario === 'rocket' ? 'block' : 'none';
    brakingControls.style.display = currentScenario === 'braking' ? 'block' : 'none';
    raceControls.style.display = currentScenario === 'race' ? 'block' : 'none';
    tugOfWarControls.style.display = currentScenario === 'tugofwar' ? 'block' : 'none';
    
    resetSim();
});

btnLaunch.addEventListener('mousedown', () => { rocket.thrusting = true; if(!isPlaying) btnPlayPause.click(); });
btnLaunch.addEventListener('mouseup', () => { rocket.thrusting = false; });
btnLaunch.addEventListener('mouseleave', () => { rocket.thrusting = false; });

btnBrake.addEventListener('click', () => {
    car.braking = true;
    if(!isPlaying) btnPlayPause.click();
});

[trolleyMassSelect, trolleyForce, rocketThrust, carSpeed, raceForce, tugLeftForce, tugRightForce].forEach(el => {
    el.addEventListener('input', () => { if (!isPlaying) resetSim(); });
});

// Init
scenarioSelect.dispatchEvent(new Event('change'));
