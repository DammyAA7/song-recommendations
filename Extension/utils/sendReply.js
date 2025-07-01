/**
 * Sends a reply for a recommendation to the backend API
 * @param {string} recommendationId - The recommendation ID
 * @param {string} reply - The reply text
 * @returns {Promise<object>} - JSON response from the backend
 */
async function sendReply(recommendationId, reply) {
  try {
    const response = await fetch(
      "https://recspot-e6585868d70b.herokuapp.com/send_comment",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          recommendation_id: recommendationId,
          reply: reply,
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

window.sendReply = sendReply;