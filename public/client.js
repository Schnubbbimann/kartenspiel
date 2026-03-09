const socket = io();
let currentRoom = null;

function createRoom(){
    socket.emit("createRoom");
}

function joinRoom(){
    const code = document.getElementById("roomInput").value;
    currentRoom = code;
    socket.emit("joinRoom", code);
}

function startGame(){
    socket.emit("startGame", currentRoom);
}

socket.on("roomCreated", (code) => {
    currentRoom = code;
    document.getElementById("info").innerText = "Room: " + code;
});

socket.on("playerCount", (count) => {
    document.getElementById("info").innerText = "Spieler: " + count;
});

socket.on("state", (state) => {
    document.getElementById("game").innerText =
        JSON.stringify(state, null, 2);
});
