// Builds the "On this page" list on text pages from the page's h2 headings,
// and opens an FAQ answer when the address points straight at it.
(function () {
    const list = document.querySelector('.toc ol');
    const heads = document.querySelectorAll('.prose h2');
    if (list && heads.length >= 3) {
        heads.forEach((h) => {
            if (!h.id) h.id = h.textContent.toLowerCase().replace(/^\d+\.\s*/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            const a = document.createElement('a');
            a.href = '#' + h.id;
            a.textContent = h.textContent;
            const li = document.createElement('li');
            li.append(a);
            list.append(li);
        });
    } else if (list) {
        list.closest('.toc-wrap').remove();
    }

    const openFromHash = () => {
        const target = location.hash && document.getElementById(decodeURIComponent(location.hash.slice(1)));
        if (target && target.tagName === 'DETAILS') target.open = true;
    };
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
})();
