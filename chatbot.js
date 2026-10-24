
const chatInput = document.getElementById("userInput");
const chatButton = document.getElementById("sendButton");
const chatMessages = document.getElementById("chatMessages");
const chatStatus = document.getElementById("chatStatus");

let isSending = false;
let typingIndicator = null;

function showChatMessage(role, text) {
  const message = document.createElement("div");

  message.className =
    "chat-message " +
    (role === "user" ? "chat-user" : "chat-assistant");

  // Keep responses as plain text for security.
  message.textContent = text;

  chatMessages.appendChild(message);
  scrollChatToBottom();
}

function scrollChatToBottom() {
  chatMessages.scrollTo({
    top: chatMessages.scrollHeight,
    behavior: "smooth"
  });
}

function showTypingIndicator() {
  removeTypingIndicator();

  typingIndicator = document.createElement("div");
  typingIndicator.className =
    "chat-message chat-assistant chat-typing";
  typingIndicator.setAttribute("aria-label", "AI is typing");

  const label = document.createElement("span");
  label.className = "typing-label";
  label.textContent = "Thinking";

  const dots = document.createElement("span");
  dots.className = "typing-dots";
  dots.setAttribute("aria-hidden", "true");

  for (let i = 0; i < 3; i++) {
    const dot = document.createElement("span");
    dot.className = "typing-dot";
    dots.appendChild(dot);
  }

  typingIndicator.append(label, dots);
  chatMessages.appendChild(typingIndicator);
  scrollChatToBottom();
}

function removeTypingIndicator() {
  if (typingIndicator) {
    typingIndicator.remove();
    typingIndicator = null;
  }
}

function setLoading(loading) {
  isSending = loading;
  chatButton.disabled = loading;
  chatInput.disabled = loading;

  chatButton.textContent = loading ? "Thinking..." : "Send";
  chatButton.setAttribute("aria-busy", String(loading));

  if (loading) {
    chatStatus.textContent = "AI is preparing a response...";
  } else {
    chatStatus.textContent = "";
  }
}

async function sendChatMessage() {
  const question = chatInput.value.trim();

  if (!question || isSending) {
    return;
  }

  if (question.length > 1000) {
    chatStatus.textContent =
      "Please keep your question under 1000 characters.";
    return;
  }

  showChatMessage("user", question);
  chatInput.value = "";
  setLoading(true);
  showTypingIndicator();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ question })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data.error || "The AI service is temporarily unavailable."
      );
    }

    if (
      typeof data.answer !== "string" ||
      !data.answer.trim()
    ) {
      throw new Error("The AI service returned an empty answer.");
    }

    removeTypingIndicator();
    showChatMessage("assistant", data.answer);
  } catch (error) {
    console.error("Chat request failed:", error.message);

    removeTypingIndicator();

    if (!navigator.onLine) {
      showChatMessage(
        "assistant",
        "You appear to be offline. Please reconnect and try again."
      );
    } else {
      showChatMessage(
        "assistant",
        error.message || "Unable to contact the AI assistant."
      );
    }
  } finally {
    removeTypingIndicator();
    setLoading(false);
  }
}

chatButton.addEventListener("click", sendChatMessage);

chatInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    sendChatMessage();
  }
});
