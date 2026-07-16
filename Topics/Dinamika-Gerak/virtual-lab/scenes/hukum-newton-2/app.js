// --- INIT MATTER.JS ---
const Engine = Matter.Engine,
      World = Matter.World,
      Bodies = Matter.Bodies,
      Body = Matter.Body,
      Composite = Matter.Composite,
      Events = Matter.Events,
      Mouse = Matter.Mouse,
      MouseConstraint = Matter.MouseConstraint;

const engine = Engine.create();
const world = engine.world;
engine.gravity.y = 1; // 1 scale gravity

const canvas = document.getElementById('simCanvas');
const ctx = canvas.getContext('2d');

// --- MOUSE INTERACTION ---
const mouse = Mouse.create(canvas);
const mouseConstraint = MouseConstraint.create(engine, {
    mouse: mouse,
    constraint: { stiffness: 0.2, render: { visible: false } }
});
World.add(world, mouseConstraint);

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

const velValue = document.getElementById('velValue');
const netForceValue = document.getElementById('netForceValue');
const accelValue = document.getElementById('accelValue');
const timeValue = document.getElementById('timeValue');
const statusMessage = document.getElementById('statusMessage');

let isPlaying = false;
let lastTime = 0;
let elapsedTime = 0;
let currentScenario = 'trolley';
let particles = [];
let activeBodies = {}; // Store references to Matter bodies

function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    buildScenario(); // Rebuild world on resize
}
window.addEventListener('resize', resizeCanvas);

// --- DRAWING FUNCTIONS (CUSTOM CANVAS) ---
function drawArrow(x, y, length, direction, color, label, isVertical = false) {
    if (Math.abs(length) < 5) return;
    const arrowWidth = 8;
    const arrowHeadSize = 12;
    const actualLength = Math.max(20, Math.abs(length));
    const sign = direction === 'positive' ? 1 : -1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    if (isVertical) ctx.lineTo(x, y - sign * Math.max(1, actualLength - arrowHeadSize));
    else ctx.lineTo(x + sign * Math.max(1, actualLength - arrowHeadSize), y);
    ctx.lineWidth = arrowWidth; ctx.strokeStyle = color; ctx.stroke();
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
    ctx.fillStyle = color; ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 14px Inter, sans-serif'; ctx.textAlign = 'center';
    if (isVertical) ctx.fillText(label, x + 35, y - sign * (actualLength / 2));
    else ctx.fillText(label, x + sign * (actualLength / 2), y - arrowHeadSize - 5);
}

function drawTrolley(x, y, angle, isFull) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.fillStyle = '#1e293b'; // Very dark tire
    ctx.beginPath(); ctx.arc(-30, 20, 10, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(30, 20, 10, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffffff'; // White hub
    ctx.beginPath(); ctx.arc(-30, 20, 4, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(30, 20, 4, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-40, 10); ctx.lineTo(40, 10); ctx.lineTo(50, -40); ctx.lineTo(-50, -40); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-50, -40); ctx.lineTo(-65, -60); ctx.stroke();
    if (isFull) {
        ctx.fillStyle = '#ef4444'; ctx.fillRect(-35, -35, 30, 40);
        ctx.fillStyle = '#3b82f6'; ctx.fillRect(0, -25, 30, 30);
        ctx.fillStyle = '#10b981'; ctx.fillRect(-10, -30, 20, 35);
    }
    ctx.restore();
}

function drawPersonPushing(x, y) {
    ctx.strokeStyle = '#f59e0b'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(x, y - 80, 15, 0, Math.PI*2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 65); ctx.lineTo(x + 10, y - 30); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 10, y - 30); ctx.lineTo(x - 10, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 10, y - 30); ctx.lineTo(x + 25, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 5, y - 55); ctx.lineTo(x + 35, y - 50); ctx.stroke();
}

function drawRocketObj(x, y, angle, thrusting) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    
    // Main Body (White)
    ctx.fillStyle = '#ffffff'; 
    ctx.fillRect(-15, -40, 30, 100); 
    
    // Interstage (Black band)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-15, -10, 30, 10);
    
    // SpaceX Logo (text)
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 9px sans-serif';
    ctx.save();
    ctx.translate(0, 25);
    ctx.rotate(-Math.PI/2);
    ctx.fillText("SPACEX", 0, 3);
    ctx.restore();
    
    // Fairing (Nose Cone - White)
    ctx.fillStyle = '#ffffff'; 
    ctx.beginPath(); 
    ctx.moveTo(-15, -40); 
    ctx.bezierCurveTo(-15, -60, -5, -70, 0, -80);
    ctx.bezierCurveTo(5, -70, 15, -60, 15, -40);
    ctx.fill();
    
    // Landing Legs (Black)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    // Left leg
    ctx.beginPath(); ctx.moveTo(-15, 40); ctx.lineTo(-25, 60); ctx.stroke();
    // Right leg
    ctx.beginPath(); ctx.moveTo(15, 40); ctx.lineTo(25, 60); ctx.stroke();
    
    // Engine bells (Black)
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(-10, 60, 20, 5);

    if (thrusting) {
        // Core flame (White/Yellow)
        ctx.fillStyle = '#fef08a';
        ctx.beginPath(); 
        ctx.moveTo(-12, 65); 
        ctx.lineTo(0, 100 + Math.random()*40); 
        ctx.lineTo(12, 65); 
        ctx.fill();
        
        // Outer flame (Orange)
        ctx.fillStyle = 'rgba(249, 115, 22, 0.6)';
        ctx.beginPath(); 
        ctx.moveTo(-15, 65); 
        ctx.lineTo(0, 120 + Math.random()*50); 
        ctx.lineTo(15, 65); 
        ctx.fill();
    }
    ctx.restore();
}

function drawCarObj(x, y, angle) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.arc(-40, 15, 15, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(40, 15, 15, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-40, 15, 6, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(40, 15, 6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.roundRect(-70, -15, 140, 30, 5); ctx.fill();
    ctx.fillStyle = '#93c5fd'; ctx.beginPath(); ctx.roundRect(-30, -45, 60, 30, 5); ctx.fill();
    ctx.restore();
}

function drawSportsCar(x, y, angle) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.arc(-25, 10, 10, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(25, 10, 10, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(-40, 0); ctx.lineTo(40, 0); ctx.lineTo(30, -15); ctx.lineTo(-20, -15); ctx.fill();
    ctx.restore();
}

function drawTruckObj(x, y, angle) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.fillStyle = '#1e293b';
    ctx.beginPath(); ctx.arc(-40, 15, 12, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 15, 12, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(40, 15, 12, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(-40, 15, 5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 15, 5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(40, 15, 5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#f59e0b'; ctx.fillRect(20, -35, 30, 40);
    ctx.fillStyle = '#64748b'; ctx.fillRect(-50, -45, 70, 50);
    ctx.restore();
}

// --- MATTER.JS SCENARIO BUILDERS ---
function buildScenario() {
    World.clear(world);
    Engine.clear(engine);
    activeBodies = {};
    const groundY = canvas.height - 50;
    
    // Add ground and walls
    const ground = Bodies.rectangle(canvas.width/2, groundY + 25, canvas.width*3, 50, { isStatic: true });
    World.add(world, ground);

    if (currentScenario === 'trolley') {
        const mass = parseFloat(trolleyMassSelect.value) || 10;
        activeBodies.trolley = Bodies.rectangle(canvas.width/2 - 100, groundY - 50, 100, 80, { mass: mass, friction: 0.05, restitution: 0.2 });
        World.add(world, activeBodies.trolley);
    } 
    else if (currentScenario === 'rocket') {
        engine.gravity.y = 1; // Earth gravity
        // Match visual dimensions of the SpaceX rocket perfectly (width 30, height 145)
        activeBodies.rocket = Bodies.rectangle(canvas.width/2, groundY - 72.5, 30, 145, { mass: 100, frictionAir: 0.02, friction: 0.5, restitution: 0 });
        World.add(world, activeBodies.rocket);
        activeBodies.isThrusting = false;
    }
    else if (currentScenario === 'braking') {
        activeBodies.car = Bodies.rectangle(canvas.width/2 - 150, groundY - 30, 140, 60, { mass: 1000, friction: 0.01 });
        activeBodies.box = Bodies.rectangle(canvas.width/2 - 150, groundY - 75, 40, 30, { mass: 50, friction: 0.3 }); // Mu=0.3
        
        let startSpeed = parseFloat(carSpeed.value) || 15;
        // Need to scale speed to Matter.js units (~0.1 of actual meter/s)
        Body.setVelocity(activeBodies.car, { x: startSpeed * 0.5, y: 0 });
        Body.setVelocity(activeBodies.box, { x: startSpeed * 0.5, y: 0 });
        
        World.add(world, [activeBodies.car, activeBodies.box]);
        activeBodies.braking = false;
    }
    else if (currentScenario === 'race') {
        // Track 1 (Truck) - Upper Road platform
        World.add(world, Bodies.rectangle(canvas.width/2, groundY - 70, canvas.width*3, 20, { isStatic: true }));
        
        activeBodies.car = Bodies.rectangle(canvas.width/4 - 100, groundY - 20, 80, 30, { mass: 1000, friction: 0.05, restitution: 0 });
        activeBodies.truck = Bodies.rectangle(canvas.width/4 - 100, groundY - 110, 120, 60, { mass: 5000, friction: 0.05, restitution: 0 });
        World.add(world, [activeBodies.car, activeBodies.truck]);
    }
    
    elapsedTime = 0;
    particles = [];
}

// --- UPDATE & DRAW ---
function updateStatusMessage(msg) {
    statusMessage.textContent = msg;
    statusMessage.style.backgroundColor = "rgba(0,0,0,0.8)";
}

function updatePhysics(dt) {
    if (!isPlaying) return;
    
    // Convert dt (seconds) to milliseconds for Matter.js
    Engine.update(engine, dt * 1000);
    elapsedTime += dt;

    if (currentScenario === 'trolley' && activeBodies.trolley) {
        const force = parseFloat(trolleyForce.value) || 0;
        // applyForce takes a vector. Multiply by a small scale to make it look right.
        Body.applyForce(activeBodies.trolley, activeBodies.trolley.position, { x: force * 0.0001, y: 0 });
        
        const a = force / activeBodies.trolley.mass;
        const v = activeBodies.trolley.velocity.x * 2; // Scale for display
        
        netForceValue.textContent = force.toFixed(1);
        accelValue.textContent = a.toFixed(2);
        velValue.textContent = v.toFixed(2);
        updateStatusMessage(force > 0 ? `Troli dipercepat (a = ${a.toFixed(2)} m/s²)` : "Troli Diam");
    }
    else if (currentScenario === 'rocket' && activeBodies.rocket) {
        const thrust = activeBodies.isThrusting ? (parseFloat(rocketThrust.value) || 0) : 0;
        if (thrust > 0) {
            Body.applyForce(activeBodies.rocket, activeBodies.rocket.position, { x: 0, y: -thrust * 0.0001 });
        }
        
        const weight = activeBodies.rocket.mass * 10;
        let netForce = thrust > 0 ? (thrust - weight) : (activeBodies.rocket.position.y < canvas.height - 100 ? -weight : 0);
        let a = netForce / activeBodies.rocket.mass;
        let v = -activeBodies.rocket.velocity.y * 2;
        
        netForceValue.textContent = Math.abs(netForce).toFixed(1);
        accelValue.textContent = a.toFixed(2);
        velValue.textContent = v.toFixed(2);
        updateStatusMessage(a > 0 ? "Roket Meluncur Naik!" : (v < 0 ? "Roket Jatuh" : "Roket di Landasan"));
    }
    else if (currentScenario === 'braking' && activeBodies.car) {
        if (activeBodies.braking) {
            // Strong braking force backwards
            Body.applyForce(activeBodies.car, activeBodies.car.position, { x: -0.15, y: 0 });
            if (activeBodies.car.velocity.x < 0) {
                Body.setVelocity(activeBodies.car, {x:0, y:0});
                activeBodies.braking = false;
            }
        }
        
        const v = activeBodies.car.velocity.x * 2;
        const vBox = activeBodies.box.velocity.x * 2;
        
        netForceValue.textContent = "-";
        accelValue.textContent = "-";
        velValue.textContent = vBox.toFixed(2);
        updateStatusMessage(activeBodies.braking ? "Mobil Direm! Kotak terdorong (Inersia)." : "Mobil Melaju Konstan");
    }
    else if (currentScenario === 'race' && activeBodies.car) {
        const force = parseFloat(raceForce.value) || 0;
        Body.applyForce(activeBodies.car, activeBodies.car.position, { x: force * 0.00005, y: 0 });
        Body.applyForce(activeBodies.truck, activeBodies.truck.position, { x: force * 0.00005, y: 0 });
        
        if (force > 0 && Math.random() > 0.5) {
            particles.push({x: activeBodies.car.position.x - 40, y: activeBodies.car.position.y + 10, vx: -Math.random()*5, life: 1});
        }
        
        const a_car = force / activeBodies.car.mass;
        const a_truck = force / activeBodies.truck.mass;
        const v = activeBodies.car.velocity.x * 2;
        
        netForceValue.textContent = force.toFixed(1);
        accelValue.textContent = a_car.toFixed(2);
        velValue.textContent = v.toFixed(2);
        
        updateStatusMessage(`a(mobil)=${a_car.toFixed(2)} vs a(truk)=${a_truck.toFixed(2)}`);
    }
    // --- BOUNDARY CHECKS (Auto-Stop) ---
    const checkStop = (body, condition, msg) => {
        if (body && condition) {
            isPlaying = false;
            btnPlayPause.innerHTML = '▶ Mulai Simulasi';
            updateStatusMessage(msg);
            Body.setVelocity(body, {x: 0, y: 0});
        }
    };

    if (currentScenario === 'trolley') {
        checkStop(activeBodies.trolley, activeBodies.trolley.position.x > canvas.width - 50, "🏁 Simulasi Selesai: Troli mencapai ujung lintasan!");
    } else if (currentScenario === 'race') {
        checkStop(activeBodies.car, activeBodies.car.position.x > canvas.width - 50, "🏁 Balapan Selesai: Mobil Sport menang!");
        if (isPlaying) checkStop(activeBodies.truck, activeBodies.truck.position.x > canvas.width - 50, "🏁 Balapan Selesai: Truk menang!");
    } else if (currentScenario === 'rocket') {
        checkStop(activeBodies.rocket, activeBodies.rocket.position.y < -50, "🚀 Simulasi Selesai: Roket meluncur ke angkasa!");
    }
    
    timeValue.textContent = elapsedTime.toFixed(2);
}

function drawScene() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const groundY = canvas.height - 50;
    
    // Conditionally Draw Background (Indoor vs Outdoor)
    if (currentScenario === 'trolley') {
        // INDOOR CLASSROOM / SUPERMARKET
        // Wall
        ctx.fillStyle = '#fef3c7'; // Warm Yellowish White Wall
        ctx.fillRect(0, 0, canvas.width, groundY);
        // Baseboard (List Dinding)
        ctx.fillStyle = '#d97706'; // Wood color
        ctx.fillRect(0, groundY - 15, canvas.width, 15);
        // Floor (Ceramic Tiles)
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(0, groundY, canvas.width, 50);
        // Tile lines
        ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 2;
        for(let i = 0; i < canvas.width; i+=100) {
            ctx.beginPath(); ctx.moveTo(i, groundY); ctx.lineTo(i - 20, canvas.height); ctx.stroke();
        }
    } else {
        // OUTDOOR
        // Sky Background
        let skyGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        skyGradient.addColorStop(0, '#bae6fd');
        skyGradient.addColorStop(1, '#f0f9ff');
        ctx.fillStyle = skyGradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Ground (Grass + Asphalt Line)
        ctx.fillStyle = '#4ade80'; // Grass
        ctx.fillRect(0, groundY, canvas.width, 50);
        
        // Asphalt for vehicles
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(0, groundY, canvas.width, 12);
    }

    if (currentScenario === 'trolley' && activeBodies.trolley) {
        const t = activeBodies.trolley;
        const isFull = trolleyMassSelect.value === "100";
        drawTrolley(t.position.x, t.position.y, t.angle, isFull);
        
        const force = parseFloat(trolleyForce.value) || 0;
        if (force > 0 && isPlaying) {
            drawPersonPushing(t.position.x - 100, groundY);
            drawArrow(t.position.x - 60, groundY - 50, force * 0.5, 'positive', '#ef4444', `Dorong: ${force}N`);
        }
    } 
    else if (currentScenario === 'rocket' && activeBodies.rocket) {
        const r = activeBodies.rocket;
        drawRocketObj(r.position.x, r.position.y, r.angle, activeBodies.isThrusting && isPlaying);
        
        if (isPlaying) {
            const thrust = activeBodies.isThrusting ? (parseFloat(rocketThrust.value) || 0) : 0;
            if (thrust > 0) {
                drawArrow(r.position.x - 40, r.position.y + 40, thrust * 0.1, 'negative', '#ef4444', `${thrust}N (Aksi)`, true);
                drawArrow(r.position.x + 40, r.position.y - 40, thrust * 0.1, 'positive', '#3b82f6', `${thrust}N (Reaksi)`, true);
            }
            drawArrow(r.position.x, r.position.y, 1000 * 0.1, 'negative', '#10b981', `Berat: 1000N`, true);
        }
    } 
    else if (currentScenario === 'braking' && activeBodies.car) {
        drawCarObj(activeBodies.car.position.x, activeBodies.car.position.y, activeBodies.car.angle);
        ctx.fillStyle = '#f59e0b';
        ctx.save();
        ctx.translate(activeBodies.box.position.x, activeBodies.box.position.y);
        ctx.rotate(activeBodies.box.angle);
        ctx.fillRect(-20, -15, 40, 30);
        ctx.restore();
        
        if (activeBodies.braking && activeBodies.box.velocity.x > activeBodies.car.velocity.x) {
            drawArrow(activeBodies.box.position.x, activeBodies.box.position.y - 40, 50, 'positive', '#ef4444', 'Inersia');
        }
    } 
    else if (currentScenario === 'race' && activeBodies.car) {
        // Draw Upper Road for Truck
        ctx.fillStyle = '#64748b'; // Darker asphalt for contrast
        ctx.fillRect(0, groundY - 80, canvas.width, 20);
        
        // Dashed lines for upper road
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for(let tx = 0; tx < canvas.width; tx += 40) {
            ctx.moveTo(tx, groundY - 70);
            ctx.lineTo(tx + 20, groundY - 70);
        }
        ctx.stroke();
        
        drawSportsCar(activeBodies.car.position.x, activeBodies.car.position.y, activeBodies.car.angle);
        drawTruckObj(activeBodies.truck.position.x, activeBodies.truck.position.y, activeBodies.truck.angle);
        
        for (let i = particles.length - 1; i >= 0; i--) {
            let p = particles[i];
            p.x += p.vx; p.life -= 0.05;
            if (p.life <= 0) particles.splice(i, 1);
            else {
                ctx.fillStyle = `rgba(255, 255, 255, ${p.life})`;
                ctx.beginPath(); ctx.arc(p.x, p.y, 8 + (1-p.life)*15, 0, Math.PI*2); ctx.fill();
            }
        }
    }
}

function simulationLoop(timestamp) {
    if (lastTime === 0) lastTime = timestamp;
    const dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;
    
    // Always update physics if playing or dragging
    if (isPlaying || mouseConstraint.mouse.button !== -1) {
        updatePhysics(Math.min(dt, 0.1));
    }
    
    drawScene();
    if (isPlaying || mouseConstraint.mouse.button !== -1) {
        requestAnimationFrame(simulationLoop);
    }
}

function resetSim() {
    isPlaying = false;
    btnPlayPause.innerHTML = '▶ Mulai Simulasi';
    lastTime = 0;
    buildScenario();
    
    velValue.textContent = '0.00';
    netForceValue.textContent = '0';
    accelValue.textContent = '0.00';
    timeValue.textContent = '0.00';
    updateStatusMessage("Siap (Coba seret objek dengan jari/mouse!)");
    
    drawScene();
}

// Controls
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
    resetSim();
});

btnLaunch.addEventListener('mousedown', () => { if(activeBodies.rocket) activeBodies.isThrusting = true; if(!isPlaying) btnPlayPause.click(); });
btnLaunch.addEventListener('mouseup', () => { if(activeBodies.rocket) activeBodies.isThrusting = false; });
btnLaunch.addEventListener('mouseleave', () => { if(activeBodies.rocket) activeBodies.isThrusting = false; });
btnLaunch.addEventListener('touchstart', (e) => { e.preventDefault(); if(activeBodies.rocket) activeBodies.isThrusting = true; if(!isPlaying) btnPlayPause.click(); });
btnLaunch.addEventListener('touchend', () => { if(activeBodies.rocket) activeBodies.isThrusting = false; });

btnBrake.addEventListener('click', () => {
    if(activeBodies.car) activeBodies.braking = true;
    if(!isPlaying) btnPlayPause.click();
});

[trolleyMassSelect, trolleyForce, rocketThrust, carSpeed, raceForce].forEach(el => {
    el.addEventListener('input', () => { if (!isPlaying) resetSim(); });
});

// Drag listener to start rendering if dragged while paused
Events.on(mouseConstraint, 'startdrag', () => {
    if (!isPlaying) {
        lastTime = performance.now();
        requestAnimationFrame(simulationLoop);
    }
});

// Init
setTimeout(() => {
    resizeCanvas();
    scenarioSelect.dispatchEvent(new Event('change'));
}, 100);
