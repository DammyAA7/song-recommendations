class FriendsManager {
  constructor() {
    this.supabaseClient = null;
    this.friendsList = null;
    this.cachedFriends = [];
    this.isModalOpen = false;
    this.initialized = false;
    this.lastFetchTime = null;
    this.lastFriendsHash = null;

    // No avatar fallback
    this.noAvatar =
      "https://media.istockphoto.com/id/945691510/vector/people-icon-silhouettes-illustration-vector.jpg?s=612x612&w=0&k=20&c=chZcclmonc5T002ErDfMZ6KYz01tfHnd-Hzk4EfMJ6k=";
  }

  async initialize() {
    try {
      // Wait for supabaseClient to be available
      await this.waitForSupabaseClient();
      
      // Load initial data from API
      await this.loadInitialFriends();
      
      // Setup real-time listener
      this.setupRealtimeListener();
      
      this.initialized = true;
      console.log('FriendsManager initialized with cached data');
    } catch (error) {
      console.error('Failed to initialize FriendsManager:', error);
      throw error;
    }
  }

  async waitForSupabaseClient() {
    // Wait for the supabaseClient to be available
    let attempts = 0;
    const maxAttempts = 50; // Wait up to 5 seconds
    
    while (!window.secureSupabaseClient && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!window.secureSupabaseClient) {
      throw new Error('SecureSupabaseClient not available after waiting');
    }
    
    this.supabaseClient = window.secureSupabaseClient;
  }

  setupRealtimeListener() {
        // Subscribe to real-time changes
        const currentUserId = window.UserIDUtils.getCurrentUserId();
        this.supabaseClient.subscribe('friends', 'INSERT', `user_id=eq.${currentUserId}`, async (payload) => {
            const friend = await this.fetchFriendDetails(payload.new.friend_id);
            if (friend) {
              this.handleNewFriend(friend);
            }
        });

        this.supabaseClient.subscribe('friends', 'DELETE', null, (payload) => {
            console.log('Friend removed:', payload.old);
            this.handleRemovedFriend(payload.old);
        });
    }

  
  async fetchFriendDetails(friendId) {
        const { data, error } = await this.supabaseClient.from('enriched_friends')
            .select('*')
            .eq('friend_id', friendId)
            .single();
        
        if (error) {
            console.error('Error fetching enriched friends:', error);
            return null;
        }
        
        return {
            friend_id: data.friend_id,
            display_name: data.display_name,
            avatar_url: data.avatar_url
        };
    }

  handleNewFriend(newFriend) {
    this.cachedFriends.unshift(newFriend); // Add to beginning
    
    // Update UI
    this.updateCacheAndUI();
    
    // Show notification
    showMessage(`Friends with ${newFriend.display_name}`, "success");
  }

  handleRemovedFriend(removedFriend) {
    // Remove from cached friends
    const initialLength = this.cachedFriends.length;
    console.log('Current cached friends:', this.cachedFriends);
    this.cachedFriends = this.cachedFriends.filter(
      friend => friend.spotify_user_id !== removedFriend.friend_id
    );

    if (this.cachedFriends.length < initialLength) {
      // Show notification
      showMessage(`Friend removed`, "info");
      // Update UI
      this.updateCacheAndUI();
    }
    
  }

  async loadInitialFriends() {
    try {
      console.log('Loading initial friend from API...');
      const friends = await this.fetchFriends();
      
      if (friends) {
        this.cachedFriends = friends;
        this.lastFriendsHash = this.generateFriendsHash(friends);
        this.lastFetchTime = Date.now();
        console.log(`Cached ${friends.length} friends`);
      }
    } catch (error) {
      console.error('Error loading initial friends:', error);
    }
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

  async loadFriends() {
    try {
      // Show loading state immediately
      this.renderLoading();

      // Always use cached data - no API calls in loadFriends
      if (this.cachedFriends.length > 0) {
        console.log("Using cached friends data");
        this.renderFriends();
      } else {
        console.log("No cached friends available");
        this.renderNoFriends();
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
      this.renderNoFriends();
      return;
    }
    console.log("Rendering friends:", this.cachedFriends.length);
    const friendsHTML = this.cachedFriends
      .map((friend) => this.createFriendHTML(friend))
      .join("");

    friendsList.innerHTML = friendsHTML;
    this.attachEventListeners();
  }

  renderNoFriends() {
    const friendsList = this.getFriendsList();
    if (friendsList) {
      friendsList.innerHTML = `
        <div class="no-friends-message">
          <p>No friends yet! Add some friends to start sharing music recommendations.</p>
        </div>
      `;
    }
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
    this.loadFriends();
  }

  onModalClose() {
    this.isModalOpen = false;
    const friendsList = this.getFriendsList();
    if (friendsList && this.handleRecommendClick) {
      console.log("Removing event listener for recommend clicks");
      friendsList.removeEventListener("click", this.handleRecommendClick);
    }
  }

  updateCacheAndUI() {
    // Update hash
    this.lastFriendsHash = this.generateFriendsHash(this.cachedFriends);
    
    // If modal is open, refresh the UI
    if (this.isModalOpen) {
      this.renderFriends();
    }
  }

}

// Create global instance and replace the original loadFriends function
window.friendsManager = new FriendsManager();

async function loadFriends() {
  await window.friendsManager.loadFriends();
}

window.loadFriends = loadFriends;
