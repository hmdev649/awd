// Renders every <div class="map" data-points="[...]"> on the page with MapLibre.
// Map tiles: OpenFreeMap (free, no API key; data from OpenStreetMap).
(function () {
    if (!window.maplibregl) return;

    const STYLE = 'https://tiles.openfreemap.org/styles/positron';
    const NORTH_AMERICA = [[-125, 24.5], [-66.5, 50]]; // contiguous US + southern Canada
    const CLUSTER_MAX_ZOOM = 12;
    // US and Canadian brands get their own colors and are clustered separately,
    // so a cluster's count never mixes the two countries. Colors come from
    // the site's --ink and --brass variables.
    const css = getComputedStyle(document.documentElement);
    const cssVar = (name, fallback) => css.getPropertyValue(name).trim() || fallback;
    const CREAM = cssVar('--cream', '#fbe9cd');
    const COUNTRIES = [
        { code: 'US', name: 'United States', color: cssVar('--ink', '#304047') },
        { code: 'CA', name: 'Canada', color: cssVar('--brass', '#7c5f30') },
    ];

    const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const logo = (p) => p.t
        ? `<span class="logo-box"><img src="${esc(p.t)}" alt=""></span>`
        : `<span class="logo-box"><span class="monogram">${esc(p.n.charAt(0).toUpperCase())}</span></span>`;

    function popupHtml(list) {
        if (list.length === 1) {
            const p = list[0];
            return `<div class="map-popup">${logo(p)}<div><strong>${esc(p.n)}</strong><span>${esc(p.l)}${p.a ? ' (approx.)' : ''}</span><a href="${esc(p.u)}">View profile →</a></div></div>`;
        }
        const items = list
            .sort((a, b) => a.n.localeCompare(b.n))
            .map((p) => `<li><a href="${esc(p.u)}">${logo(p)}<span><strong>${esc(p.n)}</strong><span>${esc(p.l)}</span></span></a></li>`)
            .join('');
        return `<div class="map-list"><p>${list.length} here</p><ul>${items}</ul></div>`;
    }

    function boundsOf(points) {
        const b = new maplibregl.LngLatBounds();
        for (const p of points) b.extend([p.lng, p.lat]);
        return b;
    }

    function init(el) {
        let points = [];
        try { points = JSON.parse(el.dataset.points || '[]'); } catch (e) { console.error('Bad map data', e); }
        const full = el.dataset.mode === 'full';
        const wide = el.dataset.view === 'north-america' || !points.length;

        const map = new maplibregl.Map({
            container: el,
            style: STYLE,
            bounds: wide ? NORTH_AMERICA : boundsOf(points),
            fitBoundsOptions: { padding: 40, maxZoom: 9 },
            // Previews need ctrl/cmd+scroll (desktop) or two fingers (phones) so the page still scrolls
            cooperativeGestures: !full,
            dragRotate: false,
            pitchWithRotate: false,
            touchPitch: false,
            attributionControl: { compact: true },
        });
        map.touchZoomRotate.disableRotation();
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');

        map.on('load', () => {
            // Start the credits collapsed behind the (i) button so they don't cover small maps
            el.querySelector('.maplibregl-ctrl-attrib')?.classList.remove('maplibregl-compact-show');

            const present = COUNTRIES.filter((c) => points.some((p) => (p.c || 'US') === c.code));
            // One GeoJSON source per country; `type` limits it to one company type
            const features = (code, type) => ({
                type: 'FeatureCollection',
                features: points.flatMap((p, i) => ((p.c || 'US') === code && (!type || (p.k || []).includes(type)) ? [{
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
                    properties: { i, a: p.a ? 1 : 0 },
                }] : [])),
            });
            for (const { code, color } of present) {
                const src = `brands-${code}`;
                map.addSource(src, {
                    type: 'geojson',
                    data: features(code, ''),
                    cluster: true,
                    clusterRadius: 36,
                    clusterMaxZoom: CLUSTER_MAX_ZOOM,
                });
                map.addLayer({
                    id: `clusters-${code}`, type: 'circle', source: src, filter: ['has', 'point_count'],
                    paint: {
                        'circle-color': color, 'circle-opacity': 0.92,
                        'circle-radius': ['step', ['get', 'point_count'], 14, 10, 18, 30, 23],
                        'circle-stroke-width': 3, 'circle-stroke-color': CREAM,
                    },
                });
                map.addLayer({
                    id: `cluster-count-${code}`, type: 'symbol', source: src, filter: ['has', 'point_count'],
                    layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-allow-overlap': true },
                    paint: { 'text-color': CREAM },
                });
                // Pins placed at the state level only (approximate) are hollow
                map.addLayer({
                    id: `points-${code}`, type: 'circle', source: src, filter: ['!', ['has', 'point_count']],
                    paint: {
                        'circle-color': ['case', ['==', ['get', 'a'], 1], CREAM, color],
                        'circle-radius': 7, 'circle-stroke-width': ['case', ['==', ['get', 'a'], 1], 3, 2],
                        'circle-stroke-color': ['case', ['==', ['get', 'a'], 1], color, CREAM],
                    },
                });
            }

            const popup = new maplibregl.Popup({ maxWidth: '300px', offset: 12 });

            // Company type pills above the map (<div class="map-filter" data-map="<id>">)
            const bar = document.querySelector(`.map-filter[data-map="${el.id}"]`);
            const countEl = document.getElementById('map-count');
            const allText = countEl?.textContent;
            if (bar) {
                const chips = [...bar.querySelectorAll('.fchip')];
                bar.addEventListener('click', (e) => {
                    const chip = e.target.closest('.fchip');
                    if (!chip) return;
                    const type = chip.dataset.value;
                    chips.forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
                    popup.remove();
                    for (const { code } of present) map.getSource(`brands-${code}`).setData(features(code, type));
                    if (countEl) {
                        const n = type ? points.filter((p) => (p.k || []).includes(type)).length : 0;
                        countEl.textContent = type ? `Showing ${n} of ${points.length} listings on the map: ${type.toLowerCase()}.` : allText;
                    }
                });
            }

            const clusterLayers = present.map((c) => `clusters-${c.code}`);
            const pointLayers = present.map((c) => `points-${c.code}`);

            map.on('click', clusterLayers, async (e) => {
                const f = e.features[0];
                const leaves = await map.getSource(f.source).getClusterLeaves(f.properties.cluster_id, f.properties.point_count, 0);
                const members = leaves.map((l) => points[l.properties.i]);
                const bounds = boundsOf(members);
                const span = Math.max(bounds.getNorth() - bounds.getSouth(), bounds.getEast() - bounds.getWest());
                if (span < 0.05 || map.getZoom() >= CLUSTER_MAX_ZOOM) {
                    // Everyone here is in the same town: list them rather than zooming forever
                    popup.setLngLat(f.geometry.coordinates).setHTML(popupHtml(members)).addTo(map);
                } else {
                    // One click jumps straight to the area those brands cover
                    map.fitBounds(bounds, { padding: 60, maxZoom: CLUSTER_MAX_ZOOM + 1 });
                }
            });

            map.on('click', pointLayers, (e) => {
                const list = e.features.map((f) => points[f.properties.i]);
                popup.setLngLat(e.features[0].geometry.coordinates).setHTML(popupHtml(list)).addTo(map);
            });

            for (const layer of [...clusterLayers, ...pointLayers]) {
                map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
                map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
            }
        });
    }

    // A key under maps that show both countries
    function legend(el) {
        let points = [];
        try { points = JSON.parse(el.dataset.points || '[]'); } catch (e) { return; }
        const present = COUNTRIES.filter((c) => points.some((p) => (p.c || 'US') === c.code));
        if (present.length < 2) return;
        const key = document.createElement('p');
        key.className = 'map-legend';
        key.innerHTML = present.map((c) => `<span><i style="background:${c.color}"></i>${c.name}</span>`).join('');
        el.after(key);
    }

    document.querySelectorAll('.map[data-points]').forEach((el) => { legend(el); init(el); });
})();
