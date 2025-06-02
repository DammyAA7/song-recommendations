// background.js - Handle real-time subscriptions
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

class BackgroundRealtimeManager {
  constructor() {
    this.supabase = null;
    this.activeSubscriptions = new Map();
    this.userConnections = new Map(); // Track which tabs are connected for each user
    this.initializeSupabase();
  }

  async initializeSupabase() {
    try {
      // You'll need to store these in Chrome storage or environment
      const supabaseUrl = 'https://gooepfzjehynozjqzuxl.supabase.co';
      const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdvb2VwZnpqZWh5bm96anF6dXhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0NjE4NjYsImV4cCI6MjA2NDAzNzg2Nn0.0sgu_2i1VJTueHOJTq-mUpQwu8fi55T6GO2hEOHCLKA';
      
      this.supabase = createClient(supabaseUrl, supabaseAnonKey);
      console.log('Supabase client initialized in background');
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
    }
  }

  async subscribeToFriendRequests(userId, tabId) {
    if (!userId || !this.supabase) {
      console.error('Cannot subscribe: missing userId or Supabase client');
      return;
    }

    // Track this tab connection
    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId).add(tabId);

    // If already subscribed for this user, don't create duplicate subscription
    if (this.activeSubscriptions.has(userId)) {
      console.log(`Already subscribed to friend requests for user ${userId}`);
      return;
    }

    try {
      const subscription = this.supabase
        .channel(`friend_requests_${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'requests',
            filter: `receiver_id=eq.${userId}`
          },
          (payload) => this.handleFriendRequestChange(payload, userId)
        )
        .subscribe();

      this.activeSubscriptions.set(userId, subscription);
      console.log(`Subscribed to friend requests for user ${userId}`);
      
      // Notify the tab that subscription is active
      chrome.tabs.sendMessage(tabId, {
        type: 'REALTIME_SUBSCRIBED',
        userId: userId
      });

    } catch (error) {
      console.error('Error setting up friend request subscription:', error);
      
      // Notify the tab of the error
      chrome.tabs.sendMessage(tabId, {
        type: 'REALTIME_ERROR',
        error: error.message
      });
    }
  }

  async unsubscribeFromFriendRequests(userId, tabId) {
    if (!userId) return;

    // Remove this tab from user connections
    if (this.userConnections.has(userId)) {
      this.userConnections.get(userId).delete(tabId);
      
      // If no more tabs are connected for this user, unsubscribe
      if (this.userConnections.get(userId).size === 0) {
        this.userConnections.delete(userId);
        
        if (this.activeSubscriptions.has(userId)) {
          const subscription = this.activeSubscriptions.get(userId);
          await this.supabase.removeChannel(subscription);
          this.activeSubscriptions.delete(userId);
          console.log(`Unsubscribed from friend requests for user ${userId}`);
        }
      }
    }
  }

  handleFriendRequestChange(payload, userId) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    console.log(`Friend request change for user ${userId}:`, eventType, newRecord || oldRecord);

    // Get all tabs connected for this user
    const userTabs = this.userConnections.get(userId);
    if (!userTabs || userTabs.size === 0) {
      console.log(`No active tabs for user ${userId}`);
      return;
    }

    // Send update to all tabs for this user
    userTabs.forEach(tabId => {
      chrome.tabs.sendMessage(tabId, {
        type: 'FRIEND_REQUEST_UPDATE',
        payload: {
          eventType,
          new: newRecord,
          old: oldRecord,
          userId
        }
      }).catch(error => {
        console.error(`Failed to send message to tab ${tabId}:`, error);
        // Clean up dead tab connections
        this.userConnections.get(userId).delete(tabId);
      });
    });
  }

  // Clean up when tabs are closed
  handleTabRemoved(tabId) {
    // Find and remove this tab from all user connections
    this.userConnections.forEach((tabs, userId) => {
      if (tabs.has(tabId)) {
        this.unsubscribeFromFriendRequests(userId, tabId);
      }
    });
  }

  // Clean up all subscriptions
  async cleanup() {
    for (const [userId, subscription] of this.activeSubscriptions) {
      try {
        await this.supabase.removeChannel(subscription);
      } catch (error) {
        console.error(`Error removing subscription for user ${userId}:`, error);
      }
    }
    this.activeSubscriptions.clear();
    this.userConnections.clear();
  }
}

// Initialize the manager
const realtimeManager = new BackgroundRealtimeManager();

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  
  switch (message.type) {
    case 'SUBSCRIBE_FRIEND_REQUESTS':
      realtimeManager.subscribeToFriendRequests(message.userId, tabId);
      sendResponse({ success: true });
      break;
      
    case 'UNSUBSCRIBE_FRIEND_REQUESTS':
      realtimeManager.unsubscribeFromFriendRequests(message.userId, tabId);
      sendResponse({ success: true });
      break;
      
    case 'PING':
      sendResponse({ success: true, message: 'Background script is alive' });
      break;
      
    default:
      console.log ('Unknown message type:', message.type);
  }
  
  return true; // Keep message channel open for async response
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  realtimeManager.handleTabRemoved(tabId);
});

// Clean up when extension is disabled/updated
chrome.runtime.onSuspend.addListener(() => {
  realtimeManager.cleanup();
});

console.log('Background script loaded with real-time manager');