// ==================== OTP SERVICE via EmailJS ====================
// Uses EmailJS free tier — sends real OTP to Gmail
// EmailJS service: gmail, template sends {{otp}} to {{to_email}}
const EMAILJS_PUBLIC_KEY = '756OHmBVxI5fBOlHZ';
const EMAILJS_SERVICE_ID = 'service_dok9pcg';
const EMAILJS_TEMPLATE_ID = 'template_xwv5zvx';

let _otpState = {
  code: '',
  email: '',
  purpose: '', // 'register' | 'login'
  pendingUser: null,
  timerInterval: null,
  expiresAt: 0,
};

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function loadEmailJS() {
  return new Promise((resolve, reject) => {
    if (window.emailjs) { resolve(); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js';
    s.onload = () => { emailjs.init(EMAILJS_PUBLIC_KEY); resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function sendOTPEmail(toEmail, otp) {
  try {
    await loadEmailJS();
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: toEmail,
      otp: otp,
      app_name: 'TruVanta',
    });
    return { success: true };
  } catch (err) {
    console.warn('EmailJS error (demo mode):', err);
    // DEMO MODE: Show OTP in toast when EmailJS not configured
    return { success: false, demo: true, otp: otp };
  }
}

function startOTPTimer() {
  clearInterval(_otpState.timerInterval);
  _otpState.expiresAt = Date.now() + 5 * 60 * 1000;
  _otpState.timerInterval = setInterval(() => {
    const remaining = _otpState.expiresAt - Date.now();
    if (remaining <= 0) {
      clearInterval(_otpState.timerInterval);
      document.getElementById('otpCountdown').textContent = '00:00';
      document.getElementById('otpCountdown').style.color = 'var(--danger)';
      document.getElementById('otpVerifyBtn').disabled = true;
      showToast('OTP expired. Please resend.', 'error');
      return;
    }
    const m = String(Math.floor(remaining / 60000)).padStart(2, '0');
    const s = String(Math.floor((remaining % 60000) / 1000)).padStart(2, '0');
    const el = document.getElementById('otpCountdown');
    if (el) el.textContent = m + ':' + s;
  }, 1000);
}

async function initiateOTP(email, purpose, pendingUser) {
  _otpState.code = generateOTP();
  _otpState.email = email;
  _otpState.purpose = purpose;
  _otpState.pendingUser = pendingUser;

  document.getElementById('otpModalSubtitle').textContent =
    'We sent a 6-digit OTP to ' + email + '. Check your inbox (and spam folder).';
  document.getElementById('otpInput').value = '';
  document.getElementById('otpVerifyBtn').disabled = false;
  document.getElementById('otpCountdown').style.color = 'var(--accent)';

  showModal('otpModal');
  startOTPTimer();

  const result = await sendOTPEmail(email, _otpState.code);
  if (result.demo) {
    // Demo mode: EmailJS not configured — show OTP in UI
    showToast('📧 DEMO MODE — OTP: ' + result.otp + ' (EmailJS not configured)', 'info');
    console.log('%c🔑 TruVanta OTP (Demo): ' + result.otp, 'font-size:20px; color:#00d4ff; font-weight:bold');
  } else {
    showToast('📧 OTP sent to ' + email + '! Check your inbox.', 'success');
  }
}

function verifyOTP() {
  const entered = document.getElementById('otpInput').value.trim();
  if (!entered || entered.length !== 6) {
    showToast('Please enter the 6-digit OTP', 'error'); return;
  }
  if (Date.now() > _otpState.expiresAt) {
    showToast('OTP has expired. Please resend.', 'error'); return;
  }
  if (entered !== _otpState.code) {
    showToast('Incorrect OTP. Please try again.', 'error');
    document.getElementById('otpInput').value = '';
    document.getElementById('otpInput').focus();
    return;
  }

  clearInterval(_otpState.timerInterval);
  closeModal('otpModal');

  if (_otpState.purpose === 'register') {
    const user = _otpState.pendingUser;
    // Re-read from localStorage to prevent overwriting other users
    db.users = JSON.parse(localStorage.getItem('tv_users') || '[]');
    if (!db.users.find(u => u.email === user.email)) {
      db.users.push(user);
    }
    db.currentUser = user;
    saveDb();
    const msg = document.getElementById('regSuccessMsg');
    document.getElementById('regSuccessName').textContent = 'Account created for ' + user.name + ' ✓';
    msg.style.display = 'block';
    updateNavUser();
    showToast('✅ Email verified! Account created successfully.', 'success');
    _otpState = { code:'', email:'', purpose:'', pendingUser:null, timerInterval:null, expiresAt:0 };
    setTimeout(() => { updateProfilePage(); showPage('profile'); }, 1500);

  } else if (_otpState.purpose === 'forgotPassword') {
    // Keep _otpState.email alive so resetPassword() can use it
    _otpState.code = '';
    _otpState.timerInterval = null;
    document.getElementById('forgotNewPassSection').style.display = 'block';
    document.getElementById('forgotSendOtpBtn').style.display = 'none';
    document.getElementById('forgot-email').disabled = true;
    showToast('✅ Email verified! Set your new password below.', 'success');
    setTimeout(() => {
      document.getElementById('forgotNewPassSection').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 200);
  }
}

async function resendOTP() {
  if (!_otpState.email) { showToast('No email found. Please restart.', 'error'); return; }
  _otpState.code = generateOTP();
  document.getElementById('otpInput').value = '';
  document.getElementById('otpVerifyBtn').disabled = false;
  document.getElementById('otpCountdown').style.color = 'var(--accent)';
  startOTPTimer();
  const result = await sendOTPEmail(_otpState.email, _otpState.code);
  if (result.demo) {
    showToast('📧 DEMO — New OTP: ' + result.otp, 'info');
    console.log('%c🔑 New OTP (Demo): ' + result.otp, 'font-size:20px; color:#00d4ff; font-weight:bold');
  } else {
    showToast('📧 New OTP sent to ' + _otpState.email, 'success');
  }
}

// ==================== STATE ====================
let db = {
  users: JSON.parse(localStorage.getItem('tv_users') || '[]'),
  bookings: JSON.parse(localStorage.getItem('tv_bookings') || '[]'),
  trustScores: JSON.parse(localStorage.getItem('tv_trust') || '[]'),
  geoData: JSON.parse(localStorage.getItem('tv_geo') || '[]'),
  currentUser: JSON.parse(localStorage.getItem('tv_current') || 'null')
};

function saveDb() {
  localStorage.setItem('tv_users', JSON.stringify(db.users));
  localStorage.setItem('tv_bookings', JSON.stringify(db.bookings));
  localStorage.setItem('tv_trust', JSON.stringify(db.trustScores));
  localStorage.setItem('tv_geo', JSON.stringify(db.geoData));
  localStorage.setItem('tv_current', JSON.stringify(db.currentUser));
}

function exportDatabase(newEntry, table) {
  const allData = {
    exported_at: new Date().toISOString(),
    users: db.users.map(u => ({ id:u.id, name:u.name, email:u.email, phone:u.phone, role:u.role, created:u.created })),
    bookings: db.bookings,
    trust_scores: db.trustScores,
    geo_registrations: db.geoData
  };
  const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'truvanta_database.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}

// ==================== ROLE HELPERS ====================
function isLoggedIn() { return !!db.currentUser; }
function isProvider() { return db.currentUser && db.currentUser.role === 'Service Provider'; }
function isCustomer() { return db.currentUser && db.currentUser.role === 'Customer'; }

// ==================== NAVIGATION ====================
function showPage(page) {
  // Block protected pages if not logged in
  if (['payment','emergency','features','services'].includes(page) && !db.currentUser) {
    showToast('Please sign in or create an account to access this section.', 'error');
    page = 'login';
  }
  closeNavDropdown();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');
  window.scrollTo(0, 0);
  if (page !== 'services') {
    const sfc = document.getElementById('serviceFormContainer');
    if (sfc) sfc.style.display = 'none';
    const prs = document.getElementById('providerResultsSection');
    if (prs) prs.style.display = 'none';
  }
  if (page === 'features') applyFeaturesRoleAccess();
  if (page === 'services') applyServicesRoleAccess();
  if (page === 'emergency') populateEmergencyProviders();
  if (page === 'home') populateGeoNearby();
  if (page === 'register') clearRegisterForm();
  if (page === 'login') clearLoginForm();
  updateNavUser();
}

function clearRegisterForm() {
  ['reg-name','reg-email','reg-phone','reg-pass','reg-pass2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const roleEl = document.getElementById('reg-role');
  if (roleEl) roleEl.selectedIndex = 0;
  const msg = document.getElementById('regSuccessMsg');
  if (msg) msg.style.display = 'none';
  const avatarImg = document.getElementById('regAvatarImg');
  if (avatarImg) { avatarImg.style.display = 'none'; avatarImg.src = ''; }
  const avatarIcon = document.getElementById('regAvatarIcon');
  if (avatarIcon) avatarIcon.style.display = 'block';
  ['reg-pass','reg-pass2'].forEach(id => {
    const inp = document.getElementById(id);
    if (inp) inp.type = 'password';
  });
  document.querySelectorAll('#page-register .pass-toggle-btn').forEach(btn => {
    btn.innerHTML = '<i class="fas fa-eye"></i>';
  });
}

function clearLoginForm() {
  ['login-email','login-pass'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const passInp = document.getElementById('login-pass');
  if (passInp) passInp.type = 'password';
  document.querySelectorAll('#page-login .pass-toggle-btn').forEach(btn => {
    btn.innerHTML = '<i class="fas fa-eye"></i>';
  });
  
  // Reset forgot password section
  const forgotSec = document.getElementById('forgotPasswordSection');
  if (forgotSec) forgotSec.style.display = 'none';
  const forgotNewPass = document.getElementById('forgotNewPassSection');
  if (forgotNewPass) forgotNewPass.style.display = 'none';
  const forgotEmail = document.getElementById('forgot-email');
  if (forgotEmail) { forgotEmail.value = ''; forgotEmail.disabled = false; }
  const forgotBtn = document.getElementById('forgotSendOtpBtn');
  if (forgotBtn) { forgotBtn.style.display = 'block'; forgotBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Send OTP to Email'; forgotBtn.disabled = false; }
  ['forgot-newpass','forgot-newpass2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.type = 'password'; }
  });
}

function updateNavUser() {
  const authBtns = document.getElementById('navAuthBtns');
  const userArea  = document.getElementById('navUserArea');
  const navName   = document.getElementById('navUserName');
  const emergBtn  = document.getElementById('navEmergencyBtn');
  if (db.currentUser) {
    authBtns.style.display = 'none';
    userArea.style.display  = 'flex';
    navName.textContent = '👤 ' + db.currentUser.name.split(' ')[0];
    if (emergBtn) emergBtn.style.display = 'inline-block';
  } else {
    authBtns.style.display = 'flex';
    userArea.style.display  = 'none';
    if (emergBtn) emergBtn.style.display = 'none';
    closeNavDropdown();
  }
}

function toggleNavDropdown() {
  const menu    = document.getElementById('navDropdownMenu');
  const chevron = document.getElementById('navChevron');
  const isOpen  = menu && menu.style.display !== 'none';
  if (menu)    menu.style.display    = isOpen ? 'none' : 'block';
  if (chevron) chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
}

function closeNavDropdown() {
  const menu    = document.getElementById('navDropdownMenu');
  const chevron = document.getElementById('navChevron');
  if (menu)    menu.style.display    = 'none';
  if (chevron) chevron.style.transform = 'rotate(0deg)';
}

// ==================== ROLE-BASED ACCESS ====================
function applyFeaturesRoleAccess() {
  const notice = document.getElementById('featuresRoleNotice');
  const trustForm = document.getElementById('trustFormSection');
  const verifyBtn = document.getElementById('verifyBtnSection');
  const geoBtn = document.getElementById('geoBtnSection');

  if (!isLoggedIn()) {
    notice.style.display = 'flex';
    notice.className = 'access-notice';
    notice.innerHTML = `<span class="access-notice-icon">🔒</span><div><strong>Sign in required</strong><br><span style="color:var(--muted);font-size:0.88rem">Please <button class="nav-btn p-0" style="color:var(--accent);display:inline" onclick="showPage('login')">sign in</button> as a <strong>Service Provider</strong> to use these features.</span></div>`;
    lockSection(trustForm); lockSection(verifyBtn); lockSection(geoBtn);
  } else if (isCustomer()) {
    notice.style.display = 'flex';
    notice.className = 'access-notice customer';
    notice.innerHTML = `<span class="access-notice-icon">👁️</span><div><strong>View Only — Customer Account</strong><br><span style="color:var(--muted);font-size:0.88rem">These features are for <strong>Service Providers</strong>. As a customer, you can browse and book from the <button class="nav-btn p-0" style="color:var(--accent3);display:inline" onclick="showPage('services')">Services</button> section.</span></div>`;
    lockSection(trustForm); lockSection(verifyBtn); lockSection(geoBtn);
  } else if (isProvider()) {
    notice.style.display = 'flex';
    notice.className = 'access-notice provider';
    notice.innerHTML = `<span class="access-notice-icon">✅</span><div><strong>Welcome, ${db.currentUser.name.split(' ')[0]}!</strong><br><span style="color:var(--muted);font-size:0.88rem">You're logged in as a <strong>Service Provider</strong>. Click any feature tab above and scroll down to fill in the form.</span></div>`;
    unlockSection(trustForm); unlockSection(verifyBtn); unlockSection(geoBtn);
  }
}

function applyServicesRoleAccess() {
  const notice = document.getElementById('servicesRoleNotice');
  const cards = document.querySelectorAll('#serviceCardsGrid .service-card');

  if (!isLoggedIn()) {
    notice.style.display = 'flex';
    notice.className = 'access-notice';
    notice.innerHTML = `<span class="access-notice-icon">🔒</span><div><strong>Sign in required</strong><br><span style="color:var(--muted);font-size:0.88rem">Please <button class="nav-btn p-0" style="color:var(--accent);display:inline" onclick="showPage('login')">sign in</button> as a <strong>Customer</strong> to book services.</span></div>`;
    cards.forEach(c => c.classList.add('card-locked'));
  } else if (isProvider()) {
    notice.style.display = 'flex';
    notice.className = 'access-notice provider';
    notice.innerHTML = `<span class="access-notice-icon">👁️</span><div><strong>View Only — Service Provider Account</strong><br><span style="color:var(--muted);font-size:0.88rem">This section is for <strong>Customers</strong>. As a provider, your tools are in the <button class="nav-btn p-0" style="color:var(--accent2);display:inline" onclick="showPage('features')">Features</button> section.</span></div>`;
    cards.forEach(c => c.classList.add('card-locked'));
  } else if (isCustomer()) {
    notice.style.display = 'flex';
    notice.className = 'access-notice customer';
    notice.innerHTML = `<span class="access-notice-icon">🛒</span><div><strong>Welcome, ${db.currentUser.name.split(' ')[0]}!</strong><br><span style="color:var(--muted);font-size:0.88rem">You're logged in as a <strong>Customer</strong>. Click any service card below to view providers and book.</span></div>`;
    cards.forEach(c => c.classList.remove('card-locked'));
  }
}

function lockSection(el) { if (el) { el.style.opacity = '0.35'; el.style.pointerEvents = 'none'; } }
function unlockSection(el) { if (el) { el.style.opacity = '1'; el.style.pointerEvents = 'auto'; } }

// ==================== FEATURES ====================
function showFeature(name, e) {
  document.querySelectorAll('.feature-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.feature-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  if (e && e.target) e.target.classList.add('active');
  if (isProvider()) {
    setTimeout(() => {
      const panel = document.getElementById('panel-' + name);
      if (panel) {
        const form = panel.querySelector('.form-page-inner, #trustFormSection, #verifyBtnSection, #geoFormSection');
        if (form) form.scrollIntoView({ behavior: 'smooth', block: 'center' });
        else panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }
}

// ==================== SERVICES ====================
const serviceConfig = {
  electrician: { title: 'Book Electrician', icon: '⚡', bg: 'rgba(245,158,11,0.15)', sub: 'Wiring, repairs & electrical installations' },
  plumber:     { title: 'Book Plumber',     icon: '🔧', bg: 'rgba(0,212,255,0.15)',    sub: 'Pipe repairs, drainage & leak fixing' },
  teacher:     { title: 'Book Teacher',     icon: '📚', bg: 'rgba(124,58,237,0.15)',   sub: 'Tutoring, coaching & mentoring sessions' },
  cleaner:     { title: 'Book Cleaner',     icon: '🧹', bg: 'rgba(16,185,129,0.15)',   sub: 'Deep cleaning, home & office cleaning' }
};
let currentService = '';
let _providerPage = 0;
const PROVIDERS_PER_PAGE = 9;
let _filteredProviders = [];

function handleServiceCardClick(service) {
  if (!isLoggedIn()) {
    showToast('Please sign in as a Customer to book services.', 'error');
    showPage('login');
    return;
  }
  if (isProvider()) {
    showToast('Viewing only — booking is for Customers.', 'error');
    return;
  }
  showPage('services');
  setTimeout(function(){ openServiceForm(service); }, 120);
}

function openServiceForm(service) {
  currentService = service;
  var conf = serviceConfig[service];
  var container = document.getElementById('serviceFormContainer');
  container.style.display = 'block';
  document.getElementById('serviceFormTitle').textContent = conf.title;
  document.getElementById('serviceFormSub').textContent = conf.sub;
  var icon = document.getElementById('serviceFormIcon');
  icon.textContent = conf.icon;
  icon.style.background = conf.bg;
  // Hide provider section until user clicks "View Nearby"
  var prs = document.getElementById('providerResultsSection');
  if (prs) prs.style.display = 'none';
  // Show the nearby toggle button
  var toggleBtn = document.getElementById('nearbyToggleBtn');
  if (toggleBtn) {
    toggleBtn.style.display = 'inline-flex';
    toggleBtn.innerHTML = '<i class="fas fa-map-marker-alt me-2"></i>View Nearby Available ' + conf.title.replace('Book ','') + 's';
  }
  setTimeout(function(){
    document.getElementById('serviceFormAnchor').scrollIntoView({ behavior:'smooth', block:'start' });
  }, 80);
}

function showProviderResults(service) {
  var section = document.getElementById('providerResultsSection');
  section.style.display = 'block';
  var label = service.charAt(0).toUpperCase() + service.slice(1);
  document.getElementById('providerResultsTitle').textContent = 'Available ' + label + 's Near You';
  _providerPage = 0;
  _filteredProviders = PROVIDERS_DB[service] || [];
  document.getElementById('providerSearch').value = '';
  document.getElementById('providerFilterArea').value = '';
  document.getElementById('providerFilterSort').value = 'trust';
  // Rebuild area dropdown from this service's actual dataset areas
  var areaSet = {};
  (PROVIDERS_DB[service]||[]).forEach(function(p){ if(p.area) areaSet[p.area]=1; });
  var areaSelect = document.getElementById('providerFilterArea');
  areaSelect.innerHTML = '<option value="">All Areas</option>';
  Object.keys(areaSet).sort().forEach(function(a){
    var opt = document.createElement('option');
    opt.value = a; opt.textContent = a;
    areaSelect.appendChild(opt);
  });
  renderProviders(true);
  setTimeout(function(){ section.scrollIntoView({ behavior:'smooth', block:'start' }); }, 300);
}

function renderProviders(reset) {
  if (reset) _providerPage = 0;
  const search = document.getElementById('providerSearch').value.toLowerCase();
  const area   = document.getElementById('providerFilterArea').value;
  const sort   = document.getElementById('providerFilterSort').value;

  let list = (PROVIDERS_DB[currentService] || []).filter(function(p) {
    if (area && p.area !== area) return false;
    if (search && !((p.company||p.name).toLowerCase().includes(search)) &&
        !p.title.toLowerCase().includes(search) &&
        !p.skills.join(',').toLowerCase().includes(search)) return false;
    return true;
  });

  for(var _i=list.length-1;_i>0;_i--){var _j=Math.floor(Math.random()*(_i+1));var _t=list[_i];list[_i]=list[_j];list[_j]=_t;}
  if (sort === 'trust')    list.sort(function(a,b){ return b.trust_score - a.trust_score; });
  else if (sort === 'distance') list.sort(function(a,b){ return a.distance - b.distance; });
  else if (sort === 'rating')   list.sort(function(a,b){ return b.rating - a.rating; });
  else if (sort === 'jobs')     list.sort(function(a,b){ return b.jobs_done - a.jobs_done; });

  _filteredProviders = list;
  var page = list.slice(0, (_providerPage + 1) * PROVIDERS_PER_PAGE);

  document.getElementById('providerResultsCount').textContent =
    list.length + ' providers found' + (area ? ' in ' + area : '');

  var grid = document.getElementById('providerResultsGrid');
  var icons      = { electrician:'⚡', plumber:'🔧', teacher:'📚', cleaner:'🧹' };
  var colors     = { electrician:'rgba(245,158,11,0.15)', plumber:'rgba(0,212,255,0.15)', teacher:'rgba(124,58,237,0.15)', cleaner:'rgba(16,185,129,0.15)' };
  var textColors = { electrician:'var(--gold)', plumber:'var(--accent)', teacher:'var(--accent2)', cleaner:'var(--accent3)' };

  if (reset) grid.innerHTML = '';

  var startIdx = reset ? 0 : _providerPage * PROVIDERS_PER_PAGE;
  page.slice(startIdx).forEach(function(p) {
    var nm = p.company || p.name;
    var card = document.createElement('div');
    card.className = 'nearby-provider-card';
    card.style.cssText = 'flex-direction:column; align-items:flex-start; gap:12px; cursor:pointer';
    card.onclick = function(){ showProviderDetail(p); };

    var availBadge = p.available
      ? '<span style="color:var(--accent3); font-size:0.78rem"><span class="online-dot"></span>Available</span>'
      : '<span style="color:var(--gold); font-size:0.78rem">Busy</span>';

    var skillTags = p.skills.slice(0,3).map(function(s){
      return '<span style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:50px; padding:2px 10px; font-size:0.72rem; color:var(--muted)">' + s + '</span>';
    }).join('');

    var bookBtn = document.createElement('button');
    bookBtn.textContent = 'Book';
    bookBtn.style.cssText = 'background:var(--accent2); border:none; color:#fff; padding:6px 14px; border-radius:8px; cursor:pointer; font-size:0.8rem; font-weight:700; transition:all 0.2s; flex-shrink:0';
    bookBtn.onmouseover = function(){ this.style.background='#4f46e5'; };
    bookBtn.onmouseout  = function(){ this.style.background='var(--accent2)'; };
    bookBtn.onclick = function(e){ e.stopPropagation(); bookThisProvider(nm, p.id); };

    card.innerHTML =
      '<div style="display:flex; align-items:center; gap:12px; width:100%">' +
        '<div class="provider-avatar" style="background:' + colors[currentService] + '; color:' + textColors[currentService] + '; font-size:1.6rem">' + icons[currentService] + '</div>' +
        '<div style="flex:1; min-width:0">' +
          '<div style="font-weight:700; font-size:0.92rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">' + nm + '</div>' +
          '<div style="color:var(--muted); font-size:0.78rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis">' + p.title + '</div>' +
        '</div>' +
        '<div style="text-align:right; flex-shrink:0">' +
          '<span class="trust-badge" style="font-size:0.7rem">⭐ ' + p.trust_score + '</span>' +
          '<div style="margin-top:4px">' + availBadge + '</div>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex; gap:8px; flex-wrap:wrap; width:100%">' + skillTags + '</div>' +
      '<div style="display:flex; justify-content:space-between; align-items:center; width:100%">' +
        '<div style="font-size:0.78rem; color:var(--muted)">' +
          '<i class="fas fa-map-marker-alt me-1" style="color:var(--accent)"></i>' + p.area + ' · ' + p.distance + ' km' +
          ' &nbsp;·&nbsp; <i class="fas fa-briefcase me-1"></i>' + p.jobs_done + ' jobs' +
          ' &nbsp;·&nbsp; ⭐ ' + p.rating +
        '</div>' +
      '</div>';

    card.appendChild(bookBtn);
    grid.appendChild(card);
    // fix last row flex — move bookBtn into bottom div
    var bottomDiv = card.querySelector('div:last-of-type');
    if (bottomDiv) bottomDiv.appendChild(bookBtn);
  });

  document.getElementById('providerLoadMore').style.display =
    list.length > (_providerPage + 1) * PROVIDERS_PER_PAGE ? 'inline-block' : 'none';
}
function loadMoreProviders() {
  _providerPage++;
  renderProviders(false);
}

function showProviderDetail(p) {
  var nm = p.company || p.name;
  var icons      = { electrician:'⚡', plumber:'🔧', teacher:'📚', cleaner:'🧹' };
  var colors     = { electrician:'rgba(245,158,11,0.15)', plumber:'rgba(0,212,255,0.15)', teacher:'rgba(124,58,237,0.15)', cleaner:'rgba(16,185,129,0.15)' };
  var availText  = p.available
    ? '<span style="color:var(--accent3)"><span class="online-dot"></span>Available Now</span>'
    : '<span style="color:var(--gold)">Currently Busy</span>';

  var skillTags = p.skills.map(function(s){
    return '<span style="background:rgba(0,212,255,0.08); border:1px solid rgba(0,212,255,0.2); border-radius:50px; padding:4px 14px; font-size:0.82rem; color:var(--accent)">' + s + '</span>';
  }).join('');

  var content = document.getElementById('providerModalContent');
  content.innerHTML =
    '<div style="display:flex; align-items:center; gap:16px; margin-bottom:24px">' +
      '<div style="width:70px;height:70px;border-radius:18px;background:' + colors[currentService] + ';display:flex;align-items:center;justify-content:center;font-size:2.2rem;flex-shrink:0">' + icons[currentService] + '</div>' +
      '<div>' +
        '<div style="font-family:\'Syne\',sans-serif; font-weight:800; font-size:1.3rem">' + nm + '</div>' +
        '<div style="color:var(--muted); font-size:0.88rem; margin-top:2px">' + p.title + '</div>' +
        '<div style="margin-top:6px">' + availText + '</div>' +
      '</div>' +
    '</div>' +
    '<div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:20px">' +
      '<div style="background:var(--surface2); border-radius:10px; padding:14px; text-align:center"><div style="font-family:\'Syne\',sans-serif; font-size:1.5rem; font-weight:800; color:var(--accent3)">' + p.trust_score + '</div><div style="font-size:0.78rem; color:var(--muted)">Trust Score</div></div>' +
      '<div style="background:var(--surface2); border-radius:10px; padding:14px; text-align:center"><div style="font-family:\'Syne\',sans-serif; font-size:1.5rem; font-weight:800; color:var(--gold)">' + p.rating + '★</div><div style="font-size:0.78rem; color:var(--muted)">Rating</div></div>' +
      '<div style="background:var(--surface2); border-radius:10px; padding:14px; text-align:center"><div style="font-family:\'Syne\',sans-serif; font-size:1.5rem; font-weight:800; color:var(--accent)">' + p.distance + ' km</div><div style="font-size:0.78rem; color:var(--muted)">Distance</div></div>' +
      '<div style="background:var(--surface2); border-radius:10px; padding:14px; text-align:center"><div style="font-family:\'Syne\',sans-serif; font-size:1.5rem; font-weight:800; color:var(--accent2)">' + p.jobs_done + '</div><div style="font-size:0.78rem; color:var(--muted)">Jobs Done</div></div>' +
    '</div>' +
    '<div style="margin-bottom:20px">' +
      '<div style="font-size:0.8rem; color:var(--muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:10px">Skills</div>' +
      '<div style="display:flex; flex-wrap:wrap; gap:8px">' + skillTags + '</div>' +
    '</div>' +
    '<div style="display:flex; align-items:center; gap:8px; margin-bottom:20px; color:var(--muted); font-size:0.88rem">' +
      '<i class="fas fa-map-marker-alt" style="color:var(--accent)"></i> ' + p.area + ', Dhaka' +
    '</div>';

  var bookBtn = document.createElement('button');
  bookBtn.className = 'btn-submit';
  bookBtn.innerHTML = '<i class="fas fa-calendar-check me-2"></i>Book Now';
  bookBtn.onclick = function(){ bookThisProvider(nm, p.id); closeModal('providerModal'); };
  content.appendChild(bookBtn);

  showModal('providerModal');
}
function bookThisProvider(name, id) {
  document.getElementById('sf-name').value = name;
  document.getElementById('serviceFormAnchor').scrollIntoView({ behavior:'smooth', block:'start' });
  showToast(name + ' selected! Fill the form below to confirm.', 'success');
}
function toggleNearbySection() {
  var prs = document.getElementById('providerResultsSection');
  var btn = document.getElementById('nearbyToggleBtn');
  var conf = serviceConfig[currentService] || {};
  var label = conf.title ? conf.title.replace('Book ','') + 's' : 'Providers';
  if (!prs) return;
  if (prs.style.display === 'none' || prs.style.display === '') {
    showProviderResults(currentService);
    if (btn) btn.innerHTML = '<i class="fas fa-times me-2"></i>Hide Nearby ' + label;
  } else {
    prs.style.display = 'none';
    if (btn) btn.innerHTML = '<i class="fas fa-map-marker-alt me-2"></i>View Nearby Available ' + label;
  }
}

function cancelServiceForm() {
  document.getElementById('serviceFormContainer').style.display = 'none';
  document.getElementById('providerResultsSection').style.display = 'none';
  var btn = document.getElementById('nearbyToggleBtn');
  if (btn) btn.style.display = 'none';
}

function submitServiceForm() {
  const name = document.getElementById('sf-name').value.trim();
  const email = document.getElementById('sf-email').value.trim();
  const phone = document.getElementById('sf-phone').value.trim();
  if (!name || !email || !phone) { showToast('Please fill required fields', 'error'); return; }

  const booking = {
    id: Date.now(), name, email, phone,
    service: currentService,
    date: document.getElementById('sf-date').value || 'TBD',
    document: document.getElementById('sfDocument').files[0]?.name || 'None',
    description: document.getElementById('sf-desc').value,
    status: 'Pending',
    booked_at: new Date().toISOString()
  };
  db.bookings.push(booking);
  saveDb();

  ['sf-name','sf-email','sf-phone','sf-date','sf-desc'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('sfDocLabel').textContent = 'Upload ID / Certificate';
  document.getElementById('serviceFormContainer').style.display = 'none';
  document.getElementById('providerResultsSection').style.display = 'none';

  showToast('✓ Booking confirmed for ' + currentService + '! Data saved securely.', 'success');
  setTimeout(() => {
    if(confirm('Your booking is saved! Download the database record (database.json)?')) exportDatabase();
  }, 600);
}

// ==================== GEO FORM ====================
function geoScrollToForm() {
  if (!isProvider()) { showToast('Only Service Providers can register location', 'error'); return; }
  var section = document.getElementById('geoFormSection');
  section.style.display = 'block';
  // Populate area select from all 4 datasets
  var areaSelect = document.getElementById('geo-area');
  if (areaSelect && areaSelect.options.length <= 1) {
    var areaSet = {};
    ['electrician','plumber','teacher','cleaner'].forEach(function(cat){
      (PROVIDERS_DB[cat]||[]).forEach(function(p){ areaSet[p.area] = true; });
    });
    var areas = Object.keys(areaSet).sort();
    areas.forEach(function(a){
      var opt = document.createElement('option');
      opt.value = a; opt.textContent = a;
      areaSelect.appendChild(opt);
    });
  }
  setTimeout(function(){ section.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 80);
}

function submitGeoForm() {
  const name = document.getElementById('geo-name').value.trim();
  const service = document.getElementById('geo-service').value;
  const area = document.getElementById('geo-area').value;
  if (!name || !service || !area) { showToast('Please fill all fields', 'error'); return; }
  const entry = { id: Date.now(), name, service, area, availability: document.getElementById('geo-avail').value, registered_at: new Date().toISOString() };
  db.geoData.push(entry);
  saveDb();
  showToast('📍 Location registered successfully!', 'success');
  document.getElementById('geoFormSection').style.display = 'none';
  ['geo-name','geo-area'].forEach(id => document.getElementById(id).value = '');
}

// ==================== AUTH with OTP ====================
async function registerUser() {
  const name  = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const phone = document.getElementById('reg-phone').value.trim();
  const role  = document.getElementById('reg-role').value;
  const pass  = document.getElementById('reg-pass').value;
  const pass2 = document.getElementById('reg-pass2').value;

  if (!name || !email || !phone || !pass) { showToast('Please fill all required fields', 'error'); return; }
  if (pass !== pass2) { showToast('Passwords do not match', 'error'); return; }
  if (pass.length < 8) { showToast('Password must be at least 8 characters', 'error'); return; }
  if (!email.includes('@')) { showToast('Please enter a valid email address', 'error'); return; }
  // Always re-read from localStorage to get freshest user list
  db.users = JSON.parse(localStorage.getItem('tv_users') || '[]');
  if (db.users.find(u => u.email === email)) { showToast('Email already registered', 'error'); return; }

  const pendingUser = {
    id: Date.now(), name, email, phone, role,
    pass: btoa(pass), created: new Date().toLocaleDateString()
  };

  const btn = document.getElementById('registerSubmitBtn');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending OTP...';
  btn.disabled = true;

  await initiateOTP(email, 'register', pendingUser);

  btn.innerHTML = '<i class="fas fa-user-plus me-2"></i>Create Account';
  btn.disabled = false;
}

function loginUser() {
  const email = document.getElementById('login-email').value.trim();
  const pass  = document.getElementById('login-pass').value;

  if (!email || !pass) { showToast('Please enter email and password', 'error'); return; }

  // Always re-read from localStorage to get latest registered users
  db.users = JSON.parse(localStorage.getItem('tv_users') || '[]');

  const user = db.users.find(u => u.email === email && atob(u.pass) === pass);
  if (!user) { showToast('Invalid email or password', 'error'); return; }

  db.currentUser = user;
  saveDb();
  updateNavUser();
  updateProfilePage();
  showToast('Signed in as ' + user.name, 'success');
  setTimeout(() => showPage('profile'), 800);
}

// ==================== FORGOT PASSWORD ====================
function showForgotPassword() {
  const sec = document.getElementById('forgotPasswordSection');
  // Always open, reset, scroll & focus — never toggle closed on click
  sec.style.display = 'block';
  document.getElementById('forgot-email').value = '';
  document.getElementById('forgotNewPassSection').style.display = 'none';
  const forgotBtn = document.getElementById('forgotSendOtpBtn');
  if (forgotBtn) { forgotBtn.style.display = 'block'; forgotBtn.disabled = false; forgotBtn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Send OTP to Email'; }
  const emailEl = document.getElementById('forgot-email');
  if (emailEl) emailEl.disabled = false;
  setTimeout(() => {
    sec.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => document.getElementById('forgot-email').focus(), 350);
  }, 80);
}

async function sendForgotOTP() {
  const email = document.getElementById('forgot-email').value.trim();
  if (!email) { showToast('Please enter your email address', 'error'); return; }

  const user = db.users.find(u => u.email === email);
  if (!user) { showToast('No account found with this email', 'error'); return; }

  const btn = document.getElementById('forgotSendOtpBtn');
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending OTP...';
  btn.disabled = true;

  await initiateOTP(email, 'forgotPassword', user);

  btn.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Send OTP to Email';
  btn.disabled = false;
}

function resetPassword() {
  const newPass  = document.getElementById('forgot-newpass').value;
  const newPass2 = document.getElementById('forgot-newpass2').value;

  if (!newPass || !newPass2) { showToast('Please fill both password fields', 'error'); return; }
  if (newPass !== newPass2)  { showToast('Passwords do not match', 'error'); return; }
  if (newPass.length < 8)    { showToast('Password must be at least 8 characters', 'error'); return; }

  // Re-read from localStorage to ensure we have latest user list
  db.users = JSON.parse(localStorage.getItem('tv_users') || '[]');
  const userIdx = db.users.findIndex(u => u.email === _otpState.email);
  if (userIdx === -1) { showToast('User not found', 'error'); return; }

  db.users[userIdx].pass = btoa(newPass);
  saveDb();
  // Clear OTP state fully now that reset is done
  _otpState = { code:'', email:'', purpose:'', pendingUser:null, timerInterval:null, expiresAt:0 };

  document.getElementById('forgotPasswordSection').style.display = 'none';
  document.getElementById('forgotNewPassSection').style.display = 'none';
  document.getElementById('forgot-email').value = '';
  document.getElementById('forgot-newpass').value = '';
  document.getElementById('forgot-newpass2').value = '';

  showToast('✅ Password reset successfully! You can now sign in.', 'success');
}

function logout() {
  db.currentUser = null;
  saveDb();
  updateNavUser();
  clearRegisterForm();
  clearLoginForm();
  showToast('Logged out successfully', 'success');
  showPage('home');
}

function updateProfilePage() {
  if (!db.currentUser) return;
  const u = db.currentUser;
  document.getElementById('profileName').textContent = u.name;
  document.getElementById('profileEmail').textContent = u.email;
  document.getElementById('profilePhone').textContent = u.phone;
  const badges = document.getElementById('profileBadges');
  badges.innerHTML = `<span class="trust-badge"><i class="fas fa-user-check"></i> ${u.role}</span>`;
  if (u.role === 'Service Provider') badges.innerHTML += ` <span class="trust-badge" style="border-color:var(--accent2);color:var(--accent2)"><i class="fas fa-tools"></i> Provider</span>`;
  else badges.innerHTML += ` <span class="trust-badge" style="border-color:var(--accent3);color:var(--accent3)"><i class="fas fa-shopping-cart"></i> Customer</span>`;
}

// ==================== AI TRUST SCORE ====================
let trustFiles = { resume: false, cert: false };

function handleTrustFile(input) {
  if (input.files[0]) { trustFiles.resume = true; document.getElementById('trustUploadLabel').innerHTML = `<span style="color:var(--accent3)">✓ ${input.files[0].name}</span>`; }
}
function handleTrustCert(input) {
  if (input.files[0]) { trustFiles.cert = true; document.getElementById('trustCertLabel').innerHTML = `<span style="color:var(--accent3)">✓ ${input.files[0].name}</span>`; }
}

function computeTrustScore(e) {
  if (!isProvider()) { showToast('Only Service Providers can compute trust scores', 'error'); return; }
  if (!trustFiles.resume && !trustFiles.cert) { showToast('Please upload at least one document', 'error'); return; }
  const btn = e.target;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Computing...';
  btn.disabled = true;
  setTimeout(() => {
    const score = Math.floor(Math.random() * 25) + 68;
    const comp  = Math.floor(Math.random()*15)+82;
    const punct = Math.floor(Math.random()*20)+75;
    const skill = Math.floor(Math.random()*25)+70;
    const fb    = (3.8 + Math.random()*1.2).toFixed(1);
    document.getElementById('bigScoreNum').textContent = score;
    document.getElementById('sr-completion').textContent = comp + '%';
    document.getElementById('sr-punct').textContent = punct + '%';
    document.getElementById('sr-skill').textContent = skill + '%';
    document.getElementById('sr-feedback').textContent = fb + '★';
    document.getElementById('trustScoreResult').classList.add('show');
    const entry = { id: Date.now(), provider: db.currentUser?.name || 'Unknown', score, comp, punct, skill, fb, computed_at: new Date().toISOString() };
    db.trustScores.push(entry);
    saveDb();
    btn.innerHTML = '<i class="fas fa-magic me-2"></i>Compute AI Trust Score';
    btn.disabled = false;
    showToast(`AI Trust Score computed: ${score}/100 — saved to database`, 'success');
  }, 2000);
}

// ==================== VERIFICATION ====================
function submitVerification() {
  const id = document.getElementById('vId').files[0];
  const cert = document.getElementById('vCert').files[0];
  if (!id && !cert) { showToast('Please upload at least one document', 'error'); return; }
  closeModal('verifyModal');
  showToast('✓ Documents submitted! Verification within 24 hours.', 'success');
}

// ==================== PAYMENT ====================
function updateFeeBreakdown() {
  var raw = parseFloat(document.getElementById('pay-amount').value) || 0;
  var fee          = raw * 0.02;
  var providerGets = raw - fee;
  var el = function(id){ return document.getElementById(id); };
  if (el('breakdownBase'))     el('breakdownBase').textContent     = '$ ' + raw.toFixed(2);
  if (el('breakdownFee'))      el('breakdownFee').textContent      = '− $ ' + fee.toFixed(2);
  if (el('breakdownProvider')) el('breakdownProvider').textContent = '$ ' + providerGets.toFixed(2);
  if (el('breakdownTotal'))    el('breakdownTotal').textContent    = '$ ' + raw.toFixed(2);
}

function processPayment() {
  var service = document.getElementById('pay-service').value;
  var amount  = parseFloat(document.getElementById('pay-amount').value);
  var card    = document.getElementById('pay-card').value;
  if (!service || !amount || !card) { showToast('Please fill all payment fields', 'error'); return; }
  if (amount <= 0) { showToast('Please enter a valid amount', 'error'); return; }

  var btn = event.target;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
  btn.disabled = true;

  // Calculate 2% platform fee
  var platformFee  = amount * 0.02;
  var providerGets = amount - platformFee;

  setTimeout(function() {
    var txnId = '#TV-' + Math.floor(10000 + Math.random()*90000);
    document.getElementById('txnId').textContent       = txnId;
    document.getElementById('txnAmount').textContent   = '$ ' + amount.toFixed(2);
    document.getElementById('txnFee').textContent      = '− $ ' + platformFee.toFixed(2);
    document.getElementById('txnProvider').textContent = '$ ' + providerGets.toFixed(2);
    document.getElementById('txnTotal').textContent    = '$ ' + amount.toFixed(2);
    document.getElementById('paymentSuccess').classList.add('show');
    btn.style.display = 'none';
    showToast('✓ Payment of $' + amount.toFixed(2) + ' secured! Platform fee: $' + platformFee.toFixed(2), 'success');
  }, 2500);
}

function formatCardNumber(input) {
  let val = input.value.replace(/\D/g, '').substring(0, 16);
  val = val.replace(/(.{4})/g, '$1 ').trim();
  input.value = val;
  const last4 = val.replace(/\s/g, '').slice(-4);
  if (last4) document.getElementById('cardLast4').textContent = last4 || '4242';
}

// ==================== EMERGENCY ====================
function triggerEmergency() {
  const btn = document.querySelector('#page-emergency .btn-submit');
  if (btn) { btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Locating Providers...'; btn.disabled = true; }
  setTimeout(() => {
    populateEmergencyProviders();
    document.getElementById('emergencyResults').style.display = 'block';
    document.getElementById('emergencyResults').scrollIntoView({ behavior: 'smooth' });
    if (btn) { btn.innerHTML = '<i class="fas fa-check-circle me-2"></i>Providers Found!'; btn.disabled = false; }
    showToast('🚨 3 providers found nearby!', 'success');
  }, 1800);
}

// ==================== HOME SERVICE CARDS ====================

// ==================== HELPERS ====================
function showModal(id) { document.getElementById(id).classList.add('show'); }
function closeModal(id) { document.getElementById(id).classList.remove('show'); }
function triggerUpload(id) { document.getElementById(id).click(); }

function handleSfDoc(input) {
  if (input.files[0]) document.getElementById('sfDocLabel').innerHTML = `<span style="color:var(--accent3)">✓ ${input.files[0].name}</span>`;
}
function labelFile(inputId, labelId) {
  const f = document.getElementById(inputId).files[0];
  if (f) document.getElementById(labelId).innerHTML = `<span style="color:var(--accent3)">✓ ${f.name}</span>`;
}
function handleAvatarPreview(input, imgId) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img = document.getElementById(imgId);
    img.src = e.target.result; img.style.display = 'block';
    const iconEl = input.closest('.avatar-upload-circle').querySelector('span');
    if (iconEl) iconEl.style.display = 'none';
  };
  reader.readAsDataURL(file);
}
function togglePass(inputId, btn) {
  const input = document.getElementById(inputId);
  const isPass = input.type === 'password';
  input.type = isPass ? 'text' : 'password';
  btn.innerHTML = isPass ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
}
function showToast(msg, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast-msg ${type}`;
  const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : 'ℹ';
  const color = type === 'success' ? 'var(--accent3)' : type === 'error' ? 'var(--danger)' : 'var(--accent)';
  toast.innerHTML = `<span style="color:${color}; font-weight:700; font-size:1.1rem">${icon}</span><span style="font-size:0.9rem">${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.animation = 'slideIn 0.3s ease reverse'; setTimeout(() => toast.remove(), 300); }, 4500);
}

// Close modal on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('show'); });
});

// Close nav dropdown when clicking outside
document.addEventListener('click', function(e) {
  const wrap = document.getElementById('navDashDropdownWrap');
  if (wrap && !wrap.contains(e.target)) closeNavDropdown();
});

// ==================== DYNAMIC EMERGENCY & GEO NEARBY ====================
function populateEmergencyProviders() {
  var list = document.getElementById('emergencyProviderList');
  if (!list) return;
  list.innerHTML = '';
  var cats = [
    { cat:'electrician', icon:'⚡', color:'rgba(245,158,11,0.12)', etas:['5 min','8 min','10 min','12 min','15 min'] },
    { cat:'plumber',     icon:'🔧', color:'rgba(0,212,255,0.12)',  etas:['7 min','9 min','11 min','14 min','18 min'] },
    { cat:'cleaner',     icon:'🧹', color:'rgba(16,185,129,0.12)', etas:['6 min','10 min','13 min','16 min','20 min'] },
  ];
  // Pick 3 available providers from each category = 9 total
  cats.forEach(function(c) {
    var pool = (PROVIDERS_DB[c.cat]||[]).filter(function(p){ return p.available; });
    // shuffle randomly, take top 3
    for(var i=pool.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var tmp=pool[i];pool[i]=pool[j];pool[j]=tmp;}
    pool.slice(0,3).forEach(function(provider, idx) {
      var nm = provider.company || provider.name;
      var shortNm = nm.length > 30 ? nm.substring(0,28)+'…' : nm;
      var titleShort = provider.title.split(' ').slice(0,4).join(' ');
      var eta = c.etas[Math.floor(Math.random()*c.etas.length)];
      var dist = (Math.random()*4+0.5).toFixed(1);

      var card = document.createElement('div');
      card.className = 'nearby-provider-card';
      card.style.cursor = 'pointer';
      card.onclick = function(){ showToast(shortNm + ' notified! ETA: ' + eta, 'success'); };

      var callBtn = document.createElement('button');
      callBtn.textContent = 'CALL';
      callBtn.style.cssText = 'background:var(--danger);border:none;color:#fff;padding:8px 16px;border-radius:8px;cursor:pointer;font-weight:700;font-size:0.85rem;flex-shrink:0';
      callBtn.onmouseover = function(){ this.style.opacity='0.85'; };
      callBtn.onmouseout  = function(){ this.style.opacity='1'; };
      callBtn.onclick = function(e){ e.stopPropagation(); showToast('Calling '+shortNm+'…','success'); };

      card.innerHTML =
        '<div class="provider-avatar" style="background:'+c.color+'">'+c.icon+'</div>'+
        '<div style="flex:1">'+
          '<div style="font-weight:600">'+shortNm+' <span class="trust-badge ms-1">⭐ '+provider.trust_score+'</span></div>'+
          '<div style="color:var(--muted); font-size:0.82rem">'+
            '<span class="online-dot"></span>'+titleShort+
            ' · '+provider.area+
            ' · '+dist+' km · ETA '+eta+
          '</div>'+
        '</div>';
      card.appendChild(callBtn);
      list.appendChild(card);
    });
  });
}
function populateGeoNearby() {
  var list = document.getElementById('geoNearbyList');
  if (!list) return;
  var cats = [
    { cat:'electrician', icon:'⚡', color:'rgba(245,158,11,0.1)' },
    { cat:'plumber',     icon:'🔧', color:'rgba(0,212,255,0.1)'  },
    { cat:'teacher',     icon:'📚', color:'rgba(124,58,237,0.1)' },
  ];
  list.innerHTML = '';
  cats.forEach(function(c, ci) {
    var pool = (PROVIDERS_DB[c.cat] || []).slice();
    if (!pool.length) return;
    for(var i=pool.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var tmp=pool[i];pool[i]=pool[j];pool[j]=tmp;}
    var provider = pool[0];
    var nm = provider.company || provider.name;
    var shortNm = nm.length > 26 ? nm.substring(0,24) + '…' : nm;
    var availHtml = provider.available
      ? '<div style="color:var(--accent3); font-size:0.8rem">Free Now</div>'
      : '<div style="color:var(--gold); font-size:0.8rem">Busy</div>';
    var randDist = (Math.random()*4+0.5).toFixed(1);
    var card = document.createElement('div');
    card.className = 'nearby-provider-card';
    card.innerHTML =
      '<div class="provider-avatar" style="background:' + c.color + '">' + c.icon + '</div>' +
      '<div style="flex:1">' +
        '<div style="font-weight:600; font-size:0.9rem">' + shortNm + ' <span class="trust-badge ms-1" style="font-size:0.7rem">' + provider.trust_score + '</span></div>' +
        '<div style="color:var(--muted); font-size:0.82rem"><span class="online-dot"></span>' + randDist + ' km away · ' + c.cat.charAt(0).toUpperCase() + c.cat.slice(1) + '</div>' +
      '</div>' +
      availHtml;
    list.appendChild(card);
  });
}
// ==================== INIT ====================
updateNavUser();
if (db.currentUser) updateProfilePage();
populateGeoNearby();

// Update real provider counts on service cards
(function updateServiceCounts(){
  var map = { electrician:'countElectrician', plumber:'countPlumber', teacher:'countTeacher', cleaner:'countCleaner' };
  Object.keys(map).forEach(function(cat){
    var el = document.getElementById(map[cat]);
    if (!el) return;
    var pool = PROVIDERS_DB[cat] || [];
    var avail = pool.filter(function(p){ return p.available; }).length;
    el.textContent = avail + ' available';
  });
})();
