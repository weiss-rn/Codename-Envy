async function loadHTML(id, file) {
    const element = document.getElementById(id);
    const response = await fetch(file);
    const html = await response.text();
    element.innerHTML = html;
}

// Load components
document.addEventListener("DOMContentLoaded", () => {
    loadHTML("inject-header", "components/header.html");
    loadHTML("inject-headerV2", "components/headerV2.html");
    loadHTML("inject-headerV3", "components/headerV3.html");
    loadHTML("inject-footer", "components/footer.html");
});
