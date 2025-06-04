async function loadReceivedRecommendationsSmooth() {
  const receivedContainer = document.querySelector("#received-recommendations");
  const internetMonitor = window.internetMonitor || initInternetMonitor();

  try {
    // Check internet connectivity
    const isOnline = window.isOnline && window.isOnline();

    let recommendations;
    let isFromCache = false;

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

        console.log("Smoothly loaded fresh recommendations from server");
      } catch (networkError) {
        console.warn(
          "Network request failed in smooth load, using cache:",
          networkError
        );

        // If network fails but we have cache, use it silently
        if (recommendationsCache.data) {
          recommendations = recommendationsCache.get();
          isFromCache = true;
          // Don't show error message for smooth loading - just use cache silently
        } else {
          throw networkError; // Re-throw if no cache available
        }
      }
    } else {
      // Offline - use cache if available
      if (recommendationsCache.data) {
        recommendations = recommendationsCache.get();
        isFromCache = true;
        // For smooth loading, don't show offline message unless it's the first time
        if (!receivedContainer.querySelector(".recommendation-person")) {
          showMessage("You're offline. Showing cached recommendations", "error");
        }
      } else {
        throw new Error("No internet connection and no cached data available");
      }
    }

    // Only proceed if we have data
    if (!recommendations) {
      return;
    }

    // Render recommendations with state preservation
    renderRecommendationsSmooth(
      recommendations,
      receivedContainer,
      isFromCache
    );
  } catch (error) {
    console.error("Error loading recommendations smoothly:", error);

    // For smooth loading, don't replace content on error unless container is empty
    if (
      !receivedContainer.querySelector(".recommendation-person") &&
      !receivedContainer.querySelector(".no-recommendations-message")
    ) {
      if (
        error.message.includes("internet connection") ||
        error.message.includes("connection lost") ||
        (internetMonitor && internetMonitor.isNetworkError(error))
      ) {
        receivedContainer.innerHTML = `
          <div class="error-message">
            <p>No internet connection and no cached data available.</p>
            <p>Please check your connection and try again.</p>
            <button onclick="loadReceivedRecommendationsSmooth()" class="retry-btn">Retry</button>
          </div>
        `;
      }
    }
  }
}

// Helper function to render recommendations (extracted from original loadReceivedRecommendations)
function renderRecommendations(recommendations, container) {
  if (recommendations.length === 0) {
    container.innerHTML = `
      <div class="no-recommendations-message">
        <p>No recommendations received yet!</p>
        <p>Ask your friends to send you some music recommendations.</p>
      </div>
    `;
    return;
  }

  // Group recommendations by user
  const groupedRecommendations = recommendations.reduce((acc, rec) => {
    const userId = rec.friend_name;
    if (!acc[userId]) {
      acc[userId] = [];
    }
    acc[userId].push(rec);
    return acc;
  }, {});

  let html = "";
  for (const [userId, userRecs] of Object.entries(groupedRecommendations)) {
    const userName = userId;
    const count = userRecs.length;
    const noAvatar =
      "https://media.istockphoto.com/id/945691510/vector/people-icon-silhouettes-illustration-vector.jpg?s=612x612&w=0&k=20&c=chZcclmonc5T002ErDfMZ6KYz01tfHnd-Hzk4EfMJ6k=";
    const userAvatar = userRecs[0].friend_avatar || noAvatar;

    html += `
      <div class="recommendation-person" data-person="${userName}">
        <div class="person-header">
          <div class="friend-avatar">
            <img src="${userAvatar}" alt="${userName}">
          </div>
          <div class="friend-info">
            <span class="friend-name">${userName}</span>
            <span class="friend-song-count">${count} song${
      count > 1 ? "s" : ""
    } received</span>
          </div>
          <button class="expand-btn">▼</button>
        </div>
        <div class="songs-list hidden">
          ${userRecs
            .map((rec) => {
              const likeActive = rec.like_dislike === true ? "active" : "";
              const dislikeActive = rec.like_dislike === false ? "active" : "";
              return `
              <div class="song-item" data-rec-id="${
                rec.recommendation_id
              }" data-song-id="${rec.song_id}">
                <div class="song-album-cover">
                  <img src="${
                    rec.track_cover ||
                    "https://via.placeholder.com/60x60/1db954/white?text=♪"
                  }" alt="${rec.title}" class="album-cover">
                </div>
                <div class="song-details">
                  <div class="song-info">
                    <span class="song-title">${rec.title}</span>
                    <span class="song-artist">${rec.artist}</span>
                  </div>
                  <div class="song-actions">
                    <button class="like-btn ${likeActive}" data-action="like" title="Like">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                    </button>
                    <button class="dislike-btn ${dislikeActive}" data-action="dislike" title="Dislike">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
                      </svg>
                    </button>
                    <button class="play-btn" title="Play Now">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5,3 19,12 5,21"></polygon>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  setupRecommendationActions();
}

// Helper function for smooth rendering with state preservation
function renderRecommendationsSmooth(
  recommendations,
  container,
  isFromCache = false
) {
  if (recommendations.length === 0) {
    if (!container.querySelector(".no-recommendations-message")) {
      container.innerHTML = `
        <div class="no-recommendations-message">
          <p>No recommendations received yet!</p>
          <p>Ask your friends to send you some music recommendations.</p>
        </div>
      `;
    }
    return;
  }

  // Group recommendations by user
  const groupedRecommendations = recommendations.reduce((acc, rec) => {
    const userId = rec.friend_name;
    if (!acc[userId]) {
      acc[userId] = [];
    }
    acc[userId].push(rec);
    return acc;
  }, {});

  // Store current expanded states and button states
  const expandedPersons = new Set();
  const buttonStates = new Map();

  // Capture current UI state
  container.querySelectorAll(".recommendation-person").forEach((person) => {
    const personName = person.dataset.person;
    const songsList = person.querySelector(".songs-list");

    if (songsList && !songsList.classList.contains("hidden")) {
      expandedPersons.add(personName);
    }

    person.querySelectorAll(".song-item").forEach((songItem) => {
      const recId = songItem.dataset.recId;
      const likeBtn = songItem.querySelector(".like-btn");
      const dislikeBtn = songItem.querySelector(".dislike-btn");

      buttonStates.set(recId, {
        liked: likeBtn?.classList.contains("active") || false,
        disliked: dislikeBtn?.classList.contains("active") || false,
      });
    });
  });

  // Build new HTML
  let html = "";
  const noAvatar =
    "https://media.istockphoto.com/id/945691510/vector/people-icon-silhouettes-illustration-vector.jpg?s=612x612&w=0&k=20&c=chZcclmonc5T002ErDfMZ6KYz01tfHnd-Hzk4EfMJ6k=";

  for (const [userId, userRecs] of Object.entries(groupedRecommendations)) {
    const userName = userId;
    const count = userRecs.length;
    const userAvatar = userRecs[0].friend_avatar || noAvatar;
    const isExpanded = expandedPersons.has(userName);

    html += `
      <div class="recommendation-person" data-person="${userName}">
        <div class="person-header">
          <div class="friend-avatar">
            <img src="${userAvatar}" alt="${userName}">
          </div>
          <div class="friend-info">
            <span class="friend-name">${userName}</span>
            <span class="friend-song-count">${count} song${
      count > 1 ? "s" : ""
    } received</span>
          </div>
          <button class="expand-btn">${isExpanded ? "▲" : "▼"}</button>
        </div>
        <div class="songs-list ${isExpanded ? "" : "hidden"}">
          ${userRecs
            .map((rec) => {
              const storedState = buttonStates.get(
                rec.recommendation_id.toString()
              );
              let likeActive, dislikeActive;

              if (storedState) {
                likeActive = storedState.liked ? "active" : "";
                dislikeActive = storedState.disliked ? "active" : "";
              } else {
                likeActive = rec.like_dislike === true ? "active" : "";
                dislikeActive = rec.like_dislike === false ? "active" : "";
              }

              return `
              <div class="song-item" data-rec-id="${
                rec.recommendation_id
              }" data-song-id="${rec.song_id}">
                <div class="song-album-cover">
                  <img src="${
                    rec.track_cover ||
                    "https://via.placeholder.com/60x60/1db954/white?text=♪"
                  }" alt="${rec.title}" class="album-cover">
                </div>
                <div class="song-details">
                  <div class="song-info">
                    <span class="song-title">${rec.title}</span>
                    <span class="song-artist">${rec.artist}</span>
                  </div>
                  <div class="song-actions">
                    <button class="like-btn ${likeActive}" data-action="like" title="Like">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                    </button>
                    <button class="dislike-btn ${dislikeActive}" data-action="dislike" title="Dislike">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"></path>
                      </svg>
                    </button>
                    <button class="play-btn" title="Play Now">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <polygon points="5,3 19,12 5,21"></polygon>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            `;
            })
            .join("")}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  setupRecommendationActions();
}

// Helper function to show messages (implement based on your UI)
function showMessage(message, type) {
  console.log(`${type.toUpperCase()}: ${message}`);

  // You can implement your notification system here
  // For example, show a toast notification or update a status indicator
}

// Function to clear cache manually if needed
function clearRecommendationsCache() {
  recommendationsCache.clear();
  console.log("Recommendations cache cleared");
}

// Auto-retry mechanism when connection is restored
if (window.internetMonitor) {
  window.addEventListener("online", () => {
    // Auto-refresh recommendations when connection is restored
    setTimeout(() => {
      if (document.querySelector("#received-recommendations")) {
        console.log("Connection restored, refreshing recommendations...");
        loadReceivedRecommendationsSmooth();
      }
    }, 2000); // Wait 2 seconds after connection restoration
  });
}
window.loadReceivedRecommendationsSmooth = loadReceivedRecommendationsSmooth;
window.clearRecommendationsCache = clearRecommendationsCache;