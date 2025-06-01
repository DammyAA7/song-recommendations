async function checkAuthStatus() {
  try {
    console.log("Checking auth status...");
    const response = await fetch(
      "https://recspot-e6585868d70b.herokuapp.com/check_auth",
      {
        method: "GET",
        credentials: "include",
      }
    );

    if (response.ok) {
      const data = await response.json();
      if (data.authenticated) {
        console.log("User is authenticated");
        closePopup();
        setTimeout(() => showPopupFriends(), 300);
        return true;
      } else {
        console.log("User is not authenticated:", data.reason);
      }
    } else {
      console.log("Auth check failed with status:", response.status);
    }
  } catch (error) {
    console.error("Auth check error:", error);
  }
  return false;
}

window.checkAuthStatus = checkAuthStatus;