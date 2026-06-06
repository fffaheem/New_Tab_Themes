(() => {
    'use strict';

    const STORAGE_KEYS = {
        settings: 'matrix_settings',
        search: 'matrix_search',
        configLoaded: 'matrix_config_loaded'
    };

    const DEFAULT_SETTINGS = {
        themeColor: '#00FF41',
        backgroundColor: '#000000',
        animationSpeed: 18,
        fontSize: 20,
        is24HourFormat: true,
        showSeconds: true
    };

    const DEFAULT_BOOKMARKS = [
        { id: '1', name: 'Google', url: 'https://google.com', group: '' },
        { id: '2', name: 'YouTube', url: 'https://youtube.com', group: '' }
    ];
    const DEFAULT_SEARCH_ENGINE = 'https://www.google.com/search?q=';

    const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const MONTHS = [
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December'
    ];

    const CHARACTERS =
        '123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_-+=/?.,<>~ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ';
    const CHARACTER_LIST = [...CHARACTERS];
    const URL_PATTERN = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-.\/?%&=]*)?$/i;

    const elements = {
        canvas: document.getElementById('matrixCanvas'),
        digitalClock: document.getElementById('digitalClock'),
        timeFormatToggle: document.getElementById('timeFormatToggle'),
        secondsToggle: document.getElementById('secondsToggle'),
        menuToggle: document.getElementById('menuToggle'),
        matrixControls: document.getElementById('matrixControls'),
        searchField: document.getElementById('passwordField'),
        colorPicker: document.getElementById('colorPicker'),
        bgColorPicker: document.getElementById('bgColorPicker'),
        speedSlider: document.getElementById('speedSlider'),
        fontSizeSlider: document.getElementById('fontSizeSlider'),
        speedValue: document.getElementById('speedValue'),
        fontSizeValue: document.getElementById('fontSizeValue'),
        loadConfigBtn: document.getElementById('loadConfigBtn'),
        importConfigBtn: document.getElementById('importConfigBtn'),
        exportConfigBtn: document.getElementById('exportConfigBtn'),
        configFileInput: document.getElementById('configFileInput'),
        bookmarksContainer: document.getElementById('bookmarksContainer'),
        bookmarksContainerGroup: document.getElementById('bookmarksContainerGroup'),
        addBookmarkBtn: document.getElementById('addBookmarkBtn'),
        bookmarkModal: document.getElementById('bookmarkModal'),
        bookmarkGroupModal: document.getElementById('bookmarkgroupModal'),
        cancelBookmarkBtn: document.getElementById('cancelBookmarkBtn'),
        cancelBookmarkGroupBtn: document.getElementById('cancelBookmarkGroupBtn'),
        saveBookmarkBtn: document.getElementById('saveBookmarkBtn'),
        saveBookmarkGroupBtn: document.getElementById('saveBookmarkGroupBtn'),
        bookmarkIdInput: document.getElementById('bookmarkId'),
        bookmarkNameInput: document.getElementById('bookmarkName'),
        bookmarkUrlInput: document.getElementById('bookmarkUrl'),
        modalTitle: document.getElementById('modalTitle'),
        groupNameInput: document.getElementById('groupName'),
        groupNameModal: document.getElementById('groupNameModal'),
        groupBookmarkBtn: document.getElementById('groupBookmarkBtn'),
        groupSelect: document.getElementById('modalselect'),
        deleteBookmarkGroupBtn: document.getElementById('deleteBookmarkGroupBtn')           ,
        deletegroupModal: document.getElementById('deletegroupModal'),
        cancelGroupBtnDelete: document.getElementById('cancelGroupBtnDelete'),
        deleteGrpOnly: document.getElementById('deleteGrpOnly'),
        deleteGrpAll: document.getElementById('deleteGrpAll'),
        addBookmarkGroupBtn: document.getElementById('addBookmarkGroupBtn'),
        search_icon: document.querySelector('.search-icon'),
        visibilityMenuBtn: document.getElementById('visibilityMenu'),
        bookmarkSection: document.querySelector(".bookmarks-section"),
    };

    const context = elements.canvas.getContext('2d');
    const groupIcon = elements.groupBookmarkBtn.querySelector('i');
    const faviconCanvas = document.createElement('canvas');
    const faviconContext = faviconCanvas.getContext('2d', { willReadFrequently: true });

    const state = {
        settings: { ...DEFAULT_SETTINGS },
        bookmarks: cloneBookmarks(DEFAULT_BOOKMARKS),
        searchEngine: DEFAULT_SEARCH_ENGINE,
        rainColor: DEFAULT_SETTINGS.themeColor,
        backgroundColor: DEFAULT_SETTINGS.backgroundColor,
        backgroundColorRgb: '0, 0, 0',
        columns: 0,
        drops: [],
        frameCount: 0,
        clockTimeout: null
    };

    let resizeFrame = null;
    let draggedItem = null;
    let suppressClickUntil = 0;

    function cloneBookmarks(bookmarks) {
        return bookmarks.map((bookmark) => ({ ...bookmark }));
    }

    function hasChromeBookmarks() {
        return typeof chrome !== 'undefined' && Boolean(chrome.bookmarks);
    }

    async function fetchChromeBookmarks() {
        if (!hasChromeBookmarks()) return cloneBookmarks(DEFAULT_BOOKMARKS);
        
        return new Promise((resolve) => {
            chrome.bookmarks.getSubTree("1", (results) => {
                if (chrome.runtime.lastError || !results || !results.length) {
                    resolve([]);
                    return;
                }
                
                const bookmarks = [];
                const children = results[0].children || [];
                
                function processNode(node, currentGroup) {
                    if (node.url) {
                        bookmarks.push({
                            id: node.id,
                            name: node.title,
                            url: node.url,
                            group: currentGroup
                        });
                    } else if (node.children && node.children.length) {
                        // Always use top-level folder name as the group (flatten deeper nesting)
                        const groupName = currentGroup || node.title;
                        node.children.forEach(child => processNode(child, groupName));
                    }
                }
                
                children.forEach(child => processNode(child, ""));
                resolve(bookmarks);
            });
        });
    }
    
    async function findFolderIdByName(folderName) {
        if (!folderName || !hasChromeBookmarks()) return null;
        return new Promise((resolve) => {
            chrome.bookmarks.getChildren("1", (children) => {
                if (chrome.runtime.lastError || !children) { resolve(null); return; }
                const folder = children.find(c => !c.url && c.title === folderName);
                resolve(folder ? folder.id : null);
            });
        });
    }

    async function getOrCreateFolderId(folderName) {
        if (!folderName || !hasChromeBookmarks()) return "1";
        return new Promise((resolve) => {
            chrome.bookmarks.getChildren("1", (children) => {
                if (chrome.runtime.lastError || !children) { resolve("1"); return; }
                const folder = children.find(c => !c.url && c.title === folderName);
                if (folder) {
                    resolve(folder.id);
                } else {
                    chrome.bookmarks.create({ parentId: "1", title: folderName }, (newFolder) => {
                        if (chrome.runtime.lastError || !newFolder) { resolve("1"); return; }
                        resolve(newFolder.id);
                    });
                }
            });
        });
    }

    function hasChromeStorage() {
        return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
    }

    function hasChromeRuntime() {
        return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.getURL);
    }

    function canReadPackageDirectory() {
        return typeof chrome !== 'undefined' && typeof chrome.runtime?.getPackageDirectoryEntry === 'function';
    }

    function packageFileExists(path) {
        if (!canReadPackageDirectory()) {
            return Promise.resolve(true);
        }

        return new Promise((resolve) => {
            chrome.runtime.getPackageDirectoryEntry((root) => {
                if (chrome.runtime.lastError || !root?.getFile) {
                    resolve(true);
                    return;
                }

                root.getFile(path, {}, () => resolve(true), () => resolve(false));
            });
        });
    }

    function parseStoredValue(value) {
        if (value === null || value === undefined) {
            return undefined;
        }

        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }

    async function readStorage(keys) {
        if (hasChromeStorage()) {
            return chrome.storage.local.get(keys);
        }

        return keys.reduce((storedValues, key) => {
            storedValues[key] = parseStoredValue(localStorage.getItem(key));
            return storedValues;
        }, {});
    }

    async function writeStorage(values) {
        if (hasChromeStorage()) {
            await chrome.storage.local.set(values);
            return;
        }

        Object.entries(values).forEach(([key, value]) => {
            localStorage.setItem(key, JSON.stringify(value));
        });
    }

    async function readConfigFile() {
        try {
            if (!(await packageFileExists('config.json'))) {
                return null;
            }

            const configUrl = hasChromeRuntime() ? chrome.runtime.getURL('config.json') : 'config.json';
            const response = await fetch(configUrl);
            if (!response.ok) {
                return null;
            }

            const configText = await response.text();
            if (!configText.trim()) {
                return null;
            }

            const config = JSON.parse(configText);
            return config && typeof config === 'object' && !Array.isArray(config) ? config : null;
        } catch {
            return null;
        }
    }

    function getConfigData(config) {
        const configSettings =
            config?.matrix_settings && typeof config.matrix_settings === 'object' && !Array.isArray(config.matrix_settings)
                ? config.matrix_settings
                : {};
        const configSearch =
            typeof config?.matrix_search === 'string' && config.matrix_search.trim()
                ? config.matrix_search
                : DEFAULT_SEARCH_ENGINE;
        const configBookmarks = Array.isArray(config?.matrix_bookmarks) ? cloneBookmarks(config.matrix_bookmarks) : [];

        return {
            settings: { ...DEFAULT_SETTINGS, ...configSettings },
            search: configSearch,
            bookmarks: configBookmarks
        };
    }

    async function clearAllBookmarksBar() {
        if (!hasChromeBookmarks()) return;
        return new Promise((resolve) => {
            chrome.bookmarks.getChildren("1", (children) => {
                if (chrome.runtime.lastError || !children || !children.length) { resolve(); return; }
                let removed = 0;
                const total = children.length;
                children.forEach(child => {
                    // Use removeTree for folders, remove for bookmarks
                    const removeFn = child.url ? chrome.bookmarks.remove : chrome.bookmarks.removeTree;
                    removeFn.call(chrome.bookmarks, child.id, () => {
                        if (chrome.runtime.lastError) {
                            console.warn('Could not remove:', child.title, chrome.runtime.lastError.message);
                        }
                        removed++;
                        if (removed === total) resolve();
                    });
                });
            });
        });
    }

    async function applyConfig(config, wipeFirst = false) {
        const configData = getConfigData(config);

        state.settings = configData.settings;
        state.searchEngine = configData.search;

        await writeStorage({
            [STORAGE_KEYS.settings]: state.settings,
            [STORAGE_KEYS.search]: state.searchEngine
        });
        
        if (hasChromeBookmarks()) {
            if (wipeFirst) {
                // Destructive reset: clear everything from Bookmarks Bar first
                await clearAllBookmarksBar();
            }

            if (configData.bookmarks && configData.bookmarks.length > 0) {
                for (const bookmark of configData.bookmarks) {
                    const parentId = await getOrCreateFolderId(bookmark.group);
                    await new Promise((resolve) => {
                        chrome.bookmarks.create({ parentId, title: bookmark.name, url: bookmark.url }, (result) => {
                            if (chrome.runtime.lastError) { resolve(null); return; }
                            resolve(result);
                        });
                    });
                }
            }
            state.bookmarks = await fetchChromeBookmarks();
        }
    }

    async function loadInitialConfigOnce() {
        const stored = await readStorage([
            STORAGE_KEYS.configLoaded,
            STORAGE_KEYS.settings,
            STORAGE_KEYS.search
        ]);

        if (stored[STORAGE_KEYS.configLoaded]) {
            return;
        }

        if (stored[STORAGE_KEYS.settings] || stored[STORAGE_KEYS.search]) {
            await writeStorage({ [STORAGE_KEYS.configLoaded]: true });
            return;
        }

        // First run: apply config silently without wiping (Bookmarks Bar is presumably already set up)
        await applyConfig(await readConfigFile(), false);
        await writeStorage({ [STORAGE_KEYS.configLoaded]: true });
    }

    async function exportConfig() {
        // Build bookmarks from current Chrome Bookmarks Bar
        const currentBookmarks = hasChromeBookmarks() ? await fetchChromeBookmarks() : state.bookmarks;

        const config = {
            matrix_search: state.searchEngine,
            matrix_settings: { ...state.settings },
            matrix_bookmarks: currentBookmarks.map(({ name, url, group }) => ({
                name,
                url,
                group: group || ''
            }))
        };

        const json = JSON.stringify(config, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'config.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    async function loadConfigFromMenu() {
        const config = await readConfigFile();
        if (!config) {
            alert('⚠️ Could not read config.json.\nMake sure the file exists and is valid JSON.');
            return;
        }
        await confirmAndApplyConfig(config, 'bundled config.json');
    }

    function readFileAsJson(file) {
        return new Promise((resolve, reject) => {
            if (!file) { reject(new Error('No file selected')); return; }
            if (file.size > 5 * 1024 * 1024) { reject(new Error('File too large (max 5 MB)')); return; }
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const parsed = JSON.parse(e.target.result);
                    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
                        reject(new Error('File does not contain a valid JSON object'));
                    } else {
                        resolve(parsed);
                    }
                } catch {
                    reject(new Error('File is not valid JSON'));
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file);
        });
    }

    async function confirmAndApplyConfig(config, source) {
        const configData = getConfigData(config);
        const configBookmarkCount = configData.bookmarks.length;

        // Count what's currently in the Bookmarks Bar
        let currentCount = 0;
        if (hasChromeBookmarks()) {
            currentCount = await new Promise(resolve => {
                chrome.bookmarks.getChildren("1", (children) => {
                    if (chrome.runtime.lastError || !children) { resolve(0); return; }
                    resolve(children.length);
                });
            });
        }

        const warningLines = [
            `⚠️  WARNING: Loading from ${source} will REPLACE all your bookmarks!`,
            '',
            currentCount > 0
                ? `  • ${currentCount} item(s) currently in your Bookmarks Bar will be permanently deleted.`
                : '  • Your Bookmarks Bar is already empty.',
            configBookmarkCount > 0
                ? `  • ${configBookmarkCount} bookmark(s) from the config will be added.`
                : '  • The config has no bookmarks — your Bookmarks Bar will be left empty.',
            '',
            'This cannot be undone. Continue?'
        ];

        if (!confirm(warningLines.join('\n'))) {
            return;
        }

        await applyConfig(config, true /* wipeFirst */);
        applySettings();
        renderBookmarks();
    }

    async function importConfigFromFile() {
        return new Promise((resolve) => {
            const input = elements.configFileInput;
            // Reset so the same file can be picked again
            input.value = '';

            input.onchange = async () => {
                const file = input.files[0];
                if (!file) { resolve(); return; }

                let config;
                try {
                    config = await readFileAsJson(file);
                } catch (err) {
                    alert(`⚠️ Could not read "${file.name}":\n${err.message}`);
                    resolve();
                    return;
                }

                await confirmAndApplyConfig(config, `"${file.name}"`);
                resolve();
            };

            input.click();
        });
    }

    async function loadDataFromStorage() {
        const stored = await readStorage([STORAGE_KEYS.settings, STORAGE_KEYS.search]);

        state.settings = {
            ...DEFAULT_SETTINGS,
            ...(stored[STORAGE_KEYS.settings] || {})
        };
        state.searchEngine =
            typeof stored[STORAGE_KEYS.search] === 'string' && stored[STORAGE_KEYS.search].trim()
                ? stored[STORAGE_KEYS.search]
                : DEFAULT_SEARCH_ENGINE;
                
        state.bookmarks = await fetchChromeBookmarks();
    }

    function saveSettingsToStorage() {
        writeStorage({ [STORAGE_KEYS.settings]: state.settings });
    }

    function hexToRgb(hex) {
        if (hex.length === 4) {
            const [r, g, b] = [hex[1], hex[2], hex[3]].map((value) => parseInt(value + value, 16));
            return `${r}, ${g}, ${b}`;
        }

        if (hex.length === 7) {
            const [r, g, b] = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((value) =>
                parseInt(value, 16)
            );
            return `${r}, ${g}, ${b}`;
        }

        return '0, 0, 0';
    }

    function updateThemeColor(color) {
        state.rainColor = color;
        document.documentElement.style.setProperty('--theme-color', color);
        document.documentElement.style.setProperty('--theme-color-rgb', hexToRgb(color));
    }

    function updateBackgroundColor(color) {
        state.backgroundColor = color;
        state.backgroundColorRgb = hexToRgb(color);
        document.documentElement.style.setProperty('--bg-color', color);
        document.documentElement.style.setProperty('--bg-color-rgb', state.backgroundColorRgb);
    }

    function resetRain() {
        state.columns = Math.ceil(elements.canvas.width / state.settings.fontSize);
        state.drops = Array(state.columns).fill(1);
    }

    function clearCanvas() {
        context.fillStyle = state.backgroundColor;
        context.fillRect(0, 0, elements.canvas.width, elements.canvas.height);
    }

    function resizeCanvas() {
        elements.canvas.width = window.innerWidth;
        elements.canvas.height = window.innerHeight;
        resetRain();
        clearCanvas();
    }

    function drawMatrix() {
        const { backgroundColorRgb, rainColor, drops } = state;
        const { fontSize } = state.settings;

        context.fillStyle = `rgba(${backgroundColorRgb}, 0.05)`;
        context.fillRect(0, 0, elements.canvas.width, elements.canvas.height);
        context.font = `${fontSize}px 'Courier New', Courier, monospace`;

        for (let index = 0; index < drops.length; index += 1) {
            const x = index * fontSize;
            const y = drops[index] * fontSize;

            context.fillStyle = `rgba(${backgroundColorRgb}, 0.7)`;
            context.fillRect(x, y, fontSize, fontSize);

            if (y >= 0) {
                context.fillStyle = rainColor;
                context.fillText(CHARACTER_LIST[Math.floor(Math.random() * CHARACTER_LIST.length)], x, y);
            }

            if (y > elements.canvas.height && Math.random() > 0.975) {
                drops[index] = -Math.floor(Math.random() * 10);
            }

            drops[index] += 1;
        }
    }

    function animate() {
        state.frameCount += 1;

        if (state.frameCount % (21 - state.settings.animationSpeed) === 0) {
            drawMatrix();
        }

        requestAnimationFrame(animate);
    }

    function updateClock() {
        const now = new Date();
        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        let period = '';

        if (!state.settings.is24HourFormat) {
            period = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12 || 12;
        }

        const formattedHours = String(hours).padStart(2, '0');
        const baseTime = state.settings.showSeconds
            ? `${formattedHours}:${minutes}:${seconds}`
            : `${formattedHours}:${minutes}`;
        const timeString = state.settings.is24HourFormat ? baseTime : `${baseTime} ${period}`;
        const dateString = `${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()} ${DAYS[now.getDay()]}`;

        elements.digitalClock.innerHTML = `
            <div class="time-string">${timeString}</div>
            <div class="date-string">${dateString}</div>
        `;

        if (state.clockTimeout) {
            clearTimeout(state.clockTimeout);
        }

        let delay = state.settings.showSeconds
            ? 1000 - now.getMilliseconds()
            : (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

        if (delay <= 0) {
            delay = state.settings.showSeconds ? 1000 : 60000;
        }

        state.clockTimeout = setTimeout(updateClock, delay);
    }

    function updateFavicon(color) {
        faviconCanvas.width = 32;
        faviconCanvas.height = 32;
        faviconContext.clearRect(0, 0, 32, 32);
        faviconContext.fillStyle = color;
        faviconContext.font = '900 24px "Font Awesome 6 Free"';
        faviconContext.textAlign = 'center';
        faviconContext.textBaseline = 'middle';
        faviconContext.fillText('\uf120', 16, 16);

        let link = document.getElementById('dynamic-favicon');
        if (!link) {
            link = document.createElement('link');
            link.id = 'dynamic-favicon';
            link.rel = 'icon';
            link.type = 'image/png';
            document.head.appendChild(link);
        }
        link.href = faviconCanvas.toDataURL('image/png');

        if (typeof chrome !== 'undefined' && chrome.action?.setIcon) {
            try {
                chrome.action.setIcon({ imageData: faviconContext.getImageData(0, 0, 32, 32) });
            } catch (error) {
                console.error('Could not set extension icon.', error);
            }
        }
    }

    function applySettings() {
        const { settings } = state;

        elements.colorPicker.value = settings.themeColor;
        elements.speedSlider.value = settings.animationSpeed;
        elements.speedValue.textContent = settings.animationSpeed;
        elements.fontSizeSlider.value = settings.fontSize;
        elements.fontSizeValue.textContent = settings.fontSize;
        elements.timeFormatToggle.checked = !settings.is24HourFormat;
        elements.secondsToggle.checked = settings.showSeconds;

        updateThemeColor(settings.themeColor);

        if (elements.bgColorPicker) {
            elements.bgColorPicker.value = settings.backgroundColor || DEFAULT_SETTINGS.backgroundColor;
            updateBackgroundColor(elements.bgColorPicker.value);
        }

        resetRain();
        clearCanvas();
        updateClock();

        if (document.fonts?.ready) {
            document.fonts.ready.then(() => updateFavicon(settings.themeColor));
        } else {
            updateFavicon(settings.themeColor);
        }
    }

    function normalizeGroup(group) {
        return String(group ?? '').trim();
    }

    function isUngrouped(group) {
        const normalized = normalizeGroup(group).toLowerCase();
        return !normalized || normalized === 'none' || normalized === 'null';
    }

    function getDistinctGroups() {
        return [...new Set(state.bookmarks.map(({ group }) => normalizeGroup(group)).filter((group) => !isUngrouped(group)))];
    }

    function getBookmarkGroup(bookmark) {
        return normalizeGroup(bookmark.group);
    }

    function getTopLevelItems() {
        const seenGroups = new Set();
        const items = [];

        state.bookmarks.forEach((bookmark) => {
            const group = getBookmarkGroup(bookmark);

            if (isUngrouped(group)) {
                items.push({ type: 'bookmark', id: bookmark.id });
                return;
            }

            if (!seenGroups.has(group)) {
                seenGroups.add(group);
                items.push({ type: 'group', id: group });
            }
        });

        return items;
    }

    function findTopLevelItemFromElement(element) {
        if (!element) {
            return null;
        }

        if (element.classList.contains('open-folder')) {
            return { type: 'group', id: element.dataset.value };
        }

        if (element.classList.contains('bookmark-item')) {
            return { type: 'bookmark', id: element.dataset.id };
        }

        return null;
    }

    async function swapTopLevelItems(source, target) {
        if (!target || !hasChromeBookmarks()) return false;
        
        // For groups: look up the Chrome folder ID
        const getNodeId = async (item) => {
            if (item.type === 'group') {
                const fid = await findFolderIdByName(item.id);
                return fid;
            }
            return item.id;
        };
        
        const sourceNodeId = await getNodeId(source);
        const targetNodeId = await getNodeId(target);
        
        if (!sourceNodeId || !targetNodeId || sourceNodeId === targetNodeId) return false;
        
        // Get all direct children of Bookmarks Bar to find proper index
        return new Promise((resolve) => {
            chrome.bookmarks.getChildren("1", (children) => {
                if (chrome.runtime.lastError || !children) { resolve(false); return; }
                const targetNode = children.find(c => c.id === targetNodeId);
                if (!targetNode) { resolve(false); return; }
                chrome.bookmarks.move(sourceNodeId, { parentId: "1", index: targetNode.index }, async () => {
                    if (chrome.runtime.lastError) { resolve(false); return; }
                    state.bookmarks = await fetchChromeBookmarks();
                    resolve(true);
                });
            });
        });
    }

    async function swapGroupBookmarks(sourceId, targetId, group) {
        if (!targetId || !hasChromeBookmarks()) return false;
        
        return new Promise((resolve) => {
            chrome.bookmarks.get(targetId, (nodes) => {
                if (chrome.runtime.lastError || !nodes || !nodes[0]) { resolve(false); return; }
                chrome.bookmarks.move(sourceId, { parentId: nodes[0].parentId, index: nodes[0].index }, async () => {
                    if (chrome.runtime.lastError) { resolve(false); return; }
                    state.bookmarks = await fetchChromeBookmarks();
                    resolve(true);
                });
            });
        });
    }

    function setDropTarget(target) {
        document.querySelectorAll('.bookmark-item.drop-target').forEach((item) => item.classList.remove('drop-target'));
        target?.classList.add('drop-target');
    }

    function createBookmarkElement(bookmark) {
        const link = document.createElement('a');
        const icon = document.createElement('i');
        const label = document.createElement('span');
        const actions = document.createElement('div');
        const editButton = document.createElement('button');
        const deleteButton = document.createElement('button');

        link.href = bookmark.url;
        link.className = 'bookmark-item';
        link.draggable = true;
        link.dataset.id = bookmark.id;
        link.dataset.type = 'bookmark';
        link.dataset.group = normalizeGroup(bookmark.group);

        icon.className = 'fas fa-globe favicon';
        label.textContent = bookmark.name;

        actions.className = 'bookmark-actions';

        editButton.className = 'edit-btn';
        editButton.dataset.id = bookmark.id;
        editButton.title = 'Edit';
        editButton.innerHTML = '<i class="fas fa-pencil-alt"></i>';

        deleteButton.className = 'delete-btn';
        deleteButton.dataset.id = bookmark.id;
        deleteButton.title = 'Delete';
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';

        actions.append(editButton, deleteButton);
        link.append(icon, label, actions);
        return link;
    }

    function createGroupElement(group) {
        const folder = document.createElement('div');
        const icon = document.createElement('i');
        const label = document.createElement('span');

        folder.className = 'bookmark-item open-folder';
        folder.draggable = true;
        folder.dataset.type = 'group';
        folder.dataset.value = group;

        icon.className = 'fa fa-folder';
        icon.setAttribute('aria-hidden', 'true');
        label.textContent = group;

        folder.append(icon, label);
        return folder;
    }

    function renderBookmarks() {
        const fragment = document.createDocumentFragment();

        getTopLevelItems().forEach((item) => {
            if (item.type === 'group') {
                fragment.appendChild(createGroupElement(item.id));
                return;
            }

            const bookmark = state.bookmarks.find(({ id }) => id === item.id);
            if (bookmark) {
                fragment.appendChild(createBookmarkElement(bookmark));
            }
        });

        elements.bookmarksContainer.replaceChildren(fragment);
    }

    function renderGroupBookmarks(group) {
        const groupedBookmarks = state.bookmarks.filter((bookmark) => getBookmarkGroup(bookmark) === normalizeGroup(group));

        if (!groupedBookmarks.length) {
            closeGroupModal();
            return;
        }

        const fragment = document.createDocumentFragment();
        groupedBookmarks.forEach((bookmark) => fragment.appendChild(createBookmarkElement(bookmark)));
        elements.deleteBookmarkGroupBtn.dataset.value = group;
        elements.addBookmarkGroupBtn.dataset.value = group;
        elements.groupNameModal.dataset.value = group;
        elements.groupNameModal.value = group;
        elements.bookmarksContainerGroup.replaceChildren(fragment);
        elements.bookmarkGroupModal.classList.add('active');
    }

    function renderGroupOptions() {
        const fragment = document.createDocumentFragment();
        const emptyOption = document.createElement('li');
        emptyOption.dataset.value = 'none';
        emptyOption.textContent = 'None';
        fragment.appendChild(emptyOption);

        getDistinctGroups().forEach((group) => {
            const option = document.createElement('li');
            option.dataset.value = group;
            option.textContent = group;
            fragment.appendChild(option);
        });

        elements.groupSelect.replaceChildren(fragment);
    }

    function setGroupInputState(group) {
        const normalizedGroup = normalizeGroup(group);
        const grouped = !isUngrouped(normalizedGroup);

        elements.groupNameInput.dataset.value = grouped ? normalizedGroup : '';
        elements.groupNameInput.value = grouped ? normalizedGroup : '';
        elements.groupNameInput.disabled = grouped;
        elements.groupNameInput.style.opacity = grouped ? 0.5 : 1;
    }

    function openBookmarkModal(id = null) {
        if (id) {
            const bookmark = state.bookmarks.find((item) => item.id === id);
            if (!bookmark) {
                return;
            }

            elements.bookmarkIdInput.value = bookmark.id;
            elements.bookmarkNameInput.value = bookmark.name;
            elements.bookmarkUrlInput.value = bookmark.url;
            setGroupInputState(bookmark.group);
            elements.modalTitle.textContent = 'Edit Bookmark';
        } else {
            elements.bookmarkIdInput.value = '';
            elements.bookmarkNameInput.value = '';
            elements.bookmarkUrlInput.value = '';
            setGroupInputState('');
            elements.modalTitle.textContent = 'Add Bookmark';
        }

        renderGroupOptions();
        elements.saveBookmarkBtn.dataset.value = "add_from_outside";
        elements.groupBookmarkBtn.style.display = "";
        elements.groupSelect.style.display = "";
        elements.bookmarkModal.classList.add('active');
        elements.bookmarkNameInput.focus();
    }

    function addBookmarkModalFromGrp(grp) {
        elements.bookmarkIdInput.value = '';
        elements.bookmarkNameInput.value = '';
        elements.bookmarkUrlInput.value = '';
        setGroupInputState(grp);
        elements.modalTitle.textContent = 'Add Bookmark';
        elements.groupBookmarkBtn.style.display = "none";
        elements.groupSelect.style.display = "none";
        elements.bookmarkModal.classList.add('active');
        elements.bookmarkNameInput.focus();
        elements.saveBookmarkBtn.dataset.value = "add_from_inside";
    }
  
    function closeBookmarkModal() {
        elements.bookmarkModal.classList.remove('active');
        elements.groupSelect.classList.remove('modalgroupactive');
        groupIcon.classList.add('fa-chevron-down');
        groupIcon.classList.remove('fa-chevron-up');
    }

    function openGroupModal(group) {
        renderGroupBookmarks(group);
    }

    function closeGroupModal() {
        elements.bookmarkGroupModal.classList.remove('active');
    }

    function addGroupModal(d) {
      addBookmarkModalFromGrp(d.target.dataset.value);
    }
  
    function openDeleteGroupModal(d) {
      elements.deletegroupModal.classList.add('active');
      elements.deleteGrpOnly.dataset.value = d.target.dataset.value;
      elements.deleteGrpAll.dataset.value = d.target.dataset.value;
    }

    function closeDeleteGroupModal() {
        elements.deletegroupModal.classList.remove('active');
    }

    async function deleteGroupOnly() {
      if (!confirm("The group will be removed, and your bookmarks will be moved out of the group.\nAre you sure?")) {
        return;
      }
      const group = elements.deleteGrpOnly.dataset.value;
      if (!hasChromeBookmarks()) return;
      const folderId = await findFolderIdByName(group);
      if (!folderId) {
          state.bookmarks = await fetchChromeBookmarks();
          closeDeleteGroupModal();
          closeGroupModal();
          renderBookmarks();
          return;
      }
      
      await new Promise(resolve => {
          chrome.bookmarks.getChildren(folderId, (children) => {
              if (chrome.runtime.lastError || !children || children.length === 0) { resolve(); return; }
              let moved = 0;
              children.forEach(child => {
                  chrome.bookmarks.move(child.id, { parentId: "1" }, () => {
                      moved++;
                      if (moved === children.length) resolve();
                  });
              });
          });
      });
      
      // Use removeTree to safely delete the now-empty folder
      await new Promise(resolve => chrome.bookmarks.removeTree(folderId, () => {
          if (chrome.runtime.lastError) { console.warn('Could not remove folder:', chrome.runtime.lastError.message); }
          resolve();
      }));
      
      state.bookmarks = await fetchChromeBookmarks();
      closeDeleteGroupModal();
      closeGroupModal();
      renderBookmarks();
    }

    async function deleteGroupAll() {
      if (!confirm("The group and every bookmark inside it will be completely erased.\nAre you sure?")) {
        return;
      }
      const group = elements.deleteGrpOnly.dataset.value;
      if (!hasChromeBookmarks()) return;
      const folderId = await findFolderIdByName(group);
      
      if (folderId) {
          await new Promise(resolve => chrome.bookmarks.removeTree(folderId, () => {
              if (chrome.runtime.lastError) { console.warn('Could not remove folder tree:', chrome.runtime.lastError.message); }
              resolve();
          }));
      }
      
      state.bookmarks = await fetchChromeBookmarks();
      closeDeleteGroupModal();
      closeGroupModal();
      renderBookmarks();
    }

    async function saveBookmark() {
        const id = elements.bookmarkIdInput.value;
        const name = elements.bookmarkNameInput.value.trim();
        let url = elements.bookmarkUrlInput.value.trim();
        const group = elements.groupNameInput.value.trim();

        if (!name || !url) {
            alert('Please enter both name and URL');
            return;
        }

        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = `https://${url}`;
        }
        
        if (!hasChromeBookmarks()) return;

        let previousGroup = '';

        if (id) {
            const index = state.bookmarks.findIndex((bookmark) => bookmark.id === id);
            if (index !== -1) {
                previousGroup = state.bookmarks[index].group;
            }
            await new Promise(resolve => chrome.bookmarks.update(id, { title: name, url: url }, (result) => {
                if (chrome.runtime.lastError) { console.error('Update failed:', chrome.runtime.lastError.message); }
                resolve(result);
            }));
            if (normalizeGroup(previousGroup) !== normalizeGroup(group)) {
                const newParentId = await getOrCreateFolderId(group);
                await new Promise(resolve => chrome.bookmarks.move(id, { parentId: newParentId }, (result) => {
                    if (chrome.runtime.lastError) { console.error('Move failed:', chrome.runtime.lastError.message); }
                    resolve(result);
                }));
            }
        } else {
            const parentId = await getOrCreateFolderId(group);
            await new Promise(resolve => chrome.bookmarks.create({ parentId, title: name, url }, (result) => {
                if (chrome.runtime.lastError) { console.error('Create failed:', chrome.runtime.lastError.message); }
                resolve(result);
            }));
        }

        state.bookmarks = await fetchChromeBookmarks();
        renderBookmarks();
        closeBookmarkModal();

        if (elements.saveBookmarkBtn.dataset.value === "add_from_inside") {
          renderGroupBookmarks(group);
          return;
        }
        
        if (elements.bookmarkGroupModal.classList.contains('active')) {
            renderGroupBookmarks(previousGroup || group);
        }
    }

    async function renameGroup() {
        const currentGroup = elements.groupNameModal.dataset.value;
        const nextGroup = elements.groupNameModal.value.trim();

        if (!nextGroup) {
            alert('Please enter Name');
            return;
        }

        if (!hasChromeBookmarks()) return;
        
        // Look up the folder by its CURRENT name (don't create a new one)
        const folderId = await findFolderIdByName(currentGroup);
        if (!folderId) {
            console.error('Could not find folder to rename:', currentGroup);
            return;
        }
        await new Promise(resolve => chrome.bookmarks.update(folderId, { title: nextGroup }, (result) => {
            if (chrome.runtime.lastError) { console.error('Rename failed:', chrome.runtime.lastError.message); }
            resolve(result);
        }));

        state.bookmarks = await fetchChromeBookmarks();
        renderBookmarks();
        closeGroupModal();
    }

    async function deleteBookmark(id) {
        if (!confirm('Are you sure you want to delete this bookmark?')) {
            return;
        }

        const bookmark = state.bookmarks.find((item) => item.id === id);
        if (!bookmark || !hasChromeBookmarks()) {
            return;
        }

        await new Promise(resolve => chrome.bookmarks.remove(id, () => {
            if (chrome.runtime.lastError) { console.error('Delete failed:', chrome.runtime.lastError.message); }
            resolve();
        }));
        state.bookmarks = await fetchChromeBookmarks();
        renderBookmarks();

        if (elements.bookmarkGroupModal.classList.contains('active')) {
            renderGroupBookmarks(bookmark.group);
        }
    }

    function handleBookmarkContainerClick(event) {
        if (Date.now() < suppressClickUntil) {
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        const editButton = event.target.closest('.edit-btn');
        if (editButton) {
            event.preventDefault();
            event.stopPropagation();
            openBookmarkModal(editButton.dataset.id);
            return;
        }

        const deleteButton = event.target.closest('.delete-btn');
        if (deleteButton) {
            event.preventDefault();
            event.stopPropagation();
            deleteBookmark(deleteButton.dataset.id);
            return;
        }

        const folder = event.target.closest('.open-folder');
        if (folder) {
            event.preventDefault();
            event.stopPropagation();
            openGroupModal(folder.dataset.value);
        }
    }

    function handleBookmarkDragStart(event) {
        const item = event.target.closest('.bookmark-item');
        if (!item) {
            return;
        }

        const insideGroup = event.currentTarget === elements.bookmarksContainerGroup;
        const itemData = insideGroup
            ? { type: 'bookmark', id: item.dataset.id, group: item.dataset.group, scope: 'group' }
            : { ...findTopLevelItemFromElement(item), scope: 'top' };

        if (!itemData?.id) {
            return;
        }

        draggedItem = itemData;
        suppressClickUntil = 0;
        item.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', itemData.id);
    }

    function handleBookmarkDragOver(event) {
        if (!draggedItem) {
            return;
        }

        const insideGroup = event.currentTarget === elements.bookmarksContainerGroup;
        if ((insideGroup && draggedItem.scope !== 'group') || (!insideGroup && draggedItem.scope !== 'top')) {
            return;
        }

        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        const targetItem = event.target.closest('.bookmark-item');
        const containedTarget = targetItem && event.currentTarget.contains(targetItem) ? targetItem : null;

        setDropTarget(containedTarget);
    }

    async function handleBookmarkDrop(event) {
        if (!draggedItem) {
            return;
        }

        const insideGroup = event.currentTarget === elements.bookmarksContainerGroup;
        if ((insideGroup && draggedItem.scope !== 'group') || (!insideGroup && draggedItem.scope !== 'top')) {
            return;
        }

        event.preventDefault();
        const targetElement = event.target.closest('.bookmark-item');

        // Snapshot draggedItem NOW before any await —
        // the browser fires dragend (which nulls draggedItem) concurrently
        // with our async Chrome API calls, causing draggedItem.group to throw.
        const snapshot = { ...draggedItem };

        let changed = false;

        if (insideGroup) {
            const targetId = targetElement?.dataset.id || null;
            changed = await swapGroupBookmarks(snapshot.id, targetId, snapshot.group);
        } else {
            changed = await swapTopLevelItems(snapshot, findTopLevelItemFromElement(targetElement));
        }

        if (!changed) {
            return;
        }

        suppressClickUntil = Date.now() + 250;
        renderBookmarks();

        if (insideGroup) {
            renderGroupBookmarks(snapshot.group);
        }
    }

    function handleBookmarkDragEnd() {
        document.querySelectorAll('.bookmark-item.dragging').forEach((item) => item.classList.remove('dragging'));
        setDropTarget(null);
        draggedItem = null;
    }

    const SearchButton = {
        enable() {
            elements.search_icon.classList.add("typed");
            elements.searchField.classList.add("input-typed");
    
            elements.search_icon.onclick = () => {
                handleEnter({ key: "Enter" });
            };
        },
    
        disable() {
            elements.search_icon.classList.remove("typed");
            elements.searchField.classList.remove("input-typed");
    
            elements.search_icon.onclick = null;
        }
    };
  
    function handleSearchMouse(event) {
      if (event.type == "paste") {
        SearchButton.enable();
        return;
      }
      // for cut
      const cutText = window.getSelection().toString();
      if (cutText === elements.searchField.value) {
        SearchButton.disable();
      }
    }

    function handleEnter(event) {  
      if (event.key !== 'Enter') {
          return;
      }

      const query = elements.searchField.value.trim();
      if (!query) {
          return;
      }

      if (URL_PATTERN.test(query) && !query.includes(' ')) {
          window.location.href =
              query.startsWith('http://') || query.startsWith('https://') ? query : `https://${query}`;
          return;
      }

      window.location.href = `${state.searchEngine}${encodeURIComponent(query)}`;
    
    }
  
    function handleSearchInput(event) {
        if (elements.searchField.value.length < 1) {
          SearchButton.disable();
        } else {
          SearchButton.enable();
        }
    }

    function toggleGroupSelect() {
        elements.groupSelect.classList.toggle('modalgroupactive');
        groupIcon.classList.toggle('fa-chevron-down');
        groupIcon.classList.toggle('fa-chevron-up');
    }

    function selectGroupOption(event) {
        const option = event.target.closest('li');
        if (!option) {
            return;
        }

        const selectedGroup = option.dataset.value;
        setGroupInputState(selectedGroup);

        if (isUngrouped(selectedGroup)) {
            toggleGroupSelect();
        }
    }

    function bindEvents() {
        elements.colorPicker.addEventListener('input', (event) => {
            updateThemeColor(event.target.value);
            updateFavicon(event.target.value);
        });

        elements.colorPicker.addEventListener('change', (event) => {
            state.settings.themeColor = event.target.value;
            saveSettingsToStorage();
            updateFavicon(event.target.value);
        });

        elements.bgColorPicker?.addEventListener('input', (event) => {
            updateBackgroundColor(event.target.value);
        });

        elements.bgColorPicker?.addEventListener('change', (event) => {
            state.settings.backgroundColor = event.target.value;
            saveSettingsToStorage();
        });

        elements.speedSlider.addEventListener('input', (event) => {
            state.settings.animationSpeed = Number.parseInt(event.target.value, 10);
            elements.speedValue.textContent = state.settings.animationSpeed;
        });

        elements.speedSlider.addEventListener('change', saveSettingsToStorage);

        elements.fontSizeSlider.addEventListener('input', (event) => {
            state.settings.fontSize = Number.parseInt(event.target.value, 10);
            elements.fontSizeValue.textContent = state.settings.fontSize;
            resetRain();
            clearCanvas();
        });

        elements.fontSizeSlider.addEventListener('change', saveSettingsToStorage);

        elements.loadConfigBtn?.addEventListener('click', async () => {
            elements.loadConfigBtn.disabled = true;
            try {
                await loadConfigFromMenu();
            } finally {
                elements.loadConfigBtn.disabled = false;
            }
        });

        elements.importConfigBtn?.addEventListener('click', async () => {
            elements.importConfigBtn.disabled = true;
            try {
                await importConfigFromFile();
            } finally {
                elements.importConfigBtn.disabled = false;
            }
        });

        elements.exportConfigBtn?.addEventListener('click', async () => {
            elements.exportConfigBtn.disabled = true;
            try {
                await exportConfig();
            } finally {
                elements.exportConfigBtn.disabled = false;
            }
        });

        elements.timeFormatToggle.addEventListener('change', (event) => {
            state.settings.is24HourFormat = !event.target.checked;
            saveSettingsToStorage();
            updateClock();
        });

        elements.secondsToggle.addEventListener('change', (event) => {
            state.settings.showSeconds = event.target.checked;
            saveSettingsToStorage();
            updateClock();
        });

        elements.menuToggle.addEventListener('click', () => {
            elements.matrixControls.classList.toggle('hidden');
        });

        elements.searchField.addEventListener('cut', handleSearchMouse);
        elements.searchField.addEventListener('paste', handleSearchMouse);
        elements.searchField.addEventListener('input', handleSearchInput);
        elements.searchField.addEventListener('keyup', handleEnter);
        elements.bookmarksContainer.addEventListener('click', handleBookmarkContainerClick);
        elements.bookmarksContainerGroup.addEventListener('click', handleBookmarkContainerClick);
        elements.bookmarksContainer.addEventListener('dragstart', handleBookmarkDragStart);
        elements.bookmarksContainerGroup.addEventListener('dragstart', handleBookmarkDragStart);
        elements.bookmarksContainer.addEventListener('dragover', handleBookmarkDragOver);
        elements.bookmarksContainerGroup.addEventListener('dragover', handleBookmarkDragOver);
        elements.bookmarksContainer.addEventListener('drop', handleBookmarkDrop);
        elements.bookmarksContainerGroup.addEventListener('drop', handleBookmarkDrop);
        elements.bookmarksContainer.addEventListener('dragend', handleBookmarkDragEnd);
        elements.bookmarksContainerGroup.addEventListener('dragend', handleBookmarkDragEnd);
        elements.addBookmarkBtn.addEventListener('click', () => openBookmarkModal());
        elements.cancelBookmarkBtn.addEventListener('click', closeBookmarkModal);
        elements.cancelBookmarkGroupBtn.addEventListener('click', closeGroupModal);
        elements.saveBookmarkBtn.addEventListener('click', saveBookmark);
        elements.saveBookmarkGroupBtn.addEventListener('click', renameGroup);
        elements.groupBookmarkBtn.addEventListener('click', toggleGroupSelect);
        elements.groupSelect.addEventListener('click', selectGroupOption);
        elements.cancelGroupBtnDelete.addEventListener('click', closeDeleteGroupModal);
        elements.deleteBookmarkGroupBtn.addEventListener('click', openDeleteGroupModal);
        elements.deleteGrpOnly.addEventListener('click', deleteGroupOnly);
        elements.deleteGrpAll.addEventListener('click', deleteGroupAll);
        elements.addBookmarkGroupBtn.addEventListener('click', addGroupModal);

        elements.visibilityMenuBtn.addEventListener('click', () => {
          console.log("Clicked")
          elements.bookmarkSection.classList.toggle("visibilityMenuNone")
        });
      
        elements.bookmarkModal.addEventListener('click', (event) => {
            if (event.target === elements.bookmarkModal) {
                closeBookmarkModal();
            }
        });

        elements.bookmarkGroupModal.addEventListener('click', (event) => {
            if (event.target === elements.bookmarkGroupModal) {
                closeGroupModal();
            }
        });

        elements.bookmarkNameInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                elements.bookmarkUrlInput.focus();
            }
        });

        elements.bookmarkUrlInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                saveBookmark();
            }
        });

        window.addEventListener('resize', () => {
            if (resizeFrame) {
                cancelAnimationFrame(resizeFrame);
            }

            resizeFrame = requestAnimationFrame(() => {
                resizeCanvas();
                resizeFrame = null;
            });
        });
    }
    console.log("Made by Mohammad Faheem Ahmad")
    async function init() {
        bindEvents();
        resizeCanvas();
        await loadInitialConfigOnce();
        await loadDataFromStorage();
        applySettings();
        renderBookmarks();
        animate();
    }

    init();
})();
