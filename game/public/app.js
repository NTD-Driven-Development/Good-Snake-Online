const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// 从URL中提取房间ID和玩家名称
const urlParams = new URLSearchParams(window.location.search);
const roomId = urlParams.get('roomId');
const playerName = urlParams.get('playerName') || 'Player';

const socket = io('', {
	query: {
		roomId: roomId,
		playerName: playerName,
	},
});

let players = {};
let food = {};
let isGameOver = false;
let winner = '';

// 初始化游戏
function initGame() {
	socket.emit('newPlayer');
}

socket.on('gameState', (gameState) => {
	if (isGameOver) return;
	players = gameState.players;
	food = gameState.food;
	renderGame();
});

socket.on('gameOver', (data) => {
	isGameOver = true;
	winner = data.winner;
	renderGameOver();
});

function renderGame() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);

	// 渲染食物
	ctx.fillStyle = 'red';
	ctx.fillRect(food.x, food.y, 10, 10);

	// 渲染贪食蛇
	for (let id in players) {
		let player = players[id];
		ctx.fillStyle = player.color;

		// 绘制蛇
		player.snake.forEach((segment, index) => {
			ctx.fillRect(segment.x, segment.y, 10, 10);
		});

		// 绘制玩家名称在蛇头上方
		let head = player.snake[0];
		ctx.fillStyle = 'black';
		ctx.font = '12px Arial';
		ctx.textAlign = 'center';
		ctx.fillText(player.name, head.x + 5, head.y - 5);
	}
}

function renderGameOver() {
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = 'black';
	ctx.font = '48px Arial';
	ctx.textAlign = 'center';
	ctx.fillText(
		`Game Over! Winner: ${winner}`,
		canvas.width / 2,
		canvas.height / 2
	);
}

document.addEventListener('keydown', (event) => {
	socket.emit('changeDirection', event.key);
});

initGame();
