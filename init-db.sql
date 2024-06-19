CREATE DATABASE IF NOT EXISTS snake;

USE snake;

CREATE TABLE IF NOT EXISTS room (
    id VARCHAR(99),
    status BOOLEAN
);

CREATE TABLE IF NOT EXISTS score_table (
    player_id VARCHAR(99),
    room_id VARCHAR(99),
    score INT,
    PRIMARY KEY (player_id, room_id)
);