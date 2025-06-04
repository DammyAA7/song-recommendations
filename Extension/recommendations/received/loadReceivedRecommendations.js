// Cache for storing recommendations data
let recommendationsCache = {
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

async function loadReceivedRecommendations() {
  const receivedContainer = document.querySelector("#received-recommendations");
  const internetMonitor = window.internetMonitor || initInternetMonitor();

  try {
    // Check internet connectivity
    const isOnline = window.isOnline && window.isOnline();

    let recommendations;

    if (isOnline) {
      // Try to fetch fresh data
      try {
        const response = await internetMonitor.fetchWithConnectivityCheck(
          "https://recspot-e6585868d70b.herokuapp.com/recommendations",
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
        recommendationsCache.set(recommendations);

        console.log("Loaded fresh recommendations from server");
      } catch (networkError) {
        console.warn(
          "Network request failed, attempting to use cache:",
          networkError
        );

        // If network fails but we have valid cache, use it
        if (recommendationsCache.isValid()) {
          recommendations = recommendationsCache.get();
          showMessage(
            "Using cached recommendations due to connection issues",
            "error"
          );
        } else {
          throw networkError; // Re-throw if no valid cache
        }
      }
    } else {
      // Offline - use cache if available
      if (recommendationsCache.isValid()) {
        recommendations = recommendationsCache.get();
        showMessage("You're offline. Showing cached recommendations", "info");
      } else if (recommendationsCache.data) {
        // Use stale cache if no fresh cache available
        recommendations = recommendationsCache.get();
        showMessage(
          "You're offline. Showing older cached recommendations",
          "error"
        );
      } else {
        throw new Error("No internet connection and no cached data available");
      }
    }

    // Render recommendations
    renderRecommendations(recommendations, receivedContainer);
  } catch (error) {
    console.error("Error loading recommendations:", error);

    // Handle different error types
    if (
      error.message.includes("internet connection") ||
      error.message.includes("connection lost") ||
      (internetMonitor && internetMonitor.isNetworkError(error))
    ) {
      // Try cache as last resort
      if (recommendationsCache.data) {
        renderRecommendations(recommendationsCache.get(), receivedContainer);
        showMessage(
          "Connection lost. Showing cached recommendations",
          "error"
        );
      } else {
        receivedContainer.innerHTML = `
          <div class="error-message">
            <p>No internet connection and no cached data available.</p>
            <p>Please check your connection and try again.</p>
            <button onclick="loadReceivedRecommendations()" class="retry-btn">Retry</button>
          </div>
        `;
      }
    } else {
      receivedContainer.innerHTML = `
        <div class="error-message">
          <p>Error loading recommendations. Please try again later.</p>
          <button onclick="loadReceivedRecommendations()" class="retry-btn">Retry</button>
        </div>
      `;
    }
  }
}
window.loadReceivedRecommendations = loadReceivedRecommendations;