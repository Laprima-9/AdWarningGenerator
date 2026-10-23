(() => {
  'use strict';

  /* ============================================================
     KONFIGURASI / MAPPING
     Sumber: SOP_AERODOME_WARNING.docx + FORMAT_AERODOME_WARNING_BARU.xlsx
     ============================================================ */
  const STATION_NAME = 'H. Asan Kotawaringin Timur';
  const STORAGE_KEY = 'adwrng_history_v2';
  const CUSTOM_FORECASTERS_KEY = 'adwrng_custom_forecasters_v1';

  // Sesuai dropdown resmi G12 (O4:O10) pada FORMAT_AERODOME_WARNING_BARU.xlsx
  const PHENOMENA_MAP = {
    'FU':       { label: 'asap' },
    'TS':       { label: 'badai guntur' },
    'TSRA':     { label: 'hujan dan guntur' },
    'MOD RA':   { label: 'hujan sedang' },
    'HVY RA':   { label: 'hujan lebat' },
    'FG':       { label: 'kabut' },
    'BR':       { label: 'halimun' },
    'SFC WSPD': { label: 'angin kencang' }
  };

  // Sesuai dropdown resmi L12 (P4:P6)
  const INTENSITY_MAP = {
    'INTSF': 'menguat',
    'WKN':   'melemah',
    'NC':    'tidak ada perubahan'
  };

  // Sesuai dropdown resmi J12 (Q4:Q5)
  const SOURCE_NARASI = {
    'OBS':  'berdasarkan pengamatan',
    'FCST': 'berdasarkan prakiraan'
  };

  /* ============================================================
     DOM REFERENCES
     ============================================================ */
  const $ = (id) => document.getElementById(id);

  const els = {
    // ---- form utama (AD WRNG) ----
    cccc: $('cccc'),
    nomor: $('nomor'),
    validFrom: $('validFrom'),
    validTo: $('validTo'),
    jamPembuatan: $('jamPembuatan'),
    phenomena: $('phenomena'),
    source: $('source'),
    windSpeed: $('windSpeed'),
    windSpeedMax: $('windSpeedMax'),
    obsTime: $('obsTime'),
    intensity: $('intensity'),
    forecaster: $('forecaster'),
    windFields: document.querySelectorAll('#form-view .wind-field'),

    icaoOutput: $('icaoOutput'),
    docCccc: $('docCccc'),
    docNomor: $('docNomor'),
    docValid: $('docValid'),
    docPhenomena: $('docPhenomena'),
    docWindSpeed: $('docWindSpeed'),
    docWindSpeedMax: $('docWindSpeedMax'),
    docSource: $('docSource'),
    docObsTime: $('docObsTime'),
    docIntensity: $('docIntensity'),
    docNarasi: $('docNarasi'),
    docForecaster: $('docForecaster'),
    sidebarIcaoCode: $('sidebarIcaoCode'),

    form: $('warningForm'),
    btnReset: $('btnReset'),
    btnCopyIcao: $('btnCopyIcao'),
    btnPrint: $('btnPrint'),
    btnSave: $('btnSave'),

    // ---- form pembatalan (CNL AD WRNG) ----
    cnlCccc: $('cnlCccc'),
    cnlNomorBulletin: $('cnlNomorBulletin'),
    cnlNomorDibatalkan: $('cnlNomorDibatalkan'),
    cnlValidFrom: $('cnlValidFrom'),
    cnlValidTo: $('cnlValidTo'),
    cnlJamPembuatan: $('cnlJamPembuatan'),
    cnlForecaster: $('cnlForecaster'),

    cnlIcaoOutput: $('cnlIcaoOutput'),
    cnlDocCccc: $('cnlDocCccc'),
    cnlDocNomorBulletin: $('cnlDocNomorBulletin'),
    cnlDocValid: $('cnlDocValid'),
    cnlDocNomorDibatalkan: $('cnlDocNomorDibatalkan'),
    cnlDocNarasi: $('cnlDocNarasi'),
    cnlDocForecaster: $('cnlDocForecaster'),

    cnlForm: $('cnlForm'),
    cnlBtnReset: $('cnlBtnReset'),
    cnlBtnCopyIcao: $('cnlBtnCopyIcao'),
    cnlBtnPrint: $('cnlBtnPrint'),
    cnlBtnSave: $('cnlBtnSave'),

    // ---- riwayat ----
    historyList: $('historyList'),
    historyEmpty: $('historyEmpty'),
    historyCount: $('historyCount'),

    sidebar: $('sidebar'),
    sidebarToggle: $('sidebarToggle'),
  };


const forecasterSelect = document.getElementById('forecaster');
const customForecaster = document.getElementById('customForecaster');

function syncCustomForecaster(select, input) {
  const isCustom = select?.value === '__custom__';
  input?.classList.toggle('d-none', !isCustom);
  if (input) input.required = isCustom;
}

function loadCustomForecasters() {
  try {
    const raw = localStorage.getItem(CUSTOM_FORECASTERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function addForecasterOption(name) {
  const trimmedName = (name || '').trim();
  if (!trimmedName) return;

  [forecasterSelect, cancelForecasterSelect].forEach((select) => {
    if (!select || Array.from(select.options).some(option => option.value === trimmedName)) return;
    const option = new Option(trimmedName, trimmedName);
    option.dataset.custom = 'true';
    select.insertBefore(option, select.querySelector('option[value="__custom__"]'));
  });

  const names = loadCustomForecasters().filter(item => item !== trimmedName);
  names.push(trimmedName);
  localStorage.setItem(CUSTOM_FORECASTERS_KEY, JSON.stringify(names));
}

function populateCustomForecasters() {
  loadCustomForecasters().forEach(addForecasterOption);
}

function rememberCustomForecaster(select, input) {
  if (select?.value !== '__custom__') return;
  const name = (input?.value || '').trim();
  if (!name) return;

  if (forecasterBeingEdited?.input === input) {
    renameCustomForecaster(forecasterBeingEdited.oldName, name);
    forecasterBeingEdited = null;
    return;
  }
  addForecasterOption(name);
}

function handleCustomForecasterKeydown(event, select, input) {
  if (event.key === 'Enter') {
    event.preventDefault();
    rememberCustomForecaster(select, input);
    input.blur();
  }
}

function syncForecasterActions(select, editButton, deleteButton) {
  const selectedOption = select?.selectedOptions[0];
  const isCustom = selectedOption?.dataset.custom === 'true';
  if (editButton) editButton.disabled = !isCustom;
  if (deleteButton) deleteButton.disabled = !isCustom;
}

function updateSavedForecaster(oldName, newName) {
  const names = loadCustomForecasters().map(name => name === oldName ? newName : name);
  localStorage.setItem(CUSTOM_FORECASTERS_KEY, JSON.stringify([...new Set(names)]));
}

function editCustomForecaster(select, editButton, deleteButton) {
  const selectedOption = select?.selectedOptions[0];
  if (selectedOption?.dataset.custom !== 'true') return;

  const oldName = selectedOption.value;
  const input = select === forecasterSelect ? customForecaster : customForecasterCancel;
  forecasterBeingEdited = { oldName, input };
  select.value = '__custom__';
  syncCustomForecaster(select, input);
  input.value = oldName;
  input.focus();
  syncForecasterActions(select, editButton, deleteButton);
  showToast('Ubah nama forecaster, lalu tekan Enter.');
}

function renameCustomForecaster(oldName, newName) {
  if (!newName || newName === oldName) return;

  const duplicate = [forecasterSelect, cancelForecasterSelect].some(currentSelect =>
    Array.from(currentSelect.options).some(option => option.value === newName)
  );
  if (duplicate) {
    showToast('Nama forecaster tersebut sudah ada.');
    return;
  }

  [forecasterSelect, cancelForecasterSelect].forEach(currentSelect => {
    const option = Array.from(currentSelect.options).find(item => item.value === oldName);
    if (option) option.value = option.textContent = newName;
  });
  updateSavedForecaster(oldName, newName);
  render();
  renderCnl();
  showToast('Nama forecaster diperbarui.');
}

function deleteCustomForecaster(select, editButton, deleteButton) {
  const selectedOption = select?.selectedOptions[0];
  if (selectedOption?.dataset.custom !== 'true') return;

  const name = selectedOption.value;
  if (!window.confirm(`Hapus forecaster "${name}" dari daftar?`)) return;

  [forecasterSelect, cancelForecasterSelect].forEach(currentSelect => {
    Array.from(currentSelect.options)
      .filter(option => option.value === name && option.dataset.custom === 'true')
      .forEach(option => option.remove());
    if (currentSelect.value === name) currentSelect.value = '';
  });
  const names = loadCustomForecasters().filter(item => item !== name);
  localStorage.setItem(CUSTOM_FORECASTERS_KEY, JSON.stringify(names));
  syncCustomForecaster(forecasterSelect, customForecaster);
  syncCustomForecaster(cancelForecasterSelect, customForecasterCancel);
  syncForecasterActions(select, editButton, deleteButton);
  render();
  renderCnl();
  showToast('Forecaster dihapus dari daftar.');
}

forecasterSelect?.addEventListener('change', () => {
  syncCustomForecaster(forecasterSelect, customForecaster);
  syncForecasterActions(forecasterSelect, editForecaster, deleteForecaster);
  render();
});


const cancelForecasterSelect = document.getElementById('cnlForecaster');
const customForecasterCancel = document.getElementById('customForecasterCancel');
const editForecaster = document.getElementById('editForecaster');
const deleteForecaster = document.getElementById('deleteForecaster');
const editForecasterCancel = document.getElementById('editForecasterCancel');
const deleteForecasterCancel = document.getElementById('deleteForecasterCancel');
let forecasterBeingEdited = null;

cancelForecasterSelect?.addEventListener('change', () => {
  syncCustomForecaster(cancelForecasterSelect, customForecasterCancel);
  syncForecasterActions(cancelForecasterSelect, editForecasterCancel, deleteForecasterCancel);
  renderCnl();
});

customForecaster?.addEventListener('blur', () => rememberCustomForecaster(forecasterSelect, customForecaster));
customForecaster?.addEventListener('keydown', (event) => handleCustomForecasterKeydown(event, forecasterSelect, customForecaster));
customForecasterCancel?.addEventListener('blur', () => rememberCustomForecaster(cancelForecasterSelect, customForecasterCancel));
customForecasterCancel?.addEventListener('keydown', (event) => handleCustomForecasterKeydown(event, cancelForecasterSelect, customForecasterCancel));

editForecaster?.addEventListener('click', () => editCustomForecaster(forecasterSelect, editForecaster, deleteForecaster));
deleteForecaster?.addEventListener('click', () => deleteCustomForecaster(forecasterSelect, editForecaster, deleteForecaster));
editForecasterCancel?.addEventListener('click', () => editCustomForecaster(cancelForecasterSelect, editForecasterCancel, deleteForecasterCancel));
deleteForecasterCancel?.addEventListener('click', () => deleteCustomForecaster(cancelForecasterSelect, editForecasterCancel, deleteForecasterCancel));

  /* ============================================================
     HELPERS
     ============================================================ */

  // "102300" -> { day:"10", hour:"23", minute:"00" }
  function parseDHM(value) {
    const v = (value || '').trim();
    if (!/^\d{6}$/.test(v)) return null;
    return { day: v.slice(0, 2), hour: v.slice(2, 4), minute: v.slice(4, 6) };
  }

  // "2300Z" / "2300" -> { hour:"23", minute:"00" }
  function parseObsTime(value) {
    const v = (value || '').trim().toUpperCase().replace('Z', '');
    if (!/^\d{3,4}$/.test(v)) return null;
    const padded = v.padStart(4, '0');
    return { hour: padded.slice(0, 2), minute: padded.slice(2, 4) };
  }

  function normalizeNomor(raw) {
    const v = (raw || '').trim();
    if (!v) return { display: '', narasi: '' };
    // tampilkan apa adanya untuk ICAO (mis. "01"), tanpa nol depan untuk narasi/tabel
    const stripped = v.replace(/^0+(?=\d)/, '');
    return { display: v, narasi: stripped };
  }

  function getFormData() {
    return {
      cccc: (els.cccc.value || '').trim().toUpperCase(),
      nomor: els.nomor.value,
      validFrom: els.validFrom.value,
      validTo: els.validTo.value,
      jamPembuatan: els.jamPembuatan.value,
      phenomena: els.phenomena.value,
      source: els.source.value,
      windSpeed: els.windSpeed.value,
      windSpeedMax: els.windSpeedMax.value,
      obsTime: els.obsTime.value,
      intensity: els.intensity.value,
      forecaster: els.forecaster.value === '__custom__'
        ? (customForecaster.value || '').trim()
        : (els.forecaster.value || '').trim()
    };
  }

  function getCnlFormData() {
    return {
      cccc: (els.cnlCccc.value || '').trim().toUpperCase(),
      nomorBulletin: els.cnlNomorBulletin.value,
      nomorDibatalkan: els.cnlNomorDibatalkan.value,
      validFrom: els.cnlValidFrom.value,
      validTo: els.cnlValidTo.value,
      jamPembuatan: els.cnlJamPembuatan.value,
      forecaster: els.cnlForecaster.value === '__custom__'
        ? (customForecasterCancel.value || '').trim()
        : (els.cnlForecaster.value || '').trim()
    };
  }

  /* ============================================================
     BUILDERS — AERODROME WARNING (AD WRNG)
     ============================================================ */

  // Sandi resmi, mengikuti contoh SOP & xlsx:
  // WOID44 WAGS 100810
  // WAGS AD WRNG 2 VALID 200700/200900 FU OBS AT 0800Z INTSF=
  function buildIcaoMessage(d) {
    const isWind = d.phenomena === 'SFC WSPD';
    const cccc = d.cccc || '----';
    const nomor = normalizeNomor(d.nomor).display || '--';
    const from = d.validFrom || '------';
    const to = d.validTo || '------';

    let phenomPart;
    const ws = d.windSpeed !== '' ? d.windSpeed : '';
    const wsMax = d.windSpeedMax !== '' ? d.windSpeedMax : '';
    if (isWind) {
      phenomPart = `SFC WSPD ${ws || '--'}KT MAX ${wsMax || '--'}`;
    } else {
      // Wind Speed dan Max Wind Speed juga ditampilkan di sandi
      // saat fenomena utama bukan SFC WSPD, jika nilainya diisi.
      const windDetails = [];
      if (ws !== '') windDetails.push(`${ws}KT`);
      if (wsMax !== '') windDetails.push(`MAX ${wsMax}`);
      phenomPart = [d.phenomena || '—', ...windDetails].join(' ');
    }

    const sourcePart = d.source === 'FCST'
      ? 'FCST'
      : `OBS AT ${(d.obsTime || '----Z').toUpperCase()}`;

    const intensityPart = d.intensity || '—';
    const message = `${cccc} AD WRNG ${nomor} VALID ${from}/${to} ${phenomPart} ${sourcePart} ${intensityPart}=`;

    const lines = [];
    if (d.jamPembuatan) lines.push(`WOID44 ${cccc} ${d.jamPembuatan}`);
    lines.push(message);
    return lines.join('\n');
  }

  // Narasi otomatis — replika presisi formula CONCATENATE pada B16 (FORMAT_AERODOME_WARNING_BARU.xlsx)
  function buildNarasi(d) {
    const dhmFrom = parseDHM(d.validFrom);
    const dhmTo = parseDHM(d.validTo);
    const nomor = normalizeNomor(d.nomor);
    const phenom = PHENOMENA_MAP[d.phenomena];
    const intensityLabel = INTENSITY_MAP[d.intensity];

    if (!dhmFrom || !dhmTo || !nomor.narasi || !phenom || !intensityLabel) return null;
    if (d.source === 'OBS' && !parseObsTime(d.obsTime)) return null;

    const fromText = `${parseInt(dhmFrom.day, 10)} jam ${dhmFrom.hour}.${dhmFrom.minute}`;
    const toText = `${parseInt(dhmTo.day, 10)} jam ${dhmTo.hour}.${dhmTo.minute}`;

    // klausa fenomena utama
    let phenomenaClause;
    if (d.phenomena === 'SFC WSPD') {
      const ws = d.windSpeed !== '' ? d.windSpeed : '0';
      const wsMax = d.windSpeedMax !== '' ? d.windSpeedMax : '0';
      phenomenaClause = ` angin kencang dengan kecepatan ${ws} knot dengan kecepatan angin maksimum sebesar ${wsMax} knot`;
    } else {
      phenomenaClause = ` ${phenom.label}`;
    }

    // klausa kombinasi angin tambahan (fenomena lain + info angin diisi opsional)
    let comboClause = '';
    if (d.phenomena !== 'SFC WSPD' && d.windSpeed !== '') {
      const wsMax = d.windSpeedMax !== '' ? d.windSpeedMax : '0';
      comboClause = ` disertai angin kencang dengan kecepatan ${d.windSpeed} knot dengan kecepatan angin maksimum sebesar ${wsMax} knot`;
    }

    const sourceLabel = SOURCE_NARASI[d.source] || 'berdasarkan pengamatan';

    let tailClause;
    if (d.source === 'OBS') {
      const obs = parseObsTime(d.obsTime);
      tailClause = ` jam ${obs.hour}.${obs.minute} UTC, `;
    } else {
      tailClause = ', ';
    }

    return `Aerodrome Warning Stasiun Meteorologi ${STATION_NAME} nomor ${nomor.narasi}, `
      + `berlaku dari tanggal ${fromText} UTC sampai dengan tanggal ${toText} UTC terjadi`
      + `${phenomenaClause}${comboClause}, ${sourceLabel}${tailClause}${intensityLabel}.`;
  }

  /* ============================================================
     BUILDERS — PEMBATALAN (CNL AD WRNG)
     ============================================================ */

  // Sandi resmi, mengikuti SOP Bab II: "CNL AD WRNG [n] YYG1G1g1g1/YYG2G2g2g2"
  // Contoh SOP: WOID44 WAGS 280300 / CNL AD WRNG 1 280300/280330=
  function buildCnlIcaoMessage(d) {
    const cccc = d.cccc || '----';
    const nomorDibatalkan = normalizeNomor(d.nomorDibatalkan).display || '--';
    const from = d.validFrom || '------';
    const to = d.validTo || '------';

    const lines = [];
    if (d.jamPembuatan) lines.push(`WOID44 ${cccc} ${d.jamPembuatan}`);
    lines.push(`CNL AD WRNG ${nomorDibatalkan} ${from}/${to}=`);
    return lines.join('\n');
  }

  // Narasi pembatalan — replika presisi formula CONCATENATE pada S16 (FORMAT_AERODOME_WARNING_BARU.xlsx)
  function buildCnlNarasi(d) {
    const dhmFrom = parseDHM(d.validFrom);
    const dhmTo = parseDHM(d.validTo);
    const nomorBulletin = normalizeNomor(d.nomorBulletin);
    const nomorDibatalkan = normalizeNomor(d.nomorDibatalkan);

    if (!dhmFrom || !dhmTo || !nomorBulletin.narasi || !nomorDibatalkan.narasi) return null;

    const tanggal = parseInt(dhmFrom.day, 10);

    return `Aerodrome Warning nomor ${nomorBulletin.narasi} yang dikeluarkan pada tanggal ${tanggal}, `
      + `berlaku mulai jam ${dhmFrom.hour}.${dhmFrom.minute}UTC sampai jam ${dhmTo.hour}.${dhmTo.minute}UTC `
      + `yang menerangkan bahwa Aerodrome Warning no ${nomorDibatalkan.narasi} dibatalkan.`;
  }

  /* ============================================================
     RENDER — FORM UTAMA
     ============================================================ */

  function toggleWindFields(d) {
    // Field Wind Speed dan Max Wind Speed selalu ditampilkan,
    // termasuk saat fenomena utama bukan SFC WSPD.
    els.windFields.forEach(f => f.classList.remove('d-none'));

    // Wajib diisi hanya ketika fenomena utama adalah SFC WSPD.
    const isWindPhenomenon = d.phenomena === 'SFC WSPD';
    els.windSpeed.required = isWindPhenomenon;
    els.windSpeedMax.required = isWindPhenomenon;
  }

  function render() {
    const d = getFormData();
    toggleWindFields(d);

    els.icaoOutput.textContent = buildIcaoMessage(d);

    const isWind = d.phenomena === 'SFC WSPD';
    const nomorInfo = normalizeNomor(d.nomor);

    els.docCccc.textContent = d.cccc || '—';
    els.sidebarIcaoCode.textContent = d.cccc || 'WAGS';
    els.docNomor.textContent = nomorInfo.narasi || nomorInfo.display || '—';

    els.docValid.textContent = (d.validFrom || d.validTo)
      ? `${d.validFrom || '------'}/${d.validTo || '------'}`
      : '—';

    els.docPhenomena.textContent = isWind ? '' : (d.phenomena || '—');
    els.docWindSpeed.textContent = d.windSpeed !== '' ? `${d.windSpeed}KT` : '';
    els.docWindSpeedMax.textContent = d.windSpeedMax !== '' ? `MAX ${d.windSpeedMax}` : '';

    els.docSource.textContent = d.source || '—';
    els.docObsTime.textContent = d.obsTime ? d.obsTime.toUpperCase() : '—';
    els.docIntensity.textContent = d.intensity || '—';

    const narasi = buildNarasi(d);
    els.docNarasi.textContent = narasi || 'Lengkapi form di sebelah kiri untuk menghasilkan narasi berita secara otomatis.';
    els.docNarasi.classList.toggle('text-muted', !narasi);

    els.docForecaster.textContent = d.forecaster || '—';
  }

  /* ============================================================
     RENDER — FORM PEMBATALAN
     ============================================================ */

  function renderCnl() {
    const d = getCnlFormData();

    els.cnlIcaoOutput.textContent = buildCnlIcaoMessage(d);

    els.cnlDocCccc.textContent = d.cccc || '—';
    els.cnlDocNomorBulletin.textContent = normalizeNomor(d.nomorBulletin).narasi || '—';
    els.cnlDocNomorDibatalkan.textContent = normalizeNomor(d.nomorDibatalkan).narasi || '—';

    els.cnlDocValid.textContent = (d.validFrom || d.validTo)
      ? `${d.validFrom || '------'}/${d.validTo || '------'}`
      : '—';

    const narasi = buildCnlNarasi(d);
    els.cnlDocNarasi.textContent = narasi || 'Lengkapi form di sebelah kiri untuk menghasilkan narasi pembatalan secara otomatis.';
    els.cnlDocNarasi.classList.toggle('text-muted', !narasi);

    els.cnlDocForecaster.textContent = d.forecaster || '—';
  }

  /* ============================================================
     HISTORY (localStorage) — menyimpan dua tipe: warning & cancel
     ============================================================ */

  function loadHistory() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveHistory(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function formatTimestamp(iso) {
    const dt = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(dt.getDate())}-${pad(dt.getMonth() + 1)}-${dt.getFullYear()} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
  }

  function renderHistory() {
    const items = loadHistory();
    els.historyCount.textContent = items.length;
    els.historyList.innerHTML = '';

    if (items.length === 0) {
      els.historyEmpty.style.display = 'flex';
      els.historyList.style.display = 'none';
      return;
    }
    els.historyEmpty.style.display = 'none';
    els.historyList.style.display = 'flex';

    items.slice().reverse().forEach((item) => {
      const isCnl = item.type === 'cancel';
      const row = document.createElement('div');
      row.className = 'history-item';
      row.innerHTML = `
        <div class="history-icon"><i class="bi ${isCnl ? 'bi-x-circle' : 'bi-file-earmark-text'}"></i></div>
        <div class="history-info">
          <div class="history-title">
            ${isCnl ? '<span class="history-badge cnl">CNL</span>' : '<span class="history-badge wrn">AD WRNG</span>'}
            ${item.cccc} ${isCnl ? `CNL AD WRNG ${item.nomor}` : `AD WRNG ${item.nomor}`}
          </div>
          <div class="history-sub">Disimpan ${formatTimestamp(item.tanggal)}</div>
          <div class="history-code">${item.icao}</div>
        </div>
        <div class="history-actions">
          <button class="btn-icon btn-load" data-id="${item.id}" title="Muat ke form"><i class="bi bi-box-arrow-up-left"></i></button>
          <button class="btn-icon btn-delete" data-id="${item.id}" title="Hapus"><i class="bi bi-trash3"></i></button>
        </div>`;
      els.historyList.appendChild(row);
    });
  }

  function saveCurrentToHistory() {
    rememberCustomForecaster(forecasterSelect, customForecaster);
    const d = getFormData();
    const items = loadHistory();
    items.push({
      id: `w_${Date.now()}`,
      type: 'warning',
      tanggal: new Date().toISOString(),
      cccc: d.cccc || '—',
      nomor: normalizeNomor(d.nomor).display || '—',
      icao: buildIcaoMessage(d),
      data: d
    });
    saveHistory(items);
    renderHistory();
    showToast('Warning tersimpan ke riwayat.');
  }

  function saveCnlToHistory() {
    rememberCustomForecaster(cancelForecasterSelect, customForecasterCancel);
    const d = getCnlFormData();
    const items = loadHistory();
    items.push({
      id: `c_${Date.now()}`,
      type: 'cancel',
      tanggal: new Date().toISOString(),
      cccc: d.cccc || '—',
      nomor: normalizeNomor(d.nomorDibatalkan).display || '—',
      icao: buildCnlIcaoMessage(d),
      data: d
    });
    saveHistory(items);
    renderHistory();
    showToast('Pembatalan tersimpan ke riwayat.');
  }

  function loadFromHistory(id) {
    const items = loadHistory();
    const item = items.find(it => it.id === id);
    if (!item || !item.data) return;

    if (item.type === 'cancel') {
      const d = item.data;
      els.cnlCccc.value = d.cccc || '';
      els.cnlNomorBulletin.value = d.nomorBulletin || '';
      els.cnlNomorDibatalkan.value = d.nomorDibatalkan || '';
      els.cnlValidFrom.value = d.validFrom || '';
      els.cnlValidTo.value = d.validTo || '';
      els.cnlJamPembuatan.value = d.jamPembuatan || '';
      setForecasterValue(els.cnlForecaster, customForecasterCancel, d.forecaster);
      renderCnl();
      switchView('form-view-cancel');
    } else {
      const d = item.data;
      els.cccc.value = d.cccc || '';
      els.nomor.value = d.nomor || '';
      els.validFrom.value = d.validFrom || '';
      els.validTo.value = d.validTo || '';
      els.jamPembuatan.value = d.jamPembuatan || '';
      els.phenomena.value = d.phenomena || 'FU';
      els.source.value = d.source || 'OBS';
      els.windSpeed.value = d.windSpeed || '';
      els.windSpeedMax.value = d.windSpeedMax || '';
      els.obsTime.value = d.obsTime || '';
      els.intensity.value = d.intensity || 'INTSF';
      setForecasterValue(els.forecaster, customForecaster, d.forecaster);
      render();
      switchView('form-view');
    }
    showToast('Data dimuat ke form.');
  }

  function deleteFromHistory(id) {
    const items = loadHistory().filter(it => it.id !== id);
    saveHistory(items);
    renderHistory();
    showToast('Riwayat dihapus.');
  }

  /* ============================================================
     UI: VIEW SWITCH / SIDEBAR / TOAST
     ============================================================ */

  function switchView(viewId) {
    document.querySelectorAll('.view').forEach(v => v.classList.toggle('active', v.id === viewId));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.view === viewId));
    els.sidebar.classList.remove('open');
  }

  function showToast(message) {
    $('appToastBody').textContent = message;
    const toastEl = $('appToast');
    if (window.bootstrap && window.bootstrap.Toast) {
      window.bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 2200 }).show();
    }
  }

  /* ============================================================
     NAMA FILE SAAT PRINT / SIMPAN PDF
     Format: "Aerodrome Warning_DDMMYYYY-HHMMUTC_DDMMYYYY-HHMMWIB"
     Browser memakai document.title sebagai saran nama file pada
     dialog "Save as PDF", jadi kita ubah title sesaat sebelum print
     lalu kembalikan setelah dialog print ditutup.
     ============================================================ */

  function pad2(n) { return String(n).padStart(2, '0'); }

  function formatUtcStamp(d) {
    return `${pad2(d.getUTCDate())}${pad2(d.getUTCMonth() + 1)}${d.getUTCFullYear()}-${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}UTC`;
  }

  function formatWibStamp(d) {
    const wib = new Date(d.getTime() + 7 * 60 * 60 * 1000); // UTC+7
    return `${pad2(wib.getUTCDate())}${pad2(wib.getUTCMonth() + 1)}${wib.getUTCFullYear()}-${pad2(wib.getUTCHours())}${pad2(wib.getUTCMinutes())}WIB`;
  }

  function buildPrintFilename(suffix) {
    const now = new Date();
    const base = suffix ? `Aerodrome Warning - ${suffix}` : 'Aerodrome Warning';
    return `${base}_${formatUtcStamp(now)}_${formatWibStamp(now)}`;
  }

  function printWithFilename(suffix) {
    const originalTitle = document.title;
    document.title = buildPrintFilename(suffix);

    const restore = () => {
      document.title = originalTitle;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);

    window.print();
  }

  /* ============================================================
     FALLBACK LOGO — jika assets/LogoBMKG.png belum tersedia,
     ganti otomatis ke logo SVG bawaan supaya dokumen tidak
     menampilkan ikon gambar rusak.
     ============================================================ */

  function attachLogoFallback() {
    const fallbackHtml = `
      <svg viewBox="0 0 100 100" class="doc-logo-svg" xmlns="http://www.w3.org/2000/svg">
        <circle cx="50" cy="50" r="47" fill="#ffffff" stroke="#1B3B6F" stroke-width="2.5"/>
        <path d="M12 42 Q30 28 50 42 Q70 56 88 42" fill="none" stroke="#1B6FE0" stroke-width="7" stroke-linecap="round"/>
        <path d="M8 54 Q30 42 50 54 Q70 66 92 54" fill="none" stroke="#4C93F0" stroke-width="6" stroke-linecap="round"/>
        <path d="M10 66 Q30 78 50 66 Q70 54 90 66" fill="none" stroke="#2E8B4E" stroke-width="7" stroke-linecap="round"/>
        <path d="M14 76 Q30 86 50 76 Q70 66 86 76" fill="none" stroke="#6BBE7A" stroke-width="6" stroke-linecap="round"/>
      </svg>
      <div class="doc-logo-label">BMKG</div>`;

    document.querySelectorAll('img.doc-logo').forEach((img) => {
      img.addEventListener('error', () => {
        const wrap = document.createElement('div');
        wrap.className = 'doc-logo-fallback';
        wrap.innerHTML = fallbackHtml;
        img.replaceWith(wrap);
      }, { once: true });
    });
  }

  /* ============================================================
     EVENTS — FORM UTAMA
     ============================================================ */

  els.form.addEventListener('input', render);
  els.form.addEventListener('change', render);

  els.btnReset.addEventListener('click', () => {
    els.form.reset();
    syncCustomForecaster(forecasterSelect, customForecaster);
    syncForecasterActions(forecasterSelect, editForecaster, deleteForecaster);
    render();
    showToast('Form direset.');
  });

  els.btnCopyIcao.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(els.icaoOutput.textContent);
      showToast('ICAO Message disalin ke clipboard.');
    } catch (e) {
      showToast('Gagal menyalin — salin manual dari kotak ICAO.');
    }
  });

  els.btnPrint.addEventListener('click', () => printWithFilename());
  els.btnSave.addEventListener('click', saveCurrentToHistory);

  /* ============================================================
     EVENTS — FORM PEMBATALAN
     ============================================================ */

  els.cnlForm.addEventListener('input', renderCnl);
  els.cnlForm.addEventListener('change', renderCnl);

  els.cnlBtnReset.addEventListener('click', () => {
    els.cnlForm.reset();
    syncCustomForecaster(cancelForecasterSelect, customForecasterCancel);
    syncForecasterActions(cancelForecasterSelect, editForecasterCancel, deleteForecasterCancel);
    renderCnl();
    showToast('Form direset.');
  });

  els.cnlBtnCopyIcao.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(els.cnlIcaoOutput.textContent);
      showToast('ICAO Message disalin ke clipboard.');
    } catch (e) {
      showToast('Gagal menyalin — salin manual dari kotak ICAO.');
    }
  });

  els.cnlBtnPrint.addEventListener('click', () => printWithFilename('Pembatalan'));
  els.cnlBtnSave.addEventListener('click', saveCnlToHistory);

  /* ============================================================
     EVENTS — RIWAYAT & NAVIGASI
     ============================================================ */

  $('btnClearHistory').addEventListener('click', () => {
    if (confirm('Hapus seluruh riwayat warning pada perangkat ini?')) {
      saveHistory([]);
      renderHistory();
      showToast('Seluruh riwayat dihapus.');
    }
  });

  els.historyList.addEventListener('click', (e) => {
    const loadBtn = e.target.closest('.btn-load');
    const delBtn = e.target.closest('.btn-delete');
    if (loadBtn) loadFromHistory(loadBtn.dataset.id);
    if (delBtn) deleteFromHistory(delBtn.dataset.id);
  });

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  els.sidebarToggle.addEventListener('click', () => els.sidebar.classList.toggle('open'));

  /* ============================================================
     INIT
     ============================================================ */
  function setForecasterValue(select, customInput, value) {
    const matchingOption = Array.from(select.options).some(option => option.value === value);
    if (value && !matchingOption) {
      select.value = '__custom__';
      customInput.value = value;
    } else {
      select.value = value || '';
      customInput.value = '';
    }
    syncCustomForecaster(select, customInput);
  }

  populateCustomForecasters();
  syncCustomForecaster(forecasterSelect, customForecaster);
  syncCustomForecaster(cancelForecasterSelect, customForecasterCancel);
  syncForecasterActions(forecasterSelect, editForecaster, deleteForecaster);
  syncForecasterActions(cancelForecasterSelect, editForecasterCancel, deleteForecasterCancel);
  render();
  renderCnl();
  renderHistory();
  attachLogoFallback();
})();
