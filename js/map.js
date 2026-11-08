// Renders every <div class="map" data-points="[...]"> on the page with MapLibre.
// Map tiles: OpenFreeMap (free, no API key; data from OpenStreetMap).
(function () {
    if (!window.maplibregl) return;

    const STYLE = 'https://tiles.openfreemap.org/styles/positron';
    const NORTH_AMERICA = [[-125, 24.5], [-66.5, 50]]; // contiguous US + southern Canada
    const CLUSTER_MAX_ZOOM = 12;
    const INK = '#304047', CREAM = '#fbe9cd', GREY = '#8a9aa0';

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

            map.addSource('brands', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features: points.map((p, i) => ({
                        type: 'Feature',
                        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
                        properties: { i, a: p.a ? 1 : 0 },
                    })),
                },
                cluster: true,
                clusterRadius: 36,
                clusterMaxZoom: CLUSTER_MAX_ZOOM,
            });

            map.addLayer({
                id: 'clusters', type: 'circle', source: 'brands', filter: ['has', 'point_count'],
                paint: {
                    'circle-color': INK, 'circle-opacity': 0.92,
                    'circle-radius': ['step', ['get', 'point_count'], 14, 10, 18, 30, 23],
                    'circle-stroke-width': 3, 'circle-stroke-color': CREAM,
                },
            });
            map.addLayer({
                id: 'cluster-count', type: 'symbol', source: 'brands', filter: ['has', 'point_count'],
                layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 12, 'text-allow-overlap': true },
                paint: { 'text-color': CREAM },
            });
            map.addLayer({
                id: 'points', type: 'circle', source: 'brands', filter: ['!', ['has', 'point_count']],
                paint: {
                    'circle-color': ['case', ['==', ['get', 'a'], 1], GREY, INK],
                    'circle-radius': 7, 'circle-stroke-width': 2, 'circle-stroke-color': CREAM,
                },
            });

            const popup = new maplibregl.Popup({ maxWidth: '300px', offset: 12 });

            map.on('click', 'clusters', async (e) => {
                const f = e.features[0];
                const leaves = await map.getSource('brands').getClusterLeaves(f.properties.cluster_id, f.properties.point_count, 0);
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

            map.on('click', 'points', (e) => {
                const list = e.features.map((f) => points[f.properties.i]);
                popup.setLngLat(e.features[0].geometry.coordinates).setHTML(popupHtml(list)).addTo(map);
            });

            for (const layer of ['clusters', 'points']) {
                map.on('mouseenter', layer, () => { map.getCanvas().style.cursor = 'pointer'; });
                map.on('mouseleave', layer, () => { map.getCanvas().style.cursor = ''; });
            }
        });
    }

    document.querySelectorAll('.map[data-points]').forEach(init);
})();
