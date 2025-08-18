const socket = io();

function sendMessage() {
  const box = document.getElementById("msgBox");
  const msg = box.value.trim();
  if (msg === "") return;

  socket.emit("chatMessage", msg);
  box.value = "";
}

// Afficher les messages
socket.on("chatMessage", (msg) => {
  const messages = document.getElementById("messages");
  const div = document.createElement("div");
  div.textContent = msg;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
});
