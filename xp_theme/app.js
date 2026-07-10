/**
 * Windows XP New Tab - app.js
 */

document.addEventListener("DOMContentLoaded", () => {
  App.init();
});

window.App = {
  shortcuts: [],
  cpuHistory: new Array(50).fill(0),
  memHistory: new Array(50).fill(0),
  lastCpuInfo: null,
  notepadStorageKey: "xp-notepad-document",
  notepadSaveTimer: null,
  themeStorageKey: "xp-color-scheme",
  wallpaperStorageKey: "xp-wallpaper",
  customWallpapersStorageKey: "xp-custom-wallpapers",
  defaultWallpaper: "assets/images/wallpaper/Bliss.jpg",
  wallpapers: [
    { name: "Bliss", path: "assets/images/wallpaper/Bliss.jpg" },
    { name: "Ascent", path: "assets/images/wallpaper/Ascent.jpg" },
    { name: "Autumn", path: "assets/images/wallpaper/Autumn.jpg" },
    { name: "Azul", path: "assets/images/wallpaper/Azul.jpg" },
    { name: "Follow", path: "assets/images/wallpaper/Follow.jpg" },
    { name: "Friend", path: "assets/images/wallpaper/Friend.jpg" },
    { name: "Moon flower", path: "assets/images/wallpaper/Moon flower.jpg" },
    { name: "Radiance", path: "assets/images/wallpaper/Radiance.jpg" },
    {
      name: "Red moon desert",
      path: "assets/images/wallpaper/Red moon desert.jpg",
    },
    { name: "Stonehenge", path: "assets/images/wallpaper/Stonehenge.jpg" },
    { name: "Tulips", path: "assets/images/wallpaper/Tulips.jpg" },
    {
      name: "Vortec space",
      path: "assets/images/wallpaper/Vortec space.jpg",
    },
    { name: "Wind", path: "assets/images/wallpaper/Wind.jpg" },
  ],
  customWallpapers: [],
  bookmarkTree: [],
  currentFolderId: "1", // Root bookmark folder usually
  historyStack: [],

  init() {
    this.initThemes();
    this.initClock();
    this.initStartButton();
    this.initStartMenuInteraction();
    this.initSearch();
    this.initBookmarks();
    this.initExplorer();
    this.initNotepad();
    this.initTaskManager();
    this.initRunDialog();
    if (typeof Minesweeper !== "undefined") {
      Minesweeper.init();
    }
  },

  initClock() {
    const trayClock = document.getElementById("tray-clock");
    if (!trayClock) return;

    const update = () => {
      const now = new Date();
      let h = now.getHours();
      const m = now.getMinutes().toString().padStart(2, "0");
      const ampm = h >= 12 ? "PM" : "AM";
      h = h % 12 || 12;
      trayClock.textContent = `${h}:${m} ${ampm}`;
    };

    update();
    setInterval(update, 1000);
  },

  initStartButton() {
    const btn = document.getElementById("start-btn");
    const menu = document.getElementById("start-menu");
    if (!btn || !menu) return;

    btn.onclick = (e) => {
      e.stopPropagation();
      menu.classList.toggle("hidden");
    };

    document.addEventListener("click", (e) => {
      if (!menu.contains(e.target) && e.target !== btn) {
        menu.classList.add("hidden");
      }
    });
  },

  initStartMenuInteraction() {
    const navigateTo = (url) => {
      if (window.chrome && chrome.tabs) {
        chrome.tabs.create({ url });
      } else {
        window.location.href = url;
      }
    };

    const links = {
      "start-ie": "https://www.google.com",
      "start-mail": "https://mail.google.com",
      "start-my-docs": "chrome://downloads",
      "start-my-recent": "chrome://history",
      "start-my-pics": "https://photos.google.com",
      "start-my-music": "https://music.youtube.com",
      "start-my-computer": "chrome://settings",
      "start-control-panel": "chrome://settings",
    };

    for (const [id, url] of Object.entries(links)) {
      const el = document.getElementById(id);
      if (el) {
        el.onclick = () => {
          navigateTo(url);
          document.getElementById("start-menu")?.classList.add("hidden");
        };
      }
    }

    const searchItem = document.getElementById("start-search");
    if (searchItem) {
      searchItem.onclick = () => {
        const win = document.getElementById("search-window");
        win?.classList.remove("hidden");
        document.getElementById("search-input")?.focus();
        document.getElementById("start-menu")?.classList.add("hidden");
      };
    }
  },

  getIcon(item) {
    if (!item.url) return "assets/images/icons/folder-icon.png";
    try {
      const url = new URL(item.url);
      if (url.protocol === "chrome:") {
        if (url.hostname === "settings")
          return "assets/images/icons/control-panel-icon.webp";
        if (url.hostname === "history")
          return "assets/images/icons/search-icon.webp";
        if (url.hostname === "downloads")
          return "assets/images/icons/folder-icon.png";
        return "assets/images/icons/internet-explorer-icon.svg";
      }
      return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
    } catch (e) {
      return "assets/images/icons/internet-explorer-icon.svg";
    }
  },

  initSearch() {
    const input = document.getElementById("search-input");
    const btn = document.getElementById("search-btn");
    const searchWindow = document.getElementById("search-window");
    const closeBtn = document.getElementById("search-close");

    if (!input || !btn || !searchWindow) return;

    this.makeWindowDraggable(searchWindow);

    if (closeBtn) {
      closeBtn.onclick = () => searchWindow.classList.add("hidden");
    }

    const stored = localStorage.getItem("win-pos-search-window");
    if (stored) {
      const pos = JSON.parse(stored);
      searchWindow.style.left = pos.left;
      searchWindow.style.top = pos.top;
      searchWindow.style.transform = "none";
    } else {
      searchWindow.style.left = "50%";
      searchWindow.style.top = "50%";
      searchWindow.style.transform = "translate(-50%, -50%)";
    }

    const doSearch = () => {
      const query = input.value.trim();
      if (query) {
        window.location.href = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
      }
    };

    btn.onclick = doSearch;
    input.onkeydown = (e) => {
      if (e.key === "Enter") {
        doSearch();
      }
    };
  },

  initBookmarks() {
    const addBtn = document.getElementById("add-shortcut-btn");
    const modal = document.getElementById("shortcut-modal");
    const cancelBtn = document.getElementById("shortcut-cancel");
    const okBtn = document.getElementById("shortcut-ok");

    const urlInput = document.getElementById("shortcut-url");
    const nameInput = document.getElementById("shortcut-name");
    const folderSelect = document.getElementById("shortcut-folder");
    const newFolderField = document.getElementById("new-folder-field");
    const newFolderNameInput = document.getElementById("new-folder-name");

    if (
      !addBtn ||
      !modal ||
      !cancelBtn ||
      !okBtn ||
      !urlInput ||
      !nameInput ||
      !folderSelect ||
      !newFolderField ||
      !newFolderNameInput
    ) {
      return;
    }

    const closeBtn = modal.querySelector(".btn-close");
    if (!closeBtn) return;

    this.fetchBookmarks();

    const populateFolders = () => {
      const folders = this.getAllFolders();
      let newOption = folderSelect.querySelector('option[value="new"]');
      if (!newOption) {
        newOption = document.createElement("option");
        newOption.value = "new";
        newOption.textContent = "+ Create New Folder...";
      }

      folderSelect.innerHTML = "";
      folders.forEach((f) => {
        const opt = document.createElement("option");
        opt.value = f.id;
        opt.textContent = f.title;
        if (f.id === this.currentFolderId) opt.selected = true;
        folderSelect.appendChild(opt);
      });
      folderSelect.appendChild(newOption);
    };

    addBtn.onclick = () => {
      populateFolders();
      newFolderField.classList.add("hidden");
      newFolderNameInput.value = "";
      modal.classList.remove("hidden");
      modal.style.left = "50%";
      modal.style.top = "50%";
      modal.style.transform = "translate(-50%, -50%)";
      urlInput.focus();
    };

    folderSelect.onchange = () => {
      if (folderSelect.value === "new") {
        newFolderField.classList.remove("hidden");
        newFolderNameInput.focus();
      } else {
        newFolderField.classList.add("hidden");
      }
    };

    const closeModal = () => {
      modal.classList.add("hidden");
      urlInput.value = "";
      nameInput.value = "";
      newFolderNameInput.value = "";
    };

    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;

    okBtn.onclick = () => {
      let url = urlInput.value.trim();
      const name = nameInput.value.trim();
      const folderId = folderSelect.value;
      const newFolderName = newFolderNameInput.value.trim();

      if (!url || !name) {
        alert("Please fill in both name and URL.");
        return;
      }

      if (folderId === "new" && !newFolderName) {
        alert("Please enter a name for the new folder.");
        return;
      }

      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        url = "https://" + url;
      }

      const createBookmark = (parentId) => {
        if (window.chrome && chrome.bookmarks) {
          chrome.bookmarks.create(
            {
              parentId: parentId,
              title: name,
              url: url,
            },
            () => {
              closeModal();
            },
          );
        } else {
          try {
            const urlObj = new URL(url);
            const id = Date.now().toString();
            const icon = this.getIcon({ url });
            const stored = localStorage.getItem("xp-bookmarks") || "[]";
            const bookmarks = JSON.parse(stored);
            bookmarks.push({ id, url, title: name, icon });
            localStorage.setItem("xp-bookmarks", JSON.stringify(bookmarks));
            this.fetchBookmarks();
            closeModal();
          } catch (e) {
            alert("Please enter a valid URL.");
          }
        }
      };

      if (folderId === "new") {
        if (window.chrome && chrome.bookmarks) {
          chrome.bookmarks.create(
            { parentId: "1", title: newFolderName },
            (newFolder) => {
              createBookmark(newFolder.id);
            },
          );
        } else {
          createBookmark("1");
        }
      } else {
        createBookmark(folderId);
      }
    };
  },

  fetchBookmarks() {
    if (window.chrome && chrome.bookmarks) {
      chrome.bookmarks.getTree((tree) => {
        this.bookmarkTree = tree;
        this.renderDesktopBookmarks();
        this.renderExplorer();
      });

      if (!this.bookmarkListenersAdded) {
        chrome.bookmarks.onCreated.addListener(() => this.fetchBookmarks());
        chrome.bookmarks.onRemoved.addListener(() => this.fetchBookmarks());
        chrome.bookmarks.onChanged.addListener(() => this.fetchBookmarks());
        chrome.bookmarks.onMoved.addListener(() => this.fetchBookmarks());
        this.bookmarkListenersAdded = true;
      }
    } else {
      const stored = localStorage.getItem("xp-bookmarks");
      if (stored) {
        try {
          const bookmarks = JSON.parse(stored);
          this.bookmarkTree = [
            { children: [{ children: bookmarks, id: "1" }] },
          ];
          this.renderDesktopBookmarks();
          this.renderExplorer();
        } catch (e) {
          this.bookmarkTree = [];
        }
      }
    }
  },

  renderDesktopBookmarks() {
    const grid = document.getElementById("shortcut-grid");
    if (!grid) return;
    grid.innerHTML = "";

    const root = this.bookmarkTree[0];
    if (!root || !root.children) return;

    const bar = root.children.find((c) => c.id === "1");
    let itemsToShow = bar && bar.children ? [...bar.children] : [];

    if (itemsToShow.length === 0) {
      itemsToShow = root.children.filter((c) => c.id !== "0");
    }

    itemsToShow.forEach((b) => {
      const el = document.createElement("div");
      el.className = "shortcut";
      el.title = b.url || "";
      const icon = this.getIcon(b);

      el.innerHTML = `
                <img src="${icon}" onerror="this.src='assets/images/icons/internet-explorer-icon.svg'">
                <span>${b.title}</span>
            `;

      el.onclick = () => {
        if (b.url) {
          window.location.href = b.url;
        } else {
          this.openExplorer(b.id);
        }
      };
      el.oncontextmenu = (e) => {
        e.preventDefault();
        if (confirm(`Delete "${b.title}"?`)) {
          if (window.chrome && chrome.bookmarks) {
            if (b.url)
              chrome.bookmarks.remove(b.id, () => this.fetchBookmarks());
            else chrome.bookmarks.removeTree(b.id, () => this.fetchBookmarks());
          } else {
            const stored = localStorage.getItem("xp-bookmarks");
            if (stored) {
              let bookmarks = JSON.parse(stored);
              bookmarks = bookmarks.filter((x) => x.id !== b.id);
              localStorage.setItem("xp-bookmarks", JSON.stringify(bookmarks));
              this.fetchBookmarks();
            }
          }
        }
      };
      grid.appendChild(el);
    });
  },

  initExplorer() {
    const windowEl = document.getElementById("explorer-window");
    const closeBtn = document.getElementById("explorer-close");
    const backBtn = document.getElementById("explorer-back");
    const upBtn = document.getElementById("explorer-up");
    const addressInput = document.getElementById("explorer-address-input");

    if (!windowEl || !closeBtn || !backBtn || !upBtn || !addressInput) return;

    this.makeWindowDraggable(windowEl);

    closeBtn.onclick = () => windowEl.classList.add("hidden");

    backBtn.onclick = () => {
      if (this.historyStack.length > 1) {
        this.historyStack.pop();
        this.currentFolderId = this.historyStack[this.historyStack.length - 1];
        this.renderExplorer();
      }
    };

    upBtn.onclick = () => {
      const folder = this.findBookmarkById(this.currentFolderId);
      if (folder && folder.parentId) {
        this.openExplorer(folder.parentId);
      }
    };

    const desktopBtn = document.getElementById("explorer-goto-desktop");
    if (desktopBtn) {
      desktopBtn.onclick = (e) => {
        e.preventDefault();
        this.openExplorer("1");
      };
    }

    const newFolderBtn = document.getElementById("explorer-new-folder");
    if (newFolderBtn) {
      newFolderBtn.onclick = (e) => {
        e.preventDefault();
        const name = prompt("Enter folder name:");
        if (name && window.chrome && chrome.bookmarks) {
          chrome.bookmarks.create(
            { parentId: this.currentFolderId, title: name },
            () => this.fetchBookmarks(),
          );
        }
      };
    }

    const newBookmarkBtn = document.getElementById("explorer-new-bookmark");
    if (newBookmarkBtn) {
      newBookmarkBtn.onclick = (e) => {
        e.preventDefault();
        document.getElementById("add-shortcut-btn")?.click();
      };
    }
  },

  openExplorer(folderId) {
    const windowEl = document.getElementById("explorer-window");
    if (!windowEl) return;
    windowEl.classList.remove("hidden");
    windowEl.style.left = "100px";
    windowEl.style.top = "50px";
    windowEl.style.transform = "none";

    if (this.currentFolderId !== folderId) {
      this.currentFolderId = folderId;
      this.historyStack.push(folderId);
    } else if (this.historyStack.length === 0) {
      this.historyStack.push(folderId);
    }
    this.renderExplorer();
  },

  renderExplorer() {
    const grid = document.getElementById("explorer-grid");
    const addressInput = document.getElementById("explorer-address-input");
    const titleEl = document.getElementById("explorer-title");
    const countEl = document.getElementById("explorer-status-count");
    const backBtn = document.getElementById("explorer-back");
    const treeGrid = document.getElementById("explorer-tree");

    if (!grid || !addressInput || !titleEl || !countEl || !treeGrid) return;

    const folder = this.findBookmarkById(this.currentFolderId);
    if (!folder) return;

    titleEl.textContent = folder.title || "My Bookmarks";
    addressInput.value = folder.title || "My Bookmarks";
    grid.innerHTML = "";

    const items = folder.children || [];
    items.forEach((item) => {
      const el = document.createElement("div");
      el.className = "explorer-item";
      const icon = this.getIcon(item);

      el.innerHTML = `
                <img src="${icon}" onerror="this.src='assets/images/icons/internet-explorer-icon.svg'">
                <span>${item.title}</span>
            `;

      el.onclick = () => {
        if (item.url) {
          window.location.href = item.url;
        } else {
          this.openExplorer(item.id);
        }
      };

      el.oncontextmenu = (e) => {
        e.preventDefault();
        if (confirm(`Delete "${item.title}"?`)) {
          if (window.chrome && chrome.bookmarks) {
            if (item.url)
              chrome.bookmarks.remove(item.id, () => this.fetchBookmarks());
            else
              chrome.bookmarks.removeTree(item.id, () => this.fetchBookmarks());
          }
        }
      };

      grid.appendChild(el);
    });

    countEl.textContent = `${items.length} objects`;
    backBtn.disabled = this.historyStack.length <= 1;

    treeGrid.innerHTML = "";
    this.renderTree(this.bookmarkTree[0], treeGrid, 0);
  },

  renderTree(node, container, level) {
    if (!node) return;
    if (node.children) {
      node.children.forEach((child) => {
        if (!child.url) {
          const el = document.createElement("div");
          el.className = "tree-item";
          if (child.id === this.currentFolderId) el.classList.add("active");

          el.innerHTML = `
            ${'<div class="tree-indent"></div>'.repeat(level)}
            <img src="assets/images/icons/folder-icon.png">
            <span>${child.title || "Bookmarks"}</span>
          `;

          el.onclick = () => this.openExplorer(child.id);
          container.appendChild(el);
          this.renderTree(child, container, level + 1);
        }
      });
    }
  },

  getAllFolders(nodes = this.bookmarkTree, folders = []) {
    for (const node of nodes) {
      if (!node.url && node.id !== "0") {
        folders.push({
          id: node.id,
          title:
            node.title ||
            (node.id === "1" ? "Bookmarks Bar" : "(Untitled Folder)"),
        });
      }
      if (node.children) {
        this.getAllFolders(node.children, folders);
      }
    }
    return folders;
  },

  findBookmarkById(id, nodes = this.bookmarkTree) {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children) {
        const found = this.findBookmarkById(id, node.children);
        if (found) return found;
      }
    }
    return null;
  },

  initThemes() {
    const desktop = document.getElementById("desktop");
    const windowEl = document.getElementById("display-properties-window");
    const closeBtn = document.getElementById("display-close");
    const okBtn = document.getElementById("display-ok");
    const cancelBtn = document.getElementById("display-cancel");
    const applyBtn = document.getElementById("display-apply");
    const radios = [...document.querySelectorAll('input[name="xp-theme"]')];
    const tabBtns = [...document.querySelectorAll("[data-display-tab]")];
    const panels = [...document.querySelectorAll("[data-display-panel]")];
    const wallpaperOptions = document.getElementById("wallpaper-options");
    if (
      !desktop ||
      !windowEl ||
      !closeBtn ||
      !okBtn ||
      !cancelBtn ||
      !applyBtn
    ) {
      return;
    }

    const savedTheme = localStorage.getItem(this.themeStorageKey) || "luna";
    this.applyTheme(savedTheme);

    const storedCustom = localStorage.getItem(this.customWallpapersStorageKey);
    if (storedCustom) {
      try {
        this.customWallpapers = JSON.parse(storedCustom);
      } catch (e) {
        this.customWallpapers = [];
      }
    }

    this.renderWallpaperOptions(wallpaperOptions);
    this.applyWallpaper(
      localStorage.getItem(this.wallpaperStorageKey) || this.defaultWallpaper,
    );

    const setSelectedTheme = (theme) => {
      const nextTheme = ["luna", "olive", "silver"].includes(theme)
        ? theme
        : "luna";
      const radio = radios.find((item) => item.value === nextTheme);
      if (radio) radio.checked = true;
    };

    const selectedTheme = () =>
      radios.find((item) => item.checked)?.value || "luna";

    const setSelectedWallpaper = (path) => {
      const allWallpapers = [...this.wallpapers, ...this.customWallpapers];
      const nextPath = allWallpapers.some(
        (wallpaper) => wallpaper.path === path,
      )
        ? path
        : this.defaultWallpaper;
      const radio = [
        ...document.querySelectorAll('input[name="xp-wallpaper"]'),
      ].find((item) => item.value === nextPath);
      if (radio) radio.checked = true;
    };

    const selectedWallpaper = () =>
      document.querySelector('input[name="xp-wallpaper"]:checked')?.value ||
      this.defaultWallpaper;

    const browseBtn = document.getElementById("wallpaper-browse");
    const wallpaperInput = document.getElementById("wallpaper-input");

    if (browseBtn && wallpaperInput) {
      browseBtn.onclick = () => wallpaperInput.click();
      wallpaperInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
          const path = event.target.result;
          const name = file.name.split(".")[0];

          if (this.customWallpapers.some((w) => w.path === path)) return;

          this.customWallpapers.push({ name, path });
          localStorage.setItem(
            this.customWallpapersStorageKey,
            JSON.stringify(this.customWallpapers),
          );

          this.renderWallpaperOptions(wallpaperOptions);
          setTimeout(() => setSelectedWallpaper(path), 0);
        };
        reader.readAsDataURL(file);
      };
    }

    const openDisplayProperties = (left, top) => {
      setSelectedTheme(localStorage.getItem(this.themeStorageKey) || "luna");
      setSelectedWallpaper(
        localStorage.getItem(this.wallpaperStorageKey) || this.defaultWallpaper,
      );
      windowEl.classList.remove("hidden");
      windowEl.style.left =
        Math.max(8, Math.min(left, window.innerWidth - 410)) + "px";
      windowEl.style.top =
        Math.max(8, Math.min(top, window.innerHeight - 300)) + "px";
      windowEl.style.transform = "none";
    };

    tabBtns.forEach((tabBtn) => {
      tabBtn.addEventListener("click", () => {
        const tabName = tabBtn.dataset.displayTab;
        tabBtns.forEach((btn) => {
          btn.classList.toggle("active", btn === tabBtn);
        });
        panels.forEach((panel) => {
          panel.classList.toggle(
            "hidden",
            panel.dataset.displayPanel !== tabName,
          );
        });
      });
    });

    desktop.addEventListener("contextmenu", (e) => {
      const ignoredTarget = e.target.closest(
        ".shortcut, .xp-window, .start-menu, .taskbar, .xp-search-box",
      );
      if (ignoredTarget) return;

      e.preventDefault();
      document.getElementById("start-menu")?.classList.add("hidden");
      openDisplayProperties(e.clientX, e.clientY);
    });

    const close = () => windowEl.classList.add("hidden");

    applyBtn.onclick = () => {
      const theme = selectedTheme();
      const wallpaper = selectedWallpaper();
      localStorage.setItem(this.themeStorageKey, theme);
      localStorage.setItem(this.wallpaperStorageKey, wallpaper);
      this.applyTheme(theme);
      this.applyWallpaper(wallpaper);
    };

    okBtn.onclick = () => {
      applyBtn.onclick();
      close();
    };

    cancelBtn.onclick = close;
    closeBtn.onclick = close;

    this.makeWindowDraggable(windowEl);
  },

  applyTheme(theme) {
    document.documentElement.classList.remove("theme-olive", "theme-silver");
    if (theme === "olive") {
      document.documentElement.classList.add("theme-olive");
    }
    if (theme === "silver") {
      document.documentElement.classList.add("theme-silver");
    }
  },

  renderWallpaperOptions(container) {
    if (!container) return;

    const allWallpapers = [
      ...this.wallpapers.map((w) => ({ ...w, isDefault: true })),
      ...this.customWallpapers.map((w) => ({ ...w, isDefault: false })),
    ];

    container.innerHTML = allWallpapers
      .map(
        (wallpaper) => `
          <label class="wallpaper-option" title="${wallpaper.name}">
            <input type="radio" name="xp-wallpaper" value="${wallpaper.path}">
            <img src="${wallpaper.path}" alt="">
            <span>${wallpaper.name}</span>
            ${
              !wallpaper.isDefault
                ? `<button class="delete-wallpaper" data-path="${wallpaper.path}" title="Delete">X</button>`
                : ""
            }
          </label>
        `,
      )
      .join("");

    container.querySelectorAll(".delete-wallpaper").forEach((btn) => {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const path = btn.dataset.path;
        if (confirm(`Remove custom wallpaper "${path.substring(0, 20)}..."?`)) {
          this.customWallpapers = this.customWallpapers.filter(
            (w) => w.path !== path,
          );
          localStorage.setItem(
            this.customWallpapersStorageKey,
            JSON.stringify(this.customWallpapers),
          );

          if (localStorage.getItem(this.wallpaperStorageKey) === path) {
            localStorage.setItem(
              this.wallpaperStorageKey,
              this.defaultWallpaper,
            );
            this.applyWallpaper(this.defaultWallpaper);
          }

          this.renderWallpaperOptions(container);
        }
      };
    });
  },

  applyWallpaper(path) {
    const allWallpapers = [...this.wallpapers, ...this.customWallpapers];
    const nextPath = allWallpapers.some((wallpaper) => wallpaper.path === path)
      ? path
      : this.defaultWallpaper;
    document.documentElement.style.setProperty(
      "--bg-image",
      `url("${nextPath}")`,
    );
  },

  initNotepad() {
    const startItem = document.getElementById("start-notepad");
    const taskBtn = document.getElementById("notepad-task-btn");
    const windowEl = document.getElementById("notepad-window");
    const closeBtn = document.getElementById("notepad-close");
    const resizeHandle = document.getElementById("notepad-resize-handle");
    const textarea = document.getElementById("notepad-textarea");
    const saveStatus = document.getElementById("notepad-save-status");
    const caretStatus = document.getElementById("notepad-caret-status");
    const fileBtn = document.getElementById("notepad-file");
    const fileMenu = document.getElementById("notepad-file-menu");
    const newBtn = document.getElementById("notepad-new");
    const saveBtn = document.getElementById("notepad-save");
    const editBtn = document.getElementById("notepad-edit");
    const wordWrapBtn = document.getElementById("notepad-word-wrap");
    const viewBtn = document.getElementById("notepad-view");
    const helpBtn = document.getElementById("notepad-help");

    if (!windowEl || !textarea || !closeBtn || !taskBtn) return;

    textarea.value = localStorage.getItem(this.notepadStorageKey) || "";

    const updateCaret = () => {
      const beforeCaret = textarea.value.slice(0, textarea.selectionStart);
      const lines = beforeCaret.split("\n");
      const line = lines.length;
      const col = lines[lines.length - 1].length + 1;
      if (caretStatus) caretStatus.textContent = `Ln ${line}, Col ${col}`;
    };

    const saveNow = () => {
      localStorage.setItem(this.notepadStorageKey, textarea.value);
      if (saveStatus) saveStatus.textContent = "Saved locally";
    };

    const queueSave = () => {
      if (saveStatus) saveStatus.textContent = "Saving...";
      clearTimeout(this.notepadSaveTimer);
      this.notepadSaveTimer = setTimeout(saveNow, 250);
    };

    const open = () => {
      windowEl.classList.remove("hidden");
      taskBtn.classList.remove("hidden");
      taskBtn.classList.add("active");
      windowEl.style.left = "90px";
      windowEl.style.top = "70px";
      windowEl.style.transform = "none";
      document.getElementById("start-menu")?.classList.add("hidden");
      textarea.focus();
      updateCaret();
    };

    const close = () => {
      saveNow();
      windowEl.classList.add("hidden");
      taskBtn.classList.remove("active");
      taskBtn.classList.add("hidden");
    };

    startItem?.addEventListener("click", open);
    taskBtn.addEventListener("click", () => {
      if (windowEl.classList.contains("hidden")) {
        open();
      } else {
        windowEl.classList.add("hidden");
        taskBtn.classList.remove("active");
      }
    });
    closeBtn.addEventListener("click", close);
    fileBtn?.addEventListener("click", (e) => {
      e.stopPropagation();
      fileMenu?.classList.toggle("hidden");
    });

    textarea.addEventListener("input", () => {
      queueSave();
      updateCaret();
    });
    textarea.addEventListener("keyup", updateCaret);
    textarea.addEventListener("click", updateCaret);
    textarea.addEventListener("select", updateCaret);

    textarea.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveNow();
      }
    });

    newBtn?.addEventListener("click", () => {
      if (textarea.value && !confirm("Clear this Notepad document?")) return;
      textarea.value = "";
      saveNow();
      updateCaret();
      fileMenu?.classList.add("hidden");
      textarea.focus();
    });

    saveBtn?.addEventListener("click", () => {
      saveNow();
      fileMenu?.classList.add("hidden");
      textarea.focus();
    });

    editBtn?.addEventListener("click", () => {
      textarea.select();
      textarea.focus();
    });

    wordWrapBtn?.addEventListener("click", () => {
      textarea.classList.toggle("no-wrap");
      textarea.focus();
    });

    viewBtn?.addEventListener("click", updateCaret);
    helpBtn?.addEventListener("click", () => {
      alert(
        "Windows XP Notepad\n\nYour text is saved locally in this browser.",
      );
    });

    document.addEventListener("click", (e) => {
      if (!fileMenu?.contains(e.target) && e.target !== fileBtn) {
        fileMenu?.classList.add("hidden");
      }
    });

    this.makeWindowDraggable(windowEl);
    if (resizeHandle) this.makeWindowResizable(windowEl, resizeHandle);
    saveNow();
    updateCaret();
  },

  makeWindowDraggable(windowEl) {
    const titlebar = windowEl.querySelector(".win-titlebar");
    if (!titlebar) return;

    const id = windowEl.id;
    const savePos = () => {
      if (id) {
        localStorage.setItem(
          `win-pos-${id}`,
          JSON.stringify({
            left: windowEl.style.left,
            top: windowEl.style.top,
          }),
        );
      }
    };

    let isDragging = false;
    let offset = { x: 0, y: 0 };

    titlebar.onmousedown = (e) => {
      isDragging = true;
      const rect = windowEl.getBoundingClientRect();
      windowEl.style.transform = "none";
      windowEl.style.left = rect.left + "px";
      windowEl.style.top = rect.top + "px";

      offset = {
        x: e.clientX - windowEl.offsetLeft,
        y: e.clientY - windowEl.offsetTop,
      };
    };

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      windowEl.style.left = e.clientX - offset.x + "px";
      windowEl.style.top = e.clientY - offset.y + "px";
    });

    document.addEventListener("mouseup", () => {
      if (isDragging) {
        isDragging = false;
        savePos();
      }
    });
  },

  makeWindowResizable(windowEl, handle) {
    let isResizing = false;
    let start = { x: 0, y: 0, width: 0, height: 0 };

    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      e.stopPropagation();
      isResizing = true;
      start = {
        x: e.clientX,
        y: e.clientY,
        width: windowEl.offsetWidth,
        height: windowEl.offsetHeight,
      };
    });

    document.addEventListener("mousemove", (e) => {
      if (!isResizing) return;

      const maxWidth = window.innerWidth - windowEl.offsetLeft - 12;
      const maxHeight = window.innerHeight - windowEl.offsetTop - 38;
      const nextWidth = Math.min(
        Math.max(360, start.width + e.clientX - start.x),
        maxWidth,
      );
      const nextHeight = Math.min(
        Math.max(240, start.height + e.clientY - start.y),
        maxHeight,
      );

      windowEl.style.width = nextWidth + "px";
      windowEl.style.height = nextHeight + "px";
    });

    document.addEventListener("mouseup", () => {
      isResizing = false;
    });
  },

  initTaskManager() {
    const startBtn = document.getElementById("start-task-manager");
    const taskBtn = document.getElementById("taskmgr-task-btn");
    const windowEl = document.getElementById("taskmgr-window");
    const close = document.getElementById("taskmgr-close");
    if (!startBtn || !taskBtn || !windowEl || !close) return;

    startBtn.onclick = () => {
      this.openTaskManager();
      document.getElementById("start-menu")?.classList.add("hidden");
    };

    taskBtn.onclick = () => {
      if (windowEl.classList.contains("hidden")) {
        this.openTaskManager();
      } else {
        windowEl.classList.add("hidden");
        taskBtn.classList.remove("active");
      }
    };

    close.onclick = () => this.closeTaskManager();

    this.makeWindowDraggable(windowEl);
  },

  openTaskManager() {
    const windowEl = document.getElementById("taskmgr-window");
    const taskBtn = document.getElementById("taskmgr-task-btn");
    if (!windowEl || !taskBtn) return;

    windowEl.classList.remove("hidden");
    taskBtn.classList.remove("hidden");
    taskBtn.classList.add("active");

    const stored = localStorage.getItem("win-pos-taskmgr-window");
    if (stored) {
      const pos = JSON.parse(stored);
      windowEl.style.left = pos.left;
      windowEl.style.top = pos.top;
    } else {
      const winWidth = 400;
      windowEl.style.width = winWidth + "px";
      windowEl.style.left = window.innerWidth - winWidth - 20 + "px";
      windowEl.style.top = window.innerHeight - 400 + "px";
    }
    windowEl.style.transform = "none";

    this.startMonitoring();
  },

  closeTaskManager() {
    const windowEl = document.getElementById("taskmgr-window");
    const taskBtn = document.getElementById("taskmgr-task-btn");
    if (!windowEl || !taskBtn) return;
    windowEl.classList.add("hidden");
    taskBtn.classList.remove("active");
    taskBtn.classList.add("hidden");
  },

  startMonitoring() {
    if (this.monitorInterval) return;

    const update = () => {
      const taskManagerWindow = document.getElementById("taskmgr-window");
      if (
        !taskManagerWindow ||
        taskManagerWindow.classList.contains("hidden")
      ) {
        clearInterval(this.monitorInterval);
        this.monitorInterval = null;
        return;
      }

      if (window.chrome && chrome.system && chrome.system.cpu) {
        chrome.system.cpu.getInfo((info) => {
          let usage = 0;
          if (this.lastCpuInfo) {
            let totalDiff = 0;
            let kernelDiff = 0;
            let userDiff = 0;
            for (let i = 0; i < info.processors.length; i++) {
              const core = info.processors[i].usage;
              const lastCore = this.lastCpuInfo.processors[i].usage;
              totalDiff += core.total - lastCore.total;
              kernelDiff += core.kernel - lastCore.kernel;
              userDiff += core.user - lastCore.user;
            }
            usage =
              totalDiff > 0 ? ((kernelDiff + userDiff) / totalDiff) * 100 : 0;
          }
          this.lastCpuInfo = info;
          this.updatePerfData(usage, "cpu");
        });
      } else {
        this.updatePerfData(5 + Math.random() * 15, "cpu");
      }

      if (window.chrome && chrome.system && chrome.system.memory) {
        chrome.system.memory.getInfo((info) => {
          const usage =
            ((info.capacity - info.availableCapacity) / info.capacity) * 100;
          const usedMB = Math.round(
            (info.capacity - info.availableCapacity) / (1024 * 1024),
          );
          this.updatePerfData(usage, "mem", `${usedMB} MB`);
        });
      } else {
        const baseMem = 2048;
        const variance = Math.random() * 50;
        const memUsage = 40 + variance / 10;
        this.updatePerfData(
          memUsage,
          "mem",
          `${Math.round(baseMem + variance)} MB`,
        );
      }
    };

    update();
    this.monitorInterval = setInterval(update, 1000);
  },

  updatePerfData(val, type, labelOverride) {
    const history = type === "cpu" ? this.cpuHistory : this.memHistory;
    history.push(val);
    history.shift();

    const canvas = document.getElementById(`${type}-graph`);
    const label = document.getElementById(
      `${type === "cpu" ? "cpu-perc" : "mem-stat"}`,
    );

    if (!canvas || !label) return;

    if (labelOverride) {
      label.textContent = labelOverride;
    } else {
      label.textContent = Math.round(val) + "%";
    }

    this.drawGraph(canvas, history);
  },

  drawGraph(canvas, history) {
    const ctx = canvas.getContext("2d");
    const w = (canvas.width = canvas.offsetWidth);
    const h = (canvas.height = canvas.offsetHeight);

    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = "#004400";
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 10) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 10) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "#00ff00";
    ctx.lineWidth = 2;
    ctx.beginPath();
    const step = w / (history.length - 1);
    for (let i = 0; i < history.length; i++) {
      const x = i * step;
      const y = h - (history[i] / 100) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  },

  initRunDialog() {
    const runBtn = document.getElementById("start-run");
    const dialog = document.getElementById("run-dialog");
    const closeBtn = document.getElementById("run-close");
    const okBtn = document.getElementById("run-ok");
    const input = document.getElementById("run-input");
    if (!runBtn || !dialog || !closeBtn || !okBtn || !input) return;

    runBtn.onclick = () => {
      dialog.classList.remove("hidden");
      dialog.style.left = "20px";
      dialog.style.bottom = "40px";
      dialog.style.top = "auto";
      dialog.style.transform = "none";
      input.focus();
      document.getElementById("start-menu")?.classList.add("hidden");
    };

    const close = () => {
      dialog.classList.add("hidden");
      input.value = "";
    };

    closeBtn.onclick = close;

    const runCancelBtn = document.getElementById("run-cancel");
    if (runCancelBtn) runCancelBtn.onclick = close;

    okBtn.onclick = () => {
      let val = input.value.trim();
      if (val) {
        if (!val.includes("://")) val = "https://" + val;
        window.location.href = val;
      }
      close();
    };

    input.onkeydown = (e) => {
      if (e.key === "Enter") okBtn.onclick();
    };
  },
};
