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
let isSearchingForPartner = false;

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

// Upload Files and Drag & Drop
const chatContainer = document.getElementById("chat-container");

["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
  chatContainer.addEventListener(eventName, preventDefaults, false);
});

function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

["dragenter", "dragover"].forEach((eventName) => {
  chatContainer.addEventListener(
    eventName,
    () => chatContainer.classList.add("highlight"),
    false
  );
});

["dragleave", "drop"].forEach((eventName) => {
  chatContainer.addEventListener(
    eventName,
    () => chatContainer.classList.remove("highlight"),
    false
  );
});

chatContainer.addEventListener("drop", handleDrop, false);

function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;
  handleFiles(files);
}

function handleFiles(files) {
  [...files].forEach(uploadFile);
}

function uploadFile(file) {
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    alert("File is too large. Maximum size is 50MB.");
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

// Socket event handlers
socket.on("message", (msg) => {
  if (msg.type === "image") {
    displayImage(msg.content, "theirs", msg.nsfw);
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
  clearChat();
  displayMessage("New partner found! Start chatting", "system");
  hideTypingIndicator();
  isSearchingForPartner = false;
  messageInput.placeholder = "Type a message...";
});

socket.on("partnerDisconnected", () => {
  displayMessage("Your partner has left", "system");
  hideTypingIndicator();
  skipPartner();
  isSearchingForPartner = true;
  messageInput.placeholder = "Wait for a new partner";
});

socket.on("noPartner", () => {
  displayMessage("No partners available. Please wait", "system");
  hideTypingIndicator();
  isSearchingForPartner = true;
  messageInput.placeholder = "Wait for a new partner";
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
      messageInput.value = "";
      hideTypingIndicator();
    }
  }
}

// Function to handle file upload via input
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (file) {
    uploadFile(file);
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
  } else if (type === "system") {
    div.classList.add("system");

    // Create a close button
    const closeButton = document.createElement("div");
    closeButton.classList.add("close-btn");
    closeButton.innerHTML = "&times;";
    closeButton.addEventListener("click", () => div.remove());

    const icon = document.createElement("span");
    icon.classList.add("icon");
    icon.innerHTML = "🔔";

    div.appendChild(icon);
    div.appendChild(document.createTextNode(msg));
    div.appendChild(closeButton);
  }

  messages.insertBefore(div, typingIndicator);
  messages.scrollTop = messages.scrollHeight;
}

// Function to display an image in the chat
function displayImage(base64, type, isNSFW = false) {
  const div = document.createElement("div");
  div.classList.add("message", type === "mine" ? "mine" : "theirs");

  const img = document.createElement("img");
  img.src = base64;
  img.style.maxWidth = "200px";
  img.style.cursor = "pointer";

  if (isNSFW) {
    img.classList.add("nsfw-image");
    img.title = "Click to view";

    // Create an overlay for NSFW images
    const overlay = document.createElement("div");
    overlay.classList.add("nsfw-overlay");
    overlay.innerHTML = `
      <span class="eye-icon">👁️</span>
      <span class="nsfw-text">Explicit content. Click to view.</span>
    `;

    // Click event to remove blur and overlay
    img.addEventListener("click", () => {
      img.classList.remove("nsfw-image");
      overlay.style.display = "none";
    });

    div.style.position = "relative";
    div.appendChild(overlay);
  } else {
    img.addEventListener("click", () => openImagePreview(base64));
  }

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
  messages.scrollTop = messages.scrollHeight;
}

// Function to open the image preview
function openImagePreview(src) {
  const previewContainer = document.getElementById("image-preview-container");
  const previewImage = previewContainer.querySelector("img");
  previewImage.src = src;
  previewContainer.style.display = "flex";
}

// Function to close the image preview
function closeImagePreview() {
  const previewContainer = document.getElementById("image-preview-container");
  previewContainer.style.display = "none";
}

// Event listener to close the image preview
document
  .querySelector("#image-preview-container .close-btn")
  .addEventListener("click", closeImagePreview);

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
