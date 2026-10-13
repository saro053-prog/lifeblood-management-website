/**
 * LifeBlood – Core Application Script
 * Client controller for real-time inventory, interactive compatibility matrix,
 * emergency request dispatch, donor portal, and admin dashboard.
 */

// Blood Group Clinical Compatibility Matrix
const BLOOD_COMPATIBILITY = {
  'A+': {
    giveTo: ['A+', 'AB+'],
    receiveFrom: ['A+', 'A-', 'O+', 'O-'],
    rarity: 'Common (34%)',
    summary: 'A+ can donate red blood cells to A+ and AB+, and receive from A+, A-, O+, and O-.'
  },
  'A-': {
    giveTo: ['A+', 'A-', 'AB+', 'AB-'],
    receiveFrom: ['A-', 'O-'],
    rarity: 'Rare (6%)',
    summary: 'A- is a critical group that can donate to all A and AB types, but can only receive from negative types (A-, O-).'
  },
  'B+': {
    giveTo: ['B+', 'AB+'],
    receiveFrom: ['B+', 'B-', 'O+', 'O-'],
    rarity: 'Common (9%)',
    summary: 'B+ can donate red blood cells to B+ and AB+, and receive from B+, B-, O+, and O-.'
  },
  'B-': {
    giveTo: ['B+', 'B-', 'AB+', 'AB-'],
    receiveFrom: ['B-', 'O-'],
    rarity: 'Very Rare (2%)',
    summary: 'B- donors are rare lifesavers for emergency cases requiring Rh-negative B and AB blood.'
  },
  'AB+': {
    giveTo: ['AB+'],
    receiveFrom: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],
    rarity: 'Rare (3%)',
    summary: 'AB+ is the Universal Recipient for red blood cells and the Universal Donor for plasma.'
  },
  'AB-': {
    giveTo: ['AB+', 'AB-'],
    receiveFrom: ['AB-', 'A-', 'B-', 'O-'],
    rarity: 'Extremely Rare (1%)',
    summary: 'AB- is the rarest blood group. Can only receive negative types.'
  },
  'O+': {
    giveTo: ['O+', 'A+', 'B+', 'AB+'],
    receiveFrom: ['O+', 'O-'],
    rarity: 'Most Common (38%)',
    summary: 'O+ is in highest clinical demand worldwide because it is compatible with all positive blood groups.'
  },
  'O-': {
    giveTo: ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],
    receiveFrom: ['O-'],
    rarity: 'Critical Rare (7%)',
    summary: 'O- is the UNIVERSAL DONOR for red blood cells. In emergency trauma before blood testing, O- is used.'
  }
};

// Safe localStorage retrieval helper
function getStoredUser() {
  try {
    const raw = localStorage.getItem('lifeblood_user');
    if (!raw || raw === 'undefined' || raw === 'null') return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

function getStoredToken() {
  try {
    const token = localStorage.getItem('lifeblood_token');
    return (token && token !== 'undefined' && token !== 'null') ? token : null;
  } catch (e) {
    return null;
  }
}

let currentToken = getStoredToken();
let currentUser = getStoredUser();
let currentSelectedGroup = 'O-';

// Expose modal handlers immediately to global window
window.openModal = function (id) {
  try {
    const modal = document.getElementById(id);
    if (modal) {
      modal.classList.add('active');
      document.body.classList.add('modal-open');
    }
  } catch (e) {
    console.error('Error opening modal:', id, e);
  }
};

window.closeModal = function (id) {
  try {
    if (id) {
      const modal = document.getElementById(id);
      if (modal) modal.classList.remove('active');
    } else {
      document.querySelectorAll('.modal-custom.active').forEach((m) => m.classList.remove('active'));
    }
    // Restore scroll if no active modal remains
    if (!document.querySelector('.modal-custom.active')) {
      document.body.classList.remove('modal-open');
      document.body.style.overflow = '';
    }
  } catch (e) {
    console.error('Error closing modal:', id, e);
  }
};

// Route Guard to prevent unauthorized access without crashing the page
function enforceRouteGuards() {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const user = getStoredUser();

    if (urlParams.get('admin') === 'true' || hash === '#admin') {
      if (!user || user.role !== 'admin') {
        window.openModal('modal-auth-login');
        return false;
      }
    }
    if (urlParams.get('donor') === 'true' || hash === '#donor') {
      if (!user || user.role !== 'donor') {
        window.openModal('modal-auth-login');
        return false;
      }
    }
    if (urlParams.get('hospital') === 'true' || hash === '#hospital') {
      if (!user || user.role !== 'hospital') {
        window.openModal('modal-auth-login');
        return false;
      }
    }
  } catch (e) {
    console.warn('enforceRouteGuards error:', e);
  }
  return true;
}

// Back-button & bfcache navigation safety
window.addEventListener('popstate', () => {
  try { enforceRouteGuards(); } catch (e) {}
  try { checkAuthUI(); } catch (e) {}
});

window.addEventListener('pageshow', () => {
  try {
    currentToken = getStoredToken();
    currentUser = getStoredUser();
    checkAuthUI();
    enforceRouteGuards();
  } catch (e) {}
});

// ==========================================================================
// Initialization on DOM Ready
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // Always guarantee page scrolling is free on init
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';

  // Run each module independently in try-catch so one never breaks another
  try { enforceRouteGuards(); } catch (e) { console.warn('Route guards error:', e); }
  try { checkAuthUI(); } catch (e) { console.warn('Auth UI error:', e); }
  try { initModals(); } catch (e) { console.warn('Modals init error:', e); }
  try { initCursorExperience(); } catch (e) { console.warn('Cursor init error:', e); }
  try { initCompatibilityMatrix(); } catch (e) { console.warn('Compatibility matrix error:', e); }
  try { fetchLiveInventory(); } catch (e) { console.warn('Inventory fetch error:', e); }
  try { fetchGlobalStats(); } catch (e) { console.warn('Stats fetch error:', e); }
  try { fetchDonors(); } catch (e) { console.warn('Donors fetch error:', e); }
  try { fetchBloodBanks(); } catch (e) { console.warn('Blood banks fetch error:', e); }
  try { initNavbarScroll(); } catch (e) { console.warn('Navbar scroll error:', e); }
  try { initFormListeners(); } catch (e) { console.warn('Form listeners error:', e); }

  // Check URL parameters or hash
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    if (urlParams.get('login') === 'true' || hash === '#login') {
      window.openModal('modal-auth-login');
    } else if (urlParams.get('sos') === 'true' || hash === '#sos') {
      window.openModal('modal-emergency-sos');
    } else if (urlParams.get('register') === 'true' || hash === '#register') {
      window.openModal('modal-donor-reg');
    } else if (urlParams.get('donor') === 'true' || hash === '#donor') {
      if (currentUser && currentUser.role === 'donor') {
        window.openDonorPortal();
      }
    } else if (urlParams.get('hospital') === 'true' || hash === '#hospital') {
      if (currentUser && currentUser.role === 'hospital') {
        window.openHospitalPortal();
      }
    } else if (urlParams.get('admin') === 'true' || hash === '#admin') {
      if (currentUser && currentUser.role === 'admin') {
        window.openAdminDashboard();
      }
    }
  } catch (e) {
    console.warn('URL param open error:', e);
  }

  // Auto-refresh live inventory every 25 seconds
  setInterval(() => {
    try { fetchLiveInventory(); } catch (e) {}
  }, 25000);
});

// ==========================================================================
// Custom Magnetic Micro-Cursor (Subtle, Smooth & Luxury)
// ==========================================================================
function initCursorExperience() {
  const dot = document.querySelector('.custom-cursor-dot');
  const outline = document.querySelector('.custom-cursor-outline');
  if (!dot || !outline) return;

  if (window.matchMedia('(hover: none) or (pointer: coarse)').matches || window.innerWidth < 992) {
    dot.style.display = 'none';
    outline.style.display = 'none';
    return;
  }

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let outlineX = mouseX;
  let outlineY = mouseY;
  let isVisible = false;

  window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
    if (!isVisible) {
      dot.style.opacity = '1';
      outline.style.opacity = '1';
      isVisible = true;
    }
  }, { passive: true });

  document.addEventListener('mouseleave', () => {
    dot.style.opacity = '0';
    outline.style.opacity = '0';
    isVisible = false;
  });

  document.addEventListener('mouseenter', () => {
    dot.style.opacity = '1';
    outline.style.opacity = '1';
    isVisible = true;
  });

  function renderCursor() {
    outlineX += (mouseX - outlineX) * 0.2;
    outlineY += (mouseY - outlineY) * 0.2;
    outline.style.transform = `translate3d(${outlineX}px, ${outlineY}px, 0)`;
    requestAnimationFrame(renderCursor);
  }
  requestAnimationFrame(renderCursor);

  // Delegated hover detection with passive listener
  document.addEventListener('mouseover', (e) => {
    if (e.target.closest('a, button, input, select, textarea, .blood-card, .btn-magnetic, .selector-pill-btn, .switch-toggle, .demo-pill-btn')) {
      document.body.classList.add('cursor-hover');
    } else {
      document.body.classList.remove('cursor-hover');
    }
  }, { passive: true });
}

// ==========================================================================
// Navbar Scroll Effect
// ==========================================================================
function initNavbarScroll() {
  const navbar = document.querySelector('.navbar-custom');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });
}

// ==========================================================================
// Live Blood Availability (Fetching from Backend / MySQL)
// ==========================================================================
async function fetchLiveInventory() {
  try {
    const res = await fetch('/api/inventory');
    const result = await res.json();

    if (!result.success) return;

    const grid = document.getElementById('inventory-cards-grid');
    if (!grid) return;

    const sourceTag = document.getElementById('db-source-tag');
    if (sourceTag && result.meta) {
      sourceTag.textContent = `${result.meta.source} • ${result.meta.totalUnits} Units Total`;
    }

    grid.innerHTML = '';

    result.data.forEach((item) => {
      const card = document.createElement('div');
      card.className = `glass-panel blood-card ${item.blood_group === currentSelectedGroup ? 'active-selected' : ''}`;
      card.onclick = () => selectBloodGroup(item.blood_group);

      const percent = Math.min(100, Math.round((item.units_available / 50) * 100));

      card.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-3">
          <div class="blood-group-symbol">${item.blood_group}</div>
          <span class="blood-status-pill status-${item.status}">${item.status}</span>
        </div>
        <div class="d-flex align-items-baseline gap-2 mb-2">
          <span class="blood-unit-count">${item.units_available}</span>
          <span class="blood-unit-label">Units Available</span>
        </div>
        <div class="progress-blood">
          <div class="progress-blood-bar ${getStatusBarClass(item.status)}" style="width: ${percent}%;"></div>
        </div>
        <div class="d-flex justify-content-between align-items-center mt-3 blood-meta-row">
          <span class="blood-threshold-text">Threshold: <strong class="blood-threshold-val">${item.critical_threshold} Units</strong></span>
          <span class="blood-sync-text"><i class="fas fa-check-circle me-1"></i>Live Sync</span>
        </div>
      `;

      grid.appendChild(card);
    });
  } catch (err) {
    console.error('Failed to fetch inventory:', err);
  }
}

function getStatusBarClass(status) {
  if (status === 'Critical') return 'bg-danger';
  if (status === 'Moderate') return 'bg-warning';
  if (status === 'Surplus') return 'bg-info';
  return 'bg-success';
}

// ==========================================================================
// Interactive Blood Group Compatibility Visualizer
// ==========================================================================
function initCompatibilityMatrix() {
  const container = document.getElementById('matrix-pills-container');
  if (!container) return;

  const groups = ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+'];
  container.innerHTML = '';

  groups.forEach((group) => {
    const btn = document.createElement('button');
    btn.className = `selector-pill-btn ${group === currentSelectedGroup ? 'active' : ''}`;
    btn.textContent = group;
    btn.onclick = () => selectBloodGroup(group);
    container.appendChild(btn);
  });

  renderCompatibilityInfo(currentSelectedGroup);
}

function selectBloodGroup(group) {
  currentSelectedGroup = group;

  // Update pills
  document.querySelectorAll('.selector-pill-btn').forEach((btn) => {
    if (btn.textContent === group) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Highlight inventory card if visible
  document.querySelectorAll('.blood-card').forEach((c) => {
    const sym = c.querySelector('.blood-group-symbol');
    if (sym && sym.textContent === group) {
      c.classList.add('active-selected');
    } else {
      c.classList.remove('active-selected');
    }
  });

  renderCompatibilityInfo(group);
}

function renderCompatibilityInfo(group) {
  const info = BLOOD_COMPATIBILITY[group];
  if (!info) return;

  const currentHeader = document.getElementById('compat-selected-title');
  const rarityBadge = document.getElementById('compat-rarity-badge');
  const desc = document.getElementById('compat-description');
  const giveBox = document.getElementById('compat-give-targets');
  const receiveBox = document.getElementById('compat-receive-targets');

  if (currentHeader) currentHeader.textContent = `Blood Group: ${group}`;
  if (rarityBadge) rarityBadge.textContent = info.rarity;
  if (desc) desc.textContent = info.summary;

  if (giveBox) {
    giveBox.innerHTML = '';
    info.giveTo.forEach((g) => {
      const tag = document.createElement('span');
      tag.className = 'compat-group-tag donate-target';
      tag.textContent = g;
      giveBox.appendChild(tag);
    });
  }

  if (receiveBox) {
    receiveBox.innerHTML = '';
    info.receiveFrom.forEach((g) => {
      const tag = document.createElement('span');
      tag.className = 'compat-group-tag';
      tag.textContent = g;
      receiveBox.appendChild(tag);
    });
  }
}

// ==========================================================================
// Global Statistics & Counter Animation
// ==========================================================================
async function fetchGlobalStats() {
  try {
    const res = await fetch('/api/stats');
    const result = await res.json();
    if (!result.success) return;

    const data = result.data;

    animateValue('stat-units-val', 0, data.totalUnits, 1500);
    animateValue('stat-donors-val', 0, data.registeredDonors, 2000);
    animateValue('stat-lives-val', 0, data.livesSaved, 2200);
    animateValue('stat-active-req', 0, data.activeRequests, 1200);

    const heroLives = document.getElementById('hero-stat-lives');
    if (heroLives) heroLives.textContent = `${data.livesSaved.toLocaleString()}+`;

    const heroDonors = document.getElementById('hero-stat-donors');
    if (heroDonors) heroDonors.textContent = `${data.registeredDonors.toLocaleString()}+`;
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

function animateValue(id, start, end, duration) {
  const obj = document.getElementById(id);
  if (!obj) return;

  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const easeProgress = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(easeProgress * (end - start) + start);
    obj.textContent = current.toLocaleString();
    if (progress < 1) {
      window.requestAnimationFrame(step);
    } else {
      obj.textContent = end.toLocaleString();
    }
  };
  window.requestAnimationFrame(step);
}

// ==========================================================================
// Find Donors Directory
// ==========================================================================
async function fetchDonors() {
  const bg = document.getElementById('filter-donor-bg')?.value || '';
  const city = document.getElementById('filter-donor-city')?.value || '';

  try {
    let url = '/api/donors?';
    if (bg) url += `blood_group=${encodeURIComponent(bg)}&`;
    if (city) url += `city=${encodeURIComponent(city)}&`;

    const res = await fetch(url);
    const result = await res.json();
    if (!result.success) return;

    const container = document.getElementById('donors-list-grid');
    if (!container) return;

    container.innerHTML = '';

    if (result.data.length === 0) {
      container.innerHTML = `
        <div class="col-12 text-center py-5 text-white">
          <i class="fas fa-search fa-2x mb-3 text-cyan"></i>
          <p class="h6 text-white fw-bold">No verified donors found matching the selected criteria.</p>
        </div>
      `;
      return;
    }

    result.data.forEach((donor) => {
      const col = document.createElement('div');
      col.className = 'col-md-6 col-lg-3';

      col.innerHTML = `
        <div class="glass-panel donor-card">
          <div>
            <div class="d-flex justify-content-between align-items-center mb-3">
              <div class="donor-avatar">${donor.blood_group}</div>
              <span class="badge-futuristic" style="font-size: 0.8rem;">
                <span class="pulse-dot ${donor.is_available ? 'cyan' : ''}"></span>
                ${donor.is_available ? 'Available' : 'Cooldown'}
              </span>
            </div>
            <h5 class="mb-1 text-white fw-bold" style="font-size: 1.25rem;">${donor.name}</h5>
            <p class="mb-2 text-white fw-bold" style="font-size: 1.02rem;"><i class="fas fa-map-marker-alt me-2 text-danger"></i> ${donor.city}</p>
            <p class="text-white mb-3 fw-medium" style="font-size: 0.98rem; line-height: 1.6;">${donor.medical_notes || 'Verified Hero'}</p>
          </div>
          <div>
            <div class="d-flex justify-content-between text-white mb-3 pt-2 border-top border-secondary" style="font-size: 1.0rem; font-weight: 750;">
              <span>Donations: <strong class="text-cyan">${donor.total_donations}</strong></span>
              <span>Age: <strong class="text-white">${donor.age} yrs</strong></span>
            </div>
            <button class="btn btn-sm btn-magnetic btn-crimson w-100 py-2 fw-bold" style="font-size: 0.98rem;" data-action="trigger-request" data-donor-name="${donor.name}" data-blood-group="${donor.blood_group}" data-city="${donor.city}">
              <i class="fas fa-paper-plane me-1"></i> Request Donor
            </button>
          </div>
        </div>
      `;
      container.appendChild(col);
    });
  } catch (err) {
    console.error('Failed to load donors:', err);
  }
}

// ==========================================================================
// Blood Banks Directory
// ==========================================================================
async function fetchBloodBanks() {
  try {
    const res = await fetch('/api/banks');
    const result = await res.json();
    if (!result.success) return;

    const list = document.getElementById('blood-banks-grid');
    if (!list) return;

    list.innerHTML = '';
    result.data.forEach((bank) => {
      const card = document.createElement('div');
      card.className = 'col-md-6 col-lg-3';
      card.innerHTML = `
        <div class="glass-panel p-4 h-100 d-flex flex-column justify-content-between">
          <div>
            <div class="d-flex justify-content-between align-items-start mb-2">
              <span class="badge-futuristic" style="font-size: 0.82rem; font-weight: 800;">${bank.license_no || 'Verified'}</span>
              <span class="pulse-dot cyan"></span>
            </div>
            <h5 class="text-white mb-2 fw-bold" style="font-size: 1.25rem;">${bank.name}</h5>
            <p class="text-white mb-3 fw-medium" style="font-size: 1.02rem; line-height: 1.6;"><i class="fas fa-map-pin me-2 text-danger"></i> ${bank.address}</p>
          </div>
          <div class="border-top border-secondary pt-3">
            <div class="d-flex justify-content-between align-items-center">
              <span class="text-white fw-bold" style="font-size: 1.0rem;"><i class="fas fa-clock me-2 text-warning"></i> ${bank.operating_hours}</span>
              <a href="tel:${bank.phone}" class="btn btn-sm btn-cyan-outline py-1 px-3 fw-bold" title="Call Center">
                <i class="fas fa-phone-alt me-1"></i> Call
              </a>
            </div>
          </div>
        </div>
      `;
      list.appendChild(card);
    });
  } catch (err) {
    console.error('Failed to fetch blood banks:', err);
  }
}

// ==========================================================================
// Modals & User Interactions
// ==========================================================================
function initModals() {
  // Document-wide delegated event listener for all modals and actions
  document.addEventListener('click', (e) => {
    const actionElement = e.target.closest('[data-action]');
    if (actionElement) {
      const action = actionElement.dataset.action;
      e.preventDefault();

      if (action === 'open-sos') {
        window.openModal('modal-emergency-sos');
        return;
      }

      if (action === 'open-donor-reg') {
        window.openModal('modal-donor-reg');
        return;
      }

      if (action === 'open-login') {
        window.openModal('modal-auth-login');
        return;
      }

      if (action === 'open-admin') {
        if (currentUser && currentUser.role === 'admin') {
          window.openModal('modal-admin-dashboard');
          loadAdminData();
        } else {
          window.openModal('modal-auth-login');
          showToast('Please sign in with administrator credentials.', 'info');
        }
        return;
      }

      if (action === 'open-donor-portal') {
        window.openDonorPortal();
        return;
      }

      if (action === 'open-hospital-portal') {
        window.openHospitalPortal();
        return;
      }

      if (action === 'refresh-donors') {
        fetchDonors();
        return;
      }

      if (action === 'fill-demo-admin') {
        document.getElementById('login-email').value = 'admin@lifeblood.org';
        document.getElementById('login-password').value = 'Admin@123';
        return;
      }

      if (action === 'fill-demo-donor') {
        document.getElementById('login-email').value = 'karthik@example.com';
        document.getElementById('login-password').value = 'Donor@123';
        return;
      }

      if (action === 'fill-demo-hospital') {
        document.getElementById('login-email').value = 'emergency@apollo.org';
        document.getElementById('login-password').value = 'Hospital@123';
        return;
      }

      if (action === 'logout') {
        logoutUser();
        return;
      }

      if (action === 'switch-admin-tab') {
        switchAdminTab(actionElement.dataset.tab);
        return;
      }

      if (action === 'run-donor-ml-prediction') {
        runDonorMLPrediction();
        return;
      }

      if (action === 'switch-donor-tab') {
        switchDonorTab(actionElement.dataset.tab);
        return;
      }

      if (action === 'print-hero-pass') {
        window.print();
        return;
      }

      if (action === 'open-book-appointment-form') {
        openBookAppointmentForm();
        return;
      }

      if (action === 'hide-appointment-form') {
        const form = document.getElementById('form-inline-appointment');
        if (form) form.style.display = 'none';
        return;
      }

      if (action === 'confirm-appointment-booking') {
        confirmAppointmentBooking();
        return;
      }

      if (action === 'trigger-request') {
        const donorName = actionElement.dataset.donorName || '';
        const bloodGroup = actionElement.dataset.bloodGroup || '';
        const city = actionElement.dataset.city || '';
        triggerRequestForDonor(donorName, bloodGroup, city);
        return;
      }

      if (action === 'toggle-availability') {
        const isChecked = actionElement.checked;
        toggleMyAvailability(isChecked);
        return;
      }

      if (action === 'save-inventory-unit') {
        saveInventoryUnit(parseInt(actionElement.dataset.id, 10));
        return;
      }

      if (action === 'close-modal') {
        const modal = actionElement.closest('.modal-custom');
        if (modal) modal.classList.remove('active');
        document.body.style.overflow = '';
        return;
      }
    }

    // Legacy class-based actions for existing buttons that still use old selectors
    const sosBtn = e.target.closest('.btn-open-sos');
    if (sosBtn) {
      e.preventDefault();
      window.openModal('modal-emergency-sos');
      return;
    }

    const donorBtn = e.target.closest('.btn-open-donor-reg');
    if (donorBtn) {
      e.preventDefault();
      window.openModal('modal-donor-reg');
      return;
    }

    const loginBtn = e.target.closest('.btn-open-login');
    if (loginBtn) {
      e.preventDefault();
      window.openModal('modal-auth-login');
      return;
    }

    const adminBtn = e.target.closest('#btn-open-admin') || e.target.closest('#btn-nav-admin');
    if (adminBtn) {
      e.preventDefault();
      if (currentUser && currentUser.role === 'admin') {
        window.openModal('modal-admin-dashboard');
        loadAdminData();
      } else {
        window.openModal('modal-auth-login');
        showToast('Please sign in with administrator credentials.', 'info');
      }
      return;
    }

    const closeBtn = e.target.closest('.modal-close-btn') || e.target.closest('.modal-close-btn-inline');
    if (closeBtn) {
      e.preventDefault();
      const modal = closeBtn.closest('.modal-custom');
      if (modal) modal.classList.remove('active');
      document.body.style.overflow = '';
      return;
    }

    if (e.target.classList.contains('modal-custom')) {
      e.target.classList.remove('active');
      document.body.style.overflow = '';
      return;
    }
  });

  // ESC key to close any active modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.closeModal();
    }
  });
}

// ==========================================================================
// Form Submission Handlers
// ==========================================================================
function initFormListeners() {
  // 1. Emergency Blood Request
  const formSos = document.getElementById('form-emergency-sos');
  if (formSos) {
    formSos.addEventListener('submit', async (e) => {
      e.preventDefault();

      const payload = {
        patient_name: document.getElementById('sos-patient-name').value.trim(),
        hospital_name: document.getElementById('sos-hospital-name').value.trim(),
        contact_person: document.getElementById('sos-contact-name').value.trim(),
        contact_phone: document.getElementById('sos-contact-phone').value.trim(),
        blood_group: document.getElementById('sos-blood-group').value,
        units_requested: parseInt(document.getElementById('sos-units').value, 10),
        urgency_level: document.getElementById('sos-urgency').value,
        city: document.getElementById('sos-city').value.trim(),
        reason: document.getElementById('sos-reason').value.trim()
      };

      try {
        const res = await fetch('/api/requests', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (result.success) {
          showToast(`SOS Dispatched! Tracking Code: ${result.requestCode}`, 'success');
          formSos.reset();
          closeModal('modal-emergency-sos');
          fetchGlobalStats();
        } else {
          showToast(result.message || 'Failed to submit request', 'error');
        }
      } catch (err) {
        showToast('Network error submitting request.', 'error');
      }
    });
  }

  // 2. Donor Registration
  const formDonor = document.getElementById('form-donor-register');
  if (formDonor) {
    formDonor.addEventListener('submit', async (e) => {
      e.preventDefault();

      const payload = {
        name: document.getElementById('reg-donor-name').value.trim(),
        email: document.getElementById('reg-donor-email').value.trim(),
        phone: document.getElementById('reg-donor-phone').value.trim(),
        blood_group: document.getElementById('reg-donor-bg').value,
        age: parseInt(document.getElementById('reg-donor-age').value, 10),
        gender: document.getElementById('reg-donor-gender').value,
        city: document.getElementById('reg-donor-city').value.trim(),
        medical_notes: document.getElementById('reg-donor-notes').value.trim()
      };

      try {
        const res = await fetch('/api/donors/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {})
          },
          body: JSON.stringify(payload)
        });
        const result = await res.json();

        if (result.success) {
          showToast('Welcome to LifeBlood! Donor registered.', 'success');
          formDonor.reset();
          closeModal('modal-donor-reg');
          fetchDonors();
          fetchGlobalStats();

          // Render Digital Donor Card Preview
          renderDigitalCard(payload.name, payload.blood_group, payload.city);
        } else {
          showToast(result.message || 'Registration failed', 'error');
        }
      } catch (err) {
        showToast('Error registering donor.', 'error');
      }
    });
  }

  // 3. User / Admin Login
  const formLogin = document.getElementById('form-auth-login');
  if (formLogin) {
    formLogin.addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const result = await res.json();

        if (result.success) {
          currentToken = result.token;
          currentUser = result.user;
          localStorage.setItem('lifeblood_token', currentToken);
          localStorage.setItem('lifeblood_user', JSON.stringify(currentUser));

          showToast(`Welcome back, ${currentUser.name}!`, 'success');
          closeModal('modal-auth-login');
          checkAuthUI();

          if (currentUser.role === 'admin') {
            openModal('modal-admin-dashboard');
            loadAdminData();
          }
        } else {
          showToast(result.message || 'Authentication failed', 'error');
        }
      } catch (err) {
        showToast('Error signing in.', 'error');
      }
    });
  }

  // Donor Search Filters Listener
  const filterBg = document.getElementById('filter-donor-bg');
  const filterCity = document.getElementById('filter-donor-city');
  if (filterBg) filterBg.addEventListener('change', fetchDonors);
  if (filterCity) filterCity.addEventListener('input', debounce(fetchDonors, 400));
}

// Quick trigger SOS from donor card
window.triggerRequestForDonor = function (donorName, bloodGroup, city) {
  openModal('modal-emergency-sos');
  const bgSelect = document.getElementById('sos-blood-group');
  const cityInput = document.getElementById('sos-city');
  const reasonInput = document.getElementById('sos-reason');

  if (bgSelect) bgSelect.value = bloodGroup;
  if (cityInput) cityInput.value = city;
  if (reasonInput) reasonInput.value = `Directed request matched for donor: ${donorName}`;
};

// ==========================================================================
// Digital Donor ID Card Renderer
// ==========================================================================
function renderDigitalCard(name, bloodGroup, city) {
  const cardBox = document.getElementById('digital-card-preview');
  if (!cardBox) return;

  const issueDate = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  const heroId = `LB-${Math.floor(100000 + Math.random() * 900000)}`;

  cardBox.innerHTML = `
    <div class="donor-id-card">
      <div class="d-flex justify-content-between align-items-start">
        <div class="d-flex align-items-center gap-2">
          <div class="brand-icon-box" style="width: 32px; height: 32px;">
            <i class="fas fa-heartbeat text-white" style="font-size: 0.9rem;"></i>
          </div>
          <strong style="font-size: 1.1rem; letter-spacing: 0.05em;">LIFEBLOOD</strong>
        </div>
        <span class="badge-futuristic" style="font-size: 0.8rem;">HERO PASS</span>
      </div>

      <div class="donor-id-chip mt-3"></div>
      <div class="donor-id-blood">${bloodGroup}</div>

      <div class="mt-2">
        <div class="text-cyan fw-bold mb-1" style="font-size: 0.9rem; letter-spacing: 0.05em; text-transform: uppercase;">Verified Blood Donor</div>
        <h4 class="text-white mb-2 fw-bold" style="font-size: 1.35rem;">${name}</h4>
      </div>

      <div class="d-flex justify-content-between align-items-center pt-2 border-top border-secondary mt-3" style="font-size: 0.9rem;">
        <div>
          <span class="text-white d-block" style="font-size: 0.82rem; font-weight: 700; letter-spacing: 0.04em;">LOCATION</span>
          <strong class="text-white">${city}</strong>
        </div>
        <div>
          <span class="text-white d-block" style="font-size: 0.82rem; font-weight: 700; letter-spacing: 0.04em;">ID NO</span>
          <strong class="text-white">${heroId}</strong>
        </div>
        <div>
          <span class="text-white d-block" style="font-size: 0.82rem; font-weight: 700; letter-spacing: 0.04em;">MEMBER SINCE</span>
          <strong class="text-white">${issueDate}</strong>
        </div>
      </div>
    </div>
  `;
}

// ==========================================================================
// Admin Dashboard Controller
// ==========================================================================
async function loadAdminData() {
  if (!currentToken) return;

  try {
    // 1. Load Requests
    const reqRes = await fetch('/api/requests');
    const reqData = await reqRes.json();
    const tableBody = document.getElementById('admin-requests-tbody');

    if (tableBody && reqData.success) {
      tableBody.innerHTML = '';
      reqData.data.forEach((r) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${r.request_code}</strong></td>
          <td><strong class="text-white">${r.patient_name}</strong><br><small class="text-white fw-medium">${r.hospital_name}</small></td>
          <td><span class="badge bg-danger">${r.blood_group}</span> (${r.units_requested}u)</td>
          <td><span class="badge bg-${r.urgency_level === 'Critical_Emergency' ? 'danger' : 'warning'}">${r.urgency_level}</span></td>
          <td>
            <select class="form-select form-select-sm bg-dark text-white border-secondary admin-request-status-select" data-request-id="${r.id}">
              <option value="Pending" ${r.status === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="Approved" ${r.status === 'Approved' ? 'selected' : ''}>Approved</option>
              <option value="Dispatched" ${r.status === 'Dispatched' ? 'selected' : ''}>Dispatched</option>
              <option value="Fulfilled" ${r.status === 'Fulfilled' ? 'selected' : ''}>Fulfilled</option>
              <option value="Cancelled" ${r.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
            </select>
          </td>
        `;
        tableBody.appendChild(tr);
      });
    }

    // 2. Load Inventory Controls
    const invRes = await fetch('/api/inventory');
    const invData = await invRes.json();
    const invTbody = document.getElementById('admin-inventory-tbody');

    if (invTbody && invData.success) {
      invTbody.innerHTML = '';
      invData.data.forEach((item) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${item.blood_group}</strong></td>
          <td>
            <input type="number" class="form-control form-control-sm bg-dark text-white border-secondary" style="width: 90px;" id="inv-units-${item.id}" value="${item.units_available}" min="0">
          </td>
          <td><span class="blood-status-pill status-${item.status}">${item.status}</span></td>
          <td>
            <button class="btn btn-sm btn-cyan-outline" data-action="save-inventory-unit" data-id="${item.id}">
              <i class="fas fa-save me-1"></i> Update
            </button>
          </td>
        `;
        invTbody.appendChild(tr);
      });
    }
  } catch (err) {
    console.error('Failed to load admin panel data:', err);
  }
}

window.updateRequestStatus = async function (id, newStatus) {
  try {
    const res = await fetch(`/api/requests/${id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ status: newStatus })
    });
    const result = await res.json();
    if (result.success) {
      showToast(`Request updated to ${newStatus}`, 'success');
      fetchLiveInventory();
      fetchGlobalStats();
    } else {
      showToast(result.message, 'error');
    }
  } catch (err) {
    showToast('Failed to update request status', 'error');
  }
};

window.saveInventoryUnit = async function (id) {
  const unitsInput = document.getElementById(`inv-units-${id}`);
  if (!unitsInput) return;

  const units = parseInt(unitsInput.value, 10);
  try {
    const res = await fetch(`/api/inventory/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${currentToken}`
      },
      body: JSON.stringify({ units_available: units })
    });
    const result = await res.json();
    if (result.success) {
      showToast(result.message, 'success');
      fetchLiveInventory();
      fetchGlobalStats();
      loadAdminData();
    } else {
      showToast(result.message, 'error');
    }
  } catch (err) {
    showToast('Failed to update inventory unit', 'error');
  }
};

// ==========================================================================
// Authentication State & Role-Based Portals Management
// ==========================================================================
function checkAuthUI() {
  try {
    const authNav = document.getElementById('nav-auth-container');
    if (!authNav) return;

    if (currentUser && currentToken) {
      let portalBtn = '';
      const role = currentUser.role || 'donor';

      if (role === 'admin') {
        portalBtn = `<button class="btn btn-sm btn-cyan-outline" data-action="open-admin"><i class="fas fa-chart-line me-1"></i> Dashboard</button>`;
      } else if (role === 'donor') {
        portalBtn = `<button class="btn btn-sm btn-crimson" data-action="open-donor-portal"><i class="fas fa-hand-holding-heart me-1"></i> My Hero Portal</button>`;
      } else if (role === 'hospital') {
        portalBtn = `<button class="btn btn-sm btn-cyan-outline" data-action="open-hospital-portal"><i class="fas fa-hospital me-1"></i> Hospital Hub</button>`;
      }

      const badgeColor = role === 'admin' ? 'bg-danger' : (role === 'hospital' ? 'bg-info' : 'bg-success');
      const safeFirstName = (currentUser.name && typeof currentUser.name === 'string') 
        ? currentUser.name.split(' ')[0] 
        : ((currentUser.email && typeof currentUser.email === 'string') ? currentUser.email.split('@')[0] : 'Hero');

      authNav.innerHTML = `
        <div class="d-flex align-items-center gap-2">
          <span class="text-white small d-none d-md-inline">
            Hi, <strong>${safeFirstName}</strong> 
            <span class="badge ${badgeColor}" style="font-size: 0.78rem; font-weight: 700; text-transform: uppercase;">${role}</span>
          </span>
          ${portalBtn}
          <button class="btn btn-sm btn-glass text-danger" data-action="logout" title="Sign Out">
            <i class="fas fa-sign-out-alt"></i>
          </button>
        </div>
      `;
    } else {
      authNav.innerHTML = `
        <a href="/login" class="btn btn-sm btn-glass btn-open-login" data-action="open-login">
          <i class="fas fa-lock me-1"></i> Sign In
        </a>
      `;
    }
  } catch (err) {
    console.warn('checkAuthUI error:', err);
  }
}

window.logoutUser = async function () {
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (e) {
    // Continue local cleanup even if offline
  }

  // 1. Thoroughly wipe all credentials and session state
  localStorage.clear();
  sessionStorage.clear();
  document.cookie.split(";").forEach((c) => { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
  });
  currentToken = null;
  currentUser = null;

  // 2. Close all open modals and unlock document scroll
  window.closeModal();
  document.body.classList.remove('modal-open');
  document.body.style.overflow = '';

  // 3. Hard redirect to login page with history replacement (prevents Back button loop)
  window.location.replace('/login?logged_out=true');
};

// ==========================================================================
// Admin Dashboard Controller
// ==========================================================================
window.openAdminDashboard = function () {
  if (!currentUser || currentUser.role !== 'admin') {
    window.openModal('modal-auth-login');
    showToast('Administrator privileges required.', 'info');
    return;
  }
  window.openModal('modal-admin-dashboard');
  loadAdminData();
};

// ==========================================================================
// Donor Portal Controller
// ==========================================================================
let currentDonorData = null;

window.openDonorPortal = async function () {
  if (!currentUser) {
    window.openModal('modal-auth-login');
    showToast('Please sign in to access your Donor Portal.', 'info');
    return;
  }

  window.openModal('modal-donor-portal');
  const nameEl = document.getElementById('donor-portal-name');
  if (nameEl) nameEl.textContent = currentUser.name;

  try {
    const res = await fetch(`/api/donors/profile?email=${encodeURIComponent(currentUser.email)}`);
    const data = await res.json();

    if (data.success && data.hasProfile && data.donor) {
      currentDonorData = data.donor;
    } else {
      currentDonorData = {
        id: 1,
        name: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone || '+91 98401 22334',
        blood_group: 'O+',
        age: 28,
        city: 'Chennai',
        total_donations: 4,
        is_available: true
      };
    }

    // Populate Metrics
    document.getElementById('donor-portal-bg').textContent = currentDonorData.blood_group;
    document.getElementById('donor-portal-donations').textContent = currentDonorData.total_donations;
    document.getElementById('donor-portal-lives').textContent = currentDonorData.total_donations * 3;

    // Availability Toggle
    const toggle = document.getElementById('donor-avail-checkbox');
    const badge = document.getElementById('donor-avail-badge');
    if (toggle) toggle.checked = currentDonorData.is_available;
    if (badge) {
      badge.textContent = currentDonorData.is_available ? 'AVAILABLE' : 'COOLDOWN';
      badge.className = `badge ${currentDonorData.is_available ? 'bg-success' : 'bg-warning'} px-2 py-1`;
    }

    // Render Digital Pass
    renderDonorPassCard(currentDonorData);

    // Load Appointments
    loadDonorAppointments();
  } catch (err) {
    console.error('Error loading donor portal:', err);
  }
};

function renderDonorPassCard(donor) {
  const container = document.getElementById('donor-portal-card-render');
  if (!container) return;

  const heroId = `LB-${donor.id ? String(donor.id).padStart(4, '0') : '8821'}`;
  const issueDate = new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

  container.innerHTML = `
    <div class="donor-id-card" style="box-shadow: 0 15px 35px rgba(0,0,0,0.8), 0 0 25px rgba(230,57,70,0.3);">
      <div class="d-flex justify-content-between align-items-start">
        <div class="d-flex align-items-center gap-2">
          <div class="brand-icon-box" style="width: 34px; height: 34px;">
            <i class="fas fa-heartbeat text-white" style="font-size: 0.95rem;"></i>
          </div>
          <strong style="font-size: 1.15rem; letter-spacing: 0.05em;">LIFEBLOOD</strong>
        </div>
        <span class="badge-futuristic" style="font-size: 0.8rem;">VERIFIED HERO PASS</span>
      </div>

      <div class="donor-id-chip mt-3"></div>
      <div class="donor-id-blood">${donor.blood_group}</div>

      <div class="mt-2">
        <div class="text-cyan fw-bold mb-1" style="font-size: 0.9rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">Registered Blood Donor</div>
        <h3 class="text-white mb-1 fw-bold" style="font-size: 1.45rem;">${donor.name}</h3>
        <span class="text-white fw-medium" style="font-size: 0.92rem;">${donor.email} • ${donor.phone}</span>
      </div>

      <div class="d-flex justify-content-between align-items-center pt-3 border-top border-secondary mt-3" style="font-size: 0.9rem;">
        <div>
          <span class="text-white d-block" style="font-size: 0.82rem; font-weight: 700; letter-spacing: 0.04em;">LOCATION</span>
          <strong class="text-white">${donor.city}</strong>
        </div>
        <div>
          <span class="text-white d-block" style="font-size: 0.82rem; font-weight: 700; letter-spacing: 0.04em;">DONOR ID</span>
          <strong class="text-white">${heroId}</strong>
        </div>
        <div>
          <span class="text-white d-block" style="font-size: 0.82rem; font-weight: 700; letter-spacing: 0.04em;">IMPACT</span>
          <strong class="text-danger fw-bold">${donor.total_donations * 3} Lives Saved</strong>
        </div>
      </div>
    </div>
  `;
}

window.toggleMyAvailability = async function (isChecked) {
  const badge = document.getElementById('donor-avail-badge');
  if (badge) {
    badge.textContent = isChecked ? 'AVAILABLE' : 'COOLDOWN';
    badge.className = `badge ${isChecked ? 'bg-success' : 'bg-warning'} px-2 py-1`;
  }

  if (currentDonorData) {
    currentDonorData.is_available = isChecked;
    try {
      await fetch(`/api/donors/${currentDonorData.id}/availability`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {})
        },
        body: JSON.stringify({ is_available: isChecked })
      });
      showToast(`Status updated to ${isChecked ? 'Available for emergency calls' : 'Cooldown / Unavailable'}`, 'info');
      fetchDonors();
    } catch (e) {
      console.error(e);
    }
  }
};

window.switchDonorTab = function (tab) {
  const tabPass = document.getElementById('donor-tab-pass');
  const tabApp = document.getElementById('donor-tab-appointments');
  const tabHealth = document.getElementById('donor-tab-health');

  document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.remove('active'));

  if (tab === 'pass') {
    tabPass.style.display = 'block';
    tabApp.style.display = 'none';
    tabHealth.style.display = 'none';
    document.getElementById('tab-btn-donor-pass').classList.add('active');
  } else if (tab === 'appointments') {
    tabPass.style.display = 'none';
    tabApp.style.display = 'block';
    tabHealth.style.display = 'none';
    document.getElementById('tab-btn-donor-appointments').classList.add('active');
  } else {
    tabPass.style.display = 'none';
    tabApp.style.display = 'none';
    tabHealth.style.display = 'block';
    document.getElementById('tab-btn-donor-health').classList.add('active');
  }
};

async function loadDonorAppointments() {
  const container = document.getElementById('donor-appointments-container');
  if (!container) return;

  try {
    const res = await fetch(`/api/donors/appointments/list?email=${encodeURIComponent(currentUser.email)}`);
    const data = await res.json();

    container.innerHTML = '';
    if (data.success && data.data.length > 0) {
      data.data.forEach(app => {
        const item = document.createElement('div');
        item.className = 'p-3 bg-dark rounded-3 border border-secondary d-flex justify-content-between align-items-center';
        item.innerHTML = `
          <div>
            <div class="fw-bold text-white mb-1"><i class="fas fa-hospital-alt text-info me-1"></i> ${app.bank_name || 'Central Medical Blood Center'}</div>
            <div class="text-white small fw-bold"><i class="fas fa-calendar me-1 text-cyan"></i> ${app.appointment_date} &bull; <i class="fas fa-clock me-1 text-warning"></i> ${app.time_slot}</div>
          </div>
          <span class="badge bg-success px-2 py-1">${app.status || 'Confirmed'}</span>
        `;
        container.appendChild(item);
      });
    } else {
      container.innerHTML = `
        <div class="p-4 text-center text-white border border-secondary border-dashed rounded-3">
          <i class="fas fa-calendar-check fa-2x mb-2 text-cyan"></i>
          <p class="mb-0 text-white fw-bold">No active donation appointments scheduled.</p>
        </div>
      `;
    }
  } catch (err) {
    console.error(err);
  }
}

window.openBookAppointmentForm = function () {
  const form = document.getElementById('form-inline-appointment');
  if (form) form.style.display = form.style.display === 'none' ? 'block' : 'none';
};

window.confirmAppointmentBooking = async function () {
  const dateInput = document.getElementById('app-date-input');
  const slotSelect = document.getElementById('app-slot-select');
  const bankSelect = document.getElementById('app-bank-select');

  if (!dateInput.value) {
    showToast('Please select an appointment date.', 'error');
    dateInput.classList.add('input-error');
    return;
  }
  dateInput.classList.remove('input-error');

  const payload = {
    donor_name: currentUser.name,
    donor_email: currentUser.email,
    donor_phone: currentUser.phone || '+91 98401 22334',
    blood_group: currentDonorData ? currentDonorData.blood_group : 'O+',
    blood_bank_id: parseInt(bankSelect.value, 10),
    appointment_date: dateInput.value,
    time_slot: slotSelect.value
  };

  try {
    const res = await fetch('/api/donors/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (result.success) {
      showToast('Donation appointment scheduled successfully!', 'success');
      document.getElementById('form-inline-appointment').style.display = 'none';
      loadDonorAppointments();
    } else {
      showToast(result.message || 'Booking failed', 'error');
    }
  } catch (e) {
    showToast('Network error scheduling appointment', 'error');
  }
};

// ==========================================================================
// Hospital Portal Controller
// ==========================================================================
window.openHospitalPortal = async function () {
  if (!currentUser) {
    window.openModal('modal-auth-login');
    showToast('Please sign in to access Hospital Portal.', 'info');
    return;
  }

  window.openModal('modal-hospital-portal');
  const nameEl = document.getElementById('hospital-portal-name');
  if (nameEl) nameEl.textContent = currentUser.name;

  try {
    const res = await fetch('/api/requests');
    const data = await res.json();

    const tbody = document.getElementById('hospital-requests-tbody');
    if (!tbody || !data.success) return;

    tbody.innerHTML = '';
    const requests = data.data;

    const activeCount = requests.filter(r => r.status !== 'Fulfilled' && r.status !== 'Cancelled').length;
    const fulfilledCount = requests.filter(r => r.status === 'Fulfilled').length;

    document.getElementById('hosp-metric-active').textContent = activeCount;
    document.getElementById('hosp-metric-fulfilled').textContent = fulfilledCount;

    requests.forEach(r => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong class="text-white">${r.request_code}</strong></td>
        <td><strong class="text-white">${r.patient_name}</strong><br><small class="text-white fw-medium">${r.hospital_name}</small></td>
        <td><span class="badge bg-danger">${r.blood_group}</span> (${r.units_requested}u)</td>
        <td><span class="badge bg-${r.urgency_level === 'Critical_Emergency' ? 'danger' : 'warning'}">${r.urgency_level}</span></td>
        <td><span class="badge-status-pill badge-status-${r.status}">${r.status}</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error('Error loading hospital portal:', err);
  }
};

// ==========================================================================
// Machine Learning Intelligence Controllers
// ==========================================================================
window.loadMLForecastData = async function () {
  const tbody = document.getElementById('ml-forecast-tbody');
  if (!tbody) return;

  try {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-white py-3 fw-bold"><i class="fas fa-spinner fa-spin me-2 text-cyan"></i> Running Multi-Factor Regression Models...</td></tr>';
    const res = await fetch('/api/ml/forecast');
    const result = await res.json();

    if (!result.success || !result.data) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-2">Failed to calculate ML forecast.</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    result.data.forEach(item => {
      const tr = document.createElement('tr');
      const varSign = item.variance > 0 ? `+${item.variance}` : item.variance;

      tr.innerHTML = `
        <td><strong class="text-white">${item.blood_group}</strong></td>
        <td>${item.current_stock}u</td>
        <td><strong>${item.predicted_demand_30d}u</strong></td>
        <td><span class="badge bg-${item.badge_class}" style="font-size: 0.8rem; font-weight: 700;">${item.risk_level} (${varSign}u)</span></td>
        <td class="small text-white">${item.recommended_action}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger py-2">Forecast service unavailable.</td></tr>';
  }
};

window.runDonorMLPrediction = async function () {
  const recency = document.getElementById('ml-donor-recency')?.value || 3;
  const frequency = document.getElementById('ml-donor-frequency')?.value || 5;
  const age = document.getElementById('ml-donor-age')?.value || 28;
  const resultBox = document.getElementById('ml-donor-result');
  const scoreEl = document.getElementById('ml-donor-score');
  const badgeEl = document.getElementById('ml-donor-badge');
  const stratEl = document.getElementById('ml-donor-strategy');

  if (!resultBox) return;

  try {
    const res = await fetch('/api/ml/predict-donor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recency_months: recency,
        frequency_donations: frequency,
        time_months: frequency * 4,
        age: age
      })
    });
    const data = await res.json();

    if (data.success) {
      resultBox.style.display = 'block';
      scoreEl.className = `h5 mb-1 text-${data.badge_class}`;
      scoreEl.textContent = `${data.probability_score}% Probability`;
      badgeEl.className = `badge bg-${data.badge_class} px-2 py-1 mb-2`;
      badgeEl.textContent = data.likelihood_category;
      stratEl.textContent = data.retention_strategy;
      showToast(`ML Model: ${data.probability_score}% Return Probability`, 'info');
    }
  } catch (err) {
    showToast('ML evaluation failed.', 'error');
  }
};

// ==========================================================================
// Toast Notification Engine
// ==========================================================================
function showToast(message, type = 'info') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `custom-toast toast-${type}`;

  const icon = type === 'success' ? 'fa-check-circle text-success' : (type === 'error' ? 'fa-exclamation-triangle text-danger' : 'fa-info-circle text-info');

  toast.innerHTML = `
    <i class="fas ${icon} fa-lg"></i>
    <div style="font-size: 0.92rem; font-weight: 500;">${message}</div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(40px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4500);
}

// Utility debounce
function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// ==========================================================================
// 1. Security Input Sanitization (XSS Prevention)
// ==========================================================================
window.escapeHTML = function (str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// ==========================================================================
// 2. Mobile-Friendly Navigation Auto-Collapse
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  const navContent = document.getElementById('navContent');
  if (navContent) {
    document.querySelectorAll('#navContent .nav-link-custom, #btn-open-sos, .btn-open-login').forEach(elem => {
      elem.addEventListener('click', () => {
        try {
          if (navContent.classList.contains('show') && typeof bootstrap !== 'undefined' && bootstrap.Collapse) {
            const bsCollapse = bootstrap.Collapse.getInstance(navContent) || new bootstrap.Collapse(navContent, { toggle: false });
            bsCollapse.hide();
          }
        } catch (e) {}
      });
    });
  }

  // Log Core Web Vitals to console for performance observability (Fast Loading)
  if (window.performance && window.performance.timing) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const t = window.performance.timing;
        const loadTime = t.loadEventEnd - t.navigationStart;
        const domReady = t.domContentLoadedEventEnd - t.navigationStart;
        console.log(`[LifeBlood Performance] Page Load: ${loadTime}ms | DOM Ready: ${domReady}ms`);
      }, 0);
    });
  }
});


