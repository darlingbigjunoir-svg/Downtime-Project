
  // ---------- DATA MODEL ----------
  let downtimeRecords = [];

  // Load from localStorage
  function loadData() {
    const stored = localStorage.getItem('downtime_db_v2');
    if(stored) {
      downtimeRecords = JSON.parse(stored);
    } else {
      // sample demo data to show functionality
      downtimeRecords = [
        { id: 1001, date: "2026-04-15", machine: "EX-204", system: "Engine", start: "08:15", finish: "11:45", total: "3h 30m", desc: "Engine failure, low compression", reptype: "Breakdown (unscheduled)", remarks: "Replaced cylinder head gasket, tested" },
        { id: 1002, date: "2026-04-16", machine: "Loader-07", system: "Hydraulic", start: "13:00", finish: "16:20", total: "3h 20m", desc: "Hydraulic hose burst", reptype: "Emergency repair", remarks: "Replaced hose and refilled oil" },
        { id: 1003, date: "2026-04-16", machine: "GD-01", system: "Tyres", start: "09:00", finish: "11:00", total: "2h 0m", desc: "Flat tyre on front left", reptype: "Breakdown (unscheduled)", remarks: "Replaced tyre, balanced" }
      ];
    }
    renderMachineFilterDropdown();
    if(document.getElementById('records-tbody')) renderRecordsTable();
    if(document.getElementById('summary-stats')) renderSummary();
  }

  function saveToLocal() {
    localStorage.setItem('downtime_db_v2', JSON.stringify(downtimeRecords));
  }

  // Helper: calculate total from start/finish
  function computeTotal(startStr, finishStr) {
    if(!startStr || !finishStr) return '';
    let [sh, sm] = startStr.split(':').map(Number);
    let [fh, fm] = finishStr.split(':').map(Number);
    let diffMins = (fh * 60 + fm) - (sh * 60 + sm);
    if(diffMins < 0) diffMins += 24 * 60;
    let h = Math.floor(diffMins / 60);
    let m = diffMins % 60;
    return `${h}h ${String(m).padStart(2,'0')}m`;
  }

  function minutesFromTotal(totalStr) {
    if(!totalStr) return 0;
    let match = totalStr.match(/(\d+)h\s*(\d+)m/);
    if(match) return parseInt(match[1])*60 + parseInt(match[2]);
    return 0;
  }

  // auto calculate total on form
  const startInput = document.getElementById('start-time');
  const finishInput = document.getElementById('finish-time');
  const totalField = document.getElementById('total-downtime');
  function updateTotalField() {
    totalField.value = computeTotal(startInput.value, finishInput.value);
  }
  if(startInput && finishInput) {
    startInput.addEventListener('input', updateTotalField);
    finishInput.addEventListener('input', updateTotalField);
  }

  // Save entry
  function saveNewEntry() {
    const date = document.getElementById('entry-date').value;
    const machine = document.getElementById('machine-no').value.trim();
    const system = document.getElementById('system-type').value;
    const start = document.getElementById('start-time').value;
    const finish = document.getElementById('finish-time').value;
    const desc = document.getElementById('breakdown-desc').value.trim();
    const reptype = document.getElementById('repair-type').value;
    const remarks = document.getElementById('remarks-field').value.trim();
    const total = totalField.value;

    if(!date || !machine || !system || !start || !finish) {
      alert("❌ Please fill mandatory fields: Date, Machine No., System, Start & Finish time.");
      return;
    }
    if(!desc) {
      alert("Please provide a breakdown description.");
      return;
    }
    const newRecord = {
      id: Date.now(),
      date: date,
      machine: machine,
      system: system,
      start: start,
      finish: finish,
      total: total || computeTotal(start, finish),
      desc: desc,
      reptype: reptype,
      remarks: remarks || "-"
    };
    downtimeRecords.unshift(newRecord);
    saveToLocal();
    clearFormFields();
    alert("✅ Downtime entry saved!");
    // switch to records tab automatically
    document.querySelector('.tab-btn[data-tab="records"]').click();
  }

  function clearFormFields() {
    document.getElementById('machine-no').value = '';
    document.getElementById('system-type').value = '';
    document.getElementById('start-time').value = '';
    document.getElementById('finish-time').value = '';
    document.getElementById('breakdown-desc').value = '';
    document.getElementById('remarks-field').value = '';
    document.getElementById('repair-type').value = 'Breakdown (unscheduled)';
    totalField.value = '';
    document.getElementById('entry-date').value = new Date().toISOString().slice(0,10);
  }

  function deleteRecord(id) {
    if(confirm("Permanently delete this downtime record?")) {
      downtimeRecords = downtimeRecords.filter(r => r.id !== id);
      saveToLocal();
      renderRecordsTable();
      renderSummary();
      renderMachineFilterDropdown();
    }
  }

  // filtering & render table
  function getFilteredRecords() {
    const searchTerm = document.getElementById('search-input')?.value.toLowerCase() || '';
    const sysFilter = document.getElementById('filter-system-select')?.value || '';
    const machFilter = document.getElementById('filter-machine-select')?.value || '';
    return downtimeRecords.filter(rec => {
      let matchSearch = !searchTerm || 
        rec.machine.toLowerCase().includes(searchTerm) ||
        rec.system.toLowerCase().includes(searchTerm) ||
        rec.desc.toLowerCase().includes(searchTerm) ||
        (rec.remarks && rec.remarks.toLowerCase().includes(searchTerm));
      let matchSys = !sysFilter || rec.system === sysFilter;
      let matchMach = !machFilter || rec.machine === machFilter;
      return matchSearch && matchSys && matchMach;
    });
  }

  function renderRecordsTable() {
    const tbody = document.getElementById('records-tbody');
    const tfoot = document.getElementById('records-tfoot');
    const filtered = getFilteredRecords();
    if(filtered.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding:40px;">📭 No downtime records found. Add new entry.</td></tr>';
      tfoot.innerHTML = '';
      return;
    }
    tbody.innerHTML = filtered.map(rec => `
      <tr>
        <td>${rec.date}</td>
        <td><strong>${escapeHtml(rec.machine)}</strong></td>
        <td>${rec.start}</td>
        <td>${rec.finish}</td>
        <td><strong>${rec.total}</strong></td>
        <td>${getSystemBadge(rec.system)}</td>
        <td>${escapeHtml(rec.reptype)}</td>
        <td style="max-width:200px; word-break:break-word;">${escapeHtml(rec.desc)}</td>
        <td style="max-width:220px; word-break:break-word;">${escapeHtml(rec.remarks)}</td>
        <td class="no-print"><button class="delete-btn" onclick="deleteRecord(${rec.id})">Delete</button></td>
      </tr>
    `).join('');
    // footer total
    const totalMins = filtered.reduce((sum, r) => sum + minutesFromTotal(r.total), 0);
    const th = Math.floor(totalMins / 60);
    const tm = totalMins % 60;
    tfoot.innerHTML = `<tr class="total-footer"><td colspan="4"><strong>Total records: ${filtered.length}</strong></td><td colspan="1"><strong>${th}h ${String(tm).padStart(2,'0')}m</strong></td><td colspan="5"></td></tr>`;
  }

  function getSystemBadge(system) {
    let cls = 'badge-other';
    if(system === 'Engine') cls = 'badge-engine';
    else if(system === 'Hydraulic') cls = 'badge-hydraulic';
    else if(system === 'Electrical') cls = 'badge-electrical';
    else if(system === 'Tyres') cls = 'badge-tyres';
    else if(system === 'Transmission') cls = 'badge-transmission';
    else if(system === 'Brakes') cls = 'badge-brakes';
    return `<span class="badge-sys ${cls}">${system}</span>`;
  }

  function renderMachineFilterDropdown() {
    const machines = [...new Set(downtimeRecords.map(r => r.machine).filter(Boolean))].sort();
    const select = document.getElementById('filter-machine-select');
    if(select) {
      let currVal = select.value;
      select.innerHTML = '<option value="">All machines</option>' + machines.map(m => `<option value="${escapeHtml(m)}" ${currVal === m ? 'selected' : ''}>${escapeHtml(m)}</option>`).join('');
    }
  }

  function renderSummary() {
    if(!document.getElementById('summary-stats')) return;
    const totalIncidents = downtimeRecords.length;
    const totalMinsAll = downtimeRecords.reduce((sum, r) => sum + minutesFromTotal(r.total), 0);
    const totalHours = Math.floor(totalMinsAll / 60);
    const totalMinsMod = totalMinsAll % 60;
    const uniqueMachines = new Set(downtimeRecords.map(r => r.machine)).size;
    const today = new Date().toISOString().slice(0,10);
    const todayCount = downtimeRecords.filter(r => r.date === today).length;
    document.getElementById('summary-stats').innerHTML = `
      <div class="stat-card"><div class="stat-number">${totalIncidents}</div><div class="stat-label">Total Incidents</div></div>
      <div class="stat-card"><div class="stat-number">${totalHours}h ${String(totalMinsMod).padStart(2,'0')}m</div><div class="stat-label">Total Downtime</div></div>
      <div class="stat-card"><div class="stat-number">${uniqueMachines}</div><div class="stat-label">Machines affected</div></div>
      <div class="stat-card"><div class="stat-number">${todayCount}</div><div class="stat-label">Logged today</div></div>
    `;
    // system breakdown
    const sysMap = {};
    downtimeRecords.forEach(r => {
      let sys = r.system || 'Other';
      if(!sysMap[sys]) sysMap[sys] = { count: 0, mins: 0 };
      sysMap[sys].count++;
      sysMap[sys].mins += minutesFromTotal(r.total);
    });
    const maxCount = Math.max(...Object.values(sysMap).map(v=>v.count), 1);
    const container = document.getElementById('system-breakdown-bars');
    container.innerHTML = '';
    for(let [sys, data] of Object.entries(sysMap).sort((a,b)=>b[1].mins - a[1].mins)) {
      const percent = (data.count / maxCount) * 100;
      const barColor = sys === 'Engine' ? '#D85A30' : sys === 'Hydraulic' ? '#378ADD' : sys === 'Electrical' ? '#EF9F27' : sys === 'Tyres' ? '#639922' : '#7F77DD';
      const hours = Math.floor(data.mins / 60);
      const mins = data.mins % 60;
      container.innerHTML += `
        <div class="sys-bar-item">
          <span class="sys-name">${sys}</span>
          <div class="bar-track"><div class="bar-fill" style="width: ${percent}%; background: ${barColor};"></div></div>
          <span style="min-width: 50px; font-weight:600;">${data.count}</span>
          <span style="min-width: 80px; color:#2c5a7a;">${hours}h ${String(mins).padStart(2,'0')}m</span>
        </div>
      `;
    }
    // machine ranking
    const machineRank = {};
    downtimeRecords.forEach(r => {
      if(!r.machine) return;
      if(!machineRank[r.machine]) machineRank[r.machine] = { incidents: 0, totalMins: 0 };
      machineRank[r.machine].incidents++;
      machineRank[r.machine].totalMins += minutesFromTotal(r.total);
    });
    const sortedMachines = Object.entries(machineRank).sort((a,b) => b[1].totalMins - a[1].totalMins);
    const rankBody = document.getElementById('machine-rank-body');
    rankBody.innerHTML = sortedMachines.map(([mac, data]) => {
      const hrs = Math.floor(data.totalMins / 60);
      const mins = data.totalMins % 60;
      return `<tr><td>${escapeHtml(mac)}</td><td>${data.incidents}</td><td>${hrs}h ${String(mins).padStart(2,'0')}m</td></tr>`;
    }).join('');
    if(sortedMachines.length === 0) rankBody.innerHTML = '<tr><td colspan="3">No data</td></tr>';
  }

  function escapeHtml(str) { if(!str) return ''; return str.replace(/[&<>]/g, function(m){if(m==='&') return '&amp;'; if(m==='<') return '&lt;'; if(m==='>') return '&gt;'; return m;}); }

  // print report
  function printReport() {
    const sysFilter = document.getElementById('filter-system-select')?.value || '';
    const machFilter = document.getElementById('filter-machine-select')?.value || '';
    let label = "All downtime records";
    if(sysFilter && machFilter) label = `${sysFilter} · ${machFilter}`;
    else if(sysFilter) label = `${sysFilter} system`;
    else if(machFilter) label = `Machine: ${machFilter}`;
    document.getElementById('print-range-label').innerText = label + ` — Generated: ${new Date().toLocaleString()}`;
    window.print();
  }

  // event listeners & tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabId = btn.getAttribute('data-tab');
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.querySelectorAll('.panel').forEach(panel => panel.classList.remove('active-panel'));
      document.getElementById(`panel-${tabId}`).classList.add('active-panel');
      if(tabId === 'records') { renderRecordsTable(); renderMachineFilterDropdown(); }
      if(tabId === 'summary') renderSummary();
    });
  });

  document.getElementById('save-entry-btn')?.addEventListener('click', saveNewEntry);
  document.getElementById('clear-form-btn')?.addEventListener('click', clearFormFields);
  document.getElementById('search-input')?.addEventListener('input', () => renderRecordsTable());
  document.getElementById('filter-system-select')?.addEventListener('change', () => renderRecordsTable());
  document.getElementById('filter-machine-select')?.addEventListener('change', () => renderRecordsTable());
  document.getElementById('print-report-btn')?.addEventListener('click', printReport);

  // initial load
  loadData();
  renderRecordsTable();
  renderSummary();
  document.getElementById('entry-date').valueAsDate = new Date();
