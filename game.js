//get the canvas and its drawing context
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let frameLimiter = 0; //to limit certain actions to every few frames

//need to track the box's position.
let boxX = 175;
let boxY = 625;
const boxSize = 50;

//movement variables
let boxVX = 0;                // current horizontal velocity
let accel = 0.4;            // how quickly velocity increases while holding a key
let maxSpeed = 8;          // top speed
const friction = 0.9;        // 0..1, lower = stronger friction
const stopThreshold = 0.1;    // velocity below this will snap to 0
const keys = {};              // tracks pressed keys

//dynamic variables
let obstacles = [];
let score = 0;
let level = 1;
let levelBracket = 0; //tracks which 1000-point milestone (0, 1000, 2000, etc)
let gamePaused = false; //tracks if game is paused
let pauseCounter = 0; //debounce for pause key
let gameOver = false;
let scoreList = [];
let highScore = 0;

//wind variables
let windActive = false;
let windDirection = 0;           // 1 for right, -1 for left
let nextWindDirection = 0;       // direction of the next wind
let windForce = 0.2;           // how strong the wind pushes
let windTimer = 0;               // how long wind has been active
let windDuration = 0;            // how long wind will last
let nextWindTime = 0;            // when next wind will trigger (in frames)

//obstacle spawn variables
let nextObstacleSpawn = 0;       // frames until next obstacle spawns
let baseObstacleSpeed = 2.5;     // base speed for obstacles (increases each level)

//getting references to audio elements
const startBtnSound = document.getElementById('startBtnSound'); //start button sound
const playAgainBtnSound = document.getElementById('playAgainBtnSound'); //play again button sound
const pauseBtnASound = document.getElementById('pauseBtnASound'); //pause button sound
const pauseBtnBSound = document.getElementById('pauseBtnBSound'); //unpause button sound
const gameOverSound = document.getElementById('gameOverSound'); //game over sound
const lvlUpASound = document.getElementById('lvlUpASound'); //level up A sound
const lvlUpBSound = document.getElementById('lvlUpBSound'); //level up B sound
const lvlUpSoundList = [lvlUpASound, lvlUpBSound]; //array of level up sounds
const highScoreSound = document.getElementById('highScoreSound'); //high score sound
const nearMissSound = document.getElementById('nearMissSound'); //near miss sound
const windSound = document.getElementById('windSound'); //wind sound
const wallSound = document.getElementById('wallSound'); //wall hit sound
const bgMusicList =
    [document.getElementById('bgMusicB'),
    document.getElementById('bgMusicC'),
    document.getElementById('bgMusicD'),
    document.getElementById('bgMusicE'),
    document.getElementById('bgMusicF')]; //array of background music tracks
let bgMusic = null; //current background music track
function randomBgMusic(){
    if (bgMusic == null || !bgMusic.playing() || bgMusic.paused() || bgMusic.ended() || bgMusic.currentTime == 0 || !bgMusic){ //if no music is playing
        bgMusic = bgMusicList[Math.floor(Math.random() * bgMusicList.length)]; //randomly select a background music track
    }
    bgMusic.play();
}
//universal sound play function
function playSound(nameofSound){
    nameofSound.play();
}

function handleKeyDown(event) {
  keys[event.key] = true;
}
function handleKeyUp(event) {
  keys[event.key] = false;
}

// PLAYER MOVEMENT
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    // Check if a new obstacle would overlap with existing ones
function wouldOverlap(newX, newWidth) {
    for (let i = 0; i < obstacles.length; i++) {
        // Check if x ranges overlap
        if (!(newX + newWidth < obstacles[i].x || newX > obstacles[i].x + obstacles[i].width)) {
            return true;  // overlaps
        }
    }
    return false;  // no overlap
}

function resetGame() { //resets all variables when the play again button is clicked
    playSound(playAgainBtnSound); //play play again button sound
    bgMusic.volume = 1.0; //restore background music volume
    boxX = 175;
    boxY = 625;
    boxVX = 0;
    obstacles = [];
    baseObstacleSpeed = 2.5;
    score = 0;
    level = 1;
    levelBracket = 0;
    gameOver = false;
    gamePaused = false;
    pauseCounter = 0;
    windActive = false;
    windTimer = 0;
    nextWindTime = 0;
    nextWindDirection = 0;
    nextObstacleSpawn = 0;
    document.getElementById("playAgainBtn").style.display = "none"; //hide the button by default
    document.getElementById("gameCanvas").style.border = "10px solid orangered";
    gameLoop(); //restart the game loop
}
document.getElementById("playAgainBtn").addEventListener("click", resetGame); //play again button event listener
// Allow ENTER key to trigger reset
document.addEventListener("keydown", function(event) {
    if (gameOver && event.code === "Enter") {
        resetGame();
    }
});

// Attach keyboard event listeners once (outside the game loop)
document.addEventListener("keydown", handleKeyDown);
document.addEventListener("keyup", handleKeyUp);

// Start button event listener
document.getElementById("startBtn").addEventListener("click", function() {
    playSound(startBtnSound); //play start button sound
    document.getElementById("startBtn").style.display = "none"; //hide start button
    gameLoop(); //start the game loop
});

// Pause button event listener
document.getElementById("pauseBtn").addEventListener("click", function() {
    pauseCounter++;
    if (pauseCounter % 2 == 0) {
        playSound(pauseBtnBSound); //play unpause button sound
        bgMusic.volume = 1.0; //restore background music volume
    } else {
        playSound(pauseBtnASound); //play pause button sound
    }
    gamePaused = !gamePaused; //toggle pause state
});
// Spacebar to pause
document.addEventListener("keydown", function(event) {
    if (event.code === "Space" && !gameOver) {
        pauseCounter++;
        event.preventDefault(); //prevent page scroll
        if (pauseCounter % 2 == 0) {
            playSound(pauseBtnBSound); //play unpause button sound
            bgMusic.volume = 1.0; //restore background music volume
        } else {
            playSound(pauseBtnASound); //play pause button sound
        }
        gamePaused = !gamePaused; //toggle pause state
    }
});

function gameLoop(){ //update movement
    if (gameOver) return;
    //console.log("gameLoop running");
    frameLimiter++;

    ctx.clearRect(0, 0, canvas.width, canvas.height); //clear canvas
    //draw player (box)
    ctx.fillStyle = "yellow";
    ctx.fillRect(boxX, boxY, boxSize, boxSize);
    document.getElementById("gameCanvas").style.border = "10px solid orangered";
    
    //score formatting
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "yellow";
    ctx.font = "42px Franklin Gothic Medium";
    ctx.fillText("score: " + score, 10, 50);
    
    // Level display with same formatting
    ctx.fillStyle = "yellow";
    ctx.font = "42px Franklin Gothic Medium";
    ctx.fillText("level: " + level, 10, 100);
    
    if (gamePaused) {
        ctx.fillStyle = "rgba(255, 81, 0, 0.5)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "yellow";
        ctx.font = "75px Franklin Gothic Medium";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("PAUSED", canvas.width / 2, canvas.height / 2);
        requestAnimationFrame(gameLoop);
        bgMusic.volume = 0.4; //muffle background music volume
        return;
    }

    // WIND SYSTEM
    // Check if it's time to start new wind
    if (nextWindTime <= 0 && !windActive) {
        windActive = true;
        windDirection = nextWindDirection;  // use pre-determined direction
        windDuration = Math.random() * 120 + 60;       // wind lasts 1-3 seconds (60-180 frames at 60fps)
        windTimer = 0;
    } else if (nextWindTime <= 60 && nextWindTime > 0){
        // Warn player of incoming wind - pulsing border effect
        let pulseColor = Math.floor(nextWindTime / 10) % 2 === 0 ? "yellow" : "orangered";
        document.getElementById("gameCanvas").style.border = "10px solid " + pulseColor;
    }
    
    // Update wind timer and stop when duration ends
    if (windActive) {
        windTimer++;
        if (windTimer >= windDuration) {
            windActive = false;
            nextWindTime = Math.random() * 300 + 180;  // next wind in 3-8 seconds (180-480 frames)
            nextWindDirection = Math.random() < 0.5 ? -1 : 1;  // determine next wind direction
        }
    } else {
        nextWindTime--;
    }
    
    // Apply wind force to player velocity
    if (windActive) {
        boxVX += windForce * windDirection;
    }
    
    // apply acceleration while keys pressed
    if (keys["ArrowRight"] || keys["d"]) {
        boxVX += accel;
    } else if (keys["ArrowLeft"] || keys["a"]) {
        boxVX -= accel;
    } else {
    // apply friction when no key pressed
        boxVX *= friction;
        if (Math.abs(boxVX) < stopThreshold) boxVX = 0;
    }
    // clamp to max speeds
    if (boxVX > maxSpeed) boxVX = maxSpeed;
    if (boxVX < -maxSpeed) boxVX = -maxSpeed;
    // update position
    boxX += boxVX;
    //if player goes offscreen, wrap them around
    if (boxX > canvas.width) {
        boxX = -boxSize;
        score -= 150; //penalize player for going offscreen
        playSound(wallSound); //play score deduction sound
    } else if (boxX + boxSize < 0) {
        boxX = canvas.width;
        score -= 150; //penalize player for going offscreen
        playSound(wallSound); //play score deduction sound
    }
    if (boxSize + boxX > canvas.width){
        document.getElementById("gameCanvas").style.border = "10px solid red";
        playSound(wallSound); //play score deduction sound
    } else if (boxX < 0){
        document.getElementById("gameCanvas").style.border = "10px solid red";
        playSound(wallSound); //play score deduction sound
    }

    // Update and draw obstacles
    // Spawn obstacles at random intervals
    nextObstacleSpawn--;
    if (nextObstacleSpawn <= 0) {
        // Try to spawn a new obstacle that doesn't overlap
        let newWidth = Math.random() * 80 + 20;
        let newX = Math.random() * 420 + 10;
        let attempts = 0;
        
        // Keep trying different positions if it overlaps (max 10 attempts)
        while (wouldOverlap(newX, newWidth) && attempts < 10) {
            newX = Math.random() * 420 + 10;
            attempts++;
        }
        
        // Only spawn if we found a non-overlapping position
        if (!wouldOverlap(newX, newWidth)) {
            obstacles.push({
                x: newX,
                y: -100,
                width: newWidth,
                height: Math.random() * 70 + 30,
                speed: baseObstacleSpeed
            });
            console.log("New obstacle spawned");
        }
        
        // Set next spawn time: 0.5 to 2 seconds (30-120 frames at 60fps)
        nextObstacleSpawn = Math.random() * 90 + 30;
    }

    for (let i = 0; i < obstacles.length; i++) {
        //console.log(obstacles[i].y, obstacles[i].speed);
        obstacles[i].y += obstacles[i].speed; //obstacle moves down

        // Draw obstacle
        ctx.fillStyle = "orangered";
        ctx.fillRect(obstacles[i].x, obstacles[i].y, obstacles[i].width, obstacles[i].height);

        // AABB collision
        if (boxX < obstacles[i].x + obstacles[i].width && //box left edge is left of obstacle's right edge
            boxX + boxSize > obstacles[i].x && // box right edge is right of obstacle's left edge
            boxY < obstacles[i].y + obstacles[i].height && // box top edge is above obstacle's bottom edge
            boxY + boxSize > obstacles[i].y) {// box bottom edge is below obstacle's top edge

            gameOver = true;

            scoreList.push(score);
            highScore = (Math.max(...scoreList)) + 1; //update high score
            if (score >= highScore-1) {
                playSound(highScoreSound); //play high score sound
            } else {
                playSound(gameOverSound); //play game over sound
            }

            document.getElementById("playAgainBtn").style.display = "block"; //display the play again button only when the player loses
        } else {
            console.log("no collision");
        }

        if (obstacles[i].y + obstacles[i].height > 810){ //if obstacle is offscreen
            obstacles.splice(i, 1); //remove obstacle from array
            i--; //decrement i since we removed an element
        }
    }

    // Display wind warning on top of obstacles
    if (nextWindTime <= 60 && nextWindTime > 0) {
        let windDirection = nextWindDirection === 1 ? "RIGHT" : "LEFT";
        ctx.fillStyle = "yellow";
        ctx.font = "50px Franklin Gothic Medium";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("WIND INCOMING!", canvas.width / 2, canvas.height / 2 - 50);
        ctx.fillStyle = "red";
        ctx.font = "40px Franklin Gothic Medium";
        ctx.fillText(windDirection, canvas.width / 2, canvas.height / 2 + 50);
    }

    score++; //update score.
    //score formatting
    ctx.textAlign = "start";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "yellow";
    ctx.font = "42px Franklin Gothic Medium";
    ctx.fillText("score: " + score, 10, 50);
    
    // Level display with same formatting
    ctx.fillStyle = "yellow";
    ctx.font = "42px Franklin Gothic Medium";
    ctx.fillText("level: " + level, 10, 100);

    if (score < 0) score = 0; //prevent negative scores

    //level progression system
    let newBracket = Math.floor(score / 1000); //which thousand bracket are we in?
    if (newBracket > levelBracket) { //only level up when entering a NEW bracket
        level++;
        let lvlUpSound = lvlUpSoundList[Math.floor(Math.random() * lvlUpSoundList.length)]; //randomly select level up sound
        playSound(lvlUpSound); //play that randomized level up sound
        accel += 0.05;
        baseObstacleSpeed += 0.05;
        levelBracket = newBracket;
        if (level % 5 == 0) { //every 5 levels,
            nextObstacleSpawn = Math.max(10, nextObstacleSpawn - 20); //spawn obstacles faster (min 10 frames)
        }
        if (level % 10 == 0) { //every 10 levels,
            maxSpeed += 1; //increase max speed
            windForce += 0.1; //increase wind force
        }
    }

    //score bonus system for near misses
    for (let i = 0; i < obstacles.length; i++) {
        if (obstacles[i].y + obstacles[i].height > boxY && //obstacle is at player's vertical level
            obstacles[i].y < boxY + boxSize) { //obstacle is still overlapping player's vertical level
            // Check horizontal proximity for near miss
            if ((obstacles[i].x > boxX + boxSize && obstacles[i].x - (boxX + boxSize) < 20) || //obstacle is just to the right, or
                (obstacles[i].x + obstacles[i].width < boxX && boxX - (obstacles[i].x + obstacles[i].width) < 20)) { //obstacle is just to the left,,
                playSound(nearMissSound); //play near miss sound
                    score += 10; //bonus points for near miss
                console.log("Near miss! Bonus awarded.");
                ctx.fillStyle = "yellow";
                ctx.font = "75px Franklin Gothic Medium";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText("NEAR MISS!!", canvas.width / 2, canvas.height / 2);
            }
        }
    }

    // Draw highscore and backdrop when game is over
    if (gameOver) {
        ctx.fillStyle = "rgba(255, 81, 0, 0.5)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "yellow";
        ctx.font = "30px Franklin Gothic Medium";
        ctx.textAlign = "center";
        ctx.fillText("HIGHSCORE: " + highScore, canvas.width / 2, canvas.height / 2 - 100);
        bgMusic.volume = 0.3; //muffle background music volume
    }

    requestAnimationFrame(gameLoop); //continue looping

    randomBgMusic(); //play background music if not already playing

}
