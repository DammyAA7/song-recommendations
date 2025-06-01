async function handleAuthWindow(authWindow) {
  return new Promise((resolve, reject) => {
    let resolved = false;

    // Set timeout for the entire auth process
    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        if (!authWindow.closed) {
          authWindow.close();
        }
        reject(new Error("Authentication timeout"));
      }
    }, 60000); // 1 minute timeout

    // Check if popup was closed manually
    const authCheckInterval = setInterval(() => {
      try {
        if (authWindow.closed && !resolved) {
          resolved = true;
          clearInterval(authCheckInterval);
          clearTimeout(timeout);

          // Check if auth was successful
          setTimeout(() => {
            checkAuthStatus().then((success) => {
              if (success) {
                resolve();
              } else {
                reject(new Error("Authentication was cancelled or failed"));
              }
            });
          }, 500); // Small delay to allow session to update
        }
      } catch (e) {
        // Ignore cross-origin errors
      }
    }, 1000);

    // Listen for postMessage from callback

    const messageHandler = (event) => {
      if (event.data === "auth_success" && !resolved) {
        resolved = true;
        clearInterval(authCheckInterval);
        clearTimeout(timeout);
        window.removeEventListener("message", messageHandler);

        if (!authWindow.closed) {
          authWindow.close();
        }

        // Small delay to ensure session is updated
        setTimeout(() => {
          resolve();
        }, 500);
      }
    };

    window.addEventListener("message", messageHandler);
  });
}

window.handleAuthWindow = handleAuthWindow;
