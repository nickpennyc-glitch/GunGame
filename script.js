/* Local serif/monospace fallbacks keep the interface readable offline. */

* {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
}

body {
    overflow: hidden;
    background: #17100b;
    color: #f2d4a0;
    font-family: 'Special Elite', monospace;
}

canvas {
    position: fixed;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    cursor: crosshair;
}

#title, #gameover, #customPage {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    background: radial-gradient(ellipse, rgba(69,39,19,.82), rgba(0,0,0,.96));
    transition: opacity .5s;
    padding: 20px;
}

#title { overflow-y: auto; justify-content: flex-start; padding-top: 28px; }
#customPage { display: none; overflow-y: auto; justify-content: flex-start; padding: 28px 20px; }
#customPage h2 { font-family: 'Rye', serif; color: #e7bd78; font-size: clamp(28px, 6vw, 48px); margin: 12px 0 24px; }
#customSettingsPage { width: min(460px, 90vw); }
.custom-intro { width: min(460px, 90vw); margin: 0 0 20px; color: #d0a879; font: 11px/1.7 monospace; letter-spacing: 1px; }
.page-buttons { display: flex; justify-content: center; gap: 12px; flex-wrap: wrap; }
#title h1, #gameover h1 {
    font-family: 'Rye', serif;
    font-size: clamp(55px, 9vw, 110px);
    line-height: .95;
    color: #e7bd78;
    text-shadow: 0 6px 0 #603719, 0 12px 35px black;
    letter-spacing: 3px;
    margin: 25px 0;
}

.small {
    letter-spacing: 9px;
    color: #b88a50;
    font-size: 14px;
}

.subtitle {
    font-size: 15px;
    letter-spacing: 7px;
    color: #c8a16d;
    margin-bottom: 25px;
}

.weapon-choice {
    color: #e7bd78;
    font-size: 11px;
    letter-spacing: 3px;
    margin-bottom: 8px;
}

#weaponChoice, #player2WeaponChoice, #controlMode, #gameMode, #difficulty, #matchMode, #customShooters, #customHealth, #customTeams, #juggernautRole {
    width: min(460px, 90vw);
    padding: 12px;
    margin-bottom: 18px;
    border: 1px solid #b77b3f;
    background: #21150e;
    color: #f2d4a0;
    font: 12px monospace;
}

#customSettings, #juggernautSettings { display: none; width: min(460px, 90vw); order: 1; position: relative; z-index: 2; pointer-events: auto; }
#customSettings.active, #juggernautSettings.active { display: flex; flex-direction: column; align-items: center; }
#customSettings select, #customSettings input { pointer-events: auto; }
.team-setting { display: none; width: 100%; flex-direction: column; align-items: center; }
.team-setting.active { display: flex; }
.team-setting select, .player-team-setting select { width: min(460px, 90vw); }
.player-team-setting { display: none; width: 100%; flex-direction: column; align-items: center; }
.player-team-setting.active { display: flex; }
#start { order: 2; }
.mode-settings input[type="range"] { width: min(460px, 90vw); accent-color: #b77b3f; margin: 0 0 4px; }
.mode-settings output { font: 11px monospace; margin: 0 0 12px; color: #e7bd78; }

button {
    font-family: 'Rye', serif;
    background: linear-gradient(#b77b3f, #70401e);
    color: #fff0d3;
    border: 2px solid #e0b477;
    padding: 17px 35px;
    font-size: 17px;
    cursor: pointer;
    box-shadow: 0 6px 20px #0009;
    transition: .2s;
}

button:hover {
    transform: translateY(-3px);
    filter: brightness(1.3);
}

#hud {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 3;
    display: flex;
    justify-content: space-between;
    padding: 25px 35px;
    pointer-events: none;
    background: linear-gradient(#100b08dd, transparent);
    text-shadow: 0 2px 5px black;
}

.hud-label {
    font-size: 11px;
    letter-spacing: 3px;
    color: #b78a55;
    margin-bottom: 8px;
}

#ammo, #enemyAmmo {
    font-family: 'Rye', serif;
    font-size: 22px;
    color: #f2d4a0;
}

#status, #health, #enemyHealth {
    color: #c69a61;
    font-size: 11px;
    margin-top: 8px;
}

.hud-center {
    text-align: center;
    font-family: 'Rye', serif;
    font-size: 22px;
}

#score, #weaponName, #enemyWeapon {
    font-size: 12px;
    margin-top: 8px;
    color: #c69a61;
}

#matchStats {
    margin-top: 7px;
    color: #c69a61;
    font: 9px monospace;
    letter-spacing: .5px;
}

#mobileHelp {
    display: none;
    position: fixed;
    z-index: 3;
    bottom: 12px;
    width: 100%;
    text-align: center;
    color: #d0a879;
    font: 10px monospace;
    text-shadow: 0 2px 5px #000;
    pointer-events: none;
}

body.mobile #mobileHelp { display: block; }
body.mobile #controls { display: none; }
body.one-bullet #controls, body.one-bullet #mobileHelp { display: none; }
body.one-bullet #touchControls { display: none; }
body.mobile canvas { touch-action: none; }

#touchControls {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 4;
    pointer-events: none;
    touch-action: none;
}

body.mobile #touchControls { display: block; }
.touch-player {
    position: absolute;
    left: 0;
    bottom: 48px;
    width: 100%;
    height: 145px;
    pointer-events: none;
}
#touchPlayer2 { display: none; }
body.mobile.two-player #touchPlayer1,
body.mobile.two-player #touchPlayer2 { width: 50%; }
body.mobile.two-player #touchPlayer2 { display: block; left: 50%; }
.touch-stick {
    position: absolute;
    left: max(18px, env(safe-area-inset-left));
    bottom: 0;
    width: 112px;
    height: 112px;
    border: 3px solid #e7bd7888;
    border-radius: 50%;
    background: #21150e88;
    box-shadow: inset 0 0 0 10px #0003, 0 2px 12px #0009;
    pointer-events: auto;
    touch-action: none;
}
#touchPlayer2 .touch-stick { left: 18px; }
#aimControl { display: none; }
body.mobile:not(.two-player):not(.one-bullet) #aimControl {
    display: block;
    position: absolute;
    right: max(18px, env(safe-area-inset-right));
    bottom: 48px;
    width: 112px;
    height: 112px;
    pointer-events: auto;
}
#aimZone { inset: 0; left: 0; bottom: 0; }
#aimZone::before {
    content: "";
    position: absolute;
    inset: 18px;
    border: 2px solid #e7bd7877;
    border-radius: 50%;
    pointer-events: none;
}
#shootButton { display: none; }
body.mobile:not(.two-player):not(.one-bullet) #shootButton {
    display: block;
    position: absolute;
    right: max(25px, env(safe-area-inset-right));
    bottom: 178px;
    width: 96px;
    height: 64px;
    padding: 8px;
    border-radius: 50%;
    font-size: 13px;
    pointer-events: auto;
    touch-action: none;
    user-select: none;
}
.stick-knob {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 44px;
    height: 44px;
    transform: translate(-50%, -50%);
    border: 2px solid #f2d4a0;
    border-radius: 50%;
    background: #b77b3fcc;
    box-shadow: 0 2px 8px #0009;
}

@media (pointer: coarse) {
    #controls { font-size: 9px; }
}

.hud-right {
    text-align: right;
}

#message {
    position: fixed;
    z-index: 5;
    top: 24%;
    width: 100%;
    text-align: center;
    pointer-events: none;
    font-family: 'Rye', serif;
    font-size: clamp(25px, 5vw, 55px);
    color: #f4d5a0;
    text-shadow: 0 4px 15px black;
}

#controls {
    position: fixed;
    z-index: 3;
    bottom: 20px;
    width: 100%;
    text-align: center;
    font-size: 11px;
    letter-spacing: 2px;
    line-height: 2;
    color: #d0a879;
    text-shadow: 0 2px 5px black;
    pointer-events: none;
}

#gameover {
    display: none;
}
#gameover .page-buttons { margin-top: 8px; }
#gameover button { min-width: 150px; }
#countdownOverlay {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 12;
    align-items: center;
    justify-content: center;
    background: #000;
    color: #f2d4a0;
    font: clamp(28px, 7vw, 64px) 'Rye', serif;
    letter-spacing: 4px;
    text-align: center;
}
#sideControls { display: none; }
body.mobile.one-bullet #sideControls {
    display: flex;
    position: fixed;
    z-index: 6;
    bottom: max(10px, env(safe-area-inset-bottom));
    left: 0;
    right: 0;
    justify-content: space-around;
    gap: 4px;
    pointer-events: none;
}
.side-control-player { display: flex; align-items: center; justify-content: center; gap: 4px; pointer-events: auto; }
.side-control-player > span { color: #f2d4a0; font: bold 10px monospace; }
#sidePlayer2Controls { display: none; }
body.mobile.one-bullet.two-player #sidePlayer2Controls { display: flex; }
body.mobile.one-bullet #sideControls button { padding: 10px 11px; font-size: 11px; touch-action: none; user-select: none; }

#gameover h1 {
    font-size: clamp(50px, 8vw, 90px);
}

#resultText {
    margin: 0 0 30px;
    color: #d4b58b;
    font-size: 16px;
}

@media(max-width:600px) {
    #title h1 { font-size: clamp(42px, 12vw, 70px); }
    #title { padding: 18px 12px; }
    #customPage { padding: 18px 12px; }
    #customPage .weapon-choice { font-size: 10px; }
    #hud {
        padding: 15px 10px;
    }

    #controls {
        font-size: 8px;
        letter-spacing: .5px;
    }

    .hud-center {
        font-size: 15px;
    }

    #ammo, #enemyAmmo {
        font-size: 16px;
    }
}
