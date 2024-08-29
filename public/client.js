// Initialize socket connection
const socket = io();

// DOM elements
const messages = document.getElementById("messages");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const skipButton = document.getElementById("skip-button");
const uploadButton = document.getElementById("upload-button");
const fileInput = document.getElementById("file-input");

// Typing indicator setup
const typingIndicator = document.createElement("div");
typingIndicator.classList.add("typing-indicator");
typingIndicator.textContent = "Partner is typing...";
typingIndicator.style.display = "none";
messages.appendChild(typingIndicator);

// State variables
let typingTimeout;
let isSearchingForPartner = false; // Tracks whether the user is currently searching for a chat partner

// Event listeners
sendButton.addEventListener("click", sendMessage);
skipButton.addEventListener("click", skipPartner);
uploadButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", handleFileUpload);
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  } else if (!isSearchingForPartner) {
    socket.emit("typing");
  }
});

// Socket event handlers
socket.on("message", (msg) => {
  if (msg.type === "image") {
    displayImage(msg.content, "theirs");
  } else if (msg.type === "video") {
    displayVideo(msg.content, "theirs");
  } else if (msg.type === "system") {
    displayMessage(msg.content, "system");
  } else {
    displayMessage(msg.content, "theirs");
  }
  hideTypingIndicator();
});

socket.on("partnerFound", () => {
  clearChat(); // Clears the chat window
  displayMessage(
    "Oh, we’ve found a new buddy for you. Start chatting with them!",
    "system"
  );
  hideTypingIndicator();
  isSearchingForPartner = false; // Reset the state
  messageInput.placeholder = "Type a message..."; // Rsestore the input placeholder
});

socket.on("partnerDisconnected", () => {
  displayMessage("Oops, your buddy has left you.", "system");
  hideTypingIndicator();
  skipPartner();
  isSearchingForPartner = true; // Update the state to "searching"
  messageInput.placeholder = "Wait for a new partner"; // Update the input placeholder
});

socket.on("noPartner", () => {
  displayMessage(
    "There are no new buddies available right now. Please wait for someone to connect...",
    "system"
  );
  hideTypingIndicator();
  isSearchingForPartner = true; // Update the state to "searching"
  messageInput.placeholder = "Wait for a new partner"; // Update the input placeholder
});

socket.on("typing", () => {
  if (!isSearchingForPartner) {
    showTypingIndicator();
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(hideTypingIndicator, 5000);
  }
});

// Function to send a message
function sendMessage() {
  if (!isSearchingForPartner) {
    const msg = messageInput.value.trim();
    if (msg) {
      socket.emit("message", { type: "text", content: msg });
      displayMessage(msg, "mine");
      messageInput.value = ""; // Clear the input field
      hideTypingIndicator();
    }
  }
}

// Function file upload
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file) {
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("File is too large. Maximum size is 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = function () {
      const base64 = reader.result;
      if (file.type.startsWith("image/")) {
        socket.emit("message", { type: "image", content: base64 });
        displayImage(base64, "mine");
      } else if (file.type.startsWith("video/")) {
        socket.emit("message", { type: "video", content: base64 });
        displayVideo(base64, "mine");
      }
    };
    reader.onerror = function () {
      console.error("Error reading file:", reader.error);
    };
    reader.readAsDataURL(file);
  }
}

// Function to skip the current partner
function skipPartner() {
  socket.emit("skip");
}

// Function to display a message in the chat window
function displayMessage(msg, type) {
  const div = document.createElement("div");
  div.classList.add("message");
  if (type === "mine") {
    div.classList.add("mine");
    div.textContent = `You: ${msg}`;
  } else if (type === "theirs") {
    div.classList.add("theirs");
    div.textContent = msg;
  } else {
    div.classList.add("system");
    div.textContent = msg;
  }
  messages.insertBefore(div, typingIndicator);
  messages.scrollTop = messages.scrollHeight;
}

// Function to display an image in the chat
function displayImage(base64, type) {
  const div = document.createElement("div");
  div.classList.add("message", type === "mine" ? "mine" : "theirs");
  const img = document.createElement("img");
  img.src = base64;
  img.style.maxWidth = "200px";
  div.appendChild(img);
  messages.insertBefore(div, typingIndicator);
  messages.scrollTop = messages.scrollHeight;
}

// Function to display a video in the chat
function displayVideo(base64, type) {
  const div = document.createElement("div");
  div.classList.add("message", type === "mine" ? "mine" : "theirs");
  const video = document.createElement("video");
  video.src = base64;
  video.controls = true;
  video.style.maxWidth = "200px";
  div.appendChild(video);
  messages.insertBefore(div, typingIndicator);
  messages.scrollTop = messages.scrollHeight; // Auto-scroll to the bottom
}

// Function to show the typing indicator
function showTypingIndicator() {
  typingIndicator.style.display = "block";
}

// Function to hide the typing indicator
function hideTypingIndicator() {
  typingIndicator.style.display = "none";
}

// Function to clear the chat window
function clearChat() {
  Array.from(messages.children).forEach((child) => {
    if (child !== typingIndicator) {
      messages.removeChild(child);
    }
  });
}
