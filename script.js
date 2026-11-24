
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

let W, H, DPR;
const WORLD = { w: 1800, h: 1200 };

function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener("resize", resize);
resize();

const $ = id => document.getElementById(id);

let running = false;
let dead = false;
let round = 1;
let wins = 0;
let lastTime = 0;
let shake = 0;
let time = 0;
let separationFade = 0;
let lastDuelWon = false;
let countdownTimer = null;
const matchStats = { shots: 0, hits: 0 };
let audioContext = null;

const keys = {};
const mouse = { x: W/2, y: H/2, down: false };
let controlMode = "desktop";
let gameMode = "solo";
let matchMode = "classic";
let difficulty = "medium";
let extraEnemies = [];
let bulletSpeedScale = 1;
let playerSpeedScale = 1;
let teamsEnabled = false;
let challengerTeam = false;
let sideDuel = { bullets: [], playerFired: false, enemyFired: false, enemyTimer: 1.2, enemyThinkTimer: 0.5, resetTimer: 0, playerPose: "stand", enemyPose: "stand" };
const sideAction = { jump: false, duck: false, jump2: false, duck2: false };
const touchMove = { x: 0, y: 0, id: null, originX: 0, originY: 0 };
const touchAim = { id: null, startX: 0, startY: 0 };
const aimStick = { x: 0, y: 0 };
const touchPlayers = [
    { id: null, x: 0, y: 0, originX: 0, originY: 0 },
    { id: null, x: 0, y: 0, originX: 0, originY: 0 }
];

const player = {
    x: 500, y: 600,
    vx: 0, vy: 0,
    angle: 0,
    speed: 245,
    radius: 17,
    bullet: true,
    health: 5,
    maxHealth: 5,
    weapon: "single",
    ammo: 1,
    moving: false,
    walk: 0,
    color: "#333b40"
};

let enemy = makeEnemy();
let bullets = [];
let pickups = [];
let particles = [];
let bloodPools = [];
let obstacles = [];

const rand = (a,b) => Math.random()*(b-a)+a;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

function initAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!audioContext && AudioContextClass) audioContext = new AudioContextClass();
    if (audioContext && audioContext.state === "suspended") audioContext.resume();
}

function playSound(type, weapon = "single") {
    if (!audioContext) return;
    const now = audioContext.currentTime;
    const presets = {
        revolver: { frequency: 175, duration: .11, wave: "square" },
        single: { frequency: 95, duration: .24, wave: "triangle" },
        axe: { frequency: 310, duration: .13, wave: "sawtooth" },
        hit: { frequency: 125, duration: .16, wave: "triangle" },
        pickup: { frequency: 620, duration: .12, wave: "sine" },
        start: { frequency: 440, duration: .2, wave: "sine" },
        win: { frequency: 660, duration: .32, wave: "triangle" },
        lose: { frequency: 115, duration: .38, wave: "sawtooth" }
    };
    const preset = presets[type] || presets.single;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.type = preset.wave;
    oscillator.frequency.setValueAtTime(preset.frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(35, preset.frequency * .48), now + preset.duration);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(type === "revolver" || type === "single" || type === "axe" ? .11 : .07, now + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, now + preset.duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + preset.duration);
}

function makeEnemy() {
    const weapon = ["revolver", "single", "axe"][Math.floor(Math.random() * 3)];
    return {
        x: 1250,
        y: 600,
        vx: 0,
        vy: 0,
        angle: Math.PI,
        radius: 18,
        weapon,
        ammo: weapon === "revolver" ? 6 : 1,
        bullet: true,
        health: 5,
        maxHealth: 5,
        speed: 135 + Math.min(round * 7, 90),
        state: "approach",
        timer: 1.5,
        emptyTimer: 0,
        stuckTimer: 0,
        walk: 0,
        color: "#8b3325"
    };
}

function makeArena() {
    const layouts = [
        [
            {x:780,y:310,w:210,h:95,type:"table"},
            {x:400,y:350,w:150,h:75,type:"table"},
            {x:1200,y:820,w:190,h:85,type:"table"},
            {x:340,y:850,w:110,h:110,type:"barrel"},
            {x:1420,y:350,w:100,h:100,type:"barrel"},
            {x:850,y:950,w:130,h:80,type:"table"},
            {x:150,y:530,w:80,h:170,type:"pillar"},
            {x:620,y:740,w:74,h:82,type:"barrel"},
            {x:1080,y:470,w:74,h:82,type:"barrel"},
            {x:1050,y:1010,w:74,h:82,type:"barrel"}
        ],
        [
            {x:250,y:270,w:190,h:85,type:"table"},
            {x:760,y:220,w:220,h:90,type:"table"},
            {x:1290,y:300,w:180,h:85,type:"table"},
            {x:240,y:870,w:220,h:90,type:"table"},
            {x:760,y:890,w:180,h:85,type:"table"},
            {x:1290,y:850,w:200,h:90,type:"table"},
            {x:570,y:470,w:90,h:90,type:"barrel"},
            {x:1090,y:650,w:90,h:90,type:"barrel"},
            {x:850,y:590,w:80,h:150,type:"pillar"}
        ],
        [
            {x:300,y:430,w:110,h:110,type:"barrel"},
            {x:550,y:250,w:170,h:80,type:"table"},
            {x:1030,y:260,w:170,h:80,type:"table"},
            {x:1390,y:470,w:110,h:110,type:"barrel"},
            {x:360,y:720,w:190,h:85,type:"table"},
            {x:720,y:510,w:90,h:180,type:"pillar"},
            {x:1000,y:760,w:190,h:85,type:"table"},
            {x:1370,y:800,w:100,h:100,type:"barrel"},
            {x:630,y:970,w:100,h:100,type:"barrel"},
            {x:1110,y:1000,w:130,h:80,type:"table"}
        ]
    ];
    obstacles = layouts[Math.floor(Math.random() * layouts.length)].map(o => ({...o}));
}

function updateGameModeOptions() {
    const twoPlayerOption = $('gameMode').querySelector('option[value="twoPlayer"]');
    const mobileSelected = $('controlMode').value === 'mobile';
    const modeAllowsTwoPlayers = !['custom', 'juggernaut'].includes($('matchMode').value);
    const allowTwoPlayers = mobileSelected && modeAllowsTwoPlayers;
    twoPlayerOption.disabled = !allowTwoPlayers;
    twoPlayerOption.hidden = !allowTwoPlayers;
    if (!allowTwoPlayers && $('gameMode').value === 'twoPlayer') $('gameMode').value = 'solo';
    updateCustomPlayerTeams();
}
function updateCustomPlayerTeams() {
    const visible = $('customTeams').value === 'on' && $('controlMode').value === 'mobile' && $('gameMode').value === 'twoPlayer';
    $('customPlayerTeams').classList.toggle('active', visible);
}
$('gameMode').addEventListener('change', updateCustomPlayerTeams);
$('customTeams').addEventListener('change', updateCustomPlayerTeams);

$('controlMode').addEventListener('change', updateGameModeOptions);
function updateCustomTeamsOption() {
    const count = Number($('customShooters').value);
    const available = count % 2 === 0;
    $('customTeamsSetting').classList.toggle('active', available);
    if (!available) $('customTeams').value = 'off';
    updateCustomPlayerTeams();
}
$('customShooters').addEventListener('change', updateCustomTeamsOption);
updateCustomTeamsOption();
$('matchMode').addEventListener('change', () => {
    const selected = $('matchMode').value;
    const weaponChoice = $('weaponChoice');
    weaponChoice.disabled = selected === 'oneBullet';
    if (selected === 'oneBullet') weaponChoice.value = 'single';
    $('customSettings').classList.toggle('active', selected === 'custom');
    $('juggernautSettings').classList.toggle('active', selected === 'juggernaut');
    updateCustomTeamsOption();
    updateGameModeOptions();
    const settings = selected === 'custom' ? $('customSettings') : selected === 'juggernaut' ? $('juggernautSettings') : null;
    if (settings) settings.scrollIntoView({block: 'nearest', behavior: 'smooth'});
});
$('customBack').addEventListener('click', () => {
    $('customPage').style.display = 'none';
    $('title').style.display = 'flex';
    $('matchMode').value = 'classic';
    $('customSettings').classList.remove('active');
    $('juggernautSettings').classList.remove('active');
});
const startMatch = () => {
    initAudio();
    player.weapon = $('weaponChoice').value;
    makeArena();
    resetRound();
    $('customPage').style.display = 'none';
};
$('customStart').addEventListener('click', startMatch);
for (const [inputId, outputId] of [['customBulletSpeed','bulletSpeedLabel'], ['customPlayerSpeed','playerSpeedLabel']]) {
    $(inputId).addEventListener('input', () => $(outputId).textContent = `${$(inputId).value}%`);
}
updateGameModeOptions();

function resetRound() {
    matchMode = $('matchMode').value;
    $('weaponChoice').disabled = matchMode === 'oneBullet';
    if (matchMode === 'oneBullet') $('weaponChoice').value = 'single';
    extraEnemies = [];
    bulletSpeedScale = matchMode === 'custom' ? Number($('customBulletSpeed').value) / 100 : 1;
    playerSpeedScale = matchMode === 'custom' ? Number($('customPlayerSpeed').value) / 100 : 1;
    teamsEnabled = matchMode === 'custom' && $('customTeams').value === 'on';
    challengerTeam = matchMode === 'juggernaut' && $('juggernautRole').value === 'challenger';
    player.team = matchMode === 'custom' && teamsEnabled ? Number($('customP1Team').value) : 0;
    player.speed = 245 * playerSpeedScale;
    player.maxHealth = matchMode === 'custom' ? Number($('customHealth').value) : 5;
    if (matchMode === 'juggernaut' && $('juggernautRole').value === 'juggernaut') player.maxHealth = 40;
    player.x = 500;
    player.y = 600;
    player.vx = 0;
    player.vy = 0;
    player.angle = 0;
    player.weapon = $("weaponChoice").value;
    player.ammo = player.weapon === "revolver" ? 6 : 1;
    player.bullet = true;
    player.health = player.maxHealth;
    controlMode = $("controlMode").value;
    updateGameModeOptions();
    gameMode = controlMode === "mobile" ? $("gameMode").value : "solo";
    difficulty = $("difficulty").value;
    document.body.classList.toggle("mobile", controlMode === "mobile");
    document.body.classList.toggle("one-bullet", matchMode === 'oneBullet');
    document.body.classList.toggle("two-player", gameMode === "twoPlayer");
    sideAction.jump = sideAction.duck = sideAction.jump2 = sideAction.duck2 = false;
    touchMove.x = touchMove.y = 0;
    touchMove.id = null;
    touchAim.id = null;
    for (const touch of touchPlayers) Object.assign(touch, {id:null,x:0,y:0});
    bullets = [];
    pickups = [];
    particles = [];
    bloodPools = [];
    enemy = makeEnemy();
    enemy.maxHealth = matchMode === 'custom' ? Number($('customHealth').value) : 5;
    if (matchMode === 'juggernaut' && $('juggernautRole').value === 'challenger') enemy.maxHealth = 40;
    enemy.health = enemy.maxHealth;
    let cpuCount = matchMode === 'custom' ? Number($('customShooters').value) :
        (matchMode === 'juggernaut' ? 3 : 1);
    const extraStart = matchMode === 'custom' && gameMode === 'twoPlayer' ? 0 : 1;
    for (let i = extraStart; i < cpuCount; i++) {
        const bot = makeEnemy();
        bot.x = 350 + (i % 5) * 270;
        bot.y = 250 + Math.floor(i / 5) * 650;
        bot.maxHealth = bot.health = matchMode === 'custom' ? Number($('customHealth').value) : 5;
        bot.id = `cpu${i + 1}`;
        bot.team = teamsEnabled ? (i % 2 === 0 ? 1 : 0) : null;
        bot.timer = rand(0.5, 2.5);
        extraEnemies.push(bot);
    }
    enemy.team = teamsEnabled
        ? (matchMode === 'custom' && gameMode === 'twoPlayer' ? Number($('customP2Team').value) : 1)
        : null;
    enemy.timer = rand(0.5, 2.5);
    if (gameMode === "twoPlayer") {
        enemy.weapon = $("player2WeaponChoice").value;
        enemy.ammo = enemy.weapon === "revolver" ? 6 : 1;
        enemy.bullet = true;
        enemy.health = enemy.maxHealth;
        enemy.x = 1250;
        enemy.y = 600;
        enemy.vx = enemy.vy = 0;
    }

    if (matchMode === 'oneBullet') {
        player.health = player.maxHealth = 1;
        enemy.health = enemy.maxHealth = 1;
        extraEnemies = [];
        sideDuel = { bullets: [], playerFired: false, enemyFired: false, enemyTimer: 1.2, enemyThinkTimer: 0.5, resetTimer: 0, playerPose: 'stand', enemyPose: 'stand' };
    }
    dead = false;
    running = true;
    $("gameover").style.display = "none";
    $("title").style.display = "none";
    $("message").textContent = "DRAW...";
    playSound("start");
    setTimeout(() => {
        if (running && !dead) $("message").textContent = "";
    }, 1300);

    updateHUD();
}

function updateHUD() {
    const weaponLabels = {revolver:"SIX-SHOOTER", single:"SINGLE BULLET", axe:"THROWING AXE"};
    $("ammo").textContent = player.weapon === "revolver" ? `${player.ammo}/6 ROUNDS` : (player.bullet ? "READY" : "EMPTY");
    $("ammo").style.color = player.bullet ? "#f2d4a0" : "#d65b40";
    $("status").textContent = player.bullet ? "READY TO ATTACK" : "RECOVER YOUR WEAPON";
    $("enemyAmmo").textContent = enemy && enemy.bullet ? (enemy.weapon === "revolver" ? `${enemy.ammo}/6 ROUNDS` : "ARMED") : "FINDING WEAPON";
    $("enemyWeapon").textContent = "WEAPON: " + (enemy ? ({revolver:"SIX-SHOOTER", single:"SINGLE BULLET", axe:"THROWING AXE"}[enemy.weapon]) : "—");
    $("round").textContent = "DUEL " + String(round).padStart(2,"0");
    $("score").textContent = "WINS: " + wins;
    $("weaponName").textContent = weaponLabels[player.weapon];
    $("health").textContent = `YOU: ${Math.max(0,player.health)}/${player.maxHealth || 5}`;
    const opponents = [enemy, ...extraEnemies];
    const remainingHealth = opponents.reduce((sum, opponent) => sum + Math.max(0, opponent.health), 0);
    const maxOpponentHealth = opponents.reduce((sum, opponent) => sum + (opponent.maxHealth || 5), 0);
    $("enemyHealth").textContent = extraEnemies.length ? `${remainingHealth}/${maxOpponentHealth} TOTAL` : `${Math.max(0,enemy.health)}/${enemy.maxHealth || 5}`;
    $("playerHudLabel").textContent = gameMode === "twoPlayer" ? "PLAYER 1" : "YOUR AMMUNITION";
    $("opponentHudLabel").textContent = gameMode === "twoPlayer" ? "PLAYER 2" : "OPPONENT";
    $("statWins").textContent = wins;
    $("statShots").textContent = matchStats.shots;
    $("statHits").textContent = matchStats.hits;
    $("statAccuracy").textContent = `${matchStats.shots ? Math.round(matchStats.hits / matchStats.shots * 100) : 0}%`;
}

$("start").onclick = startMatch;

$("mainMenu").addEventListener("click", () => {
    if (countdownTimer) clearTimeout(countdownTimer);
    running = false;
    dead = false;
    $("gameover").style.display = "none";
    $("countdownOverlay").style.display = "none";
    $("message").textContent = "";
    $("customPage").style.display = "none";
    $("title").style.display = "flex";
    $("matchMode").value = "classic";
    $("customSettings").classList.remove("active");
    $("juggernautSettings").classList.remove("active");
    document.body.classList.remove("one-bullet", "two-player");
});

$("restart").onclick = () => {
    if (countdownTimer) clearTimeout(countdownTimer);
    if (lastDuelWon) round++;
    running = false;
    dead = true;
    $("gameover").style.display = "none";
    $("countdownOverlay").style.display = "flex";

    let count = 3;
    const countdown = () => {
        if (count === 0) {
            $("countdownOverlay").style.display = "none";
            makeArena();
            resetRound();
            return;
        }
        $("countdownText").textContent = `NEXT ROUND IN ${count}`;
        count--;
        countdownTimer = setTimeout(countdown, 1000);
    };
    countdown();
};

window.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;
    if ([" ","arrowup","arrowdown","arrowleft","arrowright","enter"].includes(e.key.toLowerCase())) e.preventDefault();
});

window.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
});

canvas.addEventListener("mousemove", e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

canvas.addEventListener("mousedown", e => {
    if (e.button !== 0) return;
    mouse.down = true;
    if (matchMode === 'oneBullet') {
        shootSide(gameMode === 'twoPlayer' && e.clientX >= W / 2 ? 'enemy' : 'player');
        return;
    }
    if (gameMode === "twoPlayer" && controlMode === "desktop") {
        const target = screenToWorld(e.clientX, e.clientY);
        shootEnemy(target);
    } else shootPlayer();
});

window.addEventListener("keydown", e => {
    if (gameMode === "twoPlayer" && e.key === "Enter") {
        if (matchMode === 'oneBullet') shootSide('enemy');
        else shootEnemy();
    }
});

window.addEventListener("mouseup", () => mouse.down = false);

function setTouchAim(touch) {
    mouse.x = touch.clientX;
    mouse.y = touch.clientY;
    const target = screenToWorld(mouse.x, mouse.y);
    if (gameMode === "twoPlayer") {
        const actor = touch.clientX < W / 2 ? player : enemy;
        actor.angle = Math.atan2(target.y - actor.y, target.x - actor.x);
    } else {
        player.angle = Math.atan2(target.y - player.y, target.x - player.x);
    }
}

canvas.addEventListener("touchstart", e => {
    if (controlMode !== "mobile") return;
    e.preventDefault();
    for (const touch of e.changedTouches) {
        setTouchAim(touch);
        if (!running || dead) continue;
        if (matchMode === 'oneBullet' && gameMode === 'twoPlayer') {
            mouse.y = touch.clientY;
            shootSide(touch.clientX >= W / 2 ? 'enemy' : 'player');
        } else if (matchMode === 'oneBullet') {
            shootSide('player');
        } else if (gameMode === "twoPlayer" && touch.clientX >= W / 2) {
            const target = screenToWorld(touch.clientX, touch.clientY);
            shootEnemy(target);
        }
    }
}, {passive:false});
canvas.addEventListener("touchmove", e => {
    if (controlMode !== "mobile") return;
    e.preventDefault();
    for (const touch of e.changedTouches) setTouchAim(touch);
}, {passive:false});

function bindTouchStick(zoneId, knobId, getControl) {
    const zone = $(zoneId);
    const knob = $(knobId);
    let pointerId = null;
    const update = e => {
        const rect = zone.getBoundingClientRect();
        const radius = rect.width * .34;
        const dx = e.clientX - (rect.left + rect.width / 2);
        const dy = e.clientY - (rect.top + rect.height / 2);
        const length = Math.hypot(dx, dy);
        const scale = length > radius ? radius / length : 1;
        const control = getControl();
        const distance = Math.hypot(dx, dy);
        const strength = Math.min(1, distance / radius);
        const deadZone = 0.12;
        const analog = strength <= deadZone ? 0 : (strength - deadZone) / (1 - deadZone);
        control.x = distance ? dx / distance * analog : 0;
        control.y = distance ? dy / distance * analog : 0;
        knob.style.left = `calc(50% + ${dx * scale}px)`;
        knob.style.top = `calc(50% + ${dy * scale}px)`;
    };
    const release = e => {
        if (e.pointerId !== pointerId) return;
        pointerId = null;
        const control = getControl();
        control.x = control.y = 0;
        knob.style.left = knob.style.top = "50%";
    };
    zone.addEventListener("pointerdown", e => {
        e.preventDefault();
        pointerId = e.pointerId;
        zone.setPointerCapture(pointerId);
        update(e);
    });
    zone.addEventListener("pointermove", e => {
        if (e.pointerId === pointerId) update(e);
    });
    zone.addEventListener("pointerup", release);
    zone.addEventListener("pointercancel", release);
}

bindTouchStick("stickZone1", "stickKnob1", () => gameMode === "twoPlayer" ? touchPlayers[0] : touchMove);
bindTouchStick("stickZone2", "stickKnob2", () => touchPlayers[1]);
bindTouchStick("aimZone", "aimKnob", () => aimStick);

const updateMobileAim = () => {
    if (Math.hypot(aimStick.x, aimStick.y) > 0.12 && gameMode === "solo") {
        player.angle = Math.atan2(aimStick.y, aimStick.x);
    }
};
$("aimZone").addEventListener("pointerdown", updateMobileAim);
$("aimZone").addEventListener("pointermove", updateMobileAim);
$("shootButton").addEventListener("pointerdown", event => {
    event.preventDefault();
    shootPlayer();
});

function bindSideAction(buttonId, actionName) {
    const button = $(buttonId);
    const press = event => {
        event.preventDefault();
        sideAction[actionName] = true;
        button.setPointerCapture?.(event.pointerId);
    };
    const release = event => {
        event.preventDefault();
        sideAction[actionName] = false;
    };
    button.addEventListener("pointerdown", press);
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", () => sideAction[actionName] = false);
}

bindSideAction("sideJump", "jump");
bindSideAction("sideDuck", "duck");
bindSideAction("sideJump2", "jump2");
bindSideAction("sideDuck2", "duck2");
for (const [buttonId, owner, lane] of [
    ["sideFireUp", "player", "high"], ["sideFireDown", "player", "low"],
    ["sideFireUp2", "enemy", "high"], ["sideFireDown2", "enemy", "low"]
]) {
    $(buttonId).addEventListener("pointerdown", event => {
        event.preventDefault();
        shootSide(owner, lane);
    });
}

function splitScreenActive() {
    return gameMode === "twoPlayer" && enemy &&
        (Math.abs(player.x - enemy.x) > W - 100 || Math.abs(player.y - enemy.y) > H - 100);
}

function camera(focus = player, viewWidth = W, shared = false) {
    const centerX = shared ? (player.x + enemy.x) / 2 : focus.x;
    const centerY = shared ? (player.y + enemy.y) / 2 : focus.y;
    return {
        x: clamp(centerX - viewWidth / 2, 0, Math.max(0, WORLD.w - viewWidth)),
        y: clamp(centerY - H / 2, 0, Math.max(0, WORLD.h - H))
    };
}

function screenToWorld(x,y) {
    if (splitScreenActive()) {
        const rightView = x >= W / 2;
        const viewWidth = W / 2;
        const c = camera(rightView ? enemy : player, viewWidth);
        return {x: x - (rightView ? W / 2 : 0) + c.x, y: y + c.y};
    }
    const c = gameMode === "twoPlayer" ? camera(player, W, true) : camera();
    return {x:x+c.x, y:y+c.y};
}

function collides(x,y,r) {
    if (x-r < 35 || y-r < 35 ||
        x+r > WORLD.w-35 || y+r > WORLD.h-35) return true;

    for (const o of obstacles) {
        if (x+r > o.x && x-r < o.x+o.w &&
            y+r > o.y && y-r < o.y+o.h) {
            return true;
        }
    }
    return false;
}

function moveEntity(entity, dx, dy) {
    const nx = entity.x + dx;
    const ny = entity.y + dy;

    if (!collides(nx, entity.y, entity.radius)) entity.x = nx;
    if (!collides(entity.x, ny, entity.radius)) entity.y = ny;
}

function shootPlayer() {
    if (matchMode === 'oneBullet') { shootSide('player'); return; }
    if (!running || dead) return;

    const target = screenToWorld(mouse.x, mouse.y);
    player.angle = Math.atan2(target.y-player.y,target.x-player.x);
    const distance = Math.hypot(enemy.x-player.x,enemy.y-player.y);

    if (player.weapon === "axe" && distance <= 60) {
        const target = [enemy, ...extraEnemies]
            .filter(opponent => opponent.health > 0)
            .sort((a, b) => Math.hypot(a.x-player.x, a.y-player.y) - Math.hypot(b.x-player.x, b.y-player.y))[0];
                if (target) {
            player.bullet = false;
            player.ammo = 0;
            matchStats.shots++;
            matchStats.hits++;
            playSound("hit");
            target.health = Math.max(0, target.health - 4);
            if (target.health <= 0) target.headOff = true;
            addBlood(target.x,target.y,24);
            burst(target.x,target.y,18,"#9f1720");
            shake = target.health <= 0 ? 14 : 5;
            if (target.health <= 0 && matchMode === 'custom') checkCustomOutcome();
            else if (target.health <= 0 && [enemy, ...extraEnemies].every(opponent => opponent.health <= 0)) winDuel();
            updateHUD();
        }
        return;
    }
    if (player.weapon !== "axe" && distance <= 60) {
        $("message").textContent = "TOO CLOSE TO SHOOT!";
        setTimeout(()=>{ if(running && !dead) $("message").textContent=""; },700);
        return;
    }
    if (!player.bullet || player.ammo <= 0) return;

    const weapon = player.weapon;
    const damage = weapon === "revolver" ? 1 : weapon === "single" ? 5 : 4;
    matchStats.shots++;
    playSound(weapon);
    player.ammo--;
    player.bullet = player.ammo > 0;
    bullets.push({
        x: player.x + Math.cos(player.angle)*25,
        y: player.y + Math.sin(player.angle)*25,
        vx: Math.cos(player.angle)*(weapon === "axe" ? 620 : 950) * bulletSpeedScale,
        vy: Math.sin(player.angle)*(weapon === "axe" ? 620 : 950) * bulletSpeedScale,
        owner: "player", weapon, damage,
        dropOnFinish: weapon !== "revolver" || player.ammo === 0,
        life: 2.5, active: true,
        rotation: player.angle, spin: weapon === "axe" ? 17 : 0
    });

    burst(player.x,player.y,weapon === "single" ? 13 : 8,
        weapon === "axe" ? "#c8c8b8" : weapon === "revolver" ? "#ff8138" : "#fff0be");
    shake = 4;
    updateHUD();
}

function shootEnemy(targetPoint = null) {
    if (!enemy.bullet || dead || !running) return;

    const targets = challengerTeam ? [player, ...extraEnemies].filter(target => target.health > 0) : [player];
    const targetActor = matchMode === 'custom' ? chooseCustomTarget(enemy) : targets.sort((a, b) => Math.hypot(a.x - enemy.x, a.y - enemy.y) - Math.hypot(b.x - enemy.x, b.y - enemy.y))[0];
    if (!targetActor) return;
    const dx = targetActor.x-enemy.x;
    const dy = targetActor.y-enemy.y;
    const distance = Math.hypot(dx,dy);
    enemy.angle = targetPoint
        ? Math.atan2(targetPoint.y-enemy.y,targetPoint.x-enemy.x)
        : Math.atan2(dy,dx);

    if (enemy.weapon === "axe" && distance <= 60) {
        enemy.bullet = false;
        enemy.ammo = 0;
        playSound("hit");
        targetActor.health = Math.max(0, targetActor.health - 4);
        addBlood(targetActor.x,targetActor.y,24);
        burst(targetActor.x,targetActor.y,18,"#9f1720");
        shake = targetActor.health <= 0 ? 14 : 5;
        if (targetActor.health <= 0 && matchMode === 'custom') checkCustomOutcome();
        else {
            if (targetActor.health <= 0 && targetActor === player) loseDuel();
            if (targetActor.health <= 0 && challengerTeam && targetActor === enemy) winDuel();
        }
        updateHUD();
        return;
    }
    if (enemy.weapon !== "axe" && distance <= 60) return;

    const weapon = enemy.weapon;
    const damage = weapon === "revolver" ? 1 : weapon === "single" ? 5 : 4;
    playSound(weapon);
    enemy.ammo = weapon === "revolver" ? enemy.ammo - 1 : 0;
    enemy.bullet = weapon === "revolver" && enemy.ammo > 0;
    if (!enemy.bullet) enemy.emptyTimer = 0;
    const spread = rand(-0.055,0.055);
    bullets.push({
        x: enemy.x+Math.cos(enemy.angle)*25,
        y: enemy.y+Math.sin(enemy.angle)*25,
        vx: Math.cos(enemy.angle+spread)*(weapon === "axe" ? 620 : 850) * bulletSpeedScale,
        vy: Math.sin(enemy.angle+spread)*(weapon === "axe" ? 620 : 850) * bulletSpeedScale,
        owner: "enemy", weapon, damage,
        dropOnFinish: weapon !== "revolver" || enemy.ammo === 0,
        life: 2.5, active: true,
        rotation: enemy.angle, spin: weapon === "axe" ? 17 : 0
    });

    burst(enemy.x,enemy.y,weapon === "single" ? 13 : 8,
        weapon === "axe" ? "#c8c8b8" : weapon === "revolver" ? "#ff8138" : "#fff0be");
    updateHUD();
}

function addBlood(x,y,size) {
    bloodPools.push({x,y,size,rotation:rand(0,Math.PI*2)});
}

function dropPickup(b) {
    if (!b.dropOnFinish) return;
    pickups.push({x:b.x,y:b.y,owner:b.owner,weapon:b.weapon || "single",size:b.weapon === "axe" ? 15 : 10});
}

function burst(x,y,count,color) {
    for (let i=0;i<count;i++) {
        const a = rand(0,Math.PI*2);
        const s = rand(30,190);
        particles.push({
            x,y,
            vx:Math.cos(a)*s,
            vy:Math.sin(a)*s,
            life:rand(.2,.7),
            max:.7,
            color,
            size:rand(2,5)
        });
    }
}

function update(dt) {
    if (!running || dead) return;
    if (matchMode === 'oneBullet') { updateSideDuel(dt); return; }

    time += dt;
    // Mobile solo aim is controlled by the right joystick; desktop uses the mouse.
    if (controlMode !== "mobile") {
        const target = screenToWorld(mouse.x, mouse.y);
        player.angle = Math.atan2(target.y - player.y, target.x - player.x);
    }

    // PLAYER MOVEMENT
    let mx = 0, my = 0;

    if (keys.w) my--;
    if (keys.s) my++;
    if (keys.a) mx--;
    if (keys.d) mx++;
    if (controlMode === "mobile" && gameMode === "solo") {
        mx += touchMove.x;
        my += touchMove.y;
    }
    if (gameMode === "twoPlayer") {
        if (controlMode === "mobile") {
            mx = touchPlayers[0].x;
            my = touchPlayers[0].y;
            let p2x = touchPlayers[1].x;
            let p2y = touchPlayers[1].y;
            const p2Length = Math.hypot(p2x, p2y);
            if (p2Length > 1) {
                p2x /= p2Length;
                p2y /= p2Length;
            }
            enemy.vx += (p2x * enemy.speed - enemy.vx) * Math.min(1,dt*12);
            enemy.vy += (p2y * enemy.speed - enemy.vy) * Math.min(1,dt*12);
            if (p2x || p2y) enemy.angle = Math.atan2(p2y,p2x);
            moveEntity(enemy,enemy.vx*dt,enemy.vy*dt);
        } else {
            if (keys.arrowup) enemy.vy = -enemy.speed;
            else if (keys.arrowdown) enemy.vy = enemy.speed;
            else enemy.vy = 0;
            if (keys.arrowleft) enemy.vx = -enemy.speed;
            else if (keys.arrowright) enemy.vx = enemy.speed;
            else enemy.vx = 0;
            const p2Length = Math.hypot(enemy.vx, enemy.vy);
            if (p2Length > enemy.speed) {
                enemy.vx = enemy.vx / p2Length * enemy.speed;
                enemy.vy = enemy.vy / p2Length * enemy.speed;
            }
            if (enemy.vx || enemy.vy) enemy.angle = Math.atan2(enemy.vy,enemy.vx);
            moveEntity(enemy,enemy.vx*dt,enemy.vy*dt);
        }
        enemy.moving = Math.hypot(enemy.vx,enemy.vy)>15;
        if (enemy.moving) enemy.walk += dt*13;
    }

    const length = Math.hypot(mx,my);
    // Preserve analog joystick strength, while capping keyboard/diagonal input.
    if (length > 1) {
        mx /= length;
        my /= length;
    }

    const sprint = keys.shift ? 1.65 : 1;
    const targetVX = mx*player.speed*sprint;
    const targetVY = my*player.speed*sprint;

    player.vx += (targetVX-player.vx)*Math.min(1,dt*12);
    player.vy += (targetVY-player.vy)*Math.min(1,dt*12);

    moveEntity(player,player.vx*dt,player.vy*dt);

    player.moving = Math.hypot(player.vx,player.vy)>15;
    if (player.moving) player.walk += dt*13;

    // The second player replaces the AI in local duel mode.
    if (gameMode === "solo") updateEnemy(dt);
    if (gameMode === "solo" || (matchMode === 'custom' && gameMode === 'twoPlayer')) updateExtraEnemies(dt);

    // BULLET PHYSICS
    for (const b of bullets) {
        if (!b.active) continue;
        if (b.weapon === "axe") b.rotation += b.spin * dt;

        const steps = Math.max(1,Math.ceil(Math.hypot(b.vx*dt,b.vy*dt)/12));
        const sx = b.vx*dt/steps;
        const sy = b.vy*dt/steps;

        for (let i=0;i<steps;i++) {
            b.x += sx;
            b.y += sy;

            if (collides(b.x,b.y,4)) {
                b.active = false;
                dropPickup(b);
                burst(b.x,b.y,7,"#c8a16d");
                break;
            }

            let candidates;
            if (matchMode === 'custom') {
                const owner = b.owner === 'player' ? player : [enemy, ...extraEnemies].find(actor => actor.id === b.owner || (b.owner === 'enemy' && actor === enemy));
                candidates = [player, enemy, ...extraEnemies].filter(candidate => {
                    if (candidate === owner || candidate.health <= 0) return false;
                    return !teamsEnabled || candidate.team !== owner?.team;
                });
            } else if (b.owner === "player") {
                candidates = challengerTeam ? [enemy] : [enemy, ...extraEnemies];
            } else if (b.owner === "enemy") {
                candidates = challengerTeam ? [player, ...extraEnemies] : (teamsEnabled ? [player] : [player, ...extraEnemies]);
            } else {
                candidates = challengerTeam ? [enemy] : (teamsEnabled ? [player] : [player, enemy, ...extraEnemies].filter(candidate => candidate !== extraEnemies.find(bot => bot.id === b.owner)));
            }
            const target = candidates.find(candidate => candidate.health > 0 && Math.hypot(b.x-candidate.x,b.y-candidate.y) < candidate.radius+5);

            if (target) {
                b.active = false;
                let damage = b.damage;
                const headX = target.x + Math.sin(target.angle) * 17;
                const headY = target.y - Math.cos(target.angle) * 17;
                const headshot = Math.hypot(b.x - headX, b.y - headY) <= 9;
                if (headshot) damage *= 2;
                if (target.blocking && Math.random() < target.blockChance) damage = 0;
                target.health = Math.max(0,target.health-damage);
                if (headshot && damage > 0) {
                    $("message").textContent = "HEADSHOT!";
                    setTimeout(() => {
                        if (running && !dead && $("message").textContent === "HEADSHOT!") $("message").textContent = "";
                    }, 700);
                }
                dropPickup(b);
                if (b.owner === "player") matchStats.hits++;
                playSound("hit");
                if (damage > 0) {
                    addBlood(target.x,target.y,damage >= 4 ? 28 : 14);
                    burst(target.x,target.y,Math.max(8,damage*5),"#9f1720");
                } else {
                    burst(target.x,target.y,8,"#d4bd83");
                }
                if (target.health <= 0 && b.weapon === "axe") target.headOff = true;
                shake = target.health <= 0 ? 14 : 5;

                if (target.health <= 0) {
                    if (matchMode === 'custom') {
                        checkCustomOutcome();
                    } else if (challengerTeam) {
                        if (target === enemy) winDuel();
                        else if (target === player) loseDuel();
                    } else if (b.owner === "player") {
                        if ([enemy, ...extraEnemies].every(opponent => opponent.health <= 0)) winDuel();
                    } else if (target === player) loseDuel();
                }
                break;
            }
        }

        b.life -= dt;

        if (b.life <= 0) {
            b.active = false;
            dropPickup(b);
        }
    }

    bullets = bullets.filter(b=>b.active);

    // PARTICLES
    for (const p of particles) {
        p.x += p.vx*dt;
        p.y += p.vy*dt;
        p.vx *= .94;
        p.vy *= .94;
        p.life -= dt;
    }
    particles = particles.filter(p=>p.life>0);

    // Recover dropped ammunition and thrown axes by walking over them.
    for (const pickup of pickups) {
        if (pickup.owner === "player" && Math.hypot(pickup.x-player.x,pickup.y-player.y)<30) {
            if (pickup.weapon === player.weapon && player.ammo === 0) {
                player.ammo = player.weapon === "revolver" ? 6 : 1;
                player.bullet = true;
                pickup.collected = true;
                burst(player.x,player.y,12,"#e7c47b");
$("message").textContent = player.weapon === "axe" ? "AXE RECOVERED!" : "AMMO RECOVERED!";
                setTimeout(()=>{ if(running && !dead) $("message").textContent=""; },700);
                updateHUD();
            }
        }
        if (pickup.owner === "enemy" && enemy.health > 0 && Math.hypot(pickup.x-enemy.x,pickup.y-enemy.y)<30) {
            if (pickup.weapon === enemy.weapon && !enemy.bullet) {
                enemy.ammo = enemy.weapon === "revolver" ? 6 : 1;
                enemy.bullet = true;
                pickup.collected = true;
            }
            burst(enemy.x,enemy.y,8,"#e7c47b");
            updateHUD();
        }
    }
    pickups = pickups.filter(p=>!p.collected);

    // The opponent must chase and retrieve its own spent round.
    if (shake>0) shake *= .85;

    updateHUD();
}

function chooseCustomTarget(actor) {
    const others = [player, enemy, ...extraEnemies].filter(candidate =>
        candidate !== actor && candidate.health > 0 && (!teamsEnabled || candidate.team !== actor.team)
    );
    if (!others.length) return null;
    return others.reduce((best, candidate) => {
        const distance = Math.hypot(candidate.x - actor.x, candidate.y - actor.y);
        const score = distance * (candidate === player && !teamsEnabled ? 1.35 : 1);
        return !best || score < best.score ? { actor: candidate, score } : best;
    }, null).actor;
}

function checkCustomOutcome() {
    if (player.health <= 0) {
        loseDuel();
        return;
    }
    const opponents = [enemy, ...extraEnemies].filter(actor => actor.health > 0 && (!teamsEnabled || actor.team !== player.team));
    if (!opponents.length) winDuel();
}

function updateExtraEnemies(dt) {
    for (const bot of extraEnemies) {
        if (bot.health <= 0) continue;
        const target = matchMode === 'custom' ? chooseCustomTarget(bot) : challengerTeam ? enemy : player;
        if (!target) continue;
        const dx = target.x - bot.x;
        const dy = target.y - bot.y;
        const distance = Math.hypot(dx, dy) || 1;
        const angle = Math.atan2(dy, dx);
        bot.angle = angle;
        bot.timer -= dt;
        const direction = distance > 300 ? 1 : distance < 210 ? -1 : 0;
        let vx = Math.cos(angle) * bot.speed * direction;
        let vy = Math.sin(angle) * bot.speed * direction;
        const side = Math.sin(time * 1.4 + bot.x) * 35;
        vx += Math.cos(angle + Math.PI / 2) * side;
        vy += Math.sin(angle + Math.PI / 2) * side;
        bot.vx += (vx - bot.vx) * Math.min(1, dt * 4);
        bot.vy += (vy - bot.vy) * Math.min(1, dt * 4);
        moveEntity(bot, bot.vx * dt, bot.vy * dt);
        bot.moving = Math.hypot(bot.vx, bot.vy) > 15;
        if (bot.moving) bot.walk += dt * 12;
        if (bot.timer <= 0 && distance < 600 && bot.bullet) {
            const weapon = bot.weapon;
            const spread = rand(-0.08, 0.08);
            bullets.push({
                x: bot.x + Math.cos(angle) * 25, y: bot.y + Math.sin(angle) * 25,
                vx: Math.cos(angle + spread) * 800 * bulletSpeedScale,
                vy: Math.sin(angle + spread) * 800 * bulletSpeedScale,
                owner: bot.id, weapon, damage: weapon === 'revolver' ? 1 : weapon === 'axe' ? 4 : 5,
                dropOnFinish: false, life: 2.5, active: true, rotation: angle, spin: 0
            });
            bot.bullet = false;
            bot.timer = rand(1.2, 2.1);
        } else if (!bot.bullet && bot.timer <= 0) {
            bot.bullet = true;
            bot.ammo = 1;
            bot.timer = rand(.5, 1.2);
        }
    }
}

function shootSide(owner, selectedLane = null) {
    if (!running || dead || sideDuel[owner + 'Fired']) return;
    const pose = owner === 'player' ? sideDuel.playerPose : sideDuel.enemyPose;
    const lane = selectedLane || (owner === 'player' || (owner === 'enemy' && gameMode === 'twoPlayer')
        ? (mouse.y < H / 2 ? 'high' : 'low')
        : (Math.random() < 0.5 ? 'high' : 'low'));
    const ground = H - 88;
    const y = ground - (lane === 'high' ? 72 : 24);
    sideDuel[owner + 'Fired'] = true;
    matchStats.shots++;
    playSound('single');
    const fromLeft = owner === 'player';
    sideDuel.bullets.push({ owner, x: fromLeft ? 190 : W - 190, y, vx: (fromLeft ? 1 : -1) * 780 * bulletSpeedScale, lane });
    if (owner === 'player') updateHUD();
}

function updateSideDuel(dt) {
    const ground = H - 88;
    if (keys.w || keys.arrowup || keys[' '] || sideAction.jump) sideDuel.playerPose = 'jump';
    else if (keys.s || keys.arrowdown || sideAction.duck) sideDuel.playerPose = 'duck';
    else sideDuel.playerPose = 'stand';
    if (gameMode === 'twoPlayer') {
        if (sideAction.jump2) sideDuel.enemyPose = 'jump';
        else if (sideAction.duck2) sideDuel.enemyPose = 'duck';
        else sideDuel.enemyPose = 'stand';
    }
    for (const particle of particles) {
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= .94;
        particle.vy *= .94;
        particle.life -= dt;
    }
    particles = particles.filter(particle => particle.life > 0);
    // The opponent chooses its own stance on a timer instead of copying the player's buttons.
    if (gameMode !== 'twoPlayer') {
        sideDuel.enemyThinkTimer -= dt;
        if (sideDuel.enemyThinkTimer <= 0) {
            const poses = ['stand', 'jump', 'duck'];
            sideDuel.enemyPose = poses[Math.floor(Math.random() * poses.length)];
            sideDuel.enemyThinkTimer = rand(0.45, 1.05);
        }
        sideDuel.enemyTimer -= dt;
        if (!sideDuel.enemyFired && sideDuel.enemyTimer <= 0) shootSide('enemy');
    }

    for (const bullet of sideDuel.bullets) {
        bullet.x += bullet.vx * dt;
        const targetX = bullet.owner === 'player' ? W - 190 : 190;
        if ((bullet.owner === 'player' && bullet.x >= targetX) || (bullet.owner === 'enemy' && bullet.x <= targetX)) {
            const targetPose = bullet.owner === 'player' ? sideDuel.enemyPose : sideDuel.playerPose;
            const dodged = (bullet.lane === 'low' && targetPose === 'jump') || (bullet.lane === 'high' && targetPose === 'duck');
            bullet.hit = !dodged;
            bullet.done = true;
            if (!dodged) {
                matchStats.hits += bullet.owner === 'player' ? 1 : 0;
                const hitX = bullet.owner === 'player' ? W - 190 : 190;
                const hitY = ground - (targetPose === 'jump' ? 90 : 24);
                addBlood(hitX, hitY, 30);
                burst(hitX, hitY, 24, '#9f1720');
                shake = 10;
                if (bullet.owner === 'player') {
                    enemy.health = 0;
                    winDuel();
                } else {
                    player.health = 0;
                    loseDuel();
                }
            }
        }
    }
    sideDuel.bullets = sideDuel.bullets.filter(b => !b.done);
    if (!dead && sideDuel.playerFired && sideDuel.enemyFired && sideDuel.bullets.length === 0) {
        sideDuel.resetTimer += dt;
        if (sideDuel.resetTimer >= .9) {
            sideDuel.playerFired = false;
            sideDuel.enemyFired = false;
            sideDuel.enemyTimer = .8;
            sideDuel.enemyThinkTimer = rand(0.25, 0.7);
            sideDuel.resetTimer = 0;
            sideDuel.playerPose = sideDuel.enemyPose = 'stand';
            $('message').textContent = 'NEW SHOTS — DUCK OR JUMP!';
            setTimeout(() => { if (running && !dead) $('message').textContent = ''; }, 800);
        }
    }
}

function drawSideDuel() {
    const ground = H - 88;
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, '#9b6741'); sky.addColorStop(.68, '#d0a16b'); sky.addColorStop(1, '#342318');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#654126'; ctx.fillRect(0, ground, W, H - ground);
    ctx.fillStyle = '#372318'; ctx.fillRect(0, ground - 8, W, 12);
    ctx.fillStyle = '#f2d4a0'; ctx.font = 'bold 18px monospace'; ctx.textAlign = 'center';
    ctx.fillText('ONE SHOT EACH — JUMP OVER LOW SHOTS, DUCK UNDER HIGH SHOTS', W / 2, 48);

    for (const pool of bloodPools) {
        ctx.save();
        ctx.translate(pool.x, pool.y);
        ctx.rotate(pool.rotation);
        ctx.fillStyle = '#5d1017bb';
        ctx.beginPath(); ctx.ellipse(0, 0, pool.size, pool.size * .58, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
    const drawSideActor = (actor, x, pose, isPlayer) => {
        const y = ground - 20 - (pose === 'jump' ? 75 : 0);
        ctx.save();
        if (pose === 'duck') {
            ctx.translate(x, y + 18);
            ctx.scale(1, .62);
            ctx.translate(-x, -(y + 18));
        }
        // Keep the top-down character upright in the side-view scene.
        if (!isPlayer) {
            // Mirror horizontally so the opponent faces left without turning upside down.
            ctx.translate(x, 0);
            ctx.scale(-1, 1);
            ctx.translate(-x, 0);
        }
        drawCharacter({...actor, x, y, angle: 0, moving: false}, isPlayer);
        ctx.restore();
    };
    drawSideActor(player, 190, sideDuel.playerPose, true);
    drawSideActor(enemy, W - 190, sideDuel.enemyPose, false);
    for (const bullet of sideDuel.bullets) {
        ctx.fillStyle = '#fff0be'; ctx.shadowBlur = 12; ctx.shadowColor = '#ffd782';
        ctx.beginPath(); ctx.ellipse(bullet.x, bullet.y, 12, 5, 0, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    }
    for (const particle of particles) {
        ctx.globalAlpha = clamp(particle.life / particle.max, 0, 1);
        ctx.fillStyle = particle.color;
        ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#f2d4a0'; ctx.font = '14px monospace';
    if (!document.body.classList.contains('mobile')) ctx.fillText('W / ↑ / SPACE: JUMP     S / ↓: DUCK     CLICK: FIRE ONCE', W / 2, H - 22);
}

function updateEnemy(dt) {
    if (enemy.health <= 0) return;

    const settings = {
        easy: {speed:.78, fire:1.5, dodge:0, block:0},
        medium: {speed:1, fire:1, dodge:.2, block:.1},
        hard: {speed:1.25, fire:.78, dodge:.55, block:.32},
        xhard: {speed:1.5, fire:.58, dodge:.85, block:.6}
    }[difficulty];
    enemy.blocking = false;
    enemy.blockChance = settings.block;
    const incoming = bullets.some(b => b.owner === "player" && Math.hypot(b.x-enemy.x,b.y-enemy.y)<190);
    if (incoming && Math.random() < settings.block) enemy.blocking = true;

            const targets = matchMode === 'custom' ? null : challengerTeam ? [player, ...extraEnemies].filter(target => target.health > 0) : [player];
    const target = matchMode === 'custom' ? chooseCustomTarget(enemy) : targets.sort((a, b) => Math.hypot(a.x - enemy.x, a.y - enemy.y) - Math.hypot(b.x - enemy.x, b.y - enemy.y))[0];
    const dx = target.x-enemy.x;
    const dy = target.y-enemy.y;
    const dist = Math.hypot(dx,dy);
    const angle = Math.atan2(dy,dx);

    enemy.angle = angle;
    enemy.timer -= dt;

    let vx=0, vy=0;

    const aiSpeed = enemy.speed * settings.speed;
    if (enemy.bullet) {
        // Keep distance, circle, and dodge incoming shots at higher difficulties.
        if (dist>340) {
            vx += Math.cos(angle)*aiSpeed;
            vy += Math.sin(angle)*aiSpeed;
        } else if (dist<240) {
            vx -= Math.cos(angle)*aiSpeed;
            vy -= Math.sin(angle)*aiSpeed;
        }
        if (incoming && Math.random() < settings.dodge) {
            const dodgeDir = Math.random() < .5 ? -1 : 1;
            vx += Math.cos(angle+Math.PI/2)*aiSpeed*dodgeDir;
            vy += Math.sin(angle+Math.PI/2)*aiSpeed*dodgeDir;
        }

        const side = Math.sin(time*1.6+round);
        vx += Math.cos(angle+Math.PI/2)*side*55;
        vy += Math.sin(angle+Math.PI/2)*side*55;

        if (dist<600 && enemy.timer<=0) {
            shootEnemy();
            enemy.timer = Math.max(.55,(2.3-round*.09)*settings.fire);
        }
    } else {
            const spent = pickups.find(p=>p.owner === "enemy" && p.weapon === enemy.weapon);
        enemy.emptyTimer = (enemy.emptyTimer || 0) + dt;
        if (spent && enemy.emptyTimer < 4) {
            const a = Math.atan2(spent.y-enemy.y,spent.x-enemy.x);
            vx = Math.cos(a)*enemy.speed*1.25;
            vy = Math.sin(a)*enemy.speed*1.25;
        } else if (enemy.emptyTimer >= 4) {
            // Recover from unreachable pickups so the CPU never stays disarmed.
            pickups = pickups.filter(p => !(p.owner === "enemy" && p.weapon === enemy.weapon));
            enemy.ammo = enemy.weapon === "revolver" ? 6 : 1;
            enemy.bullet = true;
            enemy.emptyTimer = 0;
        }
    }

    const l = Math.hypot(vx,vy);
    if (l>enemy.speed*1.3) {
        vx = vx/l*enemy.speed*1.3;
        vy = vy/l*enemy.speed*1.3;
    }

    enemy.vx += (vx-enemy.vx)*Math.min(1,dt*5);
    enemy.vy += (vy-enemy.vy)*Math.min(1,dt*5);

    const oldX = enemy.x, oldY = enemy.y;
    moveEntity(enemy,enemy.vx*dt,enemy.vy*dt);
    if (Math.hypot(enemy.x-oldX, enemy.y-oldY) < .5 && Math.hypot(vx,vy) > 20) {
        enemy.stuckTimer = (enemy.stuckTimer || 0) + dt;
        if (enemy.stuckTimer > .7) {
            const escape = rand(0, Math.PI * 2);
            moveEntity(enemy, Math.cos(escape) * enemy.speed * dt * 1.5, Math.sin(escape) * enemy.speed * dt * 1.5);
            enemy.stuckTimer = 0;
        }
    } else enemy.stuckTimer = 0;

    if (Math.hypot(enemy.vx,enemy.vy)>10) enemy.walk+=dt*12;
}

function winDuel() {
    if (dead) return;
    dead = true;
    lastDuelWon = true;
    wins++;
    playSound("win");
    updateHUD();
    $("message").textContent = "DEAD EYE!";
    $("result").textContent = "VICTORY";
    $("resultText").textContent = `Duel ${String(round).padStart(2,"0")} won. Ready for the next round?`;
    $("restart").textContent = "NEXT DUEL";
    setTimeout(()=> {
        $("gameover").style.display="flex";
    },900);
}

function loseDuel() {
    if (dead) return;
    dead = true;
    lastDuelWon = false;
    playSound("lose");
    updateHUD();
    $("message").textContent = "WASTED";
    $("result").textContent = "DEFEAT";
    $("resultText").textContent = `Duel ${String(round).padStart(2,"0")} lost. Take another shot?`;
    $("restart").textContent = "REMATCH";
    setTimeout(()=> {
        $("message").textContent = "";
        $("gameover").style.display="flex";
    },900);
}

// WORLD RENDERING

function drawFloor() {
    ctx.fillStyle="#59402a";
    ctx.fillRect(0,0,WORLD.w,WORLD.h);

    // Individual wooden floorboards
    for (let y=0;y<WORLD.h;y+=54) {
        ctx.fillStyle = y%108===0 ? "#694a30":"#61442c";
        ctx.fillRect(0,y,WORLD.w,52);

        ctx.strokeStyle="#352519";
        ctx.lineWidth=2;
        ctx.beginPath();
        ctx.moveTo(0,y+52);
        ctx.lineTo(WORLD.w,y+52);
        ctx.stroke();

        for (let x=(y%108===0?0:150);x<WORLD.w;x+=300) {
            ctx.strokeStyle="#3f2a1a";
            ctx.lineWidth=2;
            ctx.beginPath();
            ctx.moveTo(x,y);
            ctx.lineTo(x,y+52);
            ctx.stroke();
        }
    }

    // Floor texture
    for(let i=0;i<180;i++) {
        const x=(i*193)%WORLD.w;
        const y=(i*317)%WORLD.h;
        ctx.fillStyle="#23180e22";
        ctx.fillRect(x,y,rand(10,45),2);
    }

    // Saloon boundary
    ctx.strokeStyle="#25170e";
    ctx.lineWidth=65;
    ctx.strokeRect(25,25,WORLD.w-50,WORLD.h-50);

    ctx.strokeStyle="#9b7448";
    ctx.lineWidth=8;
    ctx.strokeRect(45,45,WORLD.w-90,WORLD.h-90);
}

function drawObstacle(o) {
    ctx.save();

    ctx.fillStyle="#21150e99";
    ctx.fillRect(o.x+9,o.y+13,o.w,o.h);

    if(o.type==="table") {
        ctx.fillStyle="#382116";
        ctx.fillRect(o.x+12,o.y+12,o.w-24,o.h-12);

        ctx.fillStyle="#9a6739";
        ctx.fillRect(o.x,o.y,o.w,o.h);

        ctx.fillStyle="#bd8951";
        ctx.fillRect(o.x+7,o.y+6,o.w-14,o.h-12);

        ctx.strokeStyle="#50301a";
        ctx.lineWidth=5;
        ctx.strokeRect(o.x+7,o.y+6,o.w-14,o.h-12);

        ctx.fillStyle="#704524";
        for(let i=0;i<4;i++) {
            ctx.fillRect(o.x+15+i*(o.w-30)/3,o.y+15,3,o.h-30);
        }
    }

    if(o.type==="barrel") {
        const cx=o.x+o.w/2;
        const top=o.y+12;
        const bottom=o.y+o.h-12;

        // Shaded barrel sides and raised lid give cover a faux-3D shape.
        ctx.fillStyle="#563019";
        ctx.beginPath();
        ctx.moveTo(o.x+8,top+8);
        ctx.lineTo(o.x+o.w-8,top+8);
        ctx.lineTo(o.x+o.w-8,bottom-8);
        ctx.lineTo(o.x+8,bottom-8);
        ctx.closePath();
        ctx.fill();

        const wood=ctx.createLinearGradient(o.x,0,o.x+o.w,0);
        wood.addColorStop(0,"#60351d");
        wood.addColorStop(.45,"#a36535");
        wood.addColorStop(1,"#442517");
        ctx.fillStyle=wood;
        ctx.fillRect(o.x+8,top+8,o.w-16,bottom-top-16);

        ctx.fillStyle="#b47b46";
        ctx.beginPath();
        ctx.ellipse(cx,top+8,o.w/2-5,14,0,0,Math.PI*2);
        ctx.fill();
        ctx.strokeStyle="#382217";
        ctx.lineWidth=4;
        ctx.stroke();

        ctx.strokeStyle="#d2a36a";
        ctx.lineWidth=5;
        for(const yy of [top+24,bottom-22]) {
            ctx.beginPath();
            ctx.moveTo(o.x+8,yy);
            ctx.lineTo(o.x+o.w-8,yy);
            ctx.stroke();
        }
        ctx.strokeStyle="#714626";
        ctx.lineWidth=2;
        for(let i=1;i<4;i++) {
            const xx=o.x+i*o.w/4;
            ctx.beginPath();
            ctx.moveTo(xx,top+16);
            ctx.lineTo(xx,bottom-16);
            ctx.stroke();
        }
    }

    if(o.type==="shack") {
        const roofOverhang=18;
        const roofPeak=o.y-45;
        // Deep shadow and side walls make each shack read as a solid structure.
        ctx.fillStyle="#170e09aa";
        ctx.fillRect(o.x+18,o.y+o.h-4,o.w,o.h*.28);

        ctx.fillStyle="#50301b";
        ctx.beginPath();
        ctx.moveTo(o.x+12,o.y+25);
        ctx.lineTo(o.x+o.w-12,o.y+25);
        ctx.lineTo(o.x+o.w-12,o.y+o.h);
        ctx.lineTo(o.x+12,o.y+o.h);
        ctx.closePath();
        ctx.fill();

        const wall=ctx.createLinearGradient(o.x,0,o.x+o.w,0);
        wall.addColorStop(0,"#60381f");
        wall.addColorStop(.55,"#a16a3d");
        wall.addColorStop(1,"#4c2b18");
        ctx.fillStyle=wall;
        ctx.fillRect(o.x+12,o.y+25,o.w-24,o.h-25);

        ctx.strokeStyle="#392114";
        ctx.lineWidth=5;
        for(let x=o.x+32;x<o.x+o.w-15;x+=27) {
            ctx.beginPath();
            ctx.moveTo(x,o.y+31);
            ctx.lineTo(x,o.y+o.h-4);
            ctx.stroke();
        }

        // Front door and windows.
        ctx.fillStyle="#29170f";
        ctx.fillRect(o.x+o.w*.42,o.y+o.h*.48,o.w*.2,o.h*.52);
        ctx.fillStyle="#e4a951";
        ctx.fillRect(o.x+o.w*.16,o.y+o.h*.43,30,24);
        ctx.fillRect(o.x+o.w*.73,o.y+o.h*.43,30,24);
        ctx.strokeStyle="#392114";
        ctx.lineWidth=4;
        ctx.strokeRect(o.x+o.w*.16,o.y+o.h*.43,30,24);
        ctx.strokeRect(o.x+o.w*.73,o.y+o.h*.43,30,24);

        // Raised pitched roof with visible front and side faces.
        ctx.fillStyle="#382116";
        ctx.beginPath();
        ctx.moveTo(o.x-roofOverhang,o.y+31);
        ctx.lineTo(o.x+o.w*.5,o.y+roofPeak);
        ctx.lineTo(o.x+o.w+roofOverhang,o.y+31);
        ctx.lineTo(o.x+o.w+roofOverhang,o.y+48);
        ctx.lineTo(o.x+o.w*.5,o.y+roofPeak+20);
        ctx.lineTo(o.x-roofOverhang,o.y+48);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle="#754426";
        ctx.beginPath();
        ctx.moveTo(o.x-roofOverhang,o.y+31);
        ctx.lineTo(o.x+o.w*.5,o.y+roofPeak);
        ctx.lineTo(o.x+o.w*.5,o.y+roofPeak+20);
        ctx.lineTo(o.x-roofOverhang,o.y+48);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle="#9b6035";
        ctx.beginPath();
        ctx.moveTo(o.x+o.w*.5,o.y+roofPeak);
        ctx.lineTo(o.x+o.w+roofOverhang,o.y+31);
        ctx.lineTo(o.x+o.w+roofOverhang,o.y+48);
        ctx.lineTo(o.x+o.w*.5,o.y+roofPeak+20);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle="#392114";
        ctx.lineWidth=4;
        ctx.stroke();
    }

    if(o.type==="pillar") {
        ctx.fillStyle="#352318";
        ctx.fillRect(o.x,o.y,o.w,o.h);
        ctx.fillStyle="#a0784a";
        ctx.fillRect(o.x+12,o.y+5,o.w-24,o.h-10);
    }

    ctx.restore();
}

function drawPickup(p) {
    ctx.save();
    ctx.translate(p.x,p.y);
    ctx.rotate(p.rotation || 0);
    ctx.shadowBlur=12;
    ctx.shadowColor=p.weapon === "axe" ? "#c9d4d0" : "#ffd782";
    ctx.fillStyle=p.weapon === "axe" ? "#b6c0be" : "#f1c56f";
    if (p.weapon === "axe") {
        ctx.beginPath();
        ctx.moveTo(-10,6); ctx.lineTo(-3,-8); ctx.lineTo(10,-10);
        ctx.lineTo(7,2); ctx.lineTo(0,7); ctx.closePath(); ctx.fill();
        ctx.fillStyle="#684326"; ctx.fillRect(-2,2,4,13);
    } else {
        ctx.beginPath();
        ctx.ellipse(0,0,9,5,-.3,0,Math.PI*2);
        ctx.fill();
        ctx.strokeStyle="#fff0c2"; ctx.lineWidth=1; ctx.stroke();
    }
    ctx.restore();
}

function drawBullet(b) {
    ctx.save();
    ctx.translate(b.x,b.y);
    ctx.rotate(b.weapon === "axe" ? b.rotation : Math.atan2(b.vy,b.vx));
    if (b.weapon === "axe") {
        ctx.shadowBlur=12;
        ctx.shadowColor="#d6e0dc";
        ctx.fillStyle="#704326";
        ctx.fillRect(-10,-2,22,4);
        ctx.fillStyle="#bec9c5";
        ctx.beginPath();
        ctx.moveTo(7,-3); ctx.lineTo(11,-13); ctx.lineTo(22,-11);
        ctx.lineTo(19,0); ctx.lineTo(22,11); ctx.lineTo(11,13);
        ctx.lineTo(7,3); ctx.closePath(); ctx.fill();
        ctx.strokeStyle="#eef3ed"; ctx.lineWidth=1; ctx.stroke();
        ctx.restore();
        return;
    }
    ctx.translate(-b.x,-b.y);

    // Bullet shadow
    ctx.fillStyle="#0009";
    ctx.beginPath();
    ctx.ellipse(b.x+3,b.y+5,9,5,0,0,Math.PI*2);
    ctx.fill();

    // Metallic bullet casing
    const g=ctx.createLinearGradient(b.x-8,b.y-5,b.x+8,b.y+5);
    if (b.weapon === "revolver") {
        g.addColorStop(0,"#80401f");
        g.addColorStop(.5,"#ffad50");
        g.addColorStop(1,"#9c5122");
    } else {
        g.addColorStop(0,"#614b2c");
        g.addColorStop(.5,"#fff0be");
        g.addColorStop(1,"#8c6939");
    }

    ctx.fillStyle=g;
    ctx.beginPath();
    ctx.ellipse(b.x,b.y,9,5,-.3,0,Math.PI*2);
    ctx.fill();

    ctx.strokeStyle="#fff0c2";
    ctx.lineWidth=1;
    ctx.stroke();

    // Glow
    ctx.shadowBlur=13;
    ctx.shadowColor=b.weapon === "revolver" ? "#ff8138" : "#fff0be";
    ctx.fillStyle="#fff0be";
    ctx.fillRect(b.x-2,b.y-2,4,2);

    ctx.restore();
}

function drawCharacter(e,isPlayer) {
    if(e.health<=0) {
        ctx.save();
        ctx.translate(e.x,e.y);
        ctx.rotate(e.angle+Math.PI/2);
        ctx.fillStyle="#221b18";
        ctx.beginPath();
        ctx.ellipse(0,0,26,13,0,0,Math.PI*2);
        ctx.fill();
        ctx.fillStyle=e.color;
        ctx.beginPath();
        ctx.ellipse(4,0,12,9,0,0,Math.PI*2);
        ctx.fill();
        if (e.headOff) {
            ctx.fillStyle="#c68c5c";
            ctx.beginPath();
            ctx.arc(31,-10,8,0,Math.PI*2);
            ctx.fill();
            ctx.fillStyle="#592419";
            ctx.beginPath();
            ctx.ellipse(31,-16,12,4,0,0,Math.PI*2);
            ctx.fill();
        }
        ctx.restore();
        return;
    }

    ctx.save();
    ctx.translate(e.x,e.y);

    // Shadow
    ctx.fillStyle="#160d09aa";
    ctx.beginPath();
    ctx.ellipse(5,9,23,13,0,0,Math.PI*2);
    ctx.fill();

    // Walking animation
    const swing=e.moving?Math.sin(e.walk)*5:0;

    // Legs
    ctx.save();
    ctx.rotate(e.angle);

    ctx.strokeStyle="#211912";
    ctx.lineWidth=9;
    ctx.lineCap="round";

    ctx.beginPath();
    ctx.moveTo(-5,7);
    ctx.lineTo(-8+swing,20);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(5,7);
    ctx.lineTo(8-swing,20);
    ctx.stroke();

    // Body
    ctx.fillStyle=e.color;
    ctx.beginPath();
    ctx.ellipse(0,0,13,17,0,0,Math.PI*2);
    ctx.fill();

    ctx.strokeStyle="#151413";
    ctx.lineWidth=2;
    ctx.stroke();

    // Belt
    ctx.strokeStyle="#d1a75d";
    ctx.lineWidth=3;
    ctx.beginPath();
    ctx.moveTo(-10,6);
    ctx.lineTo(10,6);
    ctx.stroke();

    // Arms
    ctx.strokeStyle=e.color;
    ctx.lineWidth=7;
    ctx.beginPath();
    ctx.moveTo(0,-3);
    ctx.lineTo(19,0);
    ctx.stroke();

    // Held weapon matches the selected loadout.
    if (e.weapon === "axe" && e.bullet) {
        ctx.strokeStyle="#684326";
        ctx.lineWidth=4;
        ctx.beginPath(); ctx.moveTo(16,0); ctx.lineTo(31,-12); ctx.stroke();
        ctx.fillStyle="#bec9c5";
        ctx.beginPath();
        ctx.moveTo(27,-10); ctx.lineTo(31,-22); ctx.lineTo(43,-19);
        ctx.lineTo(40,-9); ctx.lineTo(43,1); ctx.lineTo(31,3); ctx.closePath(); ctx.fill();
        ctx.strokeStyle="#eef3ed"; ctx.lineWidth=1; ctx.stroke();
    } else {
        ctx.fillStyle="#171514";
        ctx.fillRect(15,-5,20,6);
        ctx.fillStyle="#aaa49a";
        ctx.fillRect(24,-4,10,3);
        if (e.weapon === "revolver") {
            ctx.fillStyle="#a27a48";
            ctx.fillRect(18,1,7,5);
            ctx.fillStyle="#c4a06b";
            ctx.fillRect(19,-6,4,2);
        }
    }

    // Head
    ctx.fillStyle="#c68c5c";
    ctx.beginPath();
    ctx.arc(0,-17,10,0,Math.PI*2);
    ctx.fill();

    // Hat brim
    ctx.fillStyle="#2c1b10";
    ctx.beginPath();
    ctx.ellipse(0,-24,18,5,0,0,Math.PI*2);
    ctx.fill();

    ctx.fillStyle=isPlayer?"#353c3d":"#592419";
    ctx.beginPath();
    ctx.ellipse(0,-27,11,6,0,0,Math.PI*2);
    ctx.fill();

    // Hat top
    ctx.fillRect(-8,-36,16,10);

    // Hat band
    ctx.fillStyle="#c9a46d";
    ctx.fillRect(-8,-28,16,2);

    ctx.restore();

    if (gameMode === "twoPlayer") {
        ctx.save();
        ctx.fillStyle = "#130d09cc";
        ctx.fillRect(-24,-55,48,17);
        ctx.fillStyle = isPlayer ? "#d5e5ef" : "#ee8068";
        ctx.font = "bold 11px monospace";
        ctx.textAlign = "center";
        ctx.fillText(isPlayer ? "P1" : "P2",0,-43);
        ctx.restore();
    }

    // Character outline light
    ctx.restore();
}

function drawLight(focus = player) {
    const gradient=ctx.createRadialGradient(
        focus.x,focus.y,80,
        focus.x,focus.y,850
    );

    gradient.addColorStop(0,"rgba(0,0,0,0)");
    gradient.addColorStop(.55,"rgba(12,8,5,.13)");
    gradient.addColorStop(1,"rgba(0,0,0,.7)");

    ctx.fillStyle=gradient;
    ctx.fillRect(0,0,WORLD.w,WORLD.h);

    // Warm saloon lighting
    const lamps=[
        [300,180],[900,180],[1500,180],
        [300,1020],[900,1020],[1500,1020]
    ];

    for(const [x,y] of lamps) {
        const g=ctx.createRadialGradient(x,y,5,x,y,260);
        g.addColorStop(0,"rgba(255,176,82,.13)");
        g.addColorStop(1,"rgba(255,176,82,0)");
        ctx.fillStyle=g;
        ctx.fillRect(x-260,y-260,520,520);
    }
}

function drawAim() {
    if(!player.bullet || !running || dead) return;

    const target=screenToWorld(mouse.x,mouse.y);

    ctx.save();
    ctx.setLineDash([7,12]);
    ctx.strokeStyle="#f5d5a055";
    ctx.lineWidth=2;
    ctx.beginPath();
    ctx.moveTo(player.x,player.y);
    ctx.lineTo(target.x,target.y);
    ctx.stroke();
    if (gameMode === "twoPlayer" && controlMode === "mobile") {
        const aimLength = 220;
        ctx.setLineDash([4,8]);
        ctx.strokeStyle = "#ee806899";
        ctx.beginPath();
        ctx.moveTo(enemy.x,enemy.y);
        ctx.lineTo(enemy.x + Math.cos(enemy.angle) * aimLength, enemy.y + Math.sin(enemy.angle) * aimLength);
        ctx.stroke();
    }
    ctx.restore();
}

function drawSeparationIndicator(cameraView) {
    if (gameMode !== "twoPlayer" || !enemy) {
        separationFade = Math.max(0, separationFade - .08);
        return;
    }

    const enemyX = enemy.x - cameraView.x;
    const enemyY = enemy.y - cameraView.y;
    const outside = enemyX < 24 || enemyX > W - 24 || enemyY < 24 || enemyY > H - 24;
    separationFade += ((outside ? 1 : 0) - separationFade) * .12;
    if (separationFade < .015) return;

    ctx.save();
    ctx.globalAlpha = separationFade;

    // The divider and markers act as a simple off-screen player locator.
    ctx.fillStyle = "rgba(14, 9, 6, .58)";
    ctx.fillRect(W / 2 - 2, 0, 4, H);
    ctx.strokeStyle = "#e7bd78aa";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2, 0);
    ctx.lineTo(W / 2, H);
    ctx.stroke();

    const playerY = clamp(player.y - cameraView.y, 28, H - 28);
    ctx.fillStyle = "#d5e5ef";
    ctx.beginPath();
    ctx.arc(W / 2, playerY, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText("P1", W / 2, playerY - 12);

    const markerX = clamp(enemyX, 20, W - 20);
    const markerY = clamp(enemyY, 24, H - 24);
    const pointsLeft = enemyX < 0;
    const pointsRight = enemyX > W;
    const pointsUp = enemyY < 0;
    const pointsDown = enemyY > H;
    ctx.fillStyle = "#ee8068";
    ctx.beginPath();
    if (pointsLeft) {
        ctx.moveTo(markerX - 9, markerY);
        ctx.lineTo(markerX + 6, markerY - 8);
        ctx.lineTo(markerX + 6, markerY + 8);
    } else if (pointsRight) {
        ctx.moveTo(markerX + 9, markerY);
        ctx.lineTo(markerX - 6, markerY - 8);
        ctx.lineTo(markerX - 6, markerY + 8);
    } else if (pointsUp) {
        ctx.moveTo(markerX, markerY - 9);
        ctx.lineTo(markerX - 8, markerY + 6);
        ctx.lineTo(markerX + 8, markerY + 6);
    } else {
        ctx.moveTo(markerX, markerY + 9);
        ctx.lineTo(markerX - 8, markerY - 6);
        ctx.lineTo(markerX + 8, markerY - 6);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff0d3";
    ctx.fillText("P2", markerX, markerY - 13);
    ctx.restore();
}

function drawWorldView(viewX, viewWidth, viewCamera, splitView = false, lightFocus = player) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(viewX, 0, viewWidth, H);
    ctx.clip();
    const sx = shake > 1 ? rand(-shake, shake) : 0;
    const sy = shake > 1 ? rand(-shake, shake) : 0;
    ctx.translate(viewX - viewCamera.x + sx, -viewCamera.y + sy);

    drawFloor();
    for (const pool of bloodPools) {
        ctx.save();
        ctx.translate(pool.x,pool.y);
        ctx.rotate(pool.rotation);
        ctx.fillStyle="#5d1017bb";
        ctx.beginPath();
        ctx.ellipse(0,0,pool.size,pool.size*.58,0,0,Math.PI*2);
        ctx.fill();
        ctx.fillStyle="#8d1820cc";
        for (let i=0;i<5;i++) {
            ctx.beginPath();
            ctx.arc(Math.cos(i*1.25)*pool.size*.72,Math.sin(i*1.25)*pool.size*.52,3+i%3,0,Math.PI*2);
            ctx.fill();
        }
        ctx.restore();
    }
    for (const o of obstacles) drawObstacle(o);
    drawAim();
    for (const b of bullets) drawBullet(b);
    for (const p of pickups) drawPickup(p);
    drawCharacter(player,true);
    if(enemy) drawCharacter(enemy,false);
    for (const bot of extraEnemies) drawCharacter(bot, false);
    for(const p of particles) {
        ctx.globalAlpha=clamp(p.life/p.max,0,1);
        ctx.fillStyle=p.color;
        ctx.beginPath();
        ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
        ctx.fill();
    }
    ctx.globalAlpha=1;
    drawLight(lightFocus);
    ctx.restore();
}

function render() {
    ctx.clearRect(0,0,W,H);
    if (matchMode === 'oneBullet' && running) { drawSideDuel(); return; }
    const split = splitScreenActive();
    separationFade += ((split ? 1 : 0) - separationFade) * .12;

    if (split) {
        const half = W / 2;
        drawWorldView(0, half, camera(player, half), true, player);
        drawWorldView(half, W - half, camera(enemy, W - half), true, enemy);
    } else {
        const viewCamera = gameMode === "twoPlayer" ? camera(player, W, true) : camera();
        const lightFocus = gameMode === "twoPlayer" ? {x:(player.x + enemy.x) / 2, y:(player.y + enemy.y) / 2} : player;
        drawWorldView(0, W, viewCamera, false, lightFocus);
    }

    // This divider is a screen overlay only; it never affects movement or collisions.
    if (separationFade > .01) {
        ctx.save();
        ctx.globalAlpha = separationFade;
        ctx.fillStyle = "rgba(14, 9, 6, .58)";
        ctx.fillRect(W / 2 - 2, 0, 4, H);
        ctx.strokeStyle = "#e7bd78aa";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(W / 2, 0);
        ctx.lineTo(W / 2, H);
        ctx.stroke();
        ctx.restore();
    }

    if(running && !dead && matchMode !== 'oneBullet') {
        ctx.save();
        ctx.strokeStyle="#f4d7a7";
        ctx.lineWidth=1.5;
        ctx.beginPath();
        ctx.arc(mouse.x,mouse.y,9,0,Math.PI*2);
        ctx.moveTo(mouse.x-16,mouse.y);
        ctx.lineTo(mouse.x-5,mouse.y);
        ctx.moveTo(mouse.x+5,mouse.y);
        ctx.lineTo(mouse.x+16,mouse.y);
        ctx.moveTo(mouse.x,mouse.y-16);
        ctx.lineTo(mouse.x,mouse.y-5);
        ctx.moveTo(mouse.x,mouse.y+5);
        ctx.lineTo(mouse.x,mouse.y+16);
        ctx.stroke();
        ctx.restore();
    }
}

function loop(timestamp) {
    const dt=Math.min((timestamp-lastTime)/1000||0,.033);
    lastTime=timestamp;

    if(running) update(dt);
    render();

    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
