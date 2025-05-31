function cleanupSentRecommendations() {
  stopSentRecommendationsUpdates();
}

function stopSentRecommendationsUpdates() {
  if (sentRecommendationsInterval) {
    clearInterval(sentRecommendationsInterval);
    sentRecommendationsInterval = null;
  }
}
window.cleanupSentRecommendations = cleanupSentRecommendations;