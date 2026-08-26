(function(define) {
    'use strict';

    define(['jquery', 'underscore', 'backbone', 'gettext',
        'js/discovery/models/search_state', 'js/discovery/collections/filters',
        'js/discovery/views/search_form', 'js/discovery/views/courses_listing',
        'js/discovery/views/courses_pagination'
        ],
        function($, _, Backbone, gettext, SearchState, Filters, SearchForm, CoursesListing, CoursesPagination) {
            var LANG_NAMES = {
                ru: 'Русский',
                en: 'English',
                fr: 'Français',
                es: 'Español',
                pt: 'Português'
            };

            return function(meanings, searchQuery, userLanguage, userTimezone) {
                var dispatcher = _.extend({}, Backbone.Events);
                var search = new SearchState();
                var filters = new Filters();
                var form = new SearchForm();
                var listing;
                var pagination;
                var initialCoursesHtml;
                var $serverPagination = $('.courses-pagination-server');
                var $discoveryPagination = $('.courses-pagination-discovery');
                var $toggle = $('#discovery-filters-toggle');
                var $selects = $('.discovery-filter-select');
                var courseListingModel = search.discovery;
                var resizeTimer;
                var facetsLoaded = false;

                function applyResponsivePageSize() {
                    var pageSize = 20;
                    if (window.OliveCoursesLayout && window.OliveCoursesLayout.getPageSize) {
                        pageSize = window.OliveCoursesLayout.getPageSize();
                    }
                    if (search.pageSize !== pageSize) {
                        search.pageSize = pageSize;
                        search.cached = null;
                    }
                    return pageSize;
                }

                applyResponsivePageSize();

                courseListingModel.userPreferences = {
                    userLanguage: userLanguage,
                    userTimezone: userTimezone
                };
                listing = new CoursesListing({model: courseListingModel});
                pagination = new CoursesPagination({search: search});
                if ($discoveryPagination.length) {
                    pagination.setElement($discoveryPagination);
                }
                initialCoursesHtml = listing.$list.html();

                function showServerPagination() {
                    $serverPagination.show();
                    $discoveryPagination.hide();
                }

                function restoreAllCourses() {
                    listing.$list.html(initialCoursesHtml);
                    form.$message.empty();
                    showServerPagination();
                    form.hideLoadingIndicator();
                }

                function facetLabel(facet, term) {
                    var mapped;
                    if (meanings && meanings[facet] && meanings[facet].terms && meanings[facet].terms[term]) {
                        return meanings[facet].terms[term];
                    }
                    if (facet === 'language') {
                        mapped = LANG_NAMES[term] || LANG_NAMES[String(term).toLowerCase()];
                        if (mapped) {
                            return mapped;
                        }
                    }
                    return term;
                }

                function eachTerm(terms, callback) {
                    if (_.isArray(terms)) {
                        _.each(terms, function(item) {
                            callback(item.count, item.term || item.key);
                        });
                    } else {
                        _.each(terms, callback);
                    }
                }

                function populateSelect($select, terms) {
                    var current = $select.val();
                    var existing = {};
                    var options = [];
                    $select.find('option').each(function() {
                        existing[this.value] = true;
                    });
                    eachTerm(terms, function(count, term) {
                        if (term && !existing[term]) {
                            existing[term] = true;
                            options.push({term: term, label: facetLabel($select.data('facet'), term)});
                        }
                    });
                    if (!options.length) {
                        return false;
                    }
                    options.sort(function(a, b) {
                        return a.label.localeCompare(b.label, undefined, {sensitivity: 'base'});
                    });
                    _.each(options, function(option) {
                        $select.append($('<option></option>').val(option.term).text(option.label));
                    });
                    if (current) {
                        $select.val(current);
                    }
                    return true;
                }

                function populateFromAggs(aggs) {
                    if (!aggs) {
                        return;
                    }
                    $selects.each(function() {
                        var facet = $(this).data('facet');
                        var bucket = aggs[facet];
                        if (bucket && bucket.terms) {
                            populateSelect($(this), bucket.terms);
                        }
                    });
                    facetsLoaded = true;
                }

                function populateFromMeanings() {
                    if (!meanings) {
                        return;
                    }
                    $selects.each(function() {
                        var facet = $(this).data('facet');
                        var terms = meanings[facet] && meanings[facet].terms;
                        if (terms) {
                            populateSelect($(this), terms);
                        }
                    });
                    facetsLoaded = true;
                }

                function loadFacetOptions() {
                    if (facetsLoaded) {
                        return;
                    }
                    $.ajax({
                        url: '/search/course_discovery/',
                        type: 'POST',
                        data: {
                            search_string: '',
                            page_size: 1,
                            page_index: 0
                        }
                    }).done(function(response) {
                        populateFromAggs(response && response.aggs);
                    });
                }

                function syncFiltersFromSelects() {
                    filters.reset();
                    $selects.each(function() {
                        var $select = $(this);
                        var value = $select.val();
                        if (value) {
                            filters.add({
                                type: $select.data('facet'),
                                query: value,
                                name: $select.find('option:selected').text()
                            });
                        }
                    });
                    $toggle.toggleClass('is-active', !filters.isEmpty());
                }

                function hasActiveQuery() {
                    return !!$.trim(form.$searchField.val()) || !filters.isEmpty();
                }

                function runQuery() {
                    var query = $.trim(form.$searchField.val());
                    applyResponsivePageSize();
                    if (!hasActiveQuery()) {
                        restoreAllCourses();
                        return;
                    }
                    $serverPagination.hide();
                    form.showLoadingIndicator();
                    search.performSearch(query, filters.getTerms());
                }

                dispatcher.listenTo(form, 'search', function() {
                    syncFiltersFromSelects();
                    runQuery();
                });

                $(document).on('leti:discovery-filters-open', loadFacetOptions);

                $(document).on('change', '.discovery-filter-select', function() {
                    syncFiltersFromSelects();
                    runQuery();
                });

                dispatcher.listenTo(pagination, 'paginate', function() {
                    form.showLoadingIndicator();
                });

                dispatcher.listenTo(search, 'pageChanged', function(query, total, pageIndex) {
                    if (pageIndex === 0) {
                        if (total > 0) {
                            form.showFoundMessage(total);
                        } else if (hasActiveQuery()) {
                            form.$message.text(gettext('We couldn\'t find any results.'));
                        } else {
                            form.$message.empty();
                        }
                    }
                    form.hideLoadingIndicator();
                    listing.render();
                    $serverPagination.hide();
                    pagination.update(search.page, search.getTotalPages());
                    if (pageIndex > 0) {
                        $('html, body').animate({
                            scrollTop: $('.find-courses').offset().top - 20
                        }, 200);
                    }
                });

                dispatcher.listenTo(search, 'error', function() {
                    if (!hasActiveQuery()) {
                        restoreAllCourses();
                        return;
                    }
                    form.showErrorMessage(search.errorMessage);
                    form.hideLoadingIndicator();
                });

                $(window).on('resize orientationchange', function() {
                    window.clearTimeout(resizeTimer);
                    resizeTimer = window.setTimeout(function() {
                        var previous = search.pageSize;
                        var next = applyResponsivePageSize();
                        if (previous !== next && hasActiveQuery()) {
                            search.performSearch($.trim(form.$searchField.val()), filters.getTerms());
                        }
                    }, 200);
                });

                populateFromMeanings();
                if ($.trim(searchQuery)) {
                    form.doSearch(searchQuery);
                }
            };
        });
}(define || RequireJS.define));
