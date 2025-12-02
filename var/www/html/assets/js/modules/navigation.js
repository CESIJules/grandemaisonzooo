import { smoothScrollTo } from './utils.js';

export class Navigation {
    constructor() {
        this.mainContainer = document.querySelector('main');
        this.sections = document.querySelectorAll('section');
        this.currentSectionIndex = 0;
        this.isNavigating = false;
        this.timelineContainer = document.querySelector('.timeline-container');
        this.timelineTargetScroll = 0;
        this.isAnimatingTimeline = false;
        this.scrollArrow = document.getElementById('scrollArrow');
        
        // Burger Menu Elements
        this.menu = document.getElementById('menu');
        this.burgerBtn = document.getElementById('burgerBtn');
        this.menuCloseBtn = document.getElementById('menuCloseBtn');
        this.menuItems = document.querySelectorAll('.menu-item');
        this.menuLinks = document.querySelectorAll('.menu-link');
        
        // Line Animation Elements
        this.lineV4 = document.querySelector('.line-v4');
        this.lineV5 = document.querySelector('.line-v5');
        this.lineH1 = document.querySelector('.line-h1');
        this.lineH2 = document.querySelector('.line-h2');
        this.allLines = document.querySelectorAll('.line-v, .line-h');

        this.LINE_POSITIONS = {
            H1_PERCENT: 0.30,
            H2_PERCENT: 0.70,
            V4_PERCENT: 0.596,
            V5_PERCENT: 0.788,
            HORIZONTAL_OFFSET: 10,
            V4_OFFSET: 30,
            V5_OFFSET: 0
        };

        this.init();
    }

    init() {
        this.setMainHeight();
        window.addEventListener('resize', () => {
            this.setMainHeight();
            this.handleResize();
        });
        window.addEventListener('orientationchange', () => this.setMainHeight());

        this.initBurgerMenu();
        this.initScrollArrow();
        this.initWheelHandler();
        this.initTouchHandler();
        this.initAnchorLinks();
        
        // Initial checks
        this.updateCurrentSectionIndex();
        this.updateScrollArrowVisibility();
    }

    setMainHeight() {
        const vh = window.innerHeight;
        document.documentElement.style.height = `${vh}px`;
        document.body.style.height = `${vh}px`;
        if (this.mainContainer) {
            this.mainContainer.style.height = `${vh}px`;
        }
    }

    initBurgerMenu() {
        if (this.burgerBtn && this.menu) {
            this.burgerBtn.addEventListener('click', () => this.toggleMenu());

            if (this.menuCloseBtn) {
                this.menuCloseBtn.addEventListener('click', () => this.closeMenu());
            }

            this.menuLinks.forEach(link => {
                link.addEventListener('click', () => this.closeMenu());
            });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.menu.classList.contains('open')) {
                    this.closeMenu();
                }
            });

            let resetTimeout;
            this.menuItems.forEach(item => {
                item.addEventListener('mouseenter', () => {
                    if (resetTimeout) {
                        clearTimeout(resetTimeout);
                        resetTimeout = null;
                    }
                    this.animateLinesForItem(item);
                });

                item.addEventListener('mouseleave', () => {
                    resetTimeout = setTimeout(() => {
                        this.resetLines();
                    }, 100);
                });
            });
        }
    }

    openMenu() {
        this.menu.classList.add('open');
        this.menu.setAttribute('aria-hidden', 'false');
        document.body.classList.add('menu-open');
        this.burgerBtn.style.display = 'none';
    }

    closeMenu() {
        this.menu.classList.remove('open');
        this.menu.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('menu-open');
        this.burgerBtn.style.display = 'flex';
        this.resetLines();
    }

    toggleMenu() {
        if (this.menu.classList.contains('open')) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    resetLines() {
        this.allLines.forEach(line => {
            line.style.transform = '';
            line.classList.remove('active');
        });
    }

    animateLinesForItem(item) {
        if (!item) {
            this.resetLines();
            return;
        }

        const rect = item.getBoundingClientRect();
        const link = item.querySelector('.menu-link');
        const number = item.querySelector('.menu-number');

        const linkRect = link ? link.getBoundingClientRect() : rect;
        const numberRect = number ? number.getBoundingClientRect() : rect;

        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        const h1Original = viewportHeight * this.LINE_POSITIONS.H1_PERCENT;
        const h2Original = viewportHeight * this.LINE_POSITIONS.H2_PERCENT;

        const h1Target = linkRect.top - this.LINE_POSITIONS.HORIZONTAL_OFFSET;
        const h2Target = linkRect.bottom + this.LINE_POSITIONS.HORIZONTAL_OFFSET;

        const h1Translation = h1Target - h1Original;
        const h2Translation = h2Target - h2Original;

        if (this.lineH1) {
            this.lineH1.style.transform = `translateY(${h1Translation}px)`;
            this.lineH1.classList.add('active');
        }
        if (this.lineH2) {
            this.lineH2.style.transform = `translateY(${h2Translation}px)`;
            this.lineH2.classList.add('active');
        }

        if (this.lineV4) {
            const v4Original = viewportWidth * this.LINE_POSITIONS.V4_PERCENT;
            const v4Target = linkRect.left - this.LINE_POSITIONS.V4_OFFSET;
            const v4Translation = v4Target - v4Original;
            this.lineV4.style.transform = `translateX(${v4Translation}px)`;
            this.lineV4.classList.add('active');
        }

        if (this.lineV5) {
            const v5Original = viewportWidth * this.LINE_POSITIONS.V5_PERCENT;
            const v5Target = numberRect.left + (numberRect.width / 2) + this.LINE_POSITIONS.V5_OFFSET;
            const v5Translation = v5Target - v5Original;
            this.lineV5.style.transform = `translateX(${v5Translation}px)`;
            this.lineV5.classList.add('active');
        }
    }

    scrollToSection(index) {
        if (index < 0 || index >= this.sections.length) return;

        const targetSection = this.sections[index];
        if (targetSection && targetSection.id === 'timeline' && this.timelineContainer) {
            if (index > this.currentSectionIndex) {
                const maxScroll = this.timelineContainer.scrollWidth - this.timelineContainer.clientWidth;
                this.timelineContainer.scrollLeft = maxScroll;
                this.timelineTargetScroll = maxScroll;
            } else if (index < this.currentSectionIndex) {
                this.timelineContainer.scrollLeft = 0;
                this.timelineTargetScroll = 0;
            }
        }

        this.isNavigating = true;
        const target = this.sections[index].offsetTop;

        smoothScrollTo(this.mainContainer, target, 1000, () => {
            this.isNavigating = false;
            this.currentSectionIndex = index;
            this.updateScrollArrowVisibility();
            
            // Dispatch event for other modules
            window.dispatchEvent(new CustomEvent('sectionChanged', { detail: { index: index, section: targetSection } }));
        });
    }

    updateCurrentSectionIndex() {
        let minDistance = Infinity;
        this.sections.forEach((section, index) => {
            const rect = section.getBoundingClientRect();
            if (Math.abs(rect.top) < minDistance) {
                minDistance = Math.abs(rect.top);
                this.currentSectionIndex = index;
            }
        });
    }

    handleResize() {
        let resizeTimer;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            let closestSectionIndex = 0;
            let minDistance = Infinity;

            this.sections.forEach((section, index) => {
                const rect = section.getBoundingClientRect();
                const distance = Math.abs(rect.top);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestSectionIndex = index;
                }
            });

            if (this.mainContainer) {
                this.mainContainer.scrollTop = this.sections[closestSectionIndex].offsetTop;
            }
            this.currentSectionIndex = closestSectionIndex;
        }, 250);
    }

    initScrollArrow() {
        if (this.scrollArrow) {
            this.scrollArrow.addEventListener('click', () => {
                if (this.isNavigating) return;
                if (this.currentSectionIndex < this.sections.length - 1) {
                    this.scrollToSection(this.currentSectionIndex + 1);
                }
            });
        }
    }

    updateScrollArrowVisibility() {
        if (!this.scrollArrow) return;
        if (this.currentSectionIndex >= this.sections.length - 1) {
            this.scrollArrow.classList.add('hidden');
        } else {
            this.scrollArrow.classList.remove('hidden');
        }
    }

    animateTimeline() {
        if (!this.timelineContainer) return;

        const currentScrollLeft = this.timelineContainer.scrollLeft;
        const diff = this.timelineTargetScroll - currentScrollLeft;

        if (Math.abs(diff) > 0.5) {
            this.timelineContainer.scrollLeft = currentScrollLeft + diff * 0.08;
            requestAnimationFrame(() => this.animateTimeline());
            this.isAnimatingTimeline = true;
        } else {
            this.timelineContainer.scrollLeft = this.timelineTargetScroll;
            this.isAnimatingTimeline = false;
        }
    }

    initWheelHandler() {
        window.addEventListener('wheel', (e) => {
            e.preventDefault();

            if (document.body.classList.contains('menu-open')) return;
            if (this.isNavigating) return;

            const direction = e.deltaY > 0 ? 1 : -1;
            const currentSection = this.sections[this.currentSectionIndex];

            if (currentSection && currentSection.id === 'timeline' && this.timelineContainer) {
                const maxScroll = this.timelineContainer.scrollWidth - this.timelineContainer.clientWidth;

                if (!this.isAnimatingTimeline) {
                    this.timelineTargetScroll = this.timelineContainer.scrollLeft;
                }

                const isAtEnd = this.timelineTargetScroll >= maxScroll - 1;
                const isAtStart = this.timelineTargetScroll <= 1;

                if (direction === 1 && isAtStart) {
                    if (this.currentSectionIndex < this.sections.length - 1) {
                        this.scrollToSection(this.currentSectionIndex + 1);
                    }
                    return;
                }

                if (direction === -1 && isAtEnd) {
                    if (this.currentSectionIndex > 0) {
                        this.scrollToSection(this.currentSectionIndex - 1);
                    }
                    return;
                }

                this.timelineTargetScroll -= e.deltaY * 2.5;
                this.timelineTargetScroll = Math.max(0, Math.min(this.timelineTargetScroll, maxScroll));

                if (!this.isAnimatingTimeline) {
                    requestAnimationFrame(() => this.animateTimeline());
                }

            } else {
                if (Math.abs(e.deltaY) > 10) {
                    const nextIndex = this.currentSectionIndex + direction;
                    if (nextIndex >= 0 && nextIndex < this.sections.length) {
                        this.scrollToSection(nextIndex);
                    }
                }
            }
        }, { passive: false });
    }

    initTouchHandler() {
        let touchStartY = 0;
        let touchStartX = 0;
        let isTouchTriggered = false;
        let touchDidStartOnTimeline = false;

        window.addEventListener('touchstart', (e) => {
            touchStartY = e.touches[0].clientY;
            touchStartX = e.touches[0].clientX;
            isTouchTriggered = false;
            touchDidStartOnTimeline = !!e.target.closest('.timeline-container');
        }, { passive: false });

        window.addEventListener('touchmove', (e) => {
            const touchY = e.touches[0].clientY;
            const touchX = e.touches[0].clientX;
            const deltaY = touchStartY - touchY;
            const deltaX = touchStartX - touchX;

            if (touchDidStartOnTimeline && Math.abs(deltaY) > Math.abs(deltaX)) {
                return;
            }

            e.preventDefault();

            if (this.isNavigating) return;

            if (Math.abs(deltaX) > Math.abs(deltaY)) {
                const currentSection = this.sections[this.currentSectionIndex];
                if (currentSection && currentSection.id === 'timeline' && this.timelineContainer) {
                    this.timelineContainer.scrollLeft += deltaX;
                    this.timelineTargetScroll = this.timelineContainer.scrollLeft;
                    touchStartX = touchX;
                }
            } else {
                if (!isTouchTriggered && Math.abs(deltaY) > 50) {
                    const direction = deltaY > 0 ? 1 : -1;
                    const nextIndex = this.currentSectionIndex + direction;

                    if (nextIndex >= 0 && nextIndex < this.sections.length) {
                        this.scrollToSection(nextIndex);
                        isTouchTriggered = true;
                    }
                }
            }
        }, { passive: false });
    }

    initAnchorLinks() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const targetId = anchor.getAttribute('href').substring(1);
                const targetSection = document.getElementById(targetId);
                if (targetSection) {
                    e.preventDefault();
                    const index = Array.from(this.sections).findIndex(s => s === targetSection);
                    if (index !== -1) {
                        this.scrollToSection(index);
                    }
                }
            });
        });
    }
}
