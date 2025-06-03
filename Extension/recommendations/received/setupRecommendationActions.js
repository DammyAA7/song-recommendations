 // Function to handle like/dislike actions
  function setupRecommendationActions() {
    const songItems = document.querySelectorAll("#received-tab .song-item");

    songItems.forEach((songItem) => {
      const songId = songItem.dataset.songId;
      const recId = songItem.dataset.recId;
      const likeBtn = songItem.querySelector(".like-btn");
      const dislikeBtn = songItem.querySelector(".dislike-btn");
      const playBtn = songItem.querySelector(".play-btn");

      // Store original state for error recovery
      function getButtonState(btn) {
        return btn.classList.contains("active");
      }

      // Update UI optimistically (immediately)
      function updateUIOptimistically(action, targetBtn, otherBtn) {
        if (action === "like") {
          targetBtn.classList.add("active");
          otherBtn.classList.remove("active");
        } else if (action === "dislike") {
          targetBtn.classList.add("active");
          otherBtn.classList.remove("active");
        } else if (action === "null") {
          targetBtn.classList.remove("active");
        }
      }

      // Revert UI to previous state on error
      function revertUI(
        originalTargetState,
        originalOtherState,
        targetBtn,
        otherBtn
      ) {
        if (originalTargetState) {
          targetBtn.classList.add("active");
        } else {
          targetBtn.classList.remove("active");
        }

        if (originalOtherState) {
          otherBtn.classList.add("active");
        } else {
          otherBtn.classList.remove("active");
        }
      }

      async function handleLikeDislike(action, targetBtn, otherBtn) {
        // 1. Store original state before making changes
        const originalTargetState = getButtonState(targetBtn);
        const originalOtherState = getButtonState(otherBtn);

        // 2. Update UI immediately (optimistic update)
        updateUIOptimistically(action, targetBtn, otherBtn);

        // 3. Send request to server in background
        try {
          const response = await fetch(
            "https://recspot-e6585868d70b.herokuapp.com/like_recommendation",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
                recommendation_id: recId,
                song_id: songId,
                action: action,
              }),
            }
          );

          // 4. Handle server response
          if (!response.ok) {
            // Server error - revert UI to original state
            revertUI(
              originalTargetState,
              originalOtherState,
              targetBtn,
              otherBtn
            );

            // Show error message to user
            showMessage("Failed to update. Please try again.", "error");

            console.error(
              "Server error:",
              response.status,
              response.statusText
            );
          }
          // If response.ok, keep the optimistic UI changes
        } catch (error) {
          // Network error - revert UI to original state
          revertUI(
            originalTargetState,
            originalOtherState,
            targetBtn,
            otherBtn
          );

          // Show error message to user
          showMessage("Network error. Please check your connection.", "error");

          console.error("Network error:", error);
        }
      }

      // Like button handler
      likeBtn.addEventListener("click", async (e) => {
        e.stopPropagation();

        const isActive = likeBtn.classList.contains("active");
        const action = isActive ? "null" : "like";

        handleLikeDislike(action, likeBtn, dislikeBtn);
      });

      // Dislike button handler
      dislikeBtn.addEventListener("click", async (e) => {
        e.stopPropagation();

        const isActive = dislikeBtn.classList.contains("active");
        const action = isActive ? "null" : "dislike";

        handleLikeDislike(action, dislikeBtn, likeBtn);
      });

      // Play button handler (placeholder - doesn't do anything as requested)
      playBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        // Button doesn't do anything as requested
        console.log("Play button clicked for song:", songId);
        try {
          const response = await fetch(
            "https://recspot-e6585868d70b.herokuapp.com/play_song",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
                song_id: songId,
              }),
            }
          );
          if (response.ok) {
            const data = await response.json();
            console.log("Song played successfully:", data);
          } else {
            console.error("Failed to play song:", response.statusText);
          }
        } catch (error) {
          console.error("Error playing song:", error);
        }
      });
    });
  }

  window.setupRecommendationActions = setupRecommendationActions;