import { siteStructure } from '../data/siteStructure.js';

const DEBUG = true;

function log(...args) {
    if (DEBUG) {
        console.log(...args);
    }
}

export class ZoomableSection {
    constructor() {
        this.composerImages = {
            composer1: {
                path: '../assets/maestro.png',
                title: 'Maestro'
            },
            composer2: {
                path: '../assets/kurisu.png',
                title: 'Kurisu'
            }
        };
        this.container = document.getElementById('zoom-container');
        this.sections = document.querySelectorAll('.section');
        this.currentZoom = null;
        this.contentContainer = this.createContentContainer();
        this.previewOverlay = null;
        console.log('siteStructure loaded:', siteStructure);
        this.init();

        // Add cleanup method
        this.cleanup = () => {
            if (this.previewOverlay) {
                this.previewOverlay.remove();
            }
        };
        
        // Clean up on page unload
        window.addEventListener('unload', this.cleanup);

        // Create and position background overlay
        this.backgroundOverlay = document.createElement('div');
        this.backgroundOverlay.className = 'background-overlay';
        document.body.insertBefore(this.backgroundOverlay, document.body.firstChild);
        
        this.initBackgroundEffects();

        // Add debouncing for scroll and resize events
        this.handleScroll = this.debounce(this.handleScroll.bind(this), 100);
        this.handleResize = this.debounce(this.handleResize.bind(this), 250);
        
        window.addEventListener('scroll', this.handleScroll);
        window.addEventListener('resize', this.handleResize);

        // Store event listener references
        this.boundHandleScroll = this.handleScroll.bind(this);
        this.boundHandleResize = this.handleResize.bind(this);
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
            // First check if it's a main section click
            const mainSection = e.target.closest('.section');
            if (mainSection && !e.target.closest('[data-section], [data-composer]')) {
                const sectionId = mainSection.id;
                if (sectionId) {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    // Toggle active state
                    document.querySelectorAll('.section').forEach(section => {
                        if (section === mainSection) {
                            section.classList.toggle('active');
                        } else {
                            section.classList.remove('active');
                        }
                    });
                    return;
                }
            }

            // Then handle subsection clicks
            const clickable = e.target.closest([
                '.composer-card',
                '.catalogue-card',
                '.list-item',
                '.catalogue-list-item',
                '.ftv-card',
                '.ftv-list-item'
            ].join(','));

            if (clickable) {
                e.preventDefault();
                e.stopPropagation();
                
                // Get section ID from data attributes
                const sectionId = clickable.dataset.section || clickable.dataset.composer;
                if (!sectionId) return;

                // Handle different section types
                const parentSection = clickable.closest('.section');
                if (!parentSection) return;

                if (parentSection.id === 'catalogue') {
                    const section = siteStructure.catalogue.sections[sectionId];
                    if (section) {
                        this.showCatalogueContent(section);
                        this.updateNavigation('Catalogue', section.title);
                    }
                } else if (parentSection.id === 'bespoke') {
                    const section = siteStructure.bespoke.sections[sectionId];
                    if (section) {
                        this.showContent(section, this.bespokeTemplate.bind(this));
                        this.updateNavigation('Bespoke', section.title);
                    }
                } else if (parentSection.id === 'ftv') {
                    console.log('FTV section clicked:', sectionId);
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

        this.initPreviews();
    }

    initPreviews() {
        // Create preview overlay once
        if (!this.previewOverlay) {
            this.previewOverlay = document.createElement('div');
            this.previewOverlay.className = 'preview-overlay';
            this.previewOverlay.innerHTML = '<div class="preview-content"></div>';
            document.body.appendChild(this.previewOverlay);
        }

        // Use a single debounced timer
        let previewTimer = null;
        let currentPreviewElement = null;

        const showPreview = (element) => {
            if (previewTimer) {
                clearTimeout(previewTimer);
            }

            previewTimer = setTimeout(() => {
                if (element === currentPreviewElement) {
                    const preview = this.generatePreviewContent(element);
                    if (!preview) return;

                    const rect = element.getBoundingClientRect();
            
                    // Position preview based on element type
                    let x, y;
                    if (element.classList.contains('ftv-list-item')) {
                        // For FTV items, position to the left with offset
                        x = rect.left - 420; // Preview width (400px) + 20px offset
                        y = Math.max(0, rect.top - 100); // Same vertical centering
                    } else {
                        // For all other items, position to the right
                        x = rect.right + 20;
                        y = Math.max(0, rect.top - 100);
                    }

                    this.previewOverlay.querySelector('.preview-content').innerHTML = preview;
                    this.previewOverlay.style.transform = `translate(${x}px, ${y}px)`;
                    this.previewOverlay.classList.add('visible');
                }
            }, 100);
        };

        const hidePreview = () => {
            if (previewTimer) {
                clearTimeout(previewTimer);
            }
            this.previewOverlay.classList.remove('visible');
            currentPreviewElement = null;
        };

        // Use event delegation with a single listener
        this.container.addEventListener('mouseover', (e) => {
            const previewable = e.target.closest('.list-item[data-composer], .catalogue-list-item, .ftv-list-item');
            if (previewable) {
                currentPreviewElement = previewable;
                showPreview(previewable);
            }
        });

        this.container.addEventListener('mouseout', (e) => {
            const previewable = e.target.closest('.list-item[data-composer], .catalogue-list-item, .ftv-list-item');
            const toElement = e.relatedTarget;
            
            if (previewable && !previewable.contains(toElement)) {
                hidePreview();
            }
        });

        // Clean up on unload
        window.addEventListener('beforeunload', () => {
            if (previewTimer) {
                clearTimeout(previewTimer);
            }
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
        // Use the same template for all composers
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
                                        <img src="../assets/spotify-black.svg" alt="Spotify">
                                    </a>
                                ` : ''}
                                ${section.social.tiktok ? `
                                    <a href="${section.social.tiktok}" target="_blank">
                                        <img src="../assets/tiktok-black.svg" alt="TikTok">
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
        if (!section.social) return '';
        return `
            <div class="social-links">
                ${section.social.instagram ? this.generateSocialLink('instagram', section.social.instagram) : ''}
                ${section.social.spotify ? this.generateSocialLink('spotify', section.social.spotify) : ''}
                ${section.social.tiktok ? this.generateSocialLink('tiktok', section.social.tiktok) : ''}
                <a href="#" class="social-link one-sheet">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9v-2h2v2zm0-6H9V8h2v2zm1 6h2v-2h-2v2zm0-6h2V8h-2v2z"/>
                    </svg>
                    <span>Download One-Sheet</span>
                </a>
            </div>
        `;
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
                    <a href="${section.discoSearchUrl}" class="search-link" target="_blank">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="11" cy="11" r="8"/>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        Search Catalogue
                    </a>
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
        console.log('Showing FTV content for:', section);
        
        // Hide the main container
        this.container.style.opacity = '0';
        this.container.style.display = 'none';
        
        // Reset and prepare content container
        this.contentContainer.style.display = 'block';
        this.contentContainer.style.opacity = '0';
        this.contentContainer.className = 'content-container';
        
        // Clear any existing content
        this.contentContainer.innerHTML = '';

        // Generate sections HTML if they exist
        const sectionsHtml = section.sections ? 
            section.sections.map(s => `
                <div class="content-section">
                    <h3>${s.title}</h3>
                    <div class="section-content">
                        <p>${s.content}</p>
                    </div>
                </div>
            `).join('') : '';

        // Create FTV content template
        this.contentContainer.innerHTML = `
            <button class="back-button">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
            <div class="content-page">
                <div class="content-header">
                    <h2>${section.title}</h2>
                </div>
                <div class="content-sections">
                    <div class="content-section main-description">
                        <p>${section.description || ''}</p>
                    </div>
                    ${sectionsHtml}
                    ${section.discoPlaylistEmbed ? `
                        <div class="content-section playlist">
                            <h3>Featured Music</h3>
                            <div class="playlist-container">
                                ${section.discoPlaylistEmbed}
                            </div>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;

        // Add back button handler
        const backButton = this.contentContainer.querySelector('.back-button');
        backButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('navigationBack'));
        });

        // Show with animation
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
                let section;
                
                if (item.classList.contains('catalogue-list-item')) {
                    section = siteStructure.catalogue.sections[sectionId];
                    console.log('Found catalogue section:', section);
                    
                    if (section && section.logoPath) {
                        console.log('Setting logo background:', section.logoPath);
                        this.backgroundOverlay.style.backgroundImage = `url(${section.logoPath})`;
                        this.backgroundOverlay.style.backgroundSize = 'contain';
                        this.backgroundOverlay.style.backgroundRepeat = 'no-repeat';
                        this.backgroundOverlay.style.backgroundPosition = 'center';
                        this.backgroundOverlay.style.opacity = '0.15';
                        this.backgroundOverlay.classList.add('visible');
                    }
                } else if (item.classList.contains('list-item')) {
                    section = siteStructure.bespoke.sections[sectionId];
                    console.log('Found bespoke section:', section);
                    
                    if (section && section.image) {
                        this.backgroundOverlay.style.backgroundImage = `url(../assets/${section.image})`;
                        this.backgroundOverlay.style.backgroundSize = 'cover';
                        this.backgroundOverlay.style.backgroundPosition = 'center';
                        this.backgroundOverlay.style.opacity = '0.15';
                        this.backgroundOverlay.classList.add('visible');
                    }
                }
            });

            item.addEventListener('mouseleave', () => {
                this.backgroundOverlay.classList.remove('visible');
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

    generateSocialLink(type, url) {
        const icons = {
            instagram: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>`,
            spotify: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
            </svg>`,
            tiktok: `<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
            </svg>`
        };

        return `
            <a href="${url}" target="_blank" class="social-link ${type}">
                ${icons[type]}
            </a>
        `;
    }

    // Add this method to handle video playback
    handleVideoClick(videoData) {
        // Create modal
        const modal = document.createElement('div');
        modal.className = 'video-modal';
        modal.innerHTML = `
            <div class="video-modal-content">
                <button class="close-modal">×</button>
                <div class="video-container">
                    ${videoData.embed}
                </div>
            </div>
        `;

        // Add modal to page
        document.body.appendChild(modal);

        // Add close handler
        const closeButton = modal.querySelector('.close-modal');
        closeButton.addEventListener('click', () => {
            modal.remove();
        });

        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                modal.remove();
            }
        }, { once: true });

        // Show modal with animation
        requestAnimationFrame(() => {
            modal.style.opacity = '1';
        });
    }

    destroy() {
        // Remove event listeners
        window.removeEventListener('scroll', this.boundHandleScroll);
        window.removeEventListener('resize', this.boundHandleResize);
        
        // Clean up video overlays
        document.querySelectorAll('.video-overlay').forEach(overlay => overlay.remove());
        
        // Clear any running timers
        if (this.previewTimer) {
            clearTimeout(this.previewTimer);
        }
    }
}

// Initialize the ZoomableSection
new ZoomableSection();