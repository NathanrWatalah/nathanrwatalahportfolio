// ===== MOBILE MENU TOGGLE =====
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');
const navLinks = document.querySelectorAll('.nav-link');

hamburger.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    hamburger.classList.toggle('active');
});

// Close menu when a link is clicked
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
    });
});
window.addEventListener('scroll', () => {
    let current = '';

    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        const sectionTop = section.offsetTop - 150; // adjust for navbar height
        const sectionHeight = section.offsetHeight;
        if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').slice(1) === current) {
            link.classList.add('active');
        }
    });
});

// ===== SMOOTH SCROLLING FOR NAVIGATION LINKS =====
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// ===== FETCH GITHUB REPO STATS =====
async function fetchRepoStats(repoName, elementId) {
    try {
        const response = await fetch(`https://api.github.com/repos/NathanrWatalah/${repoName}`);
        if (response.ok) {
            const data = await response.json();
            document.getElementById(`stars-${elementId}`).textContent = data.stargazers_count;
            document.getElementById(`forks-${elementId}`).textContent = data.forks_count;
        }
    } catch (error) {
        console.log(`Could not fetch stats for ${repoName}`);
        document.getElementById(`stars-${elementId}`).textContent = '0';
        document.getElementById(`forks-${elementId}`).textContent = '0';
    }
}

// ===== CONTACT FORM HANDLING =====
const contactForm = document.getElementById('contactForm');
const formMessage = document.getElementById('formMessage');

if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const subject = document.getElementById('subject').value.trim();
        const message = document.getElementById('message').value.trim();

        // Simple form validation
        if (!name || !email || !subject || !message) {
            e.preventDefault();
            showMessage('Please fill in all fields', 'error');
            return false;
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            e.preventDefault();
            showMessage('Please enter a valid email address', 'error');
            return false;
        }

        // Show loading message
        showMessage('Sending your message...', 'info');
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
document.addEventListener("DOMContentLoaded", () => {

    const skillsSection = document.querySelector(".skills");
    const skillItems = document.querySelectorAll(".skill-item");

    let animated = false; // prevent multiple animations

    function animateSkills() {
        if (animated) return;

        const sectionTop = skillsSection.getBoundingClientRect().top;
        const triggerPoint = window.innerHeight - 100;

        if (sectionTop < triggerPoint) {

            skillItems.forEach(skill => {
                const progress = skill.querySelector(".skill-progress");
                const percentageBox = skill.querySelector(".skill-percentage");

                if (!progress || !percentageBox) return;

                const target = parseInt(progress.getAttribute("data-width"), 10);
                if (!target) return;

                progress.style.width = target + "%";

                let count = 0;
                const speed = Math.max(5, Math.floor(1200 / target));

                const counter = setInterval(() => {
                    count++;
                    percentageBox.textContent = count + "%";

                    if (count >= target) {
                        clearInterval(counter);
                    }
                }, speed);
            });

            animated = true; // run once only
        }
    }

    window.addEventListener("scroll", animateSkills);
});


// ===== TOOLS SECTION ANIMATION =====
const toolGroups = document.querySelectorAll('.tool-group');

const toolObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            entry.target.style.animation = `slideInUp 0.6s ease forwards`;
            entry.target.style.animationDelay = `${index * 0.1}s`;
            toolObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.2
});

toolGroups.forEach((group) => {
    group.style.opacity = '0';
    toolObserver.observe(group);
});

// ===== EDUCATION SECTION ANIMATION (UPDATED) =====
const educationCards = document.querySelectorAll('.education-card');

if (educationCards.length > 0) {

    const educationObserver = new IntersectionObserver((entries) => {

        entries.forEach((entry, index) => {

            if (entry.isIntersecting) {

                setTimeout(() => {
                    entry.target.style.opacity = '1';
                    entry.target.style.transform = 'translateY(0)';
                }, index * 150);

                educationObserver.unobserve(entry.target);
            }

        });

    }, {
        threshold: 0.2
    });

    educationCards.forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(40px)';
        card.style.transition = 'all 0.6s ease';
        educationObserver.observe(card);
    });
}


// ===== STAT CARDS ANIMATION =====
const statCards = document.querySelectorAll('.stat-card');

const statObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.animation = 'slideInLeft 0.6s ease forwards';
            statObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.1
});

statCards.forEach((card) => {
    card.style.opacity = '0';
    statObserver.observe(card);
});

// ===== PROJECT CARDS ANIMATION =====
const projectCards = document.querySelectorAll('.project-card');

const projectObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            entry.target.style.animation = `slideInUp 0.6s ease forwards`;
            entry.target.style.animationDelay = `${index * 0.1}s`;
            projectObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.1
});

projectCards.forEach((card) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(40px)';
    card.style.transition = 'all 0.6s ease';
    projectObserver.observe(card);
});


// ===== INITIALIZE ON PAGE LOAD =====
document.addEventListener('DOMContentLoaded', () => {
    // Fetch GitHub repository stats
    fetchRepoStats('Bike-Sales-Performances-Analysis-in-microsoft-Excel', '1');
    fetchRepoStats('retail-sales-tableau-dashboard', '2');
    fetchRepoStats('Network-Configuration', '3');
    fetchRepoStats('Database-Design', '4');
    fetchRepoStats('Portfolio-Website', '5');
    fetchRepoStats('Python-Projects', '6');

    // Animate hero section on load
    const heroTitle = document.querySelector('.hero-title');
    if (heroTitle) {
        heroTitle.style.animation = 'slideInLeft 0.8s ease';
    }
});

// ===== PAGE LOAD COMPLETE =====
window.addEventListener('load', () => {
    document.body.style.opacity = '1';
});

// ===== CONSOLE MESSAGE =====
console.log('Portfolio website loaded successfully!');