// Handle Spotify's dynamic loading
function observeChanges() {
  const observer = new MutationObserver(() => {
    if (!document.getElementById("custom-spotify-button")) {
      addRecommendButton();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

window.observeChanges = observeChanges;