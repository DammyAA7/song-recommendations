/**
 * 
 * @param {*} requestId 
 */

function acceptFriendRequest(requestId) {
  console.log("Accepting friend request:", requestId);

  // Remove the request from the UI
  const requestElement = document.querySelector(
    `[data-request-id="${requestId}"]`
  );
  if (requestElement) {
    requestElement.style.animation = "slideOut 0.3s ease-out forwards";
    setTimeout(() => {
      requestElement.remove();
      updateRequestsBadge();
    }, 300);
  }

  // Here you would make an API call to accept the friend request
  // Example:
  // fetch('/accept_friend_request', {
  //   method: 'POST',
  //   body: JSON.stringify({ requestId }),
  //   headers: { 'Content-Type': 'application/json' }
  // });

  showMessage("Friend request accepted!", "success");
}

window.acceptFriendRequest = acceptFriendRequest;