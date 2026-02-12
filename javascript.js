// script.js – full lost & found matching engine with localStorage

// ---- DATA STORAGE ----
let lostItems = [];
let foundItems = [];

// Load from localStorage on init
function loadFromStorage() {
    const storedLost = localStorage.getItem('lostItems');
    const storedFound = localStorage.getItem('foundItems');
    if (storedLost) lostItems = JSON.parse(storedLost);
    if (storedFound) foundItems = JSON.parse(storedFound);
}
function saveToStorage() {
    localStorage.setItem('lostItems', JSON.stringify(lostItems));
    localStorage.setItem('foundItems', JSON.stringify(foundItems));
}

// ---- UTILS ----
function generateId() {
    return Date.now() + '-' + Math.random().toString(36).substring(2, 6);
}

// ---- SIMILARITY MATCHING (returns score 0-1) ----
function similarityScore(textA = '', textB = '') {
    const a = textA.toLowerCase().trim();
    const b = textB.toLowerCase().trim();
    if (!a || !b) return 0;
    if (a === b) return 1;
    // simple word overlap (fast & understandable)
    const wordsA = new Set(a.split(/\s+/));
    const wordsB = new Set(b.split(/\s+/));
    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);
    return intersection.size / union.size;
}

// Find potential matches between lost & found items
function findMatches() {
    const matches = [];
    lostItems.forEach(lost => {
        foundItems.forEach(found => {
            // name similarity (high weight)
            const nameScore = similarityScore(lost.name, found.name) * 0.5;
            // location similarity
            const locationScore = similarityScore(lost.location, found.location) * 0.2;
            // description similarity 
            const descScore = similarityScore(lost.desc, found.desc) * 0.2;
            // date proximity? not implemented for simplicity, but could be added
            // total score
            const totalScore = nameScore + locationScore + descScore;
            if (totalScore >= 0.35) {  // threshold for showing match
                matches.push({
                    lost: { ...lost },
                    found: { ...found },
                    score: totalScore
                });
            }
        });
    });
    // sort by score descending (best match first)
    return matches.sort((a,b) => b.score - a.score);
}

// ---- RENDER ALL (with filters & search) ----
let currentFilter = 'all';
let currentSearchTerm = '';

function renderDashboard() {
    // filter based on search input
    const term = currentSearchTerm.toLowerCase();
    
    function matchesSearch(item) {
        if (!term) return true;
        return item.name.toLowerCase().includes(term) ||
               (item.desc && item.desc.toLowerCase().includes(term)) ||
               item.location.toLowerCase().includes(term);
    }

    const filteredLost = lostItems
        .filter(matchesSearch)
        .sort((a,b) => new Date(b.date) - new Date(a.date));
    
    const filteredFound = foundItems
        .filter(matchesSearch)
        .sort((a,b) => new Date(b.date) - new Date(a.date));

    // LOST column
    const lostListEl = document.getElementById('lost-list');
    lostListEl.innerHTML = filteredLost.length ? '' : '<div class="empty-message">No lost items match your search.</div>';
    filteredLost.forEach(item => lostListEl.appendChild(createItemCard(item, 'lost')));

    // FOUND column
    const foundListEl = document.getElementById('found-list');
    foundListEl.innerHTML = filteredFound.length ? '' : '<div class="empty-message">No found items match your search.</div>';
    filteredFound.forEach(item => foundListEl.appendChild(createItemCard(item, 'found')));

    // badges
    document.getElementById('lost-badge').innerText = lostItems.length;
    document.getElementById('found-badge').innerText = foundItems.length;
    document.getElementById('lost-count').innerText = lostItems.length;
    document.getElementById('found-count').innerText = foundItems.length;

    // MATCHES (global, not filtered by search)
    const allMatches = findMatches();
    document.getElementById('match-count').innerText = allMatches.length;
    document.getElementById('match-badge').innerText = allMatches.length;

    const matchesListEl = document.getElementById('matches-list');
    if (allMatches.length === 0) {
        matchesListEl.innerHTML = '<div class="empty-message">✨ No potential matches yet. Add more items!</div>';
    } else {
        matchesListEl.innerHTML = '';
        allMatches.forEach(match => {
            matchesListEl.appendChild(createMatchCard(match.lost, match.found, match.score));
        });
    }

    // apply filter visibility (all/lost/found/matches)
    applyFilterVisibility();
}

// CREATE item card (lost / found)
function createItemCard(item, type) {
    const card = document.createElement('div');
    card.className = `item-card ${type}`;
    card.dataset.id = item.id;
    card.dataset.type = type;
    
    const infoDiv = document.createElement('div');
    infoDiv.className = 'item-info';
    
    const nameSpan = document.createElement('span');
    nameSpan.className = 'item-name';
    nameSpan.innerText = item.name;
    
    const metaDiv = document.createElement('div');
    metaDiv.className = 'item-meta';
    metaDiv.innerHTML = `<span>📍 ${item.location}</span><span>📅 ${item.date}</span>`;
    
    const descP = document.createElement('p');
    descP.className = 'item-desc';
    descP.innerText = item.desc || 'no description';
    
    infoDiv.appendChild(nameSpan);
    infoDiv.appendChild(metaDiv);
    infoDiv.appendChild(descP);
    
    const removeBtn = document.createElement('button');
    removeBtn.className = 'item-remove';
    removeBtn.innerHTML = '✕';
    removeBtn.setAttribute('aria-label', 'remove');
    removeBtn.onclick = (e) => {
        e.stopPropagation();
        removeItem(item.id, type);
    };
    
    card.appendChild(infoDiv);
    card.appendChild(removeBtn);
    return card;
}

// CREATE match card (using template)
function createMatchCard(lost, found, score) {
    const template = document.getElementById('match-card-template');
    const clone = template.content.cloneNode(true);
    const card = clone.querySelector('.match-card');
    
    // lost side
    const lostSide = card.querySelector('.match-lost');
    lostSide.querySelector('.match-name').innerHTML = `🧾 ${lost.name}`;
    lostSide.querySelector('.match-location').innerHTML = `📍 ${lost.location}`;
    lostSide.querySelector('.match-date').innerHTML = `📅 ${lost.date}`;
    lostSide.querySelector('.match-desc').innerHTML = lost.desc || '—';
    
    // found side
    const foundSide = card.querySelector('.match-found');
    foundSide.querySelector('.match-name').innerHTML = `🧾 ${found.name}`;
    foundSide.querySelector('.match-location').innerHTML = `📍 ${found.location}`;
    foundSide.querySelector('.match-date').innerHTML = `📅 ${found.date}`;
    foundSide.querySelector('.match-desc').innerHTML = found.desc || '—';
    
    // optional: add score as tooltip
    card.title = `Match strength: ${Math.round(score * 100)}%`;
    return card;
}

// remove item
function removeItem(id, type) {
    if (type === 'lost') {
        lostItems = lostItems.filter(i => i.id !== id);
    } else {
        foundItems = foundItems.filter(i => i.id !== id);
    }
    saveToStorage();
    renderDashboard();
}

// ---- FORM SUBMISSION ----
document.getElementById('item-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const type = document.getElementById('item-type').value;
    const name = document.getElementById('item-name').value.trim();
    const desc = document.getElementById('item-desc').value.trim();
    const date = document.getElementById('item-date').value;
    const location = document.getElementById('item-location').value.trim();
    
    if (!type || !name || !date || !location) {
        alert('Please fill in all required fields (type, name, date, location)');
        return;
    }
    
    const newItem = {
        id: generateId(),
        name,
        desc: desc || 'no description',
        date,
        location,
    };
    
    if (type === 'lost') {
        lostItems.push(newItem);
    } else {
        foundItems.push(newItem);
    }
    
    saveToStorage();
    renderDashboard();
    
    // reset form, keep type placeholder
    this.reset();
    document.getElementById('item-type').value = '';
});

// ---- FILTER (show/hide columns + matches) ----
function applyFilterVisibility() {
    const filter = currentFilter;
    const lostCol = document.querySelector('.lost-column');
    const foundCol = document.querySelector('.found-column');
    const matchesPanel = document.getElementById('matches-panel');
    
    if (filter === 'all') {
        lostCol.style.display = 'block';
        foundCol.style.display = 'block';
        matchesPanel.style.display = 'block';
    } else if (filter === 'lost') {
        lostCol.style.display = 'block';
        foundCol.style.display = 'none';
        matchesPanel.style.display = 'none';
    } else if (filter === 'found') {
        lostCol.style.display = 'none';
        foundCol.style.display = 'block';
        matchesPanel.style.display = 'none';
    } else if (filter === 'matches') {
        lostCol.style.display = 'none';
        foundCol.style.display = 'none';
        matchesPanel.style.display = 'block';
    }
}

// ---- FILTER BUTTONS & SEARCH ----
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        currentFilter = this.dataset.filter;
        applyFilterVisibility();
    });
});

// Search input listener
document.getElementById('search-input').addEventListener('input', function(e) {
    currentSearchTerm = e.target.value;
    renderDashboard(); // re-render with search filter
});

// ---- INITIALISE ----
loadFromStorage();
renderDashboard();

// set default date to today for convenience
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('item-date').value = today;
});