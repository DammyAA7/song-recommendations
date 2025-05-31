function initializeSentRecommendations() {
    loadSentRecommendations();
    startSentRecommendationsSmoothUpdates();
  }

// Function to start smooth real-time updates
function startSentRecommendationsSmoothUpdates() {
  // Clear any existing interval
  if (sentRecommendationsInterval) {
    clearInterval(sentRecommendationsInterval);
  }

  // Initial load
  loadSentRecommendations();

  // Set up smooth polling every 2 seconds
  sentRecommendationsInterval = setInterval(() => {
    loadSentRecommendationsSmooth();
  }, 15000);
}

window.initializeSentRecommendations = initializeSentRecommendations;