/**
 * Display a popup message with warning icon that appears on top of all other elements.
 * @param {string} message – The text to show.
 * @param {"error"|"success"|"info"} [type="info"] – Determines background color and icon.
 */
function showMessage(message, type = "info") {
  // Remove any existing messages first
  const existingMessage = document.querySelector(".message-popup");
  if (existingMessage) {
    existingMessage.remove();
  }

  // Create popup overlay
  const popupOverlay = document.createElement("div");
  popupOverlay.className = "message-popup";

  // Get appropriate icon based on type
  const getIcon = (messageType) => {
    switch (messageType) {
      case "error":
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>`;
      case "success":
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m9 12 2 2 4-4"></path>
          <circle cx="12" cy="12" r="10"></circle>
        </svg>`;
      case "info":
      default:
        return `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="m9 9 3-3 3 3"></path>
          <path d="M12 6v6"></path>
          <path d="M12 18h.01"></path>
        </svg>`;
    }
  };

  popupOverlay.innerHTML = `
    <div class="message-popup-content ${type}">
      <div class="message-icon">
        ${getIcon(type)}
      </div>
      <div class="message-text">
        <span>${message}</span>
      </div>
    </div>
  `;

  // Add to document body to ensure it's on top
  document.body.appendChild(popupOverlay);

  // Auto-remove after 5 seconds (longer for popup to give users time to read)
  setTimeout(() => {
    if (popupOverlay.parentElement) {
      popupOverlay.classList.add("fade-out");
      setTimeout(() => {
        if (popupOverlay.parentElement) {
          popupOverlay.remove();
        }
      }, 300);
    }
  }, 4000);

  // Close on overlay click (outside the popup content)
  popupOverlay.addEventListener("click", (e) => {
    if (e.target === popupOverlay) {
      popupOverlay.remove();
    }
  });

  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === "Escape") {
      popupOverlay.remove();
      document.removeEventListener("keydown", handleEscape);
    }
  };
  document.addEventListener("keydown", handleEscape);
}

window.showMessage = showMessage;