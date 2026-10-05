/**
 * Responsive course catalog / homepage layout helper.
 *
 * Homepage:
 *   Phone portrait:  7 courses, 1 column
 *   Phone landscape: 12 courses, 3 columns
 *   Tablet portrait: 12 courses, 3 columns
 *   Tablet landscape / Desktop: 15 courses, 3 columns
 *
 * Catalog (/courses) — original sizes:
 *   Phone portrait:  7 courses, 1 column
 *   Phone landscape: 12 courses, 3 columns
 *   Tablet portrait: 12 courses, 3 columns
 *   Tablet landscape: 16 courses, 4 columns
 *   Desktop:         20 courses, 4 columns
 */
(function(window) {
    'use strict';

    var HOME_PAGE_SIZES = [7, 12, 15];
    var CATALOG_PAGE_SIZES = [7, 12, 16, 20];

    function viewportMeta() {
        var width = window.innerWidth || document.documentElement.clientWidth;
        var height = window.innerHeight || document.documentElement.clientHeight;
        var landscape = width > height;
        var phoneLandscape = landscape && height <= 500;
        return {
            width: width,
            height: height,
            landscape: landscape,
            phoneLandscape: phoneLandscape
        };
    }

    function getHomepageLayout() {
        var v = viewportMeta();

        if (v.phoneLandscape) {
            return {pageSize: 12, columns: 3, mode: 'phone-landscape'};
        }
        if (v.width < 768) {
            return v.landscape
                ? {pageSize: 12, columns: 3, mode: 'phone-landscape'}
                : {pageSize: 7, columns: 1, mode: 'phone-portrait'};
        }
        if (v.width < 1200) {
            return v.landscape
                ? {pageSize: 15, columns: 3, mode: 'tablet-landscape'}
                : {pageSize: 12, columns: 3, mode: 'tablet-portrait'};
        }
        return {pageSize: 15, columns: 3, mode: 'desktop'};
    }

    function getCatalogLayout() {
        var v = viewportMeta();

        if (v.phoneLandscape) {
            return {pageSize: 12, columns: 3, mode: 'phone-landscape'};
        }
        if (v.width < 768) {
            return v.landscape
                ? {pageSize: 12, columns: 3, mode: 'phone-landscape'}
                : {pageSize: 7, columns: 1, mode: 'phone-portrait'};
        }
        if (v.width < 1200) {
            return v.landscape
                ? {pageSize: 16, columns: 4, mode: 'tablet-landscape'}
                : {pageSize: 12, columns: 3, mode: 'tablet-portrait'};
        }
        return {pageSize: 20, columns: 4, mode: 'desktop'};
    }

    // Back-compat for anything still calling getLayout()
    function getCoursesLayout() {
        if (document.querySelector('.home .courses-listing')) {
            return getHomepageLayout();
        }
        return getCatalogLayout();
    }

    function getCoursesPageSize() {
        return getCoursesLayout().pageSize;
    }

    function syncCatalogPageSize() {
        var layout = getCatalogLayout();
        var params = new URLSearchParams(window.location.search);
        var current = parseInt(params.get('page_size'), 10);
        var searching = !!(params.get('search_query') || '').trim();

        if (searching) {
            return layout;
        }

        if (CATALOG_PAGE_SIZES.indexOf(current) === -1 || current !== layout.pageSize) {
            params.set('page_size', String(layout.pageSize));
            if (!params.get('page')) {
                params.set('page', '1');
            } else if (current !== layout.pageSize) {
                params.set('page', '1');
            }
            var next = window.location.pathname + '?' + params.toString();
            if (next !== window.location.pathname + window.location.search) {
                window.location.replace(next);
            }
        }
        return layout;
    }

    function limitHomepageCourses() {
        var list = document.querySelector('.home .courses-listing');
        if (!list) {
            return;
        }
        var layout = getHomepageLayout();
        var items = list.querySelectorAll('.courses-listing-item');
        var i;
        for (i = 0; i < items.length; i += 1) {
            items[i].style.display = i < layout.pageSize ? '' : 'none';
        }
        list.setAttribute('data-courses-layout', layout.mode);
        list.setAttribute('data-courses-page-size', String(layout.pageSize));
    }

    function onReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    function enhanceDiscoverySelects() {
        var openWidget = null;

        function closeWidget(widget) {
            if (!widget) {
                return;
            }
            widget.classList.remove('is-open');
            widget.list.hidden = true;
            widget.button.setAttribute('aria-expanded', 'false');
            if (openWidget === widget) {
                openWidget = null;
            }
        }

        function closeAll() {
            if (openWidget) {
                closeWidget(openWidget);
            }
        }

        function selectedLabel(select) {
            var option = select.options[select.selectedIndex];
            return option ? option.textContent : '';
        }

        function rebuildList(widget) {
            var select = widget.select;
            var list = widget.list;
            var current = select.value;
            list.innerHTML = '';
            Array.prototype.forEach.call(select.options, function(option) {
                var item = document.createElement('li');
                item.setAttribute('role', 'option');
                item.dataset.value = option.value;
                item.textContent = option.textContent;
                if (option.value === current) {
                    item.classList.add('is-selected');
                    item.setAttribute('aria-selected', 'true');
                }
                item.addEventListener('click', function(event) {
                    event.preventDefault();
                    event.stopPropagation();
                    if (select.value !== option.value) {
                        select.value = option.value;
                        if (window.jQuery) {
                            window.jQuery(select).trigger('change');
                        } else {
                            select.dispatchEvent(new Event('change', {bubbles: true}));
                        }
                    }
                    widget.button.textContent = option.textContent;
                    rebuildList(widget);
                    closeWidget(widget);
                });
                list.appendChild(item);
            });
            widget.button.textContent = selectedLabel(select);
        }

        Array.prototype.forEach.call(document.querySelectorAll('.discovery-filter-select'), function(select) {
            if (select.dataset.customSelect === '1') {
                return;
            }
            select.dataset.customSelect = '1';
            select.classList.add('discovery-filter-select-native');
            select.setAttribute('tabindex', '-1');
            select.setAttribute('aria-hidden', 'true');

            var wrap = document.createElement('div');
            wrap.className = 'discovery-custom-select';
            select.parentNode.insertBefore(wrap, select);
            wrap.appendChild(select);

            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'discovery-custom-select-toggle';
            button.id = select.id + '-toggle';
            button.setAttribute('aria-haspopup', 'listbox');
            button.setAttribute('aria-expanded', 'false');

            var list = document.createElement('ul');
            list.className = 'discovery-custom-select-list';
            list.setAttribute('role', 'listbox');
            list.hidden = true;

            var label = document.querySelector('label[for="' + select.id + '"]');
            if (label) {
                label.setAttribute('for', button.id);
            }

            wrap.appendChild(button);
            wrap.appendChild(list);

            var widget = {
                wrap: wrap,
                select: select,
                button: button,
                list: list
            };

            function open() {
                if (openWidget && openWidget !== widget) {
                    closeWidget(openWidget);
                }
                rebuildList(widget);
                wrap.classList.add('is-open');
                list.hidden = false;
                button.setAttribute('aria-expanded', 'true');
                openWidget = widget;
                var selected = list.querySelector('.is-selected');
                if (selected && selected.scrollIntoView) {
                    selected.scrollIntoView({block: 'nearest'});
                }
            }

            button.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                if (wrap.classList.contains('is-open')) {
                    closeWidget(widget);
                } else {
                    open();
                }
            });

            select.addEventListener('change', function() {
                widget.button.textContent = selectedLabel(select);
                if (wrap.classList.contains('is-open')) {
                    rebuildList(widget);
                }
            });

            if (window.MutationObserver) {
                new window.MutationObserver(function() {
                    widget.button.textContent = selectedLabel(select);
                    if (wrap.classList.contains('is-open')) {
                        rebuildList(widget);
                    }
                }).observe(select, {childList: true, subtree: true});
            }

            rebuildList(widget);
        });

        document.addEventListener('click', closeAll);
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape') {
                closeAll();
            }
        });

        var filterCheckbox = document.getElementById('discovery-filters-cb');
        if (filterCheckbox) {
            filterCheckbox.addEventListener('change', function() {
                if (!filterCheckbox.checked) {
                    closeAll();
                }
            });
        }
    }

    window.OliveCoursesLayout = {
        getLayout: getCoursesLayout,
        getHomepageLayout: getHomepageLayout,
        getCatalogLayout: getCatalogLayout,
        getPageSize: getCoursesPageSize,
        syncCatalogPageSize: syncCatalogPageSize,
        limitHomepageCourses: limitHomepageCourses,
        ALLOWED_PAGE_SIZES: CATALOG_PAGE_SIZES,
        HOME_PAGE_SIZES: HOME_PAGE_SIZES,
        CATALOG_PAGE_SIZES: CATALOG_PAGE_SIZES
    };

    onReady(function() {
        if (document.querySelector('.find-courses')) {
            enhanceDiscoverySelects();
            var filterCheckbox = document.getElementById('discovery-filters-cb');
            if (filterCheckbox) {
                filterCheckbox.addEventListener('change', function() {
                    if (filterCheckbox.checked && window.jQuery) {
                        window.jQuery(document).trigger('leti:discovery-filters-open');
                    }
                });
            }
            syncCatalogPageSize();

            var resizeTimer;
            window.addEventListener('resize', function() {
                window.clearTimeout(resizeTimer);
                resizeTimer = window.setTimeout(function() {
                    syncCatalogPageSize();
                }, 250);
            });
            window.addEventListener('orientationchange', function() {
                window.setTimeout(syncCatalogPageSize, 300);
            });
        }
        if (document.querySelector('.home .courses-listing')) {
            limitHomepageCourses();
            var homeResizeTimer;
            window.addEventListener('resize', function() {
                window.clearTimeout(homeResizeTimer);
                homeResizeTimer = window.setTimeout(limitHomepageCourses, 150);
            });
            window.addEventListener('orientationchange', function() {
                window.setTimeout(limitHomepageCourses, 200);
            });
        }
    });
}(window));
