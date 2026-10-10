// ===== MOBILE MENU TOGGLE =====
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-link');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function setMobileMenuOpen(isOpen) {
    if (!hamburger || !navMenu) {
        return;
    }

    navMenu.classList.toggle('active', isOpen);
    hamburger.classList.toggle('active', isOpen);
    hamburger.setAttribute('aria-expanded', String(isOpen));
    hamburger.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
}

hamburger?.addEventListener('click', () => {
    setMobileMenuOpen(hamburger.getAttribute('aria-expanded') !== 'true');
});

navLinks.forEach(link => {
    link.addEventListener('click', () => {
        setMobileMenuOpen(false);
    });
});

document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && navMenu?.classList.contains('active')) {
        setMobileMenuOpen(false);
        hamburger?.focus();
    }
});

// ===== ACTIVE SECTION AND SCROLL CONTROLS =====
const scrollProgress = document.querySelector('.scroll-progress');
const scrollProgressBar = scrollProgress?.querySelector('span');
const backToTopButton = document.querySelector('.back-to-top');
const sectionLinks = Array.from(navLinks)
    .filter(link => link.getAttribute('href')?.startsWith('#'))
    .map(link => ({
        link,
        section: document.querySelector(link.getAttribute('href'))
    }))
    .filter(item => item.section);
let scrollUpdateScheduled = false;

function updateScrollControls() {
    const scrollableHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollableHeight > 0 ? Math.round((window.scrollY / scrollableHeight) * 100) : 0;

    if (scrollProgress && scrollProgressBar) {
        scrollProgress.setAttribute('aria-valuenow', String(progress));
        scrollProgressBar.style.transform = `scaleX(${progress / 100})`;
    }

    backToTopButton?.classList.toggle('is-visible', window.scrollY > 450);

    const activeSection = [...sectionLinks].reverse().find(({ section }) =>
        section.getBoundingClientRect().top <= 150
    );

    sectionLinks.forEach(({ link, section }) => {
        const isActive = activeSection?.section === section;
        link.classList.toggle('active', isActive);
        if (isActive) {
            link.setAttribute('aria-current', 'location');
        } else {
            link.removeAttribute('aria-current');
        }
    });
}

window.addEventListener('scroll', () => {
    if (!scrollUpdateScheduled) {
        window.requestAnimationFrame(() => {
            updateScrollControls();
            scrollUpdateScheduled = false;
        });
        scrollUpdateScheduled = true;
    }
}, { passive: true });

updateScrollControls();

backToTopButton?.addEventListener('click', () => {
    window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion ? 'auto' : 'smooth'
    });
});

// ===== SMOOTH SCROLLING FOR NAVIGATION LINKS =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: prefersReducedMotion ? 'auto' : 'smooth',
                block: 'start'
            });
        }
    });
});

// ===== PROJECT CATEGORY FILTERS =====
const projectFilters = document.querySelectorAll('.project-filter');
const projectCards = document.querySelectorAll('#projects .project-card[data-category]');
const projectFilterStatus = document.querySelector('.project-filter-status');
const projectSearchInput = document.getElementById('projectSearch');
const projectEmptyState = document.querySelector('.project-empty-state');
const featuredProjectsGrid = document.querySelector('[data-project-group="featured"]');
const moreProjectsGrid = document.querySelector('[data-project-group="more"]');
const moreProjectsTitle = document.querySelector('[data-project-group="more-title"]');

projectCards.forEach(card => {
    const content = card.querySelector('.project-content');
    const description = content?.querySelector('.project-description');
    const technologies = content?.querySelector('.project-tech');

    if (!content || !description || !technologies) {
        return;
    }

    const details = document.createElement('details');
    details.className = 'project-details';

    const summary = document.createElement('summary');
    summary.textContent = 'Explore project details';

    const overviewTitle = document.createElement('h4');
    overviewTitle.textContent = 'Project overview';

    const toolsTitle = document.createElement('h4');
    toolsTitle.textContent = 'Tools used';

    const detailsContent = document.createElement('div');
    detailsContent.className = 'project-details-content';
    detailsContent.append(overviewTitle, description, toolsTitle, technologies);
    details.append(summary, detailsContent);
    content.append(details);
});

function updateProjectResults() {
    const activeFilter = document.querySelector('.project-filter.active');
    const category = activeFilter?.getAttribute('data-filter') ?? 'all';
    const searchTerm = projectSearchInput?.value.trim().toLocaleLowerCase() ?? '';
    let visibleCount = 0;

    projectCards.forEach(card => {
        const matchesCategory = category === 'all' || card.getAttribute('data-category') === category;
        const matchesSearch = !searchTerm || card.textContent.toLocaleLowerCase().includes(searchTerm);
        const isVisible = matchesCategory && matchesSearch;
        card.hidden = !isVisible;
        visibleCount += Number(isVisible);
    });

    [featuredProjectsGrid, moreProjectsGrid].forEach(grid => {
        if (grid) {
            grid.hidden = !grid.querySelector('.project-card:not([hidden])');
        }
    });
    if (moreProjectsTitle && moreProjectsGrid) {
        moreProjectsTitle.hidden = moreProjectsGrid.hidden;
    }
    if (projectEmptyState) {
        projectEmptyState.hidden = visibleCount !== 0;
    }
    if (projectFilterStatus) {
        if (searchTerm) {
            projectFilterStatus.textContent = `Found ${visibleCount} matching project${visibleCount === 1 ? '' : 's'}`;
        } else {
            projectFilterStatus.textContent = category === 'all'
                ? `Showing all ${visibleCount} projects`
                : `Showing ${visibleCount} project${visibleCount === 1 ? '' : 's'} in ${activeFilter.textContent.trim()}`;
        }
    }
}

projectFilters.forEach(filter => {
    filter.addEventListener('click', () => {
        projectFilters.forEach(button => {
            const isActive = button === filter;
            button.classList.toggle('active', isActive);
            button.setAttribute('aria-pressed', String(isActive));
        });
        updateProjectResults();
    });
});

projectSearchInput?.addEventListener('input', updateProjectResults);

// ===== CONTACT FORM HANDLING =====
const contactForm = document.getElementById('contactForm');
const formMessage = document.getElementById('formMessage');

if (contactForm) {
    contactForm.addEventListener('submit', async event => {
        event.preventDefault();

        const requiredFields = ['name', 'email', 'subject', 'message']
            .map(id => document.getElementById(id))
            .filter(field => field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement);
        const hasEmptyField = requiredFields.some(field => {
            const isEmpty = !field.value.trim();
            field.setCustomValidity(isEmpty ? 'Please complete this field.' : '');
            return isEmpty;
        });

        if (hasEmptyField || !contactForm.reportValidity()) {
            showMessage('Please check the required fields and try again.', 'error');
            return;
        }

        const submitButton = contactForm.querySelector('button[type="submit"]');
        if (!(submitButton instanceof HTMLButtonElement)) {
            console.error('Contact form submit button is unavailable.');
            showMessage('The form could not be submitted. Please email me directly.', 'error');
            return;
        }

        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
        showMessage('Sending your message...', 'info');

        try {
            const response = await fetch(contactForm.action, {
                method: 'POST',
                body: new FormData(contactForm),
                headers: { Accept: 'application/json' }
            });

            if (!response.ok) {
                showMessage(`Your message could not be sent (error ${response.status}). Please try again or email me directly.`, 'error');
                return;
            }

            contactForm.reset();
            showMessage('Thanks for reaching out. Your message has been sent.', 'success');
        } catch (error) {
            console.error('Contact form network request failed:', error);
            showMessage('A network error prevented your message from being sent. Please try again or email me directly.', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = originalButtonText;
        }
    });
}

function showMessage(message, type) {
    formMessage.textContent = message;
    formMessage.className = `form-message ${type}`;

    // Clear message after 5 seconds (unless it's an error)
    if (type !== 'error') {
        setTimeout(() => {
            formMessage.textContent = '';
            formMessage.className = 'form-message';
        }, 5000);
    }
}
// ===== SCROLL REVEAL ANIMATIONS =====
const revealTargets = document.querySelectorAll(
    '.hero-text, .hero-image, .about-text, .stat-card, .education-card, .skill-category, .tool-group, .project-card, .contact-wrapper > *'
);

if ('IntersectionObserver' in window && !prefersReducedMotion) {
    document.body.classList.add('motion-ready');

    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.12,
        rootMargin: '0px 0px -35px 0px'
    });

    revealTargets.forEach((target, index) => {
        target.classList.add('reveal');
        target.style.setProperty('--reveal-delay', `${(index % 4) * 80}ms`);
        revealObserver.observe(target);
    });
}


// ===== INITIALIZE ON PAGE LOAD =====
document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('.hero-text')?.classList.add('is-visible');
});

// ===== PAGE LOAD COMPLETE =====
window.addEventListener('load', () => {
    document.body.style.opacity = '1';
});

// ===== CONSOLE MESSAGE =====
console.log('Portfolio website loaded successfully!');
