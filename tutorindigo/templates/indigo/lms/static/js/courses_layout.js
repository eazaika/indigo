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
