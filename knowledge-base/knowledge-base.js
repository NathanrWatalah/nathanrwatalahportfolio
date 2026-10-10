document.documentElement.classList.add('kb-js');

const primaryNavigation = document.querySelector('.site-header nav');

if (primaryNavigation) {
  primaryNavigation.id = primaryNavigation.id || 'kb-primary-navigation';
  const menuButton = document.createElement('button');
  menuButton.className = 'kb-nav-toggle';
  menuButton.type = 'button';
  menuButton.textContent = 'Menu';
  menuButton.setAttribute('aria-controls', primaryNavigation.id);
  menuButton.setAttribute('aria-expanded', 'false');
  primaryNavigation.parentElement.insertBefore(menuButton, primaryNavigation);

  menuButton.addEventListener('click', () => {
    const isOpen = primaryNavigation.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.textContent = isOpen ? 'Close menu' : 'Menu';
  });

  primaryNavigation.addEventListener('click', event => {
    if (event.target instanceof HTMLAnchorElement) {
      primaryNavigation.classList.remove('is-open');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.textContent = 'Menu';
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && primaryNavigation.classList.contains('is-open')) {
      primaryNavigation.classList.remove('is-open');
      menuButton.setAttribute('aria-expanded', 'false');
      menuButton.textContent = 'Menu';
      menuButton.focus();
    }
  });
}

const searchInput = document.querySelector('#q');
const articles = [...document.querySelectorAll('.article-list li')];
const resultCount = document.querySelector('#result-count');
const emptyMessage = document.querySelector('#none');
const clearSearch = document.querySelector('#clear-search');
const categories = [...document.querySelectorAll('details.cat')];
const filters = [...document.querySelectorAll('.kb-filter')];
let activeFilter = 'all';

function updateGuides() {
  if (!searchInput || articles.length === 0) return;

  const query = searchInput.value.trim().toLowerCase();
  const terms = query.split(/\s+/).filter(Boolean);
  let visibleCount = 0;

  articles.forEach(article => {
    const link = article.querySelector('a');
    const searchableText = `${article.textContent} ${link?.getAttribute('href') || ''}`.toLowerCase();
    const matchesQuery = terms.every(term => searchableText.includes(term));
    const category = article.closest('details.cat');
    const matchesFilter = activeFilter === 'all' || category?.dataset.category === activeFilter;
    article.hidden = !matchesQuery || !matchesFilter;
    if (!article.hidden) visibleCount++;
  });

  categories.forEach(category => {
    const visibleArticles = [...category.querySelectorAll('.article-list li')].filter(article => !article.hidden);
    category.hidden = visibleArticles.length === 0;
    if (query && visibleArticles.length > 0) category.open = true;
  });

  if (resultCount) {
    resultCount.textContent = query
      ? `${visibleCount} ${visibleCount === 1 ? 'guide' : 'guides'} found`
      : `Showing ${visibleCount} ${visibleCount === 1 ? 'guide' : 'guides'}`;
  }
  if (emptyMessage) emptyMessage.hidden = visibleCount > 0;
  if (clearSearch) clearSearch.hidden = query.length === 0;
}

if (searchInput) {
  searchInput.addEventListener('input', updateGuides);
  updateGuides();
}

filters.forEach(filter => {
  filter.addEventListener('click', () => {
    activeFilter = filter.dataset.filter || 'all';
    filters.forEach(button => {
      const isActive = button === filter;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });
    updateGuides();
  });
});

document.querySelectorAll('.kb-suggestion').forEach(button => {
  button.addEventListener('click', () => {
    if (!searchInput) return;
    searchInput.value = button.dataset.query || '';
    updateGuides();
    searchInput.focus();
  });
});

clearSearch?.addEventListener('click', () => {
  if (!searchInput) return;
  searchInput.value = '';
  updateGuides();
  searchInput.focus();
});

document.querySelector('#expand-guides')?.addEventListener('click', () => {
  categories.filter(category => !category.hidden).forEach(category => { category.open = true; });
});

document.querySelector('#collapse-guides')?.addEventListener('click', () => {
  categories.forEach(category => { category.open = false; });
});

const steps = document.querySelector('.article .steps');

if (steps) {
  const stepItems = [...steps.querySelectorAll(':scope > li')];
  const progress = document.createElement('section');
  progress.className = 'kb-progress';
  progress.setAttribute('aria-label', 'Troubleshooting progress');
  progress.innerHTML = '<div class="kb-progress-heading"><span>Steps completed</span><span class="kb-progress-count" aria-live="polite"></span></div><div class="kb-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="0"><div class="kb-progress-fill"></div></div>';
  steps.before(progress);

  const progressCount = progress.querySelector('.kb-progress-count');
  const progressBar = progress.querySelector('.kb-progress-track');
  const progressFill = progress.querySelector('.kb-progress-fill');
  progressBar.setAttribute('aria-valuemax', String(stepItems.length));

  stepItems.forEach((item, index) => {
    const label = document.createElement('label');
    label.className = 'kb-step-toggle';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.setAttribute('aria-label', `Mark step ${index + 1} complete`);
    label.append(checkbox, document.createTextNode('Mark complete'));
    item.prepend(label);

    checkbox.addEventListener('change', () => {
      item.classList.toggle('is-complete', checkbox.checked);
      const completed = stepItems.filter(step => step.querySelector('.kb-step-toggle input')?.checked).length;
      progressCount.textContent = `${completed} of ${stepItems.length}`;
      progressBar.setAttribute('aria-valuenow', String(completed));
      progressFill.style.width = `${stepItems.length ? (completed / stepItems.length) * 100 : 0}%`;
    });
  });

  progressCount.textContent = `0 of ${stepItems.length}`;
}

const article = document.querySelector('.article');
const articleBreadcrumbs = article?.querySelector('.crumbs');

if (article && articleBreadcrumbs) {
  const actions = document.createElement('div');
  actions.className = 'kb-article-actions';
  const printButton = document.createElement('button');
  printButton.type = 'button';
  printButton.textContent = 'Print this guide';
  printButton.addEventListener('click', () => window.print());
  actions.append(printButton);
  articleBreadcrumbs.after(actions);
}

document.addEventListener('keydown', event => {
  const target = event.target;
  const isTyping = target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

  if (event.key === '/' && !isTyping && searchInput) {
    event.preventDefault();
    searchInput.focus();
  } else if (event.key === 'Escape' && target === searchInput && searchInput?.value) {
    searchInput.value = '';
    updateGuides();
  }
});
