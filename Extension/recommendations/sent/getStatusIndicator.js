/**
 * Returns an HTML snippet based on the like/dislike state.
 *
 * @param {boolean|null} likeDislike
 *   – `true`   ⇒ show “Liked” indicator
 *   – `false`  ⇒ show “Disliked” indicator
 *   – otherwise ⇒ show “Pending” indicator
 * @returns {string} HTML string for the status indicator
 */

function getStatusIndicator(likeDislike) {
  if (likeDislike === true) {
    return `
            <div class="status-indicator liked">
                <span class="status-text">Liked</span>
            </div>
        `;
  } else if (likeDislike === false) {
    return `
            <div class="status-indicator disliked">
                <span class="status-text">Disliked</span>
            </div>
        `;
  } else {
    return `
            <div class="status-indicator pending">
                <span class="status-text">Pending</span>
            </div>
        `;
  }
}

window.getStatusIndicator = getStatusIndicator;