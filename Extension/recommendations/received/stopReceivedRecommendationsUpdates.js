function cleanupReceivedRecommendations() {
    stopReceivedRecommendationsUpdates();
  }

// Function to stop real-time updates
function stopReceivedRecommendationsUpdates() {
  if (receivedtRecommendationsInterval) {
    clearInterval(receivedtRecommendationsInterval);
    receivedtRecommendationsInterval = null;
  }
}

window.cleanupReceivedRecommendations = cleanupReceivedRecommendations;