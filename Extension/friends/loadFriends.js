// Function to load friends from API
async function loadFriends() {
  const friendsList = document.querySelector("#friends-list");

  try {
    const response = await fetch(
      "https://recspot-e6585868d70b.herokuapp.com/list_friends",
      {
        credentials: "include",
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const friends = await response.json();

    if (friends.length === 0) {
      friendsList.innerHTML = `
                <div class="no-friends-message">
                    <p>No friends yet! Add some friends to start sharing music recommendations.</p>
                </div>
            `;
    } else {
      const noAvatar =
        "https://media.istockphoto.com/id/945691510/vector/people-icon-silhouettes-illustration-vector.jpg?s=612x612&w=0&k=20&c=chZcclmonc5T002ErDfMZ6KYz01tfHnd-Hzk4EfMJ6k=";
      friendsList.innerHTML = friends
        .map(
          (friend) => `
                <div class="friend-item" data-friend="${
                  friend.spotify_user_id
                }" data-displayname="${friend.display_name}">
                    <div class="friend-avatar">
                        <img src="${friend.avatar_url || noAvatar}" alt="${
            friend.display_name || friend.spotify_user_id
          }">
                    </div>
                    <div class="friend-info">
                        <span class="friend-name">${
                          friend.display_name || friend.spotify_user_id
                        }</span>
                    </div>
                    <button class="recommend-btn">Send</button>
                </div>
            `
        )
        .join("");

      // Add click handlers for recommend buttons
      const recommendBtns = friendsList.querySelectorAll(".recommend-btn");
      recommendBtns.forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          const friendItem = e.target.closest(".friend-item");
          const friendId = friendItem.dataset.friend;
          const friendName = friendItem.dataset.displayname;

          // Disable button and show loading state
          btn.innerHTML = "Sending...";
          btn.disabled = true;
          btn.style.background = "#535353";

          try {
            // Get currently playing song
            const currentSong = await getCurrentlyPlayingSong();

            if (!currentSong) {
              showMessage(
                "No song is currently playing or song information could not be detected. Try reloading the page and try again.", "error"
              );
              return;
            }

            // Get song ID from API
            const songData = await getSongId(
              currentSong.albumId,
              currentSong.title
            );

            // Recommend song to friend
            message = await recommendSongToFriend(friendId, songData.song_id);
            // Show success state
            btn.innerHTML = "Sent";
            btn.style.background = "#1db954";

            showMessage(
              `Recommended ${currentSong.title} to ${friendName}!`,
              "success"
            );
          } catch (error) {
            console.error("Error sending recommendation:", error);
            let errorMessage;
            if (
              error.message.includes("album_id_required") ||
              error.message.includes("track_name_required")
            ) {
              errorMessage = "Could not detect the currently playing song.";
            } else if (error.message.includes("track_not_found_in_album")) {
              errorMessage = "Song not found in the album.";
            } else if (
              error.message.includes("Song has already been recommended")
            ) {
              errorMessage =
                "You have already recommended this song to this friend.";
            } else {
              errorMessage = message;
            }
            showMessage(errorMessage, "error");

            btn.innerHTML = "Send";
            btn.style.background = "#1db954";
          } finally {
            // Re-enable button after delay
            setTimeout(() => {
              btn.innerHTML = "Send";
              btn.disabled = false;
              btn.style.background = "#1db954";
            }, 2000);
          }
        });
      });
    }
  } catch (error) {
    console.error("Error loading friends:", error);
    friendsList.innerHTML = `
            <div class="error-message">
                <p>Error loading friends. Please try again later.</p>
            </div>
        `;
  }
}
window.loadFriends = loadFriends;
