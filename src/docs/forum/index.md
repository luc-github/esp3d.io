# Forum

<details class="forum-section">
<summary class="forum-summary">General
<div class="section-description">
General questions, suggestions, and discussions about the entire ESP3D ecosystem.
</div>
</summary>

<div id="general-comments" class="giscus-frame"></div>
</details>

<details class="forum-section">
<summary class="forum-summary">ESP3D Firmware
<div class="section-description">
Discussions about ESP3D firmware, installation, configuration, and usage.
</div>
</summary>
<div id="core-comments" class="giscus-frame"></div>
</details>

<details class="forum-section">
<summary class="forum-summary">ESP3D-WEBUI
<div class="section-description">
Questions and discussions about ESP3D web interface.
</div>
</summary>
<div id="webui-comments" class="giscus-frame"></div>
</details>

<details class="forum-section">
<summary class="forum-summary">ESP3D-TFT</summary>
<div class="section-description"> Support for TFT interface.</div>
<div id="esp3dtft-comments" class="giscus-frame"></div>
</details>

<details class="forum-section">
<summary class="forum-summary">ESP3DLib
<div class="section-description">
Technical discussions about ESP3D library.
</div>
</summary>
<div id="esp3dlib-comments" class="giscus-frame"></div>
</details>

<details class="forum-section">
<summary class="forum-summary">ESP3D-Configurator
<div class="section-description">
Discussions about ESP3D configurator.
</div>
</summary>
<div id="esp3dconfig-comments" class="giscus-frame"></div>
</details>

<script>
const configs = {
    'general-comments': {
        repo: "luc-github/esp3d-portfolio",
        repoId: "R_kgDONG61ew",
        category: "forum",
        categoryId: "DIC_kwDONG61e84Clbpv"
    },
    'core-comments': {
        repo: "luc-github/ESP3D",
        repoId: "MDEwOlJlcG9zaXRvcnkzNDA1ODM5MQ==",
        category: "forum",
        categoryId: "DIC_kwDOAgewl84ClbrW"
    },
    'webui-comments': {
        repo: "luc-github/ESP3D-WEBUI",
        repoId: "MDEwOlJlcG9zaXRvcnk5MTc3NTkxNw==",
        category: "forum",
        categoryId: "DIC_kwDOBXhjrc4Clbrp"
    },
    'esp3dtft-comments': {
        repo: "luc-github/ESP3D-TFT",
        repoId: "R_kgDOH3z-oA",
        category: "forum",
        categoryId: "DIC_kwDOH3z-oM4ClbxM"
    },
    'esp3dlib-comments': {
        repo: "luc-github/ESP3DLib",
        repoId: "MDEwOlJlcG9zaXRvcnkyMjgzOTE1MzQ",
        category: "forum",
        categoryId: "DIC_kwDODZz6bs4ClbxZ"
    },
    'esp3dconfig-comments': {
        repo: "luc-github/ESP3D-Configurator",
        repoId: "R_kgDOHcSMvw",
        category: "forum",        
        categoryId: "DIC_kwDOHcSMv84Clbxa"
    }
};

let currentOpenDetails = null;

function loadGiscus(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Purge all giscus frames
    document.querySelectorAll('.giscus-frame').forEach(frame => {
        frame.innerHTML = '';
    });

    const config = configs[containerId];
    const script = document.createElement('script');
    script.src = "https://giscus.app/client.js";
    script.setAttribute('data-repo', config.repo);
    script.setAttribute('data-repo-id', config.repoId);
    script.setAttribute('data-category', config.category);
    script.setAttribute('data-category-id', config.categoryId);
    script.setAttribute('data-mapping', "pathname");
    script.setAttribute('data-strict', "0");
    script.setAttribute('data-reactions-enabled', "1");
    script.setAttribute('data-emit-metadata', "0");
    script.setAttribute('data-input-position', "bottom");
    script.setAttribute('data-theme', "preferred_color_scheme");
    script.setAttribute('data-lang', "en");
    script.setAttribute('crossorigin', "anonymous");
    script.async = true;
    
    container.appendChild(script);
}

document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('details').forEach(details => {
        details.addEventListener('toggle', function(e) {
            if (this.open) {
                // Close previously opened details
                if (currentOpenDetails && currentOpenDetails !== this) {
                    currentOpenDetails.open = false;
                }
                currentOpenDetails = this;
                
                // Load Giscus in the newly opened section
                const container = this.querySelector('.giscus-frame');
                if (container) {
                    loadGiscus(container.id);
                }
            }
        });
    });
});
</script>