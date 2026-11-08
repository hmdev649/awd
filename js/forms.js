// Shared handler for the Formspree forms (suggest, update, contact).
// - Pre-fills fields from the URL, e.g. /update/?brand=Halios
// - Builds a descriptive email subject from the form's data-subject template
// - Submits in the background and shows the success panel
(function () {
    const params = new URLSearchParams(location.search);

    document.querySelectorAll('form.js-form').forEach((form) => {
        for (const [key, value] of params) {
            const field = form.elements[key];
            const fillable = field instanceof HTMLInputElement ? !['hidden', 'checkbox', 'radio'].includes(field.type)
                : field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement;
            if (fillable && !key.startsWith('_') && !field.value) field.value = value;
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const button = form.querySelector('[type=submit]');
            const status = form.querySelector('.form-status');
            const data = new FormData(form);

            // "Brand suggestion: {brand}" -> "Brand suggestion: Fleux"
            const template = form.dataset.subject;
            if (template) data.set('_subject', template.replace(/\{(\w+)\}/g, (_, k) => data.get(k) || '').trim());

            button.disabled = true;
            const label = button.textContent;
            button.textContent = 'Sending…';
            if (status) status.textContent = '';

            try {
                const res = await fetch(form.action, { method: 'POST', body: data, headers: { Accept: 'application/json' } });
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                form.hidden = true;
                const done = document.getElementById(form.dataset.success);
                if (done) { done.hidden = false; done.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
            } catch (err) {
                console.error(err);
                if (status) status.textContent = 'Sorry, that didn’t send. Please try again, or message us on Instagram.';
                button.disabled = false;
                button.textContent = label;
            }
        });
    });
})();
