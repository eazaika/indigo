/**
 * LMS course tabs overflow — mirrors Learning MFE Tabs + useIndexOfLastVisibleChild.
 *
 * Structure (like Learning):
 *   .leti-course-tabs-navigation > .__inner > nav.leti-course-tabs
 *     > a[data-leti-tab].nav-link  (direct children)
 *     > [data-leti-tabs-more]
 *
 * Available width comes from the inner container (viewport-constrained), NOT from
 * the sum of tab widths — otherwise the bar grows and nothing ever overflows.
 */
(function (window, document) {
  'use strict';

  var NAV_SELECTOR = 'nav[data-leti-course-tabs], nav.leti-course-tabs';

  function applyInvisible(el, on) {
    if (!el) {
      return;
    }
    if (on) {
      // Same idea as Learning invisibleStyle: keep width for future measures,
      // remove from flex flow / a11y / pointer events.
      el.style.position = 'absolute';
      el.style.left = '0';
      el.style.pointerEvents = 'none';
      el.style.visibility = 'hidden';
      el.setAttribute('aria-hidden', 'true');
    } else {
      el.style.position = '';
      el.style.left = '';
      el.style.pointerEvents = '';
      el.style.visibility = '';
      el.removeAttribute('aria-hidden');
    }
  }

  function floorWidth(el) {
    return Math.floor(el.getBoundingClientRect().width);
  }

  function availableWidth(nav) {
    var inner = nav.parentElement;
    var widths = [];
    if (inner) {
      widths.push(inner.clientWidth);
      widths.push(floorWidth(inner));
    }
    widths.push(nav.clientWidth);
    widths.push(floorWidth(nav));
    // Never trust a width larger than the viewport (bar expanded with content).
    var viewportCap = Math.max(0, (window.innerWidth || document.documentElement.clientWidth) - 32);
    widths.push(viewportCap);

    var positive = widths.filter(function (w) {
      return typeof w === 'number' && w > 0;
    });
    return positive.length ? Math.min.apply(null, positive) : viewportCap;
  }

  function rebuild(nav) {
    var more = nav.querySelector('[data-leti-tabs-more]');
    if (!more) {
      return;
    }

    var menu = more.querySelector('.dropdown-menu');
    var tabs = Array.prototype.slice.call(nav.querySelectorAll('[data-leti-tab]'));
    if (!tabs.length) {
      applyInvisible(more, true);
      return;
    }

    // Reset before measuring (all tabs + More in layout).
    tabs.forEach(function (tab) {
      applyInvisible(tab, false);
    });
    applyInvisible(more, false);
    if (menu) {
      menu.innerHTML = '';
    }

    // Force a layout pass so widths are current after reset.
    // eslint-disable-next-line no-unused-expressions
    nav.offsetWidth;

    var containerWidth = availableWidth(nav);
    var sumWidth = floorWidth(more);
    var lastVisible = -1;
    var i;

    for (i = 0; i < tabs.length; i += 1) {
      sumWidth += floorWidth(tabs[i]);
      if (sumWidth <= containerWidth) {
        lastVisible = i;
      }
    }

    if (lastVisible + 1 >= tabs.length) {
      applyInvisible(more, true);
      return;
    }

    for (i = 0; i < tabs.length; i += 1) {
      if (i <= lastVisible) {
        continue;
      }
      applyInvisible(tabs[i], true);
      if (menu) {
        var item = document.createElement('a');
        item.className = 'dropdown-item' + (tabs[i].classList.contains('active') ? ' active' : '');
        item.href = tabs[i].getAttribute('href') || '#';
        item.textContent = (tabs[i].textContent || '').replace(/\s+,.*$/, '').trim();
        menu.appendChild(item);
      }
    }
  }

  function bind(nav) {
    if (nav.getAttribute('data-leti-tabs-bound') === '1') {
      rebuild(nav);
      return;
    }
    nav.setAttribute('data-leti-tabs-bound', '1');

    var scheduled = false;
    function schedule() {
      if (scheduled) {
        return;
      }
      scheduled = true;
      window.requestAnimationFrame(function () {
        scheduled = false;
        rebuild(nav);
      });
    }

    rebuild(nav);
    // Second pass after fonts/layout settle
    window.setTimeout(function () {
      rebuild(nav);
    }, 100);

    window.addEventListener('resize', schedule);
    if (window.ResizeObserver) {
      var ro = new window.ResizeObserver(schedule);
      if (nav.parentElement) {
        ro.observe(nav.parentElement);
      }
      ro.observe(nav);
    }
  }

  function init() {
    var nodes = document.querySelectorAll(NAV_SELECTOR);
    Array.prototype.forEach.call(nodes, bind);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.letiCourseTabs = { init: init, rebuild: rebuild };
}(window, document));
