/* ========================================
   企业网站全局交互脚本
   ======================================== */

// ===== 设备检测 & 自动跳转 =====
(function() {
  // 如果 URL 带 ?from=mobile，说明用户手动选了手机版，存偏好
  if (location.search.indexOf('from=mobile') !== -1) {
    localStorage.setItem('viewPreference', 'mobile');
    // 清理 URL 参数
    history.replaceState(null, '', location.pathname);
    return;
  }

  var pref = localStorage.getItem('viewPreference');
  if (pref === 'desktop') return; // 用户明确选了桌面版，不跳转

  var ua = navigator.userAgent;
  var isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) ||
                 (navigator.maxTouchPoints > 1 && window.innerWidth < 1024);

  if (isMobile && pref !== 'desktop') {
    // 当前是桌面版页面，跳到对应语言手机版
    var path = location.pathname;
    var mobileUrl;
    if (path.indexOf('/en/') !== -1) {
      mobileUrl = location.origin + path.replace(/\/en\/.*/, '/mobile/en.html');
    } else {
      mobileUrl = location.origin + path.replace(/\/cn\/.*/, '/mobile/cn.html').replace(/\/index\.html$/, '/mobile/cn.html');
    }
    if (mobileUrl !== location.href) {
      location.replace(mobileUrl);
    }
  }
})();

// ===== IP 地理位置检测 & 语言跳转 =====
(function() {
  var OVERRIDE_KEY = 'everquick_lang_override';
  var STATS_KEY = 'everquick_visit_stats';

  // 如果用户之前手动选择了语言，不再自动跳转
  var langOverride = localStorage.getItem(OVERRIDE_KEY);
  if (langOverride) return;

  // 如果 URL 带 ?lang= 参数，记录偏好后不再跳转
  var urlParams = new URLSearchParams(location.search);
  if (urlParams.get('lang') === 'cn') {
    localStorage.setItem(OVERRIDE_KEY, 'cn');
    history.replaceState(null, '', location.pathname);
    return;
  }
  if (urlParams.get('lang') === 'en') {
    localStorage.setItem(OVERRIDE_KEY, 'en');
    history.replaceState(null, '', location.pathname);
    return;
  }

  // 调用免费 IP 地理位置 API
  fetch('https://geolocation-db.com/json/')
    .then(function(res) { return res.json(); })
    .then(function(data) {
      var country = data.country_code;
      if (!country) return;

      var currentPath = location.pathname;
      var isCN = currentPath.indexOf('/cn/') !== -1;
      var isEN = currentPath.indexOf('/en/') !== -1;

      // 中国访客在英文页 → 跳转到中文页
      if (country === 'CN' && isEN) {
        var cnPath = currentPath.replace('/en/', '/cn/');
        location.replace(cnPath);
        return;
      }
      // 海外访客在中文页 → 跳转到英文页
      if (country !== 'CN' && country !== '' && isCN) {
        var enPath = currentPath.replace('/cn/', '/en/');
        location.replace(enPath);
        return;
      }

      // 未跳转，存储地理位置信息供统计栏使用
      sessionStorage.setItem('everquick_geo', JSON.stringify({
        ip: data.IPv4,
        country: data.country_name,
        countryCode: data.country_code,
        city: data.city || '',
        timestamp: Date.now()
      }));
    })
    .catch(function() {
      // API 调用失败时不做跳转，统计栏使用本地计数
    });
})();

// ===== 访客统计栏注入函数 =====
function injectVisitorStats() {
  var STATS_KEY = 'everquick_visit_stats';
  var OVERRIDE_KEY = 'everquick_lang_override';

  // 更新访问计数
  var stats = JSON.parse(localStorage.getItem(STATS_KEY) || '{"count":0,"firstVisit":""}');
  stats.count += 1;
  if (!stats.firstVisit) {
    var now = new Date();
    stats.firstVisit = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0');
  }
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));

  // 读取地理位置信息
  var geoData = null;
  try {
    geoData = JSON.parse(sessionStorage.getItem('everquick_geo'));
  } catch(e) {}

  var isCNPath = location.pathname.indexOf('/cn/') !== -1 || location.pathname === '/' || location.pathname.indexOf('/mobile/cn') !== -1;
  var isChinese = isCNPath;

  // 构建统计栏 HTML
  var bar = document.createElement('div');
  bar.className = 'visitor-bar';
  bar.style.cssText = 'background:#0b1622;color:#8899aa;text-align:center;padding:14px 20px;font-size:13px;display:flex;align-items:center;justify-content:center;gap:24px;flex-wrap:wrap;border-top:1px solid #1a2a3a;';

  var items = [];

  // IP 信息
  if (geoData && geoData.ip) {
    items.push('<span>🌐 ' + (isChinese ? '您的IP' : 'Your IP') + ': <strong style="color:#c0d0e0;">' + geoData.ip + '</strong></span>');
  }

  // 国家/城市
  if (geoData && geoData.country) {
    var locText = '📍 ' + geoData.country;
    if (geoData.city) locText += ', ' + geoData.city;
    items.push('<span>' + locText + '</span>');
  }

  // 访问次数
  items.push('<span>👁 ' + (isChinese ? '您是第' : 'Visit #') + ' <strong style="color:#d69e2e;">' + stats.count + '</strong> ' + (isChinese ? '次访问本站' : '') + '</span>');

  // 首次访问日期
  if (stats.firstVisit) {
    items.push('<span style="opacity:0.6;font-size:11px;">' + (isChinese ? '首次访问' : 'First visit') + ': ' + stats.firstVisit + '</span>');
  }

  // 语言覆盖提示
  var langOverride = localStorage.getItem(OVERRIDE_KEY);
  if (langOverride) {
    items.push('<span style="opacity:0.6;font-size:11px;">' + (isChinese ? '已手动选择语言' : 'Language manually selected') + '</span>');
  }

  bar.innerHTML = items.join('');

  // 插入到 body 最后
  document.body.appendChild(bar);
}

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

  // ===== 访客统计 & IP识别 & 自动语言跳转 =====
  // 用户手动点击语言切换后记住偏好
  document.addEventListener('click', function(e) {
    var link = e.target.closest('.lang-switch a');
    if (link) {
      var href = link.getAttribute('href');
      if (href.indexOf('/cn/') !== -1) {
        localStorage.setItem('everquick_lang_override', 'cn');
      } else if (href.indexOf('/en/') !== -1) {
        localStorage.setItem('everquick_lang_override', 'en');
      }
    }
  });

  // 注入访客统计栏
  injectVisitorStats();

});
