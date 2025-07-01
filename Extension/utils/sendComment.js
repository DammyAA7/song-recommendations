/**
 * Sends a comment for a recommendation to the backend API
 * @param {string} recommendationId - The recommendation ID
 * @param {string} comment - The comment text
 * @returns {Promise<object>} - JSON response from the backend
 */
async function sendComment(recommendationId, comment) {
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
          comment: comment,
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to send comment");
    }

    return await response.json();
  } catch (error) {
    console.error("Error sending comment:", error);
    throw error;
  }
}

window.sendComment = sendComment;