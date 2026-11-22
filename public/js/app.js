(function () {
  const PATNA = [25.6208, 85.1725]; // near NIT Patna and the Gandhi Ghat stretch
  const COLORS = { high: '#c8372d', medium: '#e08a00', low: '#2f8f5b', cleaned: '#5b6f9a' };
  const LABEL = { plastic: 'Plastic dump', garbage: 'Solid garbage', drain: 'Open drain' };
  const DEPTS = ['Patna Municipal Corporation', 'Bihar State Pollution Control Board', 'Namami Gange district committee'];
  const $ = (s) => document.querySelector(s);
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let reports = [], filter = 'all', picked = null, proofFor = null;

  // ---------- Map ----------
  const map = L.map('map').setView(PATNA, 14);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
  const layer = L.layerGroup().addTo(map);
  let pickMarker = null;

  map.on('click', (e) => setPick(e.latlng.lat, e.latlng.lng));
  function setPick(lat, lng) {
    picked = { lat, lng };
    $('#coords').value = lat.toFixed(5) + ', ' + lng.toFixed(5);
    if (pickMarker) pickMarker.setLatLng([lat, lng]);
    else pickMarker = L.marker([lat, lng], { title: 'New report location' }).addTo(map);
  }
  $('#gps-btn').addEventListener('click', () => {
    if (!navigator.geolocation) return msg('This browser has no GPS. Tap the map instead.', 'err');
    navigator.geolocation.getCurrentPosition(
      (p) => { setPick(p.coords.latitude, p.coords.longitude); map.setView([p.coords.latitude, p.coords.longitude], 17); },
      () => msg('Could not get your location. Allow location access or tap the map.', 'err'),
      { enableHighAccuracy: true, timeout: 10000 });
  });

  const tier = (r) => (r.status === 'cleaned' ? 'cleaned' : severityOf(r.score));

  function drawMap() {
    layer.clearLayers();
    reports.filter((r) => filter === 'all' || tier(r) === filter).forEach((r) => {
      const t = tier(r);
      L.circleMarker([r.lat, r.lng], { radius: 10, color: '#fff', weight: 2, fillColor: COLORS[t], fillOpacity: 0.95 })
        .bindPopup(`<div class="pop"><b>${esc(LABEL[r.category])}</b> (${t})<br>${esc(r.description || 'No description')}
          ${r.photo ? `<img src="${r.photo}" alt="Reported site">` : ''}
          <br>Status: ${esc(r.status)}${r.dept ? ' &middot; ' + esc(r.dept) : ''}
          ${r.proof ? `<br><b>Cleanup proof</b><img src="${r.proof}" alt="Site after cleanup">${esc(r.proofNote || '')}` : ''}</div>`)
        .addTo(layer);
    });
  }

  // ---------- Stats and table ----------
  function drawStats() {
    const open = reports.filter((r) => r.status !== 'cleaned');
    const high = open.filter((r) => severityOf(r.score) === 'high').length;
    $('#stats').innerHTML = `<div><b>${reports.length}</b><span>reports</span></div><div><b>${high}</b><span>high severity open</span></div><div><b>${reports.length - open.length}</b><span>cleaned</span></div>`;
  }

  function drawTable() {
    if (!Auth.isAdmin()) { $('#report-rows').innerHTML = ''; return; }
    const rows = [...reports].sort((a, b) => (a.status === 'cleaned') - (b.status === 'cleaned') || b.score - a.score);
    $('#empty').hidden = rows.length > 0;
    $('#report-rows').innerHTML = rows.map((r) => {
      const t = tier(r);
      let act = '';
      if (r.status === 'new') {
        act = `<select aria-label="Department" data-dept="${r.id}">${DEPTS.map((d) => `<option>${esc(d)}</option>`).join('')}</select>
               <button class="btn sm" data-dispatch="${r.id}">Send to department</button>`;
      } else if (r.status === 'dispatched') {
        act = `<button class="btn sm" data-proof="${r.id}">Add cleanup proof</button>`;
      } else act = 'Closed';
      return `<tr>
        <td><span class="sev ${t}">${t === 'cleaned' ? 'cleaned' : severityOf(r.score)}</span><small>score ${r.score}</small></td>
        <td>${r.photo ? `<img class="thumb" src="${r.photo}" alt="">` : ''}<b>${esc(LABEL[r.category])}</b>
            <small>${esc(r.description || 'No description')}</small>
            <small>${Number(r.lat).toFixed(4)}, ${Number(r.lng).toFixed(4)}</small></td>
        <td>${esc(r.status)}${r.dept ? `<small>${esc(r.dept)}</small>` : ''}</td>
        <td><div class="act">${act}</div></td></tr>`;
    }).join('');
  }

  // ---------- Admin access ----------
  const loginDlg = $('#login-dialog');
  Auth.onChange((on) => {
    $('#authority').hidden = !on; $('#nav-admin').hidden = !on;
    $('#login-btn').textContent = on ? 'Admin logout' : 'Admin login';
    drawTable();
  });
  $('#login-btn').addEventListener('click', () => {
    if (Auth.isAdmin()) return Auth.logout();
    $('#email-label').hidden = Auth.demo;
    $('#login-email').required = !Auth.demo;
    $('#pw-label').textContent = Auth.demo ? 'Admin passcode' : 'Password';
    $('#login-form').reset(); $('#login-msg').textContent = '';
    loginDlg.showModal();
  });
  $('#login-cancel').addEventListener('click', () => loginDlg.close());
  $('#login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await Auth.login($('#login-email').value.trim(), $('#login-pw').value);
      loginDlg.close(); location.hash = '#authority';
    } catch (err) {
      $('#login-msg').className = 'msg err';
      $('#login-msg').textContent = err.code ? 'Email or password is incorrect.' : err.message;
    }
  });

  const render = () => { drawStats(); drawMap(); drawTable(); };
  Store.subscribe((rows) => { reports = rows; render(); });

  document.querySelectorAll('.chip').forEach((c) => c.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach((x) => x.classList.remove('on'));
    c.classList.add('on'); filter = c.dataset.filter; drawMap();
  }));

  // ---------- Authority actions ----------
  $('#report-rows').addEventListener('click', (e) => {
    const d = e.target.dataset;
    if (d.dispatch) {
      const dept = document.querySelector(`[data-dept="${d.dispatch}"]`).value;
      Store.update(d.dispatch, { status: 'dispatched', dept, dispatchedAt: Date.now() });
    }
    if (d.proof) { proofFor = d.proof; $('#proof-form').reset(); $('#proof-dialog').showModal(); }
  });
  $('#proof-form').addEventListener('submit', async (e) => {
    const action = e.submitter && e.submitter.value;
    if (action !== 'ok') return;
    const file = $('#proof-photo').files[0];
    if (!file) return;
    const proof = await compress(file);
    Store.update(proofFor, { status: 'cleaned', proof, proofNote: $('#proof-note').value.trim(), cleanedAt: Date.now() });
  });

  // ---------- Report form ----------
  function msg(text, kind) { const m = $('#form-msg'); m.textContent = text; m.className = 'msg ' + (kind || ''); }

  function compress(file, max = 800) {
    return new Promise((resolve, reject) => {
      const img = new Image(), url = URL.createObjectURL(file);
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = img.width * s; c.height = img.height * s;
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); resolve(c.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = () => reject(new Error('Could not read the photo'));
      img.src = url;
    });
  }

  $('#report-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = e.target, file = f.photo.files[0];
    if (!file) return msg('Add a photo of the site.', 'err');
    if (!picked) return msg('Pin the location: tap the map or use your location.', 'err');
    try {
      const photo = await compress(file);
      await Store.add({
        category: f.category.value, extent: Number(f.extent.value), footfall: f.footfall.checked,
        description: f.description.value.trim(), lat: picked.lat, lng: picked.lng, photo,
      });
      f.reset(); picked = null; if (pickMarker) { map.removeLayer(pickMarker); pickMarker = null; }
      msg('Report submitted. It now appears on the map.', 'ok');
      document.getElementById('map-section').scrollIntoView();
    } catch (err) { msg(err.message || 'Could not submit the report. Try again.', 'err'); }
  });

  if (Store.mode === 'demo') console.info('Ganga portal: demo mode (localStorage). Add Firebase config in js/firebase-config.js.');
})();
