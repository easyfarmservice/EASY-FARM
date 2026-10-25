/* ========================================
   EASY FARM — INTERACTIVE JAVASCRIPT
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {

    // === MOBILE MENU TOGGLE ===
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const mobileNav = document.querySelector('.mobile-nav');
    let menuOpen = false;

    if (mobileMenuBtn && mobileNav) {
        mobileMenuBtn.addEventListener('click', () => {
            menuOpen = !menuOpen;
            mobileNav.classList.toggle('active', menuOpen);
            
            // Animate hamburger
            const spans = mobileMenuBtn.querySelectorAll('span');
            if (menuOpen) {
                spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });

        // Close mobile menu on link click
        mobileNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                menuOpen = false;
                mobileNav.classList.remove('active');
                const spans = mobileMenuBtn.querySelectorAll('span');
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            });
        });
    }


    // === SCROLL ANIMATIONS (Intersection Observer) ===
    const animateElements = () => {
        const elements = document.querySelectorAll(
            '.step-card, .basket-card, .testimonial-card, .transparency-grid, .section-header, .hero-text, .hero-visual, .qr-verification, .highlight-stat'
        );

        elements.forEach(el => {
            el.classList.add('animate-on-scroll');
        });

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry, index) => {
                    if (entry.isIntersecting) {
                        // Stagger animation for grid items
                        const siblings = entry.target.parentElement.querySelectorAll('.animate-on-scroll');
                        let delay = 0;
                        siblings.forEach((sibling, i) => {
                            if (sibling === entry.target) {
                                delay = i * 100;
                            }
                        });

                        setTimeout(() => {
                            entry.target.classList.add('visible');
                        }, delay);

                        observer.unobserve(entry.target);
                    }
                });
            },
            {
                threshold: 0.15,
                rootMargin: '0px 0px -40px 0px'
            }
        );

        elements.forEach(el => observer.observe(el));
    };

    animateElements();


    // === ACTIVE NAV LINK HIGHLIGHT ===
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a');

    const highlightNav = () => {
        const scrollY = window.scrollY;

        sections.forEach(section => {
            const sectionTop = section.offsetTop - 120;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    };

    window.addEventListener('scroll', highlightNav, { passive: true });


    // === SMOOTH SCROLL FOR ANCHOR LINKS ===
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;

            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = target.offsetTop - headerHeight - 20;

                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });


    // === HEADER SHADOW ON SCROLL ===
    const header = document.querySelector('.header');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;

        if (currentScroll > 10) {
            header.style.boxShadow = '0 2px 20px rgba(0,0,0,0.06)';
        } else {
            header.style.boxShadow = 'none';
        }

        lastScroll = currentScroll;
    }, { passive: true });


    // === CART COUNTER (Demo) ===
    const cartBadge = document.querySelector('.cart-badge');
    const orderButtons = document.querySelectorAll('.basket-info .btn');

    orderButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            let count = parseInt(cartBadge.textContent) || 0;
            count++;
            cartBadge.textContent = count;
            
            // Quick animation
            cartBadge.style.transform = 'scale(1.4)';
            setTimeout(() => {
                cartBadge.style.transform = 'scale(1)';
            }, 200);

            // Button feedback
            const originalText = btn.textContent;
            btn.textContent = '✓ Added!';
            btn.style.background = '#40916C';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
            }, 1500);
        });
    });


    // === PARALLAX FLOATING CARDS (subtle) ===
    const floatCards = document.querySelectorAll('.float-card');

    if (window.matchMedia('(min-width: 768px)').matches) {
        window.addEventListener('mousemove', (e) => {
            const x = (e.clientX / window.innerWidth - 0.5) * 2;
            const y = (e.clientY / window.innerHeight - 0.5) * 2;

            floatCards.forEach((card, index) => {
                const speed = (index + 1) * 3;
                const moveX = x * speed;
                const moveY = y * speed;
                card.style.transform = `translate(${moveX}px, ${moveY}px)`;
            });
        });
    }

});
