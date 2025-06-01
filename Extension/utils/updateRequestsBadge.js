function updateRequestsBadge() {
  // Update both floating button badge and modal list
  const floatingBadge = document.querySelector("#floating-requests-badge");
  const modalRequestsList = document.querySelector(
    "#modal-friend-requests-list"
  );

  let remainingRequests = 0;

  if (modalRequestsList) {
    remainingRequests = modalRequestsList.querySelectorAll(
      ".friend-request-item"
    ).length;

    if (remainingRequests === 0) {
      modalRequestsList.innerHTML =
        '<div class="no-requests">No friend requests</div>';
    }
  } else {
    // If modal isn't open, count from dummy data
    remainingRequests = 3; // This would come from your actual data source
  }

  if (floatingBadge) {
    if (remainingRequests === 0) {
      floatingBadge.style.display = "none";
    } else {
      floatingBadge.style.display = "block";
      floatingBadge.textContent = remainingRequests;
    }
  }
}

window.updateRequestsBadge = updateRequestsBadge;