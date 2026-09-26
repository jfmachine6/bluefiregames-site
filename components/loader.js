// Version: v0.2.4.2.0
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

  function isVideoMedia(src) {
    if (!src) return false;
    const pathname = src.split("?")[0].toLowerCase();
    return [".mp4", ".webm", ".mov", ".m4v", ".ogv"].some(ext => pathname.endsWith(ext));
  }

  function createVideoLoader(src, alt, videoClass = "", options = {}) {
    const wrapper = document.createElement("div");
    wrapper.className = "image-loader video-loader";

    const spinner = document.createElement("div");
    spinner.className = "loader";

    const loadingLabel = document.createElement("span");
    loadingLabel.className = "video-loading-label";
    loadingLabel.textContent = "Loading video...";

    const video = document.createElement("video");
    video.className = videoClass;
    video.src = src;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = options.preload || "metadata";
    video.setAttribute("aria-label", alt || "Video thumbnail");
    if (options.width) video.width = options.width;
    if (options.height) video.height = options.height;

    const revealVideo = () => wrapper.classList.add("loaded");
    video.addEventListener("loadeddata", revealVideo, { once: true });
    video.addEventListener("error", revealVideo, { once: true });

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      }, { rootMargin: "120px 0px", threshold: 0.05 });
      observer.observe(wrapper);
    } else {
      video.play().catch(() => {});
    }

    wrapper.appendChild(spinner);
    wrapper.appendChild(loadingLabel);
    wrapper.appendChild(video);
    return wrapper;
  }

  function createThumbnailMedia(src, alt, mediaClass = "", options = {}) {
    return isVideoMedia(src)
      ? createVideoLoader(src, alt, mediaClass, options)
      : createImageLoader(src || "/assets/BlueFire_Logo_square.png", alt, mediaClass, options);
  }

  function createProjectThumbnail(src, alt, imageClass = "", options = {}) {
    if (src) return createImageLoader(src, alt, imageClass, options);

    const placeholder = document.createElement("div");
    placeholder.className = `image-loader loaded project-placeholder ${imageClass}`.trim();
    placeholder.setAttribute("role", "img");
    placeholder.setAttribute("aria-label", `${alt || "Project"} thumbnail coming soon`);

    const logo = document.createElement("img");
    logo.className = "project-placeholder-logo";
    logo.src = "/assets/BlueFire_Logo_square.png";
    logo.alt = "";

    const label = document.createElement("span");
    label.className = "project-placeholder-label";
    label.textContent = "Coming Soon...";

    placeholder.appendChild(logo);
    placeholder.appendChild(label);
    return placeholder;
  }

  // Expose globally
  window.createSectionLoaderController = createSectionLoaderController;
  window.createImageLoader = createImageLoader;
  window.createThumbnailMedia = createThumbnailMedia;
  window.createProjectThumbnail = createProjectThumbnail;
})();
