const FALLBACK_HEADER_HTML = `
<header>
    <h1>NCNN</h1>
    <nav>
        <div class="nav_links">
            <a href="index.html" class="nav_link">Home</a>
            <a href="Upscale-Page.html" class="nav_link">Try</a>
            <a href="Image-Sample.html" class="nav_link">Samples</a>
            <a href="Download-Algorithm.html" class="nav_link">Download</a>
            <a href="about.html" class="nav_link">About</a>
        </div>
    </nav>
</header>
`;

const FALLBACK_FOOTER_HTML = `
<footer class="footer-background">
    <div class="footer-grid">
        <div class="footer-section">
            <h3 class="foot_link">Open Source</h3>
            <ul class="footer-links">
                <li><a href="https://github.com/xinntao/Real-ESRGAN" target="_blank" rel="noopener noreferrer">Real-ESRGAN</a></li>
                <li><a href="https://github.com/bilibili/ailab/tree/main/Real-CUGAN" target="_blank" rel="noopener noreferrer">Real-CUGAN</a></li>
                <li><a href="https://github.com/nagadomi/waifu2x" target="_blank" rel="noopener noreferrer">Waifu2x</a></li>
                <li><a href="https://github.com/Tencent/ncnn" target="_blank" rel="noopener noreferrer">NCNN Framework</a></li>
            </ul>
        </div>

        <div class="footer-section">
            <h3 class="foot_link">Documentation</h3>
            <ul class="footer-links">
                <li><a href="Upscale-Page.html">Getting Started</a></li>
                <li><a href="about.html">API Reference</a></li>
                <li><a href="about.html">Tutorials</a></li>
                <li><a href="Image-Sample.html">Preview</a></li>
            </ul>
        </div>

        <div class="footer-section">
            <h3 class="foot_link">Community</h3>
            <ul class="footer-links">
                <li><a href="https://github.com/Tencent/ncnn" target="_blank" rel="noopener noreferrer">GitHub</a></li>
                <li><a href="about.html">Discord</a></li>
                <li><a href="about.html">Forums</a></li>
                <li><a href="about.html">Contributing</a></li>
            </ul>
        </div>
        <div class="footer-content">
            <p>Release 20250503-305837F</p>
            <p>&copy; 2025 NCNN Project. All rights reserved.</p>
        </div>
    </div>
</footer>
`;

async function loadHTML(id, file, fallbackHTML) {
    const element = document.getElementById(id);
    if (!element) return;

    if (location.protocol === "file:") {
        element.innerHTML = fallbackHTML;
        return;
    }

    try {
        const response = await fetch(file, { cache: "force-cache" });
        if (!response.ok) throw new Error(`Failed to fetch ${file}: ${response.status}`);
        const html = await response.text();
        element.innerHTML = html;
    } catch (err) {
        console.warn(err);
        element.innerHTML = fallbackHTML;
    }
}

function setActiveNavLink() {
    const currentFile = (location.pathname.split("/").pop() || "index.html").toLowerCase();
    const isHome = currentFile === "" || currentFile === "index.html" || currentFile === "homepage.html";

    const links = document.querySelectorAll(".nav_links a.nav_link");
    links.forEach((link) => {
        const href = (link.getAttribute("href") || "").toLowerCase();
        const isMatch = isHome ? href === "index.html" : href === currentFile;
        if (isMatch) link.setAttribute("aria-current", "page");
        else link.removeAttribute("aria-current");
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    await Promise.all([
        loadHTML("inject-header", "components/header.html", FALLBACK_HEADER_HTML),
        loadHTML("inject-footer", "components/footer.html", FALLBACK_FOOTER_HTML),
    ]);

    setActiveNavLink();
});
