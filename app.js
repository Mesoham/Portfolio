const root = document.documentElement;
const theme = document.querySelector('#theme');

function setTheme(value) {
  root.dataset.theme = value;
  theme.textContent = value === 'dark' ? '☀' : '☾';
  theme.setAttribute('aria-label', 'Switch to ' + (value === 'dark' ? 'light' : 'dark') + ' theme');
}

try {
  setTheme(localStorage.getItem('portfolio-theme') === 'light' ? 'light' : 'dark');
} catch {
  setTheme('dark');
}

theme.addEventListener('click', () => {
  const value = root.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(value);
  try { localStorage.setItem('portfolio-theme', value); } catch { /* Theme still works for this visit. */ }
});

const email = document.querySelector('#email').getAttribute('href').slice(7);
const status = document.querySelector('#status');
document.querySelector('#copy').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(email);
    status.textContent = 'Email address copied.';
  } catch {
    status.textContent = email;
  }
});

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add('reveal');
      observer.unobserve(entry.target);
    }
  }, { threshold: 0.12 });
  document.querySelectorAll('.section').forEach(section => observer.observe(section));
}


const impact = document.querySelector('.visual');
const metrics = impact.querySelectorAll('[data-metric]');
const impactLabel = document.querySelector('#impact-label');
const impactLink = document.querySelector('#impact-link');

for (const metric of metrics) {
  metric.addEventListener('click', () => {
    for (const option of metrics) option.setAttribute('aria-pressed', String(option === metric));
    impact.dataset.active = metric.dataset.metric;
    impactLabel.textContent = metric.dataset.metric === 'sql' ? 'MySQL · Data validation' : 'Root-cause analysis · Case triage';
    impactLink.href = '#impact-' + metric.dataset.metric;
  });
}

impactLink.addEventListener('click', event => {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  const detail = document.querySelector(impactLink.hash);
  detail.open = true;
  detail.querySelector('summary').focus({ preventScroll: true });
  detail.scrollIntoView({ block: 'start' });
});

if (matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) {
  impact.addEventListener('pointermove', event => {
    const box = impact.getBoundingClientRect();
    impact.style.setProperty('--pointer-x', String((event.clientX - box.left) / box.width * 100) + '%');
    impact.style.setProperty('--pointer-y', String((event.clientY - box.top) / box.height * 100) + '%');
  });
  impact.addEventListener('pointerleave', () => {
    impact.style.removeProperty('--pointer-x');
    impact.style.removeProperty('--pointer-y');
  });
}

const dock = document.querySelector('header.nav');
const dockLinks = [...dock.querySelectorAll('a[href^="#"]')];
const dockTargets = new Map(dockLinks.map(link => [document.querySelector(link.hash), link]));
const dockSections = [...dockTargets.keys()].sort((first, second) =>
  first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1
);
let dockFrame = 0;

function updateDock() {
  dockFrame = 0;
  const readingLine = dock.getBoundingClientRect().bottom + 36;
  let current = dockSections[0];
  for (const section of dockSections) {
    if (section.getBoundingClientRect().top > readingLine) break;
    current = section;
  }
  const page = document.scrollingElement;
  if (page.scrollTop > 0 && page.scrollHeight - page.scrollTop - page.clientHeight < 3) {
    current = dockSections.at(-1);
  }
  for (const link of dockLinks) {
    if (link === dockTargets.get(current)) link.setAttribute('aria-current', 'location');
    else link.removeAttribute('aria-current');
  }
}
function scheduleDockUpdate() {
  if (!dockFrame) dockFrame = requestAnimationFrame(updateDock);
}
window.addEventListener('scroll', scheduleDockUpdate, { passive: true });
window.addEventListener('resize', scheduleDockUpdate);
scheduleDockUpdate();

const photoTrack = document.querySelector('.photo-track');
const slides = [...photoTrack.children];
const carousel = photoTrack.parentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let photoTimer;
let typingTimer;
let activePhoto = -1;
let captionComplete = false;
let carouselVisible = false;
const photoCaption = document.querySelector('#photo-caption');

function currentPhotoIndex() {
  return Math.min(slides.length - 1, Math.max(0, Math.round(photoTrack.scrollLeft / (photoTrack.clientWidth || 1))));
}

function updatePhotoCaption() {
  const index = currentPhotoIndex();
  if (index === activePhoto) return;
  activePhoto = index;
  clearTimeout(photoTimer);
  clearTimeout(typingTimer);
  const caption = slides[index].dataset.caption;
  const characters = Array.from(caption);
  let length = 0;
  captionComplete = false;

  if (reducedMotion.matches) {
    photoCaption.textContent = caption;
    captionComplete = true;
    startPhotos();
    return;
  }

  function typeNext() {
    length += 1;
    photoCaption.textContent = characters.slice(0, length).join('');
    if (length < characters.length) {
      typingTimer = setTimeout(typeNext, 24);
    } else {
      captionComplete = true;
      startPhotos();
    }
  }

  typeNext();
}

photoTrack.addEventListener('scroll', updatePhotoCaption, { passive: true });

function movePhoto(offset) {
  const current = currentPhotoIndex();
  const index = (current + offset + slides.length) % slides.length;
  photoTrack.scrollTo({
    left: index * photoTrack.clientWidth,
    behavior: reducedMotion.matches || Math.abs(index - current) > 1 ? 'instant' : 'smooth',
  });
}

function startPhotos() {
  clearTimeout(photoTimer);
  if (carouselVisible && captionComplete && !reducedMotion.matches && !document.hidden && !carousel.matches(':hover, :focus-within')) {
    photoTimer = setTimeout(() => movePhoto(1), 3000);
  }
}

document.querySelector('#slide-prev').addEventListener('click', () => movePhoto(-1));
document.querySelector('#slide-next').addEventListener('click', () => movePhoto(1));
photoTrack.addEventListener('keydown', event => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  movePhoto(event.key === 'ArrowLeft' ? -1 : 1);
});
for (const event of ['pointerenter', 'pointerleave', 'focusin', 'focusout']) {
  carousel.addEventListener(event, () => requestAnimationFrame(startPhotos));
}
document.addEventListener('visibilitychange', startPhotos);
reducedMotion.addEventListener('change', () => {
  activePhoto = -1;
  updatePhotoCaption();
});
const photoObserver = new IntersectionObserver(entries => {
  carouselVisible = entries[0].isIntersecting;
  if (carouselVisible) updatePhotoCaption();
  startPhotos();
});
photoObserver.observe(carousel);

