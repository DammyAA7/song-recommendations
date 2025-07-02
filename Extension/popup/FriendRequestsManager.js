class FriendRequestsManager {
  constructor() {
    this.requestsList = document.querySelector("#modal-friend-requests-list");
    this.cachedRequests = [];
    this.isModalOpen = false;
    this.initialized = false;
    this.lastFetchTime = null;
    this.lastRequestsHash = null;

  }

  async initialize() {
    // Load initial data from API
    await this.loadInitialRequests();
    
    // Setup real-time listener
    this.setupRealtimeListener();
    
    this.isInitialized = true;
    console.log('FriendRequestsManager initialized with cached data');
  }

  async loadInitialRequests() {
    try {
      console.log('Loading initial friend requests from API...');
      const requests = await this.fetchFriendRequests();
      
      if (requests) {
        this.cachedRequests = requests;
        this.lastRequestsHash = this.generateRequestsHash(requests);
        this.lastFetchTime = Date.now();
        console.log(`Cached ${requests.length} friend requests`);
      }
    } catch (error) {
      console.error('Error loading initial requests:', error);
    }
  }

  setupRealtimeListener() {
    // Listen for new friend requests via Supabase subscription
    if (window.secureSupabaseClient && window.secureSupabaseClient.supabase) {
      // Unsubscribe from existing listener if any
      if (this.realtimeSubscription) {
        this.realtimeSubscription.unsubscribe();
      }

      this.realtimeSubscription = window.secureSupabaseClient.supabase
        .channel('friend_requests_updates')
        .on('postgres_changes', 
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'requests' 
            }, 
            (payload) => {
                console.log('New friend request received via real-time:', payload);
                this.handleNewRequest(payload.new);
            }
        )
        .on('postgres_changes', 
            { 
                event: 'DELETE', 
                schema: 'public', 
                table: 'requests' 
            }, 
            (payload) => {
                console.log('Friend request removed via real-time:', payload);
                this.handleRequestRemoved(payload.old);
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('Successfully subscribed to friend request real-time updates');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('Real-time subscription error');
            }
        });
    }
  }

  
  getRequestsList() {
    if (!this.requestsList) {
      this.requestsList = document.querySelector("#modal-friend-requests-list");
    }
    return this.requestsList;
  }

  // Generate a simple hash of requests for change detection
  generateRequestsHash(requests) {
    const simplified = requests
      .map((req) => `${req.sender_id}-${req.created_at}`)
      .sort();
    return simplified.join("|");
  }


  async fetchFriendRequests() {
    try {
      // Add timestamp to prevent caching issues
      const timestamp = Date.now();
      const response = await fetch(
        `https://recspot-e6585868d70b.herokuapp.com/friend_requests?_t=${timestamp}`,
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

      const requests = await response.json();
      this.lastFetchTime = Date.now();
      return requests;
    } catch (error) {
      console.error("Error fetching friend requests:", error);
      return null;
    }
  }

  checkForNewRequests(currentRequests) {
    if (!this.cachedRequests.length) return; // First load

    const existingIds = new Set(
      this.cachedRequests.map((req) => req.sender_id)
    );
    const newRequests = currentRequests.filter(
      (req) => !existingIds.has(req.sender_id)
    );

    // Show notification for new requests
    newRequests.forEach((request) => {
      showMessage(`New friend request from ${request.display_name}`, "success");
    });
  }

  async loadModalFriendRequests() {
    try {
    
      // If we have cached data and it's recent (< 10 seconds), use cache
      const cacheAge = this.lastFetchTime
        ? Date.now() - this.lastFetchTime
        : Infinity;
      if (this.cachedRequests.length > 0 && cacheAge < 10000) {
        console.log("Using cached friend requests");
        this.renderRequests();
        this.updateRequestsBadge();
        return;
      }
      // Otherwise fetch fresh data
      const requests = await this.fetchFriendRequests();
      if (requests) {
        console.log("Loaded friend requests from API");
        this.cachedRequests = requests;
        console.log("Cached friend requests:", this.cachedRequests);
        this.lastRequestsHash = this.generateRequestsHash(requests);
        this.renderRequests();
        this.updateRequestsBadge();
      } else {
        this.renderError();
      }
    } catch (error) {
      console.error("Error loading friend requests:", error);
      this.renderError();
    }
  }

  renderRequests() {
    const requestsList = this.getRequestsList(); // Use the helper method
    console.log("Rendering friend requests in modal");
    if (!requestsList) return;

    if (!this.cachedRequests.length) {
      console.log("No friend requests to display");
      this.requestsList.innerHTML =
        '<div class="no-requests">No friend requests</div>';
      return;
    }
    console.log("Rendering friend requests:", this.cachedRequests.length);
    const requestsHTML = this.cachedRequests
      .map((request) => this.createRequestHTML(request))
      .join("");

    this.requestsList.innerHTML = requestsHTML;

    this.attachEventListeners();
  }

  attachEventListeners() {
    const requestsList = this.getRequestsList();
    if (!requestsList) return;

    // Remove existing listeners to prevent duplicates
    requestsList.removeEventListener("click", this.handleButtonClick);

    // Add single event listener using event delegation
    this.handleButtonClick = (e) => {
      const button = e.target.closest("button[data-action]");
      if (!button) return;

      const action = button.dataset.action;
      const senderId = button.dataset.senderId;

      if (action === "accept") {
        this.acceptRequest(senderId);
      } else if (action === "decline") {
        this.declineRequest(senderId);
      }
    };

    requestsList.addEventListener("click", this.handleButtonClick);
  }

  renderError() {
    const requestsList = this.getRequestsList(); // Use the helper method
    if (requestsList) {
      this.requestsList.innerHTML =
        '<div class="error-message">Failed to load friend requests</div>';
    }

    requestsList.addEventListener("click", this.handleButtonClick);
  }

  createRequestHTML(request) {
    this.noAvatar =
      "https://media.istockphoto.com/id/945691510/vector/people-icon-silhouettes-illustration-vector.jpg?s=612x612&w=0&k=20&c=chZcclmonc5T002ErDfMZ6KYz01tfHnd-Hzk4EfMJ6k=";
    const timeAgo = this.formatTimeAgo(request.created_at);
    return `
      <div class="friend-request-item" data-request-id="${request.sender_id}">
        <div class="request-user-info">
          <img src="${request.avatar_url || this.noAvatar}" alt="${request.display_name}" class="request-avatar">
          <div class="request-details">
            <h4 class="request-name">${request.display_name}</h4>
            <p class="request-meta">${request.mutual_friends} mutual friends • ${timeAgo}</p>
          </div>
        </div>
        <div class="request-actions">
          <button class="accept-btn spotify-btn-primary" data-action="accept" data-sender-id="${request.sender_id}">
            Accept
          </button>
          <button class="decline-btn spotify-btn-secondary" data-action="decline" data-sender-id="${request.sender_id}">
            Decline
          </button>
        </div>
      </div>
    `;
  }

  formatTimeAgo(dateString) {
    console.log("Formatting time ago for:", dateString);
    const date = new Date(dateString);
    console.log("Parsed date:", date);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return "just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  }

  async acceptRequest(senderId) {
    try {
      // Animate out the UI element first
      this.animateRequestRemoval(senderId);

      const response = await fetch(
        "https://recspot-e6585868d70b.herokuapp.com/accept_friend_request",
        {
          credentials: "include",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sender_id: senderId }),
        }
      );

      if (response.ok) {
        // Remove from local cache after animation
        setTimeout(() => {
          this.cachedRequests = this.cachedRequests.filter(
            (req) => req.sender_id !== senderId
          );
          this.updateCacheAndUI();
          this.updateRequestsBadge();
        }, 300);

        if (window.friendsManager) {
          window.friendsManager.refreshFriends();
        } else {
          loadFriends();
        }

        showMessage("Friend request accepted!");
      } else {
        // If API call failed, reverse the animation
        this.reverseRequestAnimation(senderId);
        showMessage("Failed to accept request", "error");
      }
    } catch (error) {
      console.error("Error accepting request:", error);
      this.reverseRequestAnimation(senderId);
      showMessage("Failed to accept request", "error");
    }
  }

  async declineRequest(senderId) {
    try {
      // Animate out the UI element first
      this.animateRequestRemoval(senderId);

      const response = await fetch(
        "https://recspot-e6585868d70b.herokuapp.com/decline_friend_request",
        {
          credentials: "include",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sender_id: senderId }),
        }
      );

      if (response.ok) {
        // Remove from local cache after animation
        setTimeout(() => {
          this.cachedRequests = this.cachedRequests.filter(
            (req) => req.sender_id !== senderId
          );
          this.updateCacheAndUI();
        }, 300);

        showMessage("Friend request declined", "success");
      } else {
        // If API call failed, reverse the animation
        this.reverseRequestAnimation(senderId);
        showMessage("Failed to decline request", "error");
      }
    } catch (error) {
      console.error("Error declining request:", error);
      this.reverseRequestAnimation(senderId);
      showMessage("Failed to decline request", "error");
    }
  }

  async updateRequestsBadge() {
  console.log("Updating friend requests badge");
  
  const badge = document.querySelector(".friend-requests-badge");
  if (!badge) {
    console.log("No friend requests badge found");
    return;
  }

  try {
    // Use cached data if available and recent
    let requestCount;
    
    if (this.isModalOpen && this.cachedRequests && this.cachedRequests.length > 0) {
      // Use cached data - more efficient and consistent
      requestCount = this.cachedRequests.length;
      console.log(`Using cached count: ${requestCount}`);
    } else {
      // Fallback to API call if no cached data
      console.log("No cached data, fetching count from API");
      const response = await fetch(
        "https://recspot-e6585868d70b.herokuapp.com/get_requests_count", 
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
        console.error("Failed to fetch friend requests count:", response.statusText);
        badge.style.display = "none";
        return;
      }
      
      const data = await response.json();
      requestCount = data.requests_count || 0;
      console.log(`Fetched count from API: ${requestCount}`);
    }
    
    // Update badge display
    badge.textContent = requestCount;
    badge.style.display = requestCount > 0 ? "block" : "none";
    
    console.log(`Badge updated: ${requestCount} requests`);
    
  } catch (error) {
    console.error("Error updating requests badge:", error);
    // Hide badge on error to avoid confusion
    badge.style.display = "none";
  }
}

  animateRequestRemoval(requestId) {
    const requestElement = document.querySelector(
      `[data-request-id="${requestId}"]`
    );
    if (requestElement) {
      // Disable buttons to prevent double-clicks
      const buttons = requestElement.querySelectorAll("button");
      buttons.forEach((btn) => (btn.disabled = true));

      requestElement.style.animation = "slideOut 0.3s ease-out forwards";

      setTimeout(() => {
        if (requestElement.parentNode) {
          requestElement.remove();
        }
      }, 300);
    }
  }

  reverseRequestAnimation(requestId) {
    const requestElement = document.querySelector(
      `[data-request-id="${requestId}"]`
    );
    if (requestElement) {
      // Re-enable buttons
      const buttons = requestElement.querySelectorAll("button");
      buttons.forEach((btn) => (btn.disabled = false));

      // Remove animation and restore element
      requestElement.style.animation = "slideIn 0.3s ease-out forwards";
    }
  }

  // Lifecycle management
  onModalOpen() {
    this.isModalOpen = true;
    this.loadModalFriendRequests();
  }

  onModalClose() {
    this.isModalOpen = false;
    this.requestsList = null;

    const requestsList = this.getRequestsList();
    if (requestsList && this.handleButtonClick) {
      console.log("Removing event listener for button clicks");
      requestsList.removeEventListener("click", this.handleButtonClick);
    }
  }

  async refreshRequests() {
    console.log("Manual refresh triggered");
    this.consecutiveNoChanges = 0;
    const requests = await this.fetchFriendRequests();
    if (requests) {
      this.cachedRequests = requests;
      this.lastRequestsHash = this.generateRequestsHash(requests);
      if (this.isModalOpen) {
        this.renderRequests();
      }
      this.updateRequestsBadge();
    }
  }

  updateCacheAndUI() {
  // Update hash for change detection
  this.lastRequestsHash = this.generateRequestsHash(this.cachedRequests);
  
  // Update UI if modal is open
  if (this.isModalOpen) {
    this.renderRequests();
  }
  
  // Update badge
  this.updateRequestsBadge();
  
  console.log(`Cache updated: ${this.cachedRequests.length} requests`);
  }
}

window.friendRequestManager = new FriendRequestsManager();
