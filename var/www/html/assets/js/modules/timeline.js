import { addTiltEffect } from './utils.js';

export class Timeline {
    constructor() {
        this.timelineContainer = document.querySelector('.timeline-container');
        this.timelineFilters = document.querySelector('.timeline-filters');
        this.sections = document.querySelectorAll('section');
        
        this.init();
    }

    init() {
        this.populateFilterButtons();
        this.renderTimelinePosts();
        this.handleArtistTimelineLinks();
        this.handleUrlParams();
    }

    async renderTimelinePosts(artist = 'Tous') {
        if (!this.timelineContainer) return;

        let allArtists = [];
        try {
            const artistsResponse = await fetch('api/get_artists.php');
            if (artistsResponse.ok) {
                allArtists = await artistsResponse.json();
                allArtists.sort((a, b) => b.length - a.length);
            }
        } catch (e) {
            console.error("Could not fetch artists for replacement", e);
        }

        const fetchURL = `./api/get_posts.php?artist=${encodeURIComponent(artist)}`;

        try {
            const response = await fetch(fetchURL, { cache: 'no-store' });
            if (!response.ok) throw new Error(`Erreur du serveur: ${response.statusText}`);
            let posts = await response.json();

            if (!Array.isArray(posts)) {
                console.error("Les données reçues ne sont pas un tableau:", posts);
                posts = [];
            }

            posts.sort((a, b) => new Date(a.date) - new Date(b.date));
            this.timelineContainer.innerHTML = '';

            if (posts.length === 0) {
                this.timelineContainer.innerHTML = '<p style="text-align: center; color: white;">Aucun post sur la timeline pour le moment.</p>';
                return;
            }

            posts.forEach((post, index) => {
                const timelineItem = document.createElement('div');
                timelineItem.classList.add('timeline-item');

                const contentDiv = document.createElement('div');
                contentDiv.classList.add('timeline-content');
                contentDiv.classList.add(index % 2 === 0 ? 'timeline-content-left' : 'timeline-content-right');

                let displayTitle = post.title;
                let displaySubtitle = post.subtitle;

                if (allArtists.length > 0) {
                    for (const artistName of allArtists) {
                        const artistRegex = new RegExp(artistName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'), 'gi');
                        if (displayTitle) {
                            displayTitle = displayTitle.replace(artistRegex, artistName.toUpperCase());
                        }
                        if (displaySubtitle) {
                            displaySubtitle = displaySubtitle.replace(artistRegex, artistName.toUpperCase());
                        }
                    }
                }

                const isArtistTitle = allArtists.some(artist => artist.toLowerCase() === post.title.toLowerCase());

                const titleElement = `<h3 class="${isArtistTitle ? 'artist-title' : ''}">${displayTitle}</h3>`;

                const subtitleElement = post.link && displaySubtitle
                    ? `<h4><a href="${post.link}" target="_blank" rel="noopener noreferrer" class="timeline-subtitle-link">${displaySubtitle}</a></h4>`
                    : displaySubtitle
                        ? `<h4>${displaySubtitle}</h4>`
                        : '';

                const imageElement = post.image
                    ? (post.link
                        ? `<a href="${post.link}" target="_blank" rel="noopener noreferrer" class="timeline-image-link"><img src="${post.image}" alt="${post.title}" class="timeline-image"></a>`
                        : `<img src="${post.image}" alt="${post.title}" class="timeline-image">`)
                    : '';

                contentDiv.innerHTML = `
          ${titleElement}
          ${subtitleElement}
          ${imageElement}
          <span class="timeline-date">${new Date(post.date).toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
        `;

                addTiltEffect(contentDiv);

                timelineItem.appendChild(contentDiv);
                this.timelineContainer.appendChild(timelineItem);
            });

        } catch (error) {
            console.error('Impossible de charger la timeline:', error);
            this.timelineContainer.innerHTML = '<p style="text-align: center; color: red;">Erreur: Impossible de charger la timeline.</p>';
        }
    }

    async populateFilterButtons() {
        if (!this.timelineFilters) return;

        try {
            const response = await fetch('api/get_artists.php');
            if (!response.ok) {
                throw new Error('Could not fetch artists');
            }
            const artists = await response.json();

            this.timelineFilters.innerHTML = '';

            const allButton = document.createElement('button');
            allButton.className = 'btn filter-btn active';
            allButton.dataset.artist = 'Tous';
            allButton.textContent = 'Tous';
            this.timelineFilters.appendChild(allButton);

            artists.forEach(artist => {
                const button = document.createElement('button');
                button.className = 'btn filter-btn';
                button.dataset.artist = artist;
                button.textContent = artist;
                this.timelineFilters.appendChild(button);
            });

            const filterButtons = document.querySelectorAll('.filter-btn');
            filterButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const artist = button.dataset.artist;

                    filterButtons.forEach(btn => btn.classList.remove('active'));
                    button.classList.add('active');

                    this.renderTimelinePosts(artist);
                });
            });

        } catch (error) {
            console.error('Failed to populate filter buttons:', error);
            this.timelineFilters.innerHTML = '<p style="color: red;">Erreur de chargement des filtres.</p>';
        }
    }

    handleArtistTimelineLinks() {
        const artistTimelineButtons = document.querySelectorAll('.artiste .btn[data-artist]');
        artistTimelineButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const artist = button.dataset.artist;
                const filterButton = document.querySelector(`.filter-btn[data-artist="${artist}"]`);
                if (filterButton) {
                    filterButton.click();
                }

                const timelineIndex = Array.from(this.sections).findIndex(s => s.id === 'timeline');
                if (timelineIndex !== -1) {
                    window.dispatchEvent(new CustomEvent('requestNavigation', { detail: { index: timelineIndex } }));
                }
            });
        });
    }

    handleUrlParams() {
        const urlParams = new URLSearchParams(window.location.search);
        const artistParam = urlParams.get('artist');
        if (artistParam) {
            setTimeout(() => {
                const filterButton = document.querySelector(`.filter-btn[data-artist="${artistParam}"]`);
                if (filterButton) {
                    filterButton.click();
                    document.querySelector('#timeline').scrollIntoView({ behavior: 'smooth' });
                }
            }, 500);
        }
    }
}
