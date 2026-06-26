/* ========================================
   企业网站全局交互脚本
   ======================================== */

document.addEventListener('DOMContentLoaded', () => {

  // ===== 移动端菜单切换 =====
  const menuToggle = document.querySelector('.menu-toggle');
  const navList = document.querySelector('.nav-list');

  if (menuToggle && navList) {
    menuToggle.addEventListener('click', () => {
      menuToggle.classList.toggle('active');
      navList.classList.toggle('open');
    });

    // 点击导航链接后关闭菜单
    navList.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuToggle.classList.remove('active');
        navList.classList.remove('open');
      });
    });

    // 点击菜单外部关闭
    document.addEventListener('click', (e) => {
      if (!menuToggle.contains(e.target) && !navList.contains(e.target)) {
        menuToggle.classList.remove('active');
        navList.classList.remove('open');
      }
    });
  }

  // ===== 当前页面导航高亮 =====
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav-list a');
  navLinks.forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // ===== Header 滚动阴影 =====
  const header = document.querySelector('.header');
  let lastScrollY = 0;

  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (scrollY > 10) {
      header.style.boxShadow = '0 2px 12px rgba(0, 0, 0, 0.08)';
    } else {
      header.style.boxShadow = 'none';
    }
    lastScrollY = scrollY;
  }, { passive: true });

  // ===== 联系表单验证 =====
  const contactForm = document.getElementById('contact-form');

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();

      let isValid = true;

      // 清除之前的错误
      contactForm.querySelectorAll('.error-message').forEach(el => el.classList.remove('show'));
      contactForm.querySelectorAll('.error').forEach(el => el.classList.remove('error'));

      // 姓名验证
      const name = contactForm.querySelector('#name');
      if (!name.value.trim()) {
        showError(name, '请输入您的姓名');
        isValid = false;
      }

      // 邮箱验证
      const email = contactForm.querySelector('#email');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email.value.trim()) {
        showError(email, '请输入您的邮箱');
        isValid = false;
      } else if (!emailRegex.test(email.value.trim())) {
        showError(email, '请输入有效的邮箱地址');
        isValid = false;
      }

      // 主题验证
      const subject = contactForm.querySelector('#subject');
      if (!subject.value.trim()) {
        showError(subject, '请输入消息主题');
        isValid = false;
      }

      // 消息验证
      const message = contactForm.querySelector('#message');
      if (!message.value.trim()) {
        showError(message, '请输入您的消息');
        isValid = false;
      } else if (message.value.trim().length < 10) {
        showError(message, '消息内容至少需要10个字符');
        isValid = false;
      }

      if (isValid) {
        // 模拟提交成功
        const formContent = contactForm.querySelector('.form-content');
        const formSuccess = contactForm.querySelector('.form-success');

        formContent.style.display = 'none';
        formSuccess.classList.add('show');

        // 3 秒后重置（实际项目中这里会发送 AJAX 请求）
        setTimeout(() => {
          contactForm.reset();
          formContent.style.display = 'block';
          formSuccess.classList.remove('show');
        }, 3000);
      }
    });
  }

  function showError(input, message) {
    input.classList.add('error');
    const errorEl = input.parentElement.querySelector('.error-message');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.classList.add('show');
    }
  }

  // ===== 滚动渐显动画（简单版） =====
  const animatedElements = document.querySelectorAll('[data-animate]');

  if (animatedElements.length > 0) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    animatedElements.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
      observer.observe(el);
    });
  }

});
