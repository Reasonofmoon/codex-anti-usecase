document.addEventListener('DOMContentLoaded', () => {
  // State variables
  const collections = {
    codex: null,
    plugin: null,
    anti: null,
    claude: null
  };
  let currentCollection = 'codex';
  let usecases = [];
  let currentCategory = 'all';
  let searchQuery = '';

  // DOM Elements
  const usecaseGrid = document.getElementById('usecase-grid');
  const noResultsView = document.getElementById('no-results-view');
  const resetFiltersBtn = document.getElementById('reset-filters-btn');
  
  // Search inputs
  const searchInput = document.getElementById('search-input');
  const searchClearBtn = document.getElementById('search-clear-btn');
  
  // Category tabs container
  const filterTabsList = document.getElementById('filter-tabs-list');
  
  // Collection Switcher Elements
  const collectionBtns = document.querySelectorAll('.collection-btn');
  
  // Stats Elements
  const valTotal = document.getElementById('val-total');
  const valCategories = document.getElementById('val-categories');
  const valTags = document.getElementById('val-tags');
  const valPopular = document.getElementById('val-popular');
  
  // Modal Elements
  const detailModal = document.getElementById('detail-modal');
  const modalWrapper = detailModal.querySelector('.modal-wrapper');
  const modalCloseBtn = document.getElementById('modal-close-btn');
  const modalBanner = document.getElementById('modal-banner');
  const modalCategory = document.getElementById('modal-category');
  const modalTitle = document.getElementById('modal-title');
  const modalTags = document.getElementById('modal-tags');
  const modalDescription = document.getElementById('modal-description');
  const modalInsightSection = document.getElementById('modal-insight-section');
  const modalInsight = document.getElementById('modal-insight');
  const modalActionBtn = document.getElementById('modal-action-btn');
  
  // Modal Command Elements
  const modalCommandWrapper = document.getElementById('modal-command-wrapper');
  const modalCommand = document.getElementById('modal-command');

  // Fetch and switch collections
  async function selectCollection(collectionName) {
    currentCollection = collectionName;
    
    // Reset search inputs
    searchInput.value = '';
    searchQuery = '';
    searchClearBtn.style.display = 'none';
    currentCategory = 'all';
    
    // Show smooth skeleton/loading inside grid
    usecaseGrid.style.opacity = '0.4';
    
    if (!collections[collectionName]) {
      try {
        let url;
        if (collectionName === 'codex') url = './data/usecases.json';
        else if (collectionName === 'plugin') url = './data/plugin_usecases.json';
        else if (collectionName === 'anti') url = './data/anti_usecases.json';
        else if (collectionName === 'claude') url = './data/claude_usecases.json';
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        collections[collectionName] = await response.json();
      } catch (error) {
        console.error('Error loading collection:', error);
        usecaseGrid.innerHTML = `
          <div class="no-results" style="grid-column: 1 / -1; text-align: center;">
            <div class="no-results-icon" style="color: var(--accent-violet);"><i class="fa-solid fa-triangle-exclamation"></i></div>
            <h3>데이터 로드 실패</h3>
            <p>데이터 파일을 불러오지 못했습니다. 파일이 존재하고 로컬 서버를 통해 제공되고 있는지 확인해 주세요.</p>
          </div>
        `;
        usecaseGrid.style.opacity = '1';
        return;
      }
    }
    
    usecases = collections[collectionName];
    
    // Update count in collection tab
    const countEl = document.getElementById(`count-${collectionName}`);
    if (countEl) countEl.textContent = `(${usecases.length})`;

    // Dynamically build category tabs
    renderCategoryFilters(usecases);
    
    // Recalculate stats with smooth animation transitions
    calculateStats(usecases);
    
    // Render current grid
    renderGrid();
    
    // Fade grid back in
    setTimeout(() => {
      usecaseGrid.style.opacity = '1';
    }, 50);
  }

  // Pre-fetch the other collection in the background for instant switching and count updates
  async function fetchOtherCollectionCount(collectionName) {
    if (collections[collectionName]) return;
    try {
      let url;
      if (collectionName === 'codex') url = './data/usecases.json';
      else if (collectionName === 'plugin') url = './data/plugin_usecases.json';
      else if (collectionName === 'anti') url = './data/anti_usecases.json';
      else if (collectionName === 'claude') url = './data/claude_usecases.json';
      
      const res = await fetch(url);
      if (res.ok) {
        collections[collectionName] = await res.json();
        const countEl = document.getElementById(`count-${collectionName}`);
        if (countEl) countEl.textContent = `(${collections[collectionName].length})`;
      }
    } catch (e) {
      console.warn('Failed to pre-fetch count for ' + collectionName, e);
    }
  }

  // Generate Category Filter Buttons Dynamically
  function renderCategoryFilters(data) {
    if (!filterTabsList) return;
    
    filterTabsList.innerHTML = '';
    
    // Extract unique categories
    const categories = new Set();
    data.forEach(item => {
      if (item.category) {
        categories.add(item.category);
      }
    });
    
    const sortedCategories = Array.from(categories).sort();
    
    // Create 'All' tab
    const allLi = document.createElement('li');
    const allBtn = document.createElement('button');
    allBtn.className = 'filter-tab active';
    allBtn.id = 'filter-all';
    allBtn.setAttribute('data-category', 'all');
    allBtn.textContent = '전체';
    allLi.appendChild(allBtn);
    filterTabsList.appendChild(allLi);
    
    // Create tab for each category
    sortedCategories.forEach(cat => {
      const li = document.createElement('li');
      const btn = document.createElement('button');
      btn.className = 'filter-tab';
      btn.setAttribute('data-category', cat);
      btn.textContent = translateCategory(cat);
      li.appendChild(btn);
      filterTabsList.appendChild(li);
    });
    
    // Attach click handlers to dynamic tabs
    const newTabs = filterTabsList.querySelectorAll('.filter-tab');
    newTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        newTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        currentCategory = tab.getAttribute('data-category');
        renderGrid();
      });
    });
  }

  // Calculate and Render Stats
  function calculateStats(data) {
    if (!data.length) return;

    const totalCount = data.length;
    const categoriesMap = {};
    const uniqueTagsSet = new Set();
    
    data.forEach(item => {
      if (item.category) {
        categoriesMap[item.category] = (categoriesMap[item.category] || 0) + 1;
      }
      if (Array.isArray(item.tags)) {
        item.tags.forEach(tag => uniqueTagsSet.add(tag));
      }
    });

    const categoriesCount = Object.keys(categoriesMap).length;
    const tagsCount = uniqueTagsSet.size;

    let topCat = '없음';
    let maxCount = 0;
    for (const [cat, count] of Object.entries(categoriesMap)) {
      if (count > maxCount) {
        maxCount = count;
        topCat = cat;
      }
    }
    const popularCategory = translateCategory(topCat);

    // Dynamic stat updates with smooth fade/slide transitions
    updateStatValue(valTotal, totalCount, true);
    updateStatValue(valCategories, categoriesCount, true);
    updateStatValue(valTags, tagsCount, true);
    updateStatValue(valPopular, popularCategory, false);
  }

  // Number counting animation
  function animateValue(element, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      element.textContent = Math.floor(progress * (end - start) + start);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        element.textContent = end;
      }
    };
    window.requestAnimationFrame(step);
  }

  // Stat updater wrapper
  function updateStatValue(element, newValue, isNumeric = false) {
    element.style.opacity = '0';
    element.style.transform = 'translateY(4px)';
    
    setTimeout(() => {
      if (isNumeric) {
        const startVal = parseInt(element.textContent) || 0;
        const endVal = parseInt(newValue) || 0;
        animateValue(element, startVal, endVal, 350);
      } else {
        element.textContent = newValue;
      }
      element.style.opacity = '1';
      element.style.transform = 'translateY(0)';
    }, 200);
  }

  // Helper to translate category names to Korean
  function translateCategory(category) {
    if (!category) return '기타';
    const catLower = category.toLowerCase().trim();
    if (catLower === 'context & session') return '컨텍스트 & 세션';
    if (catLower === 'workflow & dev') return '워크플로우 & 개발';
    if (catLower === 'code quality') return '코드 품질 & 검수';
    if (catLower === 'system & extensibility') return '시스템 & 확장성';
    if (catLower === 'notebook rag') return '노트북 RAG';
    if (catLower === 'media & multimodal') return '미디어 & 멀티모달';
    if (catLower === 'web research') return '웹 리서치';
    if (catLower === 'development') return '개발/엔지니어링';
    if (catLower.includes('automation')) return '자동화';
    if (catLower.includes('engineering')) return '개발/엔지니어링';
    if (catLower.includes('data')) return '데이터 분석';
    if (catLower.includes('knowledge')) return '지식 노동';
    if (catLower.includes('front-end') || catLower.includes('frontend')) return '프론트엔드';
    if (catLower.includes('mobile')) return '모바일';
    if (catLower.includes('accuracy') || catLower.includes('math')) return '정밀도 & 수학/연산';
    if (catLower.includes('efficiency') || catLower.includes('token')) return '효율성 & 토큰';
    if (catLower.includes('real-time') || catLower.includes('system') || catLower.includes('realtime')) return '실시간 & 시스템';
    if (catLower.includes('security') || catLower.includes('privacy')) return '보안 & 개인정보';
    return category;
  }

  // Helper to determine category badge CSS class
  function getCategoryClass(category) {
    if (!category) return 'badge-default';
    const catLower = category.toLowerCase().trim();
    if (catLower === 'context & session') return 'badge-claude-context';
    if (catLower === 'workflow & dev') return 'badge-claude-workflow';
    if (catLower === 'code quality') return 'badge-claude-quality';
    if (catLower === 'system & extensibility') return 'badge-claude-system';
    if (catLower === 'notebook rag') return 'badge-notebook-rag';
    if (catLower === 'media & multimodal') return 'badge-media-multimodal';
    if (catLower === 'web research') return 'badge-web-research';
    if (catLower.includes('automation')) return 'badge-automation';
    if (catLower.includes('engineering') || catLower === 'development') return 'badge-engineering';
    if (catLower.includes('data')) return 'badge-data';
    if (catLower.includes('knowledge')) return 'badge-knowledge';
    if (catLower.includes('front-end') || catLower.includes('frontend')) return 'badge-frontend';
    if (catLower.includes('mobile')) return 'badge-mobile';
    if (catLower.includes('accuracy') || catLower.includes('math')) return 'badge-math';
    if (catLower.includes('efficiency') || catLower.includes('token')) return 'badge-token';
    if (catLower.includes('real-time') || catLower.includes('system') || catLower.includes('realtime')) return 'badge-realtime';
    if (catLower.includes('security') || catLower.includes('privacy')) return 'badge-security';
    return 'badge-default';
  }

  // Render Use Cases Grid based on current filters
  function renderGrid() {
    usecaseGrid.innerHTML = '';

    // Filter logic
    const filtered = usecases.filter(item => {
      const categoryMatch = currentCategory === 'all' || 
                            (item.category && item.category.toLowerCase() === currentCategory.toLowerCase());
      
      const query = searchQuery.toLowerCase().trim();
      const titleMatch = item.title && item.title.toLowerCase().includes(query);
      const descMatch = item.description && item.description.toLowerCase().includes(query);
      const tagsMatch = item.tags && item.tags.some(tag => tag.toLowerCase().includes(query));
      const searchMatch = !query || titleMatch || descMatch || tagsMatch;

      return categoryMatch && searchMatch;
    });

    if (filtered.length === 0) {
      usecaseGrid.style.display = 'none';
      noResultsView.style.display = 'block';
      return;
    }

    usecaseGrid.style.display = 'grid';
    noResultsView.style.display = 'none';

    const fragment = document.createDocumentFragment();

    filtered.forEach(item => {
      const card = document.createElement('article');
      card.className = 'usecase-card';
      card.setAttribute('tabindex', '0');
      card.setAttribute('role', 'button');
      card.setAttribute('aria-haspopup', 'dialog');
      card.setAttribute('id', `card-${item.slug}`);

      const badgeClass = getCategoryClass(item.category);

      const imageTag = item.image 
        ? `<img src="${item.image}" alt="${item.title}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">`
        : '';

      const commandBadgeHtml = item.command 
        ? `<div class="card-command-row"><code class="command-badge"><i class="fa-solid fa-terminal"></i> ${item.command}</code></div>`
        : '';

      card.innerHTML = `
        <div class="card-image-area">
          ${imageTag}
          <div class="card-image-placeholder" style="${item.image ? 'display:none;' : 'display:flex;'}"></div>
          <span class="card-category-badge ${badgeClass}">${translateCategory(item.category || 'General')}</span>
        </div>
        <div class="card-body">
          <h3 class="card-title">${item.title}</h3>
          ${commandBadgeHtml}
          <p class="card-description">${item.description || '등록된 상세 설명이 없습니다.'}</p>
          <div class="card-tags">
            ${(item.tags || []).slice(0, 3).map(tag => `<span class="tag-pill">${tag}</span>`).join('')}
            ${(item.tags || []).length > 3 ? `<span class="tag-pill">+${item.tags.length - 3}</span>` : ''}
          </div>
        </div>
      `;

      card.addEventListener('click', () => openModal(item));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(item);
        }
      });

      fragment.appendChild(card);
    });

    usecaseGrid.appendChild(fragment);
    
    // Smooth grid fade-in
    usecaseGrid.style.opacity = '0';
    usecaseGrid.style.transform = 'translateY(8px)';
    
    requestAnimationFrame(() => {
      usecaseGrid.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      usecaseGrid.style.opacity = '1';
      usecaseGrid.style.transform = 'translateY(0)';
    });
  }

  // Modal Interactions
  function openModal(item) {
    modalTitle.textContent = item.title;
    modalDescription.textContent = item.description || '등록된 상세 설명이 없습니다.';
    modalCategory.textContent = translateCategory(item.category || 'General');
    modalCategory.className = `category-badge ${getCategoryClass(item.category)}`;
    
    // Set banner image or background
    if (item.image) {
      modalBanner.style.backgroundImage = `url('${item.image}')`;
      modalBanner.style.backgroundColor = 'transparent';
    } else {
      modalBanner.style.backgroundImage = 'none';
      modalBanner.style.backgroundColor = 'var(--bg-card)';
    }

    // Populate tags
    modalTags.innerHTML = (item.tags || []).map(tag => `<span class="tag-pill">${tag}</span>`).join('');
    
    // Command rendering (Slash commands)
    if (item.command) {
      modalCommand.textContent = item.command;
      modalCommandWrapper.style.display = 'block';
    } else {
      modalCommandWrapper.style.display = 'none';
    }

    // Populate insight if available
    if (item.insight) {
      modalInsight.textContent = item.insight;
      modalInsightSection.style.display = 'block';
    } else {
      modalInsightSection.style.display = 'none';
    }

    // Link setup
    if (item.url) {
      modalActionBtn.href = item.url;
      modalActionBtn.style.display = 'inline-flex';
    } else {
      modalActionBtn.style.display = 'none';
    }

    // Open Modal with Transition
    detailModal.style.display = 'flex';
    setTimeout(() => {
      detailModal.classList.add('open');
      modalCloseBtn.focus();
    }, 10);

    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    detailModal.classList.remove('open');
    setTimeout(() => {
      detailModal.style.display = 'none';
      document.body.style.overflow = '';
    }, 350);
  }

  modalCloseBtn.addEventListener('click', closeModal);
  
  detailModal.addEventListener('click', (e) => {
    if (!modalWrapper.contains(e.target)) {
      closeModal();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && detailModal.classList.contains('open')) {
      closeModal();
    }
  });

  // Search Input Event
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    searchClearBtn.style.display = searchQuery.length > 0 ? 'block' : 'none';
    renderGrid();
  });

  // Clear Search Button
  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    searchClearBtn.style.display = 'none';
    searchInput.focus();
    renderGrid();
  });

  // Reset Button
  resetFiltersBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    searchClearBtn.style.display = 'none';
    
    const tabs = filterTabsList.querySelectorAll('.filter-tab');
    tabs.forEach(t => t.classList.remove('active'));
    
    const allTab = document.getElementById('filter-all');
    if (allTab) allTab.classList.add('active');
    currentCategory = 'all';
    
    renderGrid();
  });

  // Collection switches
  collectionBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-collection');
      if (target === currentCollection) return;
      
      collectionBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      selectCollection(target);
    });
  });

  // Initialize App
  selectCollection('codex').then(() => {
    // Load plugin & anti metadata in the background to update count badges
    fetchOtherCollectionCount('plugin');
    fetchOtherCollectionCount('anti');
    fetchOtherCollectionCount('claude');
  });
});
