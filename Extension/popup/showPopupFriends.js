function showPopupFriends() {
  const popup = createBasePopup();
  const content = popup.querySelector(".popup-content");

  content.innerHTML = `
    <div class="friends-container">
      <div class="popup-scrollable-content">
        <div class="popup-header">
          <div class="tab-navigation">
            <button class="tab-btn active" data-tab="friends">Friends</button>
            <button class="tab-btn" data-tab="sent">Sent</button>
            <button class="tab-btn" data-tab="received">Received</button>
          </div>
        </div>

        <div class="tab-content" id="friends-tab">
          <div class="add-friend-section">
            <div class="add-friend-form">
              <input type="text" id="friend-input" placeholder="Enter Spotify username URL" class="friend-input">
              <button id="add-friend-btn" class="spotify-btn-primary">Add Friend</button>
            </div>
          </div>
          <div class="friends-list" id="friends-list">
            <div class="loading-message">Loading friends...</div>
          </div>
        </div>

        <div class="tab-content hidden" id="sent-tab">
          <div class="recommendations-list" id="sent-recommendations">
             <div class="loading-message">Loading sent recommendations...</div>
          </div>
        </div>

        <div class="tab-content hidden" id="received-tab">
          <div class="recommendations-list" id="received-recommendations">
            <div class="loading-message">Loading received recommendations...</div>
          </div>
        </div>
      </div>

     <button class="floating-requests-btn" id="floating-requests-btn">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H11V21H5V3H13V9H21ZM16 11.5C17.38 11.5 18.5 12.62 18.5 14S17.38 16.5 16 16.5 13.5 15.38 13.5 14 14.62 11.5 16 11.5ZM20 19.5V18.5C20 17.12 17.76 16.5 16 16.5S12 17.12 12 18.5V19.5H20Z"/>
        </svg>
        <span class="floating-badge" id="floating-requests-badge">3</span>
      </button>
      
      <div class="popup-footer">
        <button id="debug-friends-btn" class="spotify-btn-secondary">Debug Session</button>
        <button id="logout-btn" class="spotify-btn-secondary">Logout</button>
      </div>
    </div>
  `;

  // Load friends when the popup opens
  loadFriends();

  const floatingRequestsBtn = content.querySelector("#floating-requests-btn");
  floatingRequestsBtn.addEventListener("click", toggleRequestsModal);

  if (typeof updateRequestsBadge === 'function') {
    updateRequestsBadge();
  }

  // Add friend button event listener
  const addFriendBtn = content.querySelector("#add-friend-btn");
  const friendInput = content.querySelector("#friend-input");

  addFriendBtn.addEventListener("click", () => {
    const friendInputValue = friendInput.value.trim();
    if (friendInputValue) {
      sendFriendRequest(friendInputValue);
    } else {
      showMessage("Please enter a Spotify username or profile URL");
    }
  });

  // Allow adding friend with Enter key
  friendInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      const friendInputValue = friendInput.value.trim();
      if (friendInputValue) {
        sendFriendRequest(friendInputValue);
      }
    }
  });

  // Tab switching functionality
  const tabBtns = content.querySelectorAll(".tab-btn");
  const tabContents = content.querySelectorAll(".tab-content");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      cleanupSentRecommendations();
      cleanupReceivedRecommendations();
      // Remove active class from all tabs
      tabBtns.forEach((b) => b.classList.remove("active"));
      tabContents.forEach((c) => c.classList.add("hidden"));

      // Add active class to clicked tab
      btn.classList.add("active");
      const targetTab = content.querySelector(`#${btn.dataset.tab}-tab`);
      if (targetTab) {
        targetTab.classList.remove("hidden");

        // Load recommendations when received tab is clicked
        if (btn.dataset.tab === "received") {
          initializeReceivedRecommendations();
        }
        // Load sent recommendations when sent tab is clicked
        else if (btn.dataset.tab === "sent") {
          initializeSentRecommendations();
        }
      }
    });
  });

  // Expand/collapse functionality for sent and received lists
  content.addEventListener("click", (e) => {
    if (e.target.classList.contains("expand-btn")) {
      const personItem = e.target.closest(".recommendation-person");
      const songsList = personItem.querySelector(".songs-list");

      if (songsList.classList.contains("hidden")) {
        songsList.classList.remove("hidden");
        e.target.textContent = "▲";
      } else {
        songsList.classList.add("hidden");
        e.target.textContent = "▼";
      }
    }
  });

  // Add debug button handler
  const debugBtn = content.querySelector("#debug-friends-btn");
  debugBtn.addEventListener("click", async () => {
    try {
      const response = await fetch(
        "https://recspot-e6585868d70b.herokuapp.com/debug_session",
        {
          credentials: "include",
        }
      );
      const data = await response.json();
      console.log("Friends Debug Session:", data);
      alert(`Friends Debug Session:\n${JSON.stringify(data, null, 2)}`);
    } catch (error) {
      console.error("Friends Debug error:", error);
      alert("Debug Error: " + error.message);
    }
  });

  // Add logout handler
  const logoutBtn = content.querySelector("#logout-btn");
  logoutBtn.addEventListener("click", async () => {
    try {
      await fetch("https://recspot-e6585868d70b.herokuapp.com/logout", {
        method: "GET",
        credentials: "include",
      });
      closePopup();
    } catch (error) {
      console.error("Logout error:", error);
    }
  });

  document.body.appendChild(popup);  
 
}