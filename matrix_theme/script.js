const canvas = document.getElementById('matrixCanvas');
const ctx = canvas.getContext('2d');
const digitalClock = document.getElementById('digitalClock');
const timeFormatToggle = document.getElementById('timeFormatToggle');
const secondsToggle = document.getElementById('secondsToggle');
const menuToggle = document.getElementById('menuToggle');
const matrixControls = document.getElementById('matrixControls');
const searchField = document.getElementById('passwordField');
let is24HourFormat = true; // Default to 24-hour format
let showSeconds = true; // Default to showing seconds
let frameCount = 0;

let bookmarks = [];

let search_engine = "https://www.google.com/search?q=";

let custom_default =
    [
        { id: '1', name: 'Google', url: 'https://google.com', group: "" },
        { id: '2', name: 'YouTube', url: 'https://youtube.com', group: "" },

    ];

const defaultSettings = {
    themeColor: '#00FF41',
    backgroundColor: '#000000',
    animationSpeed: 18,
    fontSize: 20,
    is24HourFormat: true,
    showSeconds: true
};

function inject(data,d) {
  let matrix_settings = data.matrix_settings;
  let matrix_bookmarks = data.matrix_bookmarks;
  let matrix_search = data.matrix_search;
  
  if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ 'matrix_settings': matrix_settings });
      chrome.storage.local.set({ 'matrix_bookmarks': matrix_bookmarks });
      chrome.storage.local.set({ 'matrix_search': matrix_search });
      chrome.storage.local.set({ 'matrix_default': d });
  } else {
      localStorage.setItem('matrix_settings', JSON.stringify(matrix_settings));
      localStorage.setItem('matrix_bookmarks', JSON.stringify(matrix_bookmarks));
      localStorage.setItem('matrix_search', JSON.stringify(matrix_search));
      localStorage.setItem('matrix_default', JSON.stringify(d));
  }
}
fetch(chrome.runtime.getURL("config.json"))
  .then(response => response.json())
  .then(config => {
    let data = config;
    let matrix_search = data.matrix_search;
    let matrix_default = data.matrix_default;
    search_engine = matrix_search;
    if (matrix_default.toLowerCase() == "true") {
      inject(data,"true");
      return;
    }
    
    chrome.storage.local.get("matrix_default").then((data) => {
      const matrixDefault = data.matrix_default ?? "once";
      if (matrixDefault != "no") {
        inject(data,"no");
      }
    })
});

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// --- Configuration ---
let rainColor = '#00FF41'; // Initial color for matrix rain
let uiThemeColor = rainColor; // Initial color for UI elements

let fontSize = 20;
let animationSpeed = 18;

const characters = `123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$%^&*()_-+=/?.,<>~ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉ`;
const charArray = characters.split('');

let columns = Math.ceil(canvas.width / fontSize);
let drops = Array(columns).fill(1);

// --- Helper to convert hex to RGB for CSS variables with opacity ---
function hexToRgb(hex) {
    let r = 0, g = 0, b = 0;
    if (hex.length == 4) { // #RGB
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length == 7) { // #RRGGBB
        r = parseInt(hex[1] + hex[2], 16);
        g = parseInt(hex[3] + hex[4], 16);
        b = parseInt(hex[5] + hex[6], 16);
    }
    return `${r}, ${g}, ${b}`;
}

function updateThemeColors(newColor) {
    rainColor = newColor; // For matrix rain itself
    uiThemeColor = newColor; // For UI elements
    document.documentElement.style.setProperty('--theme-color', uiThemeColor);
    document.documentElement.style.setProperty('--theme-color-rgb', hexToRgb(uiThemeColor));
}

let bgColor = '#000000';
let bgColorRGB = '0, 0, 0';

function updateBackgroundColor(newColor) {
    bgColor = newColor;
    bgColorRGB = hexToRgb(newColor);
    document.documentElement.style.setProperty('--bg-color', newColor);
    document.documentElement.style.setProperty('--bg-color-rgb', bgColorRGB);
}


// --- Control Elements ---
const colorPicker = document.getElementById('colorPicker');
const bgColorPicker = document.getElementById('bgColorPicker');
const speedSlider = document.getElementById('speedSlider');
const fontSizeSlider = document.getElementById('fontSizeSlider');
const speedValueSpan = document.getElementById('speedValue');
const fontSizeValueSpan = document.getElementById('fontSizeValue');

// --- Initialize Controls and Theme ---
updateThemeColors(colorPicker.value); // Initialize theme with picker's default value
if (bgColorPicker) {
    updateBackgroundColor(bgColorPicker.value);
}
speedSlider.value = animationSpeed;
speedValueSpan.textContent = animationSpeed;
fontSizeSlider.value = fontSize;
fontSizeValueSpan.textContent = fontSize;


// --- Control Event Listeners ---
colorPicker.addEventListener('input', (event) => {
    updateThemeColors(event.target.value);
    updateFavicon(event.target.value);
});
colorPicker.addEventListener('change', (event) => {
    settings.themeColor = event.target.value;
    saveSettingsToStorage();
    updateFavicon(event.target.value);
});

if (bgColorPicker) {
    bgColorPicker.addEventListener('input', (event) => {
        updateBackgroundColor(event.target.value);
    });
    bgColorPicker.addEventListener('change', (event) => {
        settings.backgroundColor = event.target.value;
        saveSettingsToStorage();
    });
}

speedSlider.addEventListener('input', (event) => {
    animationSpeed = parseInt(event.target.value, 10);
    speedValueSpan.textContent = animationSpeed;
});
speedSlider.addEventListener('change', (event) => {
    settings.animationSpeed = animationSpeed;
    saveSettingsToStorage();
});

fontSizeSlider.addEventListener('input', (event) => {
    fontSize = parseInt(event.target.value, 10);
    fontSizeValueSpan.textContent = fontSize;
    columns = Math.ceil(canvas.width / fontSize);
    drops = Array(columns).fill(1);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
});
fontSizeSlider.addEventListener('change', (event) => {
    settings.fontSize = fontSize;
    saveSettingsToStorage();
});

const resetSettingsBtn = document.getElementById('resetSettingsBtn');
if (resetSettingsBtn) {
    resetSettingsBtn.addEventListener('click', () => {
        settings = { ...defaultSettings };
        saveSettingsToStorage();
        applySettings();
    });
}

function drawMatrix() {
    ctx.fillStyle = `rgba(${bgColorRGB}, 0.05)`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = `${fontSize}px 'Courier New', Courier, monospace`;

    for (let i = 0; i < drops.length; i++) {
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        ctx.fillStyle = `rgba(${bgColorRGB}, 0.7)`;
        ctx.fillRect(x, y, fontSize, fontSize);

        if (y >= 0) {
            ctx.fillStyle = rainColor;
            const text = charArray[Math.floor(Math.random() * charArray.length)];
            ctx.fillText(text, x, y);
        }

        if (y > canvas.height) {
            if (Math.random() > 0.975) {
                drops[i] = -Math.floor(Math.random() * 10);
            }
        }
        drops[i]++;
    }
}


function animate() {
    frameCount++;
    if (frameCount % (21 - animationSpeed) === 0) {
        drawMatrix();
    }
    requestAnimationFrame(animate);
}

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    columns = Math.ceil(canvas.width / fontSize);
    drops = Array(columns).fill(1);
    if (ctx) { // Ensure ctx is available
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
});

let clockTimeout;

function updateClock() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    let period = '';

    if (!is24HourFormat) {
        period = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // the hour '0' should be '12'
    }

    const formattedHours = String(hours).padStart(2, '0');
    let timeString = '';
    if (is24HourFormat) {
        timeString = showSeconds ? `${formattedHours}:${minutes}:${seconds}` : `${formattedHours}:${minutes}`;
    } else {
        timeString = showSeconds ? `${formattedHours}:${minutes}:${seconds} ${period}` : `${formattedHours}:${minutes} ${period}`;
    }

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dateString = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()} ${days[now.getDay()]}`;

    digitalClock.innerHTML = `
        <div class="time-string">${timeString}</div>
        <div class="date-string">${dateString}</div>
    `;

    // Schedule next update precisely
    if (clockTimeout) clearTimeout(clockTimeout);

    let delay;
    if (showSeconds) {
        delay = 1000 - now.getMilliseconds();
    } else {
        delay = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    }
    // Prevent 0 or negative delays
    if (delay <= 0) delay = showSeconds ? 1000 : 60000;

    clockTimeout = setTimeout(updateClock, delay);
}

updateClock(); // Initial call to display clock immediately

timeFormatToggle.addEventListener('change', (e) => {
    is24HourFormat = !e.target.checked;
    settings.is24HourFormat = is24HourFormat;
    saveSettingsToStorage();
    updateClock();
});

secondsToggle.addEventListener('change', (e) => {
    showSeconds = e.target.checked;
    settings.showSeconds = showSeconds;
    saveSettingsToStorage();
    updateClock();
});

menuToggle.addEventListener('click', () => {
    matrixControls.classList.toggle('hidden');
});

// Search / URL navigation functionality
searchField.addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
        const query = this.value.trim();
        if (query) {
            // Check if it's a URL
            const urlPattern = /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/[\w-.\/?%&=]*)?$/i;
            if (urlPattern.test(query) && !query.includes(' ')) {
                let url = query;
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    url = 'https://' + url;
                }
                window.location.href = url;
            } else {
                // Search Google
                window.location.href = search_engine + encodeURIComponent(query);
            }
        }
    }
});

// Bookmark Functionality
const bookmarksContainer = document.getElementById('bookmarksContainer');
const bookmarksContainerGroup = document.getElementById('bookmarksContainerGroup');
const addBookmarkBtn = document.getElementById('addBookmarkBtn');
const bookmarkModal = document.getElementById('bookmarkModal');
const bookmarkgroupModal = document.getElementById('bookmarkgroupModal');
const cancelBookmarkBtn = document.getElementById('cancelBookmarkBtn');
const cancelBookmarkGroupBtn = document.getElementById('cancelBookmarkGroupBtn');
const saveBookmarkBtn = document.getElementById('saveBookmarkBtn');
const bookmarkIdInput = document.getElementById('bookmarkId');
const bookmarkNameInput = document.getElementById('bookmarkName');
const bookmarkUrlInput = document.getElementById('bookmarkUrl');
const modalTitle = document.getElementById('modalTitle');

let modalgroupout = document.getElementById("modalgroupout")
let groupName = modalgroupout.querySelector("#groupName")
let groupBookmarkBtn = modalgroupout.querySelector("#groupBookmarkBtn")
let groupicon = modalgroupout.querySelector("i");
let modalselect = modalgroupout.querySelector("#modalselect")

let settings = { ...defaultSettings };

function saveSettingsToStorage() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ 'matrix_settings': settings });
    } else {
        localStorage.setItem('matrix_settings', JSON.stringify(settings));
    }
}

function saveBookmarksToStorage() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set({ 'matrix_bookmarks': bookmarks });
    } else {
        localStorage.setItem('matrix_bookmarks', JSON.stringify(bookmarks));
    }
}

function updateFavicon(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');

    // Clear canvas
    ctx.clearRect(0, 0, 32, 32);

    // Draw the terminal icon
    ctx.fillStyle = color;
    ctx.font = '900 24px "Font Awesome 6 Free"';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\uf120', 16, 16); // \uf120 is fa-terminal

    // Update Tab Favicon
    const dataUrl = canvas.toDataURL('image/png');
    let link = document.getElementById('dynamic-favicon');
    if (!link) {
        link = document.createElement('link');
        link.id = 'dynamic-favicon';
        link.rel = 'icon';
        link.type = 'image/png';
        document.head.appendChild(link);
    }
    link.href = dataUrl;

    // Update Extension Icon
    if (typeof chrome !== 'undefined' && chrome.action && chrome.action.setIcon) {
        try {
            const imageData = ctx.getImageData(0, 0, 32, 32);
            chrome.action.setIcon({ imageData: imageData });
        } catch (e) {
            console.error('Could not set extension icon', e);
        }
    }
}

function applySettings() {
    animationSpeed = settings.animationSpeed;
    fontSize = settings.fontSize;
    is24HourFormat = settings.is24HourFormat;
    showSeconds = settings.showSeconds;

    // Update UI controls
    colorPicker.value = settings.themeColor;
    updateThemeColors(settings.themeColor);

    if (bgColorPicker) {
        bgColorPicker.value = settings.backgroundColor || '#000000';
        updateBackgroundColor(bgColorPicker.value);
    }

    // Wait for fonts to load before drawing favicon
    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => updateFavicon(settings.themeColor));
    } else {
        updateFavicon(settings.themeColor);
    }

    speedSlider.value = settings.animationSpeed;
    speedValueSpan.textContent = settings.animationSpeed;

    fontSizeSlider.value = settings.fontSize;
    fontSizeValueSpan.textContent = settings.fontSize;

    timeFormatToggle.checked = !settings.is24HourFormat;
    secondsToggle.checked = settings.showSeconds;

    columns = Math.ceil(canvas.width / fontSize);
    drops = Array(columns).fill(1);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    updateClock();
}

function loadDataFromStorage(callback) {
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(['matrix_bookmarks', 'matrix_settings'], function (result) {
            if (result.matrix_bookmarks) {
                bookmarks = result.matrix_bookmarks;
            } else {
                bookmarks = custom_default;
            }
            if (result.matrix_settings) {
                settings = result.matrix_settings;
            }
            callback();
        });
    } else {
        bookmarks = JSON.parse(localStorage.getItem('matrix_bookmarks')) || custom_default;
        const savedSettings = JSON.parse(localStorage.getItem('matrix_settings'));
        if (savedSettings) {
            settings = savedSettings;
        }
        callback();
    }
}

function renderBookmarks() {
    // Clear existing bookmarks
    // return
    const items = bookmarksContainer.querySelectorAll('.bookmark-item');
    items.forEach(item => item.remove());

    let group_arr = bookmarks.map(gr => gr.group);

    let group_distinct = [
        ...new Set(group_arr)
    ].filter(group =>
        group &&
        group.toLowerCase() !== "none" &&
        group.toLowerCase() !== "null"
    );


    bookmarks.forEach(bookmark => {
        let n = bookmark.name;
        let url = bookmark.url;
        let id = bookmark.id;
        let group = bookmark.group;
        if (group.toLowerCase() == "none" || group.toLowerCase() == "" || group.toLowerCase() == "null") {
            let a = document.createElement('a');
            a.href = url;
            a.className = 'bookmark-item';
            a.innerHTML = `
                <i class="fas fa-globe favicon"></i>
                <span>${n}</span>
                <div class="bookmark-actions">
                    <button class="edit-btn" data-id="${id}" title="Edit"><i class="fas fa-pencil-alt"></i></button>
                    <button class="delete-btn" data-id="${id}" title="Delete"><i class="fas fa-trash"></i></button>
                </div>
            `;
            bookmarksContainer.append(a);
        }
    });

    group_distinct.forEach(grp=>{
        let div = document.createElement('div');
        div.className = 'bookmark-item open-folder';
        div.dataset.value = grp
        div.innerHTML = `
            <i class="fa fa-folder" aria-hidden="true"></i>
            <span>${grp}</span>
        `;
        bookmarksContainer.append(div);
    })

    // Add event listeners for folder buttons
    document.querySelectorAll('.open-folder').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent navigating
            e.stopPropagation();
            openModalGroup(e.currentTarget.dataset.value);
        });
    });

    // Add event listeners for edit/delete buttons
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent navigating
            e.stopPropagation();
            openModal(e.currentTarget.getAttribute('data-id'));
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent navigating
            e.stopPropagation();
            deleteBookmark(e.currentTarget.getAttribute('data-id'));
        });
    });
}

function openModalGroup(val){
    bookmarkgroupModal.classList.add('active');
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get('matrix_bookmarks').then(result => {
            if (result.matrix_bookmarks) {
                bookmarks = result.matrix_bookmarks;
            } else {
                bookmarks = custom_default;
            }
        })
    }else{
        bookmarks = JSON.parse(localStorage.getItem('matrix_bookmarks')) || custom_default;
    }

    let grp_arr = bookmarks.filter(g => g.group == val)
    if(grp_arr.length < 1){
        closeGroupModal()
        return;
    }
    bookmarksContainerGroup.innerHTML = ""
    grp_arr.forEach((bkmrk)=>{
        let id = bkmrk.id;
        let name = bkmrk.name;
        let url = bkmrk.url;
        let grp = bkmrk.group;

        let a = document.createElement('a');
        a.href = url;
        a.className = 'bookmark-item';
        a.innerHTML = `
            <i class="fas fa-globe favicon"></i>
            <span>${name}</span>
            <div class="bookmark-actions">
                <button class="edit-btn" data-id="${id}" title="Edit"><i class="fas fa-pencil-alt"></i></button>
                <button class="delete-btn" data-id="${id}" title="Delete"><i class="fas fa-trash"></i></button>
            </div>
        `;

        bookmarksContainerGroup.append(a);


    })

    groupNameModal.dataset.value = val;
    groupNameModal.value = val;
    bookmarkgroupModal.classList.add('active');

    // Add event listeners for edit
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent navigating
            e.stopPropagation();
            openModal(e.currentTarget.getAttribute('data-id'));
        });
    });

    // Add event listeners for delete buttons
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent navigating
            e.stopPropagation();
            deleteBookmark(e.currentTarget.getAttribute('data-id'));
        });
    });
}

function openModal(id = null) {
    if (id) {
        if (typeof chrome !== 'undefined' && chrome.storage) {
            chrome.storage.local.get('matrix_bookmarks').then(result => {
                if (result.matrix_bookmarks) {
                    bookmarks = result.matrix_bookmarks;
                } else {
                    bookmarks = custom_default;
                }
            })
        } else {
            bookmarks = JSON.parse(localStorage.getItem('matrix_bookmarks')) || custom_default;
        }
        const bookmark = bookmarks.find(b => b.id === id);
        if (bookmark) {
            bookmarkIdInput.value = bookmark.id;
            bookmarkNameInput.value = bookmark.name;
            bookmarkUrlInput.value = bookmark.url;
            groupName.dataset.value = bookmark.group;
            groupName.value = bookmark.group;
            if (groupName.value.toLowerCase() != "none" && groupName.value.toLowerCase() != "" && groupName.value.toLowerCase() != "null") {
                groupName.disabled = true;
                groupName.style.opacity = 0.5;
            } else {
                groupName.style.opacity = 1;
                groupName.disabled = false;
            }
            modalTitle.textContent = 'Edit Bookmark';
        }
    } else {
        bookmarkIdInput.value = '';
        bookmarkNameInput.value = '';
        bookmarkUrlInput.value = '';
        groupName.dataset.value = '';
        groupName.value = '';
        modalTitle.textContent = 'Add Bookmark';
    }

    let matrix_bookmarks_arr = bookmarks.map(a => a.group)
    matrix_bookmarks_set = new Set(matrix_bookmarks_arr);
    matrix_bookmarks_arr = [...matrix_bookmarks_set]
    let listr = "<li data-value='none'>None</li> "
    matrix_bookmarks_arr.forEach(data => {
        if (data.toLowerCase() == "none" || data.toLowerCase() == "" || data.toLowerCase() == "null") {
        } else {
            listr += `<li data-value="${data}">${data}</li>`
        }
    });
    modalselect.innerHTML = listr;

    bookmarkModal.classList.add('active');
    bookmarkNameInput.focus();
    modalopenli();
}

function closeModal() {
    bookmarkModal.classList.remove('active');
}

function closeGroupModal() {
    bookmarkgroupModal.classList.remove('active');
}

saveBookmarkGroupBtn.addEventListener("click",(e)=>{
    let val = groupNameModal.dataset.value;
    if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get('matrix_bookmarks').then(result => {
            if (result.matrix_bookmarks) {
                bookmarks = result.matrix_bookmarks;
            } else {
                bookmarks = custom_default;
            }
        })
    }else{
        bookmarks = JSON.parse(localStorage.getItem('matrix_bookmarks')) || custom_default;
    }

    if(!groupNameModal.value){
        alert('Please enter Name');
        return;
    }

    bookmarks.map((d)=>{
        if(d.group == groupNameModal.dataset.value){
            d.group = groupNameModal.value;
        }
    })

    saveBookmarksToStorage();
    renderBookmarks();
    closeGroupModal();

})

function saveBookmark() {
    const id = bookmarkIdInput.value;
    const name = bookmarkNameInput.value.trim();
    let url = bookmarkUrlInput.value.trim();
    let group = groupName.value.trim();

    if (!name || !url) {
        alert('Please enter both name and URL');
        return;
    }

    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = 'https://' + url;
    }
    let prev = ""
    if (id) {
        // Edit existing
        const index = bookmarks.findIndex(b => b.id === id);
        prev = bookmarks[index].group;
        if (index !== -1) {
            bookmarks[index] = { id, name, url, group };
        }
    } else {
        // Add new
        const newId = Date.now().toString();
        bookmarks.push({ id: newId, name, url, group });
    }

    saveBookmarksToStorage();
    renderBookmarks();
    closeModal();

    if([...bookmarkgroupModal.classList].includes("active")){
        openModalGroup(prev)
    }

}


function deleteBookmark(id) {
    if (confirm('Are you sure you want to delete this bookmark?')) {
        this_one = bookmarks.filter(b => b.id == id);
        bookmarks = bookmarks.filter(b => b.id !== id);
        let grp = this_one[0].group;
        saveBookmarksToStorage();
        renderBookmarks();
        if ([...bookmarkgroupModal.classList].includes("active")) {
            openModalGroup(grp)
        }
    }
}

addBookmarkBtn.addEventListener('click', () => openModal());
cancelBookmarkBtn.addEventListener('click', closeModal);
cancelBookmarkGroupBtn.addEventListener('click', closeGroupModal);
saveBookmarkBtn.addEventListener('click', saveBookmark);

bookmarkModal.addEventListener('click', (e) => {
    if (e.target === bookmarkModal) {
        closeModal();
    }
});

bookmarkgroupModal.addEventListener('click', (e) => {
    if (e.target === bookmarkgroupModal) {
        closeGroupModal();
    }
});

bookmarkNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') bookmarkUrlInput.focus();
});

bookmarkUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveBookmark();
});

// Initialize data
loadDataFromStorage(() => {
    applySettings();
    renderBookmarks();
});

groupBookmarkBtn.addEventListener("click", (e) => {
    modalselect.classList.toggle("modalgroupactive");
    groupicon.classList.toggle("fa-chevron-down");
    groupicon.classList.toggle("fa-chevron-up");
})


function modalopenli() {
    modalselect.querySelectorAll("li").forEach((li) => {
        li.addEventListener("click", (e) => {
            let v = e.target.dataset.value;
            if (v.toLowerCase() == "none" || v.toLowerCase() == "" || v.toLowerCase() == "null") {
                groupName.value = "";
                groupName.dataset.value = "";
                groupName.disabled = false;
                groupName.style.opacity = 1;
                modalselect.classList.toggle("modalgroupactive");
                groupicon.classList.toggle("fa-chevron-down");
                groupicon.classList.toggle("fa-chevron-up");
            } else {
                groupName.value = e.target.dataset.value;
                groupName.dataset.value = e.target.dataset.value;
                groupName.disabled = true;
                groupName.style.opacity = 0.5;
            }
        })
    })
}

// Start animation
animate();
