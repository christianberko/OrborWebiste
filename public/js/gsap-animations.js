// public/js/gsap-animations.js
// --- Animation & Scroll Libraries Setup ---
// Assumes GSAP, ScrollTrigger, SplitType, and Lenis are loaded via CDN in the HTML before this script.

// 1. Smooth Scroll (Lenis)
const lenis = new Lenis();
lenis.on('scroll', (e) => {
  // console.log(e);
});
function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}
requestAnimationFrame(raf);

// 2. SplitType Text Animation for "What is Orbor" Section
const splitTypes = document.querySelectorAll('.reveal-type');
splitTypes.forEach((char, i) => {
  const text = new SplitType(char, { types: 'chars, words' });
  gsap.from(text.chars, {
    scrollTrigger: {
      trigger: char,
      start: 'top 80%',
      end: 'top 20%',
      scrub: true,
      markers: false
    },
    opacity: 0.2,
    stagger: 0.1
  });
});

// 3. About Us Section Animations
// Animate About Us header from left
if (document.querySelector('.about-header')) {
  gsap.from('.about-header', {
    x: -120,
    opacity: 0,
    duration: 1.2,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: '.about-section',
      start: 'top 80%',
      toggleActions: 'play none none none'
    }
  });
}
// Animate About Us text fade in
if (document.querySelector('.about-text')) {
  gsap.from('.about-text', {
    opacity: 0,
    y: 40,
    duration: 1.2,
    delay: 0.3,
    ease: 'power2.out',
    scrollTrigger: {
      trigger: '.about-section',
      start: 'top 70%',
      toggleActions: 'play none none none'
    }
  });
}

// 4. Animate other scroll sections (except about-section and metrics-section)
gsap.utils.toArray('.scroll-section').forEach(section => {
  if (!section.classList.contains('about-section') && !section.classList.contains('metrics-section')) {
    gsap.from(section, {
      opacity: 0,
      y: 80,
      duration: 1,
      scrollTrigger: {
        trigger: section,
        start: 'top 80%',
        toggleActions: 'play none none none'
      }
    });
  }
});

// 5. Metrics Section Simultaneous Animations
// Animate all metrics at once when the metrics-section scrolls into view
if (document.querySelector('.metrics-section')) {
  gsap.fromTo('.metric',
    {
      opacity: 0,
      x: 50,
      scale: 0.9
    },
    {
      opacity: 1,
      x: 0,
      scale: 1,
      duration: 1.2,
      ease: 'power3.out',
      stagger: 0, // No delay between metrics
      scrollTrigger: {
        trigger: '.metrics-section',
        start: 'top 80%',
        end: 'top 20%',
        toggleActions: 'play none none reverse',
        markers: false
      }
    }
  );

  // Animate header and blurb at the same time as metrics
  gsap.fromTo(['.metrics-header', '.metrics-blurb'],
    {
      opacity: 0,
      y: 30
    },
    {
      opacity: 1,
      y: 0,
      duration: 1.2,
      ease: 'power3.out',
      stagger: 0, // No delay between header and blurb
      scrollTrigger: {
        trigger: '.metrics-section',
        start: 'top 80%',
        end: 'top 20%',
        toggleActions: 'play none none reverse',
        markers: false
      }
    }
  );
}

// 6. Process Section Animations
gsap.utils.toArray('.process-card').forEach((card, index) => {
  gsap.fromTo(card, 
    {
      opacity: 0,
      x: 100,
      scale: 0.8
    },
    {
      opacity: 1,
      x: 0,
      scale: 1,
      duration: 1.2,
      delay: index * 0.3,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: card,
        start: 'top 85%',
        end: 'top 15%',
        toggleActions: 'play none none reverse',
        markers: false
      }
    }
  );
});

// 7. Process Cards Container Animation
gsap.from('.process-cards-container', {
  opacity: 0,
  y: 50,
  duration: 1.5,
  ease: 'power2.out',
  scrollTrigger: {
    trigger: '.process-section',
    start: 'top 80%',
    toggleActions: 'play none none none'
  }
});

// 8. Card Number Animation
gsap.utils.toArray('.card-number').forEach((number, index) => {
  gsap.fromTo(number,
    {
      scale: 0,
      rotation: -180
    },
    {
      scale: 1,
      rotation: 0,
      duration: 0.8,
      delay: index * 0.4 + 0.5,
      ease: 'back.out(1.7)',
      scrollTrigger: {
        trigger: number,
        start: 'top 85%',
        toggleActions: 'play none none reverse'
      }
    }
  );
});

// 9. Card Content Animation
gsap.utils.toArray('.process-card .card-content').forEach((content, index) => {
  gsap.fromTo(content,
    {
      opacity: 0,
      y: 30
    },
    {
      opacity: 1,
      y: 0,
      duration: 1,
      delay: index * 0.3 + 0.8,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: content,
        start: 'top 80%',
        toggleActions: 'play none none reverse'
      }
    }
  );
});

// 10. Renewable Energy Section Animations
gsap.utils.toArray('.text-part').forEach((textPart, index) => {
  gsap.fromTo(textPart,
    {
      opacity: 0,
      y: 100,
      scale: 0.8
    },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 1.2,
      delay: index * 0.2,
      ease: 'back.out(1.7)',
      scrollTrigger: {
        trigger: '.renewable-section',
        start: 'top 80%',
        toggleActions: 'play none none reverse'
      }
    }
  );
});

// Energy icon animation
gsap.fromTo('.energy-icon',
  {
    opacity: 0,
    scale: 0,
    rotation: -180
  },
  {
    opacity: 1,
    scale: 1,
    rotation: 0,
    duration: 1.5,
    delay: 1.5,
    ease: 'elastic.out(1, 0.3)',
    scrollTrigger: {
      trigger: '.renewable-section',
      start: 'top 70%',
      toggleActions: 'play none none reverse'
    }
  }
);

// Background energy pulse effect
gsap.to('.renewable-section::before', {
  opacity: 0.8,
  duration: 2,
  repeat: -1,
  yoyo: true,
  ease: 'power2.inOut',
  scrollTrigger: {
    trigger: '.renewable-section',
    start: 'top 80%',
    toggleActions: 'play none none reverse'
  }
});

// 11. Impact Gallery Carousel Functionality with Enhanced Animations
document.addEventListener('DOMContentLoaded', function () {
  const galleryContainer = document.querySelector('.gallery-container');
  const slides = document.querySelectorAll('.gallery-slide');
  const indicators = document.querySelectorAll('.indicator');
  const prevBtn = document.querySelector('.prev-btn');
  const nextBtn = document.querySelector('.next-btn');
  
  let currentSlide = 0;
  const totalSlides = slides.length;
  let isTransitioning = false;
  
  function showSlide(index) {
    if (isTransitioning) return;
    isTransitioning = true;
    
    // Remove active class from all slides and indicators
    slides.forEach(slide => {
      slide.classList.remove('active', 'prev');
    });
    indicators.forEach(indicator => {
      indicator.classList.remove('active');
    });
    
    // Add active class to current slide and indicator
    slides[index].classList.add('active');
    indicators[index].classList.add('active');
    
    // Add prev class to previous slide for smooth transitions
    const prevIndex = (index - 1 + totalSlides) % totalSlides;
    slides[prevIndex].classList.add('prev');
    
    currentSlide = index;
    
    // Reset transition flag after animation completes
    setTimeout(() => {
      isTransitioning = false;
    }, 1000);
  }
  
  function nextSlide() {
    const nextIndex = (currentSlide + 1) % totalSlides;
    showSlide(nextIndex);
  }
  
  function prevSlide() {
    const prevIndex = (currentSlide - 1 + totalSlides) % totalSlides;
    showSlide(prevIndex);
  }
  
  // Event listeners with enhanced feedback
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (!isTransitioning) {
        nextBtn.style.transform = 'scale(0.9)';
        setTimeout(() => {
          nextBtn.style.transform = '';
        }, 150);
        nextSlide();
      }
    });
  }
  
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      if (!isTransitioning) {
        prevBtn.style.transform = 'scale(0.9)';
        setTimeout(() => {
          prevBtn.style.transform = '';
        }, 150);
        prevSlide();
      }
    });
  }
  
  indicators.forEach((indicator, index) => {
    indicator.addEventListener('click', () => {
      if (!isTransitioning) {
        showSlide(index);
      }
    });
  });
  
  // Auto-advance slides every 6 seconds with pause on hover
  let autoAdvanceInterval;
  
  function startAutoAdvance() {
    autoAdvanceInterval = setInterval(nextSlide, 6000);
  }
  
  function stopAutoAdvance() {
    clearInterval(autoAdvanceInterval);
  }
  
  if (galleryContainer) {
    galleryContainer.addEventListener('mouseenter', stopAutoAdvance);
    galleryContainer.addEventListener('mouseleave', startAutoAdvance);
  }
  
  startAutoAdvance();
  
  // Keyboard navigation
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      prevSlide();
    } else if (e.key === 'ArrowRight') {
      nextSlide();
    }
  });
  
  // Touch/swipe support for mobile with improved sensitivity
  let startX = 0;
  let endX = 0;
  let isSwiping = false;
  
  if (galleryContainer) {
    galleryContainer.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      isSwiping = true;
    });
    
    galleryContainer.addEventListener('touchmove', (e) => {
      if (isSwiping) {
        e.preventDefault();
      }
    });
    
    galleryContainer.addEventListener('touchend', (e) => {
      if (isSwiping) {
        endX = e.changedTouches[0].clientX;
        handleSwipe();
        isSwiping = false;
      }
    });
  }
  
  function handleSwipe() {
    const swipeThreshold = 30;
    const diff = startX - endX;
    
    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0) {
        nextSlide(); // Swipe left
      } else {
        prevSlide(); // Swipe right
      }
    }
  }
  
  // Add entrance animation for the gallery
  gsap.fromTo('.gallery-container',
    {
      opacity: 0,
      scale: 0.8,
      y: 50
    },
    {
      opacity: 1,
      scale: 0.95,
      y: 0,
      duration: 1.5,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.impact-gallery-section',
        start: 'top 80%',
        toggleActions: 'play none none reverse'
      }
    }
  );
});

// 12. Process Section Image and Text Animations (Legacy - keeping for compatibility)
document.addEventListener('DOMContentLoaded', function () {
  // Helper: Check if element is in viewport
  function isInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerHeight || document.documentElement.clientWidth)
    );
  }
  // Animate images in process rows if in viewport
  const rows = document.querySelectorAll('.row');
  rows.forEach((row) => {
    if (isInViewport(row)) {
      const img = row.querySelector('img');
      if (row.querySelector('.left')) {
        gsap.to(img, {
          clipPath: 'polygon( 0% 0%, 100% 0%, 100% 100%, 0% 100%)',
        });
      } else {
        gsap.to(img, {
          clipPath: 'polygon( 0% 0%, 100% 0%, 100% 100%, 0% 100%)',
        });
      }
    }
  });
  // Animate right images on scroll
  gsap.utils.toArray('.img-container.right img').forEach((img) => {
    gsap.to(img, {
      clipPath: 'polygon( 0% 0%, 100% 0%, 100% 100%, 0% 100%)',
      scrollTrigger: {
        trigger: img,
        start: 'top 75%',
        end: 'bottom 70%',
        scrub: true,
      },
    });
  });
  // Animate left images on scroll
  gsap.utils.toArray('.img-container.left img').forEach((img) => {
    gsap.to(img, {
      clipPath: 'polygon( 0% 0%, 100% 0%, 100% 100%, 0% 100%)',
      scrollTrigger: {
        trigger: img,
        start: 'top 75%',
        end: 'bottom 70%',
        scrub: true,
      },
    });
  });
  // Animate process text content fade-in
  gsap.utils.toArray('.text-content').forEach((textContent) => {
    gsap.to(textContent, {
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power2.out',
      scrollTrigger: {
        trigger: textContent,
        start: 'top 80%',
        toggleActions: 'play none none none',
      },
    });
  });
});

// 13. Horizontal Timeline Process Section Animations
if (document.querySelector('.horizontal-timeline-section')) {
  // Animate timeline container in
  const timelineContainer = document.querySelector('.timeline-container');
  if (timelineContainer) {
    gsap.to(timelineContainer, {
      opacity: 1,
      y: 0,
      duration: 1.2,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: timelineContainer,
        start: 'top 80%',
        onEnter: () => timelineContainer.classList.add('animate-in'),
        onLeaveBack: () => timelineContainer.classList.remove('animate-in'),
      }
    });
  }
  // Animate cards in as they enter viewport horizontally
  gsap.utils.toArray('.timeline-card').forEach((card, i) => {
    gsap.from(card, {
      opacity: 0,
      y: 60,
      scale: 0.9,
      duration: 1.1,
      delay: i * 0.2,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: card,
        start: 'left 85%',
        end: 'left 60%',
        scrub: false,
        horizontal: true,
        scroller: '.timeline-cards-wrapper',
        toggleActions: 'play none none reverse',
      }
    });
  });
  // Animate progress bar as user scrolls horizontally
  const cardsWrapper = document.querySelector('.timeline-cards-wrapper');
  const progressBar = document.querySelector('.timeline-progress');
  if (cardsWrapper && progressBar) {
    ScrollTrigger.create({
      trigger: cardsWrapper,
      start: 'left left',
      end: () => `+=${cardsWrapper.scrollWidth - cardsWrapper.clientWidth}`,
      scrub: true,
      horizontal: true,
      scroller: cardsWrapper,
      onUpdate: self => {
        const progress = self.progress;
        progressBar.style.width = `${Math.round(progress * 100)}%`;
      }
    });
  }
}

// 14. Process Section 3-Column Grid Animations
if (document.querySelector('.process-grid-section')) {
  gsap.utils.toArray('.process-grid-card').forEach((card, i) => {
    gsap.from(card, {
      opacity: 0,
      y: 60,
      duration: 1.1,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: card,
        start: 'top 85%',
        toggleActions: 'play none none reverse',
      }
    });
  });
}

// Impact Horizontal Scroll Section (Environmental Impact)
if (document.querySelector('.impact-horizontal-section')) {
  const slides = gsap.utils.toArray('.impact-slide');
  const section = document.querySelector('.impact-horizontal-section');
  const progressIndicator = document.querySelector('.impact-progress-indicator');

  // Create progress dots
  if (progressIndicator) {
    progressIndicator.innerHTML = slides.map((_, i) => `<div class="impact-progress-indicator-dot${i === 0 ? ' active' : ''}"></div>`).join('');
  }
  const dots = progressIndicator ? progressIndicator.querySelectorAll('.impact-progress-indicator-dot') : [];

  // Horizontal scroll tied to vertical scroll (1 scroll = 1 slide)
  gsap.to(slides, {
    xPercent: -100 * (slides.length - 1),
    ease: 'power1.inOut',
    scrollTrigger: {
      trigger: section,
      pin: true,
      scrub: 0.5,
      snap: 1 / (slides.length - 1),
      end: () => `+=${window.innerHeight * (slides.length - 1)}`,
      anticipatePin: 1,
      onUpdate: self => {
        // Progress indicator update
        if (dots.length) {
          const progress = self.progress * (slides.length - 1);
          dots.forEach((dot, i) => {
            dot.classList.toggle('active', Math.round(progress) === i);
          });
        }
      }
    }
  });

  // Animate text reveal per slide
  slides.forEach((slide, i) => {
    const content = slide.querySelector('.impact-slide-content');
    if (content) {
      gsap.to(content, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        ease: 'power2.out',
        scrollTrigger: {
          trigger: slide,
          containerAnimation: ScrollTrigger.getById(section),
          start: 'left center',
          end: 'right center',
          toggleActions: 'play none none reverse',
        }
      });
    }
  });
}

// Animate Environmental Impact header overlay out as scrolling begins
if (document.querySelector('.impact-section-header-overlay')) {
  gsap.to('.impact-section-header-overlay', {
    opacity: 0,
    y: -60,
    ease: 'power2.in',
    scrollTrigger: {
      trigger: '.impact-horizontal-section',
      start: 'top top',
      end: () => `+=${window.innerHeight * 0.7}`,
      scrub: true,
      pin: false,
      markers: false
    }
  });
}

// About Us Split Layout Animations
if (document.querySelector('.about-section.split-layout')) {
  gsap.fromTo('.about-image-col',
    { opacity: 0, x: -80 },
    {
      opacity: 1,
      x: 0,
      duration: 1.2,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.about-section.split-layout',
        start: 'top 80%',
        end: 'top 20%',
        toggleActions: 'play reverse play reverse',
        markers: false
      }
    }
  );
  gsap.fromTo('.about-text-col',
    { opacity: 0, x: 80 },
    {
      opacity: 1,
      x: 0,
      duration: 1.2,
      delay: 0.2,
      ease: 'power3.out',
      scrollTrigger: {
        trigger: '.about-section.split-layout',
        start: 'top 80%',
        end: 'top 20%',
        toggleActions: 'play reverse play reverse',
        markers: false
      }
    }
  );
} 