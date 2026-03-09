const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

let rooms = {};

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 7).toUpperCase();
}

io.on("connection", (socket) => {

    console.log("Spieler verbunden:", socket.id);

    socket.on("createRoom", () => {
        const code = generateRoomCode();

        rooms[code] = {
            players: []
        };

        rooms[code].players.push(socket.id);
        socket.join(code);

        socket.emit("roomCreated", code);

        console.log("Room erstellt:", code);
    });

    socket.on("joinRoom", (code) => {
        code = code.toUpperCase();

        if (!rooms[code]) {
            socket.emit("errorMessage", "Room existiert nicht");
            return;
        }

        rooms[code].players.push(socket.id);
        socket.join(code);

        io.to(code).emit("playerCount", rooms[code].players.length);

        console.log("Spieler beigetreten:", code);
    });

    socket.on("disconnect", () => {
        console.log("Spieler getrennt:", socket.id);

        for (const code in rooms) {
            rooms[code].players =
                rooms[code].players.filter(id => id !== socket.id);

            if (rooms[code].players.length === 0) {
                delete rooms[code];
            }
        }
    });

});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("Server läuft auf Port", PORT);
});
