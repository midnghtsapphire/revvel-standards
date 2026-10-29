const FALLBACK_REPOS = [
  {
    name: 'pyglottography',
    description: 'Programmatic curation of Glottography datasets.',
    html_url: 'https://github.com/Glottography/pyglottography',
    stargazers_count: 17,
    forks_count: 5,
    open_issues_count: 1,
    language: 'Python',
    updated_at: '2025-01-09T10:30:00Z',
    archived: false,
  },
  {
    name: 'Rglottography',
    description: 'R package for programmatic access to the Glottography dataset.',
    html_url: 'https://github.com/Glottography/Rglottography',
    stargazers_count: 11,
    forks_count: 2,
    open_issues_count: 0,
    language: 'R',
    updated_at: '2024-12-18T09:15:00Z',
    archived: false,
  },
  {
    name: 'supporting-material',
    description: 'Supporting material for the publication “Glottography: an open-source geolinguistic dataset”.',
    html_url: 'https://github.com/Glottography/supporting-material',
    stargazers_count: 8,
    forks_count: 1,
    open_issues_count: 0,
    language: 'Markdown',
    updated_at: '2024-10-15T18:05:00Z',
    archived: false,
  },
  {
    name: 'tutorials',
    description: 'Tutorial resources and walkthrough content for working with the Glottography data ecosystem.',
    html_url: 'https://github.com/Glottography/tutorials',
    stargazers_count: 6,
    forks_count: 2,
    open_issues_count: 1,
    language: 'Jupyter Notebook',
    updated_at: '2024-08-02T14:20:00Z',
    archived: false,
  },
  {
    name: 'asher2007world',
    description: 'Language areas from Asher & Moseley 2007 “Atlas of the World’s Languages”.',
    html_url: 'https://github.com/Glottography/asher2007world',
    stargazers_count: 4,
    forks_count: 1,
    open_issues_count: 0,
    language: 'HTML',
    updated_at: '2024-06-20T15:45:00Z',
    archived: false,
  },
];

const state = {
  repos: [],
  filteredRepos: [],
  searchTerm: '',
  selectedLanguage: 'all',
  usingFallback: false,
};

const elements = {
  repoCount: document.getElementById('repo-count'),
  starCount: document.getElementById('star-count'),
  languageCount: document.getElementById('language-count'),
  updatedCount: document.getElementById('updated-count'),
  repoList: document.getElementById('repo-list'),
  resultSummary: document.getElementById('result-summary'),
  emptyState: document.getElementById('empty-state'),
  errorState: document.getElementById('error-state'),
  searchInput: document.getElementById('search-input'),
  languageFilter: document.getElementById('language-filter'),
  resetButton: document.getElementById('reset-button'),
};

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function normalizeRepository(repo) {
  return {
    name: repo.name || 'Unnamed repository',
    description: repo.description || 'No description provided.',
    html_url: repo.html_url || '#',
    stargazers_count: Number(repo.stargazers_count || 0),
    forks_count: Number(repo.forks_count || 0),
    open_issues_count: Number(repo.open_issues_count || 0),
    language: repo.language || 'Unspecified',
    updated_at: repo.updated_at || new Date().toISOString(),
    archived: Boolean(repo.archived),
  };
}

function formatNumber(value) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatRelativeDate(isoDate) {
  const date = new Date(isoDate);
  const deltaDays = Math.max(0, Math.round((Date.now() - date.getTime()) / 86400000));

  if (deltaDays === 0) return 'updated today';
  if (deltaDays < 30) return `updated ${deltaDays} days ago`;
  if (deltaDays < 365) return `updated ${Math.round(deltaDays / 30)} months ago`;
  return `updated ${(deltaDays / 365).toFixed(1)} years ago`;
}

function populateLanguageOptions() {
  const languages = [...new Set(state.repos.map((repo) => repo.language).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b)
  );

  const existingOptions = [...elements.languageFilter.options].map((option) => option.value);
  const hasAll = existingOptions.includes('all');

  if (!hasAll) {
    elements.languageFilter.innerHTML = '<option value="all">All languages</option>';
  } else {
    elements.languageFilter.innerHTML = '<option value="all">All languages</option>';
  }

  languages.forEach((language) => {
    const option = document.createElement('option');
    option.value = language;
    option.textContent = language;
    elements.languageFilter.appendChild(option);
  });

  if (state.selectedLanguage && state.selectedLanguage !== 'all') {
    elements.languageFilter.value = state.selectedLanguage;
  }
}

function updateSummary() {
  const totalStars = state.repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
  const uniqueLanguages = new Set(state.repos.map((repo) => repo.language)).size;
  const recentlyUpdated = state.repos.filter((repo) => {
    const ageInDays = (Date.now() - new Date(repo.updated_at).getTime()) / 86400000;
    return ageInDays <= 365;
  }).length;

  elements.repoCount.textContent = formatNumber(state.repos.length);
  elements.starCount.textContent = formatNumber(totalStars);
  elements.languageCount.textContent = formatNumber(uniqueLanguages);
  elements.updatedCount.textContent = formatNumber(recentlyUpdated);
}

function renderRepos() {
  const filtered = state.filteredRepos;

  elements.resultSummary.textContent = `${filtered.length} of ${state.repos.length} repositories shown`;

  if (!filtered.length) {
    elements.repoList.innerHTML = '';
    elements.emptyState.hidden = false;
    return;
  }

  elements.emptyState.hidden = true;

  elements.repoList.innerHTML = filtered
    .map(
      (repo) => `
        <article class="repo-card" role="listitem" aria-label="${escapeHtml(repo.name)} repository details">
          <h3>
            <a class="repo-link" href="${escapeHtml(repo.html_url)}" target="_blank" rel="noreferrer">
              ${escapeHtml(repo.name)}
            </a>
          </h3>
          <p class="repo-description">${escapeHtml(repo.description)}</p>
          <div class="repo-meta">
            <span class="meta-pill">⭐ ${formatNumber(repo.stargazers_count)}</span>
            <span class="meta-pill">⎇ ${formatNumber(repo.forks_count)}</span>
            <span class="meta-pill ${repo.open_issues_count ? 'is-warning' : ''}">Issues ${formatNumber(repo.open_issues_count)}</span>
          </div>
          <div class="repo-footer">
            <span class="repo-language">${escapeHtml(repo.language)}</span>
            <span class="repo-updated">${escapeHtml(formatRelativeDate(repo.updated_at))}</span>
          </div>
        </article>
      `
    )
    .join('');
}

function getFilteredRepos() {
  const query = state.searchTerm.trim().toLowerCase();
  return state.repos.filter((repo) => {
    const matchesSearch =
      !query ||
      repo.name.toLowerCase().includes(query) ||
      repo.description.toLowerCase().includes(query) ||
      repo.language.toLowerCase().includes(query);

    const matchesLanguage =
      state.selectedLanguage === 'all' || repo.language === state.selectedLanguage;

    return matchesSearch && matchesLanguage;
  });
}

function applyFilters() {
  state.filteredRepos = getFilteredRepos();
  renderRepos();
}

function bindEvents() {
  elements.searchInput.addEventListener('input', (event) => {
    state.searchTerm = event.target.value;
    applyFilters();
  });

  elements.languageFilter.addEventListener('change', (event) => {
    state.selectedLanguage = event.target.value;
    applyFilters();
  });

  elements.resetButton.addEventListener('click', () => {
    state.searchTerm = '';
    state.selectedLanguage = 'all';
    elements.searchInput.value = '';
    elements.languageFilter.value = 'all';
    applyFilters();
  });
}

async function fetchRepositoryData() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Glottography-Explorer',
  };

  const [orgResponse, repoResponse] = await Promise.all([
    fetch('https://api.github.com/orgs/Glottography', { headers }),
    fetch('https://api.github.com/orgs/Glottography/repos?per_page=100', { headers }),
  ]);

  if (!orgResponse.ok || !repoResponse.ok) {
    throw new Error('GitHub API did not return valid response data.');
  }

  const orgData = await orgResponse.json();
  const repoData = await repoResponse.json();

  const repoCount = Array.isArray(repoData) ? repoData.length : 0;
  if (!orgData || !repoCount) {
    throw new Error('No Glottography data was returned from the API.');
  }

  return repoData.map(normalizeRepository);
}

function useFallbackData() {
  state.repos = FALLBACK_REPOS.map(normalizeRepository);
  state.usingFallback = true;
  populateLanguageOptions();
  updateSummary();
  applyFilters();
  elements.errorState.hidden = false;
}

async function loadData() {
  try {
    state.repos = await fetchRepositoryData();
    state.usingFallback = false;
    elements.errorState.hidden = true;
  } catch (error) {
    console.warn('GitHub data fetch failed, using fallback data.', error);
    state.repos = FALLBACK_REPOS.map(normalizeRepository);
    state.usingFallback = true;
    elements.errorState.hidden = false;
  }

  populateLanguageOptions();
  updateSummary();
  applyFilters();
}

bindEvents();
loadData();
