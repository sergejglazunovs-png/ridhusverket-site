// Ridhusverket CMS - Supabase client
const SUPABASE_URL = 'https://xxbvgzixdaatjygvnbfe.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh4YnZneml4ZGFhdGp5Z3ZuYmZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcxMDkxODYsImV4cCI6MjA5MjY4NTE4Nn0._HvDLpdDqpcpvX5OpIsvR7eBWi_a2M_mhsbCRJSVE1w';

const CMS = {
  headers: {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json'
  },

  async fetchJSON(endpoint) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${endpoint}`, { headers: this.headers });
    return res.json();
  },

  async getSections(page) {
    return this.fetchJSON(`ridhusverket_sections?page=eq.${page}&order=sort_order`);
  },

  async getListItems(sectionId) {
    return this.fetchJSON(`ridhusverket_list_items?section_id=eq.${sectionId}&order=sort_order`);
  },

  async getGallery(page) {
    return this.fetchJSON(`ridhusverket_gallery?page=eq.${page}&order=sort_order`);
  },

  async getSettings() {
    const rows = await this.fetchJSON('ridhusverket_settings');
    const settings = {};
    rows.forEach(r => settings[r.key] = r.value);
    return settings;
  },

  // Apply CMS content to the page
  async render(page) {
    try {
      const [sections, gallery, settings] = await Promise.all([
        this.getSections(page),
        this.getGallery(page),
        this.getSettings()
      ]);

      // Get list items for all sections
      const listItemsMap = {};
      await Promise.all(sections.map(async (s) => {
        listItemsMap[s.section_key] = await this.getListItems(s.id);
      }));

      // Apply sections
      for (const section of sections) {
        const el = document.querySelector(`[data-cms="${section.section_key}"]`);
        if (!el) continue;

        const h = el.querySelector('[data-cms-heading]');
        const sub = el.querySelector('[data-cms-subheading]');
        const body = el.querySelector('[data-cms-body]');
        const img = el.querySelector('[data-cms-image]');

        if (h && section.heading) h.textContent = section.heading;
        if (sub && section.subheading) sub.textContent = section.subheading;
        if (body && section.body) body.innerHTML = section.body;
        if (img && section.image_url) {
          if (img.tagName === 'IMG') {
            img.src = section.image_url;
          } else if (img.tagName === 'VIDEO') {
            // Don't overwrite <video src> with an image URL — it kills playback.
            // Update the poster instead so the still frame matches the CMS image.
            img.poster = section.image_url;
          }
        }

        // Apply list items
        const listContainer = el.querySelector('[data-cms-list]');
        if (listContainer && listItemsMap[section.section_key]?.length) {
          const items = listItemsMap[section.section_key];
          const template = listContainer.dataset.cmsListTemplate;

          if (template === 'ul') {
            listContainer.innerHTML = items.map(item =>
              `<li>${item.body}</li>`
            ).join('');
          } else if (template === 'process') {
            listContainer.innerHTML = items.map(item =>
              `<div class="process-step"><h4>${item.title || ''}</h4><p>${item.body || ''}</p></div>`
            ).join('');
          } else if (template === 'features') {
            // Keep existing HTML structure for features with icons
          } else if (template === 'portar') {
            listContainer.innerHTML = items.map(item =>
              `<li><strong>${item.title}</strong> – ${item.body}</li>`
            ).join('');
          }
        }
      }

      // Apply gallery
      const galleryEl = document.querySelector('[data-cms-gallery]');
      if (galleryEl && gallery.length) {
        galleryEl.innerHTML = gallery.map(img =>
          `<div class="gallery-item"><img src="${img.image_url}" alt="${img.alt_text || ''}" loading="lazy"></div>`
        ).join('');
      }

      // Apply settings
      document.querySelectorAll('[data-cms-setting]').forEach(el => {
        const key = el.dataset.cmsSetting;
        if (settings[key]) {
          if (el.tagName === 'A') {
            el.textContent = settings[key];
            if (key === 'phone') el.href = `tel:${settings[key].replace(/\s/g, '')}`;
            if (key === 'email') el.href = `mailto:${settings[key]}`;
          } else {
            el.textContent = settings[key];
          }
        }
      });

    } catch (err) {
      console.log('CMS fetch failed, using static content:', err);
      // Site still works with hardcoded content as fallback
    }
  }
};
