// Directory page. Every brand card is already in the HTML (rendered at build
// time); this script filters, counts and sorts them, and keeps the current
// filters in the URL (?q=&product=&country=&region=&era=&sort=) so a filtered
// view can be shared or linked to.
(function () {
    const $ = (id) => document.getElementById(id);
    const grid = $('grid');
    const cards = [...grid.querySelectorAll('.ltile')].map((el) => ({
        el,
        search: el.dataset.search,
        name: el.dataset.name,
        country: el.dataset.country,
        region: el.dataset.region,
        products: el.dataset.products ? el.dataset.products.split('|') : [],
        founded: el.dataset.founded ? Number(el.dataset.founded) : null,
    }));

    const ERAS = {
        'pre-1950': (y) => y < 1950,
        '1950-1999': (y) => y >= 1950 && y <= 1999,
        '2000-2019': (y) => y >= 2000 && y <= 2019,
        '2020-plus': (y) => y >= 2020,
    };
    const DEFAULTS = { q: '', product: '', country: '', region: '', era: '', sort: 'name' };
    const state = { ...DEFAULTS };

    // ---- read initial state from the URL ----
    const params = new URLSearchParams(location.search);
    for (const k of Object.keys(DEFAULTS)) if (params.get(k)) state[k] = params.get(k);
    if (!ERAS[state.era]) state.era = '';

    const productChips = [...$('product-chips').querySelectorAll('.fchip')];
    const eraChips = [...$('era-chips').querySelectorAll('.fchip')];

    // ---- matching ----
    const tests = {
        q: (c) => !state.q || state.q.toLowerCase().split(/\s+/).every((w) => c.search.includes(w)),
        product: (c) => !state.product || c.products.includes(state.product),
        country: (c) => !state.country || c.country === state.country,
        region: (c) => !state.region || c.region === state.region,
        era: (c) => !state.era || (c.founded != null && ERAS[state.era](c.founded)),
    };
    const matches = (c, except) => Object.entries(tests).every(([k, t]) => k === except || t(c));

    // How many results each option would give, keeping the other filters as they are
    function countBy(key, valuesOf) {
        const counts = {};
        for (const c of cards) if (matches(c, key)) for (const v of valuesOf(c)) counts[v] = (counts[v] || 0) + 1;
        return counts;
    }

    const sorters = {
        name: (a, b) => a.name.localeCompare(b.name),
        'name-desc': (a, b) => b.name.localeCompare(a.name),
        oldest: (a, b) => (a.founded ?? 1e9) - (b.founded ?? 1e9) || a.name.localeCompare(b.name),
        newest: (a, b) => (b.founded ?? -1e9) - (a.founded ?? -1e9) || a.name.localeCompare(b.name),
        state: (a, b) => (a.region || '~').localeCompare(b.region || '~') || a.name.localeCompare(b.name),
    };

    function render() {
        // results
        const shown = cards.filter((c) => matches(c));
        const sorted = [...cards].sort(sorters[state.sort] || sorters.name);
        const frag = document.createDocumentFragment();
        for (const c of sorted) { c.el.hidden = !shown.includes(c); frag.appendChild(c.el); }
        grid.appendChild(frag);

        const active = ['q', 'product', 'country', 'region', 'era'].filter((k) => state[k]).length;
        $('results-info').textContent = shown.length === cards.length
            ? `Showing all ${cards.length}`
            : `Showing ${shown.length} of ${cards.length}`;
        $('no-results').hidden = shown.length > 0;
        $('clear-all').hidden = active === 0;
        const moreActive = ['country', 'region', 'era'].filter((k) => state[k]).length;
        $('active-count').textContent = moreActive ? ` (${moreActive})` : '';

        // product chips
        const pc = countBy('product', (c) => c.products);
        const pTotal = cards.filter((c) => matches(c, 'product')).length;
        for (const chip of productChips) {
            const v = chip.dataset.value;
            chip.setAttribute('aria-pressed', String(v === state.product));
            const n = v ? pc[v] || 0 : pTotal;
            if (v) { chip.querySelector('.n').textContent = n; chip.disabled = n === 0 && v !== state.product; }
        }

        // era chips
        const ec = countBy('era', (c) => (c.founded == null ? [] : Object.keys(ERAS).filter((e) => ERAS[e](c.founded))));
        for (const chip of eraChips) {
            const v = chip.dataset.value;
            chip.setAttribute('aria-pressed', String(v === state.era));
            chip.querySelector('.n').textContent = ec[v] || 0;
            chip.disabled = !ec[v] && v !== state.era;
        }

        // select options with counts
        const cc = countBy('country', (c) => [c.country]);
        for (const opt of $('country').options) {
            if (!opt.value) continue;
            opt.textContent = `${opt.dataset.label || (opt.dataset.label = opt.textContent)} (${cc[opt.value] || 0})`;
        }
        const rc = countBy('region', (c) => (c.region ? [c.region] : []));
        for (const opt of $('region').querySelectorAll('option')) {
            if (!opt.value) continue;
            const n = rc[opt.value] || 0;
            opt.textContent = `${opt.dataset.label || (opt.dataset.label = opt.textContent)} (${n})`;
            opt.disabled = n === 0 && opt.value !== state.region;
        }

        // controls reflect state
        $('q').value = state.q;
        $('country').value = state.country;
        $('region').value = state.region;
        $('sort').value = state.sort;

        // URL reflects state
        const p = new URLSearchParams();
        for (const [k, v] of Object.entries(state)) if (v && v !== DEFAULTS[k]) p.set(k, v);
        const qs = p.toString();
        history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
    }

    const set = (k, v) => { state[k] = v; render(); };

    // ---- wire up controls ----
    let typing;
    $('q').addEventListener('input', (e) => { clearTimeout(typing); typing = setTimeout(() => set('q', e.target.value.trim()), 120); });
    for (const chip of productChips) chip.addEventListener('click', () => set('product', chip.dataset.value));
    for (const chip of eraChips) chip.addEventListener('click', () => set('era', state.era === chip.dataset.value ? '' : chip.dataset.value));
    $('country').addEventListener('change', (e) => {
        state.country = e.target.value;
        if (state.region && state.country && !state.region.startsWith(state.country + '-')) state.region = '';
        render();
    });
    $('region').addEventListener('change', (e) => set('region', e.target.value));
    $('sort').addEventListener('change', (e) => set('sort', e.target.value));
    $('clear-all').addEventListener('click', () => { Object.assign(state, DEFAULTS, { sort: state.sort }); render(); });

    $('filters-toggle').addEventListener('click', (e) => {
        const panel = $('more-filters');
        const open = panel.classList.toggle('open');
        e.currentTarget.setAttribute('aria-expanded', String(open));
    });
    if (state.country || state.region || state.era) {
        $('more-filters').classList.add('open');
        $('filters-toggle').setAttribute('aria-expanded', 'true');
    }

    render();

    // ---- back to top ----
    const top = $('back-to-top');
    window.addEventListener('scroll', () => top.classList.toggle('show', window.scrollY > 600), { passive: true });
    top.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();
