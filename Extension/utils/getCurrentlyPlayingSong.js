async function getCurrentlyPlayingSong() {
    // Try to find the album link element that contains both song name and album ID
    const albumLinkElement = document.querySelector(
      '[data-testid="context-item-link"]'
    );

    let songTitle = null;
    let albumId = null;

    if (albumLinkElement) {
      // Extract song title from the link text
      songTitle = albumLinkElement.textContent.trim();

      // Extract album ID from href attribute
      const albumUrl = albumLinkElement.href;
      const albumMatch = albumUrl.match(/\/album\/([a-zA-Z0-9]+)/);
      if (albumMatch) {
        albumId = albumMatch[1];
      }
    }

    // Fallback: try to get album ID from current page URL if on album page
    if (!albumId && window.location.href.includes("/album/")) {
      const urlMatch = window.location.href.match(/\/album\/([a-zA-Z0-9]+)/);
      if (urlMatch) {
        albumId = urlMatch[1];
      }
    }

    // Fallback for song title if not found above

    if (songTitle && albumId) {
      return {
        title: songTitle,
        albumId: albumId,
      };
    }

    return null;
  }

  window.getCurrentlyPlayingSong = getCurrentlyPlayingSong;