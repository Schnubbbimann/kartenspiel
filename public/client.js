const socket = io();

let currentRoom = null;

function createRoom(){
    socket.emit("createRoom");
}

function joinRoom(){
    const code = document.getElementById("roomInput").value;
    socket.emit("joinRoom", code);
    currentRoom = code;
}

socket.on("roomCreated", (code) => {
    currentRoom = code;
    document.getElementById("info").innerText =
        "Room erstellt: " + code;
});

socket.on("playerCount", (count) => {
    document.getElementById("info").innerText =
        "Spieler im Room: " + count;
});

socket.on("errorMessage", (msg) => {
    alert(msg);
});
