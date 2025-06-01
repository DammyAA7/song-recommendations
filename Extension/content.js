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
