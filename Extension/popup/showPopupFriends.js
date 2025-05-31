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

     <button class="floating-requests-btn" id="floating-requests-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H11V21H5V3H13V9H21ZM16 11.5C17.38 11.5 18.5 12.62 18.5 14S17.38 16.5 16 16.5 13.5 15.38 13.5 14 14.62 11.5 16 11.5ZM20 19.5V18.5C20 17.12 17.76 16.5 16 16.5S12 17.12 12 18.5V19.5H20Z"/>
        </svg>
        <span class="floating-badge" id="floating-requests-badge">3</span>
      </button>
      
      <div class="popup-footer">
        <button id="debug-friends-btn" class="spotify-btn-secondary">Debug Session</button>
        <button id="logout-btn" class="spotify-btn-secondary">Logout</button>
      </div>
    </div>
  `;

  // Load friends when the popup opens
  loadFriends();

  const floatingRequestsBtn = content.querySelector("#floating-requests-btn");
  floatingRequestsBtn.addEventListener("click", toggleRequestsModal);

  if (typeof updateRequestsBadge === 'function') {
    updateRequestsBadge();
  }

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
                              rec.like_dislike === true ? "active" : "";
                            const dislikeActive =
                              rec.like_dislike === false ? "active" : "";
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
    addBtn.textContent = "Sending Request...";

    try {
      const response = await fetch(
        "https://recspot-e6585868d70b.herokuapp.com/send_friend_request",
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