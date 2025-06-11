class FriendsManager {
  constructor() {
    this.friendsList = null;
    this.cachedFriends = [];
    this.isModalOpen = false;
    this.currentUserId = null;

    // Polling configuration
    this.pollingInterval = null;
    this.pollingFrequency = 45000; // 45 seconds (less frequent than friend requests)
    this.lastFetchTime = null;
    this.lastFriendsHash = null; // For change detection

    // Adaptive polling
    this.consecutiveNoChanges = 0;
    this.maxConsecutiveNoChanges = 6; // After 6 checks with no changes, slow down
    this.slowPollingFrequency = 90000; // 1.5 minutes when inactive

    // Background polling (less frequent when modal is closed)
    this.backgroundPollingFrequency = 180000; // 3 minutes
    this.isBackgroundPolling = false;
    this.isPolling = false;

    // No avatar fallback
    this.noAvatar =
      "https://media.istockphoto.com/id/945691510/vector/people-icon-silhouettes-illustration-vector.jpg?s=612x612&w=0&k=20&c=chZcclmonc5T002ErDfMZ6KYz01tfHnd-Hzk4EfMJ6k=";
  }

  getFriendsList() {
    this.friendsList = document.querySelector("#friends-list");
    return this.friendsList;
  }

  // Generate a simple hash of friends for change detection
  generateFriendsHash(friends) {
    const simplified = friends
      .map((friend) => `${friend.spotify_user_id}-${friend.display_name || ""}`)
      .sort();
    return simplified.join("|");
  }

  async initializePolling() {
    try {
      this.currentUserId = await this.getCurrentUserId();
      if (!this.currentUserId) {
        console.error("No current user ID found");
        return false;
      }

      // Start polling
      this.startPolling();
      return true;
    } catch (error) {
      console.error("Error initializing friends polling:", error);
      return false;
    }
  }

  startPolling() {
    // Clear any existing interval
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    const pollFrequency = this.isModalOpen
      ? this.consecutiveNoChanges >= this.maxConsecutiveNoChanges
        ? this.slowPollingFrequency
        : this.pollingFrequency
      : this.backgroundPollingFrequency;

    this.pollingInterval = setInterval(() => {
      this.pollForUpdates();
    }, pollFrequency);

    console.log(
      `Friends polling started with ${pollFrequency / 1000}s interval`
    );
  }

  async pollForUpdates() {
    try {
      // Don't poll if we're in the middle of an API call
      if (this.isPolling) return;

      this.isPolling = true;

      const friends = await this.fetchFriends();

      if (friends) {
        const newHash = this.generateFriendsHash(friends);

        // Only update if data has changed
        if (newHash !== this.lastFriendsHash) {
          console.log("Friends list updated");
          const oldFriendsCount = this.cachedFriends.length;
          this.cachedFriends = friends;
          this.lastFriendsHash = newHash;
          this.consecutiveNoChanges = 0;

          // Only render if modal is open
          if (this.isModalOpen) {
            this.renderFriends();
          }

          // Check for new friends and show notifications
          this.checkForNewFriends(friends, oldFriendsCount);
        } else {
          this.consecutiveNoChanges++;
          console.log(
            `No friends changes detected (${this.consecutiveNoChanges} consecutive)`
          );
        }

        if (this.isModalOpen && this.cachedFriends.length > 0) {
          this.renderFriends();
        }

        // Adjust polling frequency based on activity
        if (this.consecutiveNoChanges >= this.maxConsecutiveNoChanges) {
          this.startPolling(); // Restart with slower frequency
        }
      }
    } catch (error) {
      console.error("Error during friends polling:", error);
      this.consecutiveNoChanges++;
      if (this.isModalOpen && this.cachedFriends.length > 0) {
        this.renderFriends();
      }
    } finally {
      this.isPolling = false;
    }
  }

  async fetchFriends() {
    try {
      // Add timestamp to prevent caching issues
      const timestamp = Date.now();
      const response = await fetch(
        `https://recspot-e6585868d70b.herokuapp.com/list_friends?_t=${timestamp}`,
        {
          method: "GET",
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const friends = await response.json();
      this.lastFetchTime = Date.now();
      return friends;
    } catch (error) {
      console.error("Error fetching friends:", error);
      return null;
    }
  }

  checkForNewFriends(currentFriends, oldCount) {
    const newCount = currentFriends.length;

    // If we have more friends than before, show notification
    if (oldCount > 0 && newCount > oldCount) {
      const newFriendsCount = newCount - oldCount;
      showMessage(
        `${newFriendsCount} new friend${newFriendsCount > 1 ? "s" : ""} added!`,
        "success"
      );
    }
  }

  async loadFriends() {
    try {
      // Show loading state immediately
      this.renderLoading();
      // Initialize polling if not already done
      if (!this.currentUserId) {
        await this.initializePolling();
      }

      // If we have cached data and it's recent (< 15 seconds), use cache
      const cacheAge = this.lastFetchTime
        ? Date.now() - this.lastFetchTime
        : Infinity;
      if (this.cachedFriends.length > 0 && cacheAge < 15000) {
        console.log("Using cached friends data");
        this.renderFriends();
        return;
      }

      // Otherwise fetch fresh data
      const friends = await this.fetchFriends();
      if (friends !== null) {
        console.log("Loaded friends from API");
        this.cachedFriends = friends;
        this.lastFriendsHash = this.generateFriendsHash(friends);
        this.renderFriends();
      } else {
        this.renderError();
      }
    } catch (error) {
      console.error("Error loading friends:", error);
      this.renderError();
    }
  }

  renderLoading() {
    const friendsList = this.getFriendsList();
    if (friendsList) {
      friendsList.innerHTML = `
      <div class="loading-message">
        Loading friends...
      </div>
    `;
    }
  }

  renderFriends() {
    const friendsList = this.getFriendsList();
    console.log("Rendering friends list");
    if (!friendsList) return;

    if (!this.cachedFriends || !this.cachedFriends.length) {
      console.log("No friends to display");
      friendsList.innerHTML = `
        <div class="no-friends-message">
          <p>No friends yet! Add some friends to start sharing music recommendations.</p>
        </div>
      `;
      return;
    }

    console.log("Rendering friends:", this.cachedFriends.length);
    const friendsHTML = this.cachedFriends
      .map((friend) => this.createFriendHTML(friend))
      .join("");

    friendsList.innerHTML = friendsHTML;
    this.attachEventListeners();
  }

  createFriendHTML(friend) {
    return `
      <div class="friend-item" data-friend="${
        friend.spotify_user_id
      }" data-displayname="${friend.display_name}">
        <div class="friend-avatar">
          <img src="${friend.avatar_url || this.noAvatar}" alt="${
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
    `;
  }

  attachEventListeners() {
    const friendsList = this.getFriendsList();
    if (!friendsList) return;

    // Remove existing listeners to prevent duplicates
    if (this.handleRecommendClick) {
      friendsList.removeEventListener("click", this.handleRecommendClick);
    }

    // Add single event listener using event delegation
    this.handleRecommendClick = async (e) => {
      const btn = e.target.closest(".recommend-btn");
      if (!btn) return;

      const friendItem = btn.closest(".friend-item");
      const friendId = friendItem.dataset.friend;
      const friendName = friendItem.dataset.displayname;

      await this.handleRecommendation(btn, friendId, friendName);
    };

    friendsList.addEventListener("click", this.handleRecommendClick);
  }

  async handleRecommendation(btn, friendId, friendName) {
    // Disable button and show loading state
    btn.innerHTML = "Sending...";
    btn.disabled = true;
    btn.style.background = "#535353";

    try {
      // Get currently playing song
      const currentSong = await getCurrentlyPlayingSong();

      if (!currentSong) {
        showMessage(
          "No song is currently playing or song information could not be detected. Try reloading the page and try again.",
          "error"
        );
        return;
      }

      // Get song ID from API
      const songData = await getSongId(currentSong.albumId, currentSong.title);

      // Recommend song to friend
      const message = await recommendSongToFriend(friendId, songData.song_id);

      // Show success state
      btn.innerHTML = "Sent";
      btn.style.background = "#1db954";

      showMessage(
        `Recommended ${currentSong.title} to ${friendName}!`,
        "success"
      );
      
      showCommentPopup({
        type: "comment",
        friendName: friendName,
        recommendationId: message.recommendation_id,
        songTitle: currentSong.title,
        onSuccess: (commentText) => {
          console.log(`Comment added: "${commentText}"`);
          // You can add additional logic here if needed
        },
      });
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
      } else if (error.message.includes("Song has already been recommended")) {
        errorMessage = "You have already recommended this song to this friend.";
      } else {
        errorMessage = error.message || "Failed to send recommendation";
      }

      showMessage(errorMessage, "error");
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
  }

  renderError() {
    const friendsList = this.getFriendsList();
    if (friendsList) {
      friendsList.innerHTML = `
        <div class="error-message">
          <p>Error loading friends. Please try again later.</p>
        </div>
      `;
    }
  }

  // Lifecycle management
  onModalOpen() {
    this.isModalOpen = true;
    this.isBackgroundPolling = false;
    this.consecutiveNoChanges = 0; // Reset when user opens modal
    this.startPolling(); // Switch to active polling
    this.loadFriends();
  }

  onModalClose() {
    this.isModalOpen = false;
    this.isBackgroundPolling = true;
    this.startPolling(); // Switch to background polling
    const friendsList = this.getFriendsList();
    if (friendsList && this.handleRecommendClick) {
      console.log("Removing event listener for recommend clicks");
      friendsList.removeEventListener("click", this.handleRecommendClick);
    }
  }

  async refreshFriends() {
    console.log("Manual friends refresh triggered");
    this.consecutiveNoChanges = 0;
    const friends = await this.fetchFriends();
    if (friends !== null) {
      this.cachedFriends = friends;
      this.lastFriendsHash = this.generateFriendsHash(friends);
      if (this.isModalOpen) {
        this.renderFriends();
      }
    }
  }

  cleanup() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    console.log("Friends polling stopped");
  }

  // Utility methods
  async getCurrentUserId() {
    try {
      const response = await fetch(
        "https://recspot-e6585868d70b.herokuapp.com/get_user_id",
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        console.error("Failed to get user ID:", response.statusText);
        return null;
      }

      const data = await response.json();
      return data?.user_id || null;
    } catch (error) {
      console.error("Error getting user ID:", error);
      return null;
    }
  }

  // Method to manually add a friend to cache (called when accepting friend request)
  addFriendToCache(friendData) {
    // Check if friend already exists
    const exists = this.cachedFriends.some(
      (friend) => friend.spotify_user_id === friendData.spotify_user_id
    );

    if (!exists) {
      this.cachedFriends.push(friendData);
      this.lastFriendsHash = this.generateFriendsHash(this.cachedFriends);

      if (this.isModalOpen) {
        this.renderFriends();
      }

      console.log("Friend added to cache:", friendData.display_name);
    }
  }
}

// Create global instance and replace the original loadFriends function
window.friendsManager = new FriendsManager();

async function loadFriends() {
  await window.friendsManager.loadFriends();
}

window.loadFriends = loadFriends;
