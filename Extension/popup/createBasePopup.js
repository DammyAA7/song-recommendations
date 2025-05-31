function createBasePopup() {
  const popup = document.createElement("div");
  popup.id = "spotify-recommend-popup";
  popup.className = "spotify-popup";

  popup.innerHTML = `
    <div class="popup-overlay"></div>
    <div class="popup-container">
      <div class="popup-header-controls">
        <button id="close-popup" class="close-btn">×</button>
      </div>
      <div class="popup-content"></div>
    </div>
  `;

  // Add close handler
  const closeBtn = popup.querySelector("#close-popup");
  const overlay = popup.querySelector(".popup-overlay");

  [closeBtn, overlay].forEach((el) => {
    el.addEventListener("click", () => closePopup());
  });

  return popup;
}

window.createBasePopup = createBasePopup;