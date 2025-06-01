  async function loadSentRecommendationsSmooth() {
    const sentContainer = document.querySelector("#sent-recommendations");

    try {
      const response = await fetch(
        "https://recspot-e6585868d70b.herokuapp.com/sent_recommendations",
        {
          method: "GET",
          credentials: "include",
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const recommendations = await response.json();

      if (recommendations.length === 0) {
        sentContainer.innerHTML = `
                <div class="no-recommendations-message">
                    <p>No recommendations sent yet!</p>
                    <p>Start recommending songs to your friends.</p>
                </div>
            `;
        return;
      }

      // Update only the status indicators instead of rebuilding entire HTML
      recommendations.forEach((rec) => {
        const songItem = sentContainer.querySelector(
          `[data-recommendation-id="${rec.recommendation_id}"]`
        );
        console.log({
          songItem: songItem,
          rec: rec,
        });
        if (songItem) {
          const statusContainer = songItem.querySelector(".song-status");
          const newStatusHTML = getStatusIndicator(rec.like_dislike);
          console.log({
            statusContainer: statusContainer,
            newStatusHTML: newStatusHTML,
          });

          // Only update if status changed
          if (statusContainer && statusContainer.innerHTML !== newStatusHTML) {
            statusContainer.innerHTML = newStatusHTML;

            // Add a subtle animation to indicate change
            statusContainer.style.transition = "all 0.3s ease";
            statusContainer.style.transform = "scale(1.1)";
            setTimeout(() => {
              statusContainer.style.transform = "scale(1)";
            }, 300);
          }
        }
      });

      // If container is empty or structure changed, rebuild completely
      if (!sentContainer.querySelector(".recommendation-person")) {
        await loadSentRecommendations();
      }
    } catch (error) {
      console.error("Error loading sent recommendations:", error);
      // Fallback to full reload on error
      await loadSentRecommendations();
    }
  }

  window.loadSentRecommendationsSmooth = loadSentRecommendationsSmooth;