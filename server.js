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
        for (let i = 0; i < 4; i++) deck.push(v);
    }
    return deck.sort(() => Math.random() - 0.5);
}

function createRoom() {
    const code = Math.random().toString(36).substring(2,7).toUpperCase();
    rooms[code] = {
        players: [],
        deck: [],
        discard: [],
        hands: {},
        turn: 0,
        phase: "waiting",
        drawn: null,
        ability: null,
        swapBuffer: null,
        caller: null
    };
    return code;
}

function sendState(code) {
    const room = rooms[code];
    if (!room) return;

    room.players.forEach((id, index) => {
        io.to(id).emit("state", {
            roomCode: code,
            yourTurn: room.players[room.turn] === id,
            phase: room.phase,
            yourHand: room.hands[id],
            discardTop: room.discard[room.discard.length - 1],
            drawn: room.players[room.turn] === id ? room.drawn : null,
            playerCount: room.players.length
        });
    });
}

function nextTurn(room) {
    room.drawn = null;
    room.ability = null;
    room.swapBuffer = null;
    room.phase = "draw";
    room.turn++;
    if (room.turn >= room.players.length) room.turn = 0;

    if (room.caller !== null && room.turn === room.caller) {
        room.phase = "finished";
    }
}

function reshuffle(room) {
    const top = room.discard.pop();
    room.deck = room.discard.sort(() => Math.random() - 0.5);
    room.discard = [top];
}

io.on("connection", (socket) => {

    socket.on("createRoom", () => {
        const code = createRoom();
        socket.join(code);
        rooms[code].players.push(socket.id);
        socket.emit("roomCreated", code);
    });

    socket.on("joinRoom", (code) => {
        code = code.toUpperCase();
        if (!rooms[code]) return;

        socket.join(code);
        rooms[code].players.push(socket.id);
        io.to(code).emit("playerCount", rooms[code].players.length);
    });

    socket.on("startGame", (code) => {
        const room = rooms[code];
        if (!room) return;

        room.deck = createDeck();
        room.discard = [];
        room.turn = 0;
        room.phase = "draw";

        room.players.forEach(id => {
            room.hands[id] = [
                room.deck.pop(),
                room.deck.pop(),
                room.deck.pop(),
                room.deck.pop()
            ];
        });

        room.discard.push(room.deck.pop());
        sendState(code);
    });

    socket.on("drawDeck", (code) => {
        const room = rooms[code];
        if (!room) return;
        if (room.players[room.turn] !== socket.id) return;
        if (room.phase !== "draw") return;

        if (room.deck.length === 0) reshuffle(room);

        room.drawn = room.deck.pop();
        room.phase = "replace";
        sendState(code);
    });

    socket.on("replaceCard", ({code, index}) => {
        const room = rooms[code];
        if (!room) return;
        if (room.players[room.turn] !== socket.id) return;
        if (room.phase !== "replace") return;

        const old = room.hands[socket.id][index];
        room.hands[socket.id][index] = room.drawn;
        room.discard.push(old);

        room.drawn = null;
        nextTurn(room);
        sendState(code);
    });

    socket.on("discardDrawn", (code) => {
        const room = rooms[code];
        if (!room) return;
        if (room.players[room.turn] !== socket.id) return;
        if (room.phase !== "replace") return;

        const card = room.drawn;
        room.discard.push(card);
        room.drawn = null;

        if (card >= 7 && card <= 8) {
            room.phase = "selfAbility";
        } else if (card >= 9 && card <= 10) {
            room.phase = "otherAbility";
        } else {
            nextTurn(room);
        }

        sendState(code);
    });

    socket.on("finishAbility", (code) => {
        const room = rooms[code];
        if (!room) return;
        nextTurn(room);
        sendState(code);
    });

    socket.on("callCabo", (code) => {
        const room = rooms[code];
        if (!room) return;
        room.caller = room.turn;
        nextTurn(room);
        sendState(code);
    });

});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log("Server läuft auf Port", PORT);
});
