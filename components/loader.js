// /components/loader.js

(function () {
  /**
   * Creates a controller for a loader + content section pair.
   * @param {string} loaderId - ID of the loader element (e.g. "devlog-loading")
   * @param {string} sectionId - ID of the content section (e.g. "devlog-section")
   */
  function createSectionLoaderController(loaderId, sectionId) {
    const loaderEl = document.getElementById(loaderId);
    const sectionEl = document.getElementById(sectionId);

    if (!loaderEl || !sectionEl) {
      console.warn("Section loader: missing elements", { loaderId, sectionId });
      return {
        show() {},
        hide() {}
      };
    }

    return {
      show() {
        loaderEl.style.display = "flex";
        sectionEl.classList.remove("visible");
      },
      hide() {
        loaderEl.style.display = "none";
        sectionEl.classList.add("visible");
      }
    };
  }

  // Expose globally
  window.createSectionLoaderController = createSectionLoaderController;
})();
