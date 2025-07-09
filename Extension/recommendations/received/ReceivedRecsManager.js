class ReceivedRecsManager {
  constructor() {
    this.receivedContainer = null;
    this.supabaseClient = null;
    this.cachedRecommendations = {};
    this.isModalOpen = false;
    this.initialized = false;
    this.lastFetchTime = null;
    this.lastRecHash = null;
    this.expandedStates = new Set(); // New: Track expanded states

    this.noAvatar =
      "https://media.istockphoto.com/id/945691510/vector/people-icon-silhouettes-illustration-vector.jpg?s=612x612&w=0&k=20&c=chZcclmonc5T002ErDfMZ6KYz01tfHnd-Hzk4EfMJ6k=";
  }

  async initialize() {
    try {
      // Load expanded states from memory
      this.loadExpandedStates();

      // Wait for supabaseClient to be available
      await this.waitForSupabaseClient();

      // Load initial data from API
      await this.loadInitialReceivedRecs();

      // Setup real-time listener
      this.setupRealtimeListener();

      // Setup event listener for like/dislike updates
      this.setupLikeDislikeListener();

      this.initialized = true;
      console.log("ReceivedRecsManager initialized with cached data");
    } catch (error) {
      console.error("Failed to initialize ReceivedRecsManager:", error);
      throw error;
    }
  }

  setupRealtimeListener() {
    // Subscribe to real-time changes
    const currentUserId = window.UserIDUtils.getCurrentUserId();
    this.supabaseClient.subscribe(
      "recommendations",
      "INSERT",
      `friend_id=eq.${currentUserId}`,
      async (payload) => {
        const rec = await this.fetchRecommnedation(payload.new.id);
        console.log("Payload received:", payload);
        if (rec) {
          this.handleNewRec(rec);
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
          // Update cache with comment if changed
          if (commentText) {
            this.updateCommentInCache(recId, commentText);
            this.addOrUpdateCommentInUI(recId, commentText);
          }

          // Update cache with reply if changed
          if (replyText) {
            this.updateReplyInCache(recId, replyText);
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

          // Update cache with comment if changed
          if (commentText) {
            this.updateCommentInCache(recId, commentText);
            this.addOrUpdateCommentInUI(recId, commentText);
          }

          // Update cache with reply if changed
          if (replyText) {
            this.updateReplyInCache(recId, replyText);
            this.removeReplyButton(recId);
          }
        }
      }
    );
    /*
    this.supabaseClient.subscribe("requests", "DELETE", null, (payload) => {
      console.log("Request removed:", payload);
      this.handleRequestRemoved(payload.old);
    });*/
  }

  async fetchRecommnedation(recId) {
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
      recommended_by: data.recommended_by_id,
      display_name: data.recommended_by_name,
      avatar_url: data.recommended_by_avatar,
      song_id: data.song_id,
      title: data.song_title,
      artist: data.artist,
      track_cover: data.track_cover,
      like_dislike: data.like_dislike,
      comment: data.comment,
      reply: data.reply,
    };
  }

  handleNewRec(newRec) {
    // Use the new efficient update method
    this.updateUIandCache(newRec);

    // Show notification
    showMessage(`New recommendation from ${newRec.display_name}`, "success");
  }

  updateUIandCache(newRec) {
    // Update the cache first
    if (this.cachedRecommendations[newRec.display_name]) {
      // Add to existing user's recommendations
      this.cachedRecommendations[newRec.display_name].unshift(newRec);
    } else {
      // Create new entry for this user
      this.cachedRecommendations[newRec.display_name] = [newRec];
    }

    // Update the hash for change detection
    this.lastRecHash = this.generateRecHash(this.cachedRecommendations);

    // Update UI efficiently
    const container = this.getContainer();
    if (!container) {
      console.error("Container not found for UI update");
      return;
    }

    // Check if this is the first recommendation (no recommendations message is shown)
    const noRecsMessage = container.querySelector(
      ".no-recommendations-message"
    );
    if (noRecsMessage) {
      // If no recommendations were shown, do a full render
      this.renderRecommendations();
      return;
    }

    // Find existing person container
    const existingPerson = container.querySelector(
      `[data-person="${newRec.display_name}"]`
    );

    if (existingPerson) {
      // User already exists, just add the new song
      this.addSongToExistingUser(existingPerson, newRec);
    } else {
      // New user, create entire person container
      this.addNewUserContainer(container, newRec);
    }
  }

  addSongToExistingUser(personContainer, newRec) {
    // Update the song count
    const songCount = personContainer.querySelector(".friend-song-count");
    const currentCount = this.cachedRecommendations[newRec.display_name].length;
    songCount.textContent = `${currentCount} song${
      currentCount > 1 ? "s" : ""
    } received`;

    // Create new song HTML
    const songHtml = this.createSongItemHtml(newRec);

    // Find the songs list and add the new song
    const songsList = personContainer.querySelector(".songs-list");
    songsList.insertAdjacentHTML("afterbegin", songHtml);

    // Setup event listeners for the new song item
    const newSongItem = songsList.firstElementChild;
    this.setupSongItemListeners(newSongItem);
  }

  addNewUserContainer(container, newRec) {
    const userAvatar = newRec.friend_avatar || this.noAvatar;
    const isExpanded = this.expandedStates.has(newRec.display_name);

    const personHtml = `
    <div class="recommendation-person" data-person="${newRec.display_name}">
      <div class="person-header">
        <div class="friend-avatar">
          <img src="${userAvatar}" alt="${newRec.display_name}">
        </div>
        <div class="friend-info">
          <span class="friend-name">${newRec.display_name}</span>
          <span class="friend-song-count">1 song received</span>
        </div>
        <button class="expand-btn" data-person="${newRec.display_name}">${
      isExpanded ? "▲" : "▼"
    }</button>
      </div>
      <div class="songs-list ${isExpanded ? "" : "hidden"}">
        ${this.createSongItemHtml(newRec)}
      </div>
    </div>
  `;

    // Add the new person container
    container.insertAdjacentHTML("afterbegin", personHtml);

    // Setup event listeners for the new person container
    const newPersonContainer = container.firstElementChild;
    this.setupPersonContainerListeners(newPersonContainer);
  }

  createSongItemHtml(rec) {
    const likeActive = rec.like_dislike === true ? "active" : "";
    const dislikeActive = rec.like_dislike === false ? "active" : "";

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
        <div class="song-info-actions-row">
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
        ${
          rec.comment
            ? `
          <div class="song-comment-section">
            <div class="comment-bubble">
              <span class="comment-text">${rec.comment}</span>
            </div>
          </div>
        `
            : ""
        }
        ${
          !rec.reply
            ? `
          <div class="comment-actions">
            <button class="reply-btn" data-friend-name="${rec.display_name}" data-rec-id="${rec.recommendation_id}" title="Reply to ${rec.display_name}">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
              Reply
            </button>
          </div>
        `
            : ""
        }
      </div>
    </div>
  `;
  }

  setupSongItemListeners(songItem) {
    // Setup like/dislike/play buttons for the song item
    const likeBtn = songItem.querySelector(".like-btn");
    const dislikeBtn = songItem.querySelector(".dislike-btn");
    const playBtn = songItem.querySelector(".play-btn");
    const replyBtn = songItem.querySelector(".reply-btn");

    // These would typically be handled by window.setupRecommendationActions()
    // but we need to set them up manually for the new item
    if (window.setupRecommendationActions) {
      // Re-run the setup for the entire container to include new items
      window.setupRecommendationActions();
    }

    // Setup reply button specifically
    if (replyBtn) {
      replyBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const friendName = replyBtn.dataset.friendName;
        const recId = replyBtn.dataset.recId;
        showCommentPopup({
          type: "reply",
          friendName: friendName,
          recommendationId: recId,
          onSuccess: (replyText) => {
            console.log("Reply sent:", replyText);
          },
        });
      });
    }
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

    // Setup song item listeners
    const songItems = personContainer.querySelectorAll(".song-item");
    songItems.forEach((songItem) => {
      this.setupSongItemListeners(songItem);
    });
  }

  // New method: Load expanded states from memory
  loadExpandedStates() {
    try {
      // Store in a simple object attached to window to persist across tab switches
      if (!window.recRecsExpandedStates) {
        window.recRecsExpandedStates = {};
      }

      // Convert stored object keys to Set for easier manipulation
      this.expandedStates = new Set(Object.keys(window.recRecsExpandedStates));
      console.log("Loaded expanded states:", Array.from(this.expandedStates));
    } catch (error) {
      console.error("Error loading expanded states:", error);
      this.expandedStates = new Set();
    }
  }

  // New method: Save expanded states to memory
  saveExpandedStates() {
    try {
      if (!window.recRecsExpandedStates) {
        window.recRecsExpandedStates = {};
      }

      // Clear existing states
      window.recRecsExpandedStates = {};

      // Store current expanded states
      this.expandedStates.forEach((personName) => {
        window.recRecsExpandedStates[personName] = true;
      });

      console.log("Saved expanded states:", Array.from(this.expandedStates));
    } catch (error) {
      console.error("Error saving expanded states:", error);
    }
  }

  // New method: Toggle expanded state
  toggleExpandedState(personName) {
    if (this.expandedStates.has(personName)) {
      this.expandedStates.delete(personName);
    } else {
      this.expandedStates.add(personName);
    }
    this.saveExpandedStates();
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

  async loadInitialReceivedRecs() {
    try {
      console.log("Loading initial received recommendations from API...");
      const receivedRecs = await this.fetchReceivedRecs();

      if (receivedRecs) {
        const groupedRecommendations = receivedRecs.reduce((acc, rec) => {
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
          `Cached ${
            Object.keys(groupedRecommendations).length
          } friend receivedRecs`
        );
      }
    } catch (error) {
      console.error("Error loading initial receivedRecs:", error);
    }
  }

  async fetchReceivedRecs() {
    try {
      // Add timestamp to prevent caching issues
      const timestamp = Date.now();
      const response = await internetMonitor.fetchWithConnectivityCheck(
        `https://recspot-e6585868d70b.herokuapp.com/recommendations?`,
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

  async loadReceivedRecs() {
    try {
      this.receivedContainer = this.getContainer();
      // Show loading state immediately
      this.renderLoading();

      // Always use cached data - no API calls in loadFriends
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

  generateRecHash(groupedRecommendations) {
    // Generate hash from grouped recommendations object
    const simplified = Object.entries(groupedRecommendations)
      .flatMap(([userId, recs]) =>
        recs.map((rec) => `${userId}-${rec.recommendation_id}`)
      )
      .sort();
    return simplified.join("|");
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

    // Store current button states only (expanded states are now managed separately)
    const buttonStates = new Map();

    // Capture current button states
    this.receivedContainer
      .querySelectorAll(".recommendation-person")
      .forEach((person) => {
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

    // Build new HTML using persistent expanded states
    let html = "";
    for (const [userId, userRecs] of Object.entries(
      this.cachedRecommendations
    )) {
      const userName = userId;
      const count = userRecs.length;
      const userAvatar = userRecs[0].friend_avatar || this.noAvatar;
      const isExpanded = this.expandedStates.has(userName); // Use persistent state

      html += `
      <div class="recommendation-person" data-person="${userName}">
        <div class="person-header">
          <div class="friend-avatar">
            <img src="${userAvatar}" alt="${userName}">
          </div>
          <div class="friend-info">
            <span class="friend-name">${userName}</span>
            <span class="friend-song-count">${count} song${
        count > 1 ? "s" : ""
      } received</span>
          </div>
          <button class="expand-btn" data-person="${userName}">${
        isExpanded ? "▲" : "▼"
      }</button>
        </div>
        <div class="songs-list ${isExpanded ? "" : "hidden"}">
          ${userRecs
            .map((rec) => {
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
                  <div class="song-info-actions-row">
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
                    ${
                      rec.comment
                        ? `<div class="song-comment-section">
                        <div class="comment-bubble">
                          <span class="comment-text">${rec.comment}</span>
                        </div>
                      </div>`
                        : ""
                    }
                    ${
                      rec.reply
                        ? ""
                        : `<div class="comment-actions">
                      <button class="reply-btn" data-friend-name="${userName}" data-rec-id="${rec.recommendation_id}" title="Reply to ${userName}">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                        </svg>
                        Reply
                      </button>
                    </div>`
                    }
                  </div>
                </div>
            `;
            })
            .join("")}
        </div>
      </div>
    `;
    }

    this.receivedContainer.innerHTML = html;
    window.setupRecommendationActions();
    this.setupReplyActions();
    this.setupExpandCollapseActions(); // New: Setup expand/collapse event listeners
  }

  // New method: Setup expand/collapse event listeners
  setupExpandCollapseActions() {
    this.receivedContainer = this.getContainer();
    if (!this.receivedContainer) return;

    this.receivedContainer.querySelectorAll(".expand-btn").forEach((btn) => {
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

  getContainer() {
    if (!this.receivedContainer) {
      this.receivedContainer = document.querySelector(
        "#received-recommendations"
      );
    }
    return this.receivedContainer;
  }

  renderNoRecommendations() {
    this.receivedContainer = this.getContainer();
    if (!this.receivedContainer) return;

    if (!this.receivedContainer.querySelector(".no-recommendations-message")) {
      this.receivedContainer.innerHTML = `
        <div class="no-recommendations-message">
          <p>No recommendations received yet!</p>
          <p>Ask your friends to send you some music recommendations.</p>
        </div>
      `;
    }
  }

  renderLoading() {
    this.receivedContainer = this.getContainer();
    if (!this.receivedContainer) return;

    this.receivedContainer.innerHTML = `
      <div class="loading-message">
        <p>Loading Received recommendations...</p>
      </div>
    `;
  }

  renderError() {
    this.receivedContainer = this.getContainer();
    if (!this.receivedContainer) return;

    this.receivedContainer.innerHTML = `
      <div class="error-message">
        <p>Error loading received recommendations. Please try again later.</p>
      </div>
    `;
  }

  updateReplyInCache(recommendationId, replyText) {
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
        userRecs[recIndex].reply = replyText;

        // Update hash for change detection
        this.lastRecHash = this.generateRecHash(this.cachedRecommendations);

        console.log(
          `Updated reply for recommendation ${recommendationId} in cache`
        );
        return true;
      }
    }
    return false;
  }

  removeReplyButton(recommendationId) {
    const songItem = this.receivedContainer?.querySelector(
      `[data-rec-id="${recommendationId}"]`
    );
    if (songItem) {
      const commentActions = songItem.querySelector(".comment-actions");
      if (commentActions) {
        commentActions.remove();
      }
    }
  }

  setupReplyActions() {
    this.receivedContainer = this.getContainer();
    if (!this.receivedContainer) return;
    this.receivedContainer.querySelectorAll(".reply-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const friendName = btn.dataset.friendName;
        const recId = btn.dataset.recId;
        showCommentPopup({
          type: "reply",
          friendName: friendName,
          recommendationId: recId,
          onSuccess: (replyText) => {
            console.log("Reply sent:", replyText);
            // Update cache immediately
            this.updateReplyInCache(recId, replyText);

            // Remove reply button from UI
            this.removeReplyButton(recId);
          },
        });
      });
    });
  }

  onModalOpen() {
    this.isModalOpen = true;
    // Clear any stale container reference
    this.receivedContainer = null;

    // Load expanded states when modal opens
    this.loadExpandedStates();

    setTimeout(() => {
      this.loadReceivedRecs();
    }, 100);
  }

  onModalClose() {
    this.isModalOpen = false;
    this.receivedContainer = null;
    // Save expanded states when modal closes
    this.saveExpandedStates();
    console.log("ReceivedRecsManager modal closed");
  }

  setupLikeDislikeListener() {
    // Listen for like/dislike updates from setupRecommendationActions
    document.addEventListener("recommendationLikeUpdated", (event) => {
      const { recommendationId, songId, action, likeDislike } = event.detail;

      // Update the cached recommendation
      this.updateRecommendationInCache(recommendationId, {
        like_dislike: likeDislike,
      });

      console.log(
        `Cache updated for recommendation ${recommendationId}: ${action}`
      );
    });
  }

  updateRecommendationInCache(recommendationId, updates) {
    // Find and update the recommendation in cache
    for (const [userId, userRecs] of Object.entries(
      this.cachedRecommendations
    )) {
      const recIndex = userRecs.findIndex(
        (rec) =>
          rec.recommendation_id.toString() === recommendationId.toString()
      );
      if (recIndex !== -1) {
        // Update the recommendation with new data
        Object.assign(userRecs[recIndex], updates);

        // Update hash for change detection
        this.lastRecHash = this.generateRecHash(this.cachedRecommendations);

        console.log(
          `Updated recommendation ${recommendationId} in cache for user ${userId}`
        );
        break;
      }
    }
  }

  updateCommentInCache(recommendationId, commentText) {
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

  addOrUpdateCommentInUI(recommendationId, commentText) {
    const songItem = this.receivedContainer?.querySelector(
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
        commentTextElement.textContent = commentText;
      }
    } else {
      // Create new comment section
      const commentHtml = `
      <div class="song-comment-section">
        <div class="comment-bubble">
          <span class="comment-text">${commentText}</span>
        </div>
      </div>
    `;

      // Insert after the song-info-actions-row
      songInfoActionsRow.insertAdjacentHTML("afterend", commentHtml);
    }
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
}

window.receivedRecsManager = new ReceivedRecsManager();
