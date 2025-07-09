async function loadSentRecommendationsSmooth() {
  const sentContainer = document.querySelector("#sent-recommendations");
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

        console.log("Smoothly loaded fresh sent recommendations from server");
      } catch (networkError) {
        console.warn(
          "Network request failed in smooth load, using cache:",
          networkError
        );

        // If network fails but we have cache, use it silently
        if (sentRecommendationsCache.data) {
          recommendations = sentRecommendationsCache.get();
          isFromCache = true;
          // Don't show error message for smooth loading - just use cache silently
        } else {
          throw networkError; // Re-throw if no cache available
        }
      }
    } else {
      // Offline - use cache if available
      if (sentRecommendationsCache.data) {
        recommendations = sentRecommendationsCache.get();
        isFromCache = true;
        // For smooth loading, don't show offline message unless it's the first time
        if (!sentContainer.querySelector(".recommendation-person")) {
          showMessage(
            "You're offline. Showing cached sent recommendations",
            "error"
          );
        }
      } else {
        throw new Error("No internet connection and no cached data available");
      }
    }

    // Only proceed if we have data
    if (!recommendations) {
      return;
    }

    // Check if we need to do a full rebuild or just status updates
    const existingItems = sentContainer.querySelectorAll(
      "[data-recommendation-id]"
    );
    const hasExistingStructure = existingItems.length > 0;

    if (hasExistingStructure && recommendations.length > 0) {
      // Try to update only status indicators for better UX
      let statusUpdated = false;

      recommendations.forEach((rec) => {
        const songItem = sentContainer.querySelector(
          `[data-recommendation-id="${rec.recommendation_id}"]`
        );

        if (songItem) {
          const statusContainer = songItem.querySelector(".song-status");
          const newStatusHTML = getStatusIndicator(rec.like_dislike);

          // Only update if status changed
          if (statusContainer && statusContainer.innerHTML !== newStatusHTML) {
            statusContainer.innerHTML = newStatusHTML;
            statusUpdated = true;

            // Add a subtle animation to indicate change
            statusContainer.style.transition = "all 0.3s ease";
            statusContainer.style.transform = "scale(1.1)";
            setTimeout(() => {
              statusContainer.style.transform = "scale(1)";
            }, 300);
          }
        }
      });

      // If we successfully updated statuses, no need for full rebuild
      if (statusUpdated) {
        console.log("Updated sent recommendation statuses smoothly");
        return;
      }
    }

    // If container is empty, structure changed, or we need a full rebuild
    renderSentRecommendationsSmooth(
      recommendations,
      sentContainer,
      isFromCache
    );
  } catch (error) {
    console.error("Error loading sent recommendations smoothly:", error);

    // For smooth loading, don't replace content on error unless container is empty
    if (
      !sentContainer.querySelector(".recommendation-person") &&
      !sentContainer.querySelector(".no-recommendations-message")
    ) {
      if (
        error.message.includes("internet connection") ||
        error.message.includes("connection lost") ||
        (internetMonitor && internetMonitor.isNetworkError(error))
      ) {
        sentContainer.innerHTML = `
          <div class="error-message">
            <p>No internet connection and no cached data available.</p>
            <p>Please check your connection and try again.</p>
            <button onclick="loadSentRecommendationsSmooth()" class="retry-btn">Retry</button>
          </div>
        `;
      }
    }
  }
}

// Helper function to render sent recommendations (extracted from original loadSentRecommendations)
function renderSentRecommendations(recommendations, container) {
  if (recommendations.length === 0) {
    container.innerHTML = `
      <div class="no-recommendations-message">
        <p>No recommendations sent yet!</p>
        <p>Start recommending songs to your friends.</p>
      </div>
    `;
    return;
  }

  // Group recommendations by friend
  const groupedRecommendations = recommendations.reduce((acc, rec) => {
    const friendName = rec.friend_name || rec.friend_id;
    if (!acc[friendName]) {
      acc[friendName] = [];
    }
    acc[friendName].push(rec);
    return acc;
  }, {});

  let html = "";
  for (const [friendName, friendRecs] of Object.entries(
    groupedRecommendations
  )) {
    const count = friendRecs.length;
    const noAvatar =
      "https://media.istockphoto.com/id/945691510/vector/people-icon-silhouettes-illustration-vector.jpg?s=612x612&w=0&k=20&c=chZcclmonc5T002ErDfMZ6KYz01tfHnd-Hzk4EfMJ6k=";
    const friendAvatar = friendRecs[0].friend_avatar || noAvatar;

    html += `
      <div class="recommendation-person" data-person="${friendName}">
        <div class="person-header">
          <div class="friend-avatar">
            <img src="${friendAvatar}" alt="${friendName}">
          </div>
          <div class="friend-info">
            <span class="friend-name">${friendName}</span>
            <span class="friend-song-count">${count} song${
      count > 1 ? "s" : ""
    } sent</span>
          </div>
          <button class="expand-btn">▼</button>
        </div>
        <div class="songs-list hidden">
          ${friendRecs
            .map(
              (rec) => `
              <div class="song-item" data-recommendation-id="${
                rec.recommendation_id
              }">
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
                </div>
                <div class="song-actions">
                    <div class="song-status">
                      ${getStatusIndicator(rec.like_dislike)}
                    </div>
                  </div>
              </div>
            `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
}

// Helper function for smooth rendering with state preservation
function renderSentRecommendationsSmooth(
  recommendations,
  container,
  isFromCache = false
) {
  if (recommendations.length === 0) {
    if (!container.querySelector(".no-recommendations-message")) {
      container.innerHTML = `
        <div class="no-recommendations-message">
          <p>No recommendations sent yet!</p>
          <p>Start recommending songs to your friends.</p>
        </div>
      `;
    }
    return;
  }

  // Group recommendations by friend
  const groupedRecommendations = recommendations.reduce((acc, rec) => {
    const friendName = rec.friend_name || rec.friend_id;
    if (!acc[friendName]) {
      acc[friendName] = [];
    }
    acc[friendName].push(rec);
    return acc;
  }, {});

  // Store current expanded states
  const expandedPersons = new Set();

  // Capture current UI state
  container.querySelectorAll(".recommendation-person").forEach((person) => {
    const personName = person.dataset.person;
    const songsList = person.querySelector(".songs-list");

    if (songsList && !songsList.classList.contains("hidden")) {
      expandedPersons.add(personName);
    }
  });

  // Build new HTML
  let html = "";
  const noAvatar =
    "https://media.istockphoto.com/id/945691510/vector/people-icon-silhouettes-illustration-vector.jpg?s=612x612&w=0&k=20&c=chZcclmonc5T002ErDfMZ6KYz01tfHnd-Hzk4EfMJ6k=";

  for (const [friendName, friendRecs] of Object.entries(
    groupedRecommendations
  )) {
    const count = friendRecs.length;
    const friendAvatar = friendRecs[0].friend_avatar || noAvatar;
    const isExpanded = expandedPersons.has(friendName);

    html += `
      <div class="recommendation-person" data-person="${friendName}">
        <div class="person-header">
          <div class="friend-avatar">
            <img src="${friendAvatar}" alt="${friendName}">
          </div>
          <div class="friend-info">
            <span class="friend-name">${friendName}</span>
            <span class="friend-song-count">${count} song${
      count > 1 ? "s" : ""
    } sent</span>
          </div>
          <button class="expand-btn">${isExpanded ? "▲" : "▼"}</button>
        </div>
        <div class="songs-list ${isExpanded ? "" : "hidden"}">
          ${friendRecs
            .map(
              (rec) => `
              <div class="song-item" data-recommendation-id="${
                rec.recommendation_id
              }">
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
                </div>
                
              </div>
            `
            )
            .join("")}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  setupSentRecommendationActions();
}


// Auto-retry mechanism when connection is restored
if (window.internetMonitor) {
  window.addEventListener("online", () => {
    // Auto-refresh sent recommendations when connection is restored
    setTimeout(() => {
      if (document.querySelector("#sent-recommendations")) {
        console.log("Connection restored, refreshing sent recommendations...");
        loadSentRecommendationsSmooth();
      }
    }, 2000); // Wait 2 seconds after connection restoration
  });
}

window.clearSentRecommendationsCache = clearSentRecommendationsCache;
window.loadSentRecommendationsSmooth = loadSentRecommendationsSmooth;