let currentZoom = 1;
let isDragging = false;
let startX = 0,
    startY = 0;
let currentTranslateX = 0,
    currentTranslateY = 0;

const ZOOM_STEP = 0.2;
const MIN_ZOOM = 0.4;
const MAX_ZOOM = 5.0;

let originalRows = [];
let sortState = { title: 0, type: 0 };

let originalGalleryItems = [];
let gallerySortStates = {
    grid: { title: 0, type: 0 },
    metrics: { title: 0, type: 0 },
    updates: { title: 0, type: 0 },
};

let currentShareUrl = "";
let currentShareTitle = "";
let currentShareType = "project";
let currentSystemTitle = "";
let currentSystemText = "";
let activeShareBtn = null;
let currentShareObjectLabel = "";
const shareMenu = document.getElementById("share-menu-popover");

let isDockNavigating = false;
let lightboxReturnTarget = null;

let lastViewBeforeAbout = "card";

function killTooltip(triggerBtn = null) {
    const tooltip = document.getElementById("global-tooltip");

    if (tooltip && tooltip.matches(":popover-open")) {
        try {
            tooltip.hidePopover();
        } catch (e) { }
    }

    if (tooltip) {
        tooltip.style.top = "";
        tooltip.style.left = "";
        tooltip.style.opacity = "";
        tooltip.textContent = "";
    }

    if (window.updateLoop) {
        cancelAnimationFrame(window.updateLoop);
    }

    if (triggerBtn) {
        triggerBtn.classList.add("interaction-cooldown");
        triggerBtn.addEventListener(
            "mouseleave",
            () => {
                triggerBtn.classList.remove("interaction-cooldown");
            },
            { once: true },
        );
    }

    const currentHash = window.location.hash;
    const lightboxes = [
        "#stream-lightbox",
        "#registry-lightbox",
        "#media-lightbox",
        "#dashboard-lightbox",
    ];

    if (lightboxes.includes(currentHash)) {
        const activeBtn = document.querySelector(".view-btn.active");

        const activeView = activeBtn?.getAttribute("href") || "#card";
        history.pushState(null, null, activeView);
    }
}

window.toggleAboutFromHeader = function (e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    const currentHash = window.location.hash;

    if (currentHash === "#about") {
        switchView(lastViewBeforeAbout);
    } else {
        switchView("about");
    }
};

function triggerLogoWink() {
    const flipper = document.querySelector(".intro-flipper");
    if (!flipper) return;

    flipper.classList.add("force-flipper-wink");

    setTimeout(() => {
        flipper.classList.remove("force-flipper-wink");
    }, 600);
}

setTimeout(triggerLogoWink, 700);

function toggleBio() {
    const button = document.getElementById("bio-section-trigger");
    const contentWrapper = document.getElementById("bio-content-wrapper");

    if (button && contentWrapper) {
        const isOpening = contentWrapper.classList.contains("collapsed");

        contentWrapper.classList.toggle("collapsed");

        contentWrapper.classList.toggle("card-expanded");

        button.classList.toggle("card-expanded");

        if (isOpening) {
            setTimeout(() => {
                if (typeof triggerLogoWink === "function") triggerLogoWink();
            }, 300);
        }

        sessionStorage.setItem("bioState", isOpening ? "expanded" : "collapsed");
    }
}

function initializeHoverPopover(trigger, popover) {
    if (!trigger || !popover) {
        console.error("Popover trigger or element not found.");
        return;
    }

    popover.addEventListener("toggle", (event) => {
        if (event.newState === "open") {
            const triggerRect = trigger.getBoundingClientRect();

            const scrollY = window.scrollY || window.pageYOffset;
            const scrollX = window.scrollX || window.pageXOffset;

            let top = triggerRect.bottom + scrollY + 5;
            let left = triggerRect.left + scrollX;

            popover.style.top = `${top}px`;
            popover.style.left = `${left}px`;

            const popoverRect = popover.getBoundingClientRect();
            if (popoverRect.right > window.innerWidth - 10) {
                popover.style.left = `${window.innerWidth - popoverRect.width - 10 + scrollX}px`;
            }
        }
    });
}

let currentLightboxElement = null;
let visibleGalleryItems = [];
let currentItemIndex = -1;

function fullGalleryReset() {
    currentZoom = 1;
    currentTranslateX = 0;
    currentTranslateY = 0;
    isDragging = false;

    const img = document.getElementById("gallery-image");
    if (img) {
        img.style.transform = "translate(0px, 0px) scale(1)";
        img.style.cursor = "pointer";
        img.style.transition = "transform 0.3s ease";
    }

    const modal = document.getElementById("gallery-modal");
    const caption = document.getElementById("gallery-lightbox-caption");
    const uiBtn = document.getElementById("gallery-ui-toggle-btn");

    if (modal) {
        modal.classList.remove("auto-hide-ui");
        modal.classList.remove("force-show-ui");
        modal.classList.remove("video-mode");
    }
    if (caption) {
        caption.classList.remove("is-zoomed");
        caption.classList.remove("caption-hidden");
    }

    const btnIn = document.getElementById("gallery-zoom-in");
    const btnOut = document.getElementById("gallery-zoom-out");
    if (btnIn) btnIn.classList.remove("active-zoom-state");
    if (btnOut) btnOut.classList.remove("active-zoom-state");

    if (uiBtn) {
        uiBtn.setAttribute("data-tooltip", "Hide Navigation");
        const icon = uiBtn.querySelector("i");
        if (icon) icon.className = "fas fa-eye";
    }

    const captionBtn = document.getElementById("gallery-caption-toggle-btn");
    if (captionBtn) {
        captionBtn.classList.remove("active-state");
        captionBtn.classList.remove("interaction-cooldown");
        const icon = captionBtn.querySelector("i");
        if (icon) icon.className = "fas fa-comment-slash";
        captionBtn.setAttribute("data-tooltip", "Hide Caption");
    }
}

function openLightbox(element) {
    const modal = document.getElementById("gallery-modal");
    if (!modal) return;

    const mediaWrapper = document.getElementById("gallery-media");
    const modalImg = document.getElementById("gallery-image");
    const modalVideo = document.getElementById("gallery-video");
    const captionText = document.getElementById("gallery-lightbox-caption");
    const linksContainer = document.getElementById("gallery-link-island");

    currentLightboxElement = element;

    visibleGalleryItems = Array.from(
        document.querySelectorAll(".gallery-item"),
    ).filter((item) => {
        const style = window.getComputedStyle(item);
        return style.display !== "none" && item.querySelector(".gallery-img");
    });
    currentItemIndex = visibleGalleryItems.indexOf(
        element.closest(".gallery-item"),
    );

    const prevBtn = document.getElementById("gallery-nav-prev");
    const nextBtn = document.getElementById("gallery-nav-next");
    if (visibleGalleryItems.length > 1) {
        if (prevBtn) prevBtn.style.display = "flex";
        if (nextBtn) nextBtn.style.display = "flex";
    } else {
        if (prevBtn) prevBtn.style.display = "none";
        if (nextBtn) nextBtn.style.display = "none";
    }

    fullGalleryReset();

    const currentGalMode =
        document.querySelector(".control-segment.active")?.dataset.mode || "grid";
    const spotBtnsList = document.querySelectorAll(".gallery-spotlight-btn");
    const spotPuckEl = document.getElementById("gallery-spotlight-puck");

    spotBtnsList.forEach((btn) => {
        if (btn.dataset.mode === currentGalMode) {
            btn.classList.add("active");
            const index = parseInt(btn.dataset.index);
            if (spotPuckEl) {
                spotPuckEl.style.transform = `translateY(${index * 50}px)`;
                const colors = { grid: "blue", metrics: "teal", updates: "pink" };
                const theme = colors[currentGalMode];
                spotPuckEl.style.background = `var(--highlight-${theme})`;
                spotPuckEl.style.boxShadow = `0 0 15px var(--highlight-${theme})`;
            }
        } else {
            btn.classList.remove("active");
        }
    });

    if (linksContainer) {
        linksContainer.innerHTML = "";
        const sourceLinksRow = currentLightboxElement
            .closest(".gallery-item")
            .querySelector(".gallery-links-row");
        if (sourceLinksRow) {
            Array.from(sourceLinksRow.children).forEach((originalLink) => {
                const newLink = originalLink.cloneNode(true);
                newLink.classList.remove("tooltip-top", "tooltip-bottom");
                newLink.setAttribute("data-tooltip-position", "top");
                linksContainer.appendChild(newLink);
            });
        }
        linksContainer.style.display =
            linksContainer.children.length > 0 ? "flex" : "none";
    }

    document.body.classList.add("gallery-lightbox-active");
    modal.style.display = "flex";

    const fullSizeUrl = element.getAttribute("data-full-src") || element.src;
    const videoUrl = element.getAttribute("data-video-src");

    if (videoUrl) {
        modalImg.style.display = "none";
        modalVideo.style.display = "block";

        modal.classList.add("video-mode");

        const caption = document.getElementById("gallery-lightbox-caption");
        if (caption) caption.classList.remove("caption-hidden");

        const captionBtn = document.getElementById("gallery-caption-toggle-btn");
        if (captionBtn) {
            captionBtn.classList.remove("active-state");
            captionBtn.querySelector("i").className = "fas fa-comment-slash";
            captionBtn.setAttribute("data-tooltip", "Hide Caption");
        }
        mediaWrapper.style.overflow = "hidden";

        const customRatio = element.getAttribute("data-video-ratio");

        const isShort = videoUrl.includes("shorts/");

        let finalRatio = "16 / 9";
        let isVertical = false;

        if (customRatio) {
            finalRatio = customRatio;

            const parts = customRatio.split("/");
            if (
                parts.length === 2 &&
                parseFloat(parts[0].trim()) < parseFloat(parts[1].trim())
            ) {
                isVertical = true;
            }
        } else if (isShort) {
            finalRatio = "9 / 16";
            isVertical = true;
        }

        mediaWrapper.style.aspectRatio = finalRatio;

        if (isVertical) {
            mediaWrapper.style.height = "100%";
            mediaWrapper.style.width = "auto";
        } else {
            mediaWrapper.style.width = "100%";
            mediaWrapper.style.height = "auto";
        }

        const regExp =
            /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/)([^#&?]*).*/;
        const match = videoUrl.match(regExp);

        if (match && match[2].length === 11) {
            const videoId = match[2];
            modalVideo.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&playsinline=1&rel=0&loop=1&playlist=${videoId}&origin=${window.location.origin}`;
        }
    } else {
        modal.classList.remove("video-mode");

        modalVideo.style.display = "none";
        modalVideo.src = "";
        modalImg.style.display = "block";
        modalImg.src = fullSizeUrl;

        mediaWrapper.style.overflow = "visible";

        mediaWrapper.style.width = "auto";
        mediaWrapper.style.height = "auto";

        if (element.naturalWidth && element.naturalHeight) {
            mediaWrapper.style.aspectRatio = `${element.naturalWidth} / ${element.naturalHeight}`;
        } else {
            mediaWrapper.style.aspectRatio = "auto";
        }
    }

    const captionHTML = element.getAttribute("data-caption") || element.alt;
    let finalCaptionHTML = "";

    const galleryItem = element.closest(".gallery-item");

    const dataType = galleryItem
        ? galleryItem.getAttribute("data-type")
        : element.getAttribute("data-type");

    const badgeMap = {
        "digital-bookshelf": {
            icon: "fas fa-book-open",
            colorClass: "book",
            label: "Digital Bookshelf",
        },

        "open-source": {
            icon: "fas fa-code",
            colorClass: "code",
            label: "Open Source Projects",
        },

        "articles-insights": {
            icon: "fas fa-file-lines",
            colorClass: "article",
            label: "Articles & Insights",
        },
        stats: {
            icon: "fas fa-chart-pie",
            colorClass: "stats",
            label: "Analytics",
        },

        updates: {
            icon: "fas fa-rss",
            colorClass: "update",
            label: "Updates",
        },
    };

    const badgeInfo = badgeMap[dataType];

    if (badgeInfo) {
        finalCaptionHTML = `
            <div class="caption-category-icon ${badgeInfo.colorClass}" data-tooltip="${badgeInfo.label}">
                <i class="${badgeInfo.icon}"></i>
            </div>
            <div class="caption-text-content">
                ${captionHTML}
            </div>
        `;
    } else {
        finalCaptionHTML = `<div class="caption-text-content">${captionHTML}</div>`;
    }

    captionText.innerHTML = finalCaptionHTML;
    const captionAlign = element.getAttribute("data-caption-align");
    if (captionAlign === "left") {
        captionText.classList.add("caption-align-left");
    } else {
        captionText.classList.remove("caption-align-left");
    }
    history.pushState(null, null, "#media-lightbox");
}

function closeLightbox() {
    killTooltip(document.querySelector(".gallery-close-btn"));

    const modal = document.getElementById("gallery-modal");
    if (modal) modal.style.display = "none";
    document.body.classList.remove("gallery-lightbox-active");

    const modalImg = document.getElementById("gallery-image");
    const modalVideo = document.getElementById("gallery-video");

    if (modalImg) modalImg.src = "";
    if (modalVideo) modalVideo.src = "";

    fullGalleryReset();

    if (lightboxReturnTarget) {
        const returnId = lightboxReturnTarget;
        lightboxReturnTarget = null;

        switchView("card");

        setTimeout(() => {
            const targetEl = document.getElementById(returnId);
            if (targetEl) {
                targetEl.scrollIntoView({ behavior: "smooth", block: "center" });

                targetEl.classList.add("highlight-card");
                setTimeout(() => targetEl.classList.remove("highlight-card"), 4000);
            }

            history.pushState(null, null, "#" + returnId);
        }, 50);
    } else {
        history.pushState(null, null, "#gallery");
    }
}

window.showNextItem = function (e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    lightboxReturnTarget = null;

    if (visibleGalleryItems.length <= 1) return;

    currentItemIndex = (currentItemIndex + 1) % visibleGalleryItems.length;
    const nextItem = visibleGalleryItems[currentItemIndex];
    const nextImgElement = nextItem.querySelector(".gallery-img");

    if (nextImgElement) openLightbox(nextImgElement);
};

window.showPrevItem = function (e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }

    lightboxReturnTarget = null;

    if (visibleGalleryItems.length <= 1) return;

    currentItemIndex =
        (currentItemIndex - 1 + visibleGalleryItems.length) %
        visibleGalleryItems.length;
    const prevItem = visibleGalleryItems[currentItemIndex];
    const prevImgElement = prevItem.querySelector(".gallery-img");

    if (prevImgElement) openLightbox(prevImgElement);
};

function initMainLogic() {
    const bioBtn = document.getElementById("bio-section-trigger");
    const bioContent = document.getElementById("bio-content-wrapper");

    if (window.innerWidth <= 768 && bioBtn && bioContent) {
        sessionStorage.setItem("bioState", "collapsed");

        bioContent.style.transition = "none";

        bioBtn.classList.remove("card-expanded");
        bioContent.classList.remove("card-expanded");
        bioContent.classList.add("collapsed");

        bioBtn.setAttribute("aria-expanded", "false");
        bioBtn.setAttribute("data-tooltip", "Show Profile Details");

        void bioContent.offsetWidth;

        setTimeout(() => {
            bioContent.style.transition = "";
        }, 50);
    }

    const profileLogoLink = document.getElementById("header-profile-link");

    if (profileLogoLink) {
        profileLogoLink.addEventListener("click", function (e) {
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;

            e.preventDefault();

            triggerLogoWink();

            if (typeof window.switchView === "function") {
                window.switchView("card");
            }

            const bioBtn = document.getElementById("bio-section-trigger");
            const bioContent = document.getElementById("bio-content-wrapper");

            sessionStorage.removeItem("bioState");

            if (bioBtn && bioContent) {
                if (window.innerWidth <= 768) {
                    bioBtn.classList.remove("card-expanded");
                    bioContent.classList.remove("card-expanded");
                    bioContent.classList.add("collapsed");
                    bioBtn.setAttribute("aria-expanded", "false");
                    bioBtn.setAttribute("data-tooltip", "Show Profile Details");
                } else {
                    bioBtn.classList.add("card-expanded");
                    bioContent.classList.add("card-expanded");
                    bioContent.classList.remove("collapsed");
                    bioBtn.setAttribute("aria-expanded", "true");
                    bioBtn.setAttribute("data-tooltip", "Hide Profile Details");
                }
            }

            window.scrollTo({ top: 0, behavior: "smooth" });

            history.pushState(null, null, window.location.pathname);
        });
    }

    const dockCardObserver = new IntersectionObserver(
        (entries) => {
            if (isDockNavigating) return;
            const cardView = document.getElementById("view-cards");

            if (!cardView || cardView.classList.contains("hidden-view")) return;

            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const id = entry.target.id;

                    const dockItem = document.querySelector(
                        `.dock-sub-item[data-jump="${id}"]`,
                    );
                    if (dockItem) {
                        const group = dockItem.closest(".dock-sub-menu-inner");

                        if (group)
                            group
                                .querySelectorAll(".dock-sub-item")
                                .forEach((el) => el.classList.remove("active"));

                        dockItem.classList.add("active");
                    }
                }
            });
        },
        { rootMargin: "-15% 0px -65% 0px" },
    );

    const cardSections = document.querySelectorAll("#view-cards section[id]");
    cardSections.forEach((section) => dockCardObserver.observe(section));

    let isManualHighlightMode = false;
    let useDefaultHighlightStyle = false;

    let currentAngle = 0;
    let isPlaying = true;
    let animationId;
    window.isManualHighlight = false;
    let carouselResumeTimer;

    const speedSettings = [
        { label: "0.25x", value: 0.05 },
        { label: "0.5x", value: 0.1 },
        { label: "1x", value: 0.2 },
        { label: "2x", value: 0.4 },
        { label: "4x", value: 0.8 },
    ];
    let currentSpeedIndex = 2;
    let rotationSpeed = speedSettings[currentSpeedIndex].value;

    let totalArticles = 0;
    let totalCode = 0;
    let totalBooks = 0;

    const planetsToSpin = document.querySelectorAll(".analytics-planet-content");
    planetsToSpin.forEach((planet) => {
        const randomDuration = 10 + Math.random() * 30;

        const randomDirection =
            Math.random() < 0.5 ? "selfSpin" : "selfSpinReverse";

        planet.style.animation = `${randomDirection} ${randomDuration.toFixed(2)}s linear infinite`;
    });

    const triggers = document.querySelectorAll(
        ".card-section-trigger:not(#bio-section-trigger), .atlas-trigger",
    );
    triggers.forEach((trigger) => {
        trigger.addEventListener("click", function (event) {
            if (
                event.target.closest("a") &&
                event.target.closest("a").hasAttribute("target")
            ) {
                return;
            }
            event.preventDefault();
            const targetId = this.getAttribute("data-target");

            const contentWrapper =
                document.getElementById(targetId) ||
                document.getElementById("bio-content-wrapper");

            if (contentWrapper) {
                this.classList.toggle("card-expanded");
                contentWrapper.classList.toggle("card-expanded");

                const isExpanded = this.classList.contains("card-expanded");
                this.setAttribute("aria-expanded", isExpanded);

                if (this.id !== "bio-section-trigger") {
                    const globalBtn = document.getElementById(
                        "card-btn-toggle-all-sections",
                    );
                    const globalIcon = document.getElementById("card-icon-toggle-all");

                    if (isExpanded) {
                        if (globalBtn && globalBtn.classList.contains("pink-mode")) {
                            globalBtn.classList.remove("pink-mode");
                            if (globalIcon)
                                globalIcon.className = "fas fa-compress-arrows-alt";
                            globalBtn.setAttribute("data-tooltip", "Collapse All Sections");
                        }
                    } else {
                        const allSections = document.querySelectorAll(
                            "#view-cards .intro-collapsible-section-content",
                        );

                        const isAnyExpanded = Array.from(allSections).some((section) =>
                            section.classList.contains("card-expanded"),
                        );

                        if (!isAnyExpanded) {
                            if (globalBtn) {
                                globalBtn.classList.add("pink-mode");
                                globalBtn.setAttribute("data-tooltip", "Expand All Sections");
                            }
                            if (globalIcon) {
                                globalIcon.className = "fas fa-expand-arrows-alt";
                            }
                        }
                    }
                }
            }
        });
    });

    const atlasTrigger = document.getElementById("card-the-ai-atlas-trigger-btn");
    if (atlasTrigger) {
        atlasTrigger.addEventListener("click", function () {
            setTimeout(() => {
                if (this.classList.contains("card-expanded")) {
                    this.setAttribute("data-tooltip", "Collapse Details");
                } else {
                    this.setAttribute("data-tooltip", "Expand Details");
                }
            }, 10);
        });
    }

    const sections = [
        {
            triggerSelector: '[data-target="card-open-source-content-wrapper"]',
            contentSelector: "#card-open-source-content-wrapper",
        },
        {
            triggerSelector: '[data-target="card-articles-content-wrapper"]',
            contentSelector: "#card-articles-content-wrapper",
        },
        {
            triggerSelector: '[data-target="card-bookshelf-content-wrapper"]',
            contentSelector: "#card-bookshelf-content-wrapper",
        },

        {
            triggerSelector: '[data-target="card-updates-content-wrapper"]',
            contentSelector: "#card-updates-content-wrapper",
        },
    ];

    sections.forEach((section) => {
        const trigger = document.querySelector(section.triggerSelector);
        const content = document.querySelector(section.contentSelector);
        if (trigger && content) {
            const itemCount = content.querySelectorAll(
                ".card-showcase-item, .card-shell",
            ).length;

            trigger.classList.add("tooltip-right");

            const updateTooltip = () => {
                if (trigger.classList.contains("card-expanded")) {
                    trigger.setAttribute(
                        "data-tooltip",
                        `Collapse All\n(${itemCount} Items)`,
                    );
                } else {
                    trigger.setAttribute(
                        "data-tooltip",
                        `Expand All\n(${itemCount} Items)`,
                    );
                }
            };

            updateTooltip();

            trigger.addEventListener("click", () => {
                setTimeout(updateTooltip, 10);
            });
        }
    });

    const navLinks = [
        {
            navId: "card-nav-open-source",
            contentId: "card-open-source-content-wrapper",
        },
        { navId: "card-nav-insights", contentId: "card-articles-content-wrapper" },
        {
            navId: "nav-digital-bookshelf",
            contentId: "card-bookshelf-content-wrapper",
        },
        { navId: "card-nav-updates", contentId: "card-updates-content-wrapper" },
    ];

    navLinks.forEach((link) => {
        const navEl = document.getElementById(link.navId);
        const contentEl = document.getElementById(link.contentId);

        if (navEl && contentEl) {
            const count = contentEl.querySelectorAll(
                ".card-showcase-item, .card-shell",
            ).length;
            navEl.setAttribute("data-tooltip", `${count} Items`);
        }
    });

    const goToBottomButton = document.getElementById("go-to-bottom");
    if (goToBottomButton) {
        goToBottomButton.addEventListener("click", function (e) {
            e.preventDefault();
            window.scrollTo({
                top: document.documentElement.scrollHeight,
                behavior: "smooth",
            });
        });
    }

    const stickyHeader = document.getElementById("sticky-header");
    const backToTopButton = document.getElementById("back-to-top");
    const cardView = document.getElementById("view-cards");

    const downArrowIcon = goToBottomButton
        ? goToBottomButton.querySelector("i")
        : null;
    const upArrowIcon = backToTopButton
        ? backToTopButton.querySelector("i")
        : null;

    let lastScrollY = window.scrollY;

    window.addEventListener(
        "scroll",
        () => {
            const scrollY = window.scrollY || document.documentElement.scrollTop;
            const pageHeight = document.documentElement.scrollHeight;
            const viewportHeight = window.innerHeight;

            if (stickyHeader) {
                if (scrollY > 400) {
                    stickyHeader.classList.add("visible");
                } else {
                    stickyHeader.classList.remove("visible");
                }
            }

            if (backToTopButton) {
                if (scrollY > 400) {
                    backToTopButton.classList.add("visible");
                } else {
                    backToTopButton.classList.remove("visible");
                }
            }

            if (goToBottomButton) {
                const aboutSection = document.getElementById("about");
                const threshold = window.innerWidth <= 768 ? 50 : 200;
                const isNearBottom = scrollY + viewportHeight >= pageHeight - threshold;

                const isCardViewActive =
                    cardView && !cardView.classList.contains("hidden-view");
                const isAboutViewActive =
                    aboutSection && !aboutSection.classList.contains("hidden-view");

                if (isNearBottom) {
                    goToBottomButton.classList.remove("visible");
                    setTimeout(() => {
                        if (!goToBottomButton.classList.contains("visible"))
                            goToBottomButton.style.display = "none";
                    }, 300);
                } else if (isCardViewActive || isAboutViewActive) {
                    goToBottomButton.style.display = "flex";

                    requestAnimationFrame(() => {
                        goToBottomButton.classList.add("visible");
                    });
                } else {
                    goToBottomButton.classList.remove("visible");
                    setTimeout(() => {
                        if (!goToBottomButton.classList.contains("visible"))
                            goToBottomButton.style.display = "none";
                    }, 300);
                }
            }

            if (
                cardView &&
                !cardView.classList.contains("hidden-view") &&
                downArrowIcon &&
                upArrowIcon
            ) {
                if (scrollY > lastScrollY) {
                    downArrowIcon.classList.add("scroll-arrow-active");
                    upArrowIcon.classList.remove("scroll-arrow-active");
                } else {
                    upArrowIcon.classList.add("scroll-arrow-active");
                    downArrowIcon.classList.remove("scroll-arrow-active");
                }
            }

            lastScrollY = scrollY;
        },
        {
            passive: true,
        },
    );

    const animatedElements = document.querySelectorAll(".fade-in-up");
    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("visible");
                    observer.unobserve(entry.target);
                }
            });
        },
        {
            threshold: 0.1,
        },
    );
    animatedElements.forEach((element) => {
        observer.observe(element);
    });

    const navigationPills = document.querySelectorAll(".card-nav-pill");

    navigationPills.forEach((link) => {
        link.addEventListener("click", function (e) {
            e.preventDefault();
            const targetId = this.getAttribute("href");
            const targetElement = document.querySelector(targetId);

            moveCyberLine(this, true);

            function hexToRgb(hex) {
                if (!hex) return null;
                let result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
                return result
                    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
                    : null;
            }

            const colorHex = this.getAttribute("data-color");
            const colorRgb = hexToRgb(colorHex);

            setTimeout(() => {
                if (targetElement) {
                    targetElement.scrollIntoView({ behavior: "smooth" });

                    if (colorRgb) {
                        const firstCard = targetElement.querySelector(
                            ".card-showcase-item, .card-book-showcase, .card-modern-glass, .neu-card",
                        );
                        if (firstCard) {
                            firstCard.style.setProperty("--flash-rgb", colorRgb);
                            firstCard.classList.add("highlight-card-nav");
                            setTimeout(() => {
                                firstCard.classList.remove("highlight-card-nav");
                                firstCard.style.removeProperty("--flash-rgb");
                            }, 6000);
                        }
                    }
                }

                if (history.pushState) {
                    history.pushState(null, null, targetId);
                } else {
                    window.location.hash = targetId;
                }

                setTimeout(() => {
                    const nav = document.getElementById("card-internal-nav");
                    const pinnedPill = document.getElementById("card-nav-pinned");
                    if (nav && pinnedPill) {
                        moveCyberLine(pinnedPill, false);
                        isInitialLoad = true;
                        pinnedPill.classList.add("card-default-active");
                    }
                }, 800);
            }, 600);
        });
    });

    window.switchAnalyticsView = function (viewName) {
        const orbitView = document.getElementById("analytics-view-orbit");
        const carouselView = document.getElementById("analytics-view-carousel");
        const btnOrbit = document.getElementById("analytics-btn-orbit");
        const btnCarousel = document.getElementById("analytics-btn-carousel");
        const glassContainer = document.querySelector(".analytics-glass-container");

        const fsCarouselBtn = document.getElementById("fs-analytics-btn-carousel");
        const fsOrbitBtn = document.getElementById("fs-analytics-btn-orbit");

        if (viewName === "orbit") {
            orbitView.style.display = "flex";
            carouselView.style.display = "none";
            btnOrbit.classList.add("active");
            btnCarousel.classList.remove("active");
            if (glassContainer)
                glassContainer.classList.add("analytics-orbit-view-active");

            if (fsCarouselBtn && fsOrbitBtn) {
                fsCarouselBtn.classList.remove("active");
                fsOrbitBtn.classList.add("active");
            }

            if (animationId) cancelAnimationFrame(animationId);
        } else {
            orbitView.style.display = "none";
            carouselView.style.display = "flex";
            btnOrbit.classList.remove("active");
            btnCarousel.classList.add("active");
            if (glassContainer)
                glassContainer.classList.remove("analytics-orbit-view-active");

            if (fsCarouselBtn && fsOrbitBtn) {
                fsCarouselBtn.classList.add("active");
                fsOrbitBtn.classList.remove("active");
            }

            if (isPlaying) {
                if (animationId) cancelAnimationFrame(animationId);
                window.animateCarousel();
            }
        }

        const dockItem = document.querySelector(
            `.dock-sub-item[data-action="view-${viewName}"]`,
        );
        if (dockItem) {
            const group = dockItem.closest(".dock-sub-menu-inner");

            if (group)
                group
                    .querySelectorAll(".dock-sub-item")
                    .forEach((el) => el.classList.remove("active"));

            dockItem.classList.add("active");
        }

        if (typeof window.runAnalyticsFilter === "function") {
            window.runAnalyticsFilter();
        }

        let targetHash = "#analytics-" + viewName;

        if (viewName === "carousel") {
            targetHash = "#analytics";
        }

        if (window.location.hash !== targetHash) {
            history.pushState(null, null, targetHash);
        }
    };

    window.toggleAnalyticsBg = function () {
        const container = document.querySelector(".analytics-glass-container");
        const btn = document.getElementById("analytics-fs-btn-bg");

        if (container && btn) {
            const isSolid = container.classList.toggle("analytics-solid-mode");

            if (isSolid) {
                btn.setAttribute("data-tooltip", "Toggle Transparent Background");

                btn.classList.add("interaction-cooldown");
                btn.addEventListener(
                    "mouseleave",
                    () => {
                        btn.classList.remove("interaction-cooldown");
                    },
                    { once: true },
                );
            } else {
                btn.setAttribute("data-tooltip", "Toggle Solid Background");
            }
        }
    };

    window.toggleAnalyticsUI = function () {
        const container = document.querySelector(".analytics-glass-container");
        const btn = document.getElementById("fs-btn-ui");
        const icon = btn.querySelector("i");

        if (container && btn) {
            const isHiding = !container.classList.contains(
                "analytics-ui-hidden-mode",
            );
            container.classList.toggle("analytics-ui-hidden-mode");

            if (isHiding) {
                icon.className = "fas fa-eye-slash";
                btn.setAttribute("data-tooltip", "Show Controls");

                btn.classList.add("interaction-cooldown");
                btn.addEventListener(
                    "mouseleave",
                    () => {
                        btn.classList.remove("interaction-cooldown");
                    },
                    { once: true },
                );

                const tooltip = document.getElementById("global-tooltip");
                if (tooltip)
                    try {
                        tooltip.hidePopover();
                    } catch (e) { }

                btn.style.pointerEvents = "none";

                setTimeout(() => {
                    btn.style.pointerEvents = "";
                }, 1500);
            } else {
                icon.className = "fas fa-eye";
                btn.setAttribute("data-tooltip", "Hide Controls");
                btn.style.pointerEvents = "";
            }
        }
    };

    const analyticsContainer = document.querySelector(
        ".analytics-glass-container",
    );

    if (analyticsContainer) {
        analyticsContainer.addEventListener("click", function (e) {
            if (analyticsContainer.classList.contains("analytics-ui-hidden-mode")) {
                const isInteractive = e.target.closest(
                    ".planet, .analytics-carousel-card, .analytics-c-btn, .analytics-action-btn, .analytics-kpi-card",
                );

                if (!isInteractive) {
                    analyticsContainer.classList.add("analytics-ui-peek");

                    setTimeout(() => {
                        analyticsContainer.classList.remove("analytics-ui-peek");
                    }, 2000);
                }
            }
        });
    }

    function reshuffleOrbit() {
        const ring1 = document.querySelector(
            ".analytics-orbit-ring.analytics-ring-1",
        );
        const ring2 = document.querySelector(
            ".analytics-orbit-ring.analytics-ring-2",
        );
        const hexCenter = document.querySelector(".analytics-hex-center");

        if (!ring1 || !ring2) return;

        if (hexCenter) {
            hexCenter.classList.add("rainbow-mode");
            hexCenter.classList.add("is-shuffling");
            hexCenter.setAttribute("data-tooltip", "Shuffling Projects...");
        }

        let allPlanets = [
            ...Array.from(ring1.children),
            ...Array.from(ring2.children),
        ];

        for (let i = allPlanets.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allPlanets[i], allPlanets[j]] = [allPlanets[j], allPlanets[i]];
        }

        ring1.innerHTML = "";
        ring2.innerHTML = "";

        const innerRingCount = 6;

        allPlanets.forEach((planet, index) => {
            if (index < innerRingCount) {
                ring1.appendChild(planet);
            } else {
                ring2.appendChild(planet);
            }
        });

        updateOrbitLayout();
        runAnalyticsFilter();

        setTimeout(() => {
            if (hexCenter) {
                hexCenter.classList.remove("rainbow-mode");
                hexCenter.classList.remove("is-shuffling");
                hexCenter.setAttribute("data-tooltip", "Reshuffle Projects");
            }
        }, 1500);
    }

    const orbitHex = document.querySelector(".analytics-hex-center");
    if (orbitHex) {
        orbitHex.setAttribute("data-tooltip", "Reshuffle Projects");

        orbitHex.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            reshuffleOrbit();
        });

        orbitHex.ondblclick = null;
    }

    window.animateCarousel = function () {
        const carouselView = document.getElementById("analytics-view-carousel");
        const analyticsView = document.getElementById("view-analytics");

        const isVisible =
            analyticsView &&
            !analyticsView.classList.contains("hidden-view") &&
            carouselView &&
            carouselView.style.display !== "none";

        if (isPlaying && isVisible) {
            currentAngle += rotationSpeed;

            applyTransform();

            animationId = requestAnimationFrame(window.animateCarousel);
        } else {
            if (animationId) cancelAnimationFrame(animationId);
        }
    };

    function applyTransform() {
        if (carouselSpinner) {
            carouselSpinner.style.transform = `rotateY(${currentAngle}deg)`;
        }
    }

    function updateHighlights() {
        if (isManualHighlightMode) return;
        if (window.isManualHighlight) return;

        const visibleCards = Array.from(cards).filter(
            (card) => card.style.opacity !== "0" && card.style.display !== "none",
        );
        const visibleCount = visibleCards.length;
        if (visibleCount === 0) return;

        let closestCard = null;
        let smallestDistance = Infinity;

        visibleCards.forEach((card, index) => {
            const angle = 360 / visibleCount;
            const cardBaseAngle = index * angle;

            let effectiveAngle = (currentAngle + cardBaseAngle) % 360;
            if (effectiveAngle < 0) effectiveAngle += 360;

            const distanceFromFront = Math.min(effectiveAngle, 360 - effectiveAngle);

            if (distanceFromFront < smallestDistance) {
                smallestDistance = distanceFromFront;
                closestCard = card;
            }
        });

        cards.forEach((card) => {
            if (card === closestCard) {
                card.classList.add("highlight");
            } else {
                card.classList.remove("highlight");
            }
        });

        const hiddenCards = Array.from(cards).filter(
            (card) => card.style.opacity === "0" || card.style.display === "none",
        );
        hiddenCards.forEach((card) => card.classList.remove("highlight"));
    }

    function removeHighlights() {
        cards.forEach((card) => card.classList.remove("highlight"));
    }

    window.togglePlay = function () {
        isPlaying = !isPlaying;
        const icon = playPauseBtn.querySelector("i");

        if (isPlaying) {
            icon.classList.remove("fa-play");
            icon.classList.add("fa-pause");
            playPauseBtn.classList.remove("active");
            removeHighlights();
            window.animateCarousel();
        } else {
            icon.classList.remove("fa-pause");
            icon.classList.add("fa-play");
            playPauseBtn.classList.add("active");
            cancelAnimationFrame(animationId);
            animationId = null;
            updateHighlights();
        }
    };

    window.snapToNearestCard = function (direction) {
        if (isPlaying) togglePlay();

        const visibleCards = Array.from(cards).filter(
            (card) => card.style.opacity !== "0" && card.style.display !== "none",
        );
        const visibleCount = visibleCards.length;
        if (visibleCount === 0) return;
        const angle = 360 / visibleCount;

        carouselSpinner.style.transition = "transform 0.5s ease-out";

        const currentSlot = Math.round(currentAngle / angle);
        const targetSlot = currentSlot + direction;

        currentAngle = targetSlot * angle;
        applyTransform();

        setTimeout(() => {
            carouselSpinner.style.transition = "none";
            updateHighlights();
        }, 500);
    };

    window.nextCard = function () {
        snapToNearestCard(1);
    };
    window.prevCard = function () {
        snapToNearestCard(-1);
    };

    window.addEventListener("resize", () => {
        updateCarouselLayout();
        updateOrbitLayout();
    });

    const btnCard = document.getElementById("btn-card");
    const btnMatrix = document.getElementById("btn-matrix");
    const btnGallery = document.getElementById("btn-gallery");
    const btnAnalytics = document.getElementById("btn-analytics");
    const viewAbout = document.getElementById("about");

    const viewCards = document.getElementById("view-cards");
    const viewMatrix = document.getElementById("view-matrix");
    const viewGallery = document.getElementById("view-gallery");
    const viewAnalytics = document.getElementById("view-analytics");

    const internalNav = document.getElementById("card-internal-nav");
    const mainContainer = document.querySelector(".container.card-glass-effect");

    const gallerySubNav = document.getElementById("gallery-sub-nav");

    window.switchView = function (mode) {
        const bioBtn = document.getElementById("bio-section-trigger");
        const bioContent = document.getElementById("bio-content-wrapper");
        const userPref = sessionStorage.getItem("bioState");

        const flashTrigger = (btn) => {
            btn.classList.add("simulated-hover");
            setTimeout(() => btn.classList.remove("simulated-hover"), 1000);
        };

        if (bioBtn && bioContent) {
            if (mode !== "card") {
                if (
                    userPref !== "expanded" &&
                    bioBtn.classList.contains("card-expanded")
                ) {
                    bioBtn.classList.remove("card-expanded");
                    bioContent.classList.add("collapsed");
                    bioBtn.setAttribute("aria-expanded", "false");
                    bioBtn.setAttribute("data-tooltip", "Show Profile Details");

                    flashTrigger(bioBtn);
                }
            } else if (mode === "card") {
                if (
                    userPref !== "collapsed" &&
                    !bioBtn.classList.contains("card-expanded")
                ) {
                    bioBtn.classList.add("card-expanded");
                    bioContent.classList.remove("collapsed");
                    bioBtn.setAttribute("aria-expanded", "true");
                    bioBtn.setAttribute("data-tooltip", "Hide Profile Details");

                    flashTrigger(bioBtn);
                }
            }
        }

        const goToBottomButton = document.getElementById("go-to-bottom");

        viewCards.classList.add("hidden-view");
        viewMatrix.classList.add("hidden-view");
        viewGallery.classList.add("hidden-view");
        viewAnalytics.classList.add("hidden-view");
        if (viewAbout) viewAbout.classList.add("hidden-view");

        btnCard.classList.remove("active");
        btnMatrix.classList.remove("active");
        btnGallery.classList.remove("active");
        btnAnalytics.classList.remove("active");
        document.getElementById("profile-trigger-btn")?.classList.remove("active");

        const profileJewel = document.querySelector(".profile-jewel");
        if (profileJewel) {
            if (mode === "about") {
                profileJewel.classList.add("active-view-state");
            } else {
                profileJewel.classList.remove("active-view-state");
            }
        }
        const downArrow = document.querySelector("#go-to-bottom i");
        const upArrow = document.querySelector("#back-to-top i");
        if (downArrow) downArrow.classList.remove("scroll-arrow-active");
        if (upArrow) upArrow.classList.remove("scroll-arrow-active");

        mainContainer.classList.remove("matrix-view-active");
        if (internalNav) internalNav.classList.add("hidden-view");
        if (gallerySubNav) gallerySubNav.classList.add("hidden-view");

        const currentHash = window.location.hash;
        let targetUrl = `#${mode}`;

        if (mode === "card") {
            targetUrl = window.location.pathname;
        } else if (
            mode === "gallery" &&
            (currentHash === "#gallery" || currentHash === "#gallery-grid")
        ) {
            targetUrl = "#gallery";
        }

        if (currentHash !== targetUrl && !currentHash.startsWith(`#${mode}-`)) {
            if (history.pushState) {
                history.pushState(null, null, targetUrl);
            } else {
                window.location.hash = targetUrl;
            }
        }

        if (typeof animationId !== "undefined" && animationId) {
            cancelAnimationFrame(animationId);
        }

        let targetView, targetBtn;

        if (mode === "matrix") {
            targetView = viewMatrix;
            targetBtn = btnMatrix;
            mainContainer.classList.add("matrix-view-active");

            const dockItem = document.querySelector(
                `.dock-sub-item[data-action="view-table"]`,
            );
            if (dockItem) {
                const group = dockItem.closest(".dock-sub-menu-inner");
                if (group)
                    group
                        .querySelectorAll(".dock-sub-item")
                        .forEach((el) => el.classList.remove("active"));
                dockItem.classList.add("active");
            }

            const matrixViewEl = document.getElementById("view-matrix");

            if (matrixViewEl && window.innerWidth > 768) {
                matrixViewEl.classList.remove("initial-flash");

                void matrixViewEl.offsetWidth;

                matrixViewEl.classList.add("initial-flash");

                setTimeout(() => {
                    matrixViewEl.classList.remove("initial-flash");
                }, 3000);
            }
        } else if (mode === "gallery") {
            targetView = viewGallery;
            targetBtn = btnGallery;
            if (gallerySubNav) gallerySubNav.classList.remove("hidden-view");
            setTimeout(() => {
                if (window.refreshGallerySwitcher) window.refreshGallerySwitcher();
            }, 10);
        } else if (mode === "analytics") {
            targetView = viewAnalytics;
            targetBtn = btnAnalytics;
        } else if (mode === "about") {
            targetView = viewAbout;
            targetBtn = document.getElementById("profile-trigger-btn");
            if (goToBottomButton) goToBottomButton.style.display = "flex";
        } else {
            targetView = viewCards;
            targetBtn = btnCard;
            if (internalNav) internalNav.classList.remove("hidden-view");
        }

        if (targetView) targetView.classList.remove("hidden-view");
        if (targetBtn) targetBtn.classList.add("active");

        const dockBtns = document.querySelectorAll(".dock-expand-btn");

        const isAnyMenuOpen = document.querySelector(".dock-expand-btn.menu-open");

        dockBtns.forEach((btn) => {
            btn.classList.remove("view-active");
            btn.classList.remove("menu-open");
            btn.classList.remove("active");

            if (btn.id !== "global-search-trigger") {
                btn.title = "Open Sidebar Menu";
            }
        });

        const targetDockBtn = document.querySelector(
            `.dock-expand-btn[data-view="${mode}"]`,
        );

        if (targetDockBtn) {
            if (isAnyMenuOpen) {
                targetDockBtn.classList.add("menu-open");
                targetDockBtn.title = "Close Sidebar Menu";
            } else {
                targetDockBtn.classList.add("view-active");
                targetDockBtn.title = "Open Sidebar Menu";
            }
        }

        document
            .querySelectorAll(".dock-sub-item")
            .forEach((el) => el.classList.remove("active"));

        let defaultSubSelector = null;

        if (mode === "card") {
            defaultSubSelector = '.dock-sub-item[data-jump="the-ai-atlas-section"]';
        } else if (mode === "matrix") {
            defaultSubSelector = '.dock-sub-item[data-action="view-table"]';
        } else if (mode === "gallery") {
            defaultSubSelector = '.dock-sub-item[data-action="view-grid"]';
        } else if (mode === "analytics") {
            defaultSubSelector = '.dock-sub-item[data-action="view-carousel"]';
        }

        if (defaultSubSelector) {
            const defaultItem = document.querySelector(defaultSubSelector);
            if (defaultItem) defaultItem.classList.add("active");
        }

        if (mode === "analytics") {
            if (typeof switchAnalyticsView === "function") {
                switchAnalyticsView("carousel");
            }
        }

        const aboutBtn = document.getElementById("profile-trigger-btn");
        const profileDock = document.getElementById("profile-dock");

        if (aboutBtn) {
            if (mode === "about") {
                aboutBtn.classList.add("active");
                if (profileDock) profileDock.classList.add("open");
            } else {
                aboutBtn.classList.remove("active");
                if (profileDock) profileDock.classList.remove("open");
            }
        }

        if (mode !== "about") {
            lastViewBeforeAbout = mode;
        }

        const headerInfoBtn = document.querySelector(
            '.bio-collapsed-socials a[href="#about"]',
        );

        if (headerInfoBtn) {
            if (mode === "about") {
                headerInfoBtn.style.color = "#ffffff";
                headerInfoBtn.style.borderColor = "var(--highlight-color)";
                headerInfoBtn.style.background = "rgba(133, 193, 233, 0.2)";
                headerInfoBtn.style.boxShadow = "0 0 10px rgba(133, 193, 233, 0.4)";
            } else {
                headerInfoBtn.style.color = "";
                headerInfoBtn.style.borderColor = "";
                headerInfoBtn.style.background = "";
                headerInfoBtn.style.boxShadow = "";
            }
        }
    };

    const dockButtons = document.querySelectorAll(".dock-expand-btn");
    dockButtons.forEach((button) => {
        button.addEventListener("click", function (e) {
            if (this.id === "global-search-trigger") return;

            if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button !== 1) {
                e.preventDefault();

                const viewName = this.getAttribute("data-view");
                const isOpen = this.classList.contains("menu-open");

                window.switchView(viewName);

                if (isOpen) {
                    this.classList.remove("menu-open");
                    this.classList.add("view-active");
                    this.title = "Open Sidebar Menu";
                } else {
                    this.classList.add("menu-open");
                    this.classList.remove("view-active");
                    this.title = "Close Sidebar Menu";
                }
            }
        });
    });

    document.querySelectorAll(".view-btn").forEach((btn) => {
        btn.addEventListener("click", function (e) {
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;

            e.preventDefault();

            const viewMode = this.id.replace("btn-", "");
            window.switchView(viewMode);
        });
    });

    function keepDockMenuOpen(childElement) {
        const parentGroup = childElement.closest(".dock-group");
        const parentBtn = parentGroup
            ? parentGroup.querySelector(".dock-expand-btn")
            : null;
        if (parentBtn) {
            parentBtn.classList.add("menu-open");
            parentBtn.classList.remove("view-active");
        }
    }

    const dockSubItems = document.querySelectorAll(".dock-sub-item");

    dockSubItems.forEach((item) => {
        item.addEventListener("click", function (e) {
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;

            e.preventDefault();
            const targetHash = this.getAttribute("href");

            if (targetHash === "#stream-lightbox") {
                if (typeof openStreamOverlay === "function") {
                    if (typeof switchView === "function") switchView("card");
                    setTimeout(openStreamOverlay, 50);
                }
                keepDockMenuOpen(this);

                dockSubItems.forEach((subItem) => subItem.classList.remove("active"));
                this.classList.add("active");
                return;
            }

            const sectionId = this.getAttribute("data-jump");
            if (sectionId) {
                isDockNavigating = true;

                if (typeof switchView === "function") switchView("card");

                const group = this.closest(".dock-sub-menu-inner");

                document
                    .querySelectorAll(".dock-sub-item")
                    .forEach((el) => el.classList.remove("active"));

                this.classList.add("active");

                setTimeout(() => {
                    const targetElement = document.getElementById(sectionId);
                    if (targetElement) {
                        targetElement.scrollIntoView({
                            behavior: "smooth",
                            block: "start",
                        });

                        targetElement.classList.add("highlight-card");
                        setTimeout(
                            () => targetElement.classList.remove("highlight-card"),
                            4000,
                        );
                    }
                }, 50);

                keepDockMenuOpen(this);

                setTimeout(() => {
                    isDockNavigating = false;
                }, 1000);
            }
        });
    });

    const registrySubItems = document.querySelectorAll(
        "#dock-group-matrix .dock-sub-item",
    );

    registrySubItems.forEach((item) => {
        item.addEventListener("click", function (e) {
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) {
                return;
            }

            e.preventDefault();
            const action = this.getAttribute("data-action");

            if (typeof switchView === "function") {
                switchView("matrix");
            }
            keepDockMenuOpen(this);

            setTimeout(() => {
                switch (action) {
                    case "view-table":
                        break;

                    case "export-image":
                        document.getElementById("matrix-btn-export-image-trigger")?.click();
                        break;

                    case "export-data":
                        document.getElementById("matrix-btn-export-trigger")?.click();
                        break;

                    case "spotlight":
                        if (typeof openTableLightbox === "function") {
                            openTableLightbox();
                        }
                        break;
                }
            }, 100);
        });
    });

    const visualsSubItems = document.querySelectorAll(
        "#dock-group-gallery .dock-sub-item",
    );

    visualsSubItems.forEach((item) => {
        item.addEventListener("click", function (e) {
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) {
                return;
            }

            e.preventDefault();
            const action = this.getAttribute("data-action");

            if (typeof switchView === "function") {
                switchView("gallery");
            }
            keepDockMenuOpen(this);

            setTimeout(() => {
                switch (action) {
                    case "view-grid":
                        document
                            .querySelector('.control-segment[data-mode="grid"]')
                            ?.click();
                        break;

                    case "view-metrics":
                        document
                            .querySelector('.control-segment[data-mode="metrics"]')
                            ?.click();
                        break;

                    case "view-updates":
                        document
                            .querySelector('.control-segment[data-mode="updates"]')
                            ?.click();
                        break;

                    case "spotlight":
                        document.getElementById("gallery-open-fullscreen-btn")?.click();
                        break;
                }
            }, 100);
        });
    });

    const analyticsSubItems = document.querySelectorAll(
        "#dock-group-analytics .dock-sub-item",
    );

    analyticsSubItems.forEach((item) => {
        item.addEventListener("click", function (e) {
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) {
                return;
            }

            e.preventDefault();
            const action = this.getAttribute("data-action");

            if (typeof switchView === "function") {
                switchView("analytics");
            }
            keepDockMenuOpen(this);

            setTimeout(() => {
                switch (action) {
                    case "view-carousel":
                        if (typeof switchAnalyticsView === "function") {
                            switchAnalyticsView("carousel");
                        }
                        break;

                    case "view-orbit":
                        if (typeof switchAnalyticsView === "function") {
                            switchAnalyticsView("orbit");
                        }
                        break;

                    case "spotlight":
                        if (typeof toggleAnalyticsFullscreen === "function") {
                            toggleAnalyticsFullscreen();
                        }
                        break;
                }
            }, 100);
        });
    });

    window.jumpToCard = function (targetId) {
        if (typeof window.closeTableLightbox === "function") {
            window.closeTableLightbox();
        }

        if (typeof window.closeLightbox === "function") {
            window.closeLightbox();
        }

        if (typeof window.closeStreamOverlay === "function") {
            const streamModal = document.getElementById("stream-overlay-modal");
            if (streamModal && streamModal.classList.contains("active")) {
                window.closeStreamOverlay(true);
            }
        }

        if (window.event) {
            window.event.preventDefault();
            window.event.stopPropagation();
        }

        window.location.hash = targetId;
    };

    const grid = document.getElementById("gallery-grid");
    const filterType = document.getElementById("gallery-filter-type");

    function setupToggleButton(id, callback) {
        const btn = document.getElementById(id);
        if (!btn) return;

        const track = btn.querySelector(".toggle-track");

        const label =
            btn.querySelector(".toggle-label") || btn.querySelector(".glass-label");

        const textOff = btn.getAttribute("data-off");
        const textOn = btn.getAttribute("data-on");

        btn.addEventListener("click", () => {
            let isActive;

            if (track) {
                isActive = track.classList.toggle("active");
                btn.classList.toggle("active-state", isActive);
            } else {
                isActive = btn.classList.toggle("active-state");
            }

            if (label) {
                label.textContent = isActive ? textOn : textOff;

                const icon = btn.querySelector("i");
                if (icon && !track) {
                    if (isActive) {
                        icon.className = "fa-solid fa-layer-group";
                    } else {
                        if (id === "btn-stats") icon.className = "fa-solid fa-chart-column";
                        if (id === "btn-updates") icon.className = "fa-solid fa-bullhorn";
                    }
                }
            }

            callback(isActive);
        });
    }

    setupToggleButton("gallery-btn-titles", (isActive) => {
        if (isActive) grid.classList.add("gallery-show-titles");
        else grid.classList.remove("gallery-show-titles");
    });

    setupToggleButton("gallery-btn-links", (isActive) => {
        if (isActive) grid.classList.add("gallery-show-links");
        else grid.classList.remove("gallery-show-links");
    });

    setupToggleButton("analytics-btn-toggle-controls", (isActive) => {
        const targets = [
            document.getElementById("analytics-carousel-controls"),
            document.getElementById("analytics-orbit-controls"),
            document.querySelector(
                ".analytics-fs-controls-group.analytics-fs-top-right",
            ),
        ];

        targets.forEach((el) => {
            if (el) el.classList.toggle("instant-hidden", isActive);
        });
    });

    const viewModeSwitch = document.getElementById("gallery-view-mode-switch");
    if (viewModeSwitch) {
        const segments = viewModeSwitch.querySelectorAll(".control-segment");
        const grid = document.getElementById("gallery-grid");
        const galleryMultiSelect = document.getElementById("gallery-multiselect");

        const updateSwitchState = (activeSegment) => {
            segments.forEach((segment) => {
                segment.classList.toggle("active", segment === activeSegment);
            });

            const mode = activeSegment.getAttribute("data-mode");
            grid.classList.toggle("gallery-stats-mode", mode === "metrics");
            grid.classList.toggle("gallery-updates-mode", mode === "updates");

            viewModeSwitch.setAttribute("data-active-mode", mode);

            const dockItem = document.querySelector(
                `.dock-sub-item[data-action="view-${mode}"]`,
            );
            if (dockItem) {
                const group = dockItem.closest(".dock-sub-menu-inner");
                if (group)
                    group
                        .querySelectorAll(".dock-sub-item")
                        .forEach((el) => el.classList.remove("active"));
                dockItem.classList.add("active");
            }

            const isDisabled = mode === "metrics" || mode === "updates";

            const savedState = gallerySortStates[mode];

            if (typeof updateSortIcon === "function") {
                updateSortIcon(
                    "gallery-btn-sort-title",
                    "gallery-sort-icon-title",
                    savedState.title,
                    "Projects",
                );
            }

            if (typeof updateSortIcon === "function") {
                const typeBtn = document.getElementById(
                    "gallery-btn-sort-type-gallery",
                );
                if (isDisabled) {
                    typeBtn.classList.add("disabled-button");
                    const icon = document.getElementById("gallery-sort-icon-type");
                    if (icon) icon.className = "fas fa-sort";
                } else {
                    typeBtn.classList.remove("disabled-button");
                    updateSortIcon(
                        "gallery-btn-sort-type-gallery",
                        "gallery-sort-icon-type",
                        savedState.type,
                        "Type",
                    );
                }
            }

            if (galleryMultiSelect) {
                galleryMultiSelect.classList.toggle("disabled", isDisabled);
                if (isDisabled) galleryMultiSelect.classList.remove("open");
            }

            const btnSortType = document.getElementById(
                "gallery-btn-sort-type-gallery",
            );

            if (btnSortType) {
                if (isDisabled) {
                    btnSortType.classList.add("disabled-button");

                    const icon = document.getElementById("gallery-sort-icon-type");
                    if (icon) icon.className = "fas fa-sort";

                    if (typeof gallerySortState !== "undefined")
                        gallerySortState.type = 0;
                } else {
                    btnSortType.classList.remove("disabled-button");
                }
            }

            if (typeof window.filterGallery === "function") {
                window.filterGallery();
            }

            let targetHash = "#gallery-" + mode;
            if (mode === "grid" && window.location.hash === "#gallery") {
                targetHash = "#gallery";
            }

            if (window.location.hash !== targetHash) {
                if (history.pushState) {
                    history.pushState(null, null, targetHash);
                } else {
                    window.location.hash = targetHash;
                }
            }
        };

        window.refreshGallerySwitcher = () => { };

        segments.forEach((segment) => {
            segment.addEventListener("click", (e) => {
                e.preventDefault();
                updateSwitchState(segment);
            });
        });
    }

    const spotSlider = document.getElementById("gallery-spotlight-view-slider");
    const spotPuck = document.getElementById("gallery-spotlight-puck");
    const spotBtns = document.querySelectorAll(".gallery-spotlight-btn");

    if (spotSlider && spotPuck) {
        spotSlider.addEventListener("click", (e) => e.stopPropagation());

        spotBtns.forEach((btn) => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const mode = btn.dataset.mode;
                const index = parseInt(btn.dataset.index);

                const targetSegment = document.querySelector(
                    `.control-segment[data-mode="${mode}"]`,
                );
                if (targetSegment) {
                    targetSegment.click();
                }

                spotPuck.style.transform = `translateY(${index * 50}px)`;
                const colors = { grid: "blue", metrics: "teal", updates: "pink" };
                const theme = colors[mode];
                spotPuck.style.background = `var(--highlight-${theme})`;
                spotPuck.style.boxShadow = `0 0 15px var(--highlight-${theme})`;

                setTimeout(() => {
                    const grid = document.getElementById("gallery-grid");
                    const firstVisibleItem = grid.querySelector(
                        `.gallery-item:not([style*="display: none"]) .gallery-img`,
                    );

                    if (firstVisibleItem) {
                        openLightbox(firstVisibleItem);
                    }
                }, 50);

                spotBtns.forEach((b) => b.classList.remove("active"));
                btn.classList.add("active");
            });
        });
    }

    const btnCarousel = document.getElementById("analytics-btn-carousel");
    const btnOrbit = document.getElementById("analytics-btn-orbit");

    if (btnCarousel) {
        btnCarousel.addEventListener("click", function (e) {
            e.preventDefault();
            switchAnalyticsView("carousel");
        });
    }

    if (btnOrbit) {
        btnOrbit.addEventListener("click", function (e) {
            e.preventDefault();
            switchAnalyticsView("orbit");
        });
    }

    const analyticsEnterBtn = document.getElementById("analytics-btn-fullscreen");
    if (analyticsEnterBtn) {
        analyticsEnterBtn.addEventListener("click", function (e) {
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;
            e.preventDefault();

            if (typeof switchAnalyticsView === "function") {
                switchAnalyticsView("carousel");
            }

            toggleAnalyticsFullscreen();
        });
    }

    const navPills = document.querySelectorAll(
        ".card-internal-nav .card-nav-pill",
    );
    const cyberLine = document.getElementById("card-cyber-line");
    const defaultActivePill = document.querySelector(
        ".card-nav-pill.card-default-active",
    );
    let isInitialLoad = true;

    function moveCyberLine(target, isUserAction = false) {
        if (!cyberLine) return;

        if (isUserAction && isInitialLoad) {
            isInitialLoad = false;
            if (defaultActivePill) {
                defaultActivePill.classList.remove("card-default-active");

                defaultActivePill.removeEventListener("mouseenter", handleDefaultHover);
                defaultActivePill.removeEventListener("mouseleave", handleDefaultLeave);
            }
        }

        const index = Array.from(navPills).indexOf(target);
        cyberLine.style.transform = `translateX(${index * 100}%)`;

        const activeColor = target.getAttribute("data-color");
        const defaultColor = target.getAttribute("data-default-color");

        if (isInitialLoad && defaultColor) {
            cyberLine.style.backgroundColor = defaultColor;
            cyberLine.style.boxShadow = "none";
        } else {
            cyberLine.style.backgroundColor = activeColor;
            cyberLine.style.boxShadow = `0 -2px 10px ${activeColor}, 0 0 20px ${activeColor}`;
        }

        navPills.forEach((p) => p.classList.remove("active"));
        target.classList.add("active");
        cyberLine.classList.add("initialized");
    }

    const handleDefaultHover = () => {
        if (!isInitialLoad) return;
        const activeColor = defaultActivePill.getAttribute("data-color");
        cyberLine.style.backgroundColor = activeColor;
        cyberLine.style.boxShadow = `0 -2px 10px ${activeColor}, 0 0 20px ${activeColor}`;
    };

    const handleDefaultLeave = () => {
        if (!isInitialLoad) return;
        const defaultColor = defaultActivePill.getAttribute("data-default-color");
        cyberLine.style.backgroundColor = defaultColor;
        cyberLine.style.boxShadow = "none";
    };

    navPills.forEach((pill) => {
        pill.addEventListener("click", function () {
            moveCyberLine(this, true);
        });
    });

    if (defaultActivePill) {
        moveCyberLine(defaultActivePill, false);

        defaultActivePill.addEventListener("mouseenter", handleDefaultHover);
        defaultActivePill.addEventListener("mouseleave", handleDefaultLeave);
    }

    window.filterGallery = function () {
        const searchInput = document
            .getElementById("gallery-search")
            .value.toLowerCase();
        const searchTerms = searchInput
            .split(",")
            .map((term) => term.trim())
            .filter((term) => term.length > 0);

        const activeSegment = document.querySelector(".control-segment.active");
        const currentMode = activeSegment
            ? activeSegment.getAttribute("data-mode")
            : "grid";

        const checkboxes = document.querySelectorAll(
            '#gallery-multiselect input[type="checkbox"]',
        );
        const selectedTypes = Array.from(checkboxes)
            .filter((checkbox) => checkbox.checked)
            .map((checkbox) => checkbox.value.toLowerCase());

        const triggerText = document.getElementById("gallery-trigger-text");
        const triggerBtn = document.querySelector(
            "#gallery-multiselect .custom-select-trigger",
        );

        if (triggerText && triggerBtn) {
            triggerText.style.color = "";

            if (selectedTypes.length === checkboxes.length) {
                triggerText.innerText = "All Types";
                triggerBtn.classList.remove("filter-active");
                triggerBtn.setAttribute("data-tooltip", "Filter Types");
            } else if (selectedTypes.length === 0) {
                triggerText.innerText = "None";
                triggerBtn.classList.add("filter-active");
                triggerBtn.setAttribute("data-tooltip", "Edit Filter");
            } else {
                triggerText.innerText = `${selectedTypes.length} Selected`;
                triggerBtn.classList.add("filter-active");
                triggerBtn.setAttribute("data-tooltip", "Edit Filter");
            }
        }

        const items = document.querySelectorAll("#gallery-grid .gallery-item");
        const grid = document.getElementById("gallery-grid");
        let visibleCount = 0;

        items.forEach((item) => {
            const titleEl = item.querySelector(".gallery-title-link");
            const title = titleEl ? titleEl.innerText.toLowerCase().trim() : "";
            const type = item.getAttribute("data-type").toLowerCase();
            const year = item.getAttribute("data-year") || "";

            const isStatsCard = item.classList.contains("gallery-stats-card");
            const isUpdateCard = item.classList.contains("gallery-update-card");

            const matchesSearch =
                searchTerms.length === 0 ||
                searchTerms.some((term) => title.includes(term) || year.includes(term));

            let shouldShow = false;

            if (currentMode === "metrics") {
                shouldShow = isStatsCard && matchesSearch;
            } else if (currentMode === "updates") {
                shouldShow = isUpdateCard && matchesSearch;
            } else {
                if (isStatsCard || isUpdateCard) {
                    shouldShow = false;
                } else {
                    const matchesType =
                        selectedTypes.length > 0 &&
                        selectedTypes.some((sel) => type.includes(sel));
                    shouldShow = matchesSearch && matchesType;
                }
            }

            if (shouldShow) {
                item.style.display = "flex";
                visibleCount++;
            } else {
                item.style.display = "none";
            }
        });

        let noResults = document.getElementById("gallery-no-results");
        if (visibleCount === 0) {
            if (!noResults) {
                noResults = document.createElement("div");
                noResults.id = "gallery-no-results";
                noResults.style.gridColumn = "1 / -1";
                noResults.style.textAlign = "center";
                noResults.style.padding = "40px 20px";
                noResults.style.color = "#ff6b6b";
                noResults.style.fontSize = "1em";
                noResults.style.letterSpacing = "0.5px";
                noResults.innerHTML = `<i class="fas fa-ghost" style="font-size: 1.5em; margin-bottom: 10px; display: block;"></i> No items found matching criteria`;
                grid.appendChild(noResults);
            }
            noResults.style.display = "block";
        } else {
            if (noResults) {
                noResults.style.display = "none";
            }
        }

        const galleryTotalWrapper = document.getElementById(
            "gallery-total-wrapper",
        );
        if (galleryTotalWrapper) {
            galleryTotalWrapper.setAttribute(
                "data-tooltip",
                "Showing: " + visibleCount,
            );
        }
    };

    const tbody = document.getElementById("matrix-table-body");
    if (tbody) {
        originalRows = Array.from(tbody.rows);
        const countWrapper = document.getElementById("matrix-total-wrapper");
        if (countWrapper) {
            countWrapper.setAttribute(
                "data-tooltip",
                `Total: ${originalRows.length}`,
            );
        }
    }

    const galleryGrid = document.getElementById("gallery-grid");
    if (galleryGrid) {
        const originalGridItems = Array.from(
            galleryGrid.querySelectorAll(
                ".gallery-item:not(.gallery-stats-card):not(.gallery-update-card)",
            ),
        );
        const originalMetricsItems = Array.from(
            galleryGrid.querySelectorAll(".gallery-item.gallery-stats-card"),
        );
        const originalUpdatesItems = Array.from(
            galleryGrid.querySelectorAll(".gallery-item.gallery-update-card"),
        );

        window.originalItemSets = {
            grid: originalGridItems,
            metrics: originalMetricsItems,
            updates: originalUpdatesItems,
        };

        const totalGalleryItems = originalGridItems.length;
        const galleryWrapper = document.getElementById("gallery-total-wrapper");
        if (galleryWrapper) {
            galleryWrapper.setAttribute(
                "data-tooltip",
                `Total: ${totalGalleryItems}`,
            );
        }
    }

    window.sortGallery = function (clickedCriteria) {
        const gridContainer = document.getElementById("gallery-grid");
        if (!gridContainer) return;

        const activeSegment = document.querySelector(".control-segment.active");
        const currentMode = activeSegment
            ? activeSegment.getAttribute("data-mode")
            : "grid";

        if (clickedCriteria === "type" && currentMode !== "grid") return;

        const originalItems = window.originalItemSets
            ? window.originalItemSets[currentMode]
            : [];
        if (!originalItems || originalItems.length === 0) return;

        gallerySortStates[currentMode][clickedCriteria] =
            (gallerySortStates[currentMode][clickedCriteria] + 1) % 4;
        const currentState = gallerySortStates[currentMode];

        updateSortIcon(
            "gallery-btn-sort-title",
            "gallery-sort-icon-title",
            currentState.title,
            "Projects",
        );
        updateSortIcon(
            "gallery-btn-sort-type-gallery",
            "gallery-sort-icon-type",
            currentState.type,
            "Type",
        );

        let primary, secondary;
        if (currentState.type !== 0) {
            primary = "type";
            secondary = "title";
        } else {
            primary = "title";
            secondary = "type";
        }

        const getAttr = (item, attr) =>
            (item.getAttribute(`data-${attr}`) || "").toLowerCase();

        const sortedItems = [...originalItems].sort((itemA, itemB) => {
            const indexA = originalItems.indexOf(itemA);
            const indexB = originalItems.indexOf(itemB);

            const valA1 = getAttr(itemA, primary);
            const valB1 = getAttr(itemB, primary);
            const result1 = compareValues(
                valA1,
                valB1,
                currentState[primary],
                indexA,
                indexB,
            );
            if (result1 !== 0) return result1;

            const valA2 = getAttr(itemA, secondary);
            const valB2 = getAttr(itemB, secondary);
            const result2 = compareValues(
                valA2,
                valB2,
                currentState[secondary],
                indexA,
                indexB,
            );
            if (result2 !== 0) return result2;

            return indexA - indexB;
        });

        sortedItems.forEach((item) => gridContainer.appendChild(item));
        if (typeof window.filterGallery === "function") window.filterGallery();
    };

    window.jumpToGallery = function (dataTitle) {
        if (typeof window.closeTableLightbox === "function") {
            window.closeTableLightbox();
        }

        if (typeof window.closeStreamOverlay === "function") {
            const streamModal = document.getElementById("stream-overlay-modal");
            if (streamModal && streamModal.classList.contains("active")) {
                window.closeStreamOverlay(true);
            }
        }

        if (window.event) {
            window.event.preventDefault();
            window.event.stopPropagation();
        }

        const targetItem = document.querySelector(
            `.gallery-item[data-title="${dataTitle}"]`,
        );
        const isUpdate =
            targetItem && targetItem.getAttribute("data-type") === "updates";
        const isStats =
            targetItem && targetItem.getAttribute("data-type") === "stats";

        let targetHash = "#gallery";
        if (isUpdate) targetHash = "#gallery-updates";
        else if (isStats) targetHash = "#gallery-metrics";

        if (history.pushState) {
            history.pushState(null, null, targetHash);
        } else {
            window.location.hash = targetHash.substring(1);
        }

        switchView("gallery");

        const btnGrid = document.querySelector(
            '.control-segment[data-mode="grid"]',
        );
        const btnMetrics = document.querySelector(
            '.control-segment[data-mode="metrics"]',
        );
        const btnUpdates = document.querySelector(
            '.control-segment[data-mode="updates"]',
        );

        if (isUpdate && btnUpdates) {
            btnUpdates.click();
        } else if (isStats && btnMetrics) {
            btnMetrics.click();
        } else if (btnGrid) {
            btnGrid.click();
        }

        const searchInput = document.getElementById("gallery-search");
        if (searchInput) searchInput.value = "";

        const checkboxes = document.querySelectorAll(
            '#gallery-multiselect input[type="checkbox"]',
        );
        checkboxes.forEach((cb) => (cb.checked = true));

        const triggerText = document.getElementById("gallery-trigger-text");
        if (triggerText) triggerText.innerText = "All Types";

        if (targetItem) {
            setTimeout(() => {
                targetItem.scrollIntoView({ behavior: "smooth", block: "center" });
                targetItem.classList.remove("highlight-gallery");
                void targetItem.offsetWidth;
                targetItem.classList.add("highlight-gallery");
                setTimeout(() => {
                    targetItem.classList.remove("highlight-gallery");
                }, 4000);
            }, 350);
        }
    };

    function compareValues(valA, valB, state, indexA, indexB) {
        if (state === 1) return valA.localeCompare(valB);
        if (state === 2) return valB.localeCompare(valA);
        if (state === 3) return indexB - indexA;
        return 0;
    }

    function updateSortIcon(btnId, iconId, state, typeName) {
        const icon = document.getElementById(iconId);
        const btn = document.getElementById(btnId);

        const tooltips = [
            `Sort ${typeName}`,
            "Ascending (A-Z)",
            "Descending (Z-A)",
            "Reverse Default Order",
        ];

        if (btn) btn.setAttribute("data-tooltip", tooltips[state]);

        if (icon) {
            icon.className =
                "fas " +
                (state === 0
                    ? "fa-sort"
                    : state === 1
                        ? "fa-sort-up"
                        : state === 2
                            ? "fa-sort-down"
                            : "fa-arrow-up");
        }
    }

    window.handleSort = function (clickedCol) {
        const table = document.getElementById("matrix-table-body");

        sortState[clickedCol] = (sortState[clickedCol] + 1) % 4;

        updateSortIcon(
            "matrix-btn-sort-project",
            "matrix-icon-sort-project",
            sortState.title,
            "Projects",
        );
        updateSortIcon(
            "matrix-btn-sort-type",
            "matrix-icon-sort-type",
            sortState.type,
            "Type",
        );

        let primaryCol, secondaryCol;
        if (sortState.type !== 0) {
            primaryCol = "type";
            secondaryCol = "title";
        } else {
            primaryCol = "title";
            secondaryCol = "type";
        }

        const getText = (row, colName) => {
            const index = colName === "title" ? 1 : 2;
            const cell = row.cells[index];
            if (!cell) return "";

            if (colName === "title") {
                const link = cell.querySelector(".matrix-table-title-text");
                return link
                    ? link.innerText.trim().toLowerCase()
                    : cell.innerText.trim().toLowerCase();
            }
            if (colName === "type") {
                const badge = cell.querySelector(".matrix-type-tag");
                return badge
                    ? badge.innerText.trim().toLowerCase()
                    : cell.innerText.trim().toLowerCase();
            }
            return cell.innerText.trim().toLowerCase();
        };

        const sortedRows = [...originalRows].sort((rowA, rowB) => {
            const indexA = originalRows.indexOf(rowA);
            const indexB = originalRows.indexOf(rowB);

            const valA1 = getText(rowA, primaryCol);
            const valB1 = getText(rowB, primaryCol);
            const result1 = compareValues(
                valA1,
                valB1,
                sortState[primaryCol],
                indexA,
                indexB,
            );
            if (result1 !== 0) return result1;

            const valA2 = getText(rowA, secondaryCol);
            const valB2 = getText(rowB, secondaryCol);
            const result2 = compareValues(
                valA2,
                valB2,
                sortState[secondaryCol],
                indexA,
                indexB,
            );
            if (result2 !== 0) return result2;

            return indexA - indexB;
        });

        sortedRows.forEach((row) => table.appendChild(row));

        if (typeof window.filterTable === "function") window.filterTable();
    };

    window.toggleKpiFilter = function (clickedCard) {
        const filterType = clickedCard.getAttribute("data-filter");
        if (!filterType) return;

        const isNowActive = !clickedCard.classList.contains(
            "analytics-active-filter",
        );
        const allMatchingFilters = document.querySelectorAll(
            `.analytics-kpi-card[data-filter="${filterType}"]`,
        );

        allMatchingFilters.forEach((filterEl) => {
            filterEl.classList.toggle("analytics-active-filter", isNowActive);
        });

        if (window.innerWidth <= 768) {
            clickedCard.blur();

            if (!isNowActive) {
                window.focus();
                document.body.click();
            }
        }

        runAnalyticsFilter();
    };

    window.runAnalyticsFilter = function () {
        const searchInput = document.querySelector(".analytics-search-input");
        const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : "";
        const searchTerms = searchVal
            .split(",")
            .map((term) => term.trim())
            .filter((term) => term.length > 0);

        const activeKpiCards = document.querySelectorAll(
            ".analytics-kpi-row .analytics-kpi-card.analytics-active-filter",
        );
        const activeCategories = Array.from(activeKpiCards).map((card) =>
            card.getAttribute("data-filter"),
        );

        let visibleArticles = 0;
        let visibleCode = 0;
        let visibleBooks = 0;

        const checkMatch = (elementText, elementCategory, elementYear) => {
            const matchesText =
                searchTerms.length === 0 ||
                searchTerms.some(
                    (term) =>
                        elementText.includes(term) ||
                        (elementYear && elementYear.includes(term)),
                );

            let matchesCategory = false;

            if (activeCategories.length === 0) {
                matchesCategory = true;
            } else {
                if (activeCategories.includes("code") && elementCategory === "code") {
                    matchesCategory = true;
                }

                if (activeCategories.includes("article")) {
                    if (
                        elementCategory === "article" ||
                        elementCategory === "book-article"
                    ) {
                        matchesCategory = true;
                    }
                }

                if (activeCategories.includes("book")) {
                    if (
                        elementCategory === "book" ||
                        elementCategory === "book-article"
                    ) {
                        matchesCategory = true;
                    }
                }
            }

            return matchesText && matchesCategory;
        };

        const cards = document.querySelectorAll(".analytics-carousel-card");
        cards.forEach((card) => {
            const text = card.innerText.toLowerCase();
            const category = card.getAttribute("data-category");
            const year = card.getAttribute("data-year");

            if (checkMatch(text, category, year)) {
                card.style.opacity = "1";
                card.style.display = "flex";
                card.style.transform = card.style.transform.replace("scale(0)", "");
                card.style.pointerEvents = "auto";

                if (category === "code") visibleCode++;

                if (category === "code") visibleArticles++;
                if (category === "article" || category === "book-article")
                    visibleArticles++;

                if (category === "book") visibleBooks++;
            } else {
                card.style.opacity = "0";
                card.style.display = "none";
                card.style.pointerEvents = "none";
            }
        });

        const planets = document.querySelectorAll(".planet");
        planets.forEach((planet) => {
            const text = planet.innerText.toLowerCase();
            const category = planet.getAttribute("data-category");
            const year = planet.getAttribute("data-year");
            if (checkMatch(text, category, year)) {
                planet.style.display = "flex";
            } else {
                planet.style.display = "none";
            }
        });

        const isSearchActive = searchTerms.length > 0;
        const totalKpiCategories = document.querySelectorAll(
            ".analytics-kpi-row .analytics-kpi-card",
        ).length;
        const numActiveCategories = activeCategories.length;
        const showFraction =
            isSearchActive ||
            (numActiveCategories > 0 && numActiveCategories < totalKpiCategories);

        const articlesEl = document.getElementById("analytics-kpi-articles");
        const openSourceEl = document.getElementById("analytics-kpi-opensource");
        const booksEl = document.getElementById("analytics-kpi-books");

        if (articlesEl) {
            articlesEl.innerHTML = showFraction
                ? `${visibleArticles}<span class="analytics-kpi-total-fraction">/${totalArticles}</span>`
                : visibleArticles;
        }
        if (openSourceEl) {
            openSourceEl.innerHTML = showFraction
                ? `${visibleCode}<span class="analytics-kpi-total-fraction">/${totalCode}</span>`
                : visibleCode;
        }
        if (booksEl) {
            booksEl.innerHTML = showFraction
                ? `${visibleBooks}<span class="analytics-kpi-total-fraction">/${totalBooks}</span>`
                : visibleBooks;
        }

        const orbitView = document.getElementById("analytics-view-orbit");
        const isOrbitActive = orbitView && orbitView.style.display !== "none";
        const anyVisible = Array.from(cards).some(
            (c) => c.style.display !== "none",
        );

        let msg = document.getElementById("analytics-no-results");
        const glassContainer = document.querySelector(".analytics-glass-container");

        if (!anyVisible) {
            if (!msg) {
                msg = document.createElement("div");
                msg.id = "analytics-no-results";
                msg.style.position = "absolute";
                msg.style.top = "50%";
                msg.style.left = "50%";
                msg.style.transform = "translate(-50%, -50%)";
                msg.style.textAlign = "center";
                msg.style.width = "100%";
                msg.style.zIndex = "100";
                msg.style.color = "#ff6b6b";
                msg.style.fontSize = "1em";
                msg.style.letterSpacing = "0.5px";
                msg.innerHTML = `<i class="fas fa-ghost" style="font-size: 4em; margin-bottom: 20px; display: block;"></i> No projects found matching criteria`;
                glassContainer.appendChild(msg);
            }
            msg.style.display = "block";
            if (isOrbitActive)
                document.querySelector(".analytics-orbit-container").style.opacity =
                    "0";
            else
                document.querySelector(".analytics-carousel-scene").style.opacity = "0";
        } else {
            if (msg) msg.style.display = "none";
            if (document.querySelector(".analytics-orbit-container"))
                document.querySelector(".analytics-orbit-container").style.opacity =
                    "1";
            if (document.querySelector(".analytics-carousel-scene"))
                document.querySelector(".analytics-carousel-scene").style.opacity = "1";
            updateCarouselLayout();
            updateOrbitLayout();
        }
    };

    const analyticsSearchInput = document.querySelector(
        ".analytics-search-input",
    );
    if (analyticsSearchInput) {
        analyticsSearchInput.addEventListener("keyup", runAnalyticsFilter);
    }

    window.filterTable = function () {
        const searchInput = document
            .getElementById("matrix-filter-project")
            .value.toLowerCase();

        const searchTerms = searchInput
            .split(",")
            .map((term) => term.trim())
            .filter((term) => term.length > 0);

        const tbody = document.getElementById("matrix-table-body");

        const rows = Array.from(tbody.querySelectorAll("tr:not(#no-results-row)"));
        const countIcon = document.getElementById("matrix-total-count-icon");

        const checkboxes = document.querySelectorAll(
            '#matrix-type-multiselect input[type="checkbox"]',
        );
        const selectedTypes = Array.from(checkboxes)
            .filter((checkbox) => checkbox.checked)
            .map((checkbox) => checkbox.value.toLowerCase().trim());

        const triggerText = document.getElementById("matrix-type-trigger-text");
        const triggerBtn = document.querySelector(
            "#matrix-type-multiselect .custom-select-trigger",
        );

        if (triggerText && triggerBtn) {
            triggerText.style.color = "";

            if (selectedTypes.length === checkboxes.length) {
                triggerText.innerText = "All Types";
                triggerBtn.classList.remove("filter-active");
                triggerBtn.setAttribute("data-tooltip", "Filter Types");
            } else if (selectedTypes.length === 0) {
                triggerText.innerText = "None";
                triggerBtn.classList.add("filter-active");
                triggerBtn.setAttribute("data-tooltip", "Edit Filter");
            } else {
                triggerText.innerText = `${selectedTypes.length} Selected`;
                triggerBtn.classList.add("filter-active");
                triggerBtn.setAttribute("data-tooltip", "Edit Filter");
            }
        }

        let visibleCount = 0;

        for (let row of rows) {
            const projectText = row.cells[1].innerText
                .toLowerCase()
                .replace(/\s+/g, " ")
                .trim();
            const typeText = row.cells[2].innerText
                .toLowerCase()
                .replace(/\s+/g, " ")
                .trim();
            const yearText = (row.getAttribute("data-year") || "").trim();

            const matchProject =
                searchTerms.length === 0 ||
                searchTerms.some(
                    (term) => projectText.includes(term) || yearText.includes(term),
                );

            const matchType =
                selectedTypes.length > 0 &&
                selectedTypes.some((type) => {
                    if (type === "articles-insights") return typeText.includes("article");

                    const normalized = type.replace(/-/g, " ");
                    return typeText.includes(normalized);
                });

            if (matchProject && matchType) {
                row.style.display = "";
                visibleCount++;
            } else {
                row.style.display = "none";
            }
        }

        let noResultsRow = document.getElementById("no-results-row");
        if (visibleCount === 0) {
            if (!noResultsRow) {
                noResultsRow = document.createElement("tr");
                noResultsRow.id = "no-results-row";
                noResultsRow.innerHTML = `<td colspan="6" style="text-align: center; padding: 40px 20px; color: #ff6b6b; font-size: 1em; letter-spacing: 0.5px; border-bottom: none;"><i class="fas fa-ghost" style="font-size: 1.5em; margin-bottom: 10px; display: block;"></i> No projects found matching criteria</td>`;
                tbody.appendChild(noResultsRow);
            } else {
                noResultsRow.style.display = "";
            }
        } else {
            if (noResultsRow) {
                noResultsRow.remove();
            }
        }

        const countWrapper = document.getElementById("matrix-total-wrapper");
        if (countWrapper) {
            countWrapper.setAttribute("data-tooltip", `Showing: ${visibleCount}`);
        }
    };

    function handleUrlHash() {
        const hash = window.location.hash.substring(1);

        if (hash === "stream-lightbox") {
            switchView("card");
            if (typeof openStreamOverlay === "function") openStreamOverlay();
            return;
        }
        if (hash === "registry-lightbox") {
            switchView("matrix");

            setTimeout(() => {
                const openFunc = window.openTableLightbox || openTableLightbox;
                if (typeof openFunc === "function") openFunc();
            }, 0);
            return;
        }

        if (hash === "media-lightbox") {
            switchView("gallery");

            const grid = document.getElementById("gallery-grid");
            if (!grid) return;

            if (typeof filterGallery === "function") filterGallery();

            let firstVisibleItem = null;

            if (grid.classList.contains("gallery-updates-mode")) {
                firstVisibleItem = grid.querySelector(
                    '.gallery-item.gallery-update-card:not([style*="display: none"])',
                );
            } else if (grid.classList.contains("gallery-stats-mode")) {
                firstVisibleItem = grid.querySelector(
                    '.gallery-item.gallery-stats-card:not([style*="display: none"])',
                );
            } else {
                firstVisibleItem = grid.querySelector(
                    '.gallery-item:not(.gallery-stats-card):not(.gallery-update-card):not([style*="display: none"])',
                );
            }

            if (firstVisibleItem) {
                const firstImg = firstVisibleItem.querySelector(".gallery-img");
                if (firstImg) openLightbox(firstImg);
            }
            return;
        }

        if (hash === "dashboard-lightbox") {
            switchView("analytics");
            if (typeof switchAnalyticsView === "function") {
                switchAnalyticsView("carousel");
            }

            setTimeout(() => {
                const container = document.querySelector(".analytics-glass-container");
                if (
                    container &&
                    !container.classList.contains("analytics-fullscreen-active")
                ) {
                    if (typeof toggleAnalyticsFullscreen === "function") {
                        toggleAnalyticsFullscreen();
                    }
                }
            }, 0);
            return;
        }

        const lightboxes = [
            "stream-lightbox",
            "registry-lightbox",
            "media-lightbox",
            "dashboard-lightbox",
        ];
        const isLightboxHash = lightboxes.some(
            (lb) => hash.startsWith(lb) || hash === lb,
        );
        if (!isLightboxHash) {
            const overlay = document.getElementById("stream-overlay-modal");
            const matrixModal = document.getElementById("matrix-modal");
            const galleryModal = document.getElementById("gallery-modal");
            const analyticsContainer = document.querySelector(
                ".analytics-glass-container",
            );

            if (overlay?.classList.contains("active")) closeStreamOverlay();
            if (matrixModal?.matches(":popover-open")) window.closeTableLightbox();
            if (galleryModal?.style.display === "flex") closeLightbox();
            if (
                analyticsContainer?.classList.contains("analytics-fullscreen-active")
            ) {
                toggleAnalyticsFullscreen();
            }
        }

        if (hash === "matrix") {
            switchView("matrix");
        } else if (hash === "about") {
            switchView("about");
        } else if (hash === "card" || hash === "") {
            switchView("card");
        } else if (hash === "gallery" || hash.startsWith("gallery-")) {
            switchView("gallery");

            const mode = hash.includes("-") ? hash.split("-")[1] : "grid";

            const targetSegment = document.querySelector(
                `.control-segment[data-mode="${mode}"]`,
            );
            if (targetSegment) {
                targetSegment.click();
            }
        } else if (hash === "analytics-orbit") {
            switchView("analytics");
            switchAnalyticsView("orbit");
        } else if (hash === "analytics-carousel" || hash === "analytics") {
            switchView("analytics");
            switchAnalyticsView("carousel");
        } else if (
            ["card-", "project-", "insight-", "book-", "update-"].some((prefix) =>
                hash.startsWith(prefix),
            ) ||
            [
                "the-ai-atlas-section",
                "open-source-projects",
                "articles-insights",
                "digital-bookshelf",
                "updates",
            ].includes(hash)
        ) {
            switchView("card");

            const targetElement = document.getElementById(hash);

            if (targetElement) {
                const contentWrapper = targetElement.classList.contains(
                    "intro-collapsible-section-content",
                )
                    ? targetElement
                    : targetElement.closest(".intro-collapsible-section-content") ||
                    targetElement.querySelector(".intro-collapsible-section-content");

                if (contentWrapper) {
                    contentWrapper.classList.add("card-expanded");
                    const sectionId = contentWrapper.id;
                    const triggerBtn = document.querySelector(
                        `.card-section-trigger[data-target="${sectionId}"], #card-the-ai-atlas-trigger-btn`,
                    );

                    if (triggerBtn) {
                        triggerBtn.classList.add("card-expanded");
                        triggerBtn.setAttribute("aria-expanded", "true");

                        const itemCount = contentWrapper.querySelectorAll(
                            ".card-showcase-item, .card-shell",
                        ).length;
                        triggerBtn.setAttribute(
                            "data-tooltip",
                            `Collapse All\n(${itemCount} Items)`,
                        );
                    }
                }

                let flashRgb = "133, 193, 233";

                if (
                    targetElement.closest("#card-articles-content-wrapper") ||
                    hash === "articles-insights"
                ) {
                    flashRgb = "210, 180, 222";
                } else if (
                    targetElement.closest("#card-open-source-content-wrapper") ||
                    hash === "open-source-projects"
                ) {
                    flashRgb = "133, 193, 233";
                } else if (
                    targetElement.closest("#card-bookshelf-content-wrapper") ||
                    targetElement.closest("#card-the-ai-atlas-content-wrapper") ||
                    hash === "digital-bookshelf" ||
                    hash === "the-ai-atlas-section"
                ) {
                    flashRgb = "247, 220, 111";
                } else if (
                    targetElement.closest("#card-updates-content-wrapper") ||
                    hash === "updates"
                ) {
                    flashRgb = "255, 96, 144";
                }

                setTimeout(() => {
                    targetElement.scrollIntoView({ behavior: "smooth", block: "center" });

                    const highlightTarget = ["SECTION"].includes(targetElement.tagName)
                        ? targetElement.querySelector(
                            ".card-showcase-item, .card-book-showcase, .card-modern-glass",
                        )
                        : targetElement;

                    if (highlightTarget) {
                        highlightTarget.style.setProperty("--flash-rgb", flashRgb);
                        highlightTarget.classList.remove("highlight-card");
                        void highlightTarget.offsetWidth;
                        highlightTarget.classList.add("highlight-card");

                        setTimeout(() => {
                            highlightTarget.classList.remove("highlight-card");
                            highlightTarget.style.removeProperty("--flash-rgb");
                        }, 6000);
                    }
                }, 400);
            }
        }
    }

    document.querySelectorAll(".planet").forEach((planet) => {
        planet.addEventListener("dblclick", function (e) {
            e.preventDefault();
            const targetId = this.getAttribute("data-target");
            if (targetId) window.jumpToCard(targetId);
        });
    });

    document.querySelectorAll(".analytics-carousel-card").forEach((card) => {
        card.addEventListener("dblclick", function (e) {
            e.preventDefault();
            const targetId = this.getAttribute("data-target");
            if (targetId) window.jumpToCard(targetId);
        });

        card.addEventListener("click", function (e) {
            if (isManualHighlightMode) {
                if (useDefaultHighlightStyle) {
                    this.classList.toggle("highlight");
                } else {
                    this.classList.toggle("selected");
                }
            } else {
                if (carouselResumeTimer) clearTimeout(carouselResumeTimer);

                document
                    .querySelectorAll(".analytics-carousel-card")
                    .forEach((c) => c.classList.remove("highlight"));
                this.classList.add("highlight");

                carouselResumeTimer = setTimeout(() => {
                    if (isPlaying) {
                        this.classList.remove("highlight");
                    }
                }, 1000);
            }
        });
    });

    const pinModeBtn = document.getElementById("pinModeBtn");
    if (pinModeBtn) {
        pinModeBtn.addEventListener("click", function () {
            isManualHighlightMode = !isManualHighlightMode;
            this.classList.toggle("active");

            if (!isManualHighlightMode) {
                document
                    .querySelectorAll(
                        ".analytics-carousel-card.selected, .analytics-carousel-card.highlight",
                    )
                    .forEach((card) => {
                        card.classList.remove("selected");
                        card.classList.remove("highlight");
                    });

                if (!isPlaying) {
                    updateHighlights();
                }
            } else {
                removeHighlights();
            }
        });
    }

    const highlightStyleBtn = document.getElementById("highlightStyleBtn");
    if (highlightStyleBtn) {
        highlightStyleBtn.addEventListener("click", function () {
            useDefaultHighlightStyle = !useDefaultHighlightStyle;
            this.classList.toggle("active");

            const pinnedCards = document.querySelectorAll(
                ".analytics-carousel-card.selected, .analytics-carousel-card.highlight",
            );

            pinnedCards.forEach((card) => {
                card.classList.toggle("selected");
                card.classList.toggle("highlight");
            });
        });
    }

    const speedControlBtn = document.getElementById("speedControlBtn");
    if (speedControlBtn) {
        const speedLabel = document.getElementById("speedLabel");

        speedControlBtn.addEventListener("click", function () {
            currentSpeedIndex = (currentSpeedIndex + 1) % speedSettings.length;
            const newSpeed = speedSettings[currentSpeedIndex];

            rotationSpeed = newSpeed.value;

            speedLabel.textContent = newSpeed.label;

            if (newSpeed.label === "1x") {
                this.classList.remove("active");
            } else {
                this.classList.add("active");
            }
        });
    }

    if (typeof filterCards === "function") {
        filterCards(false);
    }

    flashNavHoverEffect(".card-internal-nav .card-nav-pill", 800);

    const cardTrigger = document.querySelector(
        "#card-multiselect .custom-select-trigger",
    );
    const cardPopover = document.getElementById("card-filter-popover");
    initializeHoverPopover(cardTrigger, cardPopover);

    const matrixTrigger = document.querySelector(
        "#matrix-type-multiselect .custom-select-trigger",
    );
    const matrixPopover = document.getElementById("matrix-type-filter-popover");
    initializeHoverPopover(matrixTrigger, matrixPopover);

    const galleryTrigger = document.querySelector(
        "#gallery-multiselect .custom-select-trigger",
    );
    const galleryPopover = document.getElementById("gallery-filter-popover");
    initializeHoverPopover(galleryTrigger, galleryPopover);

    const expandBtn = document.getElementById("matrix-open-table-lightbox-btn");
    const tableLightbox = document.getElementById("matrix-modal");
    const tableContainer = document.querySelector(
        "#view-matrix .matrix-table-container",
    );
    const tablePlaceholder = document.getElementById("matrix-table-placeholder");
    const tableLightboxContent = document.getElementById("matrix-modal-content");
    const body = document.body;

    function openTableLightbox() {
        if (
            !tableContainer ||
            !tableLightboxContent ||
            !tablePlaceholder ||
            !tableLightbox
        ) {
            console.error("Lightbox elements missing");
            return;
        }

        tablePlaceholder.style.height = tableContainer.offsetHeight + "px";
        tablePlaceholder.style.display = "block";

        tableContainer.classList.add("matrix-modal-lightbox-active-table");
        tableLightboxContent.appendChild(tableContainer);

        tableLightbox.showPopover();

        body.classList.add("matrix-modal-lightbox-active-scrollbar");

        history.pushState(null, null, "#registry-lightbox");
    }

    window.openTableLightbox = openTableLightbox;

    window.closeTableLightbox = function () {
        const tableLightbox = document.getElementById("matrix-modal");
        const body = document.body;

        const wasOpen = tableLightbox && tableLightbox.matches(":popover-open");

        const tableContainer =
            document.querySelector("#matrix-modal-content .matrix-table-container") ||
            document.querySelector("#view-matrix .matrix-table-container");
        const tablePlaceholder = document.getElementById(
            "matrix-table-placeholder",
        );

        const closeBtn = document.querySelector(
            ".matrix-close-lightbox.matrix-btn-close",
        );

        killTooltip(closeBtn);

        if (!tableContainer || !tablePlaceholder || !tableLightbox) return;

        const originalParent = tablePlaceholder.parentNode;
        if (originalParent) {
            tableContainer.classList.remove("matrix-modal-lightbox-active-table");
            originalParent.insertBefore(tableContainer, tablePlaceholder);
        }

        tablePlaceholder.style.display = "none";

        try {
            tableLightbox.hidePopover();
        } catch (e) { }

        body.classList.remove("matrix-modal-lightbox-active-scrollbar");

        if (wasOpen) history.pushState(null, null, "#matrix");

        if (closeBtn) {
            setTimeout(() => {
                closeBtn.classList.remove("interaction-cooldown");
            }, 300);
        }
    };

    if (expandBtn) {
        expandBtn.addEventListener("click", (e) => {
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;

            e.preventDefault();
            openTableLightbox();
        });
    }

    const closeBtn = document.querySelector(".matrix-btn-close");

    if (closeBtn) {
        closeBtn.addEventListener("click", (e) => {
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;

            e.preventDefault();
            window.closeTableLightbox();
        });
    }

    if (tableLightbox) {
        tableLightbox.addEventListener("click", (e) => {
            if (e.target === tableLightbox) {
                const anyPopoverOpen =
                    document.querySelectorAll(
                        "#matrix-modal-content .custom-options[popover]:popover-open, " +
                        "#matrix-modal-content .export-menu[popover]:popover-open, " +
                        "#matrix-modal-content .image-export-menu[popover]:popover-open",
                    ).length > 0;

                if (!anyPopoverOpen) {
                    closeTableLightbox();
                }
            }
        });

        const lightboxContent = document.getElementById("matrix-modal-content");
        if (lightboxContent) {
            lightboxContent.addEventListener("click", (e) => {
                e.stopPropagation();
            });
        }

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && tableLightbox.matches(":popover-open")) {
                const childPopovers = lightboxContent.querySelectorAll(
                    "[popover]:popover-open",
                );
                if (childPopovers.length === 0) {
                    closeTableLightbox();
                }
            }
        });

        tableLightbox.addEventListener("toggle", (e) => {
            if (e.newState === "closed") {
                closeTableLightbox();
            }
        });
    }

    let touchStartX = 0;
    const lightboxModal = document.getElementById("gallery-modal");

    if (lightboxModal) {
        lightboxModal.addEventListener(
            "touchstart",
            function (event) {
                if (
                    event.target.classList.contains("lightbox-content") ||
                    event.target.id === "gallery-video"
                ) {
                    touchStartX = event.touches[0].clientX;
                }
            },
            { passive: true },
        );

        lightboxModal.addEventListener("touchend", function (event) {
            if (touchStartX === 0) return;

            let touchEndX = event.changedTouches[0].clientX;
            const swipeThreshold = 50;
            const distance = touchEndX - touchStartX;

            if (distance > swipeThreshold) {
                showPrevItem();
            } else if (distance < -swipeThreshold) {
                showNextItem();
            }

            touchStartX = 0;
        });
    }

    let isOrbitPlaying = true;
    let isOrbitPinMode = false;

    let useOrbitDefaultStyle = false;
    let orbitSpeedIndex = 2;

    const orbitSpeeds = [
        { label: "0.25x", multiplier: 4 },
        { label: "0.5x", multiplier: 2 },
        { label: "1x", multiplier: 1 },
        { label: "2x", multiplier: 0.5 },
        { label: "4x", multiplier: 0.25 },
        { label: "8x", multiplier: 0.125 },
        { label: "16x", multiplier: 0.0625 },
    ];

    window.toggleOrbitPlay = function () {
        isOrbitPlaying = !isOrbitPlaying;
        const container = document.querySelector(".analytics-orbit-container");
        const playButton = document.getElementById("orbitPlayPauseBtn");
        const playIcon = playButton.querySelector("i");
        const stopButton = document.getElementById("orbitStopBtn");
        const stopIcon = stopButton.querySelector("i");

        if (isOrbitPlaying) {
            container.classList.remove("analytics-orbit-paused");
            container.classList.remove("analytics-planets-paused");
            playIcon.classList.remove("fa-play");
            playIcon.classList.add("fa-pause");
            playButton.classList.remove("active");

            if (stopButton) {
                stopIcon.classList.remove("fa-play");
                stopIcon.classList.add("fa-stop");
                stopButton.classList.remove("active");
            }
        } else {
            container.classList.add("analytics-orbit-paused");
            playIcon.classList.remove("fa-pause");
            playIcon.classList.add("fa-play");
            playButton.classList.add("active");
        }
    };

    const orbitStopBtn = document.getElementById("orbitStopBtn");
    if (orbitStopBtn) {
        orbitStopBtn.addEventListener("click", function () {
            const container = document.querySelector(".analytics-orbit-container");
            const playButton = document.getElementById("orbitPlayPauseBtn");
            const playIcon = playButton.querySelector("i");
            const stopIcon = this.querySelector("i");

            if (isOrbitPlaying) {
                isOrbitPlaying = false;
                container.classList.add("analytics-orbit-paused");
                container.classList.add("analytics-planets-paused");
                playIcon.classList.remove("fa-pause");
                playIcon.classList.add("fa-play");
                playButton.classList.add("active");
                stopIcon.classList.remove("fa-stop");
                stopIcon.classList.add("fa-play");
                this.classList.add("active");
            } else {
                isOrbitPlaying = true;
                container.classList.remove("analytics-orbit-paused");
                container.classList.remove("analytics-planets-paused");
                playIcon.classList.remove("fa-play");
                playIcon.classList.add("fa-pause");
                playButton.classList.remove("active");
                stopIcon.classList.remove("fa-play");
                stopIcon.classList.add("fa-stop");
                this.classList.remove("active");
            }
        });
    }

    const orbitPinBtn = document.getElementById("orbitPinBtn");
    if (orbitPinBtn) {
        orbitPinBtn.addEventListener("click", function () {
            isOrbitPinMode = !isOrbitPinMode;
            this.classList.toggle("active");

            if (!isOrbitPinMode) {
                document
                    .querySelectorAll(".planet.highlight, .planet.selected")
                    .forEach((p) => {
                        p.classList.remove("highlight");
                        p.classList.remove("selected");
                    });
            }
        });
    }

    const orbitStyleBtn = document.getElementById("orbitStyleBtn");
    if (orbitStyleBtn) {
        orbitStyleBtn.addEventListener("click", function () {
            useOrbitDefaultStyle = !useOrbitDefaultStyle;
            this.classList.toggle("active");

            document
                .querySelector(".analytics-orbit-container")
                .classList.toggle("analytics-orbit-colorful");

            const pinnedPlanets = document.querySelectorAll(
                ".planet.highlight, .planet.selected",
            );
            pinnedPlanets.forEach((p) => {
                p.classList.toggle("highlight");
                p.classList.toggle("selected");
            });
        });
    }

    const orbitGlowBtn = document.getElementById("orbitGlowBtn");
    if (orbitGlowBtn) {
        orbitGlowBtn.addEventListener("click", function () {
            document
                .querySelector(".analytics-orbit-container")
                .classList.toggle("analytics-orbit-extra-glow");
            this.classList.toggle("active");
        });
    }

    document.querySelectorAll(".planet").forEach((planet) => {
        planet.addEventListener("click", function (e) {
            if (isOrbitPinMode) {
                e.preventDefault();

                if (useOrbitDefaultStyle) {
                    this.classList.toggle("highlight");
                    this.classList.remove("selected");
                } else {
                    this.classList.toggle("selected");
                    this.classList.remove("highlight");
                }
            }
        });
    });

    function updateOrbitPhysics() {
        const setting = orbitSpeeds[orbitSpeedIndex];

        const finalRate = 1 / setting.multiplier;

        const animatedElements = document.querySelectorAll(
            ".analytics-orbit-ring, .planet, .analytics-planet-content",
        );

        animatedElements.forEach((el) => {
            const animations = el.getAnimations();
            animations.forEach((anim) => {
                if (anim.updatePlaybackRate) {
                    anim.updatePlaybackRate(finalRate);
                } else {
                    anim.playbackRate = finalRate;
                }
            });
        });
    }

    const orbitSpeedBtn = document.getElementById("orbitSpeedBtn");
    if (orbitSpeedBtn) {
        orbitSpeedBtn.addEventListener("click", function () {
            orbitSpeedIndex = (orbitSpeedIndex + 1) % orbitSpeeds.length;
            const setting = orbitSpeeds[orbitSpeedIndex];

            const labelEl = document.getElementById("orbitSpeedLabel");
            if (labelEl) labelEl.textContent = setting.label;

            if (setting.label === "1x") {
                this.classList.remove("active");
            } else {
                this.classList.add("active");
            }

            updateOrbitPhysics();
        });
    }

    window.reverseOrbit = function () {
        const container = document.querySelector(".analytics-orbit-container");
        if (container) container.classList.add("analytics-orbit-reverse");

        const reverseBtn = document.getElementById("orbitReverseBtn");
        if (reverseBtn) reverseBtn.classList.add("active");

        updateOrbitPhysics();
    };

    window.resetOrbitDirection = function () {
        const container = document.querySelector(".analytics-orbit-container");
        if (container) container.classList.remove("analytics-orbit-reverse");

        const reverseBtn = document.getElementById("orbitReverseBtn");
        if (reverseBtn) reverseBtn.classList.remove("active");

        updateOrbitPhysics();
    };

    const titleControls = document.getElementById("matrix-title-controls");

    const matrixTableContainer = document.querySelector(
        "#view-matrix .matrix-table-container",
    );

    if (matrixTableContainer && titleControls) {
        const openBtn = titleControls.querySelector(".matrix-search-open-btn");
        const searchExpandable = titleControls.querySelector(
            ".matrix-search-expandable",
        );
        const searchInput = searchExpandable.querySelector(
            "#matrix-filter-project",
        );

        const closeBtn = searchExpandable.querySelector(".matrix-search-close-btn");
        const confirmBtn = searchExpandable.querySelector(
            ".matrix-search-confirm-btn",
        );

        matrixTableContainer.prepend(searchExpandable);

        const openSearch = (e) => {
            if (e) e.stopPropagation();

            matrixTableContainer.classList.add("search-active");
            searchInput.focus();
        };

        const cancelSearch = () => {
            matrixTableContainer.classList.remove("search-active");
            searchInput.value = "";
            openBtn.classList.remove("filter-active");

            openBtn.setAttribute("data-tooltip", "Search Projects");

            if (typeof filterTable === "function") {
                filterTable();
            }
        };

        const confirmSearch = (e) => {
            if (e) e.stopPropagation();

            matrixTableContainer.classList.remove("search-active");

            if (searchInput.value.trim() !== "") {
                openBtn.classList.add("filter-active");

                openBtn.setAttribute("data-tooltip", "Edit / Clear Filter");
            } else {
                openBtn.classList.remove("filter-active");

                openBtn.setAttribute("data-tooltip", "Search Projects");
            }
        };

        openBtn.addEventListener("click", openSearch);
        closeBtn.addEventListener("click", cancelSearch);

        if (confirmBtn) {
            confirmBtn.addEventListener("click", confirmSearch);
        }

        searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Escape") cancelSearch();
            if (e.key === "Enter") confirmSearch(e);
        });

        document.addEventListener("click", function (event) {
            if (!matrixTableContainer.classList.contains("search-active")) return;

            const isClickInsideBar = searchExpandable.contains(event.target);

            if (!isClickInsideBar) {
                cancelSearch();
            }
        });
    }

    function _resetCardViewInternals() {
        const isStreamActive = document
            .getElementById("stream-overlay-modal")
            ?.classList.contains("active");

        if (isStreamActive) {
            const streamSearch = document.getElementById("stream-card-search");
            if (streamSearch) streamSearch.value = "";

            const streamCheckboxes = document.querySelectorAll(
                '#stream-cloned-filters input[type="checkbox"]',
            );
            streamCheckboxes.forEach((cb) => (cb.checked = true));

            streamCardTitleSortState = 0;
            streamCardCategorySortState = 0;

            document
                .querySelectorAll(".stream-clone.card-stream-highlighted")
                .forEach((card) => {
                    card.classList.remove("card-stream-highlighted");
                });

            const titleIcon = document.querySelector(
                "#stream-cloned-filters #card-icon-sort-card-title",
            );
            const catIcon = document.querySelector(
                "#stream-cloned-filters #card-icon-sort-card-category",
            );
            if (titleIcon && typeof updateSortIconUI === "function")
                updateSortIconUI(titleIcon, 0);
            if (catIcon && typeof updateSortIconUI === "function")
                updateSortIconUI(catIcon, 0);

            const titleBtn = document.querySelector(
                "#stream-cloned-filters #card-btn-sort-card-title",
            );
            const catBtn = document.querySelector(
                "#stream-cloned-filters #btn-sort-card-category",
            );
            if (titleBtn) titleBtn.setAttribute("data-tooltip", "Sort Cards");
            if (catBtn) catBtn.setAttribute("data-tooltip", "Sort Sections");

            const nav = document.getElementById("stream-cloned-nav");
            if (nav) {
                const pills = nav.querySelectorAll(".card-nav-pill");
                const cyberLine = nav.querySelector(".card-cyber-line");
                const pinnedPill = nav.querySelector(
                    '.card-nav-pill[href="#the-ai-atlas-section"]',
                );

                if (pinnedPill && cyberLine) {
                    pills.forEach((p) => p.classList.remove("active", "simulated-hover"));
                    pinnedPill.classList.add("active", "card-default-active");

                    const index = Array.from(pills).indexOf(pinnedPill);
                    cyberLine.style.transform = `translateX(${index * 100}%)`;

                    const defaultColor = pinnedPill.getAttribute("data-default-color");
                    cyberLine.style.backgroundColor =
                        defaultColor || "rgba(255, 255, 255, 0.7)";
                    cyberLine.style.boxShadow = "none";
                }
            }

            if (typeof filterCards === "function") {
                filterCards(true);

                if (typeof applyStreamCombinedSort === "function") {
                    applyStreamCombinedSort();
                }

                setTimeout(() => {
                    const track = document.getElementById("stream-overlay-track");
                    if (track) {
                        track.scrollTo({ left: 0, behavior: "smooth" });

                        setTimeout(() => {
                            if (typeof updateStreamFocus === "function") updateStreamFocus();
                        }, 500);
                    }

                    flashNavHoverEffect(".stream-cloned-nav .card-nav-pill", 800);
                }, 50);
            }
        } else {
            if (typeof setCardLayout === "function") {
                setCardLayout("default");
            }

            const searchInput = document.getElementById("card-search");
            if (searchInput) searchInput.value = "";

            const checkboxes = document.querySelectorAll(
                '#card-multiselect input[type="checkbox"]',
            );
            checkboxes.forEach((cb) => (cb.checked = true));

            if (typeof cardTitleSortState !== "undefined") cardTitleSortState = 3;
            if (typeof sortCardTitles === "function") sortCardTitles();

            if (typeof cardCategorySortState !== "undefined")
                cardCategorySortState = 3;
            if (typeof sortCardCategories === "function") sortCardCategories();

            if (typeof filterCards === "function") {
                setTimeout(filterCards, 50);
            }

            const atlasSection = document.getElementById("the-ai-atlas-section");
            if (atlasSection) {
                atlasSection.classList.remove("force-title-visible");
            }
            updateLayoutControlsMargin();
        }
    }

    window.resetCardView = function () {
        const isStreamActive = document
            .getElementById("stream-overlay-modal")
            ?.classList.contains("active");

        const btnId = isStreamActive
            ? "stream-btn-reset-all"
            : "card-btn-reset-all";
        const btn = document.getElementById(btnId);
        const icon = btn ? btn.querySelector("i") : null;

        if (icon) {
            icon.classList.add("is-resetting");
            setTimeout(() => icon.classList.remove("is-resetting"), 1000);
        }

        _resetCardViewInternals();

        const toast = document.getElementById("toast-notification");
        if (toast) {
            toast.innerHTML = `<i class="fas fa-undo"></i> ${isStreamActive ? "Deck Reset Complete" : "Reset Complete"}`;
            toast.classList.add("show");
            setTimeout(() => toast.classList.remove("show"), 3000);
        }
    };

    window.resetAllAppFilters = function () {
        sessionStorage.removeItem("bioState");

        const resetBtn = document.querySelector(".settings-item.reset-btn");
        if (resetBtn) {
            resetBtn.classList.add("success-active");
            setTimeout(() => resetBtn.classList.remove("success-active"), 2000);
        }

        if (typeof _resetCardViewInternals === "function") {
            _resetCardViewInternals();
        }

        const matrixSearch = document.getElementById("matrix-filter-project");
        if (matrixSearch) {
            matrixSearch.value = "";
        }
        const matrixTableContainer = document.querySelector(
            ".matrix-table-container",
        );
        if (matrixTableContainer)
            matrixTableContainer.classList.remove("search-active");
        sortState.title = 0;
        sortState.type = 0;
        originalRows.forEach((row) => tbody.appendChild(row));
        if (typeof updateSortIcon === "function") {
            updateSortIcon(
                "matrix-btn-sort-project",
                "matrix-icon-sort-project",
                0,
                "Projects",
            );
            updateSortIcon(
                "matrix-btn-sort-type",
                "matrix-icon-sort-type",
                0,
                "Type",
            );
        }
        const matrixCheckboxes = document.querySelectorAll(
            '#matrix-type-multiselect input[type="checkbox"]',
        );
        matrixCheckboxes.forEach((cb) => (cb.checked = true));
        if (typeof window.filterTable === "function") window.filterTable();

        const gallerySearch = document.getElementById("gallery-search");
        if (gallerySearch) {
            gallerySearch.value = "";
        }
        const galleryCheckboxes = document.querySelectorAll(
            '#gallery-multiselect input[type="checkbox"]',
        );
        galleryCheckboxes.forEach((cb) => (cb.checked = true));

        const viewModeSwitch = document.getElementById("gallery-view-mode-switch");
        const gridEl = document.getElementById("gallery-grid");
        const galleryMultiSelect = document.getElementById("gallery-multiselect");
        const btnSortType = document.getElementById(
            "gallery-btn-sort-type-gallery",
        );

        if (viewModeSwitch && gridEl) {
            viewModeSwitch
                .querySelectorAll(".control-segment")
                .forEach((seg) => seg.classList.remove("active"));
            const gridSegment = viewModeSwitch.querySelector(
                '.control-segment[data-mode="grid"]',
            );
            if (gridSegment) gridSegment.classList.add("active");

            gridEl.classList.remove("gallery-stats-mode", "gallery-updates-mode");
            viewModeSwitch.setAttribute("data-active-mode", "grid");

            if (galleryMultiSelect) galleryMultiSelect.classList.remove("disabled");
            if (btnSortType) {
                btnSortType.classList.remove("disabled-button");
                const icon = document.getElementById("gallery-sort-icon-type");
                if (icon) icon.className = "fas fa-sort";
            }

            if (typeof gallerySortState !== "undefined") gallerySortState.type = 0;

            gallerySortStates.grid = { title: 0, type: 0 };
            gallerySortStates.metrics = { title: 0, type: 0 };
            gallerySortStates.updates = { title: 0, type: 0 };

            const currentMode =
                viewModeSwitch.getAttribute("data-active-mode") || "grid";
            const originalSet = window.originalItemSets
                ? window.originalItemSets[currentMode]
                : [];
            if (originalSet) {
                originalSet.forEach((item) => galleryGrid.appendChild(item));
            }

            if (typeof updateSortIcon === "function") {
                updateSortIcon(
                    "gallery-btn-sort-title",
                    "gallery-sort-icon-title",
                    0,
                    "Projects",
                );
                updateSortIcon(
                    "gallery-btn-sort-type-gallery",
                    "gallery-sort-icon-type",
                    0,
                    "Type",
                );
            }

            const dockItem = document.querySelector(
                `.dock-sub-item[data-action="view-grid"]`,
            );
            if (dockItem) {
                const group = dockItem.closest(".dock-sub-menu-inner");
                if (group)
                    group
                        .querySelectorAll(".dock-sub-item")
                        .forEach((el) => el.classList.remove("active"));
                dockItem.classList.add("active");
            }
        }

        setTimeout(() => {
            if (typeof window.filterGallery === "function") window.filterGallery();
        }, 50);

        const analyticsSearch = document.querySelector(".analytics-search-input");
        if (analyticsSearch) {
            analyticsSearch.value = "";
        }
        const kpiCards = document.querySelectorAll(".analytics-kpi-card");
        kpiCards.forEach((card) =>
            card.classList.remove("analytics-active-filter"),
        );
        if (typeof window.runAnalyticsFilter === "function")
            window.runAnalyticsFilter();

        if (typeof toggleSettingsDock === "function") {
            toggleSettingsDock();
        }
        const toast = document.getElementById("toast-notification");
        if (toast) {
            toast.innerHTML = `<i class="fas fa-undo"></i> All Filters Reset`;
            toast.classList.add("show");
            setTimeout(() => toast.classList.remove("show"), 3000);
        }
    };

    window.addEventListener("hashchange", handleUrlHash);

    handleUrlHash();
}

const layoutBtns = document.querySelectorAll(
    ".card-layout-controls .card-layout-mode-btn",
);

layoutBtns.forEach((btn) => {
    btn.addEventListener("click", function () {
        this.classList.add("interaction-cooldown");

        this.addEventListener(
            "mouseleave",
            () => {
                this.classList.remove("interaction-cooldown");
            },
            { once: true },
        );
    });
});

window.toggleAllSections = function () {
    const icon = document.getElementById("card-icon-toggle-all");
    const btn = document.getElementById("card-btn-toggle-all-sections");

    const isExpanded = icon.classList.contains("fa-compress-arrows-alt");
    const triggers = document.querySelectorAll(
        "#view-cards .card-section-trigger, #card-the-ai-atlas-trigger-btn",
    );
    const contents = document.querySelectorAll(
        "#view-cards .intro-collapsible-section-content",
    );

    if (isExpanded) {
        triggers.forEach((t) => {
            t.classList.remove("card-expanded");
            t.setAttribute("aria-expanded", "false");
            if (t.hasAttribute("data-tooltip"))
                t.setAttribute("data-tooltip", "Expand");
        });
        contents.forEach((c) => c.classList.remove("card-expanded"));

        icon.className = "fas fa-expand-arrows-alt";

        btn.classList.add("pink-mode");

        btn.setAttribute("data-tooltip", "Expand All Sections");
    } else {
        triggers.forEach((t) => {
            t.classList.add("card-expanded");
            t.setAttribute("aria-expanded", "true");
            if (t.hasAttribute("data-tooltip"))
                t.setAttribute("data-tooltip", "Collapse");
        });
        contents.forEach((c) => c.classList.add("card-expanded"));

        icon.className = "fas fa-compress-arrows-alt";

        btn.classList.remove("pink-mode");

        btn.setAttribute("data-tooltip", "Collapse All Sections");
    }
};

let cardTitleSortState = 0;
let cardCategorySortState = 0;

let streamCardTitleSortState = 0;
let streamCardCategorySortState = 0;

function getStreamCardValue(card, type) {
    if (type === "title") {
        return (card.innerText || "").trim().toLowerCase();
    } else if (type === "category") {
        return (card.getAttribute("data-stream-category") || "")
            .trim()
            .toLowerCase();
    }
    return 0;
}

function applyStreamCombinedSort() {
    const track = document.getElementById("stream-overlay-track");
    if (!track) return;

    const cards = Array.from(track.querySelectorAll(".stream-clone"));
    if (!cards.length) return;

    if (!cards[0].hasAttribute("data-stream-default-order")) {
        cards.forEach((card, index) =>
            card.setAttribute("data-stream-default-order", index),
        );
    }

    let primaryType, secondaryType;
    let primaryState, secondaryState;

    if (streamCardCategorySortState !== 0) {
        primaryType = "category";
        primaryState = streamCardCategorySortState;

        secondaryType = "title";
        secondaryState = streamCardTitleSortState;
    } else {
        primaryType = "title";
        primaryState = streamCardTitleSortState;

        secondaryType = "default";
        secondaryState = 0;
    }

    const compare = (valA, valB, state, indexA, indexB) => {
        if (state === 1) return valA.localeCompare(valB);
        if (state === 2) return valB.localeCompare(valA);
        if (state === 3) return indexB - indexA;
        return 0;
    };

    cards.sort((a, b) => {
        const indexA = parseInt(a.getAttribute("data-stream-default-order"));
        const indexB = parseInt(b.getAttribute("data-stream-default-order"));

        const valA1 = getStreamCardValue(a, primaryType);
        const valB1 = getStreamCardValue(b, primaryType);

        const catA = getStreamCardValue(a, "category");
        const catB = getStreamCardValue(b, "category");

        if (catA === "digital-bookshelf" && catB === "digital-bookshelf") {
            const isAtlasA =
                a.getAttribute("data-stream-section-id") === "the-ai-atlas-section";
            const isAtlasB =
                b.getAttribute("data-stream-section-id") === "the-ai-atlas-section";

            if (isAtlasA && !isAtlasB) return -1;
            if (!isAtlasA && isAtlasB) return 1;
        }

        const res1 = compare(valA1, valB1, primaryState, indexA, indexB);
        if (res1 !== 0) return res1;

        if (secondaryType !== "default") {
            const valA2 = getStreamCardValue(a, secondaryType);
            const valB2 = getStreamCardValue(b, secondaryType);
            const res2 = compare(valA2, valB2, secondaryState, indexA, indexB);
            if (res2 !== 0) return res2;
        }

        return indexA - indexB;
    });

    cards.forEach((card) => track.appendChild(card));

    track.scrollTo({ left: 0, behavior: "smooth" });
    setTimeout(() => {
        if (typeof updateStreamFocus === "function") updateStreamFocus();
    }, 450);

    if (typeof filterCards === "function") filterCards(true);
}

window.sortCardTitles = function () {
    const isStreamActive = document
        .getElementById("stream-overlay-modal")
        ?.classList.contains("active");
    const tooltips = [
        "Sort Cards",
        "Ascending (A-Z)",
        "Descending (Z-A)",
        "Reverse Default Order",
    ];

    if (isStreamActive) {
        streamCardTitleSortState = (streamCardTitleSortState + 1) % 4;
        const state = streamCardTitleSortState;

        const btn = document.querySelector(
            "#stream-cloned-filters #card-btn-sort-card-title",
        );
        const icon = document.querySelector(
            "#stream-cloned-filters #card-icon-sort-card-title",
        );
        if (btn) btn.setAttribute("data-tooltip", tooltips[state]);
        if (icon) updateSortIconUI(icon, state);

        applyStreamCombinedSort();
    } else {
        cardTitleSortState = (cardTitleSortState + 1) % 4;
        const state = cardTitleSortState;

        const btn = document.querySelector(
            "#card-gallery-filter-bar #card-btn-sort-card-title",
        );
        const icon = document.querySelector(
            "#card-gallery-filter-bar #card-icon-sort-card-title",
        );

        if (btn) btn.setAttribute("data-tooltip", tooltips[state]);
        if (icon) updateSortIconUI(icon, state);

        const sections = document.querySelectorAll(
            "#view-cards section[data-category]",
        );
        sections.forEach((section) => {
            const wrapper = section.querySelector(
                ".intro-collapsible-section-content > div",
            );
            if (!wrapper) return;

            const cards = Array.from(
                wrapper.querySelectorAll(
                    ".card-showcase-item, .card-book-showcase, .card-modern-glass, .neu-card",
                ),
            );
            if (!cards.length) return;

            if (!cards[0].hasAttribute("data-default-order")) {
                cards.forEach((card, index) =>
                    card.setAttribute("data-default-order", index),
                );
            }

            let sortedCards = sortCardArray(cards, state, "default-order");
            sortedCards.forEach((card) => wrapper.appendChild(card));

            if (wrapper.classList.contains("card-horizontal-mode")) {
                wrapper.scrollTo({ left: 0, behavior: "smooth" });
                if (typeof updateScrollButtonState === "function") {
                    setTimeout(
                        () =>
                            updateScrollButtonState(
                                section.querySelector(".intro-collapsible-section-content"),
                            ),
                        400,
                    );
                }
            }
        });
    }
};

window.sortCardCategories = function () {
    const isStreamActive = document
        .getElementById("stream-overlay-modal")
        ?.classList.contains("active");
    const tooltips = [
        "Sort Sections",
        "Ascending (A-Z)",
        "Descending (Z-A)",
        "Reverse Default Order",
    ];

    if (isStreamActive) {
        streamCardCategorySortState = (streamCardCategorySortState + 1) % 4;
        const state = streamCardCategorySortState;

        const btn = document.querySelector(
            "#stream-cloned-filters #btn-sort-card-category",
        );
        const icon = document.querySelector(
            "#stream-cloned-filters #card-icon-sort-card-category",
        );
        if (btn) btn.setAttribute("data-tooltip", tooltips[state]);
        if (icon) updateSortIconUI(icon, state);

        applyStreamCombinedSort();
    } else {
        cardCategorySortState = (cardCategorySortState + 1) % 4;
        const state = cardCategorySortState;

        const btn = document.querySelector(
            "#card-gallery-filter-bar #btn-sort-card-category",
        );
        const icon = document.querySelector(
            "#card-gallery-filter-bar #card-icon-sort-card-category",
        );

        if (btn) btn.setAttribute("data-tooltip", tooltips[state]);
        if (icon) updateSortIconUI(icon, state);

        const container = document.getElementById("view-cards");
        const defaultOrder = [
            "the-ai-atlas-section",
            "open-source-projects",
            "articles-insights",
            "digital-bookshelf",
            "updates",
        ];
        const sections = Array.from(
            container.querySelectorAll(
                'section[data-category]:not([data-category="pinned"])',
            ),
        );
        let sortedSections = [];

        if (state === 0) {
            sortedSections = sections.sort(
                (a, b) => defaultOrder.indexOf(a.id) - defaultOrder.indexOf(b.id),
            );
        } else if (state === 1) {
            sortedSections = sections.sort((a, b) =>
                a
                    .getAttribute("data-category")
                    .localeCompare(b.getAttribute("data-category")),
            );
        } else if (state === 2) {
            sortedSections = sections.sort((a, b) =>
                b
                    .getAttribute("data-category")
                    .localeCompare(a.getAttribute("data-category")),
            );
        } else {
            sortedSections = sections.sort(
                (a, b) => defaultOrder.indexOf(b.id) - defaultOrder.indexOf(a.id),
            );
        }

        sortedSections.forEach((section) => container.appendChild(section));
        updateLayoutControlsMargin();

        const viewCards = document.getElementById("view-cards");
        if (viewCards) {
            const headerOffset = 80;
            const elementPosition = viewCards.getBoundingClientRect().top;
            const offsetPosition =
                elementPosition + window.pageYOffset - headerOffset;
            window.scrollTo({ top: offsetPosition, behavior: "smooth" });
        }

        filterCards(false);
    }
};

function sortCardArray(cards, sortState, orderAttribute) {
    if (sortState === 0) {
        return cards.sort(
            (a, b) => a.getAttribute(orderAttribute) - b.getAttribute(orderAttribute),
        );
    } else if (sortState === 1) {
        return cards.sort((a, b) => {
            const titleA =
                a.querySelector(".section-title")?.innerText.trim().toLowerCase() || "";
            const titleB =
                b.querySelector(".section-title")?.innerText.trim().toLowerCase() || "";
            return titleA.localeCompare(titleB);
        });
    } else if (sortState === 2) {
        return cards.sort((a, b) => {
            const titleA =
                a.querySelector(".section-title")?.innerText.trim().toLowerCase() || "";
            const titleB =
                b.querySelector(".section-title")?.innerText.trim().toLowerCase() || "";
            return titleB.localeCompare(titleA);
        });
    } else {
        return cards.sort(
            (a, b) => b.getAttribute(orderAttribute) - a.getAttribute(orderAttribute),
        );
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const tooltipPopover = document.getElementById("global-tooltip");
    if (!tooltipPopover) return;

    let currentTarget = null;
    let updateLoop = null;

    const updatePosition = () => {
        if (!currentTarget || !tooltipPopover.matches(":popover-open")) {
            cancelAnimationFrame(updateLoop);
            return;
        }

        const target = currentTarget;
        const targetRect = target.getBoundingClientRect();
        const tooltipRect = tooltipPopover.getBoundingClientRect();

        let top, left;

        if (target.classList.contains("share-section")) {
            const gap = 10;
            top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2 - 5;
            left = targetRect.right + gap;
        } else if (target.classList.contains("card-btn-share")) {
            const gap = 8;
            top = targetRect.bottom + gap;
            left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        } else if (target.classList.contains("gallery-spotlight-btn")) {
            const gap = 10;
            left = targetRect.left - tooltipRect.width - gap;
            top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
        } else if (target.closest("#stream-overlay-header")) {
            const gap = 5;
            top = targetRect.bottom + gap;
            left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        } else if (target.classList.contains("stream-ui-btn")) {
            const gap = 2;
            top = targetRect.bottom + gap;
            left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        } else if (target.closest(".card-layout-controls")) {
            const onclickAttr = target.getAttribute("onclick") || "";
            if (target.id === "btn-open-stream") {
                top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
                left = targetRect.right + 10;
            } else if (onclickAttr.includes("horizontal")) {
                top = targetRect.bottom + 10;
                left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
            } else if (onclickAttr.includes("compact")) {
                top = targetRect.top - tooltipRect.height - 10;
                left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
            } else {
                top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
                left = targetRect.left - tooltipRect.width - 10;
            }
        } else if (target.closest(".matrix-table-main")) {
            const gap = 20;
            top = targetRect.top - tooltipRect.height - gap;
            left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        } else if (
            target.closest("#card-gallery-filter-bar") ||
            target.closest("#gallery-filter-bar")
        ) {
            const gap = 13;
            top = targetRect.top - tooltipRect.height - gap;
            left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        } else if (target.closest("#card-internal-nav")) {
            const gap = -4;
            top = targetRect.top - tooltipRect.height - gap;
            left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        } else if (
            target.id === "card-the-ai-atlas-trigger-btn" ||
            target.id === "bio-content-wrapper"
        ) {
            const gap = -1;
            top = targetRect.top - tooltipRect.height - gap;
            left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        } else if (
            target.matches(".card-section-trigger") ||
            target.id === "bio-section-trigger"
        ) {
            const gap = 5;
            top = targetRect.top - tooltipRect.height - gap;
            left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        } else if (target.closest(".card-header-left-group")) {
            const gap = 5;
            top = targetRect.top - tooltipRect.height - gap;
            left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        } else if (target.closest(".analytics-fs-top-left")) {
            const gap = 12;
            top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
            left = targetRect.right + gap;
        } else if (target.closest(".analytics-fs-top-right")) {
            const gap = 12;
            top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
            left = targetRect.left - tooltipRect.width - gap;
        } else if (target.classList.contains("stream-close-btn")) {
            const gap = 10;
            top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
            left = targetRect.left - tooltipRect.width - gap;
        } else if (
            target.classList.contains("matrix-close-lightbox") ||
            target.classList.contains("matrix-btn-close") ||
            target.classList.contains("gallery-close-btn")
        ) {
            const gap = 5;
            top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
            left = targetRect.left - tooltipRect.width - gap;
        } else if (target.classList.contains("matrix-focus-control-btn")) {
            const gap = 1;
            top = targetRect.top - tooltipRect.height - gap;
            left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        } else if (
            target.classList.contains("bio-logo-link") &&
            target.classList.contains("profile-item")
        ) {
            const gap = 12;
            top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
            left = targetRect.right + gap;
        } else if (
            target.closest(".matrix-external-controls") &&
            target.classList.contains("matrix-link")
        ) {
            const gap = 5;
            top = targetRect.top - tooltipRect.height - gap;
            left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        } else if (target.id === "analytics-btn-fullscreen") {
            const gap = 15;
            top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
            left = targetRect.left - tooltipRect.width - gap;
        } else if (target.closest(".bio-collapsed-socials")) {
            const gap = 7;
            const isInfo = target.closest('a[href="#about"]');
            const isLinkedIn = target.closest('a[href*="linkedin.com"]');
            const isEmail = target.closest('a[href^="mailto:"]');

            if (isInfo) {
                top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
                left = targetRect.left - tooltipRect.width - gap;
            } else if (isLinkedIn) {
                top = targetRect.bottom + gap;
                left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
            } else if (isEmail) {
                top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
                left = targetRect.right + gap;
            }
        } else if (target.classList.contains("analytics-hex-center")) {
            const gap = -35;
            top = targetRect.top - tooltipRect.height - gap;
            left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        } else if (target.classList.contains("caption-category-icon")) {
            const gap = 5;

            top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;

            left = targetRect.left - tooltipRect.width - gap;
        } else if (target.closest(".gallery-zoom-controls")) {
            const gap = 5;
            top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
            left = targetRect.right + gap;
        } else if (
            target.id === "open-about-view-btn" ||
            target.id === "social-trigger-btn" ||
            target.id === "spotlight-trigger-btn"
        ) {
            const gap = 7;
            top = targetRect.top - tooltipRect.height - gap;
            left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        } else if (target.id === "settings-trigger-btn") {
            const gap = 7;
            top = targetRect.bottom + gap;
            left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        } else if (target.classList.contains("card-category-icon")) {
            const gap = 2;
            top = targetRect.top - tooltipRect.height - gap;
            left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        } else if (target.closest(".analytics-kpi-wrapper")) {
            const gap = 17;
            top = targetRect.top - tooltipRect.height - gap;
            left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        } else if (
            target.classList.contains("spotlight-item") ||
            target.classList.contains("social-item") ||
            target.classList.contains("profile-item")
        ) {
            const gap = 7;

            left = targetRect.left - tooltipRect.width - gap;

            top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
        } else if (target.classList.contains("dock-sub-item")) {
            const verticalGap = 10;
            const rightOffset = 70;

            top = targetRect.bottom + verticalGap;
            left = targetRect.left + rightOffset;

            if (left + tooltipRect.width > window.innerWidth - 10) {
                left = window.innerWidth - tooltipRect.width - 10;
            }
        } else if (
            target.classList.contains("reset-btn") ||
            target.classList.contains("sidebar-toggle-btn")
        ) {
            const gap = 10;

            left = targetRect.left - tooltipRect.width - gap;

            top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
        } else if (target.classList.contains("hub-btn")) {
            const gap = 5;
            top = targetRect.bottom + gap;
            left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        } else if (
            target.id === "open-about-view-btn" ||
            target.id === "visuals-trigger-btn" ||
            target.id === "data-trigger-btn"
        ) {
            const verticalGap = 12;
            const rightGapOffset = 35;

            top = targetRect.bottom + verticalGap;
            left = targetRect.left + rightGapOffset;

            if (left + tooltipRect.width > window.innerWidth - 10) {
                left = window.innerWidth - tooltipRect.width - 10;
            }
        } else {
            const gap = 10;
            top = targetRect.top - tooltipRect.height - gap;
            left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
        }

        if (top < 5) top = targetRect.bottom + 5;
        if (left < 5) left = 5;
        if (left + tooltipRect.width > window.innerWidth - 5) {
            left = window.innerWidth - tooltipRect.width - 5;
        }

        tooltipPopover.style.top = `${top}px`;
        tooltipPopover.style.left = `${left}px`;

        updateLoop = requestAnimationFrame(updatePosition);
    };

    const showTooltip = (e) => {
        if (window.innerWidth <= 768) return;

        const target = e.target.closest("[data-tooltip]");
        if (!target) return;

        if (target.classList.contains("interaction-cooldown")) {
            return;
        }

        const controlledPopoverId = target.getAttribute("popovertarget");
        if (controlledPopoverId) {
            const controlledPopover = document.getElementById(controlledPopoverId);

            const action = target.getAttribute("popovertargetaction");

            if (
                controlledPopover &&
                controlledPopover.matches(":popover-open") &&
                action !== "hide"
            ) {
                return;
            }
        }

        const text = target.getAttribute("data-tooltip");
        if (!text || text.trim() === "") return;

        tooltipPopover.textContent = text;
        currentTarget = target;

        tooltipPopover.style.transition = "none";
        tooltipPopover.style.opacity = "1";

        try {
            tooltipPopover.showPopover();
        } catch (err) {
            return;
        }

        cancelAnimationFrame(updateLoop);
        updatePosition();
    };

    const hideTooltip = (e) => {
        const target = e.target.closest("[data-tooltip]");

        if (target && target === currentTarget) return;

        try {
            tooltipPopover.hidePopover();
        } catch (err) { }

        currentTarget = null;
        cancelAnimationFrame(updateLoop);

        tooltipPopover.style.transition = "";
        tooltipPopover.style.opacity = "";
    };

    document.body.addEventListener("mouseover", showTooltip);
    document.body.addEventListener("mouseout", hideTooltip);

    window.addEventListener(
        "touchstart",
        () => {
            try {
                tooltipPopover.hidePopover();
            } catch (err) { }
        },
        { passive: true },
    );

    function getVisibleTableData() {
        const rows = document.querySelectorAll(
            "#matrix-table-body tr:not(#no-results-row)",
        );
        const rawData = [];
        let maxLinks = 0;

        const cleanText = (text) => {
            if (!text) return "";
            return text
                .replace(/(\r\n|\n|\r)/gm, " ")
                .replace(/\s+/g, " ")
                .trim();
        };

        rows.forEach((row) => {
            if (row.style.display === "none") return;

            let matrixTitle = row.querySelector(".matrix-table-title-text")
                ? cleanText(row.querySelector(".matrix-table-title-text").innerText)
                : "Untitled";

            let rawType = row.querySelector(".matrix-type-tag")
                ? row.querySelector(".matrix-type-tag").innerText
                : "N/A";
            let category = cleanText(rawType)
                .toLowerCase()
                .split(" ")
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(" ");

            let shortDesc = row.querySelector(".matrix-col-desc")
                ? cleanText(row.querySelector(".matrix-col-desc").innerText)
                : "";

            let cardTitle = "N/A";
            let cardDesc = "N/A";
            let projectCardLink = "N/A";

            const jumpBtn = row.querySelector(".jump-btn");
            if (jumpBtn) {
                const onClick = jumpBtn.getAttribute("onclick");
                const match = onClick ? onClick.match(/'([^']+)'/) : null;

                if (match && match[1]) {
                    const cardId = match[1];
                    projectCardLink = "https://starosta.app/#" + cardId;

                    const card = document.getElementById(cardId);
                    if (card) {
                        const titleEl = card.querySelector(".section-title");
                        if (titleEl) cardTitle = cleanText(titleEl.innerText);

                        const descEl = card.querySelector(".project-description");
                        if (descEl) cardDesc = cleanText(descEl.innerText);
                    }
                }
            }

            let links = [];
            row
                .querySelectorAll(".matrix-col-links a")
                .forEach((a) => links.push(a.href));
            if (links.length > maxLinks) maxLinks = links.length;

            rawData.push({
                matrixTitle,
                category,
                shortDesc,
                cardDesc,
                cardTitle,
                projectCardLink,
                links,
            });
        });

        const normalizedData = rawData.map((item) => {
            const rowObj = {
                "Matrix Title": item.matrixTitle,
                Category: item.category,
                "Short Description": item.shortDesc,
                "Card Description": item.cardDesc,
                "Card Title": item.cardTitle,
                "Project Card Link": item.projectCardLink,
            };

            for (let i = 0; i < maxLinks; i++) {
                rowObj[`Primary Link ${i + 1}`] = item.links[i] || "";
            }

            return rowObj;
        });

        return normalizedData;
    }

    function downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    const mainDensityBtn = document.getElementById("matrix-btn-toggle-density");
    const lightboxDensityBtn = document.getElementById(
        "matrix-lightbox-density-toggle",
    );
    const tableContainers = document.querySelectorAll(".matrix-table-main");

    function toggleCompactMode() {
        let isCompact = false;
        const tableContainers = document.querySelectorAll(".matrix-table-main");

        tableContainers.forEach((table) => {
            isCompact = table.classList.toggle("matrix-compact-mode");
        });

        const compressIcon = "fas fa-compress-alt";
        const expandIcon = "fas fa-expand-alt";

        const mainDensityBtn = document.getElementById("matrix-btn-toggle-density");
        if (mainDensityBtn) {
            const icon = mainDensityBtn.querySelector("i");
            if (icon) icon.className = isCompact ? expandIcon : compressIcon;
            mainDensityBtn.setAttribute(
                "data-tooltip",
                isCompact ? "Switch to Cozy View" : "Switch to Compact View",
            );

            if (isCompact) {
                mainDensityBtn.classList.add("active-state");
            } else {
                mainDensityBtn.classList.remove("active-state");
            }
        }

        const lightboxDensityBtn = document.getElementById(
            "matrix-lightbox-density-toggle",
        );
        if (lightboxDensityBtn) {
            const icon = lightboxDensityBtn.querySelector("i");
            if (icon) icon.className = isCompact ? expandIcon : compressIcon;
            lightboxDensityBtn.setAttribute(
                "data-tooltip",
                isCompact ? "Switch to Cozy View" : "Switch to Compact View",
            );

            if (isCompact) {
                lightboxDensityBtn.classList.add("active-state");
            } else {
                lightboxDensityBtn.classList.remove("active-state");
            }
        }
    }

    if (mainDensityBtn) {
        mainDensityBtn.addEventListener("click", toggleCompactMode);
    }

    if (lightboxDensityBtn) {
        lightboxDensityBtn.addEventListener("click", toggleCompactMode);
    }

    const mainImgExportTrigger = document.getElementById(
        "matrix-btn-export-image-trigger",
    );
    const mainImgExportPopover = document.getElementById(
        "matrix-image-export-popover",
    );
    if (
        mainImgExportTrigger &&
        mainImgExportPopover &&
        typeof initializeHoverPopover === "function"
    ) {
        initializeHoverPopover(mainImgExportTrigger, mainImgExportPopover);
    }

    const lightboxImgExportTrigger = document.getElementById(
        "matrix-lightbox-export-image-trigger",
    );
    const lightboxImgExportPopover = document.getElementById(
        "matrix-lightbox-matrix-image-export-popover",
    );
    if (
        lightboxImgExportTrigger &&
        lightboxImgExportPopover &&
        typeof initializeHoverPopover === "function"
    ) {
        initializeHoverPopover(lightboxImgExportTrigger, lightboxImgExportPopover);
    }

    function captureAndDownload(buttonElement, originalState, format) {
        const originalTableContainer =
            document.querySelector("#matrix-modal-content .matrix-table-container") ||
            document.querySelector("#view-matrix .matrix-table-container");

        if (!originalTableContainer) {
            alert("Error: Original table container not found.");
            resetButtonState(buttonElement, originalState);
            return;
        }

        const clone = originalTableContainer.cloneNode(true);
        clone.id = "capture-clone-instance";
        clone.classList.add("capture-clone");

        document.body.appendChild(clone);

        const fileExtension = format === "jpeg" ? "jpg" : "png";
        const mimeType = `image/${format}`;

        html2canvas(clone, {
            scale: 2,
            backgroundColor: null,
            useCORS: true,
            allowTaint: true,
        })
            .then((canvas) => {
                const imageData = canvas.toDataURL(mimeType, 0.9);
                const link = document.createElement("a");

                const date = new Date().toISOString().split("T")[0];
                link.href = imageData;
                link.download = `vitalii_starosta_portfolio_${date}.${fileExtension}`;

                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            })
            .catch((error) => {
                console.error("html2canvas failed:", error);
                alert("Sorry, there was an error generating the image.");
            })
            .finally(() => {
                document.body.removeChild(clone);
                resetButtonState(buttonElement, originalState);
            });
    }

    function setButtonLoading(button) {
        const icon = button.querySelector("i");
        const originalIconClass = icon.className;
        const originalTooltip = button.getAttribute("data-tooltip") || button.title;

        icon.className = "fas fa-spinner fa-spin";
        if (button.setAttribute)
            button.setAttribute("data-tooltip", "Generating Image...");
        button.title = "Generating Image...";

        return { originalIconClass, originalTooltip };
    }

    function resetButtonState(button, originalState) {
        const icon = button.querySelector("i");
        icon.className = originalState.originalIconClass;
        if (button.setAttribute)
            button.setAttribute("data-tooltip", originalState.originalTooltip);
        button.title = originalState.originalTooltip;
    }

    document.body.addEventListener("click", function (event) {
        const imageAction = event.target.closest(".image-export-action");
        if (imageAction) {
            const format = imageAction.getAttribute("data-format");
            const parentPopover = imageAction.closest(".image-export-menu");

            let triggerButton;
            if (parentPopover.id === "matrix-image-export-popover") {
                triggerButton = document.getElementById(
                    "matrix-btn-export-image-trigger",
                );
            } else if (
                parentPopover.id === "matrix-lightbox-matrix-image-export-popover"
            ) {
                triggerButton = document.getElementById(
                    "matrix-lightbox-export-image-trigger",
                );
            }

            if (triggerButton && format) {
                if (parentPopover && parentPopover.hidePopover) {
                    parentPopover.hidePopover();
                }

                const originalState = setButtonLoading(triggerButton);
                setTimeout(() => {
                    captureAndDownload(triggerButton, originalState, format);
                }, 50);
            }
            return;
        }

        const dataAction = event.target.closest(".export-action");
        if (dataAction) {
            const format = dataAction.getAttribute("data-format");
            const parentPopover = dataAction.closest(".export-menu");

            if (format) {
                const data = getVisibleTableData();
                if (data.length === 0) {
                    alert("No visible data to export!");
                    return;
                }

                const date = new Date().toISOString().split("T")[0];

                if (format === "csv") {
                    const headers = Object.keys(data[0]);
                    let csvContent = headers.join(",") + "\n";
                    data.forEach((row) => {
                        let rowStr = headers
                            .map((header) => {
                                let val = row[header] || "";
                                return `"${val.replace(/"/g, '""')}"`;
                            })
                            .join(",");
                        csvContent += rowStr + "\n";
                    });

                    downloadFile(
                        "\ufeff" + csvContent,
                        `vitalii_starosta_portfolio_${date}.csv`,
                        "text/csv;charset=utf-8;",
                    );
                } else if (format === "json") {
                    const jsonContent = JSON.stringify(data, null, 2);

                    downloadFile(
                        jsonContent,
                        `vitalii_starosta_portfolio_${date}.json`,
                        "application/json",
                    );
                }

                if (parentPopover && parentPopover.hidePopover) {
                    parentPopover.hidePopover();
                }
            }
        }
    });

    const analyticsPlaceholder = document.createElement("div");
    analyticsPlaceholder.className = "analytics-placeholder";

    window.toggleAnalyticsFullscreen = function () {
        const analyticsContainer = document.querySelector(
            ".analytics-glass-container",
        );
        if (!analyticsContainer) return;

        const exitBtn = document.getElementById(
            "analytics-analytics-btn-fullscreen-exit",
        );
        const enterBtn = document.getElementById("analytics-btn-fullscreen");
        const triggerBtn = analyticsContainer.classList.contains(
            "analytics-fullscreen-active",
        )
            ? exitBtn
            : enterBtn;

        killTooltip(triggerBtn);

        const isFullscreen = analyticsContainer.classList.toggle(
            "analytics-fullscreen-active",
        );

        if (isFullscreen) {
            history.pushState(null, null, "#dashboard-lightbox");

            analyticsPlaceholder.style.width = "100%";
            analyticsPlaceholder.style.height =
                analyticsContainer.offsetHeight + "px";
            analyticsContainer.parentNode.insertBefore(
                analyticsPlaceholder,
                analyticsContainer,
            );

            document.body.appendChild(analyticsContainer);

            document.body.style.overflow = "hidden";
        } else {
            history.pushState(null, null, "#analytics");

            const wrapper = document.querySelector(".analytics-stage-wrapper");
            if (wrapper) {
                wrapper.appendChild(analyticsContainer);
            }

            if (analyticsPlaceholder.parentNode) {
                analyticsPlaceholder.remove();
            }

            document.body.style.overflow = "";
        }

        setTimeout(() => {
            if (typeof updateCarouselLayout === "function") updateCarouselLayout();
            if (typeof updateOrbitLayout === "function") updateOrbitLayout();
        }, 50);

        if (triggerBtn) {
            setTimeout(() => {
                triggerBtn.classList.remove("interaction-cooldown");
            }, 300);
        }
    };

    document.addEventListener("keydown", function (e) {
        const analyticsView = document.getElementById("view-analytics");
        const container = document.querySelector(".analytics-glass-container");

        const isAnalyticsVisible =
            (analyticsView && !analyticsView.classList.contains("hidden-view")) ||
            (container &&
                container.classList.contains("analytics-fullscreen-active"));

        if (!isAnalyticsVisible) return;

        const carouselView = document.getElementById("analytics-view-carousel");
        const isCarouselActive =
            carouselView && carouselView.style.display !== "none";

        switch (e.key) {
            case "ArrowLeft":
                if (isCarouselActive) window.prevCard();
                break;

            case "ArrowRight":
                if (isCarouselActive) window.nextCard();
                break;

            case " ":
                e.preventDefault();
                if (isCarouselActive) {
                    window.togglePlay();
                } else {
                    window.toggleOrbitPlay();
                }
                break;

            case "Escape":
                if (
                    container &&
                    container.classList.contains("analytics-fullscreen-active")
                ) {
                    toggleAnalyticsFullscreen();
                }
                break;
        }
    });

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            const matrixModal = document.getElementById("matrix-modal");

            if (matrixModal && matrixModal.matches(":popover-open")) {
                if (typeof window.closeTableLightbox === "function") {
                    window.closeTableLightbox();
                }
            }
        }
    });

    const analyticsContainer = document.querySelector(
        ".analytics-glass-container",
    );

    const topRightControls = document.querySelector(
        ".analytics-fs-controls-group.analytics-fs-top-right",
    );
    const uiBtn = document.getElementById("fs-btn-ui");

    if (analyticsContainer && topRightControls && uiBtn) {
        analyticsContainer.addEventListener("click", function (e) {
            if (analyticsContainer.classList.contains("analytics-ui-hidden-mode")) {
                const isInteractive = e.target.closest(
                    ".planet, .analytics-carousel-card, .analytics-c-btn, .analytics-action-btn, .analytics-kpi-card, .analytics-fs-controls-group",
                );
                if (!isInteractive) {
                    analyticsContainer.classList.add("analytics-ui-peek");

                    setTimeout(
                        () => analyticsContainer.classList.remove("analytics-ui-peek"),
                        2000,
                    );
                }
            }
        });

        topRightControls.addEventListener("mouseleave", function () {
            if (analyticsContainer.classList.contains("analytics-ui-hidden-mode")) {
                uiBtn.classList.add("analytics-is-hiding");
                setTimeout(() => uiBtn.classList.remove("analytics-is-hiding"), 1600);
            }
        });
    }

    document.addEventListener("keydown", function (event) {
        const modal = document.getElementById("gallery-modal");

        if (modal && modal.style.display === "flex") {
            switch (event.key) {
                case "ArrowLeft":
                    showPrevItem();
                    break;
                case "ArrowRight":
                    showNextItem();
                    break;
                case "Escape":
                    closeLightbox();
                    break;
                case "+":
                case "=":
                    zoomIn();
                    break;
                case "-":
                    zoomOut();
                    break;
            }
        }
    });
});

const exportTrigger = document.getElementById("matrix-btn-export-trigger");
const exportPopover = document.getElementById("matrix-export-menu-popover");

if (
    exportTrigger &&
    exportPopover &&
    typeof initializeHoverPopover === "function"
) {
    initializeHoverPopover(exportTrigger, exportPopover);
}

window.toggleRadialMenu = function (targetId) {
    const menus = [
        "profile-dock",
        "right-social-menu",
        "spotlight-dock",
        "settings-dock",
    ];
    const target = document.getElementById(targetId);

    if (!target) return;

    menus.forEach((id) => {
        if (id !== targetId) {
            document.getElementById(id)?.classList.remove("open");
        }
    });

    const isOpen = target.classList.toggle("open");

    if (isOpen) {
        const trigger = target.querySelector(".settings-trigger-btn");
        if (typeof killTooltip === "function") killTooltip(trigger);
    }
};

document
    .getElementById("profile-trigger-btn")
    ?.addEventListener("click", (e) => {
        e.stopPropagation();
        const dock = document.getElementById("profile-dock");

        if (
            dock?.classList.contains("open") &&
            e.currentTarget.classList.contains("active")
        ) {
            switchView("card");
            return;
        }

        window.toggleRadialMenu("profile-dock");
    });

document
    .getElementById("social-trigger-btn")
    ?.addEventListener("click", (e) => {
        e.stopPropagation();
        window.toggleRadialMenu("right-social-menu");
    });

document
    .getElementById("spotlight-trigger-btn")
    ?.addEventListener("click", (e) => {
        e.stopPropagation();
        window.toggleRadialMenu("spotlight-dock");
    });

document
    .getElementById("settings-trigger-btn")
    ?.addEventListener("click", (e) => {
        e.stopPropagation();
        window.toggleRadialMenu("settings-dock");
    });

window.jumpAndOpen = function (dataTitle, returnId = null) {
    if (returnId) {
        lightboxReturnTarget = returnId;
    }

    jumpToGallery(dataTitle);

    setTimeout(() => {
        const targetItem = document.querySelector(
            `.gallery-item[data-title="${dataTitle}"]`,
        );
        if (targetItem) {
            const triggerImage = targetItem.querySelector(".gallery-img");
            if (triggerImage) {
                openLightbox(triggerImage);
            }
        }
    }, 400);
};

function toggleLightboxCaption(event, button) {
    if (event) event.stopPropagation();

    const caption = document.getElementById("gallery-lightbox-caption");
    const isActive = button.classList.toggle("active-state");

    caption.classList.toggle("caption-hidden", isActive);

    if (isActive) {
        button.setAttribute("data-tooltip", "Show Caption");

        button.classList.add("interaction-cooldown");
        button.addEventListener(
            "mouseleave",
            () => {
                button.classList.remove("interaction-cooldown");
            },
            { once: true },
        );
    } else {
        button.setAttribute("data-tooltip", "Hide Caption");
    }
}

const sectionDensityStates = {};

function resetSiblingButton(wrapper, typeToReset) {
    const header = wrapper.previousElementSibling;
    if (!header) return;

    if (typeToReset === "density") {
        const btn = header.querySelector(".compact-toggle");
        if (btn) {
            btn.classList.remove("active-state");
            btn.querySelector("i").className = "fas fa-grip-lines";
            btn.setAttribute("data-tooltip", "Switch to List View");
            if (sectionDensityStates) sectionDensityStates[wrapper.id] = 0;
        }
        const container = wrapper.querySelector("div");
        if (container)
            container.classList.remove("section-grid-2-col", "card-is-compact");

        header.classList.remove("section-is-compact");
    } else if (typeToReset === "direction") {
        const btn = header.querySelector(".card-section-layout-toggle-btn");
        if (btn) {
            btn.classList.remove("active-state");
            btn.querySelector("i").className = "fas fa-window-maximize";
            btn.setAttribute("data-tooltip", "View Section Horizontally");
        }
    }
}

window.toggleCardSectionLayout = function (wrapperId, btn) {
    if (event) event.stopPropagation();
    const wrapper = document.getElementById(wrapperId);
    const container = wrapper.querySelector("div");
    const icon = btn.querySelector("i");

    const isCompactOrGrid = container.classList.contains("card-is-compact");

    if (isCompactOrGrid) {
        resetSiblingButton(wrapper, "density");

        btn.classList.remove("active-state");
        icon.className = "fas fa-window-maximize";

        btn.setAttribute("data-tooltip", "View Section Horizontally");

        container.classList.remove("card-horizontal-mode");
        wrapper.classList.remove("card-horizontal-active");
    } else {
        const isHorizontal = container.classList.toggle("card-horizontal-mode");
        wrapper.classList.toggle("card-horizontal-active", isHorizontal);

        if (isHorizontal) {
            btn.classList.add("active-state");
            icon.className = "fas fa-right-left";
            btn.setAttribute("data-tooltip", "View Section Vertically");

            if (typeof flashNavArrows === "function") flashNavArrows(wrapper);
            if (typeof updateScrollButtonState === "function")
                setTimeout(() => updateScrollButtonState(wrapper), 100);
        } else {
            btn.classList.remove("active-state");
            icon.className = "fas fa-window-maximize";
            btn.setAttribute("data-tooltip", "View Section Horizontally");
        }
    }

    btn.classList.add("interaction-cooldown");

    btn.addEventListener(
        "mouseleave",
        () => {
            btn.classList.remove("interaction-cooldown");
        },
        { once: true },
    );

    updateSectionButtonTooltips();
    updateGlobalButtonStates();
};

window.cycleSectionCompact = function (wrapperId, btn) {
    if (event) event.stopPropagation();
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;

    const container = wrapper.querySelector("div");
    const icon = btn.querySelector("i");
    const header = wrapper.previousElementSibling;

    const dirBtn = header
        ? header.querySelector(".card-section-layout-toggle-btn")
        : null;

    if (header) {
        if (dirBtn && dirBtn.classList.contains("active-state")) {
            dirBtn.classList.remove("active-state");
            dirBtn.querySelector("i").className = "fas fa-window-maximize";

            container.classList.remove("card-horizontal-mode");
            wrapper.classList.remove("card-horizontal-active");

            container.scrollLeft = 0;
            container.style.removeProperty("height");
            container.style.removeProperty("display");
            container.style.removeProperty("flex-direction");
            container.style.removeProperty("flex-wrap");
        }
    }

    sectionDensityStates[wrapperId] = sectionDensityStates[wrapperId] || 0;
    let currentState = (sectionDensityStates[wrapperId] + 1) % 3;
    sectionDensityStates[wrapperId] = currentState;

    switch (currentState) {
        case 0:
            container.classList.remove("card-is-compact", "section-grid-2-col");
            btn.classList.remove("active-state");
            icon.className = "fas fa-grip-lines";
            btn.setAttribute("data-tooltip", "Switch to List View");

            if (dirBtn)
                dirBtn.setAttribute("data-tooltip", "View Section Horizontally");

            container
                .querySelectorAll(".card-shell.card-expanded-mode")
                .forEach((card) => card.classList.remove("card-expanded-mode"));
            if (header) header.classList.remove("section-is-compact");
            break;

        case 1:
            container.classList.add("card-is-compact");
            container.classList.remove("section-grid-2-col");
            btn.classList.add("active-state");
            icon.className = "fas fa-grip-lines";
            btn.setAttribute("data-tooltip", "Switch to Grid View");

            if (dirBtn)
                dirBtn.setAttribute("data-tooltip", "View Section Vertically");

            if (header) header.classList.add("section-is-compact");
            break;

        case 2:
            container.classList.add("card-is-compact", "section-grid-2-col");
            btn.classList.add("active-state");
            icon.className = "fas fa-table-columns";
            btn.setAttribute("data-tooltip", "Return to Default View");

            if (dirBtn)
                dirBtn.setAttribute("data-tooltip", "View Section Vertically");

            if (header) header.classList.add("section-is-compact");
            break;
    }

    if (btn) {
        btn.classList.add("interaction-cooldown");
        btn.addEventListener(
            "mouseleave",
            () => {
                btn.classList.remove("interaction-cooldown");
            },
            { once: true },
        );
    }

    updateGlobalButtonStates();
};

function resetCardViewLayouts() {
    const viewCards = document.getElementById("view-cards");

    if (
        document
            .getElementById("stream-overlay-modal")
            ?.classList.contains("active")
    ) {
        closeStreamOverlay();
    }

    const sections = document.querySelectorAll(
        ".intro-collapsible-section-content:not(#bio-content-wrapper)",
    );

    sections.forEach((wrapper) => {
        const container = wrapper.querySelector("div");
        const header = wrapper.previousElementSibling;

        if (container) {
            container.style.transition = "none";

            container.classList.remove(
                "card-horizontal-mode",
                "section-grid-2-col",
                "card-is-compact",
            );

            container.style.removeProperty("height");
            container.style.removeProperty("display");
            container.style.removeProperty("flex-direction");
            container.style.removeProperty("flex-wrap");
            container.style.removeProperty("gap");
            container.style.removeProperty("padding");
            container.style.removeProperty("margin");

            container
                .querySelectorAll(".card-shell.card-expanded-mode")
                .forEach((c) => c.classList.remove("card-expanded-mode"));

            setTimeout(() => {
                container.style.removeProperty("transition");
            }, 50);
        }

        wrapper.classList.remove("card-horizontal-active");

        if (header) {
            header.classList.remove("section-is-compact");

            const dirBtn = header.querySelector(".card-section-layout-toggle-btn");
            if (dirBtn) {
                dirBtn.classList.remove("active-state");
                dirBtn.querySelector("i").className = "fas fa-window-maximize";
                dirBtn.setAttribute("data-tooltip", "View Section Horizontally");
            }

            const denBtn = header.querySelector(".compact-toggle");
            if (denBtn) {
                denBtn.classList.remove("active-state");
                denBtn.querySelector("i").className = "fas fa-grip-lines";
                denBtn.setAttribute("data-tooltip", "Switch to List View");
            }
        }

        if (typeof sectionDensityStates !== "undefined")
            sectionDensityStates[wrapper.id] = 0;
    });

    const allCards = document.querySelectorAll(
        ".card-showcase-item, .card-book-showcase, .card-modern-glass, .neu-card, .card-shell",
    );
    allCards.forEach((card) => {
        card.classList.remove("card-expanded-mode");
        card.style.removeProperty("flex");
        card.style.removeProperty("width");
        card.style.removeProperty("min-width");
        card.style.removeProperty("max-width");
        card.style.removeProperty("transform");
        card.style.removeProperty("margin");
    });
}

function updateSectionButtonTooltips() {
    document
        .querySelectorAll(".card-section-layout-toggle-btn")
        .forEach((btn) => {
            const wasInCooldown = btn.classList.contains("interaction-cooldown");
            const wasActive = btn.classList.contains("active-state");

            const header = btn.closest(".card-section-header");
            if (!header) return;

            const container = header.nextElementSibling?.querySelector("div");
            if (!container) return;

            const isHorizontal = container.classList.contains("card-horizontal-mode");
            const isCompactOrGrid = container.classList.contains("card-is-compact");

            if (isHorizontal) {
                btn.setAttribute("data-tooltip", "View Section Vertically");
            } else if (isCompactOrGrid) {
                btn.setAttribute("data-tooltip", "View Section Vertically");
            } else {
                btn.setAttribute("data-tooltip", "View Section Horizontally");
            }

            if (wasInCooldown) {
                btn.classList.add("interaction-cooldown");
            }
            if (wasActive) {
                btn.classList.add("active-state");
            }
        });
}

window.setCardLayout = function (mode) {
    resetCardViewLayouts();

    if (mode === "compact") {
        const sections = document.querySelectorAll(
            ".intro-collapsible-section-content:not(#bio-content-wrapper)",
        );
        sections.forEach((wrapper) => {
            const container = wrapper.querySelector("div");
            const header = wrapper.previousElementSibling;

            container.classList.add("card-is-compact", "section-grid-2-col");

            if (header) {
                header.classList.add("section-is-compact");
                const denBtn = header.querySelector(".compact-toggle");
                if (denBtn) {
                    denBtn.classList.add("active-state");
                    denBtn.querySelector("i").className = "fas fa-table-columns";
                    denBtn.setAttribute("data-tooltip", "Return to Default View");
                    if (typeof sectionDensityStates !== "undefined")
                        sectionDensityStates[wrapper.id] = 2;
                }
            }
        });
    } else if (mode === "horizontal") {
        const sections = document.querySelectorAll(
            ".intro-collapsible-section-content:not(#bio-content-wrapper)",
        );
        sections.forEach((wrapper) => {
            const container = wrapper.querySelector("div");
            const header = wrapper.previousElementSibling;

            container.classList.add("card-horizontal-mode");
            wrapper.classList.add("card-horizontal-active");

            if (header) {
                const dirBtn = header.querySelector(".card-section-layout-toggle-btn");
                if (dirBtn) {
                    dirBtn.classList.add("active-state");
                    dirBtn.querySelector("i").className = "fas fa-right-left";
                    dirBtn.setAttribute("data-tooltip", "View Section Vertically");
                }
            }
            if (typeof flashNavArrows === "function") flashNavArrows(wrapper);
            if (typeof updateScrollButtonState === "function")
                setTimeout(() => updateScrollButtonState(wrapper), 100);
        });
    }

    updateSectionButtonTooltips();

    updateGlobalButtonStates();
};

function updateGlobalButtonStates() {
    const wrappers = document.querySelectorAll(
        ".intro-collapsible-section-content:not(#bio-content-wrapper)",
    );
    const totalSections = wrappers.length;

    let horizontalCount = 0;
    let gridCount = 0;
    let verticalCount = 0;

    wrappers.forEach((w) => {
        const container = w.querySelector("div");

        if (container.classList.contains("card-horizontal-mode")) {
            horizontalCount++;
        } else if (container.classList.contains("section-grid-2-col")) {
            gridCount++;
        } else if (!container.classList.contains("card-is-compact")) {
            verticalCount++;
        }
    });

    const buttons = document.querySelectorAll(
        ".card-layout-controls .card-layout-mode-btn",
    );
    const verticalBtn = buttons[0];
    const compactBtn = buttons[1];
    const horizontalBtn = buttons[2];

    verticalBtn.classList.remove("active");
    compactBtn.classList.remove("active");
    horizontalBtn.classList.remove("active");

    let currentGlobalMode = "mixed";

    if (horizontalCount === totalSections) {
        horizontalBtn.classList.add("active");
        currentGlobalMode = "horizontal";
    } else if (gridCount === totalSections) {
        compactBtn.classList.add("active");
        currentGlobalMode = "compact";
    } else if (verticalCount === totalSections) {
        verticalBtn.classList.add("active");
        currentGlobalMode = "vertical";
    }

    if (currentGlobalMode === "mixed") {
        verticalBtn.setAttribute("data-tooltip", "Apply Vertical View to All");
        compactBtn.setAttribute("data-tooltip", "Apply Compact View to All");
        horizontalBtn.setAttribute("data-tooltip", "Apply Horizontal View to All");
    } else {
        if (currentGlobalMode === "vertical") {
            verticalBtn.setAttribute("data-tooltip", "Standard Stack");
            compactBtn.setAttribute("data-tooltip", "Switch to Compact View");
            horizontalBtn.setAttribute("data-tooltip", "Switch to Horizontal View");
        } else if (currentGlobalMode === "compact") {
            verticalBtn.setAttribute("data-tooltip", "Switch to Vertical View");
            compactBtn.setAttribute("data-tooltip", "Return to Default View");
            horizontalBtn.setAttribute("data-tooltip", "Switch to Horizontal View");
        } else if (currentGlobalMode === "horizontal") {
            verticalBtn.setAttribute("data-tooltip", "Switch to Vertical View");
            compactBtn.setAttribute("data-tooltip", "Switch to Compact View");
            horizontalBtn.setAttribute("data-tooltip", "Return to Default View");
        }
    }
}

function updateLayoutControlsMargin() {
    const controls = document.querySelector(".card-layout-controls");
    if (!controls) return;

    const sections = Array.from(
        document.querySelectorAll("#view-cards section[data-category]"),
    );

    const firstVisible = sections.find((sec) => sec.style.display !== "none");

    if (firstVisible && firstVisible.id === "the-ai-atlas-section") {
        const isTitleVisible =
            firstVisible.classList.contains("force-title-visible") ||
            firstVisible.classList.contains("section-is-compact");

        if (isTitleVisible) {
            controls.style.marginBottom = "20px";
        } else {
            controls.style.marginBottom = "0px";
        }
    } else {
        controls.style.marginBottom = "20px";
    }
}

window.triggerLimitFlash = function (btn) {
    if (!btn) return;

    btn.classList.remove("limit-flash-active");

    void btn.offsetWidth;

    btn.classList.add("limit-flash-active");

    setTimeout(() => {
        btn.classList.remove("limit-flash-active");
    }, 400);
};

window.scrollCardSection = function (wrapperId, direction) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper) return;

    const container = wrapper.querySelector(".card-horizontal-mode");
    if (!container) return;

    const prevBtn = wrapper.querySelector(".card-section-nav-prev");
    const nextBtn = wrapper.querySelector(".card-section-nav-next");
    const tolerance = 5;

    if (direction === -1 && container.scrollLeft <= tolerance) {
        if (prevBtn) window.triggerLimitFlash(prevBtn);
        return;
    }

    const scrollableDistance = container.scrollWidth - container.clientWidth;
    if (
        direction === 1 &&
        scrollableDistance - container.scrollLeft <= tolerance
    ) {
        if (nextBtn) window.triggerLimitFlash(nextBtn);
        return;
    }

    wrapper.classList.add("card-user-interacted");

    const scrollAmount = 430;

    container.scrollBy({
        left: scrollAmount * direction,
        behavior: "smooth",
    });

    setTimeout(() => updateScrollButtonState(wrapper), 400);
};

function updateScrollButtonState(wrapper) {
    if (!wrapper) return;

    if (
        wrapper.id === "stream-overlay-modal" ||
        wrapper.closest("#stream-overlay-modal")
    ) {
        return;
    }

    const container = wrapper.querySelector(".card-horizontal-mode");
    if (!container) return;

    const prevBtn = wrapper.querySelector(".card-section-nav-prev");
    const nextBtn = wrapper.querySelector(".card-section-nav-next");

    if (!prevBtn || !nextBtn) return;

    const tolerance = 5;

    if (container.scrollLeft <= tolerance) {
        prevBtn.classList.add("nav-limit-reached");
    } else {
        prevBtn.classList.remove("nav-limit-reached");
    }

    const scrollableDistance = container.scrollWidth - container.clientWidth;
    const remainingDistance = scrollableDistance - container.scrollLeft;

    if (remainingDistance <= tolerance) {
        nextBtn.classList.add("nav-limit-reached");
    } else {
        nextBtn.classList.remove("nav-limit-reached");
    }
}

function initHorizontalScrollListeners() {
    const wrappers = document.querySelectorAll(
        ".intro-collapsible-section-content",
    );

    wrappers.forEach((wrapper) => {
        const container = wrapper.querySelector("div");

        if (container) {
            let isScrolling = false;

            container.addEventListener(
                "scroll",
                () => {
                    if (!isScrolling) {
                        window.requestAnimationFrame(() => {
                            if (container.classList.contains("card-horizontal-mode")) {
                                if (typeof updateScrollButtonState === "function") {
                                    updateScrollButtonState(wrapper);
                                }
                            }

                            if (container.scrollLeft > 20) {
                                wrapper.classList.add("user-has-swiped");
                            }

                            isScrolling = false;
                        });
                        isScrolling = true;
                    }
                },
                { passive: true },
            );

            window.addEventListener("resize", () => {
                if (
                    container.classList.contains("card-horizontal-mode") &&
                    typeof updateScrollButtonState === "function"
                ) {
                    updateScrollButtonState(wrapper);
                }
            });
        }
    });
}

document.addEventListener("DOMContentLoaded", initHorizontalScrollListeners);

function flashNavArrows(wrapper) {
    const btns = wrapper.querySelectorAll(".card-section-nav-btn");

    btns.forEach((btn) => {
        btn.classList.remove("trigger-flash");

        void btn.offsetWidth;

        btn.classList.add("trigger-flash");

        setTimeout(() => {
            btn.classList.remove("trigger-flash");
        }, 3000);
    });
}

document.addEventListener("DOMContentLoaded", function () {
    const viewCards = document.getElementById("view-cards");

    viewCards.addEventListener("click", function (e) {
        const shell = e.target.closest(".card-shell");
        if (!shell) return;

        const parentContainer = shell.closest(
            ".intro-collapsible-section-content > div",
        );
        const isCompactMode =
            parentContainer &&
            (parentContainer.classList.contains("card-is-compact") ||
                parentContainer.classList.contains("section-grid-2-col"));

        if (!isCompactMode) return;

        if (shell.classList.contains("card-expanded-mode")) {
            if (
                e.target.closest("a[href], button, [onclick], .project-description")
            ) {
                return;
            }
        }

        e.preventDefault();
        e.stopPropagation();

        shell.classList.toggle("card-expanded-mode");

        const globalLayoutBtns = document.querySelectorAll(".card-layout-mode-btn");
        globalLayoutBtns.forEach((btn) => {
            btn.addEventListener("click", function () {
                const hadCooldown = this.classList.contains("interaction-cooldown");

                setTimeout(() => {
                    if (hadCooldown) {
                        this.classList.add("interaction-cooldown");
                    }
                }, 50);
            });
        });
    });

    function bindPopoverState(btnId, popoverId) {
        const btn = document.getElementById(btnId);
        const popover = document.getElementById(popoverId);
        if (btn && popover) {
            popover.addEventListener("toggle", (e) => {
                if (e.newState === "open") {
                    btn.classList.add("active-state");
                } else {
                    btn.classList.remove("active-state");
                }
            });
        }
    }

    bindPopoverState("matrix-btn-export-trigger", "matrix-export-menu-popover");

    bindPopoverState(
        "matrix-btn-export-image-trigger",
        "matrix-image-export-popover",
    );

    const fsBtn = document.getElementById("matrix-open-table-lightbox-btn");
    if (fsBtn) {
        fsBtn.addEventListener("click", function () {
            openTableLightbox();

            this.classList.remove("active-state");
            this.blur();
        });
    }
});

let streamScrollObserver = null;
let isStreamProgrammaticScroll = false;
let streamVisibleCardsCache = [];

window.openStreamOverlay = function () {
    let overlay = document.getElementById("stream-overlay-modal");

    if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = "stream-overlay-modal";

        overlay.innerHTML = `
            <div id="stream-overlay-header">
                <div id="stream-cloned-nav-container"></div>
                <div id="stream-cloned-filter-container"></div>
            </div>
            
            <!-- BUTTONS: Paddles -->
            <button id="stream-paddle-left" class="stream-paddle-btn stream-paddle-prev" onclick="handleStreamPaddleClick(-1)">
                <i class="fas fa-chevron-left"></i>
            </button>
            <button id="stream-paddle-right" class="stream-paddle-btn stream-paddle-next" onclick="handleStreamPaddleClick(1)">
                <i class="fas fa-chevron-right"></i>
            </button>
            
            <!-- BUTTONS: UI Controls -->
            <button id="stream-card-style-toggle-btn" class="stream-ui-btn" onclick="toggleStreamCardStyle()" data-tooltip="Hide Card Backgrounds">
                <i class="fas fa-clone"></i>
            </button>
            <button id="stream-bg-toggle-btn" class="stream-ui-btn" onclick="toggleStreamBackground()" data-tooltip="Toggle Solid Background">
                <i class="fas fa-fill-drip"></i>
            </button>
            <button id="stream-header-toggle-btn" class="stream-ui-btn" onclick="toggleStreamHeader()" data-tooltip="Hide Header">
                <i class="fas fa-chevron-up"></i>
            </button>
            <button id="stream-focus-mode-btn" class="stream-ui-btn" onclick="toggleStreamFocusMode()" data-tooltip="Toggle Focus Mode">
                <i class="fas fa-bullseye"></i>
            </button>
            <button class="stream-close-btn" onclick="closeStreamOverlay()" title="Exit Spotlight">
                <i class="fas fa-times"></i>
            </button>

            <div id="stream-overlay-track"></div>
        `;
        document.body.appendChild(overlay);

        const track = document.getElementById("stream-overlay-track");

        track.addEventListener("scroll", () => {
            updateStreamFocus();
        });
    }

    const track = document.getElementById("stream-overlay-track");
    const navContainer = document.getElementById("stream-cloned-nav-container");
    const filterContainer = document.getElementById(
        "stream-cloned-filter-container",
    );
    track.innerHTML = "";
    navContainer.innerHTML = "";
    filterContainer.innerHTML = "";

    const originalNav = document.getElementById("card-internal-nav");
    if (originalNav) {
        const clonedNav = originalNav.cloneNode(true);
        const spotlight = document.createElement("div");
        spotlight.className = "stream-spotlight-bg";
        clonedNav.prepend(spotlight);
        clonedNav.id = "stream-cloned-nav";
        clonedNav.classList.add("stream-cloned-nav");
        navContainer.appendChild(clonedNav);
    }

    const originalFilters = document.getElementById("card-gallery-filter-bar");
    if (originalFilters) {
        const clonedFilters = originalFilters.cloneNode(true);

        clonedFilters.classList.remove("fade-in-up", "visible");

        clonedFilters.id = "stream-cloned-filters";
        clonedFilters.classList.add("stream-cloned-filters");

        const clonedExpandBtn = clonedFilters.querySelector(
            "#card-btn-toggle-all-sections",
        );
        if (clonedExpandBtn) clonedExpandBtn.remove();

        clonedFilters.classList.remove("collapsed");

        filterContainer.appendChild(clonedFilters);

        const originalSearch = originalFilters.querySelector("#card-search");
        const clonedSearch = clonedFilters.querySelector("#card-search");
        const clonedTriggerText = clonedFilters.querySelector("#card-trigger-text");
        if (clonedTriggerText) clonedTriggerText.id = "stream-card-trigger-text";

        if (clonedSearch) {
            clonedSearch.removeAttribute("onkeyup");

            clonedSearch.id = "stream-card-search";
            if (originalSearch) clonedSearch.value = originalSearch.value;
            clonedSearch.addEventListener("keyup", () => filterCards(true));
        }

        const popover = clonedFilters.querySelector(".custom-options[popover]");
        const trigger = clonedFilters.querySelector(".custom-select-trigger");
        if (popover && trigger) {
            const newPopoverId = "stream-card-filter-popover";
            popover.id = newPopoverId;
            trigger.setAttribute("popovertarget", newPopoverId);
            if (typeof initializeHoverPopover === "function") {
                initializeHoverPopover(trigger, popover);
            }
        }

        const clonedResetBtn = clonedFilters.querySelector("#card-btn-reset-all");
        if (clonedResetBtn) {
            clonedResetBtn.removeAttribute("onclick");

            clonedResetBtn.id = "stream-btn-reset-all";
            clonedResetBtn.setAttribute("data-tooltip", "Reset Filters & Sorting");
            clonedResetBtn.addEventListener("click", () => resetCardView());
        }

        const clonedTotalWrapper = clonedFilters.querySelector(
            "#card-total-wrapper",
        );
        if (clonedTotalWrapper) {
            clonedTotalWrapper.id = "stream-total-wrapper";
            clonedTotalWrapper.setAttribute("data-tooltip", "Loading...");
            const clonedTotalIcon =
                clonedTotalWrapper.querySelector("#card-total-icon");
            if (clonedTotalIcon) clonedTotalIcon.id = "stream-total-icon";
        }

        const originalCheckboxes = originalFilters.querySelectorAll(
            'input[type="checkbox"]',
        );
        const clonedCheckboxes = clonedFilters.querySelectorAll(
            'input[type="checkbox"]',
        );
        clonedCheckboxes.forEach((cloneCb, index) => {
            cloneCb.removeAttribute("onchange");

            if (originalCheckboxes[index])
                cloneCb.checked = originalCheckboxes[index].checked;
            cloneCb.addEventListener("change", () => filterCards(true));
        });
    }

    const allOriginalCards = document.querySelectorAll(
        ".intro-collapsible-section-content:not(#bio-content-wrapper) .card-showcase-item, .intro-collapsible-section-content:not(#bio-content-wrapper) .card-book-showcase, .intro-collapsible-section-content:not(#bio-content-wrapper) .card-modern-glass, .intro-collapsible-section-content:not(#bio-content-wrapper) .neu-card",
    );

    let cardsArray = Array.from(allOriginalCards).map((originalCard) => {
        const clone = originalCard.cloneNode(true);

        if (originalCard.id) {
            clone.setAttribute("data-original-id", originalCard.id);
        }

        if (originalCard.id === "the-ai-atlas-shortcut-card") {
            clone.setAttribute("data-is-shortcut", "true");
        }

        clone.removeAttribute("id");
        clone.classList.add("stream-clone");

        clone.addEventListener("click", function (e) {
            if (e.target.closest("a, button, .card-btn-share")) return;
            this.classList.toggle("card-stream-highlighted");
        });

        const parentSection = originalCard.closest("section");
        if (parentSection) {
            clone.setAttribute("data-stream-section-id", parentSection.id);
            if (parentSection.hasAttribute("data-category")) {
                clone.setAttribute(
                    "data-stream-category",
                    parentSection.getAttribute("data-category"),
                );
            }
        }

        return clone;
    });

    cardsArray.forEach((card, index) =>
        card.setAttribute("data-stream-default-order", index),
    );

    streamCardTitleSortState = cardTitleSortState;
    streamCardCategorySortState = cardCategorySortState;

    const catIcon = document.querySelector(
        "#stream-cloned-filters #card-icon-sort-card-category",
    );
    if (catIcon) updateSortIconUI(catIcon, streamCardCategorySortState);

    const titleIcon = document.querySelector(
        "#stream-cloned-filters #card-icon-sort-card-title",
    );
    if (titleIcon) updateSortIconUI(titleIcon, streamCardTitleSortState);

    cardsArray.forEach((card) => track.appendChild(card));

    if (streamCardCategorySortState !== 0 || streamCardTitleSortState !== 0) {
        applyStreamCombinedSort();
    }

    overlay.classList.add("active");
    overlay.classList.remove("header-hidden");
    document.body.style.overflow = "hidden";

    document.getElementById("btn-open-stream").classList.add("active");

    initializeStreamNav();
    filterCards(true);

    setTimeout(() => {
        if (track) {
            track.scrollLeft = 0;
            track.scrollTo({ left: 0, behavior: "auto" });
        }

        const nav = document.getElementById("stream-cloned-nav");
        if (nav && track) {
            const firstVisibleCard = track.querySelector(
                '.stream-clone:not([style*="display: none"])',
            );

            const activeSectionId = firstVisibleCard
                ? firstVisibleCard.getAttribute("data-stream-section-id")
                : "the-ai-atlas-section";

            const targetPill = nav.querySelector(
                `.card-nav-pill[href="#${activeSectionId}"]`,
            );
            const cyberLine = nav.querySelector(".card-cyber-line");
            const spotlight = nav.querySelector(".stream-spotlight-bg");
            const pills = nav.querySelectorAll(".card-nav-pill");

            if (targetPill && cyberLine) {
                const index = Array.from(pills).indexOf(targetPill);
                const transformVal = `translateX(${index * 100}%)`;

                cyberLine.style.transform = transformVal;
                if (spotlight) spotlight.style.transform = transformVal;

                const activeColor = targetPill.getAttribute("data-color");
                const defaultColor = targetPill.getAttribute("data-default-color");
                const isPinned = activeSectionId === "the-ai-atlas-section";

                if (isPinned) {
                    cyberLine.style.backgroundColor =
                        defaultColor || "rgba(255, 255, 255, 0.7)";
                    cyberLine.style.boxShadow = "none";
                    targetPill.classList.add("card-default-active");
                } else {
                    cyberLine.style.backgroundColor = activeColor;
                    cyberLine.style.boxShadow = `0 0 10px ${activeColor}, 0 0 20px ${activeColor}`;
                    targetPill.classList.remove("card-default-active");
                }

                pills.forEach((p) => p.classList.remove("active"));
                targetPill.classList.add("active");

                if (
                    activeSectionId === "the-ai-atlas-section" &&
                    !targetPill.classList.contains("card-default-active")
                ) {
                    const bookshelfPill = Array.from(pills).find(
                        (p) => p.getAttribute("href") === "#digital-bookshelf",
                    );
                    if (bookshelfPill) bookshelfPill.classList.add("active");
                }
            }
        }
    }, 50);

    setTimeout(() => {
        if (typeof updateStreamFocus === "function") updateStreamFocus();

        if (typeof setupStreamPaddleObserver === "function")
            setupStreamPaddleObserver();
    }, 100);

    history.pushState(null, null, "#stream-lightbox");
};

function syncStreamNavToScroll() {
    const track = document.getElementById("stream-overlay-track");
    const nav = document.getElementById("stream-cloned-nav");
    if (!nav || !track) return;

    const firstVisibleCard = track.querySelector(
        '.stream-clone:not([style*="display: none"])',
    );

    const activeSectionId = firstVisibleCard
        ? firstVisibleCard.getAttribute("data-stream-section-id")
        : "the-ai-atlas-section";

    const targetPill = nav.querySelector(
        `.card-nav-pill[href="#${activeSectionId}"]`,
    );
    const cyberLine = nav.querySelector(".card-cyber-line");
    const spotlight = nav.querySelector(".stream-spotlight-bg");
    const pills = nav.querySelectorAll(".card-nav-pill");

    if (targetPill && cyberLine) {
        const index = Array.from(pills).indexOf(targetPill);
        const transformVal = `translateX(${index * 100}%)`;

        cyberLine.style.transform = transformVal;
        if (spotlight) spotlight.style.transform = transformVal;

        const activeColor = targetPill.getAttribute("data-color");
        const defaultColor = targetPill.getAttribute("data-default-color");

        if (activeSectionId === "the-ai-atlas-section") {
            cyberLine.style.backgroundColor =
                defaultColor || "rgba(255, 255, 255, 0.7)";
            cyberLine.style.boxShadow = "none";
        } else {
            cyberLine.style.backgroundColor = activeColor;
            cyberLine.style.boxShadow = `0 0 10px ${activeColor}, 0 0 20px ${activeColor}`;
        }

        pills.forEach((p) => p.classList.remove("active"));
        targetPill.classList.add("active");
    }
}

function updateSortIconUI(icon, state) {
    icon.className =
        "fas " +
        (state === 0
            ? "fa-sort"
            : state === 1
                ? "fa-sort-up"
                : state === 2
                    ? "fa-sort-down"
                    : "fa-arrow-up");
}

function sortCardArray(cards, sortState, orderAttribute, isCategory = false) {
    if (sortState === 0) {
        return cards.sort(
            (a, b) => a.getAttribute(orderAttribute) - b.getAttribute(orderAttribute),
        );
    }

    const getValue = (card) => {
        if (isCategory) {
            return (card.getAttribute("data-stream-category") || "").toLowerCase();
        } else {
            return (
                card.querySelector(".section-title")?.innerText.trim().toLowerCase() ||
                ""
            );
        }
    };

    if (sortState === 1) {
        return cards.sort((a, b) => getValue(a).localeCompare(getValue(b)));
    } else if (sortState === 2) {
        return cards.sort((a, b) => getValue(b).localeCompare(getValue(a)));
    } else {
        return cards.sort(
            (a, b) => b.getAttribute(orderAttribute) - a.getAttribute(orderAttribute),
        );
    }
}

window.handleStreamPaddleClick = function (direction) {
    const track = document.getElementById("stream-overlay-track");

    const btnId = direction === -1 ? "stream-paddle-left" : "stream-paddle-right";
    const btn = document.getElementById(btnId);

    if (btn && btn.classList.contains("paddle-blocked")) {
        return;
    }

    if (!track) return;

    const scrollAmount = 700;
    track.scrollBy({
        left: scrollAmount * direction,
        behavior: "smooth",
    });
};

window.updateStreamFocus = function () {
    const track = document.getElementById("stream-overlay-track");
    if (!track || streamVisibleCardsCache.length === 0) return;

    const trackCenter = track.scrollLeft + track.clientWidth / 2;

    let closestCard = null;
    let minDistance = Infinity;

    streamVisibleCardsCache.forEach((card) => {
        const cardCenter = card.offsetLeft + card.offsetWidth / 2;
        const distance = Math.abs(trackCenter - cardCenter);

        if (distance < minDistance) {
            minDistance = distance;
            closestCard = card;
        }
    });

    if (closestCard) {
        streamVisibleCardsCache.forEach((card) => {
            if (card === closestCard) {
                card.classList.add("card-stream-focused");
            } else {
                card.classList.remove("card-stream-focused");
            }
        });
    }
};

window.closeStreamOverlay = function (skipHistory = false) {
    killTooltip(document.querySelector(".stream-close-btn"));

    if (streamScrollObserver) {
        streamScrollObserver.disconnect();
        streamScrollObserver = null;
    }
    if (typeof paddleObserver !== "undefined" && paddleObserver) {
        paddleObserver.disconnect();
        paddleObserver = null;
    }
    streamVisibleCardsCache = [];
    isStreamProgrammaticScroll = false;

    const overlay = document.getElementById("stream-overlay-modal");
    if (!overlay) return;

    overlay.classList.remove("active");
    document.body.style.overflow = "";
    document.getElementById("btn-open-stream").classList.remove("active");

    if (!skipHistory) {
        history.pushState(null, null, "#card");
    }

    setTimeout(() => {
        if (overlay) overlay.innerHTML = "";
        overlay.remove();

        if (typeof setCardLayout === "function") {
            setCardLayout("default");
        }
    }, 400);
};

function initializeStreamNav() {
    const nav = document.getElementById("stream-cloned-nav");
    if (!nav) return;
    const track = document.getElementById("stream-overlay-track");
    const cyberLine = nav.querySelector(".card-cyber-line");
    const pills = nav.querySelectorAll(".card-nav-pill");

    function moveStreamCyberLine(
        targetPill,
        cyberLine,
        allPills,
        isUserAction = false,
    ) {
        if (!targetPill || !cyberLine) return;

        const index = Array.from(allPills).indexOf(targetPill);
        cyberLine.style.transform = `translateX(${index * 100}%)`;

        const spotlight = nav.querySelector(".stream-spotlight-bg");
        if (spotlight) {
            spotlight.style.transform = `translateX(${index * 100}%)`;
        }

        const isModifiedState =
            document.getElementById("stream-card-search")?.value.trim().length > 0 ||
            Array.from(
                document.querySelectorAll(
                    '#stream-cloned-filters input[type="checkbox"]',
                ),
            ).some((cb) => !cb.checked) ||
            (typeof streamCardTitleSortState !== "undefined" &&
                streamCardTitleSortState !== 0) ||
            (typeof streamCardCategorySortState !== "undefined" &&
                streamCardCategorySortState !== 0);

        if (targetPill.getAttribute("href") === "#the-ai-atlas-section") {
            if (isModifiedState || isUserAction) {
                targetPill.classList.remove("card-default-active");
            } else {
                if (!isStreamProgrammaticScroll) {
                    targetPill.classList.add("card-default-active");
                }
            }
        } else if (isUserAction) {
            const pinnedPill = nav.querySelector(
                '.card-nav-pill[href="#the-ai-atlas-section"]',
            );
            if (pinnedPill) pinnedPill.classList.remove("card-default-active");
        }

        const activeColor = targetPill.getAttribute("data-color");
        const defaultColor = targetPill.getAttribute("data-default-color");
        const isPinnedDefault = targetPill.classList.contains(
            "card-default-active",
        );

        if (isPinnedDefault && !isUserAction) {
            cyberLine.style.backgroundColor = defaultColor;
            cyberLine.style.boxShadow = "none";
        } else {
            cyberLine.style.backgroundColor = activeColor;
            cyberLine.style.boxShadow = `0 0 10px ${activeColor}, 0 0 20px ${activeColor}`;
        }

        allPills.forEach((p) => p.classList.remove("active"));
        targetPill.classList.add("active");

        if (
            targetPill.getAttribute("href") === "#the-ai-atlas-section" &&
            !targetPill.classList.contains("card-default-active")
        ) {
            const bookshelfPill = Array.from(allPills).find(
                (p) => p.getAttribute("href") === "#digital-bookshelf",
            );
            if (bookshelfPill) bookshelfPill.classList.add("active");
        }

        cyberLine.classList.add("initialized");
    }

    if (streamScrollObserver) streamScrollObserver.disconnect();
    streamScrollObserver = new IntersectionObserver(
        (entries) => {
            if (isStreamProgrammaticScroll) return;

            const intersectingEntry = entries.reduce((prev, current) =>
                prev.intersectionRatio > current.intersectionRatio ? prev : current,
            );

            if (intersectingEntry && intersectingEntry.isIntersecting) {
                const sectionId = intersectingEntry.target.getAttribute(
                    "data-stream-section-id",
                );
                if (sectionId) {
                    const targetPill = nav.querySelector(
                        `.card-nav-pill[href="#${sectionId}"]`,
                    );
                    if (targetPill)
                        moveStreamCyberLine(targetPill, cyberLine, pills, false);
                }
            }
        },
        { root: track, threshold: 0.5 },
    );

    track
        .querySelectorAll(".stream-clone")
        .forEach((card) => streamScrollObserver.observe(card));

    pills.forEach((pill) => {
        pill.addEventListener("click", (e) => {
            e.preventDefault();

            const targetHref = pill.getAttribute("href");
            const targetId = targetHref.substring(1);

            const firstCard = track.querySelector(
                `.stream-clone[data-stream-section-id="${targetId}"]:not([style*="display: none"])`,
            );

            if (firstCard) {
                isStreamProgrammaticScroll = true;
                moveStreamCyberLine(pill, cyberLine, pills, true);

                const trackCenter = track.offsetWidth / 2;
                const cardCenter = firstCard.offsetWidth / 2;
                const scrollTo = firstCard.offsetLeft - trackCenter + cardCenter;

                track.scrollTo({ left: scrollTo, behavior: "smooth" });

                setTimeout(() => {
                    isStreamProgrammaticScroll = false;
                }, 800);
            }
        });
    });
}

window.filterCards = function (streamOnly = false) {
    const isStreamModalOpen = document
        .getElementById("stream-overlay-modal")
        ?.classList.contains("active");

    if (isStreamModalOpen && streamOnly) {
        const streamFilterContext = document.getElementById(
            "stream-cloned-filters",
        );
        if (!streamFilterContext) return;

        const searchInput = streamFilterContext.querySelector(
            "#stream-card-search",
        );
        const searchVal = searchInput ? searchInput.value.toLowerCase() : "";
        const searchTerms = searchVal
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0);

        const checkboxes = streamFilterContext.querySelectorAll(
            'input[type="checkbox"]',
        );
        const selectedCats = Array.from(checkboxes)
            .filter((cb) => cb.checked)
            .map((cb) => cb.value.toLowerCase());

        const isFilteredState =
            searchTerms.length > 0 || selectedCats.length < checkboxes.length;
        const currentSortState =
            typeof streamCardCategorySortState !== "undefined"
                ? streamCardCategorySortState
                : 0;
        const currentTitleSortState =
            typeof streamCardTitleSortState !== "undefined"
                ? streamCardTitleSortState
                : 0;

        const forceHideShortcut =
            isFilteredState || currentSortState !== 0 || currentTitleSortState !== 0;

        const triggerText = streamFilterContext.querySelector(
            "#stream-card-trigger-text",
        );
        const triggerBtn = streamFilterContext.querySelector(
            ".custom-select-trigger",
        );
        if (triggerText && triggerBtn) {
            triggerText.style.color = "";
            if (selectedCats.length === checkboxes.length) {
                triggerText.innerText = "All Categories";
                triggerBtn.classList.remove("filter-active");
                triggerBtn.setAttribute("data-tooltip", "Filter Categories");
            } else if (selectedCats.length === 0) {
                triggerText.innerText = "None";
                triggerBtn.classList.add("filter-active");
                triggerBtn.setAttribute("data-tooltip", "Edit Filter");
            } else {
                triggerText.innerText = `${selectedCats.length} Selected`;
                triggerBtn.classList.add("filter-active");
                triggerBtn.setAttribute("data-tooltip", "Edit Filter");
            }
        }

        const streamTrack = document.getElementById("stream-overlay-track");
        let visibleStreamCount = 0;
        if (streamTrack) {
            streamVisibleCardsCache = [];
            const streamCards = streamTrack.querySelectorAll(".stream-clone");
            streamCards.forEach((card) => {
                if (card.getAttribute("data-is-shortcut") === "true") {
                    if (forceHideShortcut) {
                        card.style.setProperty("display", "none", "important");
                        return;
                    }
                }

                const category = card.getAttribute("data-stream-category");
                const title = (card.innerText || "").toLowerCase();
                const matchesCategory = selectedCats.includes(category);
                const matchesSearch =
                    searchTerms.length === 0 ||
                    searchTerms.some((term) => title.includes(term));

                if (matchesCategory && matchesSearch) {
                    card.style.setProperty("display", "flex", "important");
                    visibleStreamCount++;
                    streamVisibleCardsCache.push(card);
                } else {
                    card.style.setProperty("display", "none", "important");
                }
            });

            streamTrack.scrollLeft = 0;
            streamTrack.scrollTo({ left: 0, behavior: "smooth" });

            const nav = document.getElementById("stream-cloned-nav");
            if (nav) {
                const firstVisibleCard = streamTrack.querySelector(
                    '.stream-clone:not([style*="display: none"])',
                );

                const activeSectionId = firstVisibleCard
                    ? firstVisibleCard.getAttribute("data-stream-section-id")
                    : "the-ai-atlas-section";

                const targetPill = nav.querySelector(
                    `.card-nav-pill[href="#${activeSectionId}"]`,
                );
                const cyberLine = nav.querySelector(".card-cyber-line");
                const spotlight = nav.querySelector(".stream-spotlight-bg");
                const pills = nav.querySelectorAll(".card-nav-pill");

                if (targetPill && cyberLine) {
                    const index = Array.from(pills).indexOf(targetPill);
                    const transformVal = `translateX(${index * 100}%)`;

                    cyberLine.style.transform = transformVal;
                    if (spotlight) spotlight.style.transform = transformVal;

                    const activeColor = targetPill.getAttribute("data-color");
                    const defaultColor = targetPill.getAttribute("data-default-color");

                    if (activeSectionId === "the-ai-atlas-section") {
                        cyberLine.style.backgroundColor =
                            defaultColor || "rgba(255, 255, 255, 0.7)";
                        cyberLine.style.boxShadow = "none";
                        targetPill.classList.add("card-default-active");
                    } else {
                        cyberLine.style.backgroundColor = activeColor;
                        cyberLine.style.boxShadow = `0 0 10px ${activeColor}, 0 0 20px ${activeColor}`;
                        targetPill.classList.remove("card-default-active");
                    }

                    pills.forEach((p) => p.classList.remove("active"));
                    targetPill.classList.add("active");
                }
            }

            setTimeout(() => {
                if (typeof updateStreamFocus === "function") updateStreamFocus();

                if (typeof setupStreamPaddleObserver === "function")
                    setupStreamPaddleObserver();
            }, 400);
        }

        const streamTotalWrapper = document.getElementById("stream-total-wrapper");
        if (streamTotalWrapper) {
            const totalCardsInStream =
                streamTrack.querySelectorAll(".stream-clone").length;
            if (!isFilteredState) {
                const realTotal = Math.max(0, totalCardsInStream - 1);
                streamTotalWrapper.setAttribute("data-tooltip", `Total: ${realTotal}`);
            } else {
                streamTotalWrapper.setAttribute(
                    "data-tooltip",
                    `Showing: ${visibleStreamCount}`,
                );
            }
        }

        let noResultsMsg = document.getElementById("stream-no-results");
        if (visibleStreamCount === 0 && streamTrack) {
            streamTrack.classList.add("stream-no-results-active");
            if (!noResultsMsg) {
                noResultsMsg = document.createElement("div");
                noResultsMsg.id = "stream-no-results";
                noResultsMsg.style.textAlign = "center";
                noResultsMsg.style.padding = "40px 20px";
                noResultsMsg.style.color = "#ff6b6b";
                noResultsMsg.style.fontSize = "1.2em";
                noResultsMsg.style.letterSpacing = "0.5px";
                noResultsMsg.style.width = "100%";
                noResultsMsg.innerHTML = `<i class="fas fa-ghost" style="font-size: 3em; margin-bottom: 15px; display: block;"></i> No projects found matching criteria`;
                streamTrack.appendChild(noResultsMsg);
            }
            noResultsMsg.style.display = "block";
        } else {
            if (streamTrack) streamTrack.classList.remove("stream-no-results-active");
            if (noResultsMsg) noResultsMsg.style.display = "none";
        }

        const clonedNav = document.getElementById("stream-cloned-nav");
        if (clonedNav) {
            clonedNav.classList.toggle(
                "stream-nav-disabled",
                selectedCats.length === 0,
            );

            const navItems = clonedNav.querySelectorAll(".card-nav-pill");
            navItems.forEach((el) => el.classList.remove("simulated-hover"));

            if (selectedCats.length > 0 && selectedCats.length < checkboxes.length) {
                const mapping = {
                    "open-source": '[href="#open-source-projects"]',

                    "articles-insights": '[href="#articles-insights"]',
                    "digital-bookshelf": '[href="#digital-bookshelf"]',
                    updates: '[href="#updates"]',
                };
                selectedCats.forEach((cat) => {
                    const selectorSuffix = mapping[cat];
                    if (selectorSuffix) {
                        const targetEls = clonedNav.querySelectorAll(selectorSuffix);
                        targetEls.forEach((el) => el.classList.add("simulated-hover"));
                    }
                });
            }
        }

        return;
    }

    if (!streamOnly) {
        const mainFilterContext = document.getElementById(
            "card-gallery-filter-bar",
        );
        if (!mainFilterContext) return;

        const searchInput = mainFilterContext.querySelector("#card-search");
        const searchVal = searchInput ? searchInput.value.toLowerCase() : "";
        const searchTerms = searchVal
            .split(",")
            .map((t) => t.trim())
            .filter((t) => t.length > 0);

        const checkboxes = mainFilterContext.querySelectorAll(
            'input[type="checkbox"]',
        );
        const selectedCats = Array.from(checkboxes)
            .filter((cb) => cb.checked)
            .map((cb) => cb.value.toLowerCase());

        const isFilteredState =
            searchTerms.length > 0 || selectedCats.length < checkboxes.length;

        const currentSortState =
            typeof cardCategorySortState !== "undefined" ? cardCategorySortState : 0;
        const currentTitleSortState =
            typeof cardTitleSortState !== "undefined" ? cardTitleSortState : 0;
        const forceHideShortcut =
            isFilteredState || currentSortState !== 0 || currentTitleSortState !== 0;

        const atlasSection = document.getElementById("the-ai-atlas-section");
        if (atlasSection) {
            if (isFilteredState || currentSortState !== 0) {
                atlasSection.classList.add("force-title-visible");
            } else {
                atlasSection.classList.remove("force-title-visible");
            }
        }

        const triggerText = mainFilterContext.querySelector("#card-trigger-text");
        const triggerBtn = mainFilterContext.querySelector(
            ".custom-select-trigger",
        );
        if (triggerText && triggerBtn) {
            triggerText.style.color = "";
            if (selectedCats.length === checkboxes.length) {
                triggerText.innerText = "All Categories";
                triggerBtn.classList.remove("filter-active");
                triggerBtn.setAttribute("data-tooltip", "Filter Categories");
            } else if (selectedCats.length === 0) {
                triggerText.innerText = "None";
                triggerBtn.classList.add("filter-active");
                triggerBtn.setAttribute("data-tooltip", "Edit Filter");
            } else {
                triggerText.innerText = `${selectedCats.length} Selected`;
                triggerBtn.classList.add("filter-active");
                triggerBtn.setAttribute("data-tooltip", "Edit Filter");
            }
        }

        let totalVisibleCards = 0;
        const sections = document.querySelectorAll(
            "#view-cards section[data-category]",
        );
        sections.forEach((section) => {
            const category = section.getAttribute("data-category");
            if (!selectedCats.includes(category)) {
                section.style.display = "none";
                return;
            }

            const cards = section.querySelectorAll(
                ".card-showcase-item, .card-book-showcase, .card-modern-glass, .neu-card",
            );
            let visibleInSection = 0;

            cards.forEach((card) => {
                if (card.id === "the-ai-atlas-shortcut-card") {
                    if (forceHideShortcut) {
                        card.style.display = "none";
                        return;
                    }
                }

                const title = (card.innerText || "").toLowerCase();
                const matchesSearch =
                    searchTerms.length === 0 ||
                    searchTerms.some((term) => title.includes(term));
                if (matchesSearch) {
                    card.style.display = "";
                    visibleInSection++;
                    totalVisibleCards++;
                } else {
                    card.style.display = "none";
                }
            });
            section.style.display = visibleInSection > 0 ? "" : "none";
        });

        let noResultsMsg = document.getElementById("card-no-results");
        const viewCards = document.getElementById("view-cards");
        if (totalVisibleCards === 0 && viewCards) {
            if (!noResultsMsg) {
                noResultsMsg = document.createElement("div");
                noResultsMsg.id = "card-no-results";
                noResultsMsg.style.textAlign = "center";
                noResultsMsg.style.padding = "40px 20px";
                noResultsMsg.style.color = "#ff6b6b";
                noResultsMsg.style.fontSize = "1em";
                noResultsMsg.style.letterSpacing = "0.5px";
                noResultsMsg.style.marginTop = "20px";
                noResultsMsg.style.width = "100%";
                noResultsMsg.innerHTML = `<i class="fas fa-ghost" style="font-size: 1.5em; margin-bottom: 10px; display: block;"></i> No projects found matching criteria`;
                viewCards.appendChild(noResultsMsg);
            }
            noResultsMsg.style.display = "block";
        } else {
            if (noResultsMsg) noResultsMsg.style.display = "none";
        }

        const totalWrapper = document.getElementById("card-total-wrapper");
        if (totalWrapper) {
            if (!isFilteredState) {
                const realTotal = Math.max(0, totalVisibleCards - 1);
                totalWrapper.setAttribute("data-tooltip", `Total: ${realTotal}`);
            } else {
                totalWrapper.setAttribute(
                    "data-tooltip",
                    `Showing: ${totalVisibleCards}`,
                );
            }
        }

        const nav = document.getElementById("card-internal-nav");
        if (nav) {
            const navItems = nav.querySelectorAll(".card-nav-pill");
            navItems.forEach((el) => el.classList.remove("simulated-hover"));

            if (selectedCats.length > 0 && selectedCats.length < checkboxes.length) {
                const mapping = {
                    "open-source": '[href="#open-source-projects"]',

                    "articles-insights": '[href="#articles-insights"]',
                    "digital-bookshelf": '[href="#digital-bookshelf"]',
                    updates: '[href="#updates"]',
                };
                selectedCats.forEach((cat) => {
                    const selectorSuffix = mapping[cat];
                    if (selectorSuffix) {
                        const targetEls = nav.querySelectorAll(selectorSuffix);
                        targetEls.forEach((el) => el.classList.add("simulated-hover"));
                    }
                });
            }
        }

        updateLayoutControlsMargin();
    }
};

function flashNavHoverEffect(selector, duration) {
    const pills = document.querySelectorAll(selector);

    pills.forEach((pill) => {
        pill.classList.add("flash-effect");
    });

    setTimeout(() => {
        pills.forEach((pill) => {
            pill.classList.remove("flash-effect");
        });
    }, duration);
}

document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    }
});

let currentlyVisibleHorizontalTrack = null;

const observer = new IntersectionObserver(
    (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                currentlyVisibleHorizontalTrack = entry.target;
            }
        });
    },
    {
        threshold: 0.5,
    },
);

const allTracks = document.querySelectorAll(
    ".intro-collapsible-section-content > div",
);
allTracks.forEach((track) => observer.observe(track));

document.addEventListener("keydown", function (e) {
    const cardView = document.getElementById("view-cards");
    if (!cardView || cardView.classList.contains("hidden-view")) {
        return;
    }

    const streamModal = document.getElementById("stream-overlay-modal");
    if (streamModal && streamModal.classList.contains("active")) {
        return;
    }

    if (
        !currentlyVisibleHorizontalTrack ||
        !currentlyVisibleHorizontalTrack.classList.contains("card-horizontal-mode")
    ) {
        return;
    }

    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();

        const direction = e.key === "ArrowLeft" ? -1 : 1;
        const wrapperId = currentlyVisibleHorizontalTrack.parentElement.id;

        if (wrapperId) {
            window.scrollCardSection(wrapperId, direction);
        }
    }
});

setTimeout(() => {
    if (typeof window.filterTable === "function") {
        window.filterTable();
    }
}, 100);

const streamLinkBtn = document.getElementById("btn-open-stream");

if (streamLinkBtn) {
    streamLinkBtn.addEventListener("click", function (e) {
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) {
            return;
        }

        e.preventDefault();

        openStreamOverlay();
    });
}

window.toggleStreamHeader = function () {
    const overlay = document.getElementById("stream-overlay-modal");
    const btn = document.getElementById("stream-header-toggle-btn");
    const icon = btn.querySelector("i");

    if (!overlay || !btn || !icon) return;

    const isHiding = !overlay.classList.contains("header-hidden");
    overlay.classList.toggle("header-hidden", isHiding);

    if (isHiding) {
        icon.className = "fas fa-chevron-down";
        btn.setAttribute("data-tooltip", "Show Header");
    } else {
        icon.className = "fas fa-chevron-up";
        btn.setAttribute("data-tooltip", "Hide Header");
    }
};

window.toggleStreamCardStyle = function () {
    const overlay = document.getElementById("stream-overlay-modal");
    const btn = document.getElementById("stream-card-style-toggle-btn");
    if (!overlay || !btn) return;

    const isTransparent = overlay.classList.toggle("stream-transparent-cards");

    if (isTransparent) {
        btn.setAttribute("data-tooltip", "Show Card Backgrounds");
        btn.classList.add("active-state");
    } else {
        btn.setAttribute("data-tooltip", "Hide Card Backgrounds");
        btn.classList.remove("active-state");
    }
};

window.toggleStreamFocusMode = function () {
    const overlay = document.getElementById("stream-overlay-modal");
    const btn = document.getElementById("stream-focus-mode-btn");
    if (!overlay || !btn) return;

    const isFocusModeActive = overlay.classList.toggle("stream-focus-mode");

    if (isFocusModeActive) {
        btn.setAttribute("data-tooltip", "Exit Focus Mode");
        btn.classList.add("active-state");
    } else {
        btn.setAttribute("data-tooltip", "Toggle Focus Mode");
        btn.classList.remove("active-state");
    }
};

window.toggleStreamBackground = function () {
    const overlay = document.getElementById("stream-overlay-modal");
    const btn = document.getElementById("stream-bg-toggle-btn");
    if (!overlay || !btn) return;

    const isSolid = overlay.classList.toggle("stream-solid-background");

    if (isSolid) {
        btn.setAttribute("data-tooltip", "Toggle Transparent Background");
        btn.classList.add("active-state");
    } else {
        btn.setAttribute("data-tooltip", "Toggle Solid Background");
        btn.classList.remove("active-state");
    }
};

document.addEventListener("keydown", function (e) {
    const streamModal = document.getElementById("stream-overlay-modal");

    if (!streamModal || !streamModal.classList.contains("active")) return;

    if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (typeof handleStreamPaddleClick === "function") {
            handleStreamPaddleClick(-1);

            const icon = document.querySelector("#stream-paddle-left i");
            if (icon) {
                icon.style.transform = "scale(1.15)";
                setTimeout(() => (icon.style.transform = ""), 200);
            }
        }
    } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (typeof handleStreamPaddleClick === "function") {
            handleStreamPaddleClick(1);

            const icon = document.querySelector("#stream-paddle-right i");
            if (icon) {
                icon.style.transform = "scale(1.15)";
                setTimeout(() => (icon.style.transform = ""), 200);
            }
        }
    } else if (e.key === "Escape") {
        e.preventDefault();
        if (typeof closeStreamOverlay === "function") {
            closeStreamOverlay();
        }
    }
});

let paddleObserver = null;

function setupStreamPaddleObserver() {
    const track = document.getElementById("stream-overlay-track");
    const leftBtn = document.getElementById("stream-paddle-left");
    const rightBtn = document.getElementById("stream-paddle-right");

    if (!track || !leftBtn || !rightBtn) return;

    const allCards = Array.from(track.querySelectorAll(".stream-clone"));

    const visibleCards = allCards.filter((card) => card.style.display !== "none");

    if (visibleCards.length === 0) {
        leftBtn.classList.add("paddle-blocked");
        rightBtn.classList.add("paddle-blocked");
        return;
    }

    const firstCard = visibleCards[0];
    const lastCard = visibleCards[visibleCards.length - 1];

    if (paddleObserver) paddleObserver.disconnect();

    const options = {
        root: track,
        rootMargin: "0px -40% 0px -40%",
        threshold: 0.01,
    };

    paddleObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const isVisible = entry.isIntersecting;

            if (entry.target === firstCard) {
                if (isVisible) leftBtn.classList.add("paddle-blocked");
                else leftBtn.classList.remove("paddle-blocked");
            }

            if (entry.target === lastCard) {
                if (isVisible) rightBtn.classList.add("paddle-blocked");
                else rightBtn.classList.remove("paddle-blocked");
            }
        });
    }, options);

    paddleObserver.observe(firstCard);
    paddleObserver.observe(lastCard);
}

function showToast(message) {
    const toast = document.getElementById("toast-notification");
    if (!toast) return;
    toast.innerHTML = `<i class="fa-solid fa-check-circle"></i> ${message}`;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
}

function openCustomShareMenu(btn, extraData = null) {
    const rect = btn.getBoundingClientRect();
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;

    const systemBtn = document.getElementById("share-system");
    if (systemBtn) systemBtn.style.display = navigator.share ? "flex" : "none";

    const slot = document.getElementById("share-dynamic-slot");
    if (slot) {
        slot.innerHTML = "";

        if (extraData && extraData.url) {
            let iconHTML = "";

            if (extraData.url.includes("medium.com")) {
                iconHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" fill="currentColor"><path d="M369.4 32c43.4 0 78.6 35.2 78.6 78.6l0 83.8c-1.9-.1-3.8-.2-5.7-.2l-.4 0c-10 0-22.3 2.4-31.1 6.8-10 4.6-18.7 11.5-26 20.6-11.8 14.6-18.9 34.3-20.6 56.4-.1 .7-.1 1.3-.2 2s-.1 1.2-.1 1.9c-.1 1.2-.1 2.4-.1 3.6 0 1.9-.1 3.8 0 5.8 1.2 50.1 28.2 90.2 76.3 90.2 2.7 0 5.3-.1 7.9-.4l0 20.4c0 43.4-35.2 78.6-78.6 78.6L78.6 480C35.2 480 0 444.8 0 401.4L0 110.6C0 67.2 35.2 32 78.6 32l290.8 0zM82.3 138.9l.3 .1c13.2 3 19.8 7.4 19.8 23.4l0 187.2c0 16-6.7 20.4-19.9 23.4l-.3 .1 0 2.8 52.8 0 0-2.8-.3-.1c-13.2-3-19.9-7.4-19.9-23.4l0-176.3 86.1 202.5 4.9 0 88.6-208.2 0 186.6c-1.1 12.6-7.8 16.5-19.7 19.2l-.3 .1 0 2.7 91.9 0 0-2.7-.3-.1c-11.9-2.7-18.7-6.6-19.9-19.2l-.1-191.8 .1 0c0-16 6.7-20.4 19.9-23.4l.3-.1 0-2.7-72.2 0-67 157.4-67-157.4-77.8 0 0 2.7zM448 340.3c-25.1-7.4-43-35.1-41.2-67.8l0 0 41.1 0 0 67.8zm-6.4-135.6c2.3 0 4.4 .3 6.4 .9l0 57.4-40.2 0c1.5-33.6 13.6-57.9 33.8-58.3z"/></svg>`;
            } else if (extraData.url.includes("linkedin.com")) {
                iconHTML = `<i class="fa-brands fa-linkedin-in"></i>`;
            } else if (extraData.url.includes("amazon.com")) {
                iconHTML = `<i class="fa-brands fa-amazon"></i>`;
            } else {
                iconHTML = `<i class="fa-solid fa-external-link-alt"></i>`;
            }

            const div = document.createElement("div");
            div.className = "share-divider";
            slot.appendChild(div);

            const linkBtn = document.createElement("button");
            linkBtn.className = "share-option";

            linkBtn.innerHTML = `${iconHTML} ${extraData.label || "Open Section"}`;

            linkBtn.onclick = () => {
                window.open(extraData.url, "_blank");
                shareMenu.classList.remove("active");
                if (activeShareBtn) activeShareBtn.classList.remove("active-state");
                activeShareBtn = null;
            };

            slot.appendChild(linkBtn);
        }
    }

    shareMenu.classList.add("active");

    const menuWidth = shareMenu.offsetWidth;
    const menuHeight = shareMenu.offsetHeight;
    const gap = 15;

    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;

    let top;
    const arrow = shareMenu.querySelector(".share-arrow");

    if (spaceAbove < menuHeight + gap && spaceBelow > menuHeight + gap) {
        top = rect.bottom + scrollY + gap;
        if (arrow) {
            arrow.style.bottom = "auto";
            arrow.style.top = "-6px";
        }
    } else {
        top = rect.top + scrollY - menuHeight - gap;
        if (arrow) {
            arrow.style.top = "auto";
            arrow.style.bottom = "-6px";
        }
    }

    let left = rect.left + scrollX + rect.width / 2 - menuWidth / 2;
    const viewportWidth = window.innerWidth;
    const margin = 10;

    if (left < margin) left = margin;
    if (left + menuWidth > viewportWidth - margin) {
        left = viewportWidth - menuWidth - margin;
    }

    shareMenu.style.top = `${top}px`;
    shareMenu.style.left = `${left}px`;

    if (arrow) {
        const btnCenterAbsolute = rect.left + scrollX + rect.width / 2;
        const arrowLeft = btnCenterAbsolute - left;
        const arrowSafeMargin = 20;
        const clampedArrowLeft = Math.max(
            arrowSafeMargin,
            Math.min(menuWidth - arrowSafeMargin, arrowLeft),
        );

        arrow.style.left = `${clampedArrowLeft}px`;
        arrow.style.transform = "translateX(-50%) rotate(45deg)";
    }
}

window.shareSection = function (sectionId, title, btn) {
    if (window.event) {
        window.event.preventDefault();
        window.event.stopPropagation();
    }

    if (shareMenu.classList.contains("active") && activeShareBtn === btn) {
        shareMenu.classList.remove("active");
        btn.classList.remove("active-state");
        activeShareBtn = null;
        return;
    }

    if (activeShareBtn && activeShareBtn !== btn) {
        activeShareBtn.classList.remove("active-state");
    }

    activeShareBtn = btn;
    currentShareType = "section";
    const origin = window.location.origin + window.location.pathname;
    currentShareUrl = `${origin}#${sectionId}`;
    currentShareTitle = title;
    currentShareObjectLabel = "the section";

    currentSystemTitle = `Vitalii Starosta — ${title}`;
    currentSystemText = `Discover the “${title}” section in Vitalii Starosta’s portfolio.`;

    let externalData = null;
    const section = document.getElementById(sectionId);

    if (section) {
        const customUrl = section.getAttribute("data-share-url");
        const customLabel = section.getAttribute("data-share-label");

        if (customUrl) {
            externalData = {
                url: customUrl,
                label: customLabel || "Open External Link",
            };
        }
    }

    const isMobile =
        /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
        window.innerWidth <= 768;

    if (navigator.share && isMobile) {
        navigator
            .share({
                title: currentSystemTitle,
                text: currentSystemText,
                url: currentShareUrl,
            })
            .catch(console.error);
        setTimeout(() => btn.classList.remove("active-state"), 200);
    } else {
        btn.classList.add("active-state");

        openCustomShareMenu(btn, externalData);
    }
};

document.body.addEventListener("click", function (e) {
    const btn = e.target.closest(".card-btn-share");

    if (btn) {
        e.preventDefault();
        e.stopPropagation();

        if (shareMenu.classList.contains("active") && activeShareBtn === btn) {
            shareMenu.classList.remove("active");
            activeShareBtn = null;
            return;
        }

        const card =
            btn.closest("article") ||
            btn.closest(".card-showcase-item") ||
            btn.closest(".card-book-showcase");

        const targetId = card
            ? card.id || card.getAttribute("data-original-id")
            : null;

        if (!card || !targetId) return;

        activeShareBtn = btn;
        currentShareType = "project";
        const origin = window.location.origin + window.location.pathname;
        currentShareUrl = `${origin}#${targetId}`;
        currentShareTitle =
            card.querySelector(".section-title")?.innerText || "Project";

        const sectionCat = card.closest("section")?.getAttribute("data-category");
        let objectLabel = "a project";

        if (sectionCat === "updates") {
            objectLabel = "an update";
        } else if (
            card.id === "book-the-ai-atlas" ||
            card.id === "the-ai-atlas-shortcut-card"
        ) {
            objectLabel = "a publication";
        } else if (
            sectionCat === "articles-insights" ||
            (sectionCat === "digital-bookshelf" && card.id.includes("insight-"))
        ) {
            objectLabel = "an article";
        }
        currentShareObjectLabel = objectLabel;

        currentSystemTitle = `Vitalii Starosta — ${currentShareTitle}`;
        currentSystemText = `I would like to share ${currentShareObjectLabel} from Vitalii Starosta’s portfolio: “${currentShareTitle}”.`;

        const isMobile =
            /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
            window.innerWidth <= 768;

        if (navigator.share && isMobile) {
            navigator
                .share({
                    title: currentSystemTitle,
                    text: currentSystemText,
                    url: currentShareUrl,
                })
                .catch(console.error);
        } else {
            openCustomShareMenu(btn);
        }
        return;
    }

    if (shareMenu.classList.contains("active")) {
        const target = e.target;

        const closeAndReset = () => {
            shareMenu.classList.remove("active");
            if (activeShareBtn) {
                activeShareBtn.classList.remove("active-state");
                activeShareBtn = null;
            }
        };

        if (target.closest("#share-copy")) {
            navigator.clipboard.writeText(currentShareUrl).then(() => {
                showToast("Link Copied!");
                closeAndReset();
            });
        } else if (target.closest("#share-email")) {
            const subject = encodeURIComponent(
                `Vitalii Starosta — ${currentShareTitle}`,
            );
            const bodyText = `I would like to share ${currentShareObjectLabel} from Vitalii Starosta’s portfolio: “${currentShareTitle}”.\n\nFurther information is available here: ${currentShareUrl}`;
            window.location.href = `mailto:?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
        } else if (target.closest("#share-linkedin")) {
            window.open(
                `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentShareUrl)}`,
                "_blank",
            );
            closeAndReset();
        } else if (target.closest("#share-x")) {
            const cleanLabel = currentShareObjectLabel
                .replace("an ", "")
                .replace("a ", "");
            const xText = `Explore “${currentShareTitle}” ${cleanLabel} from Vitalii Starosta’s portfolio:`;

            window.open(
                `https://twitter.com/intent/tweet?text=${encodeURIComponent(xText)}&url=${encodeURIComponent(currentShareUrl)}`,
                "_blank",
            );
            closeAndReset();
        } else if (target.closest("#share-system")) {
            shareMenu.classList.remove("active");

            if (activeShareBtn) {
                activeShareBtn.classList.remove("active-state");
                activeShareBtn.focus();
            }

            if (navigator.share) {
                navigator
                    .share({
                        title: currentSystemTitle,
                        text: currentSystemText,
                        url: currentShareUrl,
                    })
                    .catch(console.error);
            }

            activeShareBtn = null;
        }

        if (
            !target.closest("#share-menu-popover") &&
            !target.closest(".card-btn-share") &&
            !target.closest(".share-section")
        ) {
            closeAndReset();
        }
    }
});

document.addEventListener("DOMContentLoaded", function () {
    const spotlightItems = document.querySelectorAll(".spotlight-item");

    spotlightItems.forEach((item) => {
        item.addEventListener("click", function (e) {
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) {
                return;
            }

            e.preventDefault();

            if (typeof killTooltip === "function") killTooltip(this);

            const href = this.getAttribute("href");

            if (typeof toggleRadialMenu === "function") {
                toggleRadialMenu("spotlight-dock");
            }

            setTimeout(() => {
                switch (href) {
                    case "#stream-lightbox":
                        if (typeof openStreamOverlay === "function") openStreamOverlay();
                        break;
                    case "#registry-lightbox":
                        if (typeof switchView === "function") {
                            switchView("matrix");
                        }

                        setTimeout(() => {
                            if (typeof window.openTableLightbox === "function") {
                                window.openTableLightbox();
                            }
                        }, 150);
                        break;
                    case "#media-lightbox":
                        document.getElementById("gallery-open-fullscreen-btn")?.click();
                        break;
                    case "#dashboard-lightbox":
                        if (typeof switchView === "function") {
                            switchView("analytics");
                        }

                        if (typeof switchAnalyticsView === "function") {
                            switchAnalyticsView("carousel");
                        }

                        if (typeof toggleAnalyticsFullscreen === "function") {
                            toggleAnalyticsFullscreen();
                        }

                        if (history.pushState) {
                            history.pushState(null, null, "#dashboard-lightbox");
                        }
                        break;
                }
            }, 100);
        });
    });
});

const profileItems = document.querySelectorAll(
    "#right-dock-container .profile-item",
);

profileItems.forEach((item) => {
    item.addEventListener("click", function (e) {
        e.preventDefault();

        if (this.classList.contains("disabled")) return;
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;

        const action = this.getAttribute("data-action");
        const mainTrigger = document.getElementById("profile-trigger-btn");
        const isAboutAlreadyActive =
            mainTrigger && mainTrigger.classList.contains("active");

        if (isAboutAlreadyActive) {
            switchView("card");

            const dock = document.getElementById("profile-dock");
            if (dock) dock.classList.remove("open");
        } else {
            setTimeout(() => {
                if (action === "view-about" && typeof switchView === "function") {
                    switchView("about");
                }
            }, 100);
        }
    });
});

const bioMainProfileItem = document.querySelector(
    ".bio-actions-cell .profile-item",
);

if (bioMainProfileItem) {
    bioMainProfileItem.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        if (typeof switchView === "function") {
            switchView("about");
        }

        const profileDock = document.getElementById("profile-dock");
        if (profileDock) {
            document
                .querySelectorAll("#right-dock-container .dock-item")
                .forEach((id) => id.classList.remove("open"));

            profileDock.classList.add("open");
        }

        const bioTrigger = document.getElementById("bio-section-trigger");
        if (bioTrigger && bioTrigger.classList.contains("card-expanded")) {
            if (typeof toggleBio === "function") {
                toggleBio();
            }
        }
    });
}

window.toggleCardHeader = function () {
    const item = document.getElementById("card-header-toggle-item");
    const track = document.getElementById("card-header-toggle-track");
    const label = document.getElementById("card-header-toggle-label");
    const filterBar = document.getElementById("card-gallery-filter-bar");

    if (!item || !track || !filterBar) return;

    const isActive = track.classList.toggle("active");
    item.classList.toggle("active-state", isActive);
    filterBar.classList.toggle("collapsed", !isActive);

    if (!isActive) {
        filterBar.style.visibility = "hidden";
        filterBar.style.marginBottom = "0px";
    } else {
        filterBar.style.visibility = "visible";
        filterBar.style.removeProperty("margin-bottom");
    }

    const textOn = item.getAttribute("data-on");
    const textOff = item.getAttribute("data-off");
    if (label) label.textContent = isActive ? textOn : textOff;
};

const lightboxImage = document.getElementById("gallery-image");

if (lightboxImage) {
    let isDragging = false;
    let hasMoved = false;
    let startX = 0,
        startY = 0;
    let dragStartX = 0,
        dragStartY = 0;

    lightboxImage.addEventListener("mousedown", (e) => {
        e.preventDefault();

        if (currentZoom > 1) {
            lightboxImage.style.cursor = "grabbing";
        }

        isDragging = true;
        hasMoved = false;

        startX = e.clientX - currentTranslateX;
        startY = e.clientY - currentTranslateY;
        dragStartX = e.clientX;
        dragStartY = e.clientY;

        lightboxImage.style.transition = "none";
    });

    window.addEventListener("mousemove", (e) => {
        if (!isDragging) return;

        const moveDistance = Math.sqrt(
            Math.pow(e.clientX - dragStartX, 2) + Math.pow(e.clientY - dragStartY, 2),
        );

        if (moveDistance > 5) {
            hasMoved = true;
        }

        if (hasMoved && currentZoom > 1) {
            lightboxImage.style.cursor = "grabbing";
            currentTranslateX = e.clientX - startX;
            currentTranslateY = e.clientY - startY;
            updateImageTransform();
        }
    });

    window.addEventListener("mouseup", (e) => {
        if (!isDragging) return;

        isDragging = false;
        lightboxImage.style.cursor = currentZoom > 1 ? "grab" : "pointer";

        if (!hasMoved) {
            e.stopPropagation();

            jumpFromLightbox();
        }
    });
}

function jumpFromLightbox() {
    if (currentLightboxElement) {
        const dataTitle = currentLightboxElement
            .closest(".gallery-item")
            .getAttribute("data-title");
        closeLightbox();
        jumpToGallery(dataTitle);
    }
}

function updateImageTransform() {
    const img = document.getElementById("gallery-image");
    if (img) {
        img.style.transform = `translate(${currentTranslateX}px, ${currentTranslateY}px) scale(${currentZoom})`;
    }
}

window.zoomIn = function (event) {
    if (event) event.stopPropagation();

    const img = document.getElementById("gallery-image");
    if (!img || img.style.display === "none") return;

    currentZoom = Math.min(MAX_ZOOM, currentZoom + ZOOM_STEP);

    applySmartZoom();
};

window.zoomOut = function (event) {
    if (event) event.stopPropagation();

    const img = document.getElementById("gallery-image");
    if (!img || img.style.display === "none") return;

    currentZoom = Math.max(MIN_ZOOM, currentZoom - ZOOM_STEP);

    if (currentZoom <= 1) {
        currentTranslateX = 0;
        currentTranslateY = 0;
    }

    applySmartZoom();
};

window.resetZoom = function (event) {
    if (event) event.stopPropagation();

    const img = document.getElementById("gallery-image");
    if (!img) return;

    currentZoom = 1;
    currentTranslateX = 0;
    currentTranslateY = 0;

    if (typeof applySmartZoom === "function") {
        applySmartZoom();
    } else {
        img.style.transform = `translate(0px, 0px) scale(1)`;
        img.style.cursor = "zoom-in";
        const caption = document.getElementById("gallery-lightbox-caption");
        if (caption) caption.classList.remove("is-zoomed");
    }
};

function updateCaptionState() {
    const caption = document.getElementById("gallery-lightbox-caption");
    if (!caption) return;

    if (currentZoom > 1.01) {
        caption.classList.add("is-zoomed");
    } else {
        caption.classList.remove("is-zoomed");
    }
}

function applySmartZoom() {
    const img = document.getElementById("gallery-image");
    const modal = document.getElementById("gallery-modal");
    const uiBtn = document.getElementById("gallery-ui-toggle-btn");

    const btnIn = document.getElementById("gallery-zoom-in");
    const btnOut = document.getElementById("gallery-zoom-out");

    if (!img || !modal) return;

    let offsetY = 0;

    if (currentZoom > 1.01) {
        modal.classList.add("auto-hide-ui");
        img.style.cursor = "grab";

        if (uiBtn) {
            uiBtn.setAttribute("data-tooltip", "Show Navigation");
            uiBtn.querySelector("i").className = "fas fa-eye-slash";
        }
    } else {
        modal.classList.remove("auto-hide-ui");
        modal.classList.remove("force-show-ui");
        img.style.cursor = "pointer";
        if (uiBtn) {
            uiBtn.setAttribute("data-tooltip", "Hide Navigation");
            uiBtn.querySelector("i").className = "fas fa-eye";
        }
    }

    if (btnIn) btnIn.classList.remove("active-zoom-state");
    if (btnOut) btnOut.classList.remove("active-zoom-state");

    if (currentZoom > 1.01) {
        if (btnIn) btnIn.classList.add("active-zoom-state");
    } else if (currentZoom < 0.99) {
        if (btnOut) btnOut.classList.add("active-zoom-state");
    }

    if (currentZoom > 1) {
        const wrapper = document.getElementById("gallery-media");
        if (wrapper) {
            const rect = wrapper.getBoundingClientRect();
            const wrapperCenterY = rect.top + rect.height / 2;
            const screenCenterY = window.innerHeight / 2;
            offsetY = screenCenterY - wrapperCenterY;
        }
    }

    img.style.transform = `translateY(${offsetY}px) scale(${currentZoom})`;

    if (typeof updateCaptionState === "function") {
        updateCaptionState();
    }
}

window.toggleGalleryUI = function (event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    }

    const modal = document.getElementById("gallery-modal");
    const btn = document.getElementById("gallery-ui-toggle-btn");
    const icon = btn.querySelector("i");

    const isAutoHidden = modal.classList.contains("auto-hide-ui");

    if (isAutoHidden) {
        const isForced = modal.classList.toggle("force-show-ui");

        if (isForced) {
            icon.className = "fas fa-eye";
            btn.setAttribute("data-tooltip", "Hide Navigation");
        } else {
            icon.className = "fas fa-eye-slash";
            btn.setAttribute("data-tooltip", "Show Navigation");

            btn.classList.add("interaction-cooldown");
            btn.addEventListener(
                "mouseleave",
                () => {
                    btn.classList.remove("interaction-cooldown");
                },
                { once: true },
            );
        }
    } else {
        const isHidden = modal.classList.toggle("auto-hide-ui");

        if (isHidden) {
            icon.className = "fas fa-eye-slash";
            btn.setAttribute("data-tooltip", "Show Navigation");

            btn.classList.add("interaction-cooldown");
            btn.addEventListener(
                "mouseleave",
                () => {
                    btn.classList.remove("interaction-cooldown");
                },
                { once: true },
            );
        } else {
            icon.className = "fas fa-eye";
            btn.setAttribute("data-tooltip", "Hide Navigation");
        }
    }
};

function handleSearchInput(e) {
    const resultsContainer = document.getElementById("search-results");
    const query = e.target.value.toLowerCase().trim();

    if (query.length < 2) {
        resultsContainer.innerHTML = `
            <div class="search-placeholder">
                <i class="fas fa-terminal"></i>
                <p>Search for a project (e.g. "BM2Excel")</p>
            </div>`;
        return;
    }

    const matches = searchIndex.filter((p) =>
        p.title.toLowerCase().includes(query),
    );

    if (matches.length === 0) {
        resultsContainer.innerHTML = `
            <div class="search-placeholder">
                <i class="fas fa-ghost"></i>
                <p>No results for "${query}"</p>
            </div>`;
        return;
    }

    resultsContainer.innerHTML = "";
    matches.forEach((project) => {
        const group = document.createElement("div");
        group.className = "search-result-group";
        group.innerHTML = `<div class="search-result-title">${project.title}</div>`;

        project.views.forEach((view) => {
            const link = document.createElement("div");
            link.className = "search-view-link";
            link.innerHTML = `
                <i class="fas ${view.icon}"></i>
                <span class="search-view-label">${view.label}</span>
                <span class="search-view-tag">${view.type}</span>
            `;
            link.onclick = () => {
                closeSearch();

                if (view.type === "card") {
                    switchView("card");
                    setTimeout(() => jumpToCard(project.cardId), 100);
                }
                if (view.type === "matrix") {
                    switchView("matrix");
                }
                if (view.type === "gallery") {
                    jumpToGallery(project.dataTitle);
                }
                if (view.type === "analytics") {
                    switchView("analytics");
                }
            };
            group.appendChild(link);
        });
        resultsContainer.appendChild(group);
    });
}

function openSearch() {
    document.getElementById("search-modal").style.display = "flex";
    document.getElementById("global-search-input").focus();
    buildSearchIndex();
}

function closeSearch() {
    document.getElementById("search-modal").style.display = "none";
    document.getElementById("global-search-input").value = "";
}

let searchIndex = [];

function buildSearchIndex() {
    searchIndex = [];

    const rows = document.querySelectorAll(
        "#matrix-table-body tr:not(#no-results-row)",
    );

    rows.forEach((row) => {
        const titleText = row.querySelector(".matrix-table-title-text")?.innerText;

        const cardId = row
            .querySelector(".jump-btn")
            ?.getAttribute("onclick")
            ?.match(/'([^']+)'/)?.[1];
        const dataTitle = row
            .querySelector("img")
            ?.getAttribute("onclick")
            ?.match(/'([^']+)'/)?.[1];

        if (!titleText) return;

        let projectEntry = {
            title: titleText,
            cardId: cardId,
            dataTitle: dataTitle,
            views: [],
        };

        if (cardId && document.getElementById(cardId)) {
            projectEntry.views.push({
                type: "card",
                label: "Overview Card",
                icon: "fa-th-large",
            });
        }

        projectEntry.views.push({
            type: "matrix",
            label: "Registry Index",
            icon: "fa-list",
        });

        if (
            dataTitle &&
            document.querySelector(`.gallery-item[data-title="${dataTitle}"]`)
        ) {
            projectEntry.views.push({
                type: "gallery",
                label: "Visual Gallery",
                icon: "fa-images",
            });
        }

        if (
            cardId &&
            document.querySelector(
                `.analytics-carousel-card[data-target="${cardId}"]`,
            )
        ) {
            projectEntry.views.push({
                type: "analytics",
                label: "Data Analytics",
                icon: "fa-chart-pie",
            });
        }

        searchIndex.push(projectEntry);
    });
}

function distributePlanetsRandomly() {
    const source = document.getElementById("analytics-planet-source");
    const ring1 = document.querySelector(
        ".analytics-orbit-ring.analytics-ring-1",
    );
    const ring2 = document.querySelector(
        ".analytics-orbit-ring.analytics-ring-2",
    );

    if (!source || !ring1 || !ring2) return;

    let planets = Array.from(source.children);

    for (let i = planets.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [planets[i], planets[j]] = [planets[j], planets[i]];
    }

    const innerRingCount = 6;

    planets.forEach((planet, index) => {
        if (index < innerRingCount) {
            ring1.appendChild(planet);
        } else {
            ring2.appendChild(planet);
        }
    });
}

function calculateInitialTotals() {
    totalArticles = 0;
    totalCode = 0;
    totalBooks = 0;

    const allItems = document.querySelectorAll(".analytics-carousel-card");

    allItems.forEach((item) => {
        const cat = item.getAttribute("data-category");

        if (cat === "code") {
            totalCode++;
            totalArticles++;
        }

        if (cat === "article" || cat === "book-article") {
            totalArticles++;
        }

        if (cat === "book") {
            totalBooks++;
        }
    });
}

const carouselSpinner = document.getElementById("analytics-carousel-spinner");
const playPauseBtn = document.getElementById("playPauseBtn");
const cards = document.querySelectorAll(".analytics-carousel-card");

function updateCarouselLayout() {
    const visibleCards = Array.from(cards).filter(
        (card) => card.style.opacity !== "0" && card.style.display !== "none",
    );
    const visibleCount = visibleCards.length;
    if (visibleCount === 0) return;

    const isMobile = window.innerWidth <= 600;

    const radiusMultiplier = isMobile ? 26 : 35;
    const newRadius = visibleCount * radiusMultiplier;

    const angle = 360 / visibleCount;

    visibleCards.forEach((card, index) => {
        const rotationAngle = angle * index;
        card.style.transform = `rotateY(${rotationAngle}deg) translateZ(${newRadius}px)`;
    });
}

function updateOrbitLayout() {
    const orbitRings = document.querySelectorAll(".analytics-orbit-ring");

    orbitRings.forEach((ring) => {
        const allPlanets = Array.from(ring.querySelectorAll(".planet"));

        const totalCount = allPlanets.length;
        if (totalCount === 0) return;

        const angle = 360 / totalCount;

        allPlanets.forEach((planet, index) => {
            const rotationAngle = angle * index;

            const angleRad = rotationAngle * (Math.PI / 180);

            const x = 50 + 50 * Math.cos(angleRad);
            const y = 50 + 50 * Math.sin(angleRad);

            planet.style.position = "absolute";
            planet.style.left = `${x}%`;
            planet.style.top = `${y}%`;
            planet.style.transform = "translate(-50%, -50%)";
        });
    });
}

function setupTopScrollbar() {
    const tableContainer = document.querySelector(
        "#view-matrix .matrix-table-container",
    );
    const topScrollbarContainer = document.getElementById(
        "matrix-top-scrollbar-container",
    );
    const topScrollbarContent = document.getElementById(
        "matrix-top-scrollbar-content",
    );
    const matrixView = document.getElementById("view-matrix");

    if (
        !tableContainer ||
        !topScrollbarContainer ||
        !topScrollbarContent ||
        !matrixView
    ) {
        return;
    }

    const updateWidth = () => {
        topScrollbarContent.style.width = tableContainer.scrollWidth + "px";
    };

    updateWidth();
    const resizeObserver = new ResizeObserver(() => updateWidth());
    resizeObserver.observe(tableContainer);

    const matrixBtn = document.getElementById("btn-matrix");
    if (matrixBtn) {
        matrixBtn.addEventListener("click", () => setTimeout(updateWidth, 50));
    }

    let isSyncingTop = false;
    let isSyncingTable = false;

    const getMaxScroll = (el) => el.scrollWidth - el.clientWidth;

    topScrollbarContainer.addEventListener("scroll", function () {
        if (isSyncingTable) return;
        isSyncingTop = true;

        const topMax = getMaxScroll(topScrollbarContainer);
        const tableMax = getMaxScroll(tableContainer);

        if (topMax > 0 && tableMax > 0) {
            const percentage = topScrollbarContainer.scrollLeft / topMax;

            tableContainer.scrollLeft = percentage * tableMax;
        }

        setTimeout(() => (isSyncingTop = false), 50);
    });

    let mobileScrollTimeout;

    tableContainer.addEventListener("scroll", function () {
        if (isSyncingTop) return;
        isSyncingTable = true;

        const topMax = getMaxScroll(topScrollbarContainer);
        const tableMax = getMaxScroll(tableContainer);

        if (topMax > 0 && tableMax > 0) {
            const percentage = tableContainer.scrollLeft / tableMax;
            topScrollbarContainer.scrollLeft = percentage * topMax;
        }

        if (window.innerWidth <= 768) {
            topScrollbarContainer.classList.add("is-scrolling");
        }

        setTimeout(() => (isSyncingTable = false), 50);
    });

    topScrollbarContainer.addEventListener("mouseenter", () => {
        matrixView.classList.add("top-bar-active");
    });

    topScrollbarContainer.addEventListener("mouseleave", () => {
        matrixView.classList.remove("top-bar-active");
    });
}

function setupMobileSlider() {
    const tableContainer = document.querySelector(
        "#view-matrix .matrix-table-container",
    );
    const slider = document.getElementById("matrix-mobile-table-slider");

    if (!tableContainer || !slider) return;

    const updateSliderRange = () => {
        const maxScroll = tableContainer.scrollWidth - tableContainer.clientWidth;

        if (maxScroll <= 0) {
            slider.style.display = "none";
        } else {
            if (window.getComputedStyle(slider).display !== "none") {
                slider.max = maxScroll;
            }
        }
    };

    slider.addEventListener("input", () => {
        tableContainer.scrollLeft = slider.value;
    });

    tableContainer.addEventListener("scroll", () => {
        slider.value = tableContainer.scrollLeft;
    });

    updateSliderRange();
    window.addEventListener("resize", updateSliderRange);

    const matrixBtn = document.getElementById("btn-matrix");
    if (matrixBtn) {
        matrixBtn.addEventListener("click", () =>
            setTimeout(updateSliderRange, 100),
        );
    }
}

const slider = document.getElementById("gallery-size-slider");
const root = document.documentElement;
function updateSliderLogic() {
    if (!slider) return;
    const val = parseInt(slider.value);
    const min = parseInt(slider.min);
    const max = parseInt(slider.max);
    root.style.setProperty("--grid-item-size", val + "px");
    const percent = (val - min) / (max - min);
    const scale = 0.8 + percent * 0.7;
    root.style.setProperty("--thumb-scale", scale);
}
if (slider) {
    updateSliderLogic();
    slider.addEventListener("input", updateSliderLogic);

    let lastWidth = window.innerWidth;

    function adjustSliderRange() {
        const slider = document.getElementById("gallery-size-slider");
        if (!slider) return;

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

    const tempWidth = lastWidth;
    lastWidth = 0;
    adjustSliderRange();
    lastWidth = tempWidth;

    window.addEventListener("resize", adjustSliderRange);

    const galleryFullscreenBtn = document.getElementById(
        "gallery-open-fullscreen-btn",
    );
    if (galleryFullscreenBtn) {
        galleryFullscreenBtn.addEventListener("click", (e) => {
            if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return;

            e.preventDefault();
            const grid = document.getElementById("gallery-grid");
            if (!grid) return;

            let firstVisibleItem = null;

            if (grid.classList.contains("gallery-updates-mode")) {
                firstVisibleItem = grid.querySelector(
                    '.gallery-item.gallery-update-card:not([style*="display: none"])',
                );
            } else if (grid.classList.contains("gallery-stats-mode")) {
                firstVisibleItem = grid.querySelector(
                    '.gallery-item.gallery-stats-card:not([style*="display: none"])',
                );
            } else {
                firstVisibleItem = grid.querySelector(
                    '.gallery-item:not(.gallery-stats-card):not(.gallery-update-card):not([style*="display: none"])',
                );
            }

            if (firstVisibleItem) {
                const triggerImage = firstVisibleItem.querySelector(".gallery-img");
                if (triggerImage) {
                    openLightbox(triggerImage);
                }
            } else {
                console.log("No visible items in the current gallery view to open.");
            }
        });
    }
}

document.addEventListener("DOMContentLoaded", function () {
    if (typeof calculateInitialTotals === "function") calculateInitialTotals();
    if (typeof buildSearchIndex === "function") buildSearchIndex();

    if (typeof initMainLogic === "function") initMainLogic();

    if (typeof updateSliderLogic === "function") updateSliderLogic();
    if (typeof setupMobileSlider === "function") setupMobileSlider();
    if (typeof setupTopScrollbar === "function") setupTopScrollbar();

    if (typeof distributePlanetsRandomly === "function")
        distributePlanetsRandomly();
    if (typeof updateCarouselLayout === "function") updateCarouselLayout();
    if (typeof updateOrbitLayout === "function") updateOrbitLayout();

    const bioBtn = document.getElementById("bio-section-trigger");
    const bioContent = document.getElementById("bio-content-wrapper");

    if (
        window.innerWidth <= 768 &&
        bioBtn &&
        bioContent &&
        !sessionStorage.getItem("bioState")
    ) {
        bioBtn.classList.remove("card-expanded");
        bioContent.classList.remove("card-expanded");
        bioContent.classList.add("collapsed");
        bioBtn.setAttribute("data-tooltip", "Show Profile Details");
    }

    const searchTrigger = document.getElementById("global-search-trigger");
    const searchInput = document.getElementById("global-search-input");
    if (searchTrigger) searchTrigger.onclick = openSearch;
    if (searchInput) searchInput.onkeyup = handleSearchInput;

    if (typeof window.animateCarousel === "function") window.animateCarousel();

    const mobileSearchInput = document.getElementById("mobile-menu-search");
    if (mobileSearchInput) {
        mobileSearchInput.addEventListener("focus", function () {
            if (typeof toggleMobileMenu === "function") toggleMobileMenu();
            if (typeof openSearch === "function") openSearch();
            this.value = "";
        });
    }

    setTimeout(() => {
        if (typeof triggerLogoWink === "function") triggerLogoWink();

        if (typeof flashNavHoverEffect === "function") {
            flashNavHoverEffect(".card-internal-nav .card-nav-pill", 800);
        }
    }, 700);
});

window.toggleMobileMenu = function (btn = null) {
    const menu = document.getElementById("mobile-menu-overlay");
    if (!menu) return;

    if (btn) {
        if (typeof killTooltip === "function") killTooltip(btn);
        if (typeof toggleRadialMenu === "function")
            toggleRadialMenu("settings-dock");
    }

    const isActive = menu.classList.toggle("active");

    if (isActive) {
        document.body.style.overflow = "hidden";
        setTimeout(() => {
            const input = document.getElementById("mobile-menu-search");
            if (input) input.focus();
        }, 300);
    } else {
        document.body.style.overflow = "";
    }
};

window.toggleMobileSubmenu = function (headerElement) {
    const parent = headerElement.parentElement;

    parent.classList.toggle("open");
};

window.mobileJump = function (targetId) {
    toggleMobileMenu();

    switchView("card");
    setTimeout(() => {
        jumpToCard(targetId);
    }, 100);
};

window.toggleLeftDock = function (btn = null) {
    if (typeof killTooltip === "function" && btn) killTooltip(btn);
    const firstDockBtn = document.querySelector(".dock-expand-btn");
    if (firstDockBtn) {
        const isNowOpen = firstDockBtn.classList.toggle("menu-open");
        firstDockBtn.classList.toggle("view-active", !isNowOpen);

        if (btn) btn.classList.toggle("active", isNowOpen);
    }
};

window.toggleMobileMenu = function (btn = null) {
    if (typeof killTooltip === "function" && btn) killTooltip(btn);
    const menu = document.getElementById("mobile-menu-overlay");
    if (menu) {
        const isActive = menu.classList.toggle("active");
        document.body.style.overflow = isActive ? "hidden" : "";

        if (btn) btn.classList.toggle("active", isActive);
    }
};

window.handleGlobalMenu = function (btn) {
    if (window.innerWidth > 768) {
        toggleLeftDock(btn);
    } else {
        toggleMobileMenu(btn);
    }
};
