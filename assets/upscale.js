"use strict";
(() => {
    const MAX_PIXELS = 40000000;
    const form = document.getElementById("upscale_form");
    if (!form)
        return;
    const formEl = form;
    const urlInput = document.getElementById("tempest_input");
    const fileInput = document.getElementById("tempest_file_input");
    const loadButton = document.getElementById("tempest_upload_button");
    const statusEl = document.getElementById("upscale_status");
    const resultsEl = document.getElementById("upscale_results");
    const inputPreview = document.getElementById("upscale_input_preview");
    const outputPreview = document.getElementById("upscale_output_preview");
    const downloadLink = document.getElementById("upscale_download");
    const submitButton = document.getElementById("tempest_submit");
    let inputObjectUrl = null;
    let outputObjectUrl = null;
    let loadedImage = null;
    function setStatus(message) {
        if (!statusEl)
            return;
        statusEl.textContent = message;
    }
    function setBusy(isBusy) {
        if (!submitButton)
            return;
        submitButton.disabled = isBusy;
        submitButton.setAttribute("aria-busy", isBusy ? "true" : "false");
    }
    function revokeUrl(url) {
        if (!url)
            return;
        try {
            URL.revokeObjectURL(url);
        }
        catch {
            // Ignore
        }
    }
    function getRadioValue(name) {
        const checked = formEl.querySelector(`input[type="radio"][name="${CSS.escape(name)}"]:checked`);
        return checked?.value ?? null;
    }
    function setRadioValue(name, value) {
        const input = formEl.querySelector(`input[type="radio"][name="${CSS.escape(name)}"][value="${CSS.escape(value)}"]`);
        if (input)
            input.checked = true;
    }
    function parseScale(value) {
        if (!value)
            return null;
        const match = value.match(/^(\d+)x$/i);
        if (!match)
            return null;
        const scale = Number(match[1]);
        if (!Number.isFinite(scale) || scale <= 0)
            return null;
        return scale;
    }
    function mimeFromFormat(format) {
        switch (format) {
            case "PNG":
                return "image/png";
            case "JPEG":
                return "image/jpeg";
            case "WebP":
                return "image/webp";
        }
    }
    function extensionFromFormat(format) {
        switch (format) {
            case "PNG":
                return "png";
            case "JPEG":
                return "jpg";
            case "WebP":
                return "webp";
        }
    }
    function filterForPreset(algorithm, noise) {
        const parts = [];
        if (noise !== "None") {
            const blur = noise === "Low" ? 0.6 : noise === "Medium" ? 1.2 : 2.0;
            parts.push(`blur(${blur}px)`);
        }
        if (algorithm === "Real-ESRGAN")
            parts.push("contrast(1.05)");
        if (algorithm === "Real-CUGAN")
            parts.push("saturate(1.05)");
        if (algorithm === "Waifu2X")
            parts.push("contrast(1.02) saturate(1.08)");
        return parts.length ? parts.join(" ") : "none";
    }
    async function decodeImageFromBlob(blob) {
        const img = new Image();
        const objectUrl = URL.createObjectURL(blob);
        img.src = objectUrl;
        try {
            await img.decode();
        }
        catch {
            await new Promise((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error("Failed to load image"));
            });
        }
        revokeUrl(inputObjectUrl);
        inputObjectUrl = objectUrl;
        return img;
    }
    async function loadInputImage() {
        if (!fileInput)
            throw new Error("Missing file input");
        if (!urlInput)
            throw new Error("Missing URL input");
        const file = fileInput.files?.[0] ?? null;
        const url = urlInput.value.trim();
        if (file) {
            setStatus(`Loaded file: ${file.name}`);
            return decodeImageFromBlob(file);
        }
        if (url) {
            setStatus("Fetching image URL...");
            const response = await fetch(url);
            if (!response.ok)
                throw new Error(`Failed to fetch image: ${response.status}`);
            const blob = await response.blob();
            setStatus("Image fetched.");
            return decodeImageFromBlob(blob);
        }
        throw new Error("Please provide an image URL or choose a file.");
    }
    function showInputPreview(img) {
        if (!inputPreview || !resultsEl)
            return;
        inputPreview.src = img.src;
        inputPreview.hidden = false;
        resultsEl.hidden = false;
    }
    async function upscaleToBlob(options) {
        const { img, algorithm, scale, noise, format } = options;
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        if (!width || !height)
            throw new Error("Invalid input image size.");
        const outW = width * scale;
        const outH = height * scale;
        if (outW * outH > MAX_PIXELS) {
            throw new Error(`Output is too large (${outW}x${outH}). Try a lower scale or smaller image.`);
        }
        const canvas = document.createElement("canvas");
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext("2d");
        if (!ctx)
            throw new Error("Canvas is not supported.");
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.filter = filterForPreset(algorithm, noise);
        ctx.drawImage(img, 0, 0, outW, outH);
        ctx.filter = "none";
        const mime = mimeFromFormat(format);
        const quality = format === "JPEG" || format === "WebP" ? 0.92 : undefined;
        const blob = await new Promise((resolve, reject) => {
            canvas.toBlob((b) => {
                if (!b)
                    reject(new Error("Failed to encode output image."));
                else
                    resolve(b);
            }, mime, quality);
        });
        return blob;
    }
    function showOutput(blob, filename) {
        if (!outputPreview || !downloadLink || !resultsEl)
            return;
        revokeUrl(outputObjectUrl);
        outputObjectUrl = URL.createObjectURL(blob);
        outputPreview.src = outputObjectUrl;
        outputPreview.hidden = false;
        downloadLink.href = outputObjectUrl;
        downloadLink.download = filename;
        downloadLink.hidden = false;
        resultsEl.hidden = false;
    }
    function applyQueryDefaults() {
        const params = new URLSearchParams(location.search);
        const algorithm = params.get("algorithm");
        if (algorithm)
            setRadioValue("algorithm", algorithm);
        const scale = params.get("scale");
        if (scale)
            setRadioValue("algorithm_scale", scale);
        const noise = params.get("noise");
        if (noise)
            setRadioValue("algorithm_noise", noise);
        const format = params.get("format");
        if (format)
            setRadioValue("output_format", format);
        const processing = params.get("processing");
        if (processing)
            setRadioValue("processing_type", processing);
    }
    async function handleLoadPreview() {
        try {
            setBusy(true);
            loadedImage = await loadInputImage();
            showInputPreview(loadedImage);
            if (outputPreview) {
                outputPreview.src = "";
                outputPreview.hidden = true;
            }
            if (downloadLink) {
                downloadLink.href = "#";
                downloadLink.hidden = true;
            }
            revokeUrl(outputObjectUrl);
            outputObjectUrl = null;
        }
        catch (err) {
            setStatus(err instanceof Error ? err.message : String(err));
        }
        finally {
            setBusy(false);
        }
    }
    async function handleSubmit(event) {
        event.preventDefault();
        const algorithm = getRadioValue("algorithm");
        const noise = (getRadioValue("algorithm_noise") ?? "None");
        const format = getRadioValue("output_format");
        const processingType = getRadioValue("processing_type") ?? "Client_side";
        const scaleRaw = getRadioValue("algorithm_scale");
        const scale = parseScale(scaleRaw);
        try {
            setBusy(true);
            if (outputPreview) {
                outputPreview.src = "";
                outputPreview.hidden = true;
            }
            if (downloadLink) {
                downloadLink.href = "#";
                downloadLink.hidden = true;
            }
            revokeUrl(outputObjectUrl);
            outputObjectUrl = null;
            if (processingType === "Server_Side") {
                setStatus("Server-side processing is not configured; running client-side preview instead.");
            }
            if (!algorithm)
                throw new Error("Please select an algorithm.");
            if (!scale)
                throw new Error("Please select a scale.");
            if (!format)
                throw new Error("Please select an output format.");
            if (!loadedImage)
                loadedImage = await loadInputImage();
            showInputPreview(loadedImage);
            setStatus("Upscaling...");
            const blob = await upscaleToBlob({ img: loadedImage, algorithm, scale, noise, format });
            const filename = `upscaled_${algorithm.replace(/[^a-z0-9]+/gi, "_")}_${scale}x.${extensionFromFormat(format)}`;
            showOutput(blob, filename);
            setStatus("Done.");
        }
        catch (err) {
            setStatus(err instanceof Error ? err.message : String(err));
        }
        finally {
            setBusy(false);
        }
    }
    function init() {
        applyQueryDefaults();
        loadButton?.addEventListener("click", () => void handleLoadPreview());
        fileInput?.addEventListener("change", () => void handleLoadPreview());
        formEl.addEventListener("submit", (event) => void handleSubmit(event));
        window.addEventListener("beforeunload", () => {
            revokeUrl(inputObjectUrl);
            revokeUrl(outputObjectUrl);
        });
        setStatus("");
    }
    if (document.readyState === "loading")
        document.addEventListener("DOMContentLoaded", init);
    else
        init();
})();
