import { siteStructure } from '../data/siteStructure.js';

const DEBUG = true;

function log(...args) {
    if (DEBUG) {
        console.log(...args);
    }
}

export class ZoomableSection {
    constructor() {
        // Add detailed debug logging for siteStructure
        console.log('siteStructure object:', siteStructure);
        console.log('catalogue sections:', siteStructure?.catalogue?.sections);
        console.log('pusher section:', siteStructure?.catalogue?.sections?.pusher);

        this.composerImages = {
            composer1: {
                path: '/assets/maestro.png',
                title: 'Maestro'
            },
            composer2: {
                path: '/assets/kurisu.png',
                title: 'Kurisu'
            }
        };
        this.container = document.getElementById('zoom-container');
        this.sections = document.querySelectorAll('.section');
        this.currentZoom = null;
        this.contentContainer = this.createContentContainer();
        this.previewOverlay = null;

        // Create and position background overlay
        this.backgroundOverlay = document.createElement('div');
        this.backgroundOverlay.className = 'background-overlay';
        document.body.insertBefore(this.backgroundOverlay, document.body.firstChild);
        
        console.log('siteStructure loaded:', siteStructure);
        
        // Bind all methods first
        this.handleScroll = this.handleScroll.bind(this);
        this.handleResize = this.handleResize.bind(this);
        this.handleTouchStart = this.handleTouchStart.bind(this);
        this.handleTouchEnd = this.handleTouchEnd.bind(this);
        
        // Initialize
        this.init();
        this.initBackgroundEffects();
        this.setupPreviews();

        // Add all event listeners
        window.addEventListener('scroll', this.handleScroll);
        window.addEventListener('resize', this.handleResize);
        window.addEventListener('unload', () => {
            if (this.previewOverlay) {
                this.previewOverlay.remove();
            }
        });
        
        // Add touch events
        this.container.addEventListener('touchstart', this.handleTouchStart);
        this.container.addEventListener('touchend', this.handleTouchEnd);
    }

    setupPreviews() {
        // Use event delegation for previews
        this.container.addEventListener('mouseover', (e) => {
            const item = e.target.closest('.list-item, .catalogue-list-item, .ftv-list-item');
            if (item) {
                const preview = item.querySelector('.preview-content');
                if (preview) {
                    // Position the preview to the right of the item
                    const rect = item.getBoundingClientRect();
                    preview.style.left = `${rect.width + 20}px`; // 20px gap
                    preview.style.top = '0';
                    
                    // Show the preview
                    preview.classList.add('active');
                }
            }
        });

        this.container.addEventListener('mouseout', (e) => {
            const item = e.target.closest('.list-item, .catalogue-list-item, .ftv-list-item');
            if (item) {
                const preview = item.querySelector('.preview-content');
                if (preview) {
                    preview.classList.remove('active');
                }
            }
        });
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    createContentContainer() {
        const container = document.createElement('div');
        container.id = 'content-container';
        container.style.display = 'none';
        container.style.opacity = '0';
        document.getElementById('app').appendChild(container);
        return container;
    }

    init() {
        console.log('Initializing ZoomableSection');
        if (!this.container) {
            console.error('Zoom container not found');
            return;
        }

        // Add click handler to the container
        this.container.addEventListener('click', (e) => {
            const clickable = e.target.closest([
                '.catalogue-list-item',
                '.list-item',
                '.ftv-list-item'
            ].join(','));
            
            if (clickable) {
                e.preventDefault();
                e.stopPropagation();
                
                // Get section ID from data attributes
                const sectionId = clickable.dataset.section || clickable.dataset.composer;
                if (!sectionId) return;

                // For catalogue items, redirect to external URL
                if (clickable.classList.contains('catalogue-list-item')) {
                    const section = siteStructure.catalogue.sections[sectionId];
                    if (section && section.websiteUrl && section.websiteUrl !== '#') {
                        window.open(section.websiteUrl, '_blank');
                    }
                    return;
                }

                // Handle other sections (bespoke, ftv) as before
                const parentSection = clickable.closest('.section');
                if (!parentSection) return;

                if (parentSection.id === 'bespoke') {
                    const section = siteStructure.bespoke.sections[sectionId];
                    if (section) {
                        this.showContent(section, this.bespokeTemplate.bind(this));
                        this.updateNavigation('Bespoke', section.title);
                    }
                } else if (parentSection.id === 'ftv') {
                    const section = siteStructure.ftv.sections[sectionId];
                    if (section) {
                        this.showFTVContent(section);
                        this.updateNavigation('FTV', section.title);
                    }
                }
            }
        });

        // Handle back navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.resetZoom();
        });

        window.addEventListener('navigationBack', () => this.handleBackNavigation());

        // Add home link handler
        document.querySelector('.home-link')?.addEventListener('click', (e) => {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('navigationBack'));
        });
    }

    showPreview(element) {
        const preview = element.querySelector('.preview-content');
        if (preview) {
            preview.style.opacity = '1';
            preview.style.visibility = 'visible';
        }
    }

    hidePreview() {
        document.querySelectorAll('.preview-content').forEach(preview => {
            preview.style.opacity = '0';
            preview.style.visibility = 'hidden';
        });
    }

    generatePreviewContent(element) {
        const sectionId = element.dataset.section || element.dataset.composer;
        let section;
        
        // Handle different section types
        if (element.classList.contains('catalogue-list-item')) {
            section = siteStructure.catalogue.sections[sectionId];
        } else if (element.classList.contains('ftv-list-item')) {
            section = siteStructure.ftv.sections[sectionId];
        } else {
            section = this.findSectionData(sectionId);
        }
        
        if (!section) return null;

        console.log('Generating preview for:', {
            element,
            sectionId,
            section
        });

        // Generate preview based on section type
        if (element.classList.contains('catalogue-list-item')) {
            const logoPath = section.logoPath || null;

            return `
                <div class="preview-content-inner catalogue-preview">
                    ${logoPath ? `
                        <div class="preview-logo">
                            <img src="${logoPath}" alt="${section.title}" class="catalogue-preview-logo">
                        </div>
                    ` : ''}
                    <div class="preview-info">
                        <h2>${section.title}</h2>
                        <p>${section.description ? section.description.substring(0, 200) + '...' : ''}</p>
                    </div>
                </div>
            `;
        } else if (element.classList.contains('ftv-list-item')) {
            return `
                <div class="preview-content-inner ftv-preview">
                    <div class="preview-info">
                        <h2>${section.title}</h2>
                        <p>${section.description || section.content ? (section.description || section.content).substring(0, 200) + '...' : ''}</p>
                    </div>
                </div>
            `;
        } else if (element.classList.contains('list-item')) {
            const imageHtml = section.image ? `
                <div class="composer-thumbnail">
                    <img src="${section.image}" 
                         alt="${section.title}"
                         onerror="this.src='./assets/placeholder.png'">
                </div>
            ` : '';

            return `
                <div class="preview-content-inner composer-preview">
                    ${imageHtml}
                    <div class="preview-info">
                        <h2>${section.title}</h2>
                        <p>${section.bio ? section.bio.substring(0, 200) + '...' : ''}</p>
                    </div>
                </div>
            `;
        }

        return null;
    }

    // Helper method for transitions
    async transition(showElement, hideElement) {
        hideElement.style.opacity = '0';
        await new Promise(resolve => setTimeout(resolve, 300));
        hideElement.style.display = 'none';
        showElement.style.display = 'block';
        await new Promise(resolve => requestAnimationFrame(resolve));
        showElement.style.opacity = '1';
    }

    // Helper method for navigation updates
    updateNavigation(parentTitle, sectionTitle) {
        // For catalogue sections, we only want to show the parent title
        if (parentTitle === 'Catalogue') {
            window.dispatchEvent(new CustomEvent('navigationUpdate', {
                detail: { path: [parentTitle] }
            }));
            return;
        }

        window.dispatchEvent(new CustomEvent('navigationUpdate', {
            detail: { path: sectionTitle ? [parentTitle, sectionTitle] : [parentTitle] }
        }));
    }

    // Content display methods
    showContent(section, template) {
        console.log('showContent called for:', section.title);
        
        // Hide the main container
        this.container.style.opacity = '0';
        this.container.style.display = 'none';
        
        // Reset and prepare content container
        this.contentContainer.style.display = 'block';
        this.contentContainer.style.opacity = '0';
        this.contentContainer.className = 'content-container';
        
        // Clear any existing content
        this.contentContainer.innerHTML = '';
        
        // Set background color only for composer pages
        if (section.title.includes('MAESTRO') || section.title === 'Kurisu' || section.title === 'James Greenwood' || section.title === 'Ben Garrett') {
            document.body.style.backgroundColor = '#F4A460';
            this.contentContainer.style.padding = '0';
            this.contentContainer.style.backgroundColor = '#F4A460';
        }
        
        // Add the content
        const renderedTemplate = template(section);
        this.contentContainer.innerHTML = renderedTemplate;

        // Add video click handlers
        const videoCards = this.contentContainer.querySelectorAll('.video-card');
        videoCards.forEach(card => {
            card.addEventListener('click', () => {
                const videoData = JSON.parse(card.dataset.video);
                this.handleVideoClick(videoData);
            });
        });

        // Add back button handler
        const backButton = this.contentContainer.querySelector('.back-button');
        if (backButton) {
        backButton.addEventListener('click', (e) => {
            e.preventDefault();
                // Reset background color when going back
                document.body.style.backgroundColor = '';
            window.dispatchEvent(new CustomEvent('navigationBack'));
        });
    }

        // Show the content with animation
        requestAnimationFrame(() => {
            this.contentContainer.style.opacity = '1';
        });
    }

    // Template methods
    bespokeTemplate(section) {
        return `
            <button class="back-button">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="black" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
            <div class="maestro-new">
                <div class="maestro-content">
                    <div class="maestro-left">
                        <h1>${section.title}</h1>
                        <div class="social-links-container">
                            <div class="social-links">
                                ${section.social.instagram ? `
                                    <a href="${section.social.instagram}" target="_blank">
                                        <img src="../assets/instagram-black.svg" alt="Instagram">
                                    </a>
                                ` : ''}
                                ${section.social.spotify ? `
                                    <a href="${section.social.spotify}" target="_blank">
                                        <img src="../assets/Spotify-Icon-Black-Logo.wine.svg" alt="Spotify">
                                    </a>
                                ` : ''}
                                ${section.social.tiktok ? `
                                    <a href="${section.social.tiktok}" target="_blank">
                                        <img src="../assets/tiktok.svg" alt="TikTok">
                                    </a>
                                ` : ''}
                    </div>
                            <button class="download-button">
                                <img src="../assets/download-black.svg" alt="Download">
                                Download One-Sheet
                            </button>
                            ${section.social.website ? `
                                <a href="https://${section.social.website.toLowerCase()}" class="website-link" target="_blank">
                                    ${section.social.website}
                                </a>
                            ` : ''}
                        </div>
                        <img src="../assets/${section.image}" alt="${section.title}">
                        </div>
                    <div class="maestro-right">
                    <div class="bio-section">
                            ${section.bio.split('\n\n').map(paragraph => `<p>${paragraph}</p>`).join('')}
                    </div>

                        ${section.compositionWork ? `
                            <div class="composition-section">
                                <h2>${section.compositionWork.title}</h2>
                                <p>${section.compositionWork.description}</p>
                                ${section.compositionWork.recentWork ? `<p>${section.compositionWork.recentWork}</p>` : ''}
                            </div>
                        ` : ''}

                    ${section.videos && section.videos.length > 0 ? `
                        <div class="videos-section">
                                <h2>VIDEOS</h2>
                            <div class="video-grid">
                                ${section.videos.map(video => `
                                    <div class="video-card" data-video='${JSON.stringify(video)}'>
                                            <div class="video-thumbnail">
                                        <img src="${video.thumbnail}" alt="${video.title}">
                                        <div class="play-button">▶</div>
                                            </div>
                                        <h3>${video.title}</h3>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    </div>
                </div>
            </div>
        `;
    }

    handleSectionClick(section) {
        if (this.currentZoom) {
            this.resetZoom();
            return;
        }

        // Do nothing when clicking main sections
        return;
    }

    handleSubsectionClick(element) {
        console.log('handleSubsectionClick called with element:', element);
        if (!element) {
            console.error('No element provided to handleSubsectionClick');
            return;
        }
        
        // Get the section ID from either data-section or data-composer
        const sectionId = element.dataset.section || element.dataset.composer;
        console.log('Section ID:', sectionId);
        
        if (!sectionId) {
            console.error('No section ID found on element:', element);
            return;
        }

        // Get the parent section and title
        const parentSection = element.closest('.section');
        const parentTitle = parentSection?.querySelector('h2')?.textContent || '';

        // Handle different section types
        if (parentSection.id === 'catalogue' || element.classList.contains('catalogue-card') || element.classList.contains('catalogue-list-item')) {
            const section = siteStructure.catalogue.sections[sectionId];
            if (section) {
                this.showCatalogueContent(section);
                this.updateNavigation('Catalogue', section.title);
            }
            return;
        }

        // Handle composer sections
        const section = siteStructure.bespoke.sections[sectionId];
        console.log('Found section data:', section);

        if (!section) {
            console.error('No section data found for section ID:', sectionId);
            return;
        }

        // Show the content
        console.log('Showing content for section:', section.title);
                this.showContent(section, this.bespokeTemplate.bind(this));
        
        // Update navigation
        this.updateNavigation(parentTitle || 'Bespoke', section.title);
    }

    showSubsectionContent(sectionId) {
        try {
            const section = this.findSectionData(sectionId);
            console.log('Section:', section);
            console.log('Productions:', section.productions); // Specific log for productions
            
            const template = document.getElementById('composer-profile');
            console.log('Template found:', !!template); // Check if template exists
            
            let content = template.innerHTML;
            console.log('Initial template content:', content);
            
            // Replace all template variables
            const replacements = {
                '${composer.title}': section.title,
                '${composer.image}': section.image,
                '${composer.bio}': section.bio,
                '${composer.social.instagram}': section.social.instagram,
                '${composer.social.spotify}': section.social.spotify,
                '${composer.social.tiktok}': section.social.tiktok,
                '${composer.productions}': section.productions || '',
                '${composer.videos}': this.generateVideoGrid(section.videos)
            };
            console.log('Replacements:', replacements);
            
            console.log('Template HTML:', template.innerHTML); // Check template structure
            console.log('Final content:', content); // Check final rendered content

            // Apply all replacements
            Object.entries(replacements).forEach(([key, value]) => {
                content = content.replaceAll(key, value);
            });

            this.contentContainer.innerHTML = `
                <button class="back-button">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                    </svg>
                </button>
                ${content}
            `;

            // Add video click handlers
            const videoElements = this.contentContainer.querySelectorAll('.video-preview');
            console.log('Found video elements:', videoElements.length);
            
            videoElements.forEach(preview => {
                preview.addEventListener('click', () => {
                    console.log('Video clicked:', preview.dataset);
                    const videoId = preview.dataset.videoId;
                    const videoType = preview.dataset.videoType;
                    
                    const iframe = document.createElement('iframe');
                    iframe.style.position = 'absolute';
                    iframe.style.top = '0';
                    iframe.style.left = '0';
                    iframe.style.width = '100%';
                    iframe.style.height = '100%';
                    iframe.style.border = 'none';
                    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
                    iframe.allowFullscreen = true;
                    
                    if (videoType === 'youtube') {
                        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
                    } else if (videoType === 'vimeo') {
                        iframe.src = `https://player.vimeo.com/video/${videoId}?autoplay=1&title=0&byline=0&portrait=0`;
                    }
                    
                    const container = preview.querySelector('.thumbnail-container');
                    container.innerHTML = '';
                    container.appendChild(iframe);
                });
            });
            
            // Add back button handler
            this.contentContainer.querySelector('.back-button').addEventListener('click', () => {
                this.handleBackNavigation();
                window.dispatchEvent(new CustomEvent('navigationUpdate', {
                    detail: { path: ['Bespoke Roster'] }
                }));
            });

            // Show the content
            this.contentContainer.style.display = 'block';
            setTimeout(() => {
                this.contentContainer.style.opacity = '1';
            }, 50);
            
        } catch (error) {
            console.error('Error:', error);
            this.showErrorMessage();
        }
    }

    generateSocialLinks(section) {
        return Object.entries(section.social)
            .map(([platform, url]) => `
                <a href="${url}" class="social-link ${platform}" target="_blank">
                    <img src="../assets/${platform}-black.png" alt="${platform}">
                </a>
            `)
            .join('');
    }

    generateVideoGrid(videos) {
        if (!videos || videos.length === 0) {
            console.log('No videos found or empty array');
            return '';
        }
        
        console.log('Generating video grid for videos:', videos);
        
        const videoElements = videos.map((video, index) => {
            console.log('Creating element for video:', video);
            return `
                <div class="video-preview" data-video-id="${video.id}" data-video-type="${video.type}" style="opacity: 1; visibility: visible;">
                    <div class="thumbnail-container" style="opacity: 1; visibility: visible;">
                        <img src="${video.thumbnail}" alt="${video.title}" class="video-thumbnail" style="opacity: 1; visibility: visible;">
                        <div class="play-button">▶</div>
                    </div>
                    <h4>${video.title}</h4>
                </div>
            `;
        }).join('');

        console.log('Generated video elements:', videoElements);

        return `
            <div class="composer-section" style="opacity: 1; visibility: visible;">
                <h3>Videos</h3>
                <div class="video-grid" style="opacity: 1; visibility: visible;">
                    ${videoElements}
                </div>
            </div>
        `;
    }

    renderComposerProfile(composer) {
        const template = document.getElementById('composer-profile');
        const content = template.innerHTML
            .replace('${composer.title}', composer.title)
            .replace('${composer.image}', composer.image)
            .replace('${composer.bio}', composer.bio)
            .replace('${composer.social.instagram}', composer.social.instagram)
            .replace('${composer.social.spotify}', composer.social.spotify)
            .replace('${composer.social.tiktok}', composer.social.tiktok)
            .replace('${composer.productions}', composer.productions || '')
            .replace('${composer.videos.map(video => `', this.generateVideoGrid(composer.videos));
        
        return content;
    }

    findSectionData(sectionId) {
        console.log('Finding section data for:', sectionId);
        
        // Check if it's a composer section
        if (sectionId.startsWith('composer')) {
            const section = siteStructure.bespoke.sections[sectionId];
            console.log('Found composer section:', section);
            return section;
        }
        
        // Check catalogue sections
        if (siteStructure.catalogue.sections[sectionId]) {
            return siteStructure.catalogue.sections[sectionId];
        }
        
        // Check FTV sections
        if (siteStructure.ftv.sections[sectionId]) {
            return siteStructure.ftv.sections[sectionId];
        }
        
        return null;
    }

    handleBackNavigation() {
        if (this.contentContainer.style.display === 'block') {
            // First, fade out the content container
            this.contentContainer.style.opacity = '0';
            
            // Reset ALL background colors
            document.body.style.backgroundColor = '#1a1a1a'; // Use actual color value instead of CSS variable
            this.contentContainer.style.backgroundColor = '';
            this.container.style.backgroundColor = '';
            
            // After fade out, switch displays and fade in the main container
            requestAnimationFrame(() => {
                this.contentContainer.style.display = 'none';
                this.container.style.display = 'grid';
                
                requestAnimationFrame(() => {
                    this.container.style.opacity = '1';
                });
            });
        } else {
            // Return from section zoom
            this.resetZoom();
        }
    }

    resetZoom() {
        this.container.style.transform = 'none';
        if (this.currentZoom) {
            this.currentZoom.classList.remove('active');
            this.currentZoom = null;
            // Show all sections again
            document.querySelectorAll('.section').forEach(section => {
                section.style.opacity = '1';
            });
        }
        this.updateNavigation(null, null);
    }

    handleCatalogueClick(element) {
        console.log('handleCatalogueClick:', {
            element,
            sectionId: element.dataset.section,
            sectionTitle: element.querySelector('h3')?.textContent || element.textContent
        });

        const sectionId = element.dataset.section;
        const sectionTitle = element.querySelector('h3')?.textContent || element.textContent;
        const parentSection = element.closest('.section');
        const parentTitle = parentSection.querySelector('h2').textContent;

        // Get content directly from catalogue sections
        const section = siteStructure.catalogue.sections[sectionId];
        console.log('Found catalogue section:', section);

        if (!section) {
            console.error(`Catalogue section ${sectionId} not found`);
            return;
        }

        // Update navigation
        this.updateNavigation(parentTitle, sectionTitle);

        // Show catalogue content
        this.showCatalogueContent(section);
    }

    showCatalogueContent(section) {
        console.log('Showing catalogue content for:', section.title);
        
        // Hide the main container and background logo
        this.container.style.opacity = '0';
        this.container.style.display = 'none';
        document.querySelector('.background-overlay').style.display = 'none';
        
        // Reset and prepare content container
        this.contentContainer.style.display = 'block';
        this.contentContainer.style.opacity = '0';
        this.contentContainer.className = 'content-container catalogue-view';
        
        // Clear any existing content
        this.contentContainer.innerHTML = '';
        
        // Create catalogue content template
        const template = `
            <button class="back-button">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
            <div class="catalogue-content">
                <div class="catalogue-header">
                    <div class="header-left">
                        <img src="${section.logoPath}" alt="${section.title}" class="catalogue-logo">
                        <h2>${section.title}</h2>
                    </div>
                    <div class="header-right">
                        ${section.social?.instagram ? `
                            <a href="${section.social.instagram}" class="social-link instagram" target="_blank">
                                <img src="../assets/instagram-black.png" alt="Instagram">
                            </a>
                        ` : ''}
                        <a href="${section.discoSearchUrl}" class="search-link" target="_blank">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"/>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                            Search Catalogue
                    </a>
                </div>
                </div>
                
                <div class="catalogue-description">
                        <p>${section.description}</p>
                    </div>
                
                <div class="catalogue-playlist">
                            ${section.discoPlaylistEmbed}
                </div>
            </div>
        `;
        
        this.contentContainer.innerHTML = template;

        // Add back button handler
        const backButton = this.contentContainer.querySelector('.back-button');
        if (backButton) {
        backButton.addEventListener('click', (e) => {
            e.preventDefault();
                // Show background logo again when going back
                document.querySelector('.background-overlay').style.display = 'block';
            window.dispatchEvent(new CustomEvent('navigationBack'));
        });
        }

        // Show with animation
        requestAnimationFrame(() => {
            this.contentContainer.style.opacity = '1';
        });
    }

    handleFTVClick(element) {
        console.log('handleFTVClick:', {
            element,
            sectionId: element.dataset.section,
            sectionTitle: element.querySelector('h3')?.textContent || element.textContent
        });

        const sectionId = element.dataset.section;
        const sectionTitle = element.querySelector('h3')?.textContent || element.textContent;
        const parentSection = element.closest('.section');
        const parentTitle = parentSection.querySelector('h2').textContent;

        // Get content directly from FTV sections
        const section = siteStructure.ftv.sections[sectionId];
        console.log('Found FTV section:', section);
        if (!section) {
            console.error('Section not found:', {
                sectionId,
                sectionTitle,
                parentTitle
            });
            return;
        }

        // Update navigation
        this.updateNavigation(parentTitle, sectionTitle);

        // Show FTV content
        this.showFTVContent(section);
    }

    showFTVContent(section) {
        // Hide the main container and background
        this.container.style.opacity = '0';
        this.container.style.display = 'none';
        document.querySelector('.background-overlay').style.display = 'none';
        
        // Reset and prepare content container
        this.contentContainer.style.display = 'block';
        this.contentContainer.style.opacity = '0';
        this.contentContainer.className = 'content-container ftv-view clean-background';
        
        // Create FTV content template
        const template = `
            <header class="main-header" role="banner">
                <div class="header-left">
                    <a href="#" class="home-link" aria-label="Home">
                        <img src="./assets/concord-C-icon-red.png" alt="Concord Logo" class="header-logo">
                    </a>
               </div>
                <div class="header-center">
                    <h1>concord <span>music publishing</span></h1>
                </div>
            </header>
            <button class="back-button">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
            <div class="content-section main-description">
                <p>${section.description}</p>
            </div>
        `;
        
        this.contentContainer.innerHTML = template;

        // Add back button handler
        const backButton = this.contentContainer.querySelector('.back-button');
        backButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('navigationBack'));
            this.hideContent();
            this.container.style.display = 'grid';
            requestAnimationFrame(() => {
                this.container.style.opacity = '1';
            });
        });

        // Show content with animation
        requestAnimationFrame(() => {
            this.contentContainer.style.opacity = '1';
        });
    }

    initBackgroundEffects() {
        console.log('Initializing background effects');
        // Update selector to include all list items
        const items = document.querySelectorAll('.catalogue-list-item, .list-item, .ftv-list-item');
        
        // Create background overlay if it doesn't exist
        if (!this.backgroundOverlay) {
            this.backgroundOverlay = document.createElement('div');
            this.backgroundOverlay.className = 'background-overlay';
            document.body.appendChild(this.backgroundOverlay);
        }
        
        items.forEach(item => {
            item.addEventListener('mouseenter', (e) => {
                console.log('Mouse enter:', item.dataset);
                const sectionId = item.dataset.section || item.dataset.composer;
                console.log('Looking for section:', sectionId);
                console.log('Available sections:', Object.keys(siteStructure.catalogue.sections));
                let section;
                
                if (item.classList.contains('catalogue-list-item')) {
                    section = siteStructure.catalogue.sections[sectionId];
                    console.log('Found catalogue section:', section);
                    
                    if (section) {
                        // Use the logoPath directly from the section
                        const imagePath = section.logoPath;
                        console.log('Setting logo background with path:', imagePath);
                        console.log('Current background image:', this.backgroundOverlay.style.backgroundImage);
                        
                        // Create a temporary image to check loading
                        const tempImg = new Image();
                        tempImg.onload = () => {
                            console.log('Image loaded successfully:', imagePath);
                            console.log('Image natural dimensions:', tempImg.naturalWidth, 'x', tempImg.naturalHeight);
                            
                            // Ensure the path starts with /assets/
                            const normalizedPath = imagePath.startsWith('/') ? imagePath : `/assets/${imagePath.split('/').pop()}`;
                            const bgImage = `url("${normalizedPath}")`;
                            console.log('Setting background image to:', bgImage);
                            
                            this.backgroundOverlay.style.backgroundImage = bgImage;
                            // Use different sizing for Pusher vs other sections
                            if (normalizedPath.includes('pusher.png')) {
                                console.log('Applying Pusher-specific styles');
                                this.backgroundOverlay.style.backgroundSize = '300px auto';
                                this.backgroundOverlay.style.opacity = '0.3';
                                this.backgroundOverlay.style.filter = 'brightness(2.5) contrast(1.4)';
                                this.backgroundOverlay.style.mixBlendMode = 'screen';
                                this.backgroundOverlay.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
                            } else {
                                this.backgroundOverlay.style.backgroundSize = 'contain';
                                this.backgroundOverlay.style.opacity = '0.15';
                                this.backgroundOverlay.style.filter = 'none';
                                this.backgroundOverlay.style.mixBlendMode = 'normal';
                                this.backgroundOverlay.style.backgroundColor = 'transparent';
                            }
                            this.backgroundOverlay.style.backgroundRepeat = 'no-repeat';
                            this.backgroundOverlay.style.backgroundPosition = 'center';
                            this.backgroundOverlay.classList.add('visible');
                            
                            // Force a reflow to ensure styles are applied
                            void this.backgroundOverlay.offsetHeight;
                            
                            // Verify the styles were applied
                            console.log('Applied styles:', {
                                backgroundImage: this.backgroundOverlay.style.backgroundImage,
                                backgroundSize: this.backgroundOverlay.style.backgroundSize,
                                opacity: this.backgroundOverlay.style.opacity,
                                filter: this.backgroundOverlay.style.filter,
                                mixBlendMode: this.backgroundOverlay.style.mixBlendMode,
                                backgroundColor: this.backgroundOverlay.style.backgroundColor,
                                visibility: this.backgroundOverlay.classList.contains('visible'),
                                computedBackgroundImage: window.getComputedStyle(this.backgroundOverlay).backgroundImage,
                                computedOpacity: window.getComputedStyle(this.backgroundOverlay).opacity,
                                computedBackgroundColor: window.getComputedStyle(this.backgroundOverlay).backgroundColor
                            });
                        };
                        tempImg.onerror = (err) => {
                            console.error('Error loading image:', imagePath, err);
                            console.log('Image load error details:', {
                                imagePath,
                                error: err,
                                section,
                                currentBackgroundImage: this.backgroundOverlay.style.backgroundImage,
                                computedBackgroundImage: window.getComputedStyle(this.backgroundOverlay).backgroundImage
                            });
                        };
                        
                        // Ensure the path starts with /assets/ for the test load
                        const testPath = imagePath.startsWith('/') ? imagePath : `/assets/${imagePath.split('/').pop()}`;
                        tempImg.src = testPath;
                        console.log('Started loading image:', tempImg.src);
                    }
                } else if (item.classList.contains('list-item')) {
                    section = siteStructure.bespoke.sections[sectionId];
                    console.log('Found bespoke section:', section);
                    
                    if (section && section.image) {
                        this.backgroundOverlay.style.backgroundImage = `url(/assets/${section.image})`;
                        this.backgroundOverlay.style.backgroundSize = 'cover';
                        this.backgroundOverlay.style.backgroundPosition = 'center';
                        this.backgroundOverlay.style.opacity = '0.15';
                        this.backgroundOverlay.classList.add('visible');
                    }
                }
            });

            item.addEventListener('mouseleave', () => {
                this.backgroundOverlay.classList.remove('visible');
                // Reset all styles immediately
                this.backgroundOverlay.style.backgroundSize = 'contain';
                this.backgroundOverlay.style.opacity = '0.15';
                this.backgroundOverlay.style.filter = 'none';
                this.backgroundOverlay.style.mixBlendMode = 'normal';
                this.backgroundOverlay.style.backgroundColor = 'transparent';
                
                setTimeout(() => {
                    if (!this.backgroundOverlay.classList.contains('visible')) {
                        this.backgroundOverlay.style.backgroundImage = '';
                    }
                }, 300); // Match the CSS transition duration
            });
        });
    }

    showErrorMessage() {
        this.contentContainer.innerHTML = `
            <div class="error-message">
                <h2>Error Loading Content</h2>
                <p>Please try again later.</p>
            </div>
        `;
    }

    // Add this method to handle video playback
    handleVideoClick(videoData) {
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'video-modal';
        modal.innerHTML = `
            <div class="video-modal-content">
                <button class="close-modal" aria-label="Close video">×</button>
                <div class="video-container">
                    ${videoData.embed}
                </div>
            </div>
        `;

        // Prevent body scroll
        document.body.style.overflow = 'hidden';

        // Add modal to page
        document.body.appendChild(modal);

        // Get iframe for later cleanup
        const iframe = modal.querySelector('iframe');

        // Show modal with animation
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });

        // Close handlers
        const closeModal = () => {
            modal.classList.remove('active');
            // Wait for fade out animation
            setTimeout(() => {
                // Stop video by removing src
                if (iframe) {
                    const src = iframe.src;
                    iframe.src = '';
                    iframe.src = src.replace('autoplay=1', 'autoplay=0');
                }
                modal.remove();
                document.body.style.overflow = '';
            }, 300);
        };

        // Close on button click
        const closeButton = modal.querySelector('.close-modal');
        closeButton.addEventListener('click', closeModal);

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Close on escape key
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);

        // Focus management
        closeButton.focus();
    }

    destroy() {
        // Remove event listeners
        window.removeEventListener('scroll', (e) => this.handleScroll(e));
        window.removeEventListener('resize', (e) => this.handleResize(e));
        
        // Clean up video overlays
        document.querySelectorAll('.video-overlay').forEach(overlay => overlay.remove());
        
        // Clear any running timers
        if (this.previewTimer) {
            clearTimeout(this.previewTimer);
        }
    }

    createCatalogueList() {
        return Object.values(siteStructure.catalogue.sections).map(item => `
            <div class="catalogue-list-item" data-section="${item.title.toLowerCase()}" data-title="${item.title}">
                <h3>${item.displayTitle || item.title}</h3>
                <div class="preview-content">
                    ${this.generatePreviewContent({
                        classList: { contains: () => true },
                        dataset: { section: item.title.toLowerCase() }
                    })}
                </div>
            </div>
        `).join('');
    }

    createBespokeList() {
        return Object.values(siteStructure.bespoke.sections).map(composer => `
            <div class="composer-list-item" data-composer="${composer.title}">
                <h3>${composer.title}</h3>
                <div class="preview-content">
                    <p>intro text here</p>
                </div>
            </div>
        `).join('');
    }

    createFTVList() {
        return Object.values(siteStructure.ftv.sections).map(section => `
            <div class="ftv-list-item" data-section="${section.id}">
                <h3>${section.title}</h3>
                <div class="preview-content">
                    <p>intro text here</p>
                </div>
            </div>
        `).join('');
    }

    handleTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
    }

    handleTouchEnd(e) {
        if (!this.touchStartX || !this.touchStartY) return;

        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const deltaX = touchEndX - this.touchStartX;
        const deltaY = touchEndY - this.touchStartY;

        // If it's more of a tap than a swipe
        if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
            const touchedElement = document.elementFromPoint(touchEndX, touchEndY);
            const clickable = touchedElement.closest('.catalogue-list-item, .list-item, .ftv-list-item');
            if (clickable) {
                clickable.click();
            }
        }

        // Reset touch coordinates
        this.touchStartX = null;
        this.touchStartY = null;
    }

    handleScroll(e) {
        // Debounce scroll handling
        this.debounce(() => {
            // Add any scroll-specific handling here
            // For now, we can leave it empty
        }, 100)();
    }

    handleResize(e) {
        // Debounce resize handling
        this.debounce(() => {
            // Recalculate any necessary dimensions
            if (this.currentZoom) {
                // Update zoomed section positioning if needed
            }
            // Add any other resize-specific handling here
        }, 250)();
    }

    renderFTVSection(section) {
        const ftvData = this.siteStructure.ftv.sections[section];
        if (section === 'ftv-overview') {
            return `
                <div class="ftv-card" data-section="${section}">
                    <h3>FTV Overview</h3>
                    <div class="overview-text">
                        ${this.siteStructure.ftv.sections.overview.content}
                    </div>
                </div>
            `;
        }
        // ... existing code ...
    }
}

// Initialize the ZoomableSection
new ZoomableSection();