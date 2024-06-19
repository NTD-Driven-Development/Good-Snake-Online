import { config } from 'dotenv';
config();
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import {
	deleteRoom,
	initRoom,
	scorePlus,
	doesPlayerGetTenScore,
	sendGameEndToLobby,
} from './service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const rooms = {}; // 用來存儲不同房間的遊戲狀態

app.use(express.static(path.join(__dirname, 'public')));

// 添加 /api/health 路由
app.get('/api/health', async (req, res) => {
	return res.status(200).json(); // 回傳200 OK
});

app.post('/api/startGame', async (req, res) => {
	const newRoomId = await initRoom();
	rooms[newRoomId] = {
		players: {},
		food: getRandomFoodPosition(),
		isGameOver: false,
	};
	const response = {
		gameId: 'GoodGoodGame',
		gameUrl: `${process.env.DOMAIN}/?roomId=${newRoomId}`,
	};
	res.status(200).json(response);
});

io.on('connection', (socket) => {
	const reqUrl = socket.handshake.headers.referer;
	const parsedUrl = new URL(reqUrl);
	const roomId = parsedUrl.searchParams.get('roomId');
	const playerId = parsedUrl.searchParams.get('playerId') || socket.id;
	const playerName = parsedUrl.searchParams.get('playerName') || 'No Name';

	if (!rooms[roomId]) {
		rooms[roomId] = {
			players: {},
			food: getRandomFoodPosition(),
			isGameOver: false,
		};
		initRoom(roomId);
		console.log(`Create Room: ${roomId}`);
	}

	console.log(`Player(${playerId}) Join Room(${roomId})`);

	const room = rooms[roomId];
	room.players[socket.id] = {
		id: playerId,
		name: playerName,
		snake: [{ x: 10, y: 10 }],
		direction: 'RIGHT',
		color: getRandomColor(),
		score: 0,
	};

	socket.join(roomId);

	io.to(roomId).emit('gameState', room);

	socket.on('changeDirection', (key) => {
		const player = room.players[socket.id];
		if (!player) return;

		// 防止蛇倒退
		if (key === 'ArrowUp' && player.direction !== 'DOWN')
			player.direction = 'UP';
		if (key === 'ArrowDown' && player.direction !== 'UP')
			player.direction = 'DOWN';
		if (key === 'ArrowLeft' && player.direction !== 'RIGHT')
			player.direction = 'LEFT';
		if (key === 'ArrowRight' && player.direction !== 'LEFT')
			player.direction = 'RIGHT';
	});

	socket.on('disconnect', () => {
		delete room.players[socket.id];
		if (Object.keys(room.players).length === 0) {
			delete rooms[roomId]; // 當房間沒有玩家時，刪除房間
		} else {
			io.to(roomId).emit('gameState', room);
		}
	});
});

function getRandomColor() {
	return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

function getRandomFoodPosition() {
	return {
		x: Math.floor(Math.random() * 80) * 10,
		y: Math.floor(Math.random() * 60) * 10,
	};
}

// 更新遊戲狀態
async function updateGameState() {
	for (let roomId in rooms) {
		const room = rooms[roomId];
		if (room.isGameOver) continue; // 如果遊戲已經結束，跳過這個房間

		for (let id in room.players) {
			let player = room.players[id];
			let head = { ...player.snake[0] };

			// 更新蛇的頭部位置
			if (player.direction === 'UP') head.y -= 10;
			if (player.direction === 'DOWN') head.y += 10;
			if (player.direction === 'LEFT') head.x -= 10;
			if (player.direction === 'RIGHT') head.x += 10;

			// 檢查蛇是否吃到食物
			if (head.x === room.food.x && head.y === room.food.y) {
				console.log(`Player(${player.name} get one food.)`);
				console.log(`Player(${player.name})'s score: ${player.score}`);
				room.food = getRandomFoodPosition(); // 生成新的食物位置
				player.score += 1; // 增加玩家的分數
				await scorePlus(roomId, player.id);

				const tenPointPlayer = await doesPlayerGetTenScore(roomId);
				// 檢查是否有玩家得分達到10
				if (tenPointPlayer != '') {
					room.isGameOver = true;
					await deleteRoom(roomId);
					await sendGameEndToLobby(roomId)
						.then((result) => {
							console.log('End Game API Success:', result); // 處理成功結果
						})
						.catch((error) => {
							console.error('End Game API Error:', error); // 處理錯誤
						});
					io.to(roomId).emit('gameOver', { winner: player.name });
					break;
				}
			} else {
				player.snake.pop(); // 移除尾部，只有在沒有吃到食物時才移除
			}

			player.snake.unshift(head); // 在頭部添加新位置
		}
		io.to(roomId).emit('gameState', room);
	}
}

setInterval(updateGameState, 100); // 每100毫秒更新一次遊戲狀態

server.listen(8080, () => {
	console.log('Server is running on port 8080');
});
