//  GALLERY FILTER FUNCTIONALITY  
const filterBtns = document.querySelectorAll('.filter-btn');
const galleryItems = document.querySelectorAll('.gallery-item');
const personalGalleryItems = document.querySelectorAll('.personal-gallery-item');

// Debounce function for performance optimization
function debounce(func, wait) {
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

// Enhanced filter functionality with smooth transitions
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        // Remove active class from all buttons
        filterBtns.forEach(b => b.classList.remove('active'));
        
        // Add active class to clicked button
        btn.classList.add('active');

        const filterValue = btn.getAttribute('data-filter');

        // Filter gallery items with staggered animation
        galleryItems.forEach((item, index) => {
            // Fade out all items first
            item.style.opacity = '0';
            item.style.transform = 'translateY(20px)';

            setTimeout(() => {
                if (filterValue === 'all' || item.getAttribute('data-category') === filterValue) {
                    item.style.display = 'block';
                    
                    // Staggered fade-in animation
                    setTimeout(() => {
                        item.style.opacity = '1';
                        item.style.transform = 'translateY(0)';
                    }, index * 50); // 50ms delay between each item
                } else {
                    item.style.display = 'none';
                }
            }, 300); // Wait for fade-out to complete
        });

        // Announce filter change to screen readers (accessibility)
        announceFilterChange(filterValue);
    });
});

// Accessibility: Announce filter changes to screen readers
function announceFilterChange(filter) {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', 'polite');
    announcement.className = 'sr-only';
    announcement.textContent = `Showing ${filter === 'all' ? 'all projects' : filter + ' projects'}`;
    document.body.appendChild(announcement);
    
    setTimeout(() => {
        document.body.removeChild(announcement);
    }, 1000);
}

// ===== GALLERY IMAGE LAZY LOADING 

const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            const src = img.getAttribute('data-src') || img.src;
            
            // Preload image before displaying
            const tempImg = new Image();
            tempImg.onload = () => {
                img.src = src;
                img.classList.add('loaded');
            };
            tempImg.src = src;
            
            imageObserver.unobserve(img);
        }
    });
}, {
    rootMargin: '50px'
});

// Observe all images in gallery
document.querySelectorAll('.gallery-item img, .personal-gallery-item img').forEach(img => {
    imageObserver.observe(img);
});

// ===== GALLERY ITEM SCROLL ANIMATION  =====
const allGalleryItems = [...galleryItems, ...personalGalleryItems];

// Set initial state for all items
allGalleryItems.forEach(item => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(40px)';
    item.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)'; // Smooth easing
});

// Enhanced Intersection Observer with better performance
const galleryObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            // Calculate delay based on position in viewport
            const delay = index * 100; // 100ms between items
            
            setTimeout(() => {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
                entry.target.classList.add('animated');
            }, delay);
            
            // Stop observing once animated
            galleryObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.15, // Trigger when 15% of item is visible
    rootMargin: '0px 0px -50px 0px' // Start animation slightly before item enters viewport
});

// Observe all gallery items
allGalleryItems.forEach(item => {
    galleryObserver.observe(item);
});

// ===== PERSONAL GALLERY ANIMATION (SEPARATE HANDLING) =====
const personalObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
            setTimeout(() => {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0) scale(1)';
                entry.target.classList.add('visible');
            }, index * 80);
            
            personalObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.1,
    rootMargin: '0px 0px -30px 0px'
});

personalGalleryItems.forEach(item => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(40px) scale(0.95)';
    item.style.transition = 'all 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)'; // Bounce effect
    personalObserver.observe(item);
});

// ===== GALLERY IMAGE MODAL/LIGHTBOX (NEW FEATURE) =====
let currentImageIndex = 0;
const allImages = document.querySelectorAll('.gallery-item img, .personal-gallery-item img');

// Create modal element
const createModal = () => {
    const modal = document.createElement('div');
    modal.className = 'image-modal';
    modal.innerHTML = `
        <div class="modal-overlay"></div>
        <div class="modal-content">
            <button class="modal-close" aria-label="Close modal">&times;</button>
            <button class="modal-prev" aria-label="Previous image">&#8249;</button>
            <button class="modal-next" aria-label="Next image">&#8250;</button>
            <img src="" alt="" class="modal-image">
            <div class="modal-caption"></div>
        </div>
    `;
    document.body.appendChild(modal);
    return modal;
};

// Add click handlers to gallery images
allImages.forEach((img, index) => {
    img.style.cursor = 'pointer';
    img.addEventListener('click', () => {
        openModal(index);
    });
});

function openModal(index) {
    currentImageIndex = index;
    let modal = document.querySelector('.image-modal');
    
    if (!modal) {
        modal = createModal();
        
        // Close button
        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        
        // Overlay click to close
        modal.querySelector('.modal-overlay').addEventListener('click', closeModal);
        
        // Navigation buttons
        modal.querySelector('.modal-prev').addEventListener('click', showPrevImage);
        modal.querySelector('.modal-next').addEventListener('click', showNextImage);
        
        // Keyboard navigation
        document.addEventListener('keydown', handleKeyboard);
    }
    
    updateModalImage();
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeModal() {
    const modal = document.querySelector('.image-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }
}

function updateModalImage() {
    const modal = document.querySelector('.image-modal');
    const modalImg = modal.querySelector('.modal-image');
    const modalCaption = modal.querySelector('.modal-caption');
    const currentImg = allImages[currentImageIndex];
    
    modalImg.src = currentImg.src;
    modalImg.alt = currentImg.alt;
    modalCaption.textContent = currentImg.alt;
}

function showPrevImage() {
    currentImageIndex = (currentImageIndex - 1 + allImages.length) % allImages.length;
    updateModalImage();
}

function showNextImage() {
    currentImageIndex = (currentImageIndex + 1) % allImages.length;
    updateModalImage();
}

function handleKeyboard(e) {
    const modal = document.querySelector('.image-modal');
    if (!modal || !modal.classList.contains('active')) return;
    
    if (e.key === 'Escape') closeModal();
    if (e.key === 'ArrowLeft') showPrevImage();
    if (e.key === 'ArrowRight') showNextImage();
}

// ===== PERFORMANCE: SCROLL THROTTLING =====
let scrollTimeout;
window.addEventListener('scroll', debounce(() => {
    // Add scroll-based effects if needed
    const scrolled = window.pageYOffset;
    
    // Add header shadow on scroll
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        if (scrolled > 100) {
            navbar.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        } else {
            navbar.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        }
    }
}, 100));

// ===== GALLERY SEARCH FUNCTIONALITY (NEW FEATURE) =====
function addGallerySearch() {
    const gallerySection = document.querySelector('.gallery-section');
    if (!gallerySection) return;
    
    const searchContainer = document.createElement('div');
    searchContainer.className = 'gallery-search';
    searchContainer.innerHTML = `
        <input type="text" placeholder="Search projects..." class="search-input" aria-label="Search gallery">
    `;
    
    const intro = gallerySection.querySelector('.gallery-intro');
    if (intro) {
        intro.after(searchContainer);
    }
    
    const searchInput = searchContainer.querySelector('.search-input');
    searchInput.addEventListener('input', debounce((e) => {
        const searchTerm = e.target.value.toLowerCase();
        
        galleryItems.forEach(item => {
            const title = item.querySelector('h3').textContent.toLowerCase();
            const description = item.querySelector('p').textContent.toLowerCase();
            const category = item.getAttribute('data-category');
            
            if (title.includes(searchTerm) || description.includes(searchTerm) || category.includes(searchTerm)) {
                item.style.display = 'block';
                item.style.opacity = '1';
                item.style.transform = 'translateY(0)';
            } else {
                item.style.display = 'none';
            }
        });
    }, 300));
}

// Initialize search on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addGallerySearch);
} else {
    addGallerySearch();
}


// Add ARIA labels to interactive elements
document.querySelectorAll('.gallery-item, .personal-gallery-item').forEach((item, index) => {
    item.setAttribute('role', 'article');
    item.setAttribute('aria-label', `Gallery item ${index + 1}`);
});

// Focus management for keyboard users
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            btn.click();
        }
    });
});

// ===== ERROR HANDLING FOR IMAGES =====
document.querySelectorAll('.gallery-item img, .personal-gallery-item img').forEach(img => {
    img.addEventListener('error', function() {
        // If image fails to load, show placeholder
        this.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect fill="%23ddd" width="400" height="300"/%3E%3Ctext fill="%23999" x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle"%3EImage not available%3C/text%3E%3C/svg%3E';
        this.alt = 'Image failed to load';
    });
});

// ===== PERFORMANCE MONITORING =====
if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
                console.log('LCP:', entry.renderTime || entry.loadTime);
            }
        }
    });
    observer.observe({ entryTypes: ['largest-contentful-paint'] });
}

// ===== CONSOLE MESSAGE =====
console.log('✅ Gallery loaded successfully with enhanced features!');
console.log('🎨 Features: Filter, Search, Lazy Loading, Modal, Animations');
console.log('♿ Accessibility: ARIA labels, Keyboard navigation, Screen reader support');