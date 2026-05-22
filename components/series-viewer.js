// ------------------------------------------------------------
// SERIES VIEWER COMPONENT
// Reusable across Devlog pages and Task pages
// ------------------------------------------------------------

// Inject CSS once
if (!window.__seriesViewerCSSInjected) {
    const css = `
    .series-viewer-wrapper {
        margin-bottom: 30px;
    }

    .series-main-wrapper {
        width: 100%;
        height: 380px;
        background: #0f1a33;
        border-radius: 12px;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden;
    }

    .series-main-image {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        display: none;
    }

    .series-thumbs {
        display: flex;
        gap: 10px;
        overflow-x: auto;
        margin-top: 12px;
        padding-bottom: 6px;
    }

    .series-thumb {
        width: 90px;
        height: 90px;
        object-fit: cover;
        border-radius: 8px;
        cursor: pointer;
        border: 2px solid transparent;
        transition: 0.2s ease;
    }

    .series-thumb.active {
        border-color: #4fc3ff;
        box-shadow: 0 0 10px rgba(79, 195, 255, 0.4);
    }
    `;

    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);

    window.__seriesViewerCSSInjected = true;
}

// ------------------------------------------------------------
// renderSeriesViewer(images, mountId)
// ------------------------------------------------------------
window.renderSeriesViewer = function(images, mountId) {
    if (!images || images.length === 0) return;

    const mount = document.getElementById(mountId);
    if (!mount) return;

    // Build wrapper
    mount.innerHTML = `
        <div class="series-viewer-wrapper fade-section" id="${mountId}-wrapper" style="display:none;">
            <h2 style="color:#6faaff; margin-bottom:12px;">Series Progress</h2>

            <div id="${mountId}-loader" class="section-loader">
                <div class="loader"></div>
            </div>

            <div id="${mountId}-viewer" style="display:none;">
                <div class="series-main-wrapper">
                    <img id="${mountId}-main" class="series-main-image">
                </div>

                <div id="${mountId}-thumbs" class="series-thumbs"></div>
            </div>
        </div>
    `;

    const wrapper = document.getElementById(`${mountId}-wrapper`);
    const loader = document.getElementById(`${mountId}-loader`);
    const viewer = document.getElementById(`${mountId}-viewer`);
    const mainImg = document.getElementById(`${mountId}-main`);
    const thumbs = document.getElementById(`${mountId}-thumbs`);

    // Build thumbnails
    images.forEach((img, index) => {
        const t = document.createElement("img");
        t.src = img.url;
        t.className = "series-thumb";
        t.dataset.index = index;

        t.addEventListener("click", () => setMainImage(index));
        thumbs.appendChild(t);
    });

    function setMainImage(i) {
        mainImg.style.display = "none";
        mainImg.src = images[i].url;

        mainImg.onload = () => {
            mainImg.style.display = "block";
        };

        document.querySelectorAll(`#${mountId}-thumbs .series-thumb`)
            .forEach(t => t.classList.remove("active"));

        const active = document.querySelector(`#${mountId}-thumbs .series-thumb[data-index="${i}"]`);
        if (active) active.classList.add("active");
    }

    // Initial image
    setMainImage(0);

    // Reveal viewer
    loader.style.display = "none";
    viewer.style.display = "block";
    wrapper.style.display = "block";
    wrapper.classList.add("visible");
};
