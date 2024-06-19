import mysql from 'mysql2/promise';
import { v4 as uuidv4 } from 'uuid';

const initRoom = async (roomId = '') => {
	try {
		if (roomId == '') {
			roomId = uuidv4();
		}

		const conn = await createDBConnection();

		const [result] = await conn.execute(`SELECT * FROM room WHERE id = ?`, [
			roomId,
		]);
		if (result[0]) {
			return roomId;
		}

		const [rows, fields] = await conn.execute(
			`INSERT INTO room (id,status) VALUES (?,?)`,
			[roomId, true]
		);

		await conn.end();

		return roomId;
	} catch (err) {
		console.error('Error: ', err);
	}
};

const deleteRoom = async (roomId) => {
	try {
		const conn = await createDBConnection();

		const [result] = await conn.execute(`SELECT * FROM room WHERE id = ?`, [
			roomId,
		]);
		if (!result[0]) {
			return roomId;
		}
		const [deleteRoomResult] = await conn.execute(
			'DELETE FROM room WHERE id = ?',
			[roomId]
		);
		const [deleteScoreResult] = await conn.execute(
			'DELETE FROM score_table WHERE room_id = ?',
			[roomId]
		);

		await conn.end();

		return roomId;
	} catch (err) {
		console.error('Error: ', err);
	}
};

const scorePlusString = (roomId, playerId) => {
	return `
        INSERT INTO score_table (player_id, room_id, score)
        VALUES ('${playerId}', '${roomId}', 1)
        ON DUPLICATE KEY UPDATE
        score = score + 1;
    `;
};

const scorePlus = async (roomId, playerId) => {
	try {
		const conn = await createDBConnection();

		console.log(scorePlusString(roomId, playerId));

		const [rows, f] = await conn.execute(scorePlusString(roomId, playerId));

		console.log(
			`The room (id: ${roomId})'s player(${playerId})'s score update success.`
		);

		await conn.end();
	} catch (err) {
		console.error('Error: ', err);
	}
};

const doesPlayerGetTenScore = async (roomId) => {
	try {
		const conn = await createDBConnection();

		const sql = `SELECT player_id, room_id, score FROM score_table WHERE room_id = '${roomId}' ORDER BY score DESC LIMIT 1`;

		const [result] = await conn.execute(sql);
		await conn.end();

		if (result[0]) {
			if (result[0]['score'] >= 9) {
				console.log(result);
				console.log(`${result[0]['player_id']} win!`);
				return result[0]['player_id'];
			}
		}
		console.log(`\n`, result[0], ` get point!`);
		return '';
	} catch (err) {
		console.error('Error: ', err);
	}
};

const sendGameEndToLobby = async (roomId) => {
	const url = `${process.env.LOBBY_DOMAIN}/api/rooms/gameEnd`;
	const data = {
		gameUrl: `${process.env.DOMAIN}/?roomId=${roomId}`,
	};
	console.log('Send Game End to: ', url);
	console.log(data);
	try {
		return await fetch(url, {
			method: 'POST',
			body: JSON.stringify(data),
			headers: {
				'Content-Type': 'application/json',
			},
		});
	} catch (error) {
		console.error('Error:', error);
		throw error;
	}
};

async function createDBConnection() {
	return await mysql.createConnection({
		host: process.env.DB_HOST,
		user: process.env.DB_USER,
		password: process.env.DB_PASSWORD,
		database: process.env.DB_NAME,
		port: process.env.DB_PORT,
	});
}

export {
	deleteRoom,
	initRoom,
	doesPlayerGetTenScore,
	scorePlus,
	sendGameEndToLobby,
};
