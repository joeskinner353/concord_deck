import { siteStructure } from '../data/siteStructure.js';

export class Navigation {
    constructor() {
        this.nav = document.getElementById('navigation');
        this.currentPath = [];
        this.init();
        this.zIndex = 900;  // Ensure navigation z-index is below preview
    }

    init() {
        this.nav.innerHTML = `
            <div class="nav-left">
                <div class="breadcrumbs-container">
                    <div class="breadcrumbs"></div>
                </div>
            </div>
        `;
        this.nav.style.zIndex = this.zIndex;

        this.breadcrumbs = this.nav.querySelector('.breadcrumbs');
        this.breadcrumbsContainer = this.nav.querySelector('.breadcrumbs-container');

        this.breadcrumbsContainer.addEventListener('mouseleave', () => {
            this.breadcrumbsContainer.classList.remove('visible');
        });

        window.addEventListener('navigationUpdate', (e) => {
            if (!e.detail || !e.detail.path) {
                console.error('Invalid navigation event:', e);
                return;
            }
            if (e.detail.reset) {
                this.currentPath = [];
            } else if (e.detail.path) {
                this.currentPath = e.detail.path;
            }
            this.updateBreadcrumbs(this.currentPath);
        });
    }

    updateBreadcrumbs(path) {
        this.breadcrumbs.innerHTML = path.length ? path.join(' > ') : '';
        this.breadcrumbsContainer.style.display = path.length ? 'block' : 'none';
    }
}

new Navigation(); 