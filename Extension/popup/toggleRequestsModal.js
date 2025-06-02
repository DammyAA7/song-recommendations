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

  // Initialize WebSocket connection if not already done
  if (window.friendRequestManager && !window.friendRequestManager.socket) {
    await window.friendRequestManager.initializeRealtimeSubscription();
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
          <!-- Populated with dummy data -->
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
    window.friendRequestManager.onModalOpen();
  } else {
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

window.toggleRequestsModal = toggleRequestsModal;