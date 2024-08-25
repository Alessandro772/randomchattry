const express = require("express");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static("public"));

let waitingUsers = [];
let onlineUsers = 0;

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);
  onlineUsers++;
  io.emit("updateUserCount", onlineUsers);

  socket.on("message", (msg) => {
    if (socket.partner) {
      socket.partner.emit("message", msg);
    }
  });

  socket.on("typing", () => {
    if (socket.partner) {
      socket.partner.emit("typing");
    }
  });

  socket.on("skip", () => {
    if (socket.partner) {
      socket.partner.emit("partnerDisconnected");
      socket.partner.partner = null;
      socket.partner = null;
    }
    matchUser(socket);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
    onlineUsers--;
    io.emit("updateUserCount", onlineUsers);
    if (socket.partner) {
      socket.partner.emit("partnerDisconnected");
      socket.partner.partner = null;
    }
    waitingUsers = waitingUsers.filter((user) => user !== socket);
  });

  matchUser(socket);
});

function matchUser(socket) {
  if (waitingUsers.length > 0) {
    let partner = waitingUsers.pop();
    if (partner === socket) {
      waitingUsers.push(partner);
      socket.emit("noPartner");
    } else {
      socket.partner = partner;
      partner.partner = socket;
      socket.emit("partnerFound");
      partner.emit("partnerFound");
    }
  } else {
    waitingUsers.push(socket);
    socket.emit("noPartner");
  }
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
