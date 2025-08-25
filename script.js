const gameArea = document.getElementById('game-area');
const scoreDisplay = document.getElementById('score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const finalScoreDisplay = document.getElementById('final-score');
const topScoresList = document.getElementById('top-scores-list');

let inactivityTimer = null;

let player = {
    speed: 5,
    score: 0,
    start: false,
    gameOver: false,
    shielded: false
};

let keys = {
    ArrowLeft: false,
    ArrowRight: false
};

let powerUps = [];

// --- TOP 3 Score Logic ---
let topScores = JSON.parse(localStorage.getItem('carRaceTopScores')) || [];
let lastResetDate = localStorage.getItem('carRaceLastResetDate') || new Date().toDateString();

function checkAndResetScores() {
    const now = new Date();
    const today = now.toDateString();
    
    if (lastResetDate !== today && now.getHours() >= 6) {
        topScores = [];
        localStorage.setItem('carRaceTopScores', JSON.stringify(topScores));
        localStorage.setItem('carRaceLastResetDate', today);
        lastResetDate = today;
        console.log('Top scores have been reset for the new day.');
    }
}

function updateTopScoresDisplay() {
    topScoresList.innerHTML = '';
    if (topScores.length === 0) {
        for(let i=0; i<3; i++) { topScoresList.innerHTML += `<li>${i + 1}위: -</li>`; }
    } else {
        for (let i = 0; i < 3; i++) {
            const score = topScores[i] ? `${topScores[i]}점` : '-';
            topScoresList.innerHTML += `<li>${i + 1}위: ${score}</li>`;
        }
    }
}
// -------------------------

function createPlayer() {
    const playerCar = document.createElement('div');
    playerCar.setAttribute('class', 'car');
    gameArea.appendChild(playerCar);
    player.x = playerCar.offsetLeft;
    player.y = playerCar.offsetTop;
    return playerCar;
}

let playerCarElement;

function handleKeyDown(e) {
    if (player.start && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
    }
    keys[e.key] = true;
}

function handleKeyUp(e) {
    if (player.start && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        e.preventDefault();
    }
    keys[e.key] = false;
}

function isCollide(a, b) {
    let aRect = a.getBoundingClientRect();
    let bRect = b.getBoundingClientRect();
    const shrinkFactor = 0.3;
    const aHorizontalPadding = aRect.width * (shrinkFactor / 2);
    const aVerticalPadding = aRect.height * (shrinkFactor / 2);
    const bHorizontalPadding = bRect.width * (shrinkFactor / 2);
    const bVerticalPadding = bRect.height * (shrinkFactor / 2);
    const aHitbox = { left: aRect.left + aHorizontalPadding, right: aRect.right - aHorizontalPadding, top: aRect.top + aVerticalPadding, bottom: aRect.bottom - aVerticalPadding };
    const bHitbox = { left: bRect.left + bHorizontalPadding, right: bRect.right - bHorizontalPadding, top: bRect.top + bVerticalPadding, bottom: bRect.bottom - bVerticalPadding };
    return !((aHitbox.bottom < bHitbox.top) || (aHitbox.top > bHitbox.bottom) || (aHitbox.right < bHitbox.left) || (aHitbox.left > bHitbox.right));
}

function moveLines() {
    let lines = document.querySelectorAll('.line');
    lines.forEach(function(item) {
        if (item.y >= 750) { item.y -= 900; }
        item.y += player.speed;
        item.style.top = item.y + 'px';
    });
}

function endGame() {
    player.start = false;
    player.gameOver = true;
    topScores.push(player.score);
    topScores.sort((a, b) => b - a);
    topScores = topScores.slice(0, 3);
    localStorage.setItem('carRaceTopScores', JSON.stringify(topScores));
    finalScoreDisplay.innerText = player.score;
    updateTopScoresDisplay();
    gameOverScreen.style.display = 'flex';
}

function randomizeEnemy(enemy) {
    const randomWidth = Math.floor(Math.random() * 26) + 40;
    const randomHeight = Math.floor(Math.random() * 31) + 70;
    enemy.style.width = randomWidth + 'px';
    enemy.style.height = randomHeight + 'px';
    enemy.style.backgroundColor = randomColor();
    const oldWheels = enemy.querySelectorAll('.wheel');
    oldWheels.forEach(w => w.remove());
    const wheelWidth = Math.round(randomWidth * 0.18);
    const wheelHeight = Math.round(randomHeight * 0.25);
    for (let i = 0; i < 4; i++) {
        const wheel = document.createElement('span');
        wheel.setAttribute('class', 'wheel');
        wheel.style.width = wheelWidth + 'px';
        wheel.style.height = wheelHeight + 'px';
        if (i === 0) { wheel.style.left = -wheelWidth / 2 + 'px'; wheel.style.top = (wheelHeight * 0.5) + 'px'; }
        if (i === 1) { wheel.style.right = -wheelWidth / 2 + 'px'; wheel.style.top = (wheelHeight * 0.5) + 'px'; }
        if (i === 2) { wheel.style.left = -wheelWidth / 2 + 'px'; wheel.style.bottom = (wheelHeight * 0.5) + 'px'; }
        if (i === 3) { wheel.style.right = -wheelWidth / 2 + 'px'; wheel.style.bottom = (wheelHeight * 0.5) + 'px'; }
        enemy.appendChild(wheel);
    }
}

function moveEnemies(car) {
    let enemies = document.querySelectorAll('.enemy');
    enemies.forEach(function(item) {
        if (isCollide(car, item)) {
            if (player.shielded) {
                player.shielded = false;
                car.classList.remove('shield-active');
                randomizeEnemy(item);
                item.y = -300;
            } else {
                endGame();
            }
        }
        if (item.y >= 800) {
            item.y = -300;
            item.style.left = Math.floor(Math.random() * 365) + 'px';
            player.score++;
            scoreDisplay.innerText = player.score;
            randomizeEnemy(item);
            if (player.score > 0 && player.score % 5 === 0) {
                if (player.speed < 15) { player.speed += 0.5; }
            }
        }
        item.y += player.speed;
        item.style.top = item.y + 'px';
    });
}

function spawnPowerUp() {
    const powerUp = document.createElement('div');
    powerUp.setAttribute('class', 'power-up');
    powerUp.innerHTML = 'S'; // Shield
    powerUp.y = -100;
    powerUp.style.top = powerUp.y + 'px';
    powerUp.style.left = Math.floor(Math.random() * 390) + 'px';
    gameArea.appendChild(powerUp);
    powerUps.push(powerUp);
}

function updatePowerUps(car) {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        let item = powerUps[i];
        item.y += player.speed / 2; // Move slower than enemies
        if (item.y > 750) {
            item.remove();
            powerUps.splice(i, 1);
        } else {
            if (isCollide(car, item)) {
                player.shielded = true;
                car.classList.add('shield-active');
                item.remove();
                powerUps.splice(i, 1);
            }
            item.style.top = item.y + 'px';
        }
    }
}

function gamePlay() {
    if (player.start) {
        let car = document.querySelector('.car');
        moveLines();
        moveEnemies(car);
        updatePowerUps(car);
        if (Math.random() < 0.002 && powerUps.length === 0 && !player.shielded) { // Spawn shield condition
            spawnPowerUp();
        }
        if (keys.ArrowLeft && player.x > 0) { player.x -= player.speed; }
        if (keys.ArrowRight && player.x < (gameArea.offsetWidth - 75)) { player.x += player.speed; }
        car.style.left = player.x + 'px';
        window.requestAnimationFrame(gamePlay);
    }
}

function startGame() {
    clearTimeout(inactivityTimer);
    startScreen.style.display = 'none';
    gameOverScreen.style.display = 'none';
    gameArea.innerHTML = '';
    powerUps = [];
    player.start = true;
    player.gameOver = false;
    player.score = 0;
    player.speed = 5;
    player.shielded = false;
    scoreDisplay.innerText = player.score;
    playerCarElement = createPlayer();
    for (let x = 0; x < 6; x++) {
        let roadLine = document.createElement('div');
        roadLine.setAttribute('class', 'line');
        roadLine.y = (x * 150);
        roadLine.style.top = roadLine.y + 'px';
        gameArea.appendChild(roadLine);
    }
    for (let x = 0; x < 4; x++) {
        let enemyCar = document.createElement('div');
        enemyCar.setAttribute('class', 'enemy');
        enemyCar.y = ((x + 1) * 250) * -1;
        enemyCar.style.top = enemyCar.y + 'px';
        enemyCar.style.left = Math.floor(Math.random() * 365) + 'px';
        gameArea.appendChild(enemyCar);
        randomizeEnemy(enemyCar);
    }
    window.requestAnimationFrame(gamePlay);
}

function randomColor(){
    function c(){ let hex = Math.floor(Math.random()*256).toString(16); return ("0" + String(hex)).substr(-2); }
    return "#"+c()+c()+c();
}

// Initial setup
checkAndResetScores();
inactivityTimer = setTimeout(startGame, 2000);
document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', startGame);
