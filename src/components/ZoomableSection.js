import { siteStructure } from '../data/siteStructure.js';

export class ZoomableSection {
    constructor() {
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
        // Ensure container exists
        if (!this.container) {
            console.error('Zoom container not found');
            return;
        }

        // Add click handler to container for event delegation
        this.container.addEventListener('click', (e) => {
            console.log('Click event on container:', e.target);
            const target = e.target;
            
            // Find closest clickable element
            const clickable = target.closest('.composer-card, .list-item[data-composer], .catalogue-card, .catalogue-list-item, .ftv-card, .ftv-list-item');
            
            console.log('Found clickable element:', clickable);
            if (clickable) {
                e.stopPropagation();
                e.preventDefault();
                
                if (clickable.classList.contains('composer-card') || clickable.hasAttribute('data-composer')) {
                    console.log('Handling composer click');
                    this.handleSubsectionClick(clickable);
                } else if (clickable.classList.contains('catalogue-card') || clickable.classList.contains('catalogue-list-item')) {
                    console.log('Handling catalogue click');
                    this.handleCatalogueClick(clickable);
                } else if (clickable.classList.contains('ftv-card') || clickable.classList.contains('ftv-list-item')) {
                    console.log('Handling FTV click');
                    this.handleFTVClick(clickable);
                }
            }
        });

        // Handle back navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.resetZoom();
        });

        window.addEventListener('navigationBack', () => this.handleBackNavigation());

        // Add home link handler
        document.querySelector('.home-link').addEventListener('click', (e) => {
            e.preventDefault();
            window.dispatchEvent(new CustomEvent('navigationBack'));
        });

        // Initialize preview functionality
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
        const section = this.findSectionData(sectionId);
        
        if (!section) return null;

        console.log('Generating preview for:', {
            element,
            sectionId,
            section
        });

        if (element.classList.contains('list-item') || element.hasAttribute('data-composer')) {
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
        } else if (element.classList.contains('catalogue-list-item')) {
            const logoPath = sectionId === 'boosey' ? './assets/boosey__hawkes_logo.png' : 
                            sectionId === 'rh' ? './assets/RnH.png' : 
                            null;

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
                        <p>${section.content ? section.content.substring(0, 200) + '...' : ''}</p>
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
        window.dispatchEvent(new CustomEvent('navigationUpdate', {
            detail: { path: sectionTitle ? [parentTitle, sectionTitle] : [parentTitle] }
        }));
    }

    // Content display methods
    showContent(section, template) {
        this.transition(this.contentContainer, this.container);
        this.contentContainer.innerHTML = template(section);
    }

    // Template methods
    catalogueTemplate(section) {
        return `
            <div class="content-page">
                <div class="content-header">
                    <h2>${section.title}</h2>
                </div>
                <div class="content-sections">
                    <div class="content-section">
                        <h3>Overview</h3>
                        <p>${section.description}</p>
                    </div>
                    <div class="content-section">
                        <h3>DISCO Playlist</h3>
                        <div class="playlist-placeholder">
                            Playlist embed will go here
                        </div>
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
        if (!element) return;
        
        const sectionId = element.dataset.section || element.dataset.composer;
        if (!sectionId) {
            console.error('No section ID found for element:', element);
            return;
        }

        const sectionTitle = element.querySelector('h3')?.textContent || element.textContent;
        const parentSection = element.closest('.section');
        if (!parentSection) {
            console.error('No parent section found for element:', element);
            return;
        }

        const parentTitle = parentSection.querySelector('h2').textContent;

        // Update navigation
        this.updateNavigation(parentTitle, sectionTitle);

        // Show content
        this.showSubsectionContent(sectionId);
    }

    showSubsectionContent(sectionId) {
        try {
            // Fade out main container
            this.container.style.opacity = '0';
            this.container.style.display = 'none';
            
            // Show content container
            this.contentContainer.style.display = 'block';
            this.contentContainer.style.opacity = '0';
            
            const section = this.findSectionData(sectionId);
            
            const socialLinks = section.social ? `
                <div class="social-links">
                    ${section.social.instagram ? `
                        <a href="${section.social.instagram}" target="_blank" rel="noopener noreferrer" class="social-link instagram">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                            </svg>
                        </a>
                    ` : ''}
                    ${section.social.spotify ? `
                        <a href="${section.social.spotify}" target="_blank" rel="noopener noreferrer" class="social-link spotify">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                            </svg>
                        </a>
                    ` : ''}
                </div>
            ` : '';

            this.contentContainer.innerHTML = `
                <button class="back-button">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                    </svg>
                </button>
                <div class="composer-profile">
                    <div class="composer-header">
                        <img src="${section.image}" alt="${section.title}" />
                        <div class="composer-title-wrapper">
                            <h2>${section.title}</h2>
                            ${socialLinks}
                        </div>
                    </div>
                    <div class="composer-sections">
                        <div class="composer-section">
                            <h3>Biography</h3>
                            <p>${section.bio}</p>
                        </div>
                        ${section.videos ? `
                        <div class="composer-section">
                            <h3>Featured Work</h3>
                            <div class="video-carousel">
                                <button class="carousel-button prev">❮</button>
                                ${section.videos.map((video, index) => `
                                    <div class="video-preview ${index === 0 ? 'active' : ''}" 
                                         data-video-id="${video.id}" 
                                         data-video-type="${video.type}"
                                         data-index="${index}">
                                        <div class="thumbnail-container">
                                            <img src="${video.thumbnail}" 
                                                 alt="${video.title}"
                                                 class="video-thumbnail">
                                            <div class="play-button">▶</div>
                                        </div>
                                        <h4>${video.title}</h4>
                                    </div>
                                `).join('')}
                                <button class="carousel-button next">❯</button>
                                <div class="carousel-dots">
                                    ${section.videos.map((_, index) => `
                                        <span class="dot ${index === 0 ? 'active' : ''}" data-index="${index}"></span>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        ` : ''}
                        <div class="composer-section">
                            <h3>DISCO Playlist</h3>
                            <div class="playlist-placeholder">
                                Playlist embed will go here
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Add carousel navigation
            const carousel = this.contentContainer.querySelector('.video-carousel');
            if (carousel) {
                const videos = carousel.querySelectorAll('.video-preview');
                const dots = carousel.querySelectorAll('.dot');
                let currentIndex = 0;

                const showVideo = (index) => {
                    videos.forEach(v => v.classList.remove('active'));
                    dots.forEach(d => d.classList.remove('active'));
                    videos[index].classList.add('active');
                    dots[index].classList.add('active');
                    currentIndex = index;
                };

                carousel.querySelector('.prev').addEventListener('click', () => {
                    const newIndex = (currentIndex - 1 + videos.length) % videos.length;
                    showVideo(newIndex);
                });

                carousel.querySelector('.next').addEventListener('click', () => {
                    const newIndex = (currentIndex + 1) % videos.length;
                    showVideo(newIndex);
                });

                dots.forEach(dot => {
                    dot.addEventListener('click', () => {
                        showVideo(parseInt(dot.dataset.index));
                    });
                });
            }

            // Add video click handlers
            this.contentContainer.querySelectorAll('.video-preview').forEach(preview => {
                preview.addEventListener('click', () => {
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
                        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&background=1`;
                    } else if (videoType === 'vimeo') {
                        iframe.src = `https://player.vimeo.com/video/${videoId}?autoplay=1&title=0&byline=0&portrait=0&background=1`;
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

            // Show the content with a slight delay
            setTimeout(() => {
                this.contentContainer.style.opacity = '1';
            }, 50);
        } catch (error) {
            console.error('Error showing subsection content:', error);
            this.contentContainer.innerHTML = `
                <div class="error-message">
                    <h2>Error Loading Content</h2>
                    <p>Please try again later.</p>
                </div>
            `;
        }
    }

    findSectionData(sectionId) {
        try {
            let section = siteStructure.bespoke.sections[sectionId] ||
                         siteStructure.catalogue.sections[sectionId] ||
                         siteStructure.ftv.sections[sectionId];
            
            if (!section) {
                console.warn(`Section ${sectionId} not found`);
                return {
                    title: 'Content Not Found',
                    image: '',
                    bio: 'Content not available.',
                    discoPlaylist: '',
                    videos: []
                };
            }
            return section;
        } catch (error) {
            console.error('Error finding section data:', error);
            return {
                title: 'Error',
                image: '',
                bio: 'An error occurred.',
                discoPlaylist: '',
                videos: []
            };
        }
    }

    handleBackNavigation() {
        if (this.contentContainer.style.display === 'block') {
            // Return from subsection content
            this.contentContainer.style.opacity = '0';
            setTimeout(() => {
                this.container.style.display = 'grid';
                requestAnimationFrame(() => {
                    this.container.style.opacity = '1';
                });
                this.contentContainer.style.display = 'none';
            }, 500);
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
        this.showCatalogueContent(sectionId);
    }

    showCatalogueContent(sectionId) {
        // Fade out main container
        this.container.style.opacity = '0';
        this.container.style.display = 'none';
        
        // Get content from siteStructure
        const section = siteStructure.catalogue.sections[sectionId];
        if (!section) return;
        
        // Show content container
        this.contentContainer.style.display = 'block';
        this.contentContainer.style.opacity = '0';
        
        // Update catalogue logo paths
        const logoPath = sectionId === 'boosey' ? './assets/boosey__hawkes_logo.png' : 
                        sectionId === 'rh' ? './assets/RnH.png' : 
                        null;
        
        // Prepare content
        this.contentContainer.innerHTML = `
            <button class="back-button">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            </button>
            <div class="content-page">
                <div class="content-header">
                    ${logoPath ? `<img src="${logoPath}" alt="${section.title}" class="catalogue-logo">` : ''}
                    <h2>${section.title}</h2>
                </div>
                <div class="content-sections">
                    <div class="content-section">
                        <h3>Overview</h3>
                        <p>${section.description}</p>
                    </div>
                    <div class="content-section">
                        <h3>DISCO Playlist</h3>
                        <div class="playlist-container">
                            ${section.discoPlaylistEmbed || '<div class="playlist-placeholder">Playlist coming soon...</div>'}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Add back button handler
        this.contentContainer.querySelector('.back-button').addEventListener('click', () => {
            this.handleBackNavigation();
            window.dispatchEvent(new CustomEvent('navigationUpdate', {
                detail: { path: ['Catalogue Overview'] }
            }));
        });

        // Add transition
        setTimeout(() => {
            this.contentContainer.style.opacity = '1';
        }, 50);
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
        this.showFTVContent(sectionId);
    }

    showFTVContent(sectionId) {
        // Fade out main container
        this.container.style.opacity = '0';
        this.container.style.display = 'none';
        
        // Get content from siteStructure
        const section = siteStructure.ftv.sections[sectionId];
        if (!section) return;
        
        // Show content container
        this.contentContainer.style.display = 'block';
        this.contentContainer.style.opacity = '0';
        
        // Prepare content with conditional playlist and table
        const contentSections = sectionId === 'ftv-overview' 
            ? `<div class="content-section">
                <h3>Overview</h3>
                <p>${section.description}</p>
               </div>
               <div class="content-section">
                <h3>DISCO Playlist</h3>
                <div class="playlist-container">
                    ${section.discoPlaylistEmbed || '<div class="playlist-placeholder">Playlist coming soon...</div>'}
                </div>
               </div>`
            : `<div class="content-section">
                <h3>Overview</h3>
                <p>${section.description}</p>
               </div>
               <div class="content-section">
                <h3>Royalty Information</h3>
                <div class="table-container">
                    <table class="royalty-table">
                        <thead>
                            <tr>
                                <th>Usage Type</th>
                                <th>Rate</th>
                                <th>Terms</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>TBD</td>
                                <td>TBD</td>
                                <td>TBD</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
               </div>`;

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
                    ${contentSections}
                </div>
            </div>
        `;

        // Add back button handler
        this.contentContainer.querySelector('.back-button').addEventListener('click', () => {
            this.handleBackNavigation();
            window.dispatchEvent(new CustomEvent('navigationUpdate', {
                detail: { path: ['FTV'] }
            }));
        });

        // Add transition
        setTimeout(() => {
            this.contentContainer.style.opacity = '1';
        }, 50);
    }
}

// Initialize the ZoomableSection
new ZoomableSection();