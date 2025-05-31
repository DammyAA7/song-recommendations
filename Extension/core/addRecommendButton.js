// This script adds a "Recommend" button to the Spotify web player
// that allows users to recommend the currently playing track to a friend via a popup.
function addRecommendButton() {
  // Check if button already exists
  if (document.getElementById("custom-spotify-button")) {
    return;
  }

  // Create the button
  const button = document.createElement("button");
  button.id = "custom-spotify-button";
  button.innerHTML = "Recommend";
  button.className = "custom-spotify-btn";
  button.title = "Recommend this track";

  // Add click handler
  button.addEventListener("click", async () => {
    await handleRecommendClick();
  });

  // Find the search bar container and add button next to it
  const searchContainer = document.querySelector("._b3hhmbWtOY8_1M1mM1H");
  if (searchContainer && searchContainer.parentNode) {
    // Create a wrapper div to hold the button
    const buttonWrapper = document.createElement("div");
    buttonWrapper.className = "custom-button-wrapper";
    buttonWrapper.appendChild(button);

    // Insert the button after the search container
    searchContainer.parentNode.insertBefore(
      buttonWrapper,
      searchContainer.nextSibling
    );
  } else {
    // Fallback: try to find the top bar area
    const topBar = document.querySelector(".gj5VcIUC9oD2p4BsxzGE");
    if (topBar) {
      const buttonWrapper = document.createElement("div");
      buttonWrapper.className = "custom-button-wrapper";
      buttonWrapper.appendChild(button);
      topBar.appendChild(buttonWrapper);
    }
  }
}

window.addRecommendButton = addRecommendButton;