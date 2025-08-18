const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Servir tous les fichiers du dossier actuel
app.use(express.static(__dirname));

// WebSocket pour chat
io.on("connection", (socket) => {
  console.log("✅ Un utilisateur est connecté");

  socket.on("chatMessage", (msg) => {
    console.log("📩 Message:", msg);
    io.emit("chatMessage", msg);
  });

  socket.on("disconnect", () => {
    console.log("❌ Un utilisateur s'est déconnecté");
  });
});

server.listen(PORT, () => {
  console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});
