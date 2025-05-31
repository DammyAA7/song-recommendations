// Wait for Spotify to load
function waitForSpotify() {
  const checkInterval = setInterval(() => {
    const playerControls = document.querySelector(
      '[data-testid="player-controls"]'
    );
    if (playerControls) {
      clearInterval(checkInterval);
      addRecommendButton();
    }
  }, 1000);
}

window.waitForSpotify = waitForSpotify;