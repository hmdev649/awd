// Directory page: loads /brands.json (generated from brands/*.md at build time),
// then filters, sorts and renders the cards in the browser.
(function () {
    let allCompanies = [];
    let filteredCompanies = [];
    let currentSortBy = 'name';
    let sortAscending = true;

    const $ = (id) => document.getElementById(id);
    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const countryName = (c) => ({ US: 'United States', CA: 'Canada' }[c] || c);

    // "2026-11-07" -> "Nov 7, 2026"
    function formatDate(iso) {
        const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return iso;
        return new Date(+m[1], +m[2] - 1, +m[3]).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }

    const icons = {
        website: '<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.93-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>',
        instagram: '<svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>',
        email: '<svg viewBox="0 0 24 24"><path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>',
    };

    async function loadCompaniesData() {
        try {
            const response = await fetch('brands.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            allCompanies = await response.json();
            setupFilters();
            setupSorting();
            applyFiltersAndSort();
        } catch (error) {
            console.error('Error loading brands:', error);
            $('results-info').innerHTML =
                '<div class="no-results"><h3>Error Loading Data</h3><p>Unable to load company data. Please try again later.</p></div>';
        }
    }

    function addOptions(select, values, label = (v) => v) {
        for (const v of values) {
            const option = document.createElement('option');
            option.value = v;
            option.textContent = label(v);
            select.appendChild(option);
        }
    }

    function setupFilters() {
        const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort();
        addOptions($('country-filter'), uniq(allCompanies.map((c) => c.country)), countryName);
        addOptions($('state-filter'), uniq(allCompanies.map((c) => c.state)));
        addOptions($('product-filter'), uniq(allCompanies.flatMap((c) => c.products)));

        $('search').addEventListener('input', applyFiltersAndSort);
        for (const id of ['country-filter', 'state-filter', 'product-filter']) $(id).addEventListener('change', applyFiltersAndSort);
        for (const id of ['year-from', 'year-to']) $(id).addEventListener('input', applyFiltersAndSort);
    }

    function setupSorting() {
        $('sort-by').addEventListener('change', (e) => {
            const value = e.target.value;
            if (value === 'founded-reverse') {
                currentSortBy = 'founded';
                sortAscending = false;
            } else {
                currentSortBy = value;
                if (currentSortBy !== 'founded') sortAscending = true;
            }
            updateSortDirectionIcon();
            applyFiltersAndSort();
        });
        $('sort-direction').addEventListener('click', () => {
            sortAscending = !sortAscending;
            updateSortDirectionIcon();
            applyFiltersAndSort();
        });
        updateSortDirectionIcon();
    }

    function updateSortDirectionIcon() {
        $('sort-direction').innerHTML = sortAscending
            ? '<svg viewBox="0 0 24 24"><path d="M3 13h2l-3 3-3-3h2m0-8h6v2H3V5zm0 4h9v2H3V9zm0 4h12v2H3v-2zm18-9v12l-4-4 4-4z" fill="currentColor"/></svg>'
            : '<svg viewBox="0 0 24 24"><path d="M3 13h2l-3 3-3-3h2m0-8h6v2H3V5zm0 4h9v2H3V9zm0 4h12v2H3v-2zm18 5v-12l-4 4-4-4z" fill="currentColor"/></svg>';
    }

    function applyFiltersAndSort() {
        applyFilters();
        sortCompanies();
        displayCompanies();
        updateResultsInfo();
    }

    function applyFilters() {
        const searchTerm = $('search').value.trim().toLowerCase();
        const country = $('country-filter').value;
        const state = $('state-filter').value;
        const product = $('product-filter').value;
        const yearFrom = parseInt($('year-from').value) || 0;
        const yearTo = parseInt($('year-to').value) || 9999;
        const yearFiltered = $('year-from').value || $('year-to').value;

        filteredCompanies = allCompanies.filter((c) =>
            (!searchTerm || c.name.toLowerCase().includes(searchTerm)) &&
            (!country || c.country === country) &&
            (!state || c.state === state) &&
            (!product || c.products.includes(product)) &&
            (!yearFiltered || (c.founded && c.founded >= yearFrom && c.founded <= yearTo))
        );
    }

    function sortCompanies() {
        const key = {
            name: (c) => c.name.toLowerCase(),
            state: (c) => c.state.toLowerCase(),
            city: (c) => c.city.toLowerCase(),
            location: (c) => `${c.city}, ${c.state}`.toLowerCase(),
            founded: (c) => c.founded || 0,
        }[currentSortBy];
        if (!key) return;
        filteredCompanies.sort((a, b) => {
            // Brands with no founding year always go last
            if (currentSortBy === 'founded' && !a.founded !== !b.founded) return a.founded ? -1 : 1;
            const x = key(a), y = key(b);
            const r = typeof x === 'number' ? x - y : x < y ? -1 : x > y ? 1 : 0;
            return sortAscending ? r : -r;
        });
    }

    function getCountryFlag(country) {
        if (country !== 'US' && country !== 'CA') return '';
        return `<div class="country-flag" title="${countryName(country)}"><img src="images/${country.toLowerCase()}_flag.png" alt="${countryName(country)} flag" /></div>`;
    }

    function displayCompanies() {
        $('companies-grid').innerHTML = filteredCompanies.map((c) => {
            let links = '';
            if (c.website) links += `<a href="${esc(c.website)}" target="_blank" rel="noopener" class="company-link" title="Visit Website">${icons.website}</a>`;
            if (c.instagram) links += `<a href="${esc(c.instagram)}" target="_blank" rel="noopener" class="company-link" title="View Instagram">${icons.instagram}</a>`;
            if (c.email) links += `<a href="mailto:${esc(c.email)}" class="company-link" title="Send Email">${icons.email}</a>`;

            const location = [c.city, c.state].filter(Boolean).join(', ');
            const logo = c.logo
                ? `<img src="${esc(c.logo.replace(/^\//, ''))}" alt="${esc(c.name)} logo" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px; background: white;" onerror="this.parentElement.textContent='LOGO';" />`
                : 'LOGO';

            return `
                <div class="company-card">
                    ${getCountryFlag(c.country)}
                    <a class="company-logo" href="${esc(c.url)}" aria-label="${esc(c.name)}">${logo}</a>
                    <h3 class="company-name"><a href="${esc(c.url)}">${esc(c.name)}</a></h3>
                    ${location ? `<div class="company-location">${esc(location)}</div>` : ''}
                    ${c.founded ? `<div class="company-founded">Founded ${c.founded}</div>` : ''}
                    ${c.products.length ? `<div class="company-founded">Products: ${esc(c.products.join(', '))}</div>` : ''}
                    <div class="company-links">${links}</div>
                    ${c.last_updated ? `<div class="last-updated">Last updated: ${formatDate(c.last_updated)}</div>` : ''}
                </div>`;
        }).join('');
    }

    function updateResultsInfo() {
        const total = filteredCompanies.length;
        if (total === 0) {
            $('results-info').innerHTML = '<div class="no-results"><h3>No companies found</h3><p>Try adjusting your search criteria to see more results.</p></div>';
            return;
        }
        const dir = sortAscending ? '↑' : '↓';
        const label = { name: 'Company Name', state: 'State', city: 'City', location: 'Location', founded: 'Founded Year' }[currentSortBy] || 'Default';
        $('results-info').textContent = `Showing ${total} of ${allCompanies.length} companies • Sorted by ${label} ${dir}`;
    }

    // Year inputs accept up to the current year
    const thisYear = new Date().getFullYear();
    $('year-from').max = thisYear;
    $('year-to').max = thisYear;

    loadCompaniesData();

    // Back to top button
    const backToTopBtn = $('back-to-top');
    window.addEventListener('scroll', () => backToTopBtn.classList.toggle('show', window.pageYOffset > 300));
    backToTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();
