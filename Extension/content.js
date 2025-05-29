// Wait for Spotify to load
function waitForSpotify() {
  const checkInterval = setInterval(() => {
    const playerControls = document.querySelector(
      '[data-testid="player-controls"]'
    );
    if (playerControls) {
      clearInterval(checkInterval);
      addCustomButton();
    }
  }, 1000);
}

function addCustomButton() {
  // Check if button already exists
  if (document.getElementById("custom-spotify-button")) {
    return;
  }

  // Create the button
  const button = document.createElement("button");
  button.id = "custom-spotify-button";
  button.innerHTML = "Recommend";
  button.className = "custom-spotify-btn";
  button.title = "Recommend this track";

  // Add click handler
  button.addEventListener("click", async () => {
    await handleRecommendClick();
  });

  // Find the search bar container and add button next to it
  const searchContainer = document.querySelector("._b3hhmbWtOY8_1M1mM1H");
  if (searchContainer && searchContainer.parentNode) {
    // Create a wrapper div to hold the button
    const buttonWrapper = document.createElement("div");
    buttonWrapper.className = "custom-button-wrapper";
    buttonWrapper.appendChild(button);

    // Insert the button after the search container
    searchContainer.parentNode.insertBefore(
      buttonWrapper,
      searchContainer.nextSibling
    );
  } else {
    // Fallback: try to find the top bar area
    const topBar = document.querySelector(".gj5VcIUC9oD2p4BsxzGE");
    if (topBar) {
      const buttonWrapper = document.createElement("div");
      buttonWrapper.className = "custom-button-wrapper";
      buttonWrapper.appendChild(button);
      topBar.appendChild(buttonWrapper);
    }
  }
}

async function handleRecommendClick() {
  if (document.getElementById("spotify-recommend-popup")) {
    togglePopup();
    return;
  }
  const button = document.getElementById("custom-spotify-button");
  const originalText = button.innerHTML;
  try {
    // Show loading state
    button.innerHTML = "⏳ Loading...";
    button.disabled = true;

    // Check authentication
    const authResponse = await fetch(
      "https://recspot-e6585868d70b.herokuapp.com/check_auth",
      {
        method: "GET",
        credentials: "include",
      }
    );

    if (authResponse.ok) {
      const authData = await authResponse.json();
      if (authData.authenticated) {
        showPopupFriends();
      } else {
        showPopupAuth();
      }
    } else {
      console.error("Failed to check auth:", authResponse.statusText);
      showPopupAuth();
    }
  } catch (error) {
    console.error("Error checking Auth:", error);
    showPopupAuth();
  } finally {
    button.innerHTML = originalText;
    button.disabled = false;
  }
}

function createBasePopup() {
  const popup = document.createElement("div");
  popup.id = "spotify-recommend-popup";
  popup.className = "spotify-popup";

  popup.innerHTML = `
    <div class="popup-overlay"></div>
    <div class="popup-container">
      <div class="popup-header-controls">
        <button id="close-popup" class="close-btn">×</button>
      </div>
      <div class="popup-content"></div>
    </div>
  `;

  // Add close handler
  const closeBtn = popup.querySelector("#close-popup");
  const overlay = popup.querySelector(".popup-overlay");

  [closeBtn, overlay].forEach((el) => {
    el.addEventListener("click", () => closePopup());
  });

  return popup;
}

function togglePopup() {
  const popup = document.getElementById("spotify-recommend-popup");
  if (popup) {
    closePopup();
  }
}

function closePopup() {
  const popup = document.getElementById("spotify-recommend-popup");
  if (popup) {
    popup.remove();
  }
}

async function handleAuthFlow() {
  const authBtn = document.querySelector("#authorize-btn");
  if (!authBtn) return;

  authBtn.innerHTML = "⏳ Connecting...";
  authBtn.disabled = true;

  try {
    // First, let's check if we have any existing session
    console.log("Checking existing session...");

    const response = await fetch(
      "https://recspot-e6585868d70b.herokuapp.com/login",
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log("Login response:", data);

      if (data.auth_url) {
        // Open popup for authorization
        const authWindow = window.open(
          data.auth_url,
          "spotify-auth",
          "width=500,height=600,resizable=yes,scrollbars=yes"
        );

        // Handle the auth flow
        await handleAuthWindow(authWindow);

        // After successful auth, close current popup and show friends
        console.log("Auth completed successfully, showing friends popup");
        closePopup();
        setTimeout(() => showPopupFriends(), 300);
      } else {
        throw new Error("No auth URL received");
      }
    } else {
      const errorData = await response.json();
      console.error("Login API error:", errorData);
      throw new Error(`Login failed: ${errorData.error || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Auth flow error:", error);
    authBtn.innerHTML = "Try Again";
    authBtn.disabled = false;

    // Show error to user
    showAuthError(error.message);
  }
}

async function handleAuthWindow(authWindow) {
  return new Promise((resolve, reject) => {
    let resolved = false;

    // Set timeout for the entire auth process
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (!authWindow.closed) {
          authWindow.close();
        }
        reject(new Error("Authentication timeout"));
      }
    }, 60000); // 1 minute timeout

    // Check if popup was closed manually
    const authCheckInterval = setInterval(() => {
      try {
        if (authWindow.closed && !resolved) {
          resolved = true;
          clearInterval(authCheckInterval);
          clearTimeout(timeout);

          // Check if auth was successful
          setTimeout(() => {
            checkAuthStatus().then((success) => {
              if (success) {
                resolve();
              } else {
                reject(new Error("Authentication was cancelled or failed"));
              }
            });
          }, 500); // Small delay to allow session to update
        }
      } catch (e) {
        // Ignore cross-origin errors
      }
    }, 1000);

    // Listen for postMessage from callback

    const messageHandler = (event) => {
      if (event.data === "auth_success" && !resolved) {
        resolved = true;
        clearInterval(authCheckInterval);
        clearTimeout(timeout);
        window.removeEventListener("message", messageHandler);

        if (!authWindow.closed) {
          authWindow.close();
        }

        // Small delay to ensure session is updated
        setTimeout(() => {
          resolve();
        }, 500);
      }
    };

    window.addEventListener("message", messageHandler);
  });
}

function showAuthError(message) {
  const popup = document.getElementById("spotify-recommend-popup");
  if (!popup) return;

  const content = popup.querySelector(".popup-content");
  const errorDiv = document.createElement("div");
  errorDiv.className = "auth-error";
  errorDiv.innerHTML = `
        <div style="background: #ff4444; color: white; padding: 10px; border-radius: 4px; margin: 10px 0;">
            <strong>Authentication Error:</strong> ${message}
        </div>
    `;

  // Remove any existing error messages
  const existingError = content.querySelector(".auth-error");
  if (existingError) {
    existingError.remove();
  }

  content.insertBefore(errorDiv, content.firstChild);
}

let sentRecommendationsInterval = null;
let receivedtRecommendationsInterval = null;

function showPopupFriends() {
  const popup = createBasePopup();
  const content = popup.querySelector(".popup-content");

  content.innerHTML = `
    <div class="friends-container">
      <div class="popup-scrollable-content">
        <div class="popup-header">
          <div class="tab-navigation">
            <button class="tab-btn active" data-tab="friends">Friends</button>
            <button class="tab-btn" data-tab="sent">Sent</button>
            <button class="tab-btn" data-tab="received">Received</button>
          </div>
        </div>

        <div class="tab-content" id="friends-tab">
          <div class="add-friend-section">
            <div class="add-friend-form">
              <input type="text" id="friend-input" placeholder="Enter Spotify username URL" class="friend-input">
              <button id="add-friend-btn" class="spotify-btn-primary">Add Friend</button>
            </div>
          </div>
          <div class="friends-list" id="friends-list">
            <div class="loading-message">Loading friends...</div>
          </div>
        </div>

        <div class="tab-content hidden" id="sent-tab">
          <div class="recommendations-list" id="sent-recommendations">
             <div class="loading-message">Loading sent recommendations...</div>
          </div>
        </div>

        <div class="tab-content hidden" id="received-tab">
          <div class="recommendations-list" id="received-recommendations">
            <div class="loading-message">Loading received recommendations...</div>
          </div>
        </div>
      </div>
      
      <div class="popup-footer">
        <button id="debug-friends-btn" class="spotify-btn-secondary">Debug Session</button>
        <button id="logout-btn" class="spotify-btn-secondary">Logout</button>
      </div>
    </div>
  `;

  // Load friends when the popup opens
  loadFriends();

  // Add friend button event listener
  const addFriendBtn = content.querySelector("#add-friend-btn");
  const friendInput = content.querySelector("#friend-input");

  addFriendBtn.addEventListener("click", () => {
    const friendInputValue = friendInput.value.trim();
    if (friendInputValue) {
      addFriend(friendInputValue);
    } else {
      showMessage("Please enter a Spotify username or profile URL");
    }
  });

  // Allow adding friend with Enter key
  friendInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const friendInputValue = friendInput.value.trim();
      if (friendInputValue) {
        addFriend(friendInputValue);
      }
    }
  });

  // Tab switching functionality
  const tabBtns = content.querySelectorAll(".tab-btn");
  const tabContents = content.querySelectorAll(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      cleanupSentRecommendations();
      cleanupReceivedRecommendations();
      // Remove active class from all tabs
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.add("hidden"));

      // Add active class to clicked tab
      btn.classList.add("active");
      const targetTab = content.querySelector(`#${btn.dataset.tab}-tab`);
      if (targetTab) {
        targetTab.classList.remove("hidden");

        // Load recommendations when received tab is clicked
        if (btn.dataset.tab === "received") {
          initializeReceivedRecommendations();
        }
        // Load sent recommendations when sent tab is clicked
        else if (btn.dataset.tab === "sent") {
          initializeSentRecommendations();
        }
      }
    });
  });

  // Expand/collapse functionality for sent and received lists
  content.addEventListener("click", (e) => {
    if (e.target.classList.contains("expand-btn")) {
      const personItem = e.target.closest(".recommendation-person");
      const songsList = personItem.querySelector(".songs-list");

      if (songsList.classList.contains("hidden")) {
        songsList.classList.remove("hidden");
        e.target.textContent = "▲";
      } else {
        songsList.classList.add("hidden");
        e.target.textContent = "▼";
      }
    }
  });

  // Add debug button handler
  const debugBtn = content.querySelector("#debug-friends-btn");
  debugBtn.addEventListener("click", async () => {
    try {
      const response = await fetch(
        "https://recspot-e6585868d70b.herokuapp.com/debug_session",
        {
          credentials: "include",
        }
      );
      const data = await response.json();
      console.log("Friends Debug Session:", data);
      alert(`Friends Debug Session:\n${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      console.error("Friends Debug error:", error);
      alert("Debug Error: " + error.message);
    }
  });

  // Add logout handler
  const logoutBtn = content.querySelector("#logout-btn");
  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("https://recspot-e6585868d70b.herokuapp.com/logout", {
        method: "GET",
        credentials: "include",
      });
      closePopup();
    } catch (error) {
      console.error("Logout error:", error);
    }
  });

  document.body.appendChild(popup);

  async function loadSentRecommendations() {
    const sentContainer = content.querySelector("#sent-recommendations");

    try {
      const response = await fetch(
        "https://recspot-e6585868d70b.herokuapp.com/sent_recommendations",
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const recommendations = await response.json();

      if (recommendations.length === 0) {
        sentContainer.innerHTML = `
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
                            <span class="friend-status">${count} song${
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
                                        <span class="song-title">${
                                          rec.title
                                        }</span>
                                        <span class="song-artist">${
                                          rec.artist
                                        }</span>
                                    </div>
                                    <div class="song-actions">
                                        <div class="song-status">
                                            ${getStatusIndicator(
                                              rec.like_dislike
                                            )}
                                        </div>
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

      sentContainer.innerHTML = html;
    } catch (error) {
      console.error("Error loading sent recommendations:", error);
      sentContainer.innerHTML = `
            <div class="error-message">
                <p>Error loading sent recommendations. Please try again later.</p>
            </div>
        `;
    }
  }

  async function loadSentRecommendationsSmooth() {
    const sentContainer = content.querySelector("#sent-recommendations");

    try {
      const response = await fetch(
        "https://recspot-e6585868d70b.herokuapp.com/sent_recommendations",
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const recommendations = await response.json();

      if (recommendations.length === 0) {
        sentContainer.innerHTML = `
                <div class="no-recommendations-message">
                    <p>No recommendations sent yet!</p>
                    <p>Start recommending songs to your friends.</p>
                </div>
            `;
        return;
      }

      // Update only the status indicators instead of rebuilding entire HTML
      recommendations.forEach((rec) => {
        const songItem = sentContainer.querySelector(
          `[data-recommendation-id="${rec.recommendation_id}"]`
        );
        console.log({
          songItem: songItem,
          rec: rec,
        });
        if (songItem) {
          const statusContainer = songItem.querySelector(".song-status");
          const newStatusHTML = getStatusIndicator(rec.like_dislike);
          console.log({
            statusContainer: statusContainer,
            newStatusHTML: newStatusHTML,
          });

          // Only update if status changed
          if (statusContainer && statusContainer.innerHTML !== newStatusHTML) {
            statusContainer.innerHTML = newStatusHTML;

            // Add a subtle animation to indicate change
            statusContainer.style.transition = "all 0.3s ease";
            statusContainer.style.transform = "scale(1.1)";
            setTimeout(() => {
              statusContainer.style.transform = "scale(1)";
            }, 300);
          }
        }
      });

      // If container is empty or structure changed, rebuild completely
      if (!sentContainer.querySelector(".recommendation-person")) {
        await loadSentRecommendations();
      }
    } catch (error) {
      console.error("Error loading sent recommendations:", error);
      // Fallback to full reload on error
      await loadSentRecommendations();
    }
  }

  function getStatusIndicator(likeDislike) {
    console.log("Like status:", likeDislike);
    if (likeDislike === true) {
      return `
            <div class="status-indicator liked">
                <span class="status-text">Liked</span>
            </div>
        `;
    } else if (likeDislike === false) {
      return `
            <div class="status-indicator disliked">
                <span class="status-text">Disliked</span>
            </div>
        `;
    } else {
      return `
            <div class="status-indicator pending">
                <span class="status-text">Pending</span>
            </div>
        `;
    }
  }

  // Function to stop real-time updates
  function stopSentRecommendationsUpdates() {
    if (sentRecommendationsInterval) {
      clearInterval(sentRecommendationsInterval);
      sentRecommendationsInterval = null;
    }
  }

  // Function to stop real-time updates
  function stopReceivedRecommendationsUpdates() {
    if (receivedtRecommendationsInterval) {
      clearInterval(receivedtRecommendationsInterval);
      receivedtRecommendationsInterval = null;
    }
  }

  // Function to start smooth real-time updates
  function startSentRecommendationsSmoothUpdates() {
    // Clear any existing interval
    if (sentRecommendationsInterval) {
      clearInterval(sentRecommendationsInterval);
    }

    // Initial load
    loadSentRecommendations();

    // Set up smooth polling every 10 seconds
    sentRecommendationsInterval = setInterval(() => {
      loadSentRecommendationsSmooth();
    }, 10000);
  }

  // Function to start smooth real-time updates
  function startReceivedRecommendationsSmoothUpdates() {
    // Clear any existing interval
    if (receivedtRecommendationsInterval) {
      clearInterval(receivedtRecommendationsInterval);
    }

    // Initial load
    loadReceivedRecommendations();

    // Set up smooth polling every 10 seconds
    receivedtRecommendationsInterval = setInterval(() => {
      loadReceivedRecommendationsSmooth();
    }, 10000);
  }

  function initializeSentRecommendations() {
    loadSentRecommendations();
    startSentRecommendationsSmoothUpdates();
  }

  function cleanupSentRecommendations() {
    stopSentRecommendationsUpdates();
  }

  function initializeReceivedRecommendations() {
    loadReceivedRecommendations();
    startReceivedRecommendationsSmoothUpdates();
  }

  function cleanupReceivedRecommendations() {
    stopReceivedRecommendationsUpdates();
  }

  // Function to load received recommendations
  async function loadReceivedRecommendations() {
    const receivedContainer = content.querySelector(
      "#received-recommendations"
    );

    try {
      const response = await fetch(
        "https://recspot-e6585868d70b.herokuapp.com/recommendations",
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const recommendations = await response.json();

      if (recommendations.length === 0) {
        receivedContainer.innerHTML = `
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
        const userName = userId; // You might want to fetch display names separately
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
                            <span class="friend-status">${count} song${
          count > 1 ? "s" : ""
        } received</span>
                        </div>
                        <button class="expand-btn">▼</button>
                    </div>
                    <div class="songs-list hidden">
                        ${userRecs
                          .map((rec) => {
                            const likeActive =
                              rec.like_dislike === 1 ? "active" : "";
                            const dislikeActive =
                              rec.like_dislike === 0 ? "active" : "";
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
                                        <span class="song-title">${
                                          rec.title
                                        }</span>
                                        <span class="song-artist">${
                                          rec.artist
                                        }</span>
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

      receivedContainer.innerHTML = html;

      // Add event listeners for like/dislike buttons
      setupRecommendationActions();
    } catch (error) {
      console.error("Error loading recommendations:", error);
      receivedContainer.innerHTML = `
            <div class="error-message">
                <p>Error loading recommendations. Please try again later.</p>
            </div>
        `;
    }
  }

  async function loadReceivedRecommendationsSmooth() {
    const receivedContainer = content.querySelector(
      "#received-recommendations"
    );

    try {
      const response = await fetch(
        "https://recspot-e6585868d70b.herokuapp.com/recommendations",
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const recommendations = await response.json();

      // If no recommendations, handle empty state
      if (recommendations.length === 0) {
        // Only update if container doesn't already show empty state
        if (!receivedContainer.querySelector(".no-recommendations-message")) {
          receivedContainer.innerHTML = `
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
      receivedContainer
        .querySelectorAll(".recommendation-person")
        .forEach((person) => {
          const personName = person.dataset.person;
          const songsList = person.querySelector(".songs-list");

          // Check if this person's recommendations are expanded
          if (songsList && !songsList.classList.contains("hidden")) {
            expandedPersons.add(personName);
          }

          // Store button states for each song
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
              <span class="friend-status">${count} song${
          count > 1 ? "s" : ""
        } received</span>
            </div>
            <button class="expand-btn">${isExpanded ? "▲" : "▼"}</button>
          </div>
          <div class="songs-list ${isExpanded ? "" : "hidden"}">
            ${userRecs
              .map((rec) => {
                // Use stored button states if available, otherwise use database values
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

      // Update the container
      receivedContainer.innerHTML = html;

      // Re-setup event listeners
      setupRecommendationActions();
    } catch (error) {
      console.error("Error loading recommendations smoothly:", error);
      // Don't replace content on error to avoid disrupting user experience
    }
  }

  // Function to handle like/dislike actions
  function setupRecommendationActions() {
    const songItems = content.querySelectorAll("#received-tab .song-item");

    songItems.forEach((songItem) => {
      const songId = songItem.dataset.songId;
      const recId = songItem.dataset.recId;
      const likeBtn = songItem.querySelector(".like-btn");
      const dislikeBtn = songItem.querySelector(".dislike-btn");
      const playBtn = songItem.querySelector(".play-btn");

      // Like button handler
      likeBtn.addEventListener("click", async (e) => {
        e.stopPropagation();

        const isActive = likeBtn.classList.contains("active");
        const action = isActive ? "NULL" : "like";

        try {
          const response = await fetch(
            "https://recspot-e6585868d70b.herokuapp.com/like_recommendation",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
                recommendation_id: recId,
                song_id: songId,
                action: action,
              }),
            }
          );

          if (response.ok) {
            // Update UI
            if (action === "like") {
              likeBtn.classList.add("active");
              dislikeBtn.classList.remove("active");
            } else {
              likeBtn.classList.remove("active");
            }
          } else {
            console.error("Failed to update like status");
          }
        } catch (error) {
          console.error("Error updating like status:", error);
        }
      });

      // Dislike button handler
      dislikeBtn.addEventListener("click", async (e) => {
        e.stopPropagation();

        const isActive = dislikeBtn.classList.contains("active");
        const action = isActive ? "NULL" : "dislike";

        try {
          const response = await fetch(
            "https://recspot-e6585868d70b.herokuapp.com/like_recommendation",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
                recommendation_id: recId,
                song_id: songId,
                action: action,
              }),
            }
          );

          if (response.ok) {
            // Update UI
            if (action === "dislike") {
              dislikeBtn.classList.add("active");
              likeBtn.classList.remove("active");
            } else {
              dislikeBtn.classList.remove("active");
            }
          } else {
            console.error("Failed to update dislike status");
          }
        } catch (error) {
          console.error("Error updating dislike status:", error);
        }
      });

      // Play button handler (placeholder - doesn't do anything as requested)
      playBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        // Button doesn't do anything as requested
        console.log("Play button clicked for song:", songId);
        try {
          const response = await fetch(
            "https://recspot-e6585868d70b.herokuapp.com/play_song",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
                song_id: songId,
              }),
            }
          );
          if (response.ok) {
            const data = await response.json();
            console.log("Song played successfully:", data);
          } else {
            console.error("Failed to play song:", response.statusText);
          }
        } catch (error) {
          console.error("Error playing song:", error);
        }
      });
    });
  }

  // Function to load friends from API
  async function loadFriends() {
    const friendsList = content.querySelector("#friends-list");

    try {
      const response = await fetch(
        "https://recspot-e6585868d70b.herokuapp.com/list_friends",
        {
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const friends = await response.json();

      if (friends.length === 0) {
        friendsList.innerHTML = `
                <div class="no-friends-message">
                    <p>No friends yet! Add some friends to start sharing music recommendations.</p>
                </div>
            `;
      } else {
        const noAvatar =
          "https://media.istockphoto.com/id/945691510/vector/people-icon-silhouettes-illustration-vector.jpg?s=612x612&w=0&k=20&c=chZcclmonc5T002ErDfMZ6KYz01tfHnd-Hzk4EfMJ6k=";
        friendsList.innerHTML = friends
          .map(
            (friend) => `
                <div class="friend-item" data-friend="${
                  friend.spotify_user_id
                }" data-displayname="${friend.display_name}">
                    <div class="friend-avatar">
                        <img src="${friend.avatar_url || noAvatar}" alt="${
              friend.display_name || friend.spotify_user_id
            }">
                    </div>
                    <div class="friend-info">
                        <span class="friend-name">${
                          friend.display_name || friend.spotify_user_id
                        }</span>
                    </div>
                    <button class="recommend-btn">Send</button>
                </div>
            `
          )
          .join("");

        // Add click handlers for recommend buttons
        const recommendBtns = friendsList.querySelectorAll(".recommend-btn");
        recommendBtns.forEach((btn) => {
          btn.addEventListener("click", async (e) => {
            const friendItem = e.target.closest(".friend-item");
            const friendId = friendItem.dataset.friend;
            const friendName = friendItem.dataset.displayname;

            // Disable button and show loading state
            btn.innerHTML = "Sending...";
            btn.disabled = true;
            btn.style.background = "#535353";

            try {
              // Get currently playing song
              const currentSong = await getCurrentlyPlayingSong();

              if (!currentSong) {
                showMessage(
                  "No song is currently playing or song information could not be detected. Try reloading the page and try again."
                );
                return;
              }

              // Get song ID from API
              const songData = await getSongId(
                currentSong.albumId,
                currentSong.title
              );

              // Recommend song to friend
              message = await recommendSongToFriend(friendId, songData.song_id);
              // Show success state
              btn.innerHTML = "Sent";
              btn.style.background = "#1db954";

              showMessage(
                `Recommended ${currentSong.title} to ${friendName}!`,
                "success"
              );
            } catch (error) {
              console.error("Error sending recommendation:", error);
              let errorMessage;
              if (
                error.message.includes("album_id_required") ||
                error.message.includes("track_name_required")
              ) {
                errorMessage = "Could not detect the currently playing song.";
              } else if (error.message.includes("track_not_found_in_album")) {
                errorMessage = "Song not found in the album.";
              } else if (
                error.message.includes("Song has already been recommended")
              ) {
                errorMessage =
                  "You have already recommended this song to this friend.";
              } else {
                errorMessage = message;
              }
              showMessage(errorMessage);

              btn.innerHTML = "Send";
              btn.style.background = "#1db954";
            } finally {
              // Re-enable button after delay
              setTimeout(() => {
                btn.innerHTML = "Send";
                btn.disabled = false;
                btn.style.background = "#1db954";
              }, 2000);
            }
          });
        });
      }
    } catch (error) {
      console.error("Error loading friends:", error);
      friendsList.innerHTML = `
            <div class="error-message">
                <p>Error loading friends. Please try again later.</p>
            </div>
        `;
    }
  }

  // Function to add a friend
  async function addFriend(friendInput) {
    const addBtn = content.querySelector("#add-friend-btn");
    const input = content.querySelector("#friend-input");

    const username = extractSpotifyUsername(friendInput);

    if (!username) {
      showMessage("Please enter a valid Spotify username or profile URL");
      return;
    }

    // Disable button and show loading state
    addBtn.disabled = true;
    addBtn.textContent = "Adding...";

    try {
      const response = await fetch(
        "https://recspot-e6585868d70b.herokuapp.com/add_friend",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            friend_id: username,
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        // Success - clear input and reload friends list
        input.value = "";
        await loadFriends();
        showMessage("Friend added successfully!", "success");
      } else {
        // Handle specific error cases
        let errorMessage = "Failed to add friend";
        switch (data.error) {
          case "not_following_friend":
            errorMessage =
              "You must be following this user on Spotify to add them as a friend";
            break;
          case "friend_already_exists":
            errorMessage = "This user is already your friend";
            break;
          case "cannot_add_yourself":
            errorMessage = "You cannot add yourself as a friend";
            break;
          case "friend_id_required":
            errorMessage = "Please enter a valid username";
            break;
          default:
            if (data.details) {
              errorMessage = `Error: ${
                data.details.error?.message || data.error
              }`;
            }
        }
        showMessage(errorMessage);
      }
    } catch (error) {
      console.error("Error adding friend:", error);
      showMessage("Network error. Please check your connection and try again.");
    } finally {
      // Re-enable button
      addBtn.disabled = false;
      addBtn.textContent = "Add Friend";
    }
  }

  function showMessage(message, type = "error") {
    // Remove any existing messages first
    const existingMessage = content.querySelector(".message-display");
    if (existingMessage) {
      const existingContent = existingMessage.querySelector(".message-content");
      existingContent.classList.add("slide-up");
      setTimeout(() => existingMessage.remove(), 300);
    }

    const messageDiv = document.createElement("div");
    messageDiv.className = "message-display";

    messageDiv.innerHTML = `
    <div class="message-content ${type}">
      <span>${message}</span>
    </div>
  `;

    // Insert at the top of the friends tab content
    const friendsContainer = content.querySelector("#friends-tab");
    if (friendsContainer) {
      // Add push-down class to existing content
      const existingContent = friendsContainer.children;
      Array.from(existingContent).forEach((child) => {
        if (!child.classList.contains("message-display")) {
          child.classList.add("content-push-down");
        }
      });

      friendsContainer.insertBefore(messageDiv, friendsContainer.firstChild);

      // Remove push-down class after animation completes
      setTimeout(() => {
        Array.from(existingContent).forEach((child) => {
          child.classList.remove("content-push-down");
        });
      }, 1000);
    }

    // Auto-remove after 3 seconds
    setTimeout(() => {
      if (messageDiv.parentElement) {
        const messageContent = messageDiv.querySelector(".message-content");
        messageContent.classList.add("slide-up");

        // Add push-up animation to content when message is removed
        const siblingContent = friendsContainer.children;
        Array.from(siblingContent).forEach((child) => {
          if (!child.classList.contains("message-display")) {
            child.classList.add("content-push-up");
          }
        });

        setTimeout(() => {
          messageDiv.remove();
          // Clean up push-up classes
          Array.from(siblingContent).forEach((child) => {
            child.classList.remove("content-push-up");
          });
        }, 500);
      }
    }, 3000);
  }

  // Function to extract username from Spotify URL
  function extractSpotifyUsername(input) {
    const trimmedInput = input.trim();

    // Check if it's a Spotify URL
    const spotifyUrlRegex = /https:\/\/open\.spotify\.com\/user\/([^?&/]+)/;
    const match = trimmedInput.match(spotifyUrlRegex);

    if (match) {
      return match[1]; // Return the captured username
    }

    // If not a URL, assume it's already a username
    return trimmedInput;
  }

  async function getCurrentlyPlayingSong() {
    // Try to find the album link element that contains both song name and album ID
    const albumLinkElement = document.querySelector(
      '[data-testid="context-item-link"]'
    );

    let songTitle = null;
    let albumId = null;

    if (albumLinkElement) {
      // Extract song title from the link text
      songTitle = albumLinkElement.textContent.trim();

      // Extract album ID from href attribute
      const albumUrl = albumLinkElement.href;
      const albumMatch = albumUrl.match(/\/album\/([a-zA-Z0-9]+)/);
      if (albumMatch) {
        albumId = albumMatch[1];
      }
    }

    // Fallback: try to get album ID from current page URL if on album page
    if (!albumId && window.location.href.includes("/album/")) {
      const urlMatch = window.location.href.match(/\/album\/([a-zA-Z0-9]+)/);
      if (urlMatch) {
        albumId = urlMatch[1];
      }
    }

    // Fallback for song title if not found above

    if (songTitle && albumId) {
      return {
        title: songTitle,
        albumId: albumId,
      };
    }

    return null;
  }

  async function getSongId(albumId, trackName) {
    try {
      const response = await fetch(
        "https://recspot-e6585868d70b.herokuapp.com/get_song_id",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            album_id: albumId,
            track_name: trackName,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting song ID:", error);
      throw error;
    }
  }

  async function recommendSongToFriend(friendId, songId) {
    try {
      const response = await fetch(
        "https://recspot-e6585868d70b.herokuapp.com/recommend",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            friend_id: friendId,
            song_id: songId,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to recommend song");
      }

      return await response.json();
    } catch (error) {
      console.error("Error recommending song:", error);
      throw error;
    }
  }
}

function showPopupAuth() {
  const popup = createBasePopup();
  const content = popup.querySelector(".popup-content");

  content.innerHTML = `
    <div class="auth-container">
      <div class="spotify-logo">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#1db954">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
      </div>
      <h2>Connect to Spotify</h2>
      <p>To recommend music to your friends, you need to authorize this app with your Spotify account.</p>
      <button id="authorize-btn" class="spotify-btn-primary">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.299.421-1.02.599-1.559.3z"/>
        </svg>
        Authorize with Spotify
      </button>
      <div class="debug-info" style="margin-top: 15px; padding: 10px; background: #f0f0f0; border-radius: 4px; font-size: 12px;">
        <button id="debug-session-btn" style="padding: 5px 10px; font-size: 11px;">Check Session Debug</button>
      </div>
    </div>
  `;

  // Add click handler for auth button
  const authBtn = content.querySelector("#authorize-btn");
  authBtn.addEventListener("click", handleAuthFlow);

  // Add debug button handler
  const debugBtn = content.querySelector("#debug-session-btn");
  debugBtn.addEventListener("click", async () => {
    try {
      const response = await fetch(
        "https://recspot-e6585868d70b.herokuapp.com/debug_session",
        {
          credentials: "include",
        }
      );
      const data = await response.json();
      console.log("Session Debug:", data);
      alert(`Session Debug:\n${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      console.error("Debug error:", error);
    }
  });

  document.body.appendChild(popup);
}

async function checkAuthStatus() {
  try {
    console.log("Checking auth status...");
    const response = await fetch(
      "https://recspot-e6585868d70b.herokuapp.com/check_auth",
      {
        method: "GET",
        credentials: "include",
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.authenticated) {
        console.log("User is authenticated");
        closePopup();
        setTimeout(() => showPopupFriends(), 300);
        return true;
      } else {
        console.log("User is not authenticated:", data.reason);
      }
    } else {
      console.log("Auth check failed with status:", response.status);
    }
  } catch (error) {
    console.error("Auth check error:", error);
  }
  return false;
}

// Handle Spotify's dynamic loading
function observeChanges() {
  const observer = new MutationObserver(() => {
    if (!document.getElementById("custom-spotify-button")) {
      addCustomButton();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Initialize
waitForSpotify();
observeChanges();
