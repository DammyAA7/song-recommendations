/**
 * Function to show a reply popup for a friend
 * @param {string} friendName - Name of the friend to reply to
 * @param {string} recId - Recommendation ID to reply to
 * @returns {void}
 */
function showReplyPopup(friendName, recId) {
  // Remove any existing popup
  const existingPopup = document.querySelector(".reply-popup-overlay");
  if (existingPopup) {
    existingPopup.remove();
  }

  // Create popup overlay
  const popupOverlay = document.createElement("div");
  popupOverlay.className = "reply-popup-overlay";

  popupOverlay.innerHTML = `
    <div class="reply-popup">
      <div class="reply-popup-header">
        <h3>Reply to ${friendName}</h3>
        <button class="close-popup-btn" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="reply-popup-body">
        <textarea 
          class="reply-textarea" 
          placeholder="Write your reply..." 
          maxlength="150"
          rows="4"
        ></textarea>
        <div class="character-count">
          <span class="current-count">0</span>/150
        </div>
      </div>
      <div class="reply-popup-footer">
        <button class="cancel-btn" type="button">Cancel</button>
        <button class="send-reply-btn" type="button" disabled>Send Reply</button>
      </div>
    </div>
  `;

  document.body.appendChild(popupOverlay);

  // Get elements
  const textarea = popupOverlay.querySelector(".reply-textarea");
  const currentCount = popupOverlay.querySelector(".current-count");
  const sendBtn = popupOverlay.querySelector(".send-reply-btn");
  const cancelBtn = popupOverlay.querySelector(".cancel-btn");
  const closeBtn = popupOverlay.querySelector(".close-popup-btn");

  // Character counter
  textarea.addEventListener("input", () => {
    const length = textarea.value.length;
    currentCount.textContent = length;
    sendBtn.disabled = length === 0;

    // Color coding for character count
    if (length > 130) {
      currentCount.style.color = "#e22134";
    } else if (length > 100) {
      currentCount.style.color = "#ffa500";
    } else {
      currentCount.style.color = "#b3b3b3";
    }
  });

  // Focus textarea
  textarea.focus();

  // Event listeners
  const closePopup = () => {
    popupOverlay.remove();
  };

  closeBtn.addEventListener("click", (e) => {
    if (e.target === closeBtn) {
      closePopup();
      showMessage("Reply cancelled", "info");
    }
  });

  cancelBtn.addEventListener("click", (e) => {
    if (e.target === cancelBtn) {
      closePopup();
      showMessage("Reply cancelled", "info");
    }
  });

  // Close on overlay click
  popupOverlay.addEventListener("click", (e) => {
    if (e.target === popupOverlay) {
      closePopup();
    }
  });

  // Send reply
  sendBtn.addEventListener("click", () => {
    const replyText = textarea.value.trim();
    if (replyText) {
      sendReply(friendName, recId, replyText);
      closePopup();
    }
  });

  // Handle Enter key (Ctrl+Enter to send)
  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.ctrlKey && !sendBtn.disabled) {
      sendReply(friendName, recId, textarea.value.trim());
      closePopup();
    }
  });
}

window.showReplyPopup = showReplyPopup;