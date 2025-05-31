/**
 * Fetches the Spotify song ID for a given album and track name.
 *
 * @param {string} albumId
 * @param {string} trackName
 * @returns {Promise<object>} – JSON response from the backend containing song details
 */
async function getSongId(albumId, trackName) {
  try {
    const response = await fetch(
      "https://recspot-e6585868d70b.herokuapp.com/get_song_id",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          album_id: albumId,
          track_name: trackName,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error getting song ID:", error);
    throw error;
  }
}

window.getSongId = getSongId;