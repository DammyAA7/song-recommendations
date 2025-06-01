/**
 * 
 * @param {*} requestId 
 */
function declineFriendRequest(requestId) {
  console.log("Declining friend request:", requestId);

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

  // Here you would make an API call to decline the friend request
  // Example:
  // fetch('/decline_friend_request', {
  //   method: 'POST',
  //   body: JSON.stringify({ requestId }),
  //   headers: { 'Content-Type': 'application/json' }
  // });

  showMessage("Friend request declined");
}

window.declineFriendRequest = declineFriendRequest;