// This function closes the Spotify recommendation popup when the user clicks the close button
function closePopup() {
  const popup = document.getElementById("spotify-recommend-popup");
  if (popup) {
    popup.remove();
  }
}

window.closePopup = closePopup;