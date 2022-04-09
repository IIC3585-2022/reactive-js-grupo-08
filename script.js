const MAP_STRING = `############################
#............##............#
#.####.#####.##.#####.####.#
#o####.#####.##.#####.####o#
#.####.#####.##.#####.####.#
#..........................#
#.####.##.########.##.####.#
#.####.##.########.##.####.#
#......##....##....##......#
######.##### ## #####.######
######.##### ## #####.######
######.##          ##.######
######.## ######## ##.######
######.## ######## ##.######
      .   ########   .      
######.## ######## ##.######
######.## ######## ##.######
######.##          ##.######
######.## ######## ##.######
######.## ######## ##.######
#............##............#
#.####.#####.##.#####.####.#
#.####.#####.##.#####.####.#
#o..##.......  .......##..o#
###.##.##.########.##.##.###
###.##.##.########.##.##.###
#......##....##....##......#
#.##########.##.##########.#
#.##########.##.##########.#
#..........................#
############################`;
const cellSize = 8;
const gameHeight = 31;
const gameWidth = 28;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

// Basic object
class Object {
    constructor(x0, y0) {
        this.width = cellSize;
        this.height = cellSize;
        this.x = x0;
        this.y = y0;
    }
}

class Player extends Object {
    constructor(x0, y0, color, ctx) {
        super(x0, y0);
        this.color = color;
        this.vx = 0;
        this.vy = 0;
        this.hasNextVelocity = false;
        this.nextVx = 0;
        this.nextVy = 0;
        this.ctx = ctx;
    }
    move() {
        this.x += this.vx;
        this.y += this.vy;
        // teleport horizontal
        if (gameWidth * cellSize < this.x + this.width) this.x = cellSize;
        else if (this.x < 0) this.x = gameWidth * cellSize - cellSize;
    }
    setVelocity() {
        this.hasNextVelocity = false;
        this.vx = this.nextVx;
        this.vy = this.nextVy;
    }
    setNextVelocity(vx, vy) {
        this.hasNextVelocity = true;
        this.nextVx = vx;
        this.nextVy = vy;
    }
    draw() {
        // body
        this.ctx.fillStyle = this.color;
        this.ctx.fillRect(this.x, this.y, this.width, this.height);
        // eye
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(this.x + 2, this.y + 2, 4, 4);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(this.x + 3 + this.vx, this.y + 3 + this.vy, 2, 2);
    }
}

class Enemy extends Object {
    constructor(x0, y0, color, ctx) {
        super(x0, y0);
        this.color = color;
        this.vx = 1;
        this.vy = 0;
        this.ctx = ctx;
    }
    draw() {
        // body
        this.ctx.fillStyle = this.color;
        this.ctx.fillRect(this.x, this.y, this.width, this.height);
        // eye
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(this.x + 1, this.y + 2 + this.vy, 2, 1);
        this.ctx.fillRect(this.x + 5, this.y + 2 + this.vy, 2, 1);
        this.ctx.fillRect(this.x + 2, this.y + 4 + this.vy, 4, 1);
    }
    move() {
        this.x += this.vx;
        this.y += this.vy;
        // teleport horizontal
        if (gameWidth * cellSize < this.x + this.width) this.x = cellSize;
        else if (this.x < 0) this.x = gameWidth * cellSize - cellSize;
    }

    randomizeMovement() {
        const choices = [-1, 0, 1]
        const nonZeroChoices = [-1, 1]
        this.vx = choices[Math.floor(Math.random() * choices.length)]

        const verticalChoices = this.vx === 0 ? nonZeroChoices : choices;
        this.vy = verticalChoices[Math.floor(Math.random() * verticalChoices.length)]
    }
}

class Map {
    constructor(map, ctx) {
        this.barriers = [];
        this.coins = [];
        this.powerUps = [];
        this.ctx = ctx;

        const mapArray = map.split('\n');
        for (let row = 0; row < gameHeight; row++) {
            for (let col = 0; col < gameWidth; col++) {
                switch (mapArray[row][col]) {
                    case '#':
                        this.barriers.push(new Object(col * cellSize, row * cellSize));
                        break;
                    case '.':
                        this.coins.push(new Object(col * cellSize, row * cellSize));
                        break;
                    case 'o':
                        this.powerUps.push(new Object(col * cellSize, row * cellSize));
                        break;
                }
            }
        }
        // Used for easier testing
        //this.coins = this.coins.slice(0, 5);
        //this.powerUps = this.powerUps.slice(0, 1);
    }
    draw() {
        // barriers
        map.barriers.forEach((barrier) => {
            this.ctx.fillStyle = 'blue';
            this.ctx.fillRect(barrier.x, barrier.y, barrier.width, barrier.height);
        });
        // coins
        map.coins.forEach((coin) => {
            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(
                coin.x + 3,
                coin.y + 3,
                coin.width - 6,
                coin.height - 6
            );
        });
        // powerUps
        map.powerUps.forEach((coin) => {
            this.ctx.fillStyle = 'white';
            this.ctx.fillRect(
                coin.x + 2,
                coin.y + 2,
                coin.width - 4,
                coin.height - 4
            );
        });
    }
}

class Game {
    constructor(map, players, enemies, canvas, ctx) {
        this.map = map;
        this.players = players;
        this.enemies = enemies;
        this.score = 0;
        this.powerUpActive = false;
        this.canvas = canvas;
        this.ctx = ctx;
        // Used to avoid multiple game over alerts
        this.gameOver = false;
        // Used to avoid multiple game won alters
        this.gameWon = false;
        // Used to cancel previous timer when new powerUp is eaten while previous is active
        this.powerUpTimer = null;
    }
    checkCollision(first, second) {
        return (
            first.x < second.x + second.width &&
            second.x < first.x + first.width &&
            first.y < second.y + second.height &&
            second.y < first.y + first.height
        );
    }
    checkBarrierCollision(other) {
        return this.map.barriers.some((barrier) =>
            this.checkCollision(barrier, other)
        );
    }
    checkCoinsEaten(player) {
        this.map.coins = this.map.coins.filter((coin) => {
            if (this.checkCollision(coin, player)) {
                this.score += 100;
                return false;
            }
            return true;
        });
    }
    checkPowerUpsEaten(player) {
        this.map.powerUps = this.map.powerUps.filter((coin) => {
            if (this.checkCollision(coin, player)) {
                clearTimeout(this.powerUpTimer);
                this.score += 500;
                this.powerUpActive = true;
                this.powerUpTimer = setTimeout(() => this.powerUpActive = false, 10_000);
                return false;
            }
            return true;
        });
    }

    checkEnemyCollision(player) {
        this.enemies.forEach((e) => {
            if (this.checkCollision(e, player)) {
                if (this.powerUpActive) {
                    e.x = cellSize * 13;
                    e.y = cellSize * 11;
                    this.score += 1000;
                } else if (!this.gameOver) {
                    this.gameOver = true
                    alert('GAME OVER!!!');
                    window.location.reload();
                }
            }
        });
    }

    simulateMovement(object, vx, vy) {
        return {
            x: object.x + vx,
            y: object.y + vy,
            width: object.width,
            height: object.height,
        };
    }
    enemyMovement(e){
        const nextMove = this.simulateMovement(e, e.vx, e.vy);
        if (this.checkBarrierCollision(nextMove)) { 
            e.randomizeMovement();
            this.enemyMovement(e)
        }
        else e.move();
    }
    checkWin() {
        if (this.map.powerUps.length + this.map.coins.length === 0 && !this.gameWon) {
            this.gameWon = true;
            alert(`GAME WON!!!\nFINAL SCORE: ${this.score}`);
            window.location.reload();
        }
    }
    tick() {
        // check if all coins and powerups have been eaten
        this.checkWin();
        this.enemies.forEach((e) => {
            this.enemyMovement(e)
        });
        this.players.forEach((p) => {
            // attemp direction change
            const attempChange = this.simulateMovement(p, p.nextVx, p.nextVy);
            if (!this.checkBarrierCollision(attempChange)) p.setVelocity();
            // move if possible
            const nextMove = this.simulateMovement(p, p.vx, p.vy);
            if (!this.checkBarrierCollision(nextMove)) p.move();
            // eat coin if posible
            this.checkCoinsEaten(p);
            // eat power if posible
            this.checkPowerUpsEaten(p);
            // die if possible
            this.checkEnemyCollision(p);
        });
    }
    draw() {
        this.ctx.filter = this.powerUpActive ? 'invert(.75)' : 'invert(0)';
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.drawObjects();
        this.drawUI();
    }
    drawObjects() {
        this.map.draw();
        this.players.forEach((p) => p.draw());
        this.enemies.forEach((e) => e.draw());
    }
    drawUI() {
        ctx.fillStyle = 'white';
        ctx.font = '16px Consolas';
        ctx.fillText(`Score: ${this.score}`, cellSize, (gameHeight + 2) * cellSize);
    }

    run() {
        // Game main loop
        rxjs.interval(1000 / 120).subscribe((n) => {
            // logic
            this.tick();
            // draw
            this.draw();
        });
    }
}

const map = new Map(MAP_STRING, ctx);
const p1 = new Player(cellSize * 13, cellSize * 17, 'magenta', ctx);
const p2 = new Player(cellSize * 14, cellSize * 17, 'cyan', ctx);
const enemies = [
    new Enemy(cellSize, cellSize, 'red', ctx),
    new Enemy(cellSize * 16, cellSize, 'red', ctx),
    new Enemy(cellSize, cellSize * 29, 'red', ctx),
    new Enemy(cellSize * 16, cellSize * 29, 'red', ctx),
];
const game = new Game(map, [p1, p2], enemies, canvas, ctx);

// Input control
const keyDowns$ = rxjs.fromEvent(window, 'keydown');
keyDowns$.subscribe((kd) => {
    switch (kd.key.toLowerCase()) {
        case 'arrowup':
            p1.setNextVelocity(0, -1);
            break;
        case 'arrowright':
            p1.setNextVelocity(1, 0);
            break;
        case 'arrowdown':
            p1.setNextVelocity(0, 1);
            break;
        case 'arrowleft':
            p1.setNextVelocity(-1, 0);
            break;
        case 'w':
            p2.setNextVelocity(0, -1);
            break;
        case 'd':
            p2.setNextVelocity(1, 0);
            break;
        case 's':
            p2.setNextVelocity(0, 1);
            break;
        case 'a':
            p2.setNextVelocity(-1, 0);
            break;
        case '1':
            // Remove player 2
            game.players = game.players.slice(0,1);
            break;
    }
});

game.run();
