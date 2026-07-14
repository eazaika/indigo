(function(define) {
    'use strict';

    define(['jquery', 'backbone', 'js/discovery/models/search_state', 'js/discovery/collections/filters',
        'js/discovery/views/search_form', 'js/discovery/views/courses_listing',
        'js/discovery/views/courses_pagination'
        // Расширенный поиск — раскомментировать для включения фильтров и фасетов:
        // , 'js/discovery/views/filter_bar', 'js/discovery/views/refine_sidebar'
        ],
        function($, Backbone, SearchState, Filters, SearchForm, CoursesListing, CoursesPagination
            // , FilterBar, RefineSidebar
        ) {
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
                var courseListingModel = search.discovery;

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

                dispatcher.listenTo(form, 'search', function(query) {
                    if (!$.trim(query)) {
                        restoreAllCourses();
                        return;
                    }
                    $serverPagination.hide();
                    filters.reset();
                    form.showLoadingIndicator();
                    search.performSearch(query, filters.getTerms());
                });

                dispatcher.listenTo(pagination, 'paginate', function() {
                    form.showLoadingIndicator();
                });

                dispatcher.listenTo(search, 'pageChanged', function(query, total, pageIndex) {
                    if (pageIndex === 0) {
                        if (total > 0) {
                            form.showFoundMessage(total);
                        } else if (query) {
                            form.showNotFoundMessage(query);
                            filters.reset();
                        } else {
                            form.$message.empty();
                            filters.reset();
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
                    if (!$.trim(form.$searchField.val())) {
                        restoreAllCourses();
                        return;
                    }
                    form.showErrorMessage(search.errorMessage);
                    form.hideLoadingIndicator();
                });

                if ($.trim(searchQuery)) {
                    form.doSearch(searchQuery);
                }
            };
        });
}(define || RequireJS.define));
