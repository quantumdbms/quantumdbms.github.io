(() => {
  const papers = window.PAPER_CATALOG || [];
  const areaSelect = document.getElementById('areaSelect');
  const problemSelect = document.getElementById('problemSelect');
  const venueSelect = document.getElementById('venueSelect');
  const authorPicker = document.getElementById('authorPicker');
  const authorSummary = document.getElementById('authorSummary');
  const authorSearch = document.getElementById('authorSearch');
  const authorOptions = document.getElementById('authorOptions');
  const clearAuthors = document.getElementById('clearAuthors');
  const advancedSummary = document.getElementById('advancedSummary');
  const advancedGroups = document.getElementById('advancedGroups');
  const clearAdvanced = document.getElementById('clearAdvanced');
  const searchInput = document.getElementById('searchInput');
  const activeFilters = document.getElementById('activeFilters');
  const paperList = document.getElementById('paperList');
  const detail = document.getElementById('detail');
  const visibleCount = document.getElementById('visibleCount');
  let selectedId = papers[0]?.id;
  const selectedAuthors = new Set();
  const selectedAdvanced = { publicationTypes: new Set(), paradigms: new Set(), algorithms: new Set(), platforms: new Set() };

  const escapeHtml = value => String(value || '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const areas = [...new Set(papers.flatMap(p => p.areas || [p.area]))];
  areaSelect.innerHTML = '<option value="all">All research areas</option>' + areas.map(a => `<option>${escapeHtml(a)}</option>`).join('');
  const databaseProblems = [...new Set(papers.flatMap(p => p.databaseProblems || []))].sort((a,b) => a.localeCompare(b));
  problemSelect.innerHTML = '<option value="all">All database problems</option>' + databaseProblems.map(problem => {
    const count = papers.filter(p => (p.databaseProblems || []).includes(problem)).length;
    return `<option value="${escapeHtml(problem)}">${escapeHtml(problem)} (${count})</option>`;
  }).join('');

  const authorNames = [...new Set(papers.flatMap(p => p.authors.split(/\s*(?:,|;|\band\b)\s*/i)).map(a => a.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  const venueFamily = p => /CODS.?COMAD/i.test(p.venue) ? 'CODS-COMAD' : /arXiv/i.test(p.venue) ? 'arXiv' : /PVLDB|VLDB/i.test(p.venue) ? 'VLDB' : /SIGMOD|PACMMOD|Q-Data/i.test(p.venue) ? 'SIGMOD' : /ICDE/i.test(p.venue) ? 'ICDE' : /EDBT/i.test(p.venue) ? 'EDBT' : /CIDR/i.test(p.venue) ? 'CIDR' : /QCE|Quantum Week/i.test(p.venue) ? 'IEEE Quantum Week' : 'Other';
  const workshopName = p => /Q-Data/i.test(p.venue) ? 'Q-Data workshop' : /QDSM/i.test(p.venue) ? 'QDSM workshop' : /QCDKM|QC.DKM/i.test(p.venue) ? 'QC&DKM workshop' : /Q-Spatial/i.test(p.venue) ? 'Q-Spatial workshop' : /Workshop/i.test(p.venue) ? p.venue : '';
  const families = [...new Set(papers.map(venueFamily))].sort();
  const editions = [...new Set(papers.filter(p => p.year).map(p => `${venueFamily(p)}|${p.year}`))].sort((a,b) => b.localeCompare(a));
  const workshops = [...new Set(papers.map(workshopName).filter(Boolean))].sort();
  venueSelect.innerHTML = '<option value="all">All venues and editions</option>' +
    `<optgroup label="Conference families">${families.map(v => `<option value="family:${escapeHtml(v)}">${escapeHtml(v)} — all years</option>`).join('')}</optgroup>` +
    `<optgroup label="Specific editions">${editions.map(v => { const [f,y]=v.split('|'); return `<option value="edition:${escapeHtml(v)}">${escapeHtml(f)} ${escapeHtml(y)}</option>`; }).join('')}</optgroup>` +
    `<optgroup label="Workshops">${workshops.map(v => `<option value="workshop:${escapeHtml(v)}">${escapeHtml(v)} — all years</option>`).join('')}</optgroup>`;

  function renderAuthorOptions() {
    const q = authorSearch.value.trim().toLowerCase();
    authorOptions.innerHTML = authorNames.filter(a => !q || a.toLowerCase().includes(q)).map(a => `<label class="author-option"><input type="checkbox" value="${escapeHtml(a)}" ${selectedAuthors.has(a) ? 'checked' : ''}><span>${escapeHtml(a)}</span></label>`).join('');
    authorOptions.querySelectorAll('input').forEach(box => box.addEventListener('change', () => {
      box.checked ? selectedAuthors.add(box.value) : selectedAuthors.delete(box.value);
      authorSearch.value = '';
      authorSummary.textContent = selectedAuthors.size ? `${selectedAuthors.size} author${selectedAuthors.size === 1 ? '' : 's'} selected` : 'All authors';
      renderAuthorOptions();
      renderList();
    }));
  }
  renderAuthorOptions();

  const advancedLabels = { publicationTypes: 'Publication type', paradigms: 'Quantum paradigm', algorithms: 'Algorithm / formulation', platforms: 'Platform / software footprint' };
  function renderAdvancedGroups() {
    advancedGroups.innerHTML = Object.entries(advancedLabels).map(([key, label]) => {
      const values = [...new Set(papers.flatMap(p => p[key] || []))].sort((a,b) => a.localeCompare(b));
      return `<section class="filter-group"><h4>${label}</h4><div class="filter-checks">${values.map(value => {
        const count = papers.filter(p => (p[key] || []).includes(value)).length;
        return `<label class="filter-chip"><input type="checkbox" data-group="${key}" value="${escapeHtml(value)}" ${selectedAdvanced[key].has(value) ? 'checked' : ''}><span>${escapeHtml(value)}</span><small>${count}</small></label>`;
      }).join('')}</div></section>`;
    }).join('');
    advancedGroups.querySelectorAll('input').forEach(box => box.addEventListener('change', () => {
      box.checked ? selectedAdvanced[box.dataset.group].add(box.value) : selectedAdvanced[box.dataset.group].delete(box.value);
      const n = Object.values(selectedAdvanced).reduce((sum, set) => sum + set.size, 0);
      advancedSummary.textContent = n ? `Advanced filters · ${n} selected` : 'Advanced quantum filters';
      renderList();
    }));
  }
  renderAdvancedGroups();

  function filtered() {
    const area = areaSelect.value;
    const problem = problemSelect.value;
    const venue = venueSelect.value;
    const q = searchInput.value.trim().toLowerCase();
    const authorQuery = authorSearch.value.trim().toLocaleLowerCase();
    return papers.filter(p => {
      const venueOk = venue === 'all' ||
        (venue.startsWith('family:') && venueFamily(p) === venue.slice(7)) ||
        (venue.startsWith('edition:') && `${venueFamily(p)}|${p.year}` === venue.slice(8)) ||
        (venue.startsWith('workshop:') && workshopName(p) === venue.slice(9));
      const normalizedAuthors = p.authors.toLocaleLowerCase();
      const authorOk = selectedAuthors.size
        ? [...selectedAuthors].some(a => normalizedAuthors.includes(a.toLocaleLowerCase()))
        : !authorQuery || normalizedAuthors.includes(authorQuery);
      const advancedOk = Object.entries(selectedAdvanced).every(([key, selected]) => !selected.size || [...selected].some(value => (p[key] || []).includes(value)));
      const problemOk = problem === 'all' || (p.databaseProblems || []).includes(problem);
      return (area === 'all' || (p.areas || [p.area]).includes(area)) && problemOk && venueOk && authorOk && advancedOk && (!q || `${p.title} ${p.authors} ${p.venue} ${p.year} ${(p.areas||[]).join(' ')} ${(p.databaseProblems||[]).join(' ')} ${(p.paradigms||[]).join(' ')} ${(p.algorithms||[]).join(' ')} ${(p.platforms||[]).join(' ')}`.toLowerCase().includes(q));
    });
  }

  function resetAllFilters() {
    areaSelect.value = 'all';
    problemSelect.value = 'all';
    venueSelect.value = 'all';
    searchInput.value = '';
    authorSearch.value = '';
    selectedAuthors.clear();
    Object.values(selectedAdvanced).forEach(set => set.clear());
    authorSummary.textContent = 'All authors';
    advancedSummary.textContent = 'Advanced quantum filters';
    renderAuthorOptions();
    renderAdvancedGroups();
    renderList();
  }

  function renderActiveFilters() {
    const chips = [];
    if (areaSelect.value !== 'all') chips.push({type:'area', label:`Area: ${areaSelect.value}`});
    if (problemSelect.value !== 'all') chips.push({type:'problem', label:`Problem: ${problemSelect.value}`});
    if (venueSelect.value !== 'all') chips.push({type:'venue', label:`Venue: ${venueSelect.options[venueSelect.selectedIndex]?.text || venueSelect.value}`});
    selectedAuthors.forEach(value => chips.push({type:'author', value, label:`Author: ${value}`}));
    if (!selectedAuthors.size && authorSearch.value.trim()) chips.push({type:'authorQuery', label:`Author search: ${authorSearch.value.trim()}`});
    Object.entries(selectedAdvanced).forEach(([group, values]) => values.forEach(value => chips.push({type:'advanced', group, value, label:`${advancedLabels[group]}: ${value}`})));
    if (searchInput.value.trim()) chips.push({type:'search', label:`Search: “${searchInput.value.trim()}”`});
    if (!chips.length) {
      activeFilters.innerHTML = '<span class="filter-state-empty">No filters applied</span>';
      return;
    }
    activeFilters.innerHTML = `<div class="active-filter-head"><strong>Active filters · ${chips.length}</strong><button type="button" data-clear-all>Clear all</button></div><div class="active-filter-chips">${chips.map((chip, index) => `<button type="button" class="active-filter-chip" data-chip="${index}" title="Remove ${escapeHtml(chip.label)}"><span>${escapeHtml(chip.label)}</span><b aria-hidden="true">×</b></button>`).join('')}</div>`;
    activeFilters.querySelector('[data-clear-all]').addEventListener('click', resetAllFilters);
    activeFilters.querySelectorAll('[data-chip]').forEach(button => button.addEventListener('click', () => {
      const chip = chips[Number(button.dataset.chip)];
      if (chip.type === 'area') areaSelect.value = 'all';
      if (chip.type === 'problem') problemSelect.value = 'all';
      if (chip.type === 'venue') venueSelect.value = 'all';
      if (chip.type === 'search') searchInput.value = '';
      if (chip.type === 'authorQuery') {
        authorSearch.value = '';
        renderAuthorOptions();
      }
      if (chip.type === 'author') {
        selectedAuthors.delete(chip.value);
        authorSummary.textContent = selectedAuthors.size ? `${selectedAuthors.size} author${selectedAuthors.size === 1 ? '' : 's'} selected` : 'All authors';
        renderAuthorOptions();
      }
      if (chip.type === 'advanced') {
        selectedAdvanced[chip.group].delete(chip.value);
        const n = Object.values(selectedAdvanced).reduce((sum, set) => sum + set.size, 0);
        advancedSummary.textContent = n ? `Advanced filters · ${n} selected` : 'Advanced quantum filters';
        renderAdvancedGroups();
      }
      renderList();
    }));
  }

  function renderList() {
    const view = filtered();
    renderActiveFilters();
    visibleCount.textContent = view.length;
    if (!view.some(p => p.id === selectedId)) selectedId = view[0]?.id;
    paperList.innerHTML = view.length ? view.map(p => `
      <button class="paper-button ${p.id === selectedId ? 'active' : ''}" data-id="${p.id}" type="button">
        <span>${escapeHtml(p.title)}</span>
        <small>${escapeHtml([p.venue, p.year].filter(Boolean).join(' · '))}</small>
      </button>`).join('') : '<div class="empty">No matching papers.</div>';
    paperList.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
      selectedId = button.dataset.id;
      renderList();
      renderDetail();
    }));
    renderDetail();
  }

  function renderDetail() {
    const paper = papers.find(p => p.id === selectedId);
    if (!paper) {
      detail.innerHTML = '<div class="empty">Select a paper to inspect it.</div>';
      return;
    }
    const noteKey = `quantum-paper-note:${paper.id}`;
    detail.innerHTML = `
      <div class="area-tags">${(paper.areas || [paper.area]).map(area => `<span class="area">${escapeHtml(area)}</span>`).join('')}</div>
      <h2>${escapeHtml(paper.title)}</h2>
      <p class="authors">${escapeHtml(paper.authors)}</p>
      <p class="venue">${escapeHtml([paper.venue, paper.year].filter(Boolean).join(' · '))}</p>
      <div class="problem-tags">${(paper.databaseProblems||[]).map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
      <div class="metadata-tags">${[...(paper.publicationTypes||[]), ...(paper.paradigms||[]), ...(paper.algorithms||[]), ...(paper.platforms||[])].map(tag => `<span>${escapeHtml(tag)}</span>`).join('')}</div>
      <h3>${escapeHtml(paper.abstractLabel || 'Abstract')}</h3>
      <div class="abstract">${escapeHtml(paper.abstract)}</div>
      <a class="pdf-link" href="${encodeURI(paper.pdf)}" target="_blank" rel="noopener">Access PDF ↗</a>
      <h3>Personal notes</h3>
      <textarea id="notes" placeholder="Connections, slide ideas, questions, quotations…"></textarea>
      <p class="note-status" id="noteStatus">Notes are saved automatically in this browser.</p>`;
    const notes = document.getElementById('notes');
    const status = document.getElementById('noteStatus');
    notes.value = localStorage.getItem(noteKey) || '';
    let timer;
    notes.addEventListener('input', () => {
      clearTimeout(timer);
      status.textContent = 'Saving…';
      timer = setTimeout(() => {
        localStorage.setItem(noteKey, notes.value);
        status.textContent = 'Saved locally.';
      }, 250);
    });
  }

  areaSelect.addEventListener('change', renderList);
  problemSelect.addEventListener('change', renderList);
  venueSelect.addEventListener('change', renderList);
  authorSearch.addEventListener('input', () => { renderAuthorOptions(); renderList(); });
  clearAuthors.addEventListener('click', () => { selectedAuthors.clear(); authorSearch.value = ''; authorSummary.textContent = 'All authors'; renderAuthorOptions(); renderList(); });
  clearAdvanced.addEventListener('click', () => { Object.values(selectedAdvanced).forEach(set => set.clear()); advancedSummary.textContent = 'Advanced quantum filters'; renderAdvancedGroups(); renderList(); });
  searchInput.addEventListener('input', renderList);
  renderList();
})();
