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
          showMessage("You're offline. Showing cached recommendations", "info");
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
                  <div class="song-info-actions-row">
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
                    ${
                      rec.comment? 
                      `<div class="song-comment-section">
                        <div class="comment-bubble">
                          <span class="comment-text">${rec.comment}</span>
                        </div>
                      </div>`
                        : ""
                    }
                    ${rec.reply ? "" :
                    `<div class="comment-actions">
                      <button class="reply-btn" data-friend-name="${userName}" data-rec-id="${rec.recommendation_id}" title="Reply to ${userName}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                        </svg>
                        Reply
                      </button>
                    </div>`
                  }
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
  setupReplyActions();
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
    
              // Replace the song item HTML in renderRecommendationsSmooth function with this:
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
                  <div class="song-info-actions-row">
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
                    ${
                      rec.comment? 
                      `<div class="song-comment-section">
                        <div class="comment-bubble">
                          <span class="comment-text">${rec.comment}</span>
                        </div>
                      </div>`
                        : ""
                    }
                    ${rec.reply ? "" :
                    `<div class="comment-actions">
                      <button class="reply-btn" data-friend-name="${userName}" data-rec-id="${rec.recommendation_id}" title="Reply to ${userName}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                        </svg>
                        Reply
                      </button>
                    </div>`
                  }
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
  setupReplyActions();
}

function setupReplyActions() {
  document.querySelectorAll(".reply-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const friendName = btn.dataset.friendName;
      const recId = btn.dataset.recId;
      showCommentPopup({
        type: 'reply',
        friendName: friendName,
        recommendationId: recId,
        onSuccess: (replyText) => {
          console.log('Reply sent:', replyText);
        }
      });
    });
  });
}

// Add this new function to show the reply popup
function showReplyPopup(friendName, recId) {
  // Remove any existing popup
  const existingPopup = document.querySelector(".reply-popup-overlay");
  if (existingPopup) {
    existingPopup.remove();
  }

  // Create popup overlay
  const popupOverlay = document.createElement("div");
  popupOverlay.className = "reply-popup-overlay";

  popupOverlay.innerHTML = `
    <div class="reply-popup">
      <div class="reply-popup-header">
        <h3>Reply to ${friendName}</h3>
        <button class="close-popup-btn" type="button">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      <div class="reply-popup-body">
        <textarea 
          class="reply-textarea" 
          placeholder="Write your reply..." 
          maxlength="150"
          rows="4"
        ></textarea>
        <div class="character-count">
          <span class="current-count">0</span>/150
        </div>
      </div>
      <div class="reply-popup-footer">
        <button class="cancel-btn" type="button">Cancel</button>
        <button class="send-reply-btn" type="button" disabled>Send Reply</button>
      </div>
    </div>
  `;

  document.body.appendChild(popupOverlay);

  // Get elements
  const textarea = popupOverlay.querySelector(".reply-textarea");
  const currentCount = popupOverlay.querySelector(".current-count");
  const sendBtn = popupOverlay.querySelector(".send-reply-btn");
  const cancelBtn = popupOverlay.querySelector(".cancel-btn");
  const closeBtn = popupOverlay.querySelector(".close-popup-btn");

  // Character counter
  textarea.addEventListener("input", () => {
    const length = textarea.value.length;
    currentCount.textContent = length;
    sendBtn.disabled = length === 0;

    // Color coding for character count
    if (length > 130) {
      currentCount.style.color = "#e22134";
    } else if (length > 100) {
      currentCount.style.color = "#ffa500";
    } else {
      currentCount.style.color = "#b3b3b3";
    }
  });

  // Focus textarea
  textarea.focus();

  // Event listeners
  const closePopup = () => {
    popupOverlay.remove();
  };

  closeBtn.addEventListener("click", (e) => {
    if (e.target === closeBtn) {
      closePopup();
      showMessage("Reply cancelled", "info");
    }
  });

  cancelBtn.addEventListener("click", (e) => {
    if (e.target === cancelBtn) {
      closePopup();
      showMessage("Reply cancelled", "info");
    }
  });

  // Close on overlay click
  popupOverlay.addEventListener("click", (e) => {
    if (e.target === popupOverlay) {
      closePopup();
    }
  });

  // Send reply
  sendBtn.addEventListener("click", () => {
    const replyText = textarea.value.trim();
    if (replyText) {
      sendReply(friendName, recId, replyText);
      closePopup();
    }
  });

  // Handle Enter key (Ctrl+Enter to send)
  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.ctrlKey && !sendBtn.disabled) {
      sendReply(friendName, recId, textarea.value.trim());
      closePopup();
    }
  });
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
