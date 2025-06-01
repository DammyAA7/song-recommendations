async function loadReceivedRecommendations() {
  const receivedContainer = document.querySelector("#received-recommendations");

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

window.loadReceivedRecommendations = loadReceivedRecommendations;
