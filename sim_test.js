const fs = require('fs');

let rocketState = { y: 0, v: 0, reachedTarget: false };
let elapsedTime = 0;
const targetAltitude = 384400000;

function runSim(F_MN) {
    const mTon = 5000;
    const m = mTon * 1000;
    const F = F_MN * 1000000;
    const g = 9.8;
    const W = m * g;
    const netF = F - W;
    const a = netF / m;
    
    console.log(`Testing F = ${F_MN} MN, W = ${W/1000000} MN, a = ${a}`);

    for (let frame=1; frame<=60; frame++) {
        const dt = 0.016; // 60 FPS
        const scaledDt = dt;
        
        let timeWarp = 1500;
        if (a > 0) {
            const realEstTime = Math.sqrt((2 * targetAltitude) / a);
            timeWarp = Math.min(100000, Math.max(1500, realEstTime / 8));
        }
        const scaledDtRocket = scaledDt * timeWarp;

        if (F > m * g) {
            rocketState.v += a * scaledDtRocket;
            if (rocketState.v < 0) rocketState.v = 0;
        } else {
            rocketState.v += a * scaledDtRocket;
        }
        
        rocketState.y += rocketState.v * scaledDtRocket;
        if (rocketState.y <= 0) {
            rocketState.y = 0;
            rocketState.v = 0;
        }
    }
    
    console.log(`After 1s (60 frames): y = ${rocketState.y}, v = ${rocketState.v}`);
    const visualScale = 10000 / 384400000;
    console.log(`Visual Y = ${rocketState.y * visualScale} pixels`);
}

runSim(60);
