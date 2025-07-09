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
        console.log("Payload received:", payload);
        if (rec) {
          this.updateUIandCache(rec);
        }
      }
    );
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
    } sent`;

    // Create new song HTML
    const songHtml = this.createSongItemHtml(newRec);

    // Find the songs list and add the new song
    const songsList = personContainer.querySelector(".songs-list");
    songsList.insertAdjacentHTML("afterbegin", songHtml);

    // Setup event listeners for the new song item
    const newSongItem = songsList.firstElementChild;
    this.setupSongItemListeners(newSongItem);

    const container = this.getContainer();
    if (container && existingPerson !== container.firstElementChild) {
      container.insertBefore(existingPerson, container.firstElementChild);
    }
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
                </div>
                <div class="song-actions">
                    <div class="song-status">
                      ${getStatusIndicator(rec.like_dislike)}
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

    this.sentContainer.innerHTML = html;
    this.setupExpandCollapseActions();
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
