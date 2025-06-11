/**
 * Shows a comment popup for either adding a comment to a recommendation or replying
 * @param {Object} options - Configuration object
 * @param {string} options.type - 'comment' for new recommendation comment, 'reply' for reply
 * @param {string} options.friendName - Name of the friend
 * @param {string} options.recommendationId - ID of the recommendation
 * @param {string} [options.songTitle] - Title of the song (for comment type)
 * @param {Function} [options.onSuccess] - Callback function called on successful submission
 */

function showCommentPopup(options) {
  const { type, friendName, recommendationId, songTitle, onSuccess } = options;
  
  // Validate required parameters
  if (!type || !friendName || !recommendationId) {
    console.error('Missing required parameters for comment popup');
    return;
  }

  // Remove any existing popup
  const existingPopup = document.querySelector(".comment-popup-overlay");
  if (existingPopup) {
    existingPopup.remove();
  }

  // Determine popup title and placeholder based on type
  const isReply = type === 'reply';
  const title = isReply ? `Reply to ${friendName}` : `Add comment for ${friendName}`;
  const placeholder = isReply 
    ? "Write your reply..." 
    : `Add a comment about ${songTitle || 'this song'}...`;

  // Create popup overlay
  const popupOverlay = document.createElement("div");
  popupOverlay.className = "comment-popup-overlay";

  popupOverlay.innerHTML = `
    <div class="comment-popup">
      <div class="comment-popup-header">
        <h3>${title}</h3>
        <button class="close-popup-btn" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="comment-popup-body">
        <textarea 
          class="comment-textarea" 
          placeholder="${placeholder}" 
          maxlength="75"
          rows="4"
        ></textarea>
        <div class="character-count">
          <span class="current-count">0</span>/75
        </div>
      </div>
      <div class="comment-popup-footer">
        <button class="cancel-btn" type="button">Cancel</button>
        <button class="send-comment-btn" type="button" disabled>
          ${isReply ? 'Send Reply' : 'Add Comment'}
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(popupOverlay);

  // Get elements
  const textarea = popupOverlay.querySelector(".comment-textarea");
  const currentCount = popupOverlay.querySelector(".current-count");
  const sendBtn = popupOverlay.querySelector(".send-comment-btn");
  const cancelBtn = popupOverlay.querySelector(".cancel-btn");
  const closeBtn = popupOverlay.querySelector(".close-popup-btn");

  // Character counter
  textarea.addEventListener("input", () => {
    const length = textarea.value.length;
    currentCount.textContent = length;
    sendBtn.disabled = length === 0;

    // Color coding for character count
    if (length > 60) {
      currentCount.style.color = "#e22134";
    } else if (length > 45) {
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

  closeBtn.addEventListener("click", closePopup);
  cancelBtn.addEventListener("click", closePopup);

  // Close on overlay click
  popupOverlay.addEventListener("click", (e) => {
    if (e.target === popupOverlay) {
      closePopup();
    }
  });

  // Send comment/reply
  sendBtn.addEventListener("click", async () => {
    const commentText = textarea.value.trim();
    if (commentText) {
      // Disable button and show loading state
      sendBtn.disabled = true;
      sendBtn.innerHTML = isReply ? 'Sending Reply...' : 'Adding Comment...';
      
      try {
        await sendComment(recommendationId, commentText);
        
        // Show success message
        showMessage(
          isReply 
            ? `Reply sent to ${friendName}!` 
            : `Comment added for ${friendName}!`, 
          'success'
        );
        
        // Call success callback if provided
        if (onSuccess && typeof onSuccess === 'function') {
          onSuccess(commentText);
        }
        
        closePopup();
      } catch (error) {
        console.error('Error sending comment:', error);
        showMessage(
          isReply 
            ? 'Failed to send reply. Please try again.' 
            : 'Failed to add comment. Please try again.', 
          'error'
        );
        
        // Re-enable button
        sendBtn.disabled = false;
        sendBtn.innerHTML = isReply ? 'Send Reply' : 'Add Comment';
      }
    }
  });

  // Handle Enter key (Ctrl+Enter to send)
  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.ctrlKey && !sendBtn.disabled) {
      sendBtn.click();
    }
  });
}

window.showCommentPopup = showCommentPopup;