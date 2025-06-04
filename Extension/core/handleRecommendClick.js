// This script adds a "Recommend" button to the Spotify web player
// executes when the user clicks the button
async function handleRecommendClick() {
  if (document.getElementById("spotify-recommend-popup")) {
    togglePopup();
    return;
  }

  const button = document.getElementById("custom-spotify-button");
  const originalText = button.innerHTML;

  try {
    // Check internet connectivity first
    if (!window.isOnline || !window.isOnline()) {
      showMessage(
        "No internet connection. Please check your connection and try again.",
        "error"
      );
      return;
    }

    // Show loading state
    button.innerHTML = "Loading...";
    button.disabled = true;

    // Use the internet monitor's fetch method for connectivity-aware requests
    const internetMonitor = window.internetMonitor || initInternetMonitor();

    // Check authentication with connectivity monitoring
    const authResponse = await internetMonitor.fetchWithConnectivityCheck(
      "https://recspot-e6585868d70b.herokuapp.com/check_auth",
      {
        method: "GET",
        credentials: "include",
      },
      15000 // 15 second timeout for auth check
    );

    if (authResponse.ok) {
      const authData = await authResponse.json();
      if (authData.authenticated) {
        await showPopupFriends();
      } else {
        showPopupAuth();
      }
    } else {
      showPopupAuth();
    }
  } catch (error) {
    console.error("Error in handleRecommendClick:", error);

    // Handle different types of errors
    if (
      error.message.includes("internet connection") ||
      error.message.includes("connection lost") ||
      error.message.includes("timeout") ||
      error.message.includes("unstable")
    ) {
      showMessage(
        "Connection issue detected. Please check your internet connection and try again.",
        "error"
      );
    } else if (internetMonitor && internetMonitor.isNetworkError(error)) {
      showMessage(
        "Network error occurred. Please try again when your connection is stable.",
        "error"
      );
    } else {
      // Fallback for other errors
      showMessage(
        "Unable to connect to Spotify services. Please try again later.",
        "error"
      );
      showPopupAuth(); // Show auth popup as fallback
    }
  } finally {
    button.innerHTML = originalText;
    button.disabled = false;
  }
}

function togglePopup() {
  const popup = document.getElementById("spotify-recommend-popup");
  if (popup) {
    closePopup();
  }
}

window.handleRecommendClick = handleRecommendClick;
