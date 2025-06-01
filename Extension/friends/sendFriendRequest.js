// Function to add a friend
async function sendFriendRequest(friendInput) {
  const addBtn = document.querySelector("#add-friend-btn");
  const input = document.querySelector("#friend-input");

  const username = extractSpotifyUsername(friendInput);

  if (!username) {
    showMessage("Please enter a valid Spotify username or profile URL");
    return;
  }

  // Disable button and show loading state
  addBtn.disabled = true;
  addBtn.textContent = "Sending Request...";

  try {
    const response = await fetch(
      "https://recspot-e6585868d70b.herokuapp.com/send_friend_request",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          friend_id: username,
        }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      // Success - clear input and reload friends list
      input.value = "";
      await loadFriends();
      showMessage("Friend Request Sent!", "success");
    } else {
      // Handle specific error cases
      let errorMessage = "";
      switch (data.error) {
        case "friend_request_already_sent":
            errorMessage = "You have already sent a friend request to this user";
            break;
        case "friend_not_found":
            errorMessage = "User not found. Please check the username or profile URL. This user may not be registered on RecSpot.";
            break;
        case "friend_already_exists":
          errorMessage = "This user is already your friend";
          break;
        case "cannot_add_yourself":
          errorMessage = "You cannot send a request to yourself";
          break;
        case "friend_id_required":
          errorMessage = "Please enter a valid username";
          break;
        default:
          if (data.details) {
            errorMessage = `Error: ${
              data.details.error?.message || data.error
            }`;
          }
      }
      showMessage(errorMessage);
    }
  } catch (error) {
    console.error("Error adding friend:", error);
    showMessage("Network error. Please check your connection and try again.");
  } finally {
    // Re-enable button
    addBtn.disabled = false;
    addBtn.textContent = "Send Request";
  }
}
