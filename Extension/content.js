async function handleAuthFlow() {
  const authBtn = document.querySelector("#authorize-btn");
  if (!authBtn) return;

  authBtn.innerHTML = "Connecting...";
  authBtn.disabled = true;

  try {
    // First, let's check if we have any existing session
    console.log("Checking existing session...");

    const response = await fetch(
      "https://recspot-e6585868d70b.herokuapp.com/login",
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log("Login response:", data);

      if (data.auth_url) {
        // Open popup for authorization
        const authWindow = window.open(
          data.auth_url,
          "spotify-auth",
          "width=500,height=600,resizable=yes,scrollbars=yes"
        );

        // Handle the auth flow
        await handleAuthWindow(authWindow);

        // After successful auth, close current popup and show friends
        console.log("Auth completed successfully, showing friends popup");
        closePopup();
        setTimeout(() => showPopupFriends(), 300);
      } else {
        throw new Error("No auth URL received");
      }
    } else {
      const errorData = await response.json();
      console.error("Login API error:", errorData);
      throw new Error(`Login failed: ${errorData.error || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Auth flow error:", error);
    authBtn.innerHTML = "Try Again";
    authBtn.disabled = false;

    // Show error to user
    showMessage(error.message);
  }
}

async function handleAuthWindow(authWindow) {
  return new Promise((resolve, reject) => {
    let resolved = false;

    // Set timeout for the entire auth process
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (!authWindow.closed) {
          authWindow.close();
        }
        reject(new Error("Authentication timeout"));
      }
    }, 60000); // 1 minute timeout

    // Check if popup was closed manually
    const authCheckInterval = setInterval(() => {
      try {
        if (authWindow.closed && !resolved) {
          resolved = true;
          clearInterval(authCheckInterval);
          clearTimeout(timeout);

          // Check if auth was successful
          setTimeout(() => {
            checkAuthStatus().then((success) => {
              if (success) {
                resolve();
              } else {
                reject(new Error("Authentication was cancelled or failed"));
              }
            });
          }, 500); // Small delay to allow session to update
        }
      } catch (e) {
        // Ignore cross-origin errors
      }
    }, 1000);

    // Listen for postMessage from callback

    const messageHandler = (event) => {
      if (event.data === "auth_success" && !resolved) {
        resolved = true;
        clearInterval(authCheckInterval);
        clearTimeout(timeout);
        window.removeEventListener("message", messageHandler);

        if (!authWindow.closed) {
          authWindow.close();
        }

        // Small delay to ensure session is updated
        setTimeout(() => {
          resolve();
        }, 500);
      }
    };

    window.addEventListener("message", messageHandler);
  });
}

function loadModalFriendRequests() {
  const requestsList = document.querySelector("#modal-friend-requests-list");

  // Dummy friend request data
  const dummyRequests = [
    {
      id: "req_001",
      displayName: "Alex Johnson",
      profileImage: "https://i.pravatar.cc/150?img=1",
      mutualFriends: 5,
      requestDate: "2 days ago",
    },
    {
      id: "req_001",
      displayName: "Alex Johnson",
      profileImage: "https://i.pravatar.cc/150?img=1",
      mutualFriends: 5,
      requestDate: "2 days ago",
    },
    {
      id: "req_001",
      displayName: "Alex Johnson",
      profileImage: "https://i.pravatar.cc/150?img=1",
      mutualFriends: 5,
      requestDate: "2 days ago",
    },
    {
      id: "req_001",
      displayName: "Alex Johnson",
      profileImage: "https://i.pravatar.cc/150?img=1",
      mutualFriends: 5,
      requestDate: "2 days ago",
    },
    {
      id: "req_002",
      displayName: "Sarah Chen",
      profileImage: "https://i.pravatar.cc/150?img=2",
      mutualFriends: 2,
      requestDate: "1 week ago",
    },
    {
      id: "req_003",
      displayName: "Mike Rodriguez",
      profileImage: "https://i.pravatar.cc/150?img=3",
      mutualFriends: 8,
      requestDate: "3 days ago",
    },
  ];

  // Generate HTML for friend requests
  const requestsHTML = dummyRequests
    .map(
      (request) => `
    <div class="friend-request-item" data-request-id="${request.id}">
      <div class="request-user-info">
        <img src="${request.profileImage}" alt="${request.displayName}" class="request-avatar">
        <div class="request-details">
          <h4 class="request-name">${request.displayName}</h4>
          <p class="request-meta">${request.mutualFriends} mutual friends • ${request.requestDate}</p>
        </div>
      </div>
      <div class="request-actions">
        <button class="accept-btn spotify-btn-primary" onclick="acceptFriendRequest('${request.id}')">
          Accept
        </button>
        <button class="decline-btn spotify-btn-secondary" onclick="declineFriendRequest('${request.id}')">
          Decline
        </button>
      </div>
    </div>
  `
    )
    .join("");

  requestsList.innerHTML =
    requestsHTML || '<div class="no-requests">No friend requests</div>';
}

// Global function to toggle the friend requests modal
function toggleRequestsModal() {
  // Check if modal already exists
  let requestsModal = document.querySelector("#friend-requests-modal");

  if (requestsModal) {
    // Close existing modal
    requestsModal.remove();
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
  loadModalFriendRequests();

  // Close modal when clicking outside
  requestsModal.addEventListener("click", (e) => {
    if (e.target === requestsModal) {
      toggleRequestsModal();
    }
  });
}

function updateRequestsBadge() {
  // Update both floating button badge and modal list
  const floatingBadge = document.querySelector("#floating-requests-badge");
  const modalRequestsList = document.querySelector(
    "#modal-friend-requests-list"
  );

  let remainingRequests = 0;

  if (modalRequestsList) {
    remainingRequests = modalRequestsList.querySelectorAll(
      ".friend-request-item"
    ).length;

    if (remainingRequests === 0) {
      modalRequestsList.innerHTML =
        '<div class="no-requests">No friend requests</div>';
    }
  } else {
    // If modal isn't open, count from dummy data
    remainingRequests = 3; // This would come from your actual data source
  }

  if (floatingBadge) {
    if (remainingRequests === 0) {
      floatingBadge.style.display = "none";
    } else {
      floatingBadge.style.display = "block";
      floatingBadge.textContent = remainingRequests;
    }
  }
}

function acceptFriendRequest(requestId) {
  console.log("Accepting friend request:", requestId);

  // Remove the request from the UI
  const requestElement = document.querySelector(
    `[data-request-id="${requestId}"]`
  );
  if (requestElement) {
    requestElement.style.animation = "slideOut 0.3s ease-out forwards";
    setTimeout(() => {
      requestElement.remove();
      updateRequestsBadge();
    }, 300);
  }

  // Here you would make an API call to accept the friend request
  // Example:
  // fetch('/accept_friend_request', {
  //   method: 'POST',
  //   body: JSON.stringify({ requestId }),
  //   headers: { 'Content-Type': 'application/json' }
  // });

  showMessage("Friend request accepted!", "success");
}

function declineFriendRequest(requestId) {
  console.log("Declining friend request:", requestId);

  // Remove the request from the UI
  const requestElement = document.querySelector(
    `[data-request-id="${requestId}"]`
  );
  if (requestElement) {
    requestElement.style.animation = "slideOut 0.3s ease-out forwards";
    setTimeout(() => {
      requestElement.remove();
      updateRequestsBadge();
    }, 300);
  }

  // Here you would make an API call to decline the friend request
  // Example:
  // fetch('/decline_friend_request', {
  //   method: 'POST',
  //   body: JSON.stringify({ requestId }),
  //   headers: { 'Content-Type': 'application/json' }
  // });

  showMessage("Friend request declined", "info");
}

async function checkAuthStatus() {
  try {
    console.log("Checking auth status...");
    const response = await fetch(
      "https://recspot-e6585868d70b.herokuapp.com/check_auth",
      {
        method: "GET",
        credentials: "include",
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.authenticated) {
        console.log("User is authenticated");
        closePopup();
        setTimeout(() => showPopupFriends(), 300);
        return true;
      } else {
        console.log("User is not authenticated:", data.reason);
      }
    } else {
      console.log("Auth check failed with status:", response.status);
    }
  } catch (error) {
    console.error("Auth check error:", error);
  }
  return false;
}

let sentRecommendationsInterval = null;
let receivedtRecommendationsInterval = null;

// Initialize
waitForSpotify();
observeChanges();
