async function showPopupFriends() {
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
              <button id="add-friend-btn" class="spotify-btn-primary">Send Request</button>
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
          <path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V8c0-.55-.45-1-1-1s-1 .45-1 1v2H2c-.55 0-1 .45-1 1s.45 1 1 1h2v2c0 .55.45 1 1 1s1-.45 1-1v-2h2c.55 0 1-.45 1-1s-.45-1-1-1H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
        </svg>
        <span class="floating-badge friend-requests-badge" id="floating-requests-badge"></span>
      </button>
      
      <div class="popup-footer">
        <button id="debug-friends-btn" class="spotify-btn-secondary">Debug Session</button>
        <button id="logout-btn" class="spotify-btn-secondary">Logout</button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  await new Promise(resolve => setTimeout(resolve, 50));

  // Load friends when the popup opens
  if (window.friendsManager) {
    window.friendsManager.onModalOpen();
  }

  // Initialize friend request manager
  if (window.friendRequestManager && !window.friendRequestManager.initialized) {
    console.log("Initializing friend request manager...");
    try {
      await window.friendRequestManager.initialize();
    } catch (error) {
      console.error("Failed to initialize friend request manager:", error);
    }
  }
  const floatingRequestsBtn = content.querySelector("#floating-requests-btn");
  floatingRequestsBtn.addEventListener("click", toggleRequestsModal);

  if (window.friendRequestManager) {
    window.friendRequestManager.updateRequestsBadge();
  }

  // Add friend button event listener
  const addFriendBtn = content.querySelector("#add-friend-btn");
  const friendInput = content.querySelector("#friend-input");

  addFriendBtn.addEventListener("click", () => {
    const friendInputValue = friendInput.value.trim();
    if (friendInputValue) {
      sendFriendRequest(friendInputValue);
    } else {
      showMessage("Please enter a Spotify username or profile URL", "error");
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

  const handlePopupClose = () => {
    if (window.friendsManager) {
      window.friendsManager.onModalClose();
    }
  };

  // Add close button event listener if it exists
  const closeBtn = popup.querySelector(".close-btn, .popup-close");
  if (closeBtn) {
    console.log("Close button found, adding event listener");
    closeBtn.addEventListener("click", handlePopupClose);
  }

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
}

window.showPopupFriends = showPopupFriends;