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

  window.loadReceivedRecommendationsSmooth = loadReceivedRecommendationsSmooth;