// Cache for storing sent recommendations data
let sentRecommendationsCache = {
  data: null,
  timestamp: null,
  isValid: function () {
    // Cache is valid for 5 minutes
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
    return (
      this.data &&
      this.timestamp &&
      Date.now() - this.timestamp < CACHE_DURATION
    );
  },
  set: function (data) {
    this.data = data;
    this.timestamp = Date.now();
  },
  get: function () {
    return this.data;
  },
  clear: function () {
    this.data = null;
    this.timestamp = null;
  },
};

async function loadSentRecommendations() {
  const sentContainer = document.querySelector("#sent-recommendations");
  const internetMonitor = window.internetMonitor || initInternetMonitor();

  try {
    // Check internet connectivity
    const isOnline = window.isOnline && window.isOnline();

    let recommendations;

    if (isOnline) {
      // Try to fetch fresh data
      try {
        const response = await internetMonitor.fetchWithConnectivityCheck(
          "https://recspot-e6585868d70b.herokuapp.com/sent_recommendations",
          {
            method: "GET",
            credentials: "include",
          },
          10000 // 10 second timeout
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        recommendations = await response.json();

        // Update cache with fresh data
        sentRecommendationsCache.set(recommendations);

        console.log("Loaded fresh sent recommendations from server");
      } catch (networkError) {
        console.warn(
          "Network request failed, attempting to use cache:",
          networkError
        );

        // If network fails but we have valid cache, use it
        if (sentRecommendationsCache.isValid()) {
          recommendations = sentRecommendationsCache.get();
          showMessage(
            "Using cached sent recommendations due to connection issues",
            "error"
          );
        } else {
          throw networkError; // Re-throw if no valid cache
        }
      }
    } else {
      // Offline - use cache if available
      if (sentRecommendationsCache.isValid()) {
        recommendations = sentRecommendationsCache.get();
        showMessage("You're offline. Showing cached sent recommendations", "info");
      } else if (sentRecommendationsCache.data) {
        // Use stale cache if no fresh cache available
        recommendations = sentRecommendationsCache.get();
        showMessage(
          "You're offline. Showing older cached sent recommendations",
          "error"
        );
      } else {
        throw new Error("No internet connection and no cached data available");
      }
    }

    // Render sent recommendations
    renderSentRecommendations(recommendations, sentContainer);
  } catch (error) {
    console.error("Error loading sent recommendations:", error);

    // Handle different error types
    if (
      error.message.includes("internet connection") ||
      error.message.includes("connection lost") ||
      (internetMonitor && internetMonitor.isNetworkError(error))
    ) {
      // Try cache as last resort
      if (sentRecommendationsCache.data) {
        renderSentRecommendations(sentRecommendationsCache.get(), sentContainer);
        showMessage(
          "Connection lost. Showing cached sent recommendations",
          "error"
        );
      } else {
        sentContainer.innerHTML = `
          <div class="error-message">
            <p>No internet connection and no cached data available.</p>
            <p>Please check your connection and try again.</p>
            <button onclick="loadSentRecommendations()" class="retry-btn">Retry</button>
          </div>
        `;
      }
    } else {
      sentContainer.innerHTML = `
        <div class="error-message">
          <p>Error loading sent recommendations. Please try again later.</p>
          <button onclick="loadSentRecommendations()" class="retry-btn">Retry</button>
        </div>
      `;
    }
  }
}

  window.loadSentRecommendations = loadSentRecommendations;