class FriendRequestsManager {
  constructor() {
    this.requestsList = document.querySelector("#modal-friend-requests-list");
    this.cachedRequests = [];
    this.socket = null;
    this.subscription = null;
    this.isModalOpen = false;
    this.currentUserId = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 1000; // Start with 1 second
  }

  async initializeWebSocket() {
    try {
      this.currentUserId = await this.getCurrentUserId();
      if (!this.currentUserId) {
        console.error("No current user ID found");
        return false;
      }

      const backendUrl = "https://recspot-e6585868d70b.herokuapp.com";
      this.socket = io(backendUrl, {
        withCredentials: true,
        transports: ["websocket", "polling"],
      });

      this.setupSocketEventListeners();
      return true;
    } catch (error) {
      console.error("Error initializing WebSocket:", error);
      return false;
    }
  }

  setupSocketEventListeners() {
    if (!this.socket) return;

    // Connection events
    this.socket.on("connect", () => {
      console.log("Connected to real-time updates");
      this.reconnectAttempts = 0;
      this.reconnectDelay = 1000;

      // Subscribe to friend requests for current user
      this.socket.emit("subscribe_friend_requests");
    });

    this.socket.on("disconnect", (reason) => {
      console.log("Disconnected from real-time updates:", reason);

      // Attempt to reconnect if disconnection was unexpected
      if (reason === "io server disconnect") {
        // Server disconnected, don't reconnect automatically
        showMessage("Connection lost. Please refresh the page.");
      } else {
        // Client-side disconnect or network issue, attempt reconnect
        this.attemptReconnect();
      }
    });

    this.socket.on("connect_error", (error) => {
      console.error("Connection error:", error);
      this.attemptReconnect();
    });

    // Subscription events
    this.socket.on("subscribed", (data) => {
      console.log("Subscribed to friend requests:", data.message);
    });

    this.socket.on("error", (data) => {
      console.error("Socket error:", data.message);
      showMessage("Real-time updates temporarily unavailable");
    });

    // Real-time friend request updates
    this.socket.on("friend_request_update", (payload) => {
      this.handleRealtimeUpdate(payload);
    });

    // Additional specific events (optional)
    this.socket.on("friend_request_accepted", (data) => {
      showMessage("Friend request accepted!", "success");
    });

    this.socket.on("friend_request_declined", (data) => {
      showMessage("Friend request declined");
    });
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      showMessage(
        "Unable to maintain real-time connection. Please refresh the page.",
        "error"
      );
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff

    console.log(
      `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    setTimeout(() => {
      if (this.socket) {
        this.socket.connect();
      }
    }, delay);
  }

  async loadModalFriendRequests() {
    try {

      // Initialize WebSocket if not already done
      if (!this.socket) {
        await this.initializeWebSocket();
      }
      // Initial load from your existing endpoint
      const response = await fetch(
        "https://recspot-e6585868d70b.herokuapp.com/friend_requests",
        {
          method: "GET",
          credentials: "include",
        }
      );
      if (!response.ok) throw new Error("Failed to fetch friend requests");

      const requests = await response.json();
      this.cachedRequests = requests;
      this.renderRequests();
      this.updateRequestsBadge();
    } catch (error) {
      console.error("Error loading friend requests:", error);
      this.renderError();
    }
  }

  async handleRealtimeUpdate(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    switch (eventType) {
      case "INSERT":
        await this.handleNewRequest(newRecord);
        break;
      //Will implement user being able to deleting requests later
      case "DELETE":
        this.handleDeletedRequest(oldRecord);
        break;
    }
  }

  async handleNewRequest(newRecord) {
    try {
      // Check if we already have this request to avoid duplicates
      const existingRequest = this.cachedRequests.find(
        req => req.sender_id === newRecord.sender_id
      );
      
      if (existingRequest) {
        console.log('Request already exists, skipping duplicate');
        return;
      }
      // Fetch complete user data for the new request
      const response = await fetch(
        "https://recspot-e6585868d70b.herokuapp.com/get_user_profile",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ user_id: newRecord.sender_id }),
        }
      );
      const userData = await response.json();

      const newRequest = {
        sender_id: newRecord.sender_id,
        created_at: newRecord.created_at,
        display_name: userData.spotify_display_name,
        avatar_url: userData.spotify_avatar_url,
        mutual_friends: await this.getMutualFriendsCount(newRecord.sender_id),
      };

      this.cachedRequests.unshift(newRequest); // Add to beginning
      this.renderRequests();
      this.updateRequestsBadge();
      showMessage(
        `New friend request from ${userData.spotify_display_name}`,
        "success"
      );
    } catch (error) {
      console.error("Error handling new request:", error);
      // Fallback: refresh all requests
      this.loadModalFriendRequests();
    }
  }

  handleDeletedRequest(deletedRecord) {
    const initialLength = this.cachedRequests.length;
    this.cachedRequests = this.cachedRequests.filter(
      req => req.sender_id !== deletedRecord.sender_id
    );
    
    // Only re-render if something was actually removed
    if (this.cachedRequests.length < initialLength) {
      this.renderRequests();
      this.updateRequestsBadge();
    }
  }

  async getMutualFriendsCount(sender_id) {
    try {
      const response = await fetch(
        "https://recspot-e6585868d70b.herokuapp.com/get_mutual_friends",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            sender_id: sender_id,
          }),
        }
      );
      const data = await response.json();
      return data.mutual_friends_count || 0;
    } catch {
      return 0;
    }
  }

  renderRequests() {
    if (!this.requestsList) return;

    if (!this.cachedRequests.length) {
      this.requestsList.innerHTML =
        '<div class="no-requests">No friend requests</div>';
      return;
    }

    const requestsHTML = this.cachedRequests
      .map((request) => this.createRequestHTML(request))
      .join("");

    this.requestsList.innerHTML = requestsHTML;
  }

  renderError() {
    if (this.requestsList) {
      this.requestsList.innerHTML = '<div class="error-message">Failed to load friend requests</div>';
    }
  }

  createRequestHTML(request) {
    const timeAgo = this.formatTimeAgo(request.created_at);
    return `
      <div class="friend-request-item" data-request-id="${request.sender_id}">
        <div class="request-user-info">
          <img src="${request.avatar_url}" alt="${request.display_name}" class="request-avatar">
          <div class="request-details">
            <h4 class="request-name">${request.display_name}</h4>
            <p class="request-meta">${request.mutual_friends} mutual friends • ${timeAgo}</p>
          </div>
        </div>
        <div class="request-actions">
          <button class="accept-btn spotify-btn-primary" onclick="friendRequestManager.acceptRequest('${request.sender_id}')">
            Accept
          </button>
          <button class="decline-btn spotify-btn-secondary" onclick="friendRequestManager.declineRequest('${request.sender_id}')">
            Decline
          </button>
        </div>
      </div>
    `;
  }

  formatTimeAgo(dateString) {
    const date = new Date(dateString);
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
          this.updateRequestsBadge();
        }, 300);

        showMessage("Friend request accepted!");
      } else {
        // If API call failed, reverse the animation
        this.reverseRequestAnimation(senderId);
        showMessage("Failed to accept request");
      }
    } catch (error) {
      console.error("Error accepting request:", error);
      this.reverseRequestAnimation(senderId);
      showMessage("Failed to accept request");
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
          this.updateRequestsBadge();
        }, 300);

        showMessage("Friend request declined", "success");
      } else {
        // If API call failed, reverse the animation
        this.reverseRequestAnimation(senderId);
        showMessage("Failed to decline request");
      }
    } catch (error) {
      console.error("Error declining request:", error);
      this.reverseRequestAnimation(senderId);
      showMessage("Failed to decline request");
    }
  }

  updateRequestsBadge() {
    // Update any badge/counter showing number of pending requests
    const badge = document.querySelector(".friend-requests-badge");
    if (badge) {
      const count = this.cachedRequests.length;
      badge.textContent = count;
      badge.style.display = count > 0 ? "block" : "none";
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
    // Keep subscription active for background updates
    // You could optionally unsubscribe here to save resources
  }

  cleanup() {
    if (this.socket) {
      // Unsubscribe from friend requests
      if (this.currentUserId) {
        this.socket.emit("unsubscribe_friend_requests", {
          user_id: this.currentUserId,
        });
      }

      // Disconnect socket
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Utility methods
  async getCurrentUserId() {
    // Get current user ID from Chrome storage or your auth system
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
    
    if (data && data.user_id) {
      return data.user_id;
    }
  }
}

window.friendRequestManager = new FriendRequestsManager();
