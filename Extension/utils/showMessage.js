/**
 * Display a transient “toast”-style message at the top of the #friends-tab container.
 * @param {string} message – The text to show.
 * @param {"error"|"success"} [type="error"] – Determines background color via CSS classes.
 */
function showMessage(message, type = "error") {
  // Remove any existing messages first
  const existingMessage = document.querySelector(".message-display");
  if (existingMessage) {
    const existingContent = existingMessage.querySelector(".message-content");
    existingContent.classList.add("slide-up");
    setTimeout(() => existingMessage.remove(), 300);
  }

  const messageDiv = document.createElement("div");
  messageDiv.className = "message-display";

  messageDiv.innerHTML = `
    <div class="message-content ${type}">
      <span>${message}</span>
    </div>
  `;

  // Insert at the top of the friends tab content
  const friendsContainer = document.querySelector("#friends-tab");
  if (friendsContainer) {
    // Add push-down class to existing content
    const existingContent = friendsContainer.children;
    Array.from(existingContent).forEach((child) => {
      if (!child.classList.contains("message-display")) {
        child.classList.add("content-push-down");
      }
    });

    friendsContainer.insertBefore(messageDiv, friendsContainer.firstChild);

    // Remove push-down class after animation completes
    setTimeout(() => {
      Array.from(existingContent).forEach((child) => {
        child.classList.remove("content-push-down");
      });
    }, 1000);
  }

  // Auto-remove after 3 seconds
  setTimeout(() => {
    if (messageDiv.parentElement) {
      const messageContent = messageDiv.querySelector(".message-content");
      messageContent.classList.add("slide-up");

      // Add push-up animation to content when message is removed
      const siblingContent = friendsContainer.children;
      Array.from(siblingContent).forEach((child) => {
        if (!child.classList.contains("message-display")) {
          child.classList.add("content-push-up");
        }
      });

      setTimeout(() => {
        messageDiv.remove();
        // Clean up push-up classes
        Array.from(siblingContent).forEach((child) => {
          child.classList.remove("content-push-up");
        });
      }, 500);
    }
  }, 3000);
}

window.showMessage = showMessage;
