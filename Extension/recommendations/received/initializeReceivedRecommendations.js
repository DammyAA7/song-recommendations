function initializeReceivedRecommendations() {
  loadReceivedRecommendations();
  startReceivedRecommendationsSmoothUpdates();
}

// Function to start smooth real-time updates
function startReceivedRecommendationsSmoothUpdates() {
  // Clear any existing interval
  if (receivedtRecommendationsInterval) {
    clearInterval(receivedtRecommendationsInterval);
  }

  // Initial load
  loadReceivedRecommendations();

  // Set up smooth polling every 2 seconds
  receivedtRecommendationsInterval = setInterval(() => {
    loadReceivedRecommendationsSmooth();
  }, 15000);
}

window.initializeReceivedRecommendations = initializeReceivedRecommendations;