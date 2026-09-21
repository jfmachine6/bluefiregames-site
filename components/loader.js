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

  function createImageLoader(src, alt, imageClass = "", options = {}) {
    const wrapper = document.createElement("div");
    wrapper.className = "image-loader";

    const spinner = document.createElement("div");
    spinner.className = "loader";

    const image = document.createElement("img");
    image.className = imageClass;
    image.src = src;
    image.alt = alt || "";
    image.loading = options.loading || "lazy";
    image.decoding = "async";
    if (options.fetchPriority) image.fetchPriority = options.fetchPriority;
    if (options.width) image.width = options.width;
    if (options.height) image.height = options.height;
    image.addEventListener("load", () => wrapper.classList.add("loaded"), { once: true });
    image.addEventListener("error", () => wrapper.classList.add("loaded"), { once: true });

    wrapper.appendChild(spinner);
    wrapper.appendChild(image);
    return wrapper;
  }

  // Expose globally
  window.createSectionLoaderController = createSectionLoaderController;
  window.createImageLoader = createImageLoader;
})();
