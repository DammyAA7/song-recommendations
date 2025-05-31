/**
 * Sends a recommendation for a song to a friend via the backend API.
 *
 * @param {string} friendId – The Spotify user ID of the friend to recommend to.
 * @param {string} songId   – The Spotify song ID to recommend.
 * @returns {Promise<object>} – JSON response from the backend confirming the recommendation.
 */

async function recommendSongToFriend(friendId, songId) {
  try {
    const response = await fetch(
      "https://recspot-e6585868d70b.herokuapp.com/recommend",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          friend_id: friendId,
          song_id: songId,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to recommend song");
    }

    return await response.json();
  } catch (error) {
    console.error("Error recommending song:", error);
    throw error;
  }
}

window.recommendSongToFriend = recommendSongToFriend;
// Export the function for use in other modules
