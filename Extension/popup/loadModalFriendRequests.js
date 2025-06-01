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