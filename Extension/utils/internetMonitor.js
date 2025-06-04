// shows connection status
class InternetMonitor {
  constructor() {
    this.isOnline = navigator.onLine;
    this.checkInterval = null;
    this.hasShownOfflineMessage = false;

    this.init();
  }

  init() {
    // Listen to browser's online/offline events
    window.addEventListener("online", () => this.handleOnline());
    window.addEventListener("offline", () => this.handleOffline());

    // Check connectivity every 10 seconds
    this.checkInterval = setInterval(() => {
      this.checkConnectivity();
    }, 10000);

    // Initial check
    this.checkConnectivity();
  }

  async fetchWithConnectivityCheck(url, options = {}, timeout = 10000) {
    // Check connectivity before making request
    if (!window.isOnline || !window.isOnline()) {
      throw new Error("No internet connection");
    }

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("Request timeout - connection may be unstable")),
        timeout
      );
    });

    // Make the actual request
    const fetchPromise = fetch(url, options);

    try {
      // Race between fetch and timeout
      const response = await Promise.race([fetchPromise, timeoutPromise]);

      // Double-check connectivity after request (in case connection was lost during request)
      if (!window.isOnline || !window.isOnline()) {
        throw new Error("Connection lost during request");
      }

      return response;
    } catch (error) {
      // If it's a network error and we're now offline, throw connectivity error
      if (isNetworkError(error) && (!window.isOnline || !window.isOnline())) {
        throw new Error("Internet connection lost or unstable");
      }
      throw error;
    }
  }

  isNetworkError(error) {
    const networkErrorMessages = [
      "fetch",
      "network",
      "connection",
      "timeout",
      "offline",
      "unreachable",
      "failed to fetch",
      "networkerror",
      "ERR_NETWORK",
      "ERR_INTERNET_DISCONNECTED",
    ];

    const errorMessage = error.message.toLowerCase();
    return (
      networkErrorMessages.some((msg) => errorMessage.includes(msg)) ||
      !navigator.onLine ||
      (error.name === "TypeError" && errorMessage.includes("failed to fetch"))
    );
  }

  async checkConnectivity() {
    const wasOnline = this.isOnline;

    try {
      // Simple connectivity test
      await fetch("https://www.google.com/favicon.ico", {
        method: "HEAD",
        mode: "no-cors",
        cache: "no-cache",
      });
      this.isOnline = true;
    } catch {
      this.isOnline = false;
    }

    // Show messages only when status changes
    if (wasOnline && !this.isOnline) {
      this.showOfflineMessage();
    } else if (!wasOnline && this.isOnline) {
      this.showOnlineMessage();
    }
  }

  handleOnline() {
    if (!this.isOnline) {
      this.isOnline = true;
      this.showOnlineMessage();
    }
  }

  handleOffline() {
    if (this.isOnline) {
      this.isOnline = false;
      this.showOfflineMessage();
    }
  }

  showOfflineMessage() {
    if (typeof showMessage === "function" && !this.hasShownOfflineMessage) {
      showMessage("Internet connection lost or unstable", "error");
      this.hasShownOfflineMessage = true;
    }
  }

  showOnlineMessage() {
    if (typeof showMessage === "function" && this.hasShownOfflineMessage) {
      showMessage("Internet connection restored", "success");
      this.hasShownOfflineMessage = false;
    }
  }

  // Public method to check if online
  getStatus() {
    return this.isOnline;
  }
}

// Initialize the monitor
let internetMonitor;

function initInternetMonitor() {
  if (!internetMonitor) {
    internetMonitor = new InternetMonitor();
  }
  return internetMonitor;
}

// Auto-initialize
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initInternetMonitor);
} else {
  initInternetMonitor();
}

// Global access
window.internetMonitor = internetMonitor;
window.isOnline = () =>
  internetMonitor ? internetMonitor.getStatus() : navigator.onLine;
