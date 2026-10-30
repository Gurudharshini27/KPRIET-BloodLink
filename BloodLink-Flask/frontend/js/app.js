// All data comes from the real backend - no localStorage business data,
// no client-side OTP. The frontend only ever holds a JWT (in localStorage,
// which is normal/expected for a token, not for secrets) and calls
// /api/* endpoints.
const API = '/api'; // Flask serves both the frontend and the API on one origin
const BLOOD_GROUPS = ['O-','O+','A-','A+','B-','B+','AB-','AB+'];

const auth = {
  get token(){ return localStorage.getItem('bl_token'); },
  get user(){ return JSON.parse(localStorage.getItem('bl_user')||'null'); },
  set(token, user){ localStorage.setItem('bl_token', token); localStorage.setItem('bl_user', JSON.stringify(user)); },
  clear(){ localStorage.removeItem('bl_token'); localStorage.removeItem('bl_user'); }
};

async function api(path, opts={}){
  const headers = { 'Content-Type':'application/json', ...(opts.headers||{}) };
  if(auth.token) headers.Authorization = 'Bearer ' + auth.token;
  const res = await fetch(API+path, { ...opts, headers });
  let data = {};
  try { data = await res.json(); } catch {}
  if(!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status, data });
  return data;
}

function go(h){ location.hash = h; render(); }
function logout(){ auth.clear(); go('home'); }

let emailConfigured = true; // optimistic until checked
async function checkEmailConfig(){
  try{ const h = await api('/health'); emailConfigured = !!h.emailConfigured; }
  catch{ emailConfigured = false; }
  renderEmailBanner();
}
function renderEmailBanner(){
  const el = document.getElementById('emailBanner');
  if(!el) return;
  el.innerHTML = emailConfigured ? '' :
    `<div style="background:#3d2412;color:#e6a33a;padding:8px 6%;font-size:.85rem;text-align:center">
      ⚠ Email not configured (RESEND_API_KEY missing in backend .env) — OTPs and match notifications are generated for real but cannot be delivered until this is set.
    </div>`;
}

function renderNav(){
  const u = auth.user;
  const nav = document.getElementById('nav');
  let links = `<a href="#home">Home</a>`;
  if(u && u.role==='donor') links += `<a href="#dashboard">Dashboard</a><a href="#notifications">Notifications</a><button onclick="logout()">Logout</button>`;
  else if(u && u.role==='requester') links += `<a href="#requester-dashboard">My Requests</a><button onclick="logout()">Logout</button>`;
  else links += `<a href="#login">Donor Login</a><a href="#requester-login">Requester Login</a>`;
  nav.innerHTML = links;
}

function pageHome(){
  return `<div class="hero">
    <h1>Every Drop Can Save a Life</h1>
    <p>BloodLink connects verified college donors with people who urgently need blood — matched automatically by blood group and availability, with real email verification and notifications.</p>
    <div class="btnrow">
      <a class="btn" href="#register">Donor Register</a>
      <a class="btn outline" href="#request">Request Blood</a>
      <a class="btn outline" href="#login">Login</a>
    </div>
  </div>`;
}

// ---------------- DONOR REGISTER ----------------
function pageRegister(){
  return `<div class="page"><div class="card">
    <h2>Create your donor account</h2>
    <p class="small">Register with your KPRIET college email. We will send a verification code before your profile is marked as verified.</p>
    <form id="regForm">
      <label>Name</label><input required id="r_name" placeholder="Enter your name">
      <label>KPRIET college email</label><input required type="email" id="r_email" placeholder="name@kpriet.ac.in">
      <label>Password</label><input required type="password" minlength="6" id="r_pass" placeholder="Minimum 6 characters">
      <label>Department</label>
      <select required id="r_dept"><option value="">Select department</option>
        <option>Computer Science</option><option>Mechanical Engineering</option><option>Electronics and Communication</option>
        <option>Electrical Engineering</option><option>Civil Engineering</option><option>Information Technology</option></select>
      <label>Year</label>
      <select required id="r_year"><option value="">Select year</option><option>I</option><option>II</option><option>III</option><option>IV</option></select>
      <label>Blood group</label>
      <select required id="r_bg"><option value="">Select blood group</option>${BLOOD_GROUPS.map(b=>`<option>${b}</option>`).join('')}</select>
      <label>Phone number</label><input required id="r_phone" pattern="[0-9]{10}" placeholder="10-digit phone number">
      <label>Last donation date</label><input type="date" id="r_last">
      <label>Location</label><input required id="r_loc" placeholder="e.g. Coimbatore">
      <button class="btn" style="margin-top:18px;width:100%">Create Account</button>
      <div id="r_err" class="error"></div>
    </form>
    <p class="small" style="margin-top:14px">Already registered? <a href="#login" style="color:#e63950">Log in</a></p>
  </div></div>`;
}
function bindRegister(){
  document.getElementById('regForm').onsubmit = async e=>{
    e.preventDefault();
    const err = document.getElementById('r_err'); err.textContent='';
    const email = document.getElementById('r_email').value.trim().toLowerCase();
    try{
      const result = await api('/auth/register', { method:'POST', body: JSON.stringify({
        role:'donor', name: document.getElementById('r_name').value.trim(), email,
        password: document.getElementById('r_pass').value,
        department: document.getElementById('r_dept').value, year: document.getElementById('r_year').value,
        bloodGroup: document.getElementById('r_bg').value, phone: document.getElementById('r_phone').value.trim(),
        lastDonation: document.getElementById('r_last').value, location: document.getElementById('r_loc').value.trim()
      })});
      sessionStorage.setItem('bl_emailwarn', result.emailSent ? '' : (result.emailError||'Email could not be delivered.'));
      go('verify:'+encodeURIComponent(email)+':donor');
    }catch(ex){ err.textContent = ex.message; }
  };
}

// ---------------- LOGIN (donor) ----------------
function pageLogin(){
  return `<div class="page"><div class="card">
    <h2>Welcome back</h2>
    <p class="small">Log in with your KPRIET college email.</p>
    <form id="loginForm">
      <label>KPRIET college email</label><input required type="email" id="l_email" placeholder="name@kpriet.ac.in">
      <label>Password</label><input required type="password" id="l_pass">
      <button class="btn" style="margin-top:18px;width:100%">Login</button>
      <div id="l_err" class="error"></div>
    </form>
    <p class="small" style="margin-top:14px">New to BloodLink? <a href="#register" style="color:#e63950">Register as a donor</a></p>
    <p class="small">Requesting blood instead? <a href="#requester-login" style="color:#e63950">Requester login</a></p>
  </div></div>`;
}
function bindLogin(){
  document.getElementById('loginForm').onsubmit = async e=>{
    e.preventDefault();
    const err = document.getElementById('l_err'); err.textContent='';
    const email = document.getElementById('l_email').value.trim().toLowerCase();
    try{
      const { token, user } = await api('/auth/login', { method:'POST', body: JSON.stringify({ email, password: document.getElementById('l_pass').value, role:'donor' })});
      auth.set(token, user); go('dashboard');
    }catch(ex){
      if(ex.data && ex.data.needsVerification){ go('verify:'+encodeURIComponent(email)+':donor'); return; }
      err.textContent = ex.message;
    }
  };
}

// ---------------- REQUESTER LOGIN/REGISTER ----------------
function pageRequesterLogin(){
  return `<div class="page"><div class="card">
    <div class="tabs">
      <button class="active" id="tab_login" onclick="switchReqTab('login')">Login</button>
      <button id="tab_reg" onclick="switchReqTab('register')">Create Account</button>
    </div>
    <div id="reqLoginBox">
      <h2>Requester Login</h2>
      <form id="reqLoginForm">
        <label>Email</label><input required type="email" id="rl_email">
        <label>Password</label><input required type="password" id="rl_pass">
        <button class="btn" style="margin-top:18px;width:100%">Login</button>
        <div id="rl_err" class="error"></div>
      </form>
    </div>
    <div id="reqRegBox" class="hidden">
      <h2>Create Requester Account</h2>
      <form id="reqRegForm">
        <label>Full Name</label><input required id="rr_name">
        <label>Email</label><input required type="email" id="rr_email">
        <label>Password</label><input required type="password" minlength="6" id="rr_pass">
        <label>Phone</label><input required id="rr_phone" pattern="[0-9]{10}">
        <button class="btn" style="margin-top:18px;width:100%">Create Account</button>
        <div id="rr_err" class="error"></div>
      </form>
    </div>
  </div></div>`;
}
function switchReqTab(t){
  document.getElementById('tab_login').classList.toggle('active', t==='login');
  document.getElementById('tab_reg').classList.toggle('active', t==='register');
  document.getElementById('reqLoginBox').classList.toggle('hidden', t!=='login');
  document.getElementById('reqRegBox').classList.toggle('hidden', t!=='register');
}
function bindRequesterAuth(){
  document.getElementById('reqLoginForm').onsubmit = async e=>{
    e.preventDefault();
    const err = document.getElementById('rl_err'); err.textContent='';
    const email = document.getElementById('rl_email').value.trim().toLowerCase();
    try{
      const { token, user } = await api('/auth/login', { method:'POST', body: JSON.stringify({ email, password: document.getElementById('rl_pass').value, role:'requester' })});
      auth.set(token, user); go('requester-dashboard');
    }catch(ex){
      if(ex.data && ex.data.needsVerification){ go('verify:'+encodeURIComponent(email)+':requester'); return; }
      err.textContent = ex.message;
    }
  };
  document.getElementById('reqRegForm').onsubmit = async e=>{
    e.preventDefault();
    const err = document.getElementById('rr_err'); err.textContent='';
    const email = document.getElementById('rr_email').value.trim().toLowerCase();
    try{
      const result = await api('/auth/register', { method:'POST', body: JSON.stringify({
        role:'requester', name: document.getElementById('rr_name').value.trim(), email,
        password: document.getElementById('rr_pass').value, phone: document.getElementById('rr_phone').value.trim()
      })});
      sessionStorage.setItem('bl_emailwarn', result.emailSent ? '' : (result.emailError||'Email could not be delivered.'));
      go('verify:'+encodeURIComponent(email)+':requester');
    }catch(ex){ err.textContent = ex.message; }
  };
}

// ---------------- OTP VERIFICATION PAGE ----------------
let otpTimer = null;
function pageVerify(email, role){
  const masked = email.replace(/^(.)(.*)(@.*)$/, (m,a,b,c)=> a + '*'.repeat(Math.max(b.length,3)) + c);
  const warn = sessionStorage.getItem('bl_emailwarn');
  return `<div class="page"><div class="card">
    <h2>Verify Your Email</h2>
    <p class="small">We've sent a 6-digit verification code to:</p>
    <p><b>${masked}</b></p>
    ${warn ? `<p class="error">⚠ Delivery issue: ${warn} A real one-time code was still generated and stored server-side; ask an admin/organizer to check the backend once RESEND_API_KEY is configured, or use Resend's dashboard log to confirm delivery.</p>` : ''}
    <form id="otpForm">
      <input required id="otp_input" class="otp-input" maxlength="6" pattern="[0-9]{6}" placeholder="______">
      <button class="btn" style="margin-top:18px;width:100%">Verify OTP</button>
      <div id="otp_err" class="error"></div>
      <div id="otp_ok" class="success"></div>
    </form>
    <p class="small" style="margin-top:16px">Didn't receive the code?
      <button class="btn sm outline" id="resendBtn" onclick="resendOtp('${email}')">Resend OTP</button>
    </p>
    <p class="small">OTP expires in: <b id="otpCountdown">05:00</b></p>
  </div></div>`;
}
function startOtpCountdown(seconds=300){
  clearInterval(otpTimer);
  let s = seconds;
  const el = document.getElementById('otpCountdown');
  otpTimer = setInterval(()=>{
    s--; if(s<0){ clearInterval(otpTimer); if(el) el.textContent='expired'; return; }
    const m = String(Math.floor(s/60)).padStart(2,'0'), r = String(s%60).padStart(2,'0');
    if(el) el.textContent = `${m}:${r}`;
  }, 1000);
}
function bindVerify(email, role){
  startOtpCountdown();
  document.getElementById('otpForm').onsubmit = async e=>{
    e.preventDefault();
    const err = document.getElementById('otp_err'); const ok = document.getElementById('otp_ok');
    err.textContent=''; ok.textContent='';
    try{
      await api('/auth/verify-otp', { method:'POST', body: JSON.stringify({ email, otp: document.getElementById('otp_input').value.trim() })});
      ok.textContent = 'Email verified successfully!';
      setTimeout(()=> go(role==='donor' ? 'login' : 'requester-login'), 1000);
    }catch(ex){ err.textContent = ex.message; }
  };
}
async function resendOtp(email){
  const btn = document.getElementById('resendBtn');
  try{
    btn.disabled = true;
    const result = await api('/auth/resend-otp', { method:'POST', body: JSON.stringify({ email })});
    document.getElementById('otp_err').textContent='';
    document.getElementById('otp_ok').textContent = result.emailSent ? 'A new OTP has been sent.' : 'A new OTP was generated, but delivery failed: ' + (result.emailError||'');
    startOtpCountdown();
    setTimeout(()=> btn.disabled=false, 30000);
  }catch(ex){
    document.getElementById('otp_err').textContent = ex.message;
    btn.disabled = false;
  }
}

// ---------------- DONOR DASHBOARD ----------------
async function pageDashboard(){
  if(!auth.user || auth.user.role!=='donor'){ go('login'); return ''; }
  try{
    const d = await api('/donors/me');
    return `<div class="page">
      <p class="small">DONOR DASHBOARD</p>
      <h2>Welcome, ${d.name}</h2>
      <div class="card"><h3>Donor Information</h3>
        <div class="grid2">
          <p><b>Name</b><br>${d.name}</p><p><b>College Email</b><br>${d.email}</p>
          <p><b>Department</b><br>${d.department||'-'}</p><p><b>Year</b><br>${d.year||'-'}</p>
          <p><b>Blood Group</b><br>${d.blood_group}</p><p><b>Phone</b><br>${d.phone}</p>
          <p><b>Last Donation</b><br>${d.last_donation||'-'}</p><p><b>Location</b><br>${d.location||'-'}</p>
        </div>
      </div>
      <div class="card"><h3>Donor Availability</h3>
        <div class="btnrow" style="justify-content:flex-start">
          <button class="btn ${d.available?'':'outline'}" onclick="setAvail(true)">✓ Available</button>
          <button class="btn ${!d.available?'':'outline'}" onclick="setAvail(false)">✕ Not Available</button>
        </div>
        <p class="small">Current status: <b>${d.available?'Available':'Not Available'}</b></p>
      </div>
    </div>`;
  }catch(ex){ go('login'); return ''; }
}
async function setAvail(v){
  try{ await api('/donors/me/availability', { method:'PATCH', body: JSON.stringify({ available: v })}); render(); }
  catch(ex){ alert(ex.message); }
}

// ---------------- BLOOD REQUEST ----------------
function pageRequest(){
  if(!auth.user || auth.user.role!=='requester'){ go('requester-login'); return ''; }
  return `<div class="page"><div class="card">
    <h2>Blood Request Details</h2>
    <p class="small">Please provide accurate information for the blood request.</p>
    <form id="reqForm">
      <label>Patient Name</label><input required id="q_patient">
      <div class="grid2">
        <div><label>Blood Group</label><select required id="q_bg"><option value="">Select Blood Group</option>${BLOOD_GROUPS.map(b=>`<option>${b}</option>`).join('')}</select></div>
        <div><label>Units Required</label><input required type="number" min="1" id="q_units"></div>
      </div>
      <label>Hospital</label><input required id="q_hosp">
      <div class="grid2">
        <div><label>Required Date</label><input required type="date" id="q_date"></div>
        <div><label>Required Time</label><input required type="time" id="q_time"></div>
      </div>
      <label>Emergency</label>
      <select required id="q_urg"><option value="">Select Emergency Status</option><option>Normal</option><option>Urgent</option><option>Emergency</option></select>
      <label>Contact Information</label><input required id="q_contact">
      <button class="btn" style="margin-top:18px;width:100%">Submit Blood Request</button>
      <div id="q_err" class="error"></div>
    </form>
  </div></div>`;
}
function bindRequest(){
  const f = document.getElementById('reqForm'); if(!f) return;
  f.onsubmit = async e=>{
    e.preventDefault();
    const err = document.getElementById('q_err'); err.textContent='';
    try{
      await api('/requests', { method:'POST', body: JSON.stringify({
        patient: document.getElementById('q_patient').value.trim(), bloodGroup: document.getElementById('q_bg').value,
        units: document.getElementById('q_units').value, hospital: document.getElementById('q_hosp').value.trim(),
        requiredDate: document.getElementById('q_date').value, requiredTime: document.getElementById('q_time').value,
        urgency: document.getElementById('q_urg').value, contact: document.getElementById('q_contact').value.trim()
      })});
      go('requester-dashboard'); // matching happened silently in the backend - no matching page
    }catch(ex){ err.textContent = ex.message; }
  };
}

// ---------------- DONOR NOTIFICATIONS ----------------
async function pageNotifications(){
  if(!auth.user || auth.user.role!=='donor'){ go('login'); return ''; }
  const notifs = await api('/donors/me/notifications');
  return `<div class="page"><h2>🔔 BloodLink Notifications</h2>
    ${notifs.length===0? '<p class="small">No notifications yet.</p>' : notifs.map(n=>`
      <div class="card">
        <h3>🩸 Blood Request</h3>
        <p><b>Blood Group:</b> ${n.blood_group}</p><p><b>Patient:</b> ${n.patient}</p>
        <p><b>Hospital:</b> ${n.hospital}</p><p><b>Units Required:</b> ${n.units}</p>
        <p><b>Date:</b> ${n.required_date||'-'} &nbsp; <b>Time:</b> ${n.required_time||'-'}</p>
        <p><b>Emergency:</b> ${n.urgency||'-'}</p>
        <span class="badge ${n.notification_status==='accepted'?'accepted':'pending'}">${n.notification_status}</span>
        ${n.notification_status==='pending' ? `<div class="btnrow" style="justify-content:flex-start;margin-top:12px">
          <button class="btn" onclick="respondNotif('${n.notification_id}','accept')">Accept</button>
          <button class="btn outline" onclick="respondNotif('${n.notification_id}','decline')">Decline</button></div>` : ''}
      </div>`).join('')}
  </div>`;
}
async function respondNotif(id, action){
  try{ await api(`/donors/me/notifications/${id}/respond`, { method:'POST', body: JSON.stringify({ action })}); render(); }
  catch(ex){ alert(ex.message); }
}

// ---------------- REQUESTER DASHBOARD ----------------
async function pageRequesterDashboard(){
  if(!auth.user || auth.user.role!=='requester'){ go('requester-login'); return ''; }
  const mine = await api('/requests/mine');
  const label = { pending:'Pending', matching:'Matching', donor_notified:'Donor Notified', accepted:'Accepted' };
  return `<div class="page"><h2>My Blood Requests</h2>
    <div class="btnrow" style="justify-content:flex-start;margin-bottom:18px"><a class="btn sm" href="#request">+ New Request</a></div>
    ${mine.length===0? '<p class="small">You have not submitted any requests yet.</p>' : mine.map(r=>`
      <div class="card">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <h3>${r.patient} · ${r.blood_group}</h3><span class="badge ${r.accepted_donor_id?'accepted':'pending'}">${label[r.status]||r.status}</span>
        </div>
        <p class="small">Request ID: ${r.id}</p>
        <p><b>Units:</b> ${r.units} &nbsp; <b>Hospital:</b> ${r.hospital} &nbsp; <b>Urgency:</b> ${r.urgency||'-'}</p>
        ${r.accepted_donor_id ? `<a class="btn sm" href="#accepted:${r.id}">View Accepted Donor</a>` :
          `<p class="small">Waiting for a matching donor to accept your request. (${r.matched_donor_ids.length} donor(s) notified)</p>`}
      </div>`).join('')}
  </div>`;
}

// ---------------- ACCEPTED DONOR ----------------
async function pageAccepted(reqId){
  if(!auth.user || auth.user.role!=='requester'){ go('requester-login'); return ''; }
  const res = await api(`/requests/${reqId}/accepted-donor`);
  if(!res.accepted) return `<div class="page"><div class="card"><h2>🩸 Accepted Donor</h2><p class="small">${res.message}</p></div></div>`;
  const d = res.donor;
  return `<div class="page"><h2>🩸 Accepted Donor</h2>
    <div class="card"><h3>Accepted Donor</h3>
      <p><b>Name:</b> ${d.name}</p><p><b>Blood Group:</b> ${d.blood_group}</p>
      <p><b>Phone:</b> ${d.phone}</p><p><b>Location:</b> ${d.location||'-'}</p>
      <p><b>Availability:</b> ${d.available? 'Available':'Not Available'}</p>
      <a class="btn" href="tel:${d.phone}">📞 Call Donor</a>
    </div></div>`;
}

// ---------------- ROUTER ----------------
async function render(){
  renderNav();
  const hash = (location.hash||'#home').slice(1);
  const parts = hash.split(':');
  const name = parts[0];
  const app = document.getElementById('app');
  if(name==='home') app.innerHTML = pageHome();
  else if(name==='register'){ app.innerHTML = pageRegister(); bindRegister(); }
  else if(name==='login'){ app.innerHTML = pageLogin(); bindLogin(); }
  else if(name==='requester-login'){ app.innerHTML = pageRequesterLogin(); bindRequesterAuth(); }
  else if(name==='verify'){ const email = decodeURIComponent(parts[1]); const role = parts[2]; app.innerHTML = pageVerify(email, role); bindVerify(email, role); }
  else if(name==='dashboard'){ app.innerHTML = await pageDashboard(); }
  else if(name==='request'){ app.innerHTML = pageRequest(); bindRequest(); }
  else if(name==='notifications'){ app.innerHTML = await pageNotifications(); }
  else if(name==='requester-dashboard'){ app.innerHTML = await pageRequesterDashboard(); }
  else if(name==='accepted'){ app.innerHTML = await pageAccepted(parts[1]); }
  else app.innerHTML = pageHome();
}
window.onhashchange = render;
checkEmailConfig();
render();
