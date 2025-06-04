async function handleAuthFlow() {
  const authBtn = document.querySelector("#authorize-btn");
  if (!authBtn) return;

  authBtn.innerHTML = "Connecting...";
  authBtn.disabled = true;

  try {
    // First, let's check if we have any existing session
    console.log("Checking existing session...");

    const response = await fetch(
      "https://recspot-e6585868d70b.herokuapp.com/login",
      {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    if (response.ok) {
      const data = await response.json();
      console.log("Login response:", data);

      if (data.auth_url) {
        // Open popup for authorization
        const authWindow = window.open(
          data.auth_url,
          "spotify-auth",
          "width=500,height=600,resizable=yes,scrollbars=yes"
        );

        // Handle the auth flow
        await handleAuthWindow(authWindow);

        // After successful auth, close current popup and show friends
        console.log("Auth completed successfully, showing friends popup");
        closePopup();
        setTimeout(() => showPopupFriends(), 300);
      } else {
        throw new Error("No auth URL received");
      }
    } else {
      const errorData = await response.json();
      console.error("Login API error:", errorData);
      throw new Error(`Login failed: ${errorData.error || "Unknown error"}`);
    }
  } catch (error) {
    console.error("Auth flow error:", error);
    authBtn.innerHTML = "Try Again";
    authBtn.disabled = false;

    const errorMessage = error.message.includes("Authentication failed") 
      ? "Authorization failed. Please try again." 
      : error.message;

    // Show error to user
    console.error("Error during auth flow:", error.message);
    showMessage(errorMessage, "error");
  }
}
window.handleAuthFlow = handleAuthFlow;