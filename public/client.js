// Initialize socket connection
const socket = io();

// DOM elements
const messages = document.getElementById("messages");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const skipButton = document.getElementById("skip-button");

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
messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    sendMessage();
  } else if (!isSearchingForPartner) {
    socket.emit("typing");
  }
});

// Socket event handlers
socket.on("message", (msg) => {
  displayMessage(msg, "theirs");
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
  messageInput.placeholder = "Type a message..."; // Restore the input placeholder
});

socket.on("partnerDisconnected", () => {
  displayMessage(
    "Oops, your buddy has left you. We are finding another one",
    "system"
  );
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
    typingTimeout = setTimeout(hideTypingIndicator, 10000); // Hide typing indicator after 10 seconds of inactivity
  }
});

// Function to send a message
function sendMessage() {
  if (!isSearchingForPartner) {
    // Ensure input is not blocked
    const msg = messageInput.value.trim();
    if (msg) {
      socket.emit("message", { text: msg, from: "mine" });
      displayMessage(msg, "mine");
      messageInput.value = ""; // Clear the input field
      hideTypingIndicator();
    }
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

// Function to clear the chat window, preserving system messages
function clearChat() {
  Array.from(messages.children).forEach((child) => {
    if (child !== typingIndicator) {
      messages.removeChild(child);
    }
  });
}
