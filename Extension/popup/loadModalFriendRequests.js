function loadModalFriendRequests() {
  const requestsList = document.querySelector("#modal-friend-requests-list");

  // Dummy friend request data
  const dummyRequests = [
    {
      id: "req_001",
      displayName: "Alex Johnson",
      profileImage: "https://i.pravatar.cc/150?img=1",
      mutualFriends: 5,
      requestDate: "2 days ago",
    },
    {
      id: "req_001",
      displayName: "Alex Johnson",
      profileImage: "https://i.pravatar.cc/150?img=1",
      mutualFriends: 5,
      requestDate: "2 days ago",
    },
    {
      id: "req_001",
      displayName: "Alex Johnson",
      profileImage: "https://i.pravatar.cc/150?img=1",
      mutualFriends: 5,
      requestDate: "2 days ago",
    },
    {
      id: "req_001",
      displayName: "Alex Johnson",
      profileImage: "https://i.pravatar.cc/150?img=1",
      mutualFriends: 5,
      requestDate: "2 days ago",
    },
    {
      id: "req_002",
      displayName: "Sarah Chen",
      profileImage: "https://i.pravatar.cc/150?img=2",
      mutualFriends: 2,
      requestDate: "1 week ago",
    },
    {
      id: "req_003",
      displayName: "Mike Rodriguez",
      profileImage: "https://i.pravatar.cc/150?img=3",
      mutualFriends: 8,
      requestDate: "3 days ago",
    },
  ];

  // Generate HTML for friend requests
  const requestsHTML = dummyRequests
    .map(
      (request) => `
    <div class="friend-request-item" data-request-id="${request.id}">
      <div class="request-user-info">
        <img src="${request.profileImage}" alt="${request.displayName}" class="request-avatar">
        <div class="request-details">
          <h4 class="request-name">${request.displayName}</h4>
          <p class="request-meta">${request.mutualFriends} mutual friends • ${request.requestDate}</p>
        </div>
      </div>
      <div class="request-actions">
        <button class="accept-btn spotify-btn-primary" onclick="acceptFriendRequest('${request.id}')">
          Accept
        </button>
        <button class="decline-btn spotify-btn-secondary" onclick="declineFriendRequest('${request.id}')">
          Decline
        </button>
      </div>
    </div>
  `
    )
    .join("");

  requestsList.innerHTML =
    requestsHTML || '<div class="no-requests">No friend requests</div>';
}

class FriendRequestsManager {
  constructor() {
    this.requestsList = document.querySelector("#modal-friend-requests-list");
    this.cachedRequests = [];
    this.subscription = null;
    this.isModalOpen = false;
  }

  async loadModalFriendRequests() {
    try {
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

      // Set up real-time subscription when modal opens
      if (!this.subscription) {
        this.setupRealtimeSubscription();
      }
    } catch (error) {
      console.error("Error loading friend requests:", error);
      this.renderError();
    }
  }

  setupRealtimeSubscription() {
    // Subscribe to changes in the requests table
    this.subscription = supabase
      .channel("friend-requests-channel")
      .on(
        "postgres_changes",
        {
          event: "INSERT", // Listen to INSERT
          schema: "public",
          table: "requests",
          filter: `receiver_id=eq.${this.getCurrentUserId()}`,
        },
        (payload) => this.handleRealtimeUpdate(payload)
      )
      .subscribe();
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
        mutual_friends: await this.getMutualFriendsCount(
          newRecord.sender_id,
          newRecord.receiver_id
        ),
      };

      this.cachedRequests.unshift(newRequest); // Add to beginning
      this.renderRequests();
      this.showNotification(
        `New friend request from ${userData.spotify_display_name}`
      );
    } catch (error) {
      console.error("Error handling new request:", error);
      // Fallback: refresh all requests
      this.loadModalFriendRequests();
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
}
