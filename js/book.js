/* ==========================================================================
   Mastering Zephyr RTOS on STM32 - Shared Book Client Script
   Handles: Theme toggle, Board switcher, Search, Copy code, Quizzes, Lab persistence
   ========================================================================== */

(function () {
  'use strict';

  // --- Theme Management ---
  const THEME_KEY = 'zephyr_book_theme';
  function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    updateThemeIcon(next);
  }

  function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    btn.innerHTML = theme === 'dark' 
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    btn.title = theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode';
  }

  // --- Board Switcher Management ---
  const BOARD_KEY = 'zephyr_selected_board';
  function initBoard() {
    const savedBoard = localStorage.getItem(BOARD_KEY) || 'nucleo_f401re';
    const select = document.getElementById('board-selector');
    if (select) {
      select.value = savedBoard;
      select.addEventListener('change', function () {
        setBoard(this.value);
      });
    }
    applyBoardSelection(savedBoard);
  }

  function setBoard(boardId) {
    localStorage.setItem(BOARD_KEY, boardId);
    applyBoardSelection(boardId);
  }

  function applyBoardSelection(boardId) {
    // Show matching board-specific content and hide others
    document.querySelectorAll('[data-board-target]').forEach(el => {
      const targets = el.getAttribute('data-board-target').split(',');
      if (targets.includes(boardId) || targets.includes('all')) {
        el.style.display = '';
      } else {
        el.style.display = 'none';
      }
    });

    // Update dynamic command lines (e.g. west build -b <board>)
    document.querySelectorAll('.cmd-board-name').forEach(el => {
      el.textContent = boardId;
    });
  }

  // --- Reading Progress Tracker ---
  function initReadingProgress() {
    const progressBar = document.getElementById('reading-progress-bar');
    if (!progressBar) return;

    window.addEventListener('scroll', () => {
      const winScroll = document.documentElement.scrollTop || document.body.scrollTop;
      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const scrolled = height > 0 ? (winScroll / height) * 100 : 0;
      progressBar.style.width = scrolled + '%';
    });
  }

  // --- Mobile Sidebar Toggle ---
  function initSidebar() {
    const toggleBtn = document.getElementById('sidebar-toggle');
    const sidebar = document.getElementById('book-sidebar');
    if (toggleBtn && sidebar) {
      toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });

      // Close when clicking outside on mobile
      document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('open') && 
            !sidebar.contains(e.target) && 
            !toggleBtn.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      });
    }

    // Module collapse toggles
    document.querySelectorAll('.module-title-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const group = btn.closest('.nav-module-group');
        if (group) group.classList.toggle('collapsed');
      });
    });
  }

  // --- Code Copy Buttons ---
  function initCodeCopy() {
    document.querySelectorAll('.code-copy-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const container = btn.closest('.code-container');
        if (!container) return;
        const codeEl = container.querySelector('code') || container.querySelector('pre');
        if (!codeEl) return;

        try {
          await navigator.clipboard.writeText(codeEl.innerText);
          const originalText = btn.textContent;
          btn.textContent = 'Copied!';
          btn.style.color = '#10b981';
          setTimeout(() => {
            btn.textContent = originalText;
            btn.style.color = '';
          }, 2000);
        } catch (err) {
          console.error('Failed to copy', err);
        }
      });
    });
  }

  // --- Lab Checklists State Persistence ---
  function initLabChecklists() {
    const pageId = document.body.getAttribute('data-chapter-id') || window.location.pathname;
    const key = 'zephyr_lab_check_' + pageId;
    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(key) || '{}');
    } catch (e) {}

    document.querySelectorAll('.checklist-checkbox').forEach((checkbox, idx) => {
      if (saved[idx]) {
        checkbox.checked = true;
        const text = checkbox.closest('.checklist-item')?.querySelector('.checklist-text');
        if (text) text.classList.add('checked');
      }

      checkbox.addEventListener('change', () => {
        saved[idx] = checkbox.checked;
        localStorage.setItem(key, JSON.stringify(saved));
        const text = checkbox.closest('.checklist-item')?.querySelector('.checklist-text');
        if (text) {
          if (checkbox.checked) text.classList.add('checked');
          else text.classList.remove('checked');
        }
      });
    });
  }

  // --- Interactive Quiz Logic ---
  function initQuizzes() {
    document.querySelectorAll('.quiz-container').forEach(quiz => {
      const options = quiz.querySelectorAll('.quiz-option-btn');
      const feedback = quiz.querySelector('.quiz-feedback');

      options.forEach(btn => {
        btn.addEventListener('click', () => {
          // Reset previous states
          options.forEach(o => {
            o.classList.remove('correct', 'wrong');
            o.disabled = true;
          });

          const isCorrect = btn.getAttribute('data-correct') === 'true';
          if (isCorrect) {
            btn.classList.add('correct');
            if (feedback) {
              feedback.className = 'quiz-feedback show correct';
              feedback.innerHTML = '<strong>Correct!</strong> ' + (btn.getAttribute('data-explanation') || 'Well done!');
            }
          } else {
            btn.classList.add('wrong');
            // Highlight the correct one
            options.forEach(o => {
              if (o.getAttribute('data-correct') === 'true') o.classList.add('correct');
            });
            if (feedback) {
              feedback.className = 'quiz-feedback show wrong';
              feedback.innerHTML = '<strong>Incorrect.</strong> ' + (btn.getAttribute('data-explanation') || 'Review the chapter section above for clarification.');
            }
          }
        });
      });
    });
  }

  // --- Search System Across All Chapters ---
  const CHAPTERS_INDEX = [
    { title: "Course Overview & Learning Roadmap", url: "index.html", tags: "intro overview roadmap stm32 zephyr" },
    { title: "Module 1: Foundations & Toolchain Setup", url: "chapters/ch01-foundations-toolchain.html", tags: "toolchain west sdk st-link blinky vcp usart f401re g071rb l476rg" },
    { title: "Module 2: DeviceTree & Kconfig Deep Dive", url: "chapters/ch02-devicetree-kconfig.html", tags: "dts devicetree bindings overlay aliases prj.conf kconfig gpio pinmux" },
    { title: "Module 3: Zephyr Kernel Fundamentals", url: "chapters/ch03-kernel-threads-sync.html", tags: "kernel threads semaphores mutexes queues k_msgq k_fifo isr nvic priorities" },
    { title: "Module 4: STM32 Peripherals & Drivers", url: "chapters/ch04-stm32-peripherals.html", tags: "peripherals gpio uart async dma i2c bmp280 spi pwm adc low-power pm" },
    { title: "Module 5: Subsystems & Industrial Protocols", url: "chapters/ch05-shell-connectivity.html", tags: "shell logging can bus bxcan fdcan bluetooth ble sensors" },
    { title: "Module 6: Production Engineering & Capstone", url: "chapters/ch06-production-capstone.html", tags: "mcuboot twister ztest openocd gdb watchdog capstone industrial" },
    { title: "Zephyr GUI Hardware Studio & AI Generator", url: "chapters/gui-ai-studio.html", tags: "gui configurator ai prompt studio visual overlay dts kconfig synthesize" },
    { title: "References, Specifications & Documentation", url: "chapters/references.html", tags: "references documentation bibliography datasheets stm32 zephyr manuals arm cortex posix" }
  ];

  function initSearch() {
    const searchInputs = [document.getElementById('header-search'), document.getElementById('modal-search-input')];
    const modal = document.getElementById('search-modal-overlay');
    const resultsContainer = document.getElementById('search-results');
    const closeBtn = document.getElementById('close-search-modal');

    function openModal(query = '') {
      if (!modal) return;
      modal.classList.add('active');
      const input = document.getElementById('modal-search-input');
      if (input) {
        input.value = query;
        input.focus();
        runSearch(query);
      }
    }

    function closeModal() {
      if (modal) modal.classList.remove('active');
    }

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    }

    // Ctrl+K / Cmd+K shortcut
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        openModal();
      }
      if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
        closeModal();
      }
    });

    const headerSearch = document.getElementById('header-search');
    if (headerSearch) {
      headerSearch.addEventListener('click', () => openModal());
      headerSearch.addEventListener('focus', () => openModal());
    }

    const modalInput = document.getElementById('modal-search-input');
    if (modalInput) {
      modalInput.addEventListener('input', (e) => {
        runSearch(e.target.value);
      });
    }

    function runSearch(query) {
      if (!resultsContainer) return;
      const clean = query.trim().toLowerCase();
      if (!clean) {
        resultsContainer.innerHTML = '<li style="padding:1rem;color:var(--text-muted);text-align:center;">Type keywords to search across all book chapters...</li>';
        return;
      }

      // Determine relative path prefix depending on if we are in /chapters/ or root
      const isInChapters = window.location.pathname.includes('/chapters/');
      const prefix = isInChapters ? '../' : '';

      const matched = CHAPTERS_INDEX.filter(item => 
        item.title.toLowerCase().includes(clean) || item.tags.toLowerCase().includes(clean)
      );

      if (matched.length === 0) {
        resultsContainer.innerHTML = '<li style="padding:1rem;color:var(--text-muted);text-align:center;">No chapters found matching "' + escapeHtml(query) + '"</li>';
        return;
      }

      resultsContainer.innerHTML = matched.map(m => {
        let dest = m.url;
        if (isInChapters) {
          dest = m.url.startsWith('chapters/') ? m.url.replace('chapters/', '') : '../' + m.url;
        }
        return `
          <li class="search-result-item" onclick="window.location.href='${dest}'">
            <div class="search-result-title">${escapeHtml(m.title)}</div>
            <div class="search-result-snippet">Tags: ${escapeHtml(m.tags)}</div>
          </li>
        `;
      }).join('');
    }
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // --- Global Initialization ---
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    initBoard();
    initReadingProgress();
    initSidebar();
    initCodeCopy();
    initLabChecklists();
    initQuizzes();
    initSearch();
  });
})();
