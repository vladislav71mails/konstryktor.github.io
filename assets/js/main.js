document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('.sidebar');
  const toggleBtn = document.querySelector('.toggle-sidebar-btn');
  const menuToggleMobile = document.querySelector('.menu-toggle');

  if (!sidebar) return;

  const savedState = localStorage.getItem('sidebarState');
  if (savedState === 'collapsed') {
    sidebar.classList.add('collapsed');
  }

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      sidebar.classList.toggle('collapsed');
      const isCollapsed = sidebar.classList.contains('collapsed');
      localStorage.setItem('sidebarState', isCollapsed ? 'collapsed' : 'expanded');
    });
  }

  if (menuToggleMobile) {
    menuToggleMobile.addEventListener('click', () => {
      sidebar.classList.toggle('active');
    });

    document.addEventListener('click', e => {
      if (window.innerWidth >= 1024) return;
      if (!sidebar.contains(e.target) && !menuToggleMobile.contains(e.target)) {
        sidebar.classList.remove('active');
      }
    });
  }
  // Открытие/закрытие модального окна дашборда
const openModalBtn = document.getElementById('openDashboardModal');
const modal = document.getElementById('dashboardModal');
const closeModal = document.getElementById('closeModal');
const createCustom = document.getElementById('createCustom');
const customForm = document.getElementById('customForm');
const cancelCustom = document.getElementById('cancelCustom');
const customModal = document.getElementById('customDashboardModal');

if (openModalBtn) {
  openModalBtn.addEventListener('click', () => {
    modal.classList.add('active');
  });
}

if (closeModal) {
  closeModal.addEventListener('click', () => {
    modal.classList.remove('active');
    customForm.classList.remove('active');
  });
}

if (createCustom) {
  createCustom.addEventListener('click', () => {
    modal.classList.remove('active');           // закрываем первое окно
    customModal.classList.add('active');        // открываем второе
  });
}

// Закрытие второго модального
const closeCustomModal = document.getElementById('closeCustomModal');
if (closeCustomModal) {
  closeCustomModal.addEventListener('click', () => {
    customModal.classList.remove('active');
  });
}

if (cancelCustom) {
  cancelCustom.addEventListener('click', () => {
    customModal.classList.remove('active');
  });
}

// Закрытие по клику вне области
customModal.addEventListener('click', e => {
  if (e.target === customModal) {
    customModal.classList.remove('active');
  }
});
});