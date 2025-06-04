// Global function to toggle the friend requests modal
async function toggleRequestsModal() {
  // Check if modal already exists
  let requestsModal = document.querySelector("#friend-requests-modal");

  if (requestsModal) {
    // Close existing modal
    requestsModal.remove();
    if (window.friendRequestManager) {
      window.friendRequestManager.onModalClose();
    }
    return;
  }

  // Create new modal
  requestsModal = document.createElement("div");
  requestsModal.id = "friend-requests-modal";
  requestsModal.className = "requests-modal-overlay";

  // Add high z-index to ensure it appears on top of friends popup
  requestsModal.style.zIndex = "10001"; // Higher than typical popup z-index

  requestsModal.innerHTML = `
    <div class="requests-modal-content">
      <div class="requests-modal-header">
        <h3>Friend Requests</h3>
        <button class="close-requests-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      <div class="requests-modal-body">
        <div class="friend-requests-list" id="modal-friend-requests-list">
          <div class="loading-message">Loading friend requests...</div>
        </div>
      </div>
    </div>
  `;

  // Add to page
  document.body.appendChild(requestsModal);

  // Add event listener to close button AFTER the modal is added to DOM
  const closeBtn = requestsModal.querySelector(".close-requests-btn");
  closeBtn.addEventListener("click", toggleRequestsModal);

  // Load requests data
  // Use FriendRequestsManager to load requests data
  if (window.friendRequestManager) {
    console.log("Loading friend requests...");
    try {
      window.friendRequestManager.onModalOpen();

      // Add a timeout fallback in case the loading takes too long
      setTimeout(() => {
        const listElement = document.getElementById(
          "modal-friend-requests-list"
        );
        if (
          listElement &&
          listElement.innerHTML.includes("Loading friend requests...")
        ) {
          console.warn(
            "Friend requests took too long to load, showing fallback message"
          );
          listElement.innerHTML =
            '<div class="error-message">Unable to load friend requests. Please try again.</div>';
        }
      }, 10000); // 10 second timeout
    } catch (error) {
      console.error("Error loading friend requests:", error);
      document.getElementById("modal-friend-requests-list").innerHTML =
        '<div class="error-message">Error loading friend requests</div>';
    }
  } else {
    console.error("Friend request manager not available");
    // Fallback if manager is not available
    document.getElementById("modal-friend-requests-list").innerHTML =
      '<div class="error-message">Friend requests manager not available</div>';
  }

  // Close modal when clicking outside
  requestsModal.addEventListener("click", (e) => {
    if (e.target === requestsModal) {
      toggleRequestsModal();
    }
  });
}

// Initialize polling when page loads
document.addEventListener("DOMContentLoaded", async () => {
  console.log("DOM loaded, initializing friend request manager...");
  if (window.friendRequestManager) {
    try {
      const initialized = await window.friendRequestManager.initializePolling();
      console.log("Friend request manager initialized:", initialized);
    } catch (error) {
      console.error("Error initializing friend request manager:", error);
    }
  } else {
    console.error("Friend request manager not found on window object");
  }
});

window.toggleRequestsModal = toggleRequestsModal;
