const fs = require('fs');
let code = fs.readFileSync('Topics/Dinamika-Gerak/virtual-lab/scenes/hukum-newton-2/app.js', 'utf8');

const validateLogic = `
function validateInput(el) {
  let val = parseFloat(el.value);
  const min = parseFloat(el.min);
  const max = parseFloat(el.max);
  if (val < min) el.value = min;
  if (val > max) el.value = max;
}

[trolleyMass, trolleyForce, trolleyFriction, raceForce, carMass, truckMass, rocketMass, rocketThrust, carSpeed, brakingMass, brakingForce].forEach(el => {
  if (el) el.addEventListener("input", () => {
    validateInput(el);
    if (!isPlaying) drawScene();
  });
});
`;

if (!code.includes('validateInput(el)')) {
    code = code.replace(/\[trolleyMass[^]+?}\);/s, validateLogic);
    fs.writeFileSync('Topics/Dinamika-Gerak/virtual-lab/scenes/hukum-newton-2/app.js', code);
    console.log("Added validateInput logic.");
} else {
    console.log("validateInput already exists.");
}
