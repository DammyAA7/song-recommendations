 async function loadSentRecommendations() {
    const sentContainer = document.querySelector("#sent-recommendations");

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
                            <span class="friend-song-count">${count} song${
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

  window.loadSentRecommendations = loadSentRecommendations;