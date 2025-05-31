function extractSpotifyUsername(input) {
  const trimmedInput = input.trim();

  // Check if it's a Spotify URL
  const spotifyUrlRegex = /https:\/\/open\.spotify\.com\/user\/([^?&/]+)/;
  const match = trimmedInput.match(spotifyUrlRegex);

  if (match) {
    return match[1]; // Return the captured username
  }

  // If not a URL, assume it's already a username
  return trimmedInput;
}

// Example usage:
// const username = extractSpotifyUsername("https://open.spotify.com/user/spotifyusername");
// console.log(username); // Output: spotifyusername

window.extractSpotifyUsername = extractSpotifyUsername;