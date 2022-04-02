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
	constructor(x0, y0, ctx) {
		super(x0, y0);
		this.score = 0;
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
		this.ctx.fillStyle = 'yellow';
		this.ctx.fillRect(this.x, this.y, this.width, this.height);
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
	constructor(map, p1, ctx) {
		this.map = map;
		this.p1 = p1;
		this.ctx = ctx;
	}
	checkCollision(first, second) {
		return (
			first.x < second.x + second.width &&
			second.x < first.x + first.width &&
			first.y < second.y + second.height &&
			second.y < first.y + first.height
		);
	}
	checkBarrierCollsion(other) {
		return this.map.barriers.some((barrier) =>
			this.checkCollision(barrier, other)
		);
	}
	checkCoinsEaten() {
		this.map.coins = this.map.coins.filter((coin) => {
			if (this.checkCollision(coin, this.p1)) {
				this.p1.score += 10;
				return false;
			}
			return true;
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
	tick() {
		// attemp direction change
		const attempP1 = this.simulateMovement(
			this.p1,
			this.p1.nextVx,
			this.p1.nextVy
		);
		if (!this.checkBarrierCollsion(attempP1)) p1.setVelocity();
		// move if possible
		const nextP1 = this.simulateMovement(this.p1, this.p1.vx, this.p1.vy);
		if (!this.checkBarrierCollsion(nextP1)) p1.move();
		// eat coin if posible
		this.checkCoinsEaten();
	}
	draw() {
		this.ctx.clearRect(0, 0, canvas.width, canvas.height);
		this.drawObjects();
		this.drawUI();
	}
	drawObjects() {
		this.map.draw();
		this.p1.draw();
	}
	drawUI() {
		ctx.fillStyle = 'white';
		ctx.font = '16px Consolas';
		ctx.fillText(
			`Score: ${this.p1.score}`,
			cellSize,
			(gameHeight + 2) * cellSize
		);
	}
}

const map = new Map(MAP_STRING, ctx);
const p1 = new Player(8 * 13, 8 * 17, ctx);
const game = new Game(map, p1, ctx);

// Input control
const keyDowns$ = rxjs.fromEvent(window, 'keydown');
keyDowns$.subscribe((kd) => {
	switch (kd.key) {
		case 'ArrowUp':
			p1.setNextVelocity(0, -1);
			break;
		case 'ArrowRight':
			p1.setNextVelocity(1, 0);
			break;
		case 'ArrowDown':
			p1.setNextVelocity(0, 1);
			break;
		case 'ArrowLeft':
			p1.setNextVelocity(-1, 0);
			break;
	}
});

// Game main loop
rxjs.interval(1000 / 120).subscribe((n) => {
	// logic
	game.tick();
	// draw
	game.draw();
});
