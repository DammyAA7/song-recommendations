/**
 * Sends a reply for a recommendation to the backend API
 * @param {string} recommendationId - The recommendation ID
 * @param {string} rec_receiver - The reply text
 * @returns {Promise<object>} - JSON response from the backend
 */
async function sendReceiverComment(recommendationId, rec_receiver) {
  try {
    const response = await fetch(
      "https://recspot-e6585868d70b.herokuapp.com/send_rec_receiver_comment",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          recommendation_id: recommendationId,
          rec_receiver: rec_receiver,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to send reply");
    }

    return await response.json();
  } catch (error) {
    console.error("Error sending reply:", error);
    throw error;
  }
}

window.sendReceiverComment = sendReceiverComment;