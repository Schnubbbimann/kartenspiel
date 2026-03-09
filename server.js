const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let rooms = {};

function createDeck() {
    let deck = [];
    for (let v = 0; v <= 13; v++) {
        for (let i = 0; i < 4; i++) {
            deck.push(v);
        }
    }
    return deck.sort(() => Math.random() - 0.5);
}

function createRoom() {
    const code = Math.random().toString(36).substring(2,7).toUpperCase();
    rooms[code] = {
        players: [],
        deck: createDeck(),
        discard: [],
        hands: {},
        turn: 0,
        phase: "waiting",
        drawnCard: null,
        caller: null
    };
    return code;
}

io.on("connection", (socket) => {

    socket.on("createRoom", () => {
        const code = createRoom();
        socket.join(code);
        rooms[code].players.push(socket.id);
        socket.emit("roomCreated", code);
    });

    socket.on("joinRoom", (code) => {
        if (!rooms[code]) return;
        socket.join(code);
        rooms[code].players.push(socket.id);
        io.to(code).emit("updatePlayers", rooms[code].players.length);
    });

    socket.on("startGame", (code) => {
        const room = rooms[code];
        if (!room) return;

        room.players.forEach(id => {
            room.hands[id] = [
                room.deck.pop(),
                room.deck.pop(),
                room.deck.pop(),
                room.deck.pop()
            ];
        });

        room.discard.push(room.deck.pop());
        room.phase = "draw";

        io.to(code).emit("gameState", room);
    });

    socket.on("drawDeck", (code) => {
        const room = rooms[code];
        if (!room) return;
        if (room.players[room.turn] !== socket.id) return;
        if (room.phase !== "draw") return;

        if (room.deck.length === 0) reshuffle(room);

        room.drawnCard = room.deck.pop();
        room.phase = "replace";

        io.to(code).emit("gameState", room);
    });

    socket.on("replaceCard", ({code, index}) => {
        const room = rooms[code];
        if (!room) return;
        if (room.players[room.turn] !== socket.id) return;
        if (room.phase !== "replace") return;

        const old = room.hands[socket.id][index];
        room.hands[socket.id][index] = room.drawnCard;
        room.discard.push(old);

        room.drawnCard = null;
        nextTurn(room);

        io.to(code).emit("gameState", room);
    });

    socket.on("discardDrawn", (code) => {
        const room = rooms[code];
        if (!room) return;
        if (room.players[room.turn] !== socket.id) return;
        if (room.phase !== "replace") return;

        const played = room.drawnCard;
        room.discard.push(played);
        room.drawnCard = null;

        if (played >= 7 && played <= 12) {
            room.phase = "ability";
            room.abilityType = played;
        } else {
            nextTurn(room);
        }

        io.to(code).emit("gameState", room);
    });

    socket.on("endAbility", (code) => {
        const room = rooms[code];
        if (!room) return;
        nextTurn(room);
        io.to(code).emit("gameState", room);
    });

});

function reshuffle(room) {
    const top = room.discard.pop();
    room.deck = room.discard.sort(() => Math.random() - 0.5);
    room.discard = [top];
}

function nextTurn(room) {
    room.turn++;
    if (room.turn >= room.players.length) room.turn = 0;
    room.phase = "draw";
}

server.listen(3000, () => {
    console.log("Server läuft auf Port 3000");
});
