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
    // Show loading state
    button.innerHTML = "Loading...";
    button.disabled = true;

    // Check authentication
    const authResponse = await fetch(
      "https://recspot-e6585868d70b.herokuapp.com/check_auth",
      {
        method: "GET",
        credentials: "include",
      }
    );

    if (authResponse.ok) {
      const authData = await authResponse.json();
      if (authData.authenticated) {
        showPopupFriends();
      } else {
        showPopupAuth();
      }
    } else {
      showPopupAuth();
    }
  } catch (error) {
    console.error("Error checking Auth:", error);
    showPopupAuth();
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
