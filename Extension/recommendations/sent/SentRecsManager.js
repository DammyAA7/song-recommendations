class SentRecsManager {
  constructor() {
    this.sentContainer = null;
    this.supabaseClient = null;
    this.cachedRecommendations = {};
    this.isModalOpen = false;
    this.initialized = false;
    this.lastFetchTime = null;
    this.lastRecHash = null;
    this.expandedStates = new Set(); // New: Track expanded states

    this.noAvatar = this.createDefaultAvatar();
   }

 createDefaultAvatar(size = 18, color = "#666666") {
    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="${color}" viewBox="0 0 16 16">
      <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/>
    </svg>`;
    
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
  }

  async initialize() {
    try {
      // Load expanded states from memory
      this.loadExpandedStates();

      // Wait for supabaseClient to be available
      await this.waitForSupabaseClient();

      // Load initial data from API
      await this.loadInitialSentRecs();

      // Setup real-time listener
      this.setupRealtimeListener();

      this.initialized = true;
    } catch (error) {
      console.error("Failed to initialize ReceivedRecsManager:", error);
      throw error;
    }
  }

  setupRealtimeListener() {
    const currentUserId = window.UserIDUtils.getCurrentUserId();
    this.supabaseClient.subscribe(
      "recommendations",
      "INSERT",
      `user_id=eq.${currentUserId}`,
      async (payload) => {
        const rec = await this.fetchRecommendation(payload.new.id);
        if (rec) {
          this.updateCache(rec);
        }
      }
    );

    this.supabaseClient.subscribe(
      "recommendation_songs",
      "UPDATE",
      null,
      async (payload) => {
        const existsInCache = this.isRecommendationInCache(
          payload.new.recommendation_id
        );
        if (existsInCache) {
          const newRecId = payload.new.recommendation_id;
          const newRecLikeDislike = payload.new.like_dislike;
          this.updateLikeStatus(newRecId, newRecLikeDislike);
          this.updateLikeStatusInUI(newRecId, newRecLikeDislike);
        } else {
          console.warn(
            `Received new song for recommendation ${payload.new.recommendation_id} not in cache`
          );
        }
      }
    );

    this.supabaseClient.subscribe(
      "recommendation_comments",
      "INSERT",
      null,
      async (payload) => {
        const recId = payload.new.recommendation_id;
        const commentText = payload.new.comment;
        const replyText = payload.new.reply;
        // Check if recommendation already exists in cache
        const existsInCache = this.isRecommendationInCache(recId);
        if (existsInCache) {
          console.log("Recommendation exists in cache");
          // Update cache with reply if changed
          if (replyText) {
            this.updateCommentInCache(recId, replyText);
            this.addOrUpdateCommentInUI(recId, replyText);
          }

          // Update cache with comment if changed
          if (commentText) {
            this.updateReplyInCache(recId, commentText);
            this.removeReplyButton(recId);
          }
        }
      }
    );

    this.supabaseClient.subscribe(
      "recommendation_comments",
      "UPDATE",
      null,
      async (payload) => {
        const recId = payload.new.recommendation_id;
        const commentText = payload.new.comment;
        const replyText = payload.new.reply;
        console.log("Comment payload received:", payload);
        // Check if recommendation already exists in cache
        const existsInCache = this.isRecommendationInCache(recId);
        if (existsInCache) {
          console.log("Recommendation exists in cache");

          // Update cache with reply if changed
          if (replyText) {
            this.updateCommentInCache(recId, replyText);
            this.addOrUpdateCommentInUI(recId, replyText);
          }

          // Update cache with comment if changed
          if (commentText) {
            this.updateReplyInCache(recId, commentText);
            this.removeReplyButton(recId);
          }
        }
      }
    );
  }

  updateLikeStatus(recommendationId, likeDislike) {
    // Find and update the recommendation in cache
    for (const [userId, userRecs] of Object.entries(
      this.cachedRecommendations
    )) {
      const recIndex = userRecs.findIndex(
        (rec) =>
          rec.recommendation_id.toString() === recommendationId.toString()
      );
      if (recIndex !== -1) {
        // Update the recommendation with comment
        userRecs[recIndex].like_dislike = likeDislike;

        // Update hash for change detection
        this.lastRecHash = this.generateRecHash(this.cachedRecommendations);

        console.log(
          `Updated like status for recommendation ${recommendationId} in cache`
        );
        return true;
      }
    }
    return false;
  }

  updateLikeStatusInUI(recommendationId, likeDislike) {
    // Find the song item in the DOM using the recommendation ID
    const songItem = document.querySelector(
      `[data-recommendation-id="${recommendationId}"]`
    );

    if (!songItem) {
      console.warn(
        `Song item with recommendation ID ${recommendationId} not found in DOM`
      );
      return;
    }

    // Find the song-status element within this song item
    const statusElement = songItem.querySelector(".song-status");

    if (!statusElement) {
      console.warn(
        `Status element not found for recommendation ID ${recommendationId}`
      );
      return;
    }

    // Update the status indicator HTML using the getStatusIndicator function
    statusElement.innerHTML = getStatusIndicator(likeDislike);

    console.log(
      `Updated UI status for recommendation ${recommendationId} to ${likeDislike}`
    );
  }

  isRecommendationInCache(recommendationId) {
    for (const [userId, userRecs] of Object.entries(
      this.cachedRecommendations
    )) {
      const exists = userRecs.some(
        (rec) =>
          rec.recommendation_id.toString() === recommendationId.toString()
      );
      if (exists) {
        return true;
      }
    }
    return false;
  }

  async fetchRecommendation(recId) {
    const { data, error } = await this.supabaseClient
      .from("enriched_recommendations")
      .select("*")
      .eq("recommendation_id", recId)
      .single();

    if (error) {
      console.error("Error fetching enriched request:", error);
      return null;
    }

    console.log("Fetched recommendation data:", data);

    return {
      recommendation_id: data.recommendation_id,
      recommended_by: data.friend_id,
      display_name: data.friend_name,
      friend_avatar: data.friend_avatar,
      song_id: data.song_id,
      title: data.song_title,
      artist: data.artist,
      track_cover: data.track_cover,
      like_dislike: data.like_dislike,
      comment: data.comment,
      reply: data.reply,
    };
  }

  updateCache(newRec) {
    // Store the updated user's data
    let userRecs;

    if (this.cachedRecommendations[newRec.display_name]) {
      // Add to existing user's recommendations
      this.cachedRecommendations[newRec.display_name].unshift(newRec);
      userRecs = this.cachedRecommendations[newRec.display_name];
    } else {
      // Create new entry for this user
      userRecs = [newRec];
    }

    // Remove the user from current position and add them to the top
    delete this.cachedRecommendations[newRec.display_name];

    // Recreate the cache with the updated user first
    this.cachedRecommendations = {
      [newRec.display_name]: userRecs,
      ...this.cachedRecommendations,
    };

    // Update the hash for change detection
    this.lastRecHash = this.generateRecHash(this.cachedRecommendations);
  }

  setupPersonContainerListeners(personContainer) {
    // Setup expand/collapse button
    const expandBtn = personContainer.querySelector(".expand-btn");
    if (expandBtn) {
      expandBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const personName = expandBtn.dataset.person;
        const songsList = personContainer.querySelector(".songs-list");

        // Toggle the visual state
        songsList.classList.toggle("hidden");

        // Update button text
        const isExpanded = !songsList.classList.contains("hidden");
        expandBtn.textContent = isExpanded ? "▲" : "▼";

        // Update persistent state
        this.toggleExpandedState(personName);
      });
    }
  }

  renderRecommendations() {
    if (!this.getContainer()) {
      console.error("Cannot render recommendations - container not found");
      return;
    }

    if (Object.keys(this.cachedRecommendations).length === 0) {
      this.renderNoRecommendations();
      return;
    }

    let html = "";
    for (const [friendName, friendRecs] of Object.entries(
      this.cachedRecommendations
    )) {
      const count = friendRecs.length;
      const friendAvatar = friendRecs[0].friend_avatar || this.noAvatar;
      const isExpanded = this.expandedStates.has(friendName); // Use persistent state

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
          <button class="expand-btn" data-person="${friendName}">${
        isExpanded ? "▲" : "▼"
      }</button>
        </div>
        <div class="songs-list ${isExpanded ? "" : "hidden"}">
  ${friendRecs
    .map(
      (rec) => `
        <div class="song-item" data-recommendation-id="${
          rec.recommendation_id
        }">
          <div class="song-details">
            <div class="song-info-actions-row">
              <div class="song-album-cover">
                <img src="${
                  rec.track_cover ||
                  "https://via.placeholder.com/60x60/1db954/white?text=♪"
                }" alt="${rec.title}" class="album-cover">
              </div>
              <div class="song-info">
                <span class="song-title">${rec.title}</span>
                <span class="song-artist">${rec.artist}</span>
              </div>
              <div class="song-actions">
                <div class="song-status">
                  ${getStatusIndicator(rec.like_dislike)}
                </div>
              </div>
              ${rec.comment ? 
              `<div class="sent-comment-actions">
                <button class="reply-btn" data-friend-name="${friendName}" data-rec-id="${rec.recommendation_id}" title="Reply to ${friendName}">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                  </svg>
                  ${rec.reply ? `Reply` : `Comment`}
                </button>
              </div>` : ""}
            </div>
            ${rec.reply ? `<div class="song-comment-section">
              <div class="comment-bubble">
                <span class="comment-text">${rec.reply}</span>
              </div>
            </div>` : ""}
            
          </div>
        </div>
      `
    )
    .join("")}
</div>
    `;
    }

    this.sentContainer.innerHTML = html;
    this.setupExpandCollapseActions();
    this.setupReplyActions();
  }

  setupReplyActions() {
    this.sentContainer = this.getContainer();
    if (!this.sentContainer) return;
    this.sentContainer.querySelectorAll(".reply-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const friendName = btn.dataset.friendName;
        const recId = btn.dataset.recId;
        showCommentPopup({
          type: "comment",
          friendName: friendName,
          recommendationId: recId,
          onSuccess: (replyText) => {
            // Update cache immediately
            this.updateReplyInCache(recId, replyText);

            // Remove reply button from UI
            this.removeReplyButton(recId);
          },
        });
      });
    });
  }

  updateReplyInCache(recommendationId, commentText) {
    // Find and update the recommendation in cache
    for (const [userId, userRecs] of Object.entries(
      this.cachedRecommendations
    )) {
      const recIndex = userRecs.findIndex(
        (rec) =>
          rec.recommendation_id.toString() === recommendationId.toString()
      );
      if (recIndex !== -1) {
        // Update the recommendation with reply
        userRecs[recIndex].comment = commentText;

        // Update hash for change detection
        this.lastRecHash = this.generateRecHash(this.cachedRecommendations);

        console.log(
          `Updated comment for recommendation ${recommendationId} in cache`
        );
        return true;
      }
    }
    return false;
  }

  removeReplyButton(recommendationId) {
    const songItem = this.sentContainer?.querySelector(
      `[data-rec-id="${recommendationId}"]`
    );
    if (songItem) {
      const commentActions = songItem.querySelector(".sent-comment-actions");
      if (commentActions) {
        commentActions.remove();
      }
    }
  }

  setupExpandCollapseActions() {
    this.sentContainer = this.getContainer();
    if (!this.sentContainer) return;

    this.sentContainer.querySelectorAll(".expand-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const personName = btn.dataset.person;
        const songsList = btn
          .closest(".recommendation-person")
          .querySelector(".songs-list");

        // Toggle the visual state
        songsList.classList.toggle("hidden");

        // Update button text
        const isExpanded = !songsList.classList.contains("hidden");
        btn.textContent = isExpanded ? "▲" : "▼";

        // Update persistent state
        this.toggleExpandedState(personName);
      });
    });
  }

  toggleExpandedState(personName) {
    if (this.expandedStates.has(personName)) {
      this.expandedStates.delete(personName);
    } else {
      this.expandedStates.add(personName);
    }
    this.saveExpandedStates();
  }

  async loadSentRecs() {
    try {
      this.sentContainer = this.getContainer();
      // Show loading state immediately
      this.renderLoading();

      // Always use cached data
      if (Object.keys(this.cachedRecommendations).length > 0) {
        console.log("Using cached Recommendations data");
        this.renderRecommendations();
      } else {
        console.log("No cached friends available");
        this.renderNoRecommendations();
      }
    } catch (error) {
      console.error("Error loading received recommendations:", error);
      this.renderError();
    }
  }

  renderNoRecommendations() {
    this.sentContainer = this.getContainer();
    if (!this.sentContainer) return;

    if (!this.sentContainer.querySelector(".no-recommendations-message")) {
      this.sentContainer.innerHTML = `
        <div class="no-recommendations-message">
          <p>No recommendations sent yet!</p>
          <p>Start recommending songs to your friends.</p>
        </div>
      `;
    }
  }

  renderLoading() {
    this.sentContainer = this.getContainer();
    if (!this.sentContainer) return;

    this.sentContainer.innerHTML = `
      <div class="loading-message">
        <p>Loading Sent recommendations...</p>
      </div>
    `;
  }

  renderError() {
    this.sentContainer = this.getContainer();
    if (!this.sentContainer) return;

    this.sentContainer.innerHTML = `
      <div class="error-message">
        <p>Error loading sent recommendations. Please try again later.</p>
      </div>
    `;
  }

  getContainer() {
    if (!this.sentContainer) {
      this.sentContainer = document.querySelector("#sent-recommendations");
    }
    return this.sentContainer;
  }

  async waitForSupabaseClient() {
    // Wait for the supabaseClient to be available
    let attempts = 0;
    const maxAttempts = 50; // Wait up to 5 seconds

    while (!window.secureSupabaseClient && attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (!window.secureSupabaseClient) {
      throw new Error("SecureSupabaseClient not available after waiting");
    }

    this.supabaseClient = window.secureSupabaseClient;
  }

  async loadInitialSentRecs() {
    try {
      console.log("Loading initial sent recommendations from API...");
      const sentRecs = await this.fetchSentRecs();

      if (sentRecs) {
        const groupedRecommendations = sentRecs.reduce((acc, rec) => {
          // Group by friend_name
          const userId = rec.friend_name;
          if (!acc[userId]) {
            acc[userId] = [];
          }
          acc[userId].push(rec);
          return acc;
        }, {});
        this.cachedRecommendations = groupedRecommendations;
        this.lastRecHash = this.generateRecHash(groupedRecommendations);
        this.lastFetchTime = Date.now();
        console.log(
          `Cached ${Object.keys(groupedRecommendations).length} friend sentRecs`
        );
      }
    } catch (error) {
      console.error("Error loading initial sentRecs:", error);
    }
  }

  async fetchSentRecs() {
    try {
      const response = await internetMonitor.fetchWithConnectivityCheck(
        `https://recspot-e6585868d70b.herokuapp.com/sent_recommendations`,
        {
          method: "GET",
          credentials: "include",
        },
        10000 // 10 second timeout
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const recommendations = await response.json();
      return recommendations;
    } catch (error) {
      console.error("Error fetching friend requests:", error);
      return null;
    }
  }

  generateRecHash(groupedRecommendations) {
    // Generate hash from grouped recommendations object
    const simplified = Object.entries(groupedRecommendations)
      .flatMap(([userId, recs]) =>
        recs.map((rec) => `${userId}-${rec.recommendation_id}`)
      )
      .sort();
    return simplified.join("|");
  }

  // New method: Load expanded states from memory
  loadExpandedStates() {
    try {
      // Store in a simple object attached to window to persist across tab switches
      if (!window.sentRecsExpandedStates) {
        window.sentRecsExpandedStates = {};
      }

      // Convert stored object keys to Set for easier manipulation
      this.expandedStates = new Set(Object.keys(window.sentRecsExpandedStates));
      console.log("Loaded expanded states:", Array.from(this.expandedStates));
    } catch (error) {
      console.error("Error loading expanded states:", error);
      this.expandedStates = new Set();
    }
  }

  updateCommentInCache(recommendationId, replyText) {
    // Find and update the recommendation in cache
    for (const [userId, userRecs] of Object.entries(
      this.cachedRecommendations
    )) {
      const recIndex = userRecs.findIndex(
        (rec) =>
          rec.recommendation_id.toString() === recommendationId.toString()
      );
      if (recIndex !== -1) {
        // Update the recommendation with comment
        userRecs[recIndex].reply = replyText;

        // Update hash for change detection
        this.lastRecHash = this.generateRecHash(this.cachedRecommendations);

        console.log(
          `Updated comment for recommendation ${recommendationId} in cache`
        );
        return true;
      }
    }
    return false;
  }

  addOrUpdateCommentInUI(recommendationId, replyText) {
    const songItem = this.sentContainer?.querySelector(
      `[data-rec-id="${recommendationId}"]`
    );
    if (!songItem) return;

    const songDetails = songItem.querySelector(".song-details");
    const songInfoActionsRow = songDetails.querySelector(
      ".song-info-actions-row"
    );

    // Check if comment section already exists
    let commentSection = songDetails.querySelector(".song-comment-section");

    if (commentSection) {
      // Update existing comment
      const commentTextElement = commentSection.querySelector(".comment-text");
      if (commentTextElement) {
        commentTextElement.textContent = replyText;
      }
    } else {
      // Create new comment section
      const commentHtml = `
      <div class="song-comment-section">
        <div class="comment-bubble">
          <span class="comment-text">${replyText}</span>
        </div>
      </div>
    `;

      // Insert after the song-info-actions-row
      songInfoActionsRow.insertAdjacentHTML("afterend", commentHtml);
      
    }

    const commentActionsDiv = songDetails.querySelector(".sent-comment-actions");
    if (commentActionsDiv) {
      const replyBtn = commentActionsDiv.querySelector(".reply-btn");
      if (replyBtn) {
        // Check if there's now a comment (either existing or just added)
        const hasComment = songDetails.querySelector(".song-comment-section") !== null;
        
        // Update button text - show "Reply" if there's a comment, "Comment" if not
        const buttonText = hasComment ? "Reply" : "Comment";
        
        // Find the text node in the button (it's after the SVG)
        const textNodes = Array.from(replyBtn.childNodes).filter(node => 
          node.nodeType === Node.TEXT_NODE && node.textContent.trim()
        );
        
        if (textNodes.length > 0) {
          textNodes[0].textContent = buttonText;
        } else {
          // If no text node exists, append the text
          replyBtn.appendChild(document.createTextNode(buttonText));
        }
      }
    }
  }

  saveExpandedStates() {
    try {
      if (!window.sentRecsExpandedStates) {
        window.sentRecsExpandedStates = {};
      }

      // Clear existing states
      window.sentRecsExpandedStates = {};

      // Store current expanded states
      this.expandedStates.forEach((personName) => {
        window.sentRecsExpandedStates[personName] = true;
      });

      console.log("Saved expanded states:", Array.from(this.expandedStates));
    } catch (error) {
      console.error("Error saving expanded states:", error);
    }
  }

  onModalOpen() {
    this.isModalOpen = true;
    // Clear any stale container reference
    this.sentContainer = null;

    // Load expanded states when modal opens
    this.loadExpandedStates();

    setTimeout(() => {
      this.loadSentRecs();
    }, 100);
  }

  onModalClose() {
    this.isModalOpen = false;
    this.sentContainer = null;
    // Save expanded states when modal closes
    this.saveExpandedStates();
    console.log("ReceivedRecsManager modal closed");
  }

  clearCache() {
    // Clear all cached data
    this.cachedRecommendations = {};
    this.lastRecHash = null;
    this.lastFetchTime = null;
    this.expandedStates = new Set();

    // Clear persistent expanded states
    if (window.sentRecsExpandedStates) {
      window.sentRecsExpandedStates = {};
    }

    // Clear container reference
    this.sentContainer = null;

    // Reset flags
    this.isModalOpen = false;
    this.initialized = false;

    console.log("SentRecsManager cache cleared");
  }
}

window.sentRecsManager = new SentRecsManager();
