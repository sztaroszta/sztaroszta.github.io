// === BIO TOGGLE FUNCTION ===
// Outside DOMContentLoaded a, because it's called via HTML onclick

function toggleBio() {
    const button = document.getElementById('bio-section-trigger');
    const contentWrapper = document.getElementById('bio-content-wrapper');

    if (button && contentWrapper) {
        const isExpanded = button.classList.contains('expanded');

        button.classList.toggle('expanded');
        button.setAttribute('aria-expanded', !isExpanded);

        if (isExpanded) {

            contentWrapper.classList.add('collapsed');
            button.setAttribute('data-tooltip', 'Show Profile Details');
        } else {

            contentWrapper.classList.remove('collapsed');
            contentWrapper.classList.add('expanded'); // Ensure it's there
            button.setAttribute('data-tooltip', 'Hide Profile Details');
        }
    }
}







// === LIGHTBOX FUNCTIONALITY (Image + Video) ===

function openLightbox(element) {
    const modal = document.getElementById("lightbox-modal");
    const modalImg = document.getElementById("lightbox-img");
    const modalVideo = document.getElementById("lightbox-video");
    const captionText = document.getElementById("lightbox-caption");

    // Get Data Attributes
    const fullSizeUrl = element.getAttribute('data-full-src') || element.src; // Logic: Use 'data-full-src' if it exists (HD image), otherwise use 'src'
    const videoUrl = element.getAttribute('data-video-src'); // Check for video

    modal.style.display = "flex";

    // === LOGIC: IS IT A VIDEO OR IMAGE? ===
    if (videoUrl) {
        // --- IT IS A VIDEO ---
        modalImg.style.display = "none";   // Hide Image
        modalVideo.style.display = "block"; // Show Video

        // 1. Detect if it is a Short (Vertical)
        const isShort = videoUrl.includes("shorts/");

        // 2. Apply or Remove the 'vertical' CSS class based on detection
        if (isShort) {
            modalVideo.classList.add("vertical");
        } else {
            modalVideo.classList.remove("vertical");
        }

        // 3. Extract ID and Play
        // (This regex handles shorts, watch, embed, etc.)
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
        const match = videoUrl.match(regExp);
        
if (match && match[2].length === 11) {
    const videoId = match[2];
    
    const origin = window.location.origin; 

    // === KEY FIXES FOR MOBILE ===
    // mute=1        -> Required for autoplay on mobile
    // playsinline=1 -> Prevents iOS from hijacking the video to native player
    // origin=...    -> Tells YouTube this request is legitimate
    modalVideo.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&rel=0&loop=1&playlist=${videoId}&origin=${origin}`;
} else {
            console.error("Could not extract YouTube ID");
        }

    } else {
        // --- IT IS AN IMAGE ---
        modalVideo.style.display = "none"; // Hide Video
        modalVideo.src = "";               // Stop video audio
        modalImg.style.display = "block";  // Show Image
        modalImg.src = fullSizeUrl;
    }

    // Use alt text as caption
    if (captionText) {
        captionText.innerHTML = element.alt;
    }
}

function closeLightbox() {
    const modal = document.getElementById("lightbox-modal");
    modal.style.display = "none";

    // CLEANUP: Clear both sources to stop memory leaks and STOP AUDIO
    document.getElementById("lightbox-img").src = "";
    document.getElementById("lightbox-video").src = "";
}

// Close on 'Escape' key
document.addEventListener('keydown', function (event) {
    if (event.key === "Escape") {
        closeLightbox();
    }
});







document.addEventListener('DOMContentLoaded', function () {


    // === VARIABLE & STATE DECLARATIONS ===


    // --- Analytics Animation State ---

    let currentAngle = 0;
    let isPlaying = true;
    let animationId;
    const rotationSpeed = 0.2;



    // === Dynamic KPI Totals ===
    let totalArticles = 0;
    let totalCode = 0;
    let totalBooks = 0;


    // --- Table Sorting State ---
    let originalRows = [];
    let sortState = { title: 0, type: 0 };

    // --- Gallery Sorting State ---
    let originalGalleryItems = [];
    let gallerySortState = { title: 0, type: 0 };




    // === SCRIPT FOR RANDOM & AUTOMATIC PLANET DISTRIBUTION ===
    function distributePlanetsRandomly() {
        const source = document.getElementById('planet-source');
        const ring1 = document.querySelector('.orbit-ring.ring-1');
        const ring2 = document.querySelector('.orbit-ring.ring-2');

        if (!source || !ring1 || !ring2) return;

        // 1. Get all planets and convert to an array to shuffle
        let planets = Array.from(source.children);

        // 2. Shuffle the array (Fisher-Yates shuffle algorithm)
        for (let i = planets.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [planets[i], planets[j]] = [planets[j], planets[i]];
        }

        // 3. CHANGE: Define a fixed number of planets for the inner ring.
        const innerRingCount = 6;

        // 4. Distribute the shuffled planets into the rings based on our new count
        planets.forEach((planet, index) => {
            // If the current index is less than our target for the inner ring...
            if (index < innerRingCount) {
                // ...place it in Ring 1.
                ring1.appendChild(planet);
            } else {
                // ...otherwise, place it in Ring 2.
                ring2.appendChild(planet);
            }
        });
    }

    // Run the distribution function on page load
    distributePlanetsRandomly();












    // === SCRIPT FOR RANDOM PLANET SPIN ===
    const planetsToSpin = document.querySelectorAll('.planet-content');
    planetsToSpin.forEach(planet => {
        // Random duration between 20 and 50 seconds for variety
        const randomDuration = 10 + Math.random() * 30;

        // Randomly choose between the two animation names
        const randomDirection = Math.random() < 0.5 ? 'selfSpin' : 'selfSpinReverse';

        // Apply the randomized animation directly to the element's style
        planet.style.animation = `${randomDirection} ${randomDuration.toFixed(2)}s linear infinite`;
    });


    // === SCRIPT FOR ALL COLLAPSIBLE TRIGGERS ===
    const triggers = document.querySelectorAll('.section-trigger, .atlas-trigger');
    triggers.forEach(trigger => {
        trigger.addEventListener('click', function (event) {
            // Allows clicks on links within the trigger to function normally
            if (event.target.closest('a') && event.target.closest('a').hasAttribute('target')) {
                return;
            }
            event.preventDefault();
            const targetId = this.getAttribute('data-target');
            const contentWrapper = document.getElementById(targetId);
            if (contentWrapper) {
                this.classList.toggle('expanded');
                contentWrapper.classList.toggle('expanded');
                const isExpanded = this.classList.contains('expanded');
                this.setAttribute('aria-expanded', isExpanded);
            }
        });
    });













    // This function calculates the absolute totals once on page load.
    function calculateInitialTotals() {
        // Reset totals
        totalArticles = 0;
        totalCode = 0;
        totalBooks = 0;

        const allItems = document.querySelectorAll('.carousel-card');

        allItems.forEach(item => {
            const cat = item.getAttribute('data-category');

            // 1. OPEN SOURCE (Counts as Code AND Article)
            if (cat === 'code') {
                totalCode++;
                totalArticles++;
            }

            // 2. ARTICLES (Standard Articles OR Book Articles)
            if (cat === 'article' || cat === 'book-article') {
                totalArticles++;
            }

            // 3. BOOKS (Strictly the main book)
            if (cat === 'book') {
                totalBooks++;
            }
        });
    }

    // Run the calculation function as soon as the page is ready
    calculateInitialTotals();














    // === MATRIX MULTI-SELECT DROPDOWN LOGIC ===
    const multiSelectWrapper = document.getElementById('type-multiselect');
    const multiSelectTrigger = multiSelectWrapper.querySelector('.custom-select-trigger');

    // Toggle Dropdown
    multiSelectTrigger.addEventListener('click', function (e) {
        e.stopPropagation(); // Prevent closing immediately
        multiSelectWrapper.classList.toggle('open');
    });

    // Close Dropdown when clicking outside
    document.addEventListener('click', function (e) {
        if (!multiSelectWrapper.contains(e.target)) {
            multiSelectWrapper.classList.remove('open');
        }
    });

    // Prevent dropdown from closing when clicking labels/checkboxes inside
    multiSelectWrapper.querySelector('.custom-options').addEventListener('click', function (e) {
        e.stopPropagation();
    });







    // === GALLERY MULTI-SELECT DROPDOWN LOGIC ===
    const galleryMultiSelect = document.getElementById('gallery-multiselect');
    const galleryMultiTrigger = galleryMultiSelect.querySelector('.custom-select-trigger');

    // Toggle Gallery Dropdown
    galleryMultiTrigger.addEventListener('click', function (e) {
        e.stopPropagation();
        galleryMultiSelect.classList.toggle('open');
    });

    // Close Gallery Dropdown when clicking outside
    document.addEventListener('click', function (e) {
        if (!galleryMultiSelect.contains(e.target)) {
            galleryMultiSelect.classList.remove('open');
        }
    });

    // Prevent closing when clicking inside options
    galleryMultiSelect.querySelector('.custom-options').addEventListener('click', function (e) {
        e.stopPropagation();
    });



    // === FIX: AI ATLAS TOOLTIP LOGIC (Added this block) ===
    const atlasTrigger = document.getElementById('atlas-trigger-btn');
    if (atlasTrigger) {
        atlasTrigger.addEventListener('click', function () {
            // Use a tiny timeout to ensure the 'expanded' class has finished toggling
            setTimeout(() => {
                if (this.classList.contains('expanded')) {
                    this.setAttribute('data-tooltip', 'Collapse Details');
                } else {
                    this.setAttribute('data-tooltip', 'Expand Details');
                }
            }, 10);
        });
    }








    // === SCRIPT FOR DYNAMIC SECTION TOOLTIPS (Counts items) ===
    const sections = [
        { triggerSelector: '[data-target="open-source-content-wrapper"]', contentSelector: '#open-source-content-wrapper' },
        { triggerSelector: '[data-target="articles-content-wrapper"]', contentSelector: '#articles-content-wrapper' },
        { triggerSelector: '[data-target="bookshelf-content-wrapper"]', contentSelector: '#bookshelf-content-wrapper' }
    ];

    sections.forEach(section => {
        const trigger = document.querySelector(section.triggerSelector);
        const content = document.querySelector(section.contentSelector);
        if (trigger && content) {
            const itemCount = content.querySelectorAll('.showcase-item').length;

            trigger.classList.add('tooltip-right');

            const updateTooltip = () => {
                if (trigger.classList.contains('expanded')) {
                    // \n creates the line break
                    trigger.setAttribute('data-tooltip', `Collapse All\n(${itemCount} Items)`);
                } else {
                    trigger.setAttribute('data-tooltip', `Expand All\n(${itemCount} Items)`);
                }
            };

            // Initialize on load
            updateTooltip();

            // Update on click
            trigger.addEventListener('click', () => {
                setTimeout(updateTooltip, 10);
            });
        }
    });







    // === NAV LINKS COUNTER TOOLTIPS ===
    const navLinks = [
        { navId: 'nav-opensource', contentId: 'open-source-content-wrapper' },
        { navId: 'nav-articles', contentId: 'articles-content-wrapper' },
        { navId: 'nav-bookshelf', contentId: 'bookshelf-content-wrapper' },
        { navId: 'nav-updates', contentId: 'updates-content-wrapper' }
    ];

    navLinks.forEach(link => {
        const navEl = document.getElementById(link.navId);
        const contentEl = document.getElementById(link.contentId);

        if (navEl && contentEl) {
            const count = contentEl.querySelectorAll('.showcase-item').length;
            navEl.setAttribute('data-tooltip', `${count} Items`);
        }
    });





    // === BACK TO TOP BUTTON SCRIPT ===
    // SCROLL HANDLING (Sticky Header + Back to Top)
    const stickyHeader = document.getElementById("sticky-header");
    const backToTopButton = document.getElementById("back-to-top");

    window.addEventListener('scroll', () => {
        // Get current scroll position
        const scrollY = window.scrollY || document.documentElement.scrollTop;

        // 1. Sticky Header Logic (Shows after scrolling past bio - approx 400px)
        if (stickyHeader) {
            if (scrollY > 400) {
                stickyHeader.classList.add("visible");
            } else {
                stickyHeader.classList.remove("visible");
            }
        }

        // 2. Back to Top Button Logic (Shows after 300px)
        if (backToTopButton) {
            if (scrollY > 300) {
                backToTopButton.classList.add("visible");
            } else {
                backToTopButton.classList.remove("visible");
            }
        }
    });

    // Click Event for Back to Top
    if (backToTopButton) {
        backToTopButton.addEventListener("click", function (e) {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
    // === ENTRANCE ANIMATION SCRIPT ===
    const animatedElements = document.querySelectorAll('.fade-in-up');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1
    });
    animatedElements.forEach(element => {
        observer.observe(element);
    });














    // ================ ANALYTICS LOGIC (Orbit/Carousel) ==================

    window.switchAnalyticsView = function (viewName) {
        const orbitView = document.getElementById('view-orbit');
        const carouselView = document.getElementById('view-carousel');
        const btnOrbit = document.getElementById('btn-orbit');
        const btnCarousel = document.getElementById('btn-carousel');
        const glassContainer = document.querySelector('.analytics-glass-container');

        if (viewName === 'orbit') {
            orbitView.style.display = 'flex';
            carouselView.style.display = 'none';
            btnOrbit.classList.add('active');
            btnCarousel.classList.remove('active');
            if (glassContainer) glassContainer.classList.add('orbit-view-active');

            // === STOP ANIMATION ===
            if (animationId) cancelAnimationFrame(animationId);

        } else {
            orbitView.style.display = 'none';
            carouselView.style.display = 'flex';
            btnOrbit.classList.remove('active');
            btnCarousel.classList.add('active');
            if (glassContainer) glassContainer.classList.remove('orbit-view-active');

            // === START ANIMATION (If not manually paused) ===
            if (isPlaying) {
                // Cancel any existing loop to prevent speed-up bugs
                if (animationId) cancelAnimationFrame(animationId);
                window.animateCarousel();
            }
        }

        // Ensure filters apply to the new view immediately
        if (typeof window.runAnalyticsFilter === 'function') {
            window.runAnalyticsFilter();
        }
    };

    // --- CAROUSEL ANIMATION LOGIC ---
    const carouselSpinner = document.getElementById('carousel-spinner');
    const playPauseBtn = document.getElementById('playPauseBtn');
    const cards = document.querySelectorAll('.carousel-card');


    function updateCarouselLayout() {
        // First, figure out which cards are currently visible after filtering
        const visibleCards = Array.from(cards).filter(
            card => card.style.opacity !== '0' && card.style.display !== 'none'
        );
        const visibleCount = visibleCards.length;
        if (visibleCount === 0) return; // Exit if no cards are visible

        // === 1. DYNAMIC RADIUS CALCULATION ===
        const isMobile = window.innerWidth <= 600;

        // Use a pure multiplier to keep gaps consistent forever
        const radiusMultiplier = isMobile ? 26 : 35;
        const newRadius = visibleCount * radiusMultiplier;

        // === 2. DYNAMIC ANGLE CALCULATION ===
        const angle = 360 / visibleCount;

        // === 3. APPLY NEW STYLES ===
        visibleCards.forEach((card, index) => {
            const rotationAngle = angle * index;
            card.style.transform = `rotateY(${rotationAngle}deg) translateZ(${newRadius}px)`;
        });

    }






    // ---  ORBIT AUTOMATION SCRIPT --- 
    function updateOrbitLayout() {
        const orbitRings = document.querySelectorAll('.orbit-ring');

        orbitRings.forEach(ring => {
            // Find only the VISIBLE planets within THIS ring
            const visiblePlanets = Array.from(ring.querySelectorAll('.planet')).filter(
                p => p.style.display !== 'none'
            );
            const visibleCount = visiblePlanets.length;
            if (visibleCount === 0) return;

            const angle = 360 / visibleCount;

            visiblePlanets.forEach((planet, index) => {
                const rotationAngle = angle * index;

                // Convert angle to radians for trigonometry
                const angleRad = rotationAngle * (Math.PI / 180);

                // Calculate X and Y coordinates on a circle (from 0% to 100%)
                // 50 is the center, the other 50 is the radius (50% of the container)
                const x = 50 + 50 * Math.cos(angleRad);
                const y = 50 + 50 * Math.sin(angleRad);

                // Apply the position using top and left percentages
                planet.style.position = 'absolute';
                planet.style.left = `${x}%`;
                planet.style.top = `${y}%`;

                // This crucial line ensures the PLANET'S CENTER is at the calculated point
                planet.style.transform = 'translate(-50%, -50%)';
            });
        });
    }







    window.animateCarousel = function () {
        const carouselView = document.getElementById('view-carousel');
        const analyticsView = document.getElementById('view-analytics');

        // Check if Analytics View is active (not hidden) AND Carousel is displayed
        // Note: We check if analyticsView exists to prevent errors on initial load
        const isVisible = analyticsView && !analyticsView.classList.contains('hidden-view') &&
            carouselView && carouselView.style.display !== 'none';

        if (isPlaying && isVisible) {
            currentAngle += rotationSpeed;
            applyTransform();
            removeHighlights();
            animationId = requestAnimationFrame(window.animateCarousel);
        } else {
            // Ensure we stop the loop if hidden
            if (animationId) cancelAnimationFrame(animationId);
        }
    };

    function applyTransform() {
        if (carouselSpinner) {
            carouselSpinner.style.transform = `rotateY(${currentAngle}deg)`;
            if (!isPlaying) updateHighlights();
        }
    }





    // === HIGHLIGHT FUNCTION ===

    function updateHighlights() {
        // 1. Get all cards that are currently visible after any filtering
        const visibleCards = Array.from(cards).filter(
            card => card.style.opacity !== '0' && card.style.display !== 'none'
        );
        const visibleCount = visibleCards.length;
        if (visibleCount === 0) return; // Exit if there's nothing to highlight

        let closestCard = null;
        let smallestDistance = Infinity; // Start with an infinitely large distance

        // 2. Loop through each visible card to find which one is closest to the front
        visibleCards.forEach((card, index) => {
            const angle = 360 / visibleCount;
            const cardBaseAngle = index * angle;

            let effectiveAngle = (currentAngle + cardBaseAngle) % 360;
            if (effectiveAngle < 0) effectiveAngle += 360;

            // 3. Calculate the card's distance from the absolute front (0 or 360 degrees)
            // A card at 10° is 10 away. A card at 350° is also 10 away.
            const distanceFromFront = Math.min(effectiveAngle, 360 - effectiveAngle);

            // 4. If this card is closer than any we've seen before, it's our new winner
            if (distanceFromFront < smallestDistance) {
                smallestDistance = distanceFromFront;
                closestCard = card;
            }
        });

        // 5. Now that we have the single closest card, apply the highlight
        // This loop ensures only the winner has the class and all others don't.
        cards.forEach(card => {
            if (card === closestCard) {
                card.classList.add('highlight');
            } else {
                card.classList.remove('highlight');
            }
        });


        // Also remove highlights from any cards that are now hidden by filters
        const hiddenCards = Array.from(cards).filter(
            card => card.style.opacity === '0' || card.style.display === 'none'
        );
        hiddenCards.forEach(card => card.classList.remove('highlight'));
    }

    function removeHighlights() {
        cards.forEach(card => card.classList.remove('highlight'));
    }

    window.togglePlay = function () {
        isPlaying = !isPlaying;
        const icon = playPauseBtn.querySelector('i');
        if (isPlaying) {
            icon.classList.remove('fa-play');
            icon.classList.add('fa-pause');
            window.animateCarousel();
        } else {
            icon.classList.remove('fa-pause');
            icon.classList.add('fa-play');
            cancelAnimationFrame(animationId);
            animationId = null; // reset ID
            updateHighlights();
        }
    };







    window.snapToNearestCard = function (direction) {
        if (isPlaying) togglePlay();

        // 1. Calculate the DYNAMIC angle based on how many cards are visible
        const visibleCards = Array.from(cards).filter(
            card => card.style.opacity !== '0' && card.style.display !== 'none'
        );
        const visibleCount = visibleCards.length;
        if (visibleCount === 0) return;
        const angle = 360 / visibleCount;

        carouselSpinner.style.transition = "transform 0.5s ease-out";

        // 2. Use the dynamic 'angle' to calculate which card is closest
        const currentSlot = Math.round(currentAngle / angle);
        const targetSlot = currentSlot + direction;

        // 3. Snap to the correct position using the dynamic 'angle'
        currentAngle = targetSlot * angle;
        applyTransform();

        // Re-run the highlight logic after the snap completes
        setTimeout(() => {
            carouselSpinner.style.transition = "none";
            updateHighlights(); // Call this to ensure the new card is highlighted
        }, 500);
    };

    window.nextCard = function () { snapToNearestCard(1); };
    window.prevCard = function () { snapToNearestCard(-1); };

    // SETUP & UPDATE THE CAROUSEL LAYOUT
    updateCarouselLayout();
    updateOrbitLayout();

    window.addEventListener('resize', () => {
        updateCarouselLayout();
        updateOrbitLayout();
    });























    // === MATRIX VIEW LOGIC === //

    // 1. SELECTORS
    const btnCard = document.getElementById('btn-card');
    const btnMatrix = document.getElementById('btn-matrix');
    const btnGallery = document.getElementById('btn-gallery');
    const btnAnalytics = document.getElementById('btn-analytics');

    const viewCards = document.getElementById('view-cards');
    const viewMatrix = document.getElementById('view-matrix');
    const viewGallery = document.getElementById('view-gallery');
    const viewAnalytics = document.getElementById('view-analytics');

    const internalNav = document.getElementById('internal-nav');
    const mainContainer = document.querySelector('.container.glass-effect');

    // 2. MAIN SWITCH VIEW FUNCTION
    // The main function to change views and highlights
    window.switchView = function (mode) {
        // 1. Hide all views first
        viewCards.classList.add('hidden-view');
        viewMatrix.classList.add('hidden-view');
        viewGallery.classList.add('hidden-view');
        viewAnalytics.classList.add('hidden-view');

        // 2. Deactivate all buttons
        btnCard.classList.remove('active');
        btnMatrix.classList.remove('active');
        btnGallery.classList.remove('active');
        btnAnalytics.classList.remove('active');

        // 3. Handle Container & Nav resets
        mainContainer.classList.remove('matrix-view-active');
        if (internalNav) internalNav.classList.add('hidden-view');

        // 4. STOP ANIMATION (Safety check so we don't have ghosts running)
        if (typeof animationId !== 'undefined' && animationId) {
            cancelAnimationFrame(animationId);
        }

        // 5. Determine Target View & Button
        let targetView, targetBtn;

        if (mode === 'matrix') {
            targetView = viewMatrix;
            targetBtn = btnMatrix;
            mainContainer.classList.add('matrix-view-active');
        } else if (mode === 'gallery') {
            targetView = viewGallery;
            targetBtn = btnGallery;
        } else if (mode === 'analytics') {
            targetView = viewAnalytics;
            targetBtn = btnAnalytics;
        } else { // Default to 'card'
            targetView = viewCards;
            targetBtn = btnCard;
            if (internalNav) internalNav.classList.remove('hidden-view');
        }

        // 6. Make the view visible NOW, before running logic that checks visibility
        targetView.classList.remove('hidden-view');
        targetBtn.classList.add('active');

        // 7. Restart Animation (Only applies if we just switched to Analytics)
        if (mode === 'analytics') {
            const carouselView = document.getElementById('view-carousel');
            // Check if playing AND carousel sub-view is the active one (not Orbit)
            if (typeof isPlaying !== 'undefined' && isPlaying && carouselView && carouselView.style.display !== 'none') {
                window.animateCarousel();
            }
        }
    };



















    // === JUMP TO CARD FUNCTION ===
    window.jumpToCard = function (targetId) {
        // 1. PREVENT DEFAULT LINK BEHAVIOR
        // This stops the <a href="#"> from resetting the URL to #
        if (window.event) {
            window.event.preventDefault();
            window.event.stopPropagation();
        }

        // 2. UPDATE URL TO #CARD
        if (history.pushState) {
            history.pushState(null, null, '#card');
        } else {
            window.location.hash = 'card';
        }

        // 3. SWITCH VIEW
        switchView('card');

        // 4. FIND & HIGHLIGHT TARGET
        const targetElement = document.getElementById(targetId);

        if (targetElement) {
            // Expand Accordion if needed
            const parentSection = targetElement.closest('.collapsible-section-content');
            if (parentSection) {
                parentSection.classList.add('expanded');
                const sectionId = parentSection.id;
                const triggerBtn = document.querySelector(`.section-trigger[data-target="${sectionId}"]`);
                if (triggerBtn) {
                    triggerBtn.classList.add('expanded');
                    triggerBtn.setAttribute('aria-expanded', 'true');
                    const itemCount = parentSection.querySelectorAll('.showcase-item').length;
                    triggerBtn.setAttribute('data-tooltip', `Collapse (${itemCount} Items)`);
                }
            }

            // Scroll & Highlight
            setTimeout(() => {
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

                targetElement.classList.remove('highlight-card');
                void targetElement.offsetWidth; // Trigger reflow
                targetElement.classList.add('highlight-card');

                setTimeout(() => {
                    targetElement.classList.remove('highlight-card');
                }, 6000);
            }, 300);
        } else {
            console.warn(`Target card with ID '${targetId}' not found.`);
        }
    };

























    // ================= GALLERY LOGIC ================= 
    const grid = document.getElementById('gallery-grid');
    const filterType = document.getElementById('gallery-filter-type');

    function setupToggleButton(id, callback) {
        const btn = document.getElementById(id);
        if (!btn) return;
        const track = btn.querySelector('.toggle-track');
        const label = btn.querySelector('.toggle-label');
        const textOff = btn.getAttribute('data-off');
        const textOn = btn.getAttribute('data-on');

        btn.addEventListener('click', () => {
            const isActive = track.classList.toggle('active');
            btn.classList.toggle('active-state', isActive);
            label.textContent = isActive ? textOn : textOff;
            callback(isActive);
        });
    }

    setupToggleButton('btn-titles', (isActive) => {
        if (isActive) grid.classList.add('show-titles');
        else grid.classList.remove('show-titles');
    });

    setupToggleButton('btn-links', (isActive) => {
        if (isActive) grid.classList.add('show-links');
        else grid.classList.remove('show-links');
    });

    setupToggleButton('btn-stats', (isActive) => {
        // Target the actual ID of your custom dropdown wrapper
        const galleryMultiSelect = document.getElementById('gallery-multiselect');

        if (isActive) {
            grid.classList.add('stats-mode');

            // Apply the CSS class to visually and functionally disable it
            if (galleryMultiSelect) {
                galleryMultiSelect.classList.add('disabled');
                galleryMultiSelect.classList.remove('open'); // Force close if open
            }
        } else {
            grid.classList.remove('stats-mode');

            // Remove the CSS class to re-enable it
            if (galleryMultiSelect) {
                galleryMultiSelect.classList.remove('disabled');
            }
        }
        window.filterGallery();
    });





    // SLIDER
    const slider = document.getElementById('size-slider');
    const root = document.documentElement;
    function updateSliderLogic() {
        if (!slider) return;
        const val = parseInt(slider.value);
        const min = parseInt(slider.min);
        const max = parseInt(slider.max);
        root.style.setProperty('--grid-item-size', val + 'px');
        const percent = (val - min) / (max - min);
        const scale = 0.8 + (percent * 0.7);
        root.style.setProperty('--thumb-scale', scale);
    }
    if (slider) {
        updateSliderLogic();
        slider.addEventListener('input', updateSliderLogic);

        // SLIDER SENSITIVITY LOGIC
        // === Store width to prevent reset on mobile scroll ===
        let lastWidth = window.innerWidth;

        function adjustSliderRange() {
            const slider = document.getElementById('size-slider');
            if (!slider) return;

            // === Ignore vertical resizes (scrolling address bar) ===
            const currentWidth = window.innerWidth;
            if (currentWidth === lastWidth) return;
            lastWidth = currentWidth;

            if (window.innerWidth <= 768) {
                slider.min = 60;
                slider.max = 180;
                slider.value = 90;
            } else {
                slider.min = 75;
                slider.max = 400;
                slider.value = 200;
            }

            updateSliderLogic();
        }

        // Run this when the page loads (Manually force it once)
        // We temporarily reset lastWidth to 0 to ensure the initial load runs
        const tempWidth = lastWidth;
        lastWidth = 0;
        adjustSliderRange();
        lastWidth = tempWidth; // Restore it

        // Run this if the user rotates the phone or resizes the window
        window.addEventListener('resize', adjustSliderRange);
    }





    // FILTER & SORT
    window.filterGallery = function () {
        const searchInput = document.getElementById('gallery-search').value.toLowerCase();
        const searchTerms = searchInput.split(',').map(term => term.trim()).filter(term => term.length > 0);

        // --- 1. MULTI-SELECT LOGIC ---
        const checkboxes = document.querySelectorAll('#gallery-multiselect input[type="checkbox"]');
        const selectedTypes = Array.from(checkboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value.toLowerCase());

        // Update Dropdown UI Text
        const triggerText = document.getElementById('gallery-trigger-text');
        if (triggerText) {
            if (selectedTypes.length === checkboxes.length) {
                triggerText.innerText = "All Types";
            } else if (selectedTypes.length === 0) {
                triggerText.innerText = "None";
            } else if (selectedTypes.length === 1) {
                triggerText.innerText = selectedTypes[0].charAt(0).toUpperCase() + selectedTypes[0].slice(1);
            } else {
                triggerText.innerText = selectedTypes.length + " Selected";
            }
        }

        // --- 2. FILTERING LOGIC ---
        const statsBtn = document.querySelector('#btn-stats .toggle-track');
        const isStatsMode = statsBtn && statsBtn.classList.contains('active');
        const items = document.querySelectorAll('#gallery-grid .gallery-item');
        const grid = document.getElementById('gallery-grid');

        let visibleCount = 0;

        items.forEach(item => {
            const titleEl = item.querySelector('.gallery-title-link');
            const title = titleEl ? titleEl.innerText.toLowerCase().trim() : "";
            const type = item.getAttribute('data-type').toLowerCase();
            const year = item.getAttribute('data-year') || "";
            const isStatsCard = item.classList.contains('stats-card');
            let shouldShow = false;

            if (isStatsMode) {
                // In stats mode, only show the stats card (not searchable by tag)
                if (!isStatsCard) shouldShow = false;
                else shouldShow = searchTerms.length === 0 || searchTerms.some(term => title.includes(term));
            } else {
                // In normal mode, hide stats card, filter others
                if (isStatsCard) shouldShow = false;
                else {
                    const matchesSearch = searchTerms.length === 0 || searchTerms.some(term =>
                        title.includes(term) || year.includes(term)
                    );
                    const matchesType = selectedTypes.length > 0 && selectedTypes.some(sel => type.includes(sel));
                    shouldShow = (matchesSearch && matchesType);
                }
            }

            if (shouldShow) {
                item.style.display = 'flex';
                visibleCount++;
            } else {
                item.style.display = 'none';
            }
        });

        // --- 3. NO RESULTS LOGIC & 4. UPDATE TOOLTIP
        let noResults = document.getElementById('gallery-no-results');
        if (visibleCount === 0) {
            if (!noResults) {
                noResults = document.createElement('div');
                noResults.id = 'gallery-no-results';
                noResults.style.gridColumn = "1 / -1";
                noResults.style.textAlign = "center";
                noResults.style.padding = "40px 20px";
                noResults.style.color = "#ff6b6b";
                noResults.style.fontSize = "1em";
                noResults.style.letterSpacing = "0.5px";
                noResults.innerHTML = `<i class="fas fa-ghost" style="font-size: 1.5em; margin-bottom: 10px; display: block;"></i> No projects found matching criteria`;
                grid.appendChild(noResults);
            }
            noResults.style.display = "block";
        } else {
            if (noResults) {
                noResults.style.display = "none";
            }
        }
        const galleryTotalIcon = document.getElementById('gallery-total-icon');
        if (galleryTotalIcon) {
            const isDefaultState = (searchInput === "" && selectedTypes.length === checkboxes.length);
            if (isDefaultState && !isStatsMode) {
                const totalItems = document.querySelectorAll('#gallery-grid .gallery-item:not(.stats-card)').length;
                galleryTotalIcon.setAttribute('data-tooltip', 'Total: ' + totalItems);
            } else {
                galleryTotalIcon.setAttribute('data-tooltip', 'Showing: ' + visibleCount);
            }
        }
    };


















    // =============== SORTING LOGIC (3-WAY & 4-WAY) ===============

    // Capture original order AND set initial count on load

    // 1. Matrix View Init
    const tbody = document.getElementById("matrix-table-body");
    if (tbody) {
        originalRows = Array.from(tbody.rows);
        const countIcon = document.getElementById("total-count-icon");
        if (countIcon) {
            countIcon.setAttribute('data-tooltip', `Total: ${originalRows.length}`);
        }
    }
    // 2. Gallery View Init
    const galleryGrid = document.getElementById("gallery-grid");
    if (galleryGrid) {
        // Capture items excluding stats card
        originalGalleryItems = Array.from(galleryGrid.querySelectorAll('.gallery-item:not(.stats-card)'));
        const totalGalleryItems = originalGalleryItems.length;
        const galleryIcon = document.getElementById("gallery-total-icon");
        if (galleryIcon) {
            galleryIcon.setAttribute('data-tooltip', `Total: ${totalGalleryItems}`);
        }
    }





    // --- GALLERY SORT FUNCTION (4-State) ---
    window.sortGallery = function (criteria) {
        const gridContainer = document.getElementById('gallery-grid');
        if (!gridContainer) return;

        const statsCard = gridContainer.querySelector('.stats-card');

        // Select Buttons and Icons
        const btnTitle = document.getElementById('btn-sort-title');
        const btnType = document.getElementById('btn-sort-type');
        const iconTitle = document.getElementById('sort-icon-title');
        const iconType = document.getElementById('sort-icon-type');

        // 1. Reset the "Other" column
        if (criteria === 'title') {
            gallerySortState.type = 0;
            if (iconType) iconType.className = "fas fa-sort";
            if (btnType) btnType.title = "Sort by Type";
        } else {
            gallerySortState.title = 0;
            if (iconTitle) iconTitle.className = "fas fa-sort";
            if (btnTitle) btnTitle.title = "Sort by Name";
        }

        // 2. Cycle State: 0 (Def) -> 1 (A-Z) -> 2 (Z-A) -> 3 (Rev) -> 0
        gallerySortState[criteria] = (gallerySortState[criteria] + 1) % 4;
        const currentState = gallerySortState[criteria];

        // Determine which controls to update
        const activeIcon = criteria === 'title' ? iconTitle : iconType;
        const activeBtn = criteria === 'title' ? btnTitle : btnType;

        let sortedItems = [];

        // 3. Sorting Logic
        if (currentState === 0) {
            // Default Order
            sortedItems = [...originalGalleryItems];
            if (activeIcon) activeIcon.className = "fas fa-sort";
            if (activeBtn) activeBtn.title = criteria === 'title' ? "Sort by Name" : "Sort by Type";

        } else if (currentState === 1) {
            // Ascending (A-Z)
            sortedItems = [...originalGalleryItems].sort((a, b) => {
                const valA = a.getAttribute(`data-${criteria}`).toLowerCase();
                const valB = b.getAttribute(`data-${criteria}`).toLowerCase();
                return valA.localeCompare(valB);
            });
            if (activeIcon) activeIcon.className = "fas fa-sort-up";
            if (activeBtn) activeBtn.title = "Ascending (A-Z)";

        } else if (currentState === 2) {
            // Descending (Z-A)
            sortedItems = [...originalGalleryItems].sort((a, b) => {
                const valA = a.getAttribute(`data-${criteria}`).toLowerCase();
                const valB = b.getAttribute(`data-${criteria}`).toLowerCase();
                return valB.localeCompare(valA);
            });
            if (activeIcon) activeIcon.className = "fas fa-sort-down";
            if (activeBtn) activeBtn.title = "Descending (Z-A)";

        } else {
            // Reverse Default (Arrow Up)
            sortedItems = [...originalGalleryItems].slice().reverse();
            if (activeIcon) activeIcon.className = "fas fa-arrow-up";
            if (activeBtn) activeBtn.title = "Reverse Default";
        }

        // 4. Re-render DOM
        gridContainer.innerHTML = '';
        // Add Stats Card First (if it exists)
        if (statsCard) gridContainer.appendChild(statsCard);
        // Add Sorted Items
        sortedItems.forEach(item => gridContainer.appendChild(item));

        // Re-apply filter in case user is searching
        if (typeof window.filterGallery === 'function') {
            window.filterGallery();
        }
    };






    // === JUMP TO GALLERY FUNCTION ===
    window.jumpToGallery = function (dataTitle) {
        // 1. PREVENT DEFAULT BEHAVIOR
        if (window.event) {
            window.event.preventDefault();
            window.event.stopPropagation();
        }

        // 2. UPDATE URL TO #GALLERY
        if (history.pushState) {
            history.pushState(null, null, '#gallery');
        } else {
            window.location.hash = 'gallery';
        }

        // 3. SWITCH VIEW
        switchView('gallery');

        // 4. === NEW: FORCE "SEE PROJECTS" MODE ===
        // If "See Stats" is active, turn it off so we can see the project cards
        const btnStats = document.getElementById('btn-stats');
        if (btnStats) {
            const track = btnStats.querySelector('.toggle-track');
            const label = btnStats.querySelector('.toggle-label');
            const grid = document.getElementById('gallery-grid');
            const galleryMultiSelect = document.getElementById('gallery-multiselect');

            // Check if it's currently active
            if (track && track.classList.contains('active')) {
                // A. Reset Toggle Visuals
                track.classList.remove('active');
                btnStats.classList.remove('active-state');

                // B. Reset Label Text (to "SEE STATS")
                if (label) label.textContent = btnStats.getAttribute('data-off');

                // C. Remove Stats Mode Class (Reveals Projects)
                if (grid) grid.classList.remove('stats-mode');

                // D. Re-enable Dropdown
                if (galleryMultiSelect) galleryMultiSelect.classList.remove('disabled');
            }
        }

        // 5. RESET FILTERS (Search & Dropdown)
        const searchInput = document.getElementById('gallery-search');
        if (searchInput) searchInput.value = "";

        const checkboxes = document.querySelectorAll('#gallery-multiselect input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = true);

        const triggerText = document.getElementById('gallery-trigger-text');
        if (triggerText) triggerText.innerText = "All Types";

        // 6. APPLY FILTER (Refreshes the view)
        if (typeof window.filterGallery === 'function') {
            window.filterGallery();
        }

        // 7. FIND & HIGHLIGHT TARGET
        const targetItem = document.querySelector(`.gallery-item[data-title="${dataTitle}"]`);

        if (targetItem) {
            setTimeout(() => {
                targetItem.scrollIntoView({ behavior: 'smooth', block: 'center' });

                // Remove old highlights
                targetItem.classList.remove('highlight-card');
                targetItem.classList.remove('highlight-gallery');

                // Trigger Reflow
                void targetItem.offsetWidth;

                // Add RED Neon Class
                targetItem.classList.add('highlight-gallery');

                // Wait 6 Seconds
                setTimeout(() => {
                    targetItem.classList.remove('highlight-gallery');
                }, 4000);
            }, 300);
        } else {
            console.warn(`Gallery item with data-title '${dataTitle}' not found.`);
        }
    };











    window.handleSort = function (colType) {
        const table = document.getElementById("matrix-table-body");
        const iconTitle = document.getElementById("icon-sort-project");
        const iconType = document.getElementById("icon-sort-type");

        // Helper: Bulletproof Text Extractor
        const getText = (row, index) => {
            const cell = row.cells[index];

            // If sorting by Title (Column 1)
            if (index === 1) {
                // Find the first Link <a> tag in the cell
                const link = cell.getElementsByTagName('a')[0];
                if (link) {
                    // Use innerText to respect CSS (ignores hidden text) and trim whitespace
                    return link.innerText.trim().toLowerCase();
                }
            }

            // Fallback for Type column or if no link found
            return cell.innerText.trim().toLowerCase();
        };

        // Reset the "other" column icons
        if (colType === 'title') {
            sortState.type = 0;
            iconType.className = "fas fa-sort";
            iconType.removeAttribute("title");
        } else {
            sortState.title = 0;
            iconTitle.className = "fas fa-sort";
            iconTitle.removeAttribute("title");
        }

        // Cycle State: 0 (Default) -> 1 (A-Z) -> 2 (Z-A) -> 3 (Reverse) -> 0
        sortState[colType] = (sortState[colType] + 1) % 4;

        const currentState = sortState[colType];
        const activeIcon = colType === 'title' ? iconTitle : iconType;
        const cellIndex = colType === 'title' ? 1 : 2;

        // Clear current rows from DOM
        table.innerHTML = "";
        let sortedRows;

        if (currentState === 0) {
            // 1. Default (Original Order)
            sortedRows = originalRows;
            activeIcon.className = "fas fa-sort";
            activeIcon.title = "Default Order";
        } else if (currentState === 1) {
            // 2. Ascending (A-Z)
            sortedRows = [...originalRows].sort((a, b) => {
                const aText = getText(a, cellIndex);
                const bText = getText(b, cellIndex);
                return aText.localeCompare(bText);
            });
            activeIcon.className = "fas fa-sort-up";
            activeIcon.title = "Ascending (A-Z)";
        } else if (currentState === 2) {
            // 3. Descending (Z-A)
            sortedRows = [...originalRows].sort((a, b) => {
                const aText = getText(a, cellIndex);
                const bText = getText(b, cellIndex);
                return bText.localeCompare(aText);
            });
            activeIcon.className = "fas fa-sort-down";
            activeIcon.title = "Descending (Z-A)";
        } else {
            // 4. Reverse Default (Bottom-to-Top)
            sortedRows = [...originalRows].reverse();
            activeIcon.className = "fas fa-arrow-up";
            activeIcon.title = "Reverse Default";
        }

        // Re-append sorted rows
        sortedRows.forEach(row => table.appendChild(row));
    };






    // =========================== ANALYTICS SEARCH & FILTER LOGIC  ========================== 

    // 1. Function to Toggle KPI Card Selection
    window.toggleKpiFilter = function (card) {
        // Toggle the visual class
        card.classList.toggle('active-filter');

        // Run the main filter function immediately
        runAnalyticsFilter();
    };

    // 2. Main Filter Function
    window.runAnalyticsFilter = function () {
        const searchInput = document.querySelector('.analytics-search-input');
        const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : "";
        const searchTerms = searchVal.split(',').map(term => term.trim()).filter(term => term.length > 0);

        const activeKpiCards = document.querySelectorAll('.kpi-row .kpi-card.active-filter');
        const activeCategories = Array.from(activeKpiCards).map(card => card.getAttribute('data-filter'));

        // Initialize counters for VISIBLE items
        let visibleArticles = 0;
        let visibleCode = 0;
        let visibleBooks = 0;

        const checkMatch = (elementText, elementCategory, elementYear) => {
            // 1. Text Search
            const matchesText = searchTerms.length === 0 || searchTerms.some(term =>
                elementText.includes(term) || (elementYear && elementYear.includes(term))
            );

            // 2. Category Filter Logic
            let matchesCategory = false;

            if (activeCategories.length === 0) {
                matchesCategory = true; // Show all if no filter
            } else {
                // A. CODE FILTER: Only show 'code'
                if (activeCategories.includes('code') && elementCategory === 'code') {
                    matchesCategory = true;
                }

                // B. ARTICLE FILTER: Show 'article' AND 'book-article'
                // (Note: We do NOT show 'code' here visually)
                if (activeCategories.includes('article')) {
                    if (elementCategory === 'article' || elementCategory === 'book-article') {
                        matchesCategory = true;
                    }
                }

                // C. BOOK FILTER: Show 'book' AND 'book-article'
                if (activeCategories.includes('book')) {
                    if (elementCategory === 'book' || elementCategory === 'book-article') {
                        matchesCategory = true;
                    }
                }
            }

            return matchesText && matchesCategory;
        };







        // --- A. Filter CAROUSEL Cards ---
        const cards = document.querySelectorAll('.carousel-card');
        cards.forEach(card => {
            const text = card.innerText.toLowerCase();
            const category = card.getAttribute('data-category');
            const year = card.getAttribute('data-year');

            if (checkMatch(text, category, year)) {
                card.style.opacity = '1';
                card.style.display = 'flex';
                card.style.transform = card.style.transform.replace('scale(0)', '');
                card.style.pointerEvents = 'auto';

                // Increment Visible Counters

                // 1. Visible Code (Strict)
                if (category === 'code') visibleCode++;

                // 2. Visible Articles (Standard + Book Articles + Open Source if visible via Code filter)
                // If 'code' is visible (because we are in Code filter), it counts as a visible article contextually
                if (category === 'code') visibleArticles++;
                if (category === 'article' || category === 'book-article') visibleArticles++;

                // 3. Visible Books (Strictly the main book)
                if (category === 'book') visibleBooks++;

            } else {
                card.style.opacity = '0';
                card.style.display = 'none';
                card.style.pointerEvents = 'none';
            }
        });

        // --- B. Filter ORBIT Planets ---
        const planets = document.querySelectorAll('.planet');
        planets.forEach(planet => {
            const text = planet.innerText.toLowerCase();
            const category = planet.getAttribute('data-category');
            const year = planet.getAttribute('data-year');
            if (checkMatch(text, category, year)) {
                planet.style.display = 'flex';
            } else {
                planet.style.display = 'none';
            }
        });

        // --- C. Fraction Display Logic ---
        const isSearchActive = searchTerms.length > 0;
        const totalKpiCategories = document.querySelectorAll('.kpi-row .kpi-card').length;
        const numActiveCategories = activeCategories.length;
        const showFraction = isSearchActive || (numActiveCategories > 0 && numActiveCategories < totalKpiCategories);

        // --- D. UPDATE KPI CARDS ---
        const articlesEl = document.getElementById('kpi-articles');
        const openSourceEl = document.getElementById('kpi-opensource');
        const booksEl = document.getElementById('kpi-books');

        if (articlesEl) {
            articlesEl.innerHTML = showFraction
                ? `${visibleArticles}<span class="kpi-total-fraction">/${totalArticles}</span>`
                : visibleArticles;
        }
        if (openSourceEl) {
            openSourceEl.innerHTML = showFraction
                ? `${visibleCode}<span class="kpi-total-fraction">/${totalCode}</span>`
                : visibleCode;
        }
        if (booksEl) {
            booksEl.innerHTML = showFraction
                ? `${visibleBooks}<span class="kpi-total-fraction">/${totalBooks}</span>`
                : visibleBooks;
        }

        // --- E. No Results Logic ---
        const orbitView = document.getElementById('view-orbit');
        const isOrbitActive = orbitView && orbitView.style.display !== 'none';
        const anyVisible = Array.from(cards).some(c => c.style.display !== 'none');

        let msg = document.getElementById('analytics-no-results');
        const glassContainer = document.querySelector('.analytics-glass-container');

        if (!anyVisible) {
            if (!msg) {
                msg = document.createElement('div');
                msg.id = 'analytics-no-results';
                msg.style.position = "absolute"; msg.style.top = "50%"; msg.style.left = "50%"; msg.style.transform = "translate(-50%, -50%)"; msg.style.textAlign = "center"; msg.style.width = "100%"; msg.style.zIndex = "100"; msg.style.color = "#ff6b6b"; msg.style.fontSize = "1em"; msg.style.letterSpacing = "0.5px";
                msg.innerHTML = `<i class="fas fa-ghost" style="font-size: 4em; margin-bottom: 20px; display: block;"></i> No projects found matching criteria`;
                glassContainer.appendChild(msg);
            }
            msg.style.display = "block";
            if (isOrbitActive) document.querySelector('.orbit-container').style.opacity = '0';
            else document.querySelector('.carousel-scene').style.opacity = '0';
        } else {
            if (msg) msg.style.display = "none";
            if (document.querySelector('.orbit-container')) document.querySelector('.orbit-container').style.opacity = '1';
            if (document.querySelector('.carousel-scene')) document.querySelector('.carousel-scene').style.opacity = '1';
            updateCarouselLayout();
            updateOrbitLayout();
        }
    };

    // Attach Event Listener to Search Input
    const analyticsSearchInput = document.querySelector('.analytics-search-input');
    if (analyticsSearchInput) {
        analyticsSearchInput.addEventListener('keyup', runAnalyticsFilter);

        // Override switch view to re-run filter so state persists
        const originalSwitchAnalytics = window.switchAnalyticsView;
        window.switchAnalyticsView = function (viewName) {
            originalSwitchAnalytics(viewName);
            runAnalyticsFilter();
        };
    }











    // Run the filter once on load to set initial KPI totals
    runAnalyticsFilter();

    window.filterTable = function () {
        const searchInput = document.getElementById("filter-project").value.toLowerCase();
        // Split search query by comma and trim whitespace from each term
        const searchTerms = searchInput.split(',').map(term => term.trim()).filter(term => term.length > 0);

        const tbody = document.getElementById("matrix-table-body");
        const rows = Array.from(tbody.getElementsByTagName("tr")).filter(r => r.id !== 'no-results-row');
        const countIcon = document.getElementById("total-count-icon");

        // 1. Get Selected Types
        const checkboxes = document.querySelectorAll('#type-multiselect input[type="checkbox"]');
        const selectedTypes = Array.from(checkboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value.toLowerCase());

        // 2. Update Dropdown Text UI (no changes here)
        const triggerText = document.getElementById('type-trigger-text');
        if (triggerText) {
            if (selectedTypes.length === checkboxes.length) {
                triggerText.innerText = "All Types";
            } else if (selectedTypes.length === 0) {
                triggerText.innerText = "None";
            } else if (selectedTypes.length === 1) {
                triggerText.innerText = selectedTypes[0].charAt(0).toUpperCase() + selectedTypes[0].slice(1);
            } else {
                triggerText.innerText = `${selectedTypes.length} Selected`;
            }
        }

        let visibleCount = 0;

        // 3. Filter Rows
        for (let row of rows) {
            const projectText = row.cells[1].innerText.toLowerCase();
            const typeText = row.cells[2].innerText.toLowerCase();
            // Get the year from the data attribute we will add
            const yearText = row.getAttribute('data-year') || "";

            // Check if the row's text matches ANY of the search terms
            // If there are no search terms, it's a match
            const matchProject = searchTerms.length === 0 || searchTerms.some(term =>
                projectText.includes(term) || yearText.includes(term)
            );

            const matchType = selectedTypes.length > 0 && selectedTypes.some(type => typeText.includes(type));

            if (matchProject && matchType) {
                row.style.display = "";
                visibleCount++;
            } else {
                row.style.display = "none";
            }
        }

        // 4. Handle "No Results" Row 
        let noResultsRow = document.getElementById('no-results-row');
        if (visibleCount === 0) {
            if (!noResultsRow) {
                noResultsRow = document.createElement('tr');
                noResultsRow.id = 'no-results-row';
                noResultsRow.innerHTML = `<td colspan="6" style="text-align: center; padding: 40px 20px; color: #ff6b6b; font-size: 1em; letter-spacing: 0.5px;"><i class="fas fa-ghost" style="font-size: 1.5em; margin-bottom: 10px; display: block;"></i> No projects found matching criteria</td>`;
                tbody.appendChild(noResultsRow);
            } else {
                noResultsRow.style.display = "";
            }
        } else {
            if (noResultsRow) {
                noResultsRow.remove();
            }
        }

        // Update the tooltip on the icon
        if (countIcon) {
            countIcon.setAttribute('data-tooltip', `Showing: ${visibleCount}`);
        }
    };








    // Start Animation immediately (it will run in background or when tab opens)
    window.animateCarousel();


    // FORCE DEFAULT VIEW TO CAROUSEL
    switchAnalyticsView('carousel');





    // FUNCTION TO READ THE URL HASH AND SWITCH THE VIEW
    function handleUrlHash() {
        const hash = window.location.hash.substring(1); // removes the '#'

        // 1. Handle Deep Links for Analytics Sub-views
        if (hash === 'analytics-orbit') {
            switchView('analytics');       // Open main Analytics tab
            switchAnalyticsView('orbit');  // Switch internal view to Orbit
        }
        else if (hash === 'analytics-carousel') {
            switchView('analytics');       // Open main Analytics tab
            switchAnalyticsView('carousel');// Switch internal view to Carousel
        }
        // 2. Handle Standard Views (#gallery, #matrix, #card, #analytics)
        else {
            switchView(hash || 'card');

            // If the user just clicked "Analytics" main button, force default (Carousel)
            if (hash === 'analytics') {
                switchAnalyticsView('carousel');
            }
        }
    }
    // Attach click events to buttons that CHANGE THE HASH
    btnCard.addEventListener('click', () => { window.location.hash = 'card'; });
    btnMatrix.addEventListener('click', () => { window.location.hash = 'matrix'; });
    btnGallery.addEventListener('click', () => { window.location.hash = 'gallery'; });
    btnAnalytics.addEventListener('click', () => { window.location.hash = 'analytics'; });

    // Listen for hash changes (e.g., browser back/forward buttons) to update the view
    window.addEventListener('hashchange', handleUrlHash);

    // Initial load check to show the correct view based on the URL
    handleUrlHash();






});