(function () {
    const theme = localStorage.getItem("xp-color-scheme") || "luna";
    const wallpaper =
        localStorage.getItem("xp-wallpaper") ||
        "assets/images/wallpaper/Bliss.jpg";

    if (theme !== "luna") {
        document.documentElement.classList.add("theme-" + theme);
    }

    // Apply wallpaper early via CSS variable
    document.documentElement.style.setProperty(
        "--bg-image",
        'url("' + wallpaper + '")',
    );

    // Position Search Box early to avoid jump
    // Removed !important so that JS drag can override these styles
    const searchPos = localStorage.getItem("win-pos-search-window");
    if (searchPos) {
        try {
            const pos = JSON.parse(searchPos);
            const style = document.createElement("style");
            style.innerHTML = `#search-window { left: ${pos.left}; top: ${pos.top}; transform: none; }`;
            document.head.appendChild(style);
        } catch (e) {}
    }
})();
