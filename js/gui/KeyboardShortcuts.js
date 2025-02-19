/**
 * ownCloud - News
 *
 * This file is licensed under the Affero General Public License version 3 or
 * later. See the COPYING file.
 *
 * @author Bernhard Posselt <dev@bernhard-posselt.com>
 * @copyright Bernhard Posselt 2014
 */

/**
 * Code in here acts only as a click shortcut mechanism. That's why its not
 * being put into a directive since it has to be tested with protractor
 * anyways and theres no benefit from wiring it into the angular app
 */
(function (window, document, $) {
    'use strict';

    var noInputFocused = function (element) {
        return !(
            element.is('input') ||
            element.is('select') ||
            element.is('textarea') ||
            element.is('checkbox')
        );
    };

    var noModifierKey = function (event) {
        return !(
            event.shiftKey ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey
        );
    };

    var markAllRead = function (navigationArea) {
        var selector = '.active > .app-navigation-entry-menu .mark-read button';
        var button = navigationArea.find(selector);
        if (button.length > 0) {
            button.trigger('click');
        }
    };

    var isInScrollView = function (elem, scrollArea) {
        // offset().top adds the navigation bar too so we have to subract it
        var elemTop = elem.offset().top - scrollArea.offset().top;
        var elemBottom = elemTop + elem.height();

        var areaBottom = scrollArea.height();

        return elemTop >= 0 && elemBottom < areaBottom;
    };

    var scrollToNavigationElement = function (elem, scrollArea, toTop) {
        if (elem.length === 0 || (!toTop && isInScrollView(elem, scrollArea))) {
            return;
        }
        scrollArea.scrollTop(
            elem.offset().top - scrollArea.offset().top + scrollArea.scrollTop()
        );
    };

    var scrollToActiveNavigationEntry = function (navigationArea) {
        var element = navigationArea.find('.active');
        scrollToNavigationElement(element, navigationArea.children('ul'), true);
    };

    var reloadFeed = function (navigationArea) {
        navigationArea.find('.active > a:visible').trigger('click');
    };

    var tryReload = function (navigationArea, scrollArea) {
        if (scrollArea.scrollTop() === 0) {
            var pullToRefresh = scrollArea.find('.pull-to-refresh');
            if (!pullToRefresh.hasClass('show-pull-to-refresh')) {
                pullToRefresh.addClass('show-pull-to-refresh');
            } else if (pullToRefresh.hasClass('done')) {
                reloadFeed(navigationArea);
            }
        }
    };

    var activateNavigationEntry = function (element, navigationArea) {
        element.children('a:visible').trigger('click');
        scrollToNavigationElement(element, navigationArea.children('ul'));
    };

    var nextFeed = function (navigationArea) {
        var current = navigationArea.find('.active');
        var elements = navigationArea.find('.explore-feed,' +
                                           '.subscriptions-feed:visible,' +
                                           '.starred-feed:visible,' +
                                           '.feed:visible');

        if (current.hasClass('folder')) {
            while (current.length > 0) {
                var subfeeds = current.find('.feed:visible');
                if (subfeeds.length > 0) {
                    activateNavigationEntry($(subfeeds[0]), navigationArea);
                    return;
                }
                current = current.next('.folder');
            }

            // no subfeed found
            return;
        }

        // FIXME: O(n) runtime. If someone creates a nice and not fugly solution
        // please create a PR
        for (var i=0; i<elements.length-1; i+=1) {
            var element = elements[i];

            if (element === current[0]) {
                var next = elements[i+1];
                activateNavigationEntry($(next), navigationArea);
                break;
            }
        }
    };

    var getParentFolder = function (current) {
        return current.parent().parent('.folder');
    };

    var selectFirstOrLastFolder = function (navigationArea, isLast) {
        var folders = navigationArea.find('.folder:visible');

        var index;
        if (isLast) {
            index = folders.length - 1;
        } else {
            index = 0;
        }

        if (folders.length > 0) {
            activateNavigationEntry($(folders[index]), navigationArea);
        }
    };

    var previousFolder = function (navigationArea) {
        var current = navigationArea.find('.active');

        // cases: folder active, subfeed active, feed active, none active
        if (current.hasClass('folder')) {
            activateNavigationEntry(current.prevAll('.folder:visible').first(),
                navigationArea);
        } else if (current.hasClass('feed')) {
            var parentFolder = getParentFolder(current);
            if (parentFolder.length > 0) {
                // first go to previous folder should select the parent folder
                activateNavigationEntry(parentFolder, navigationArea);
            } else {
                selectFirstOrLastFolder(navigationArea, true);
            }
        } else {
            selectFirstOrLastFolder(navigationArea, true);
        }
    };

    var nextFolder = function (navigationArea) {
        var current = navigationArea.find('.active');

        // cases: folder active, subfeed active, feed active, none active
        if (current.hasClass('folder')) {
            activateNavigationEntry(current.nextAll('.folder:visible').first(),
                navigationArea);
        } else if (current.hasClass('feed')) {
            var parentFolder = getParentFolder(current);
            if (parentFolder.length > 0) {
                activateNavigationEntry(
                    parentFolder.nextAll('.folder:visible').first(),
                    navigationArea
                );
            } else {
                selectFirstOrLastFolder(navigationArea);
            }
        } else {
            selectFirstOrLastFolder(navigationArea);
        }
    };

    var previousFeed = function (navigationArea) {
        var current = navigationArea.find('.active');
        var elements = navigationArea.find('.explore-feed,' +
                                           '.subscriptions-feed:visible,' +
                                           '.starred-feed:visible,' +
                                           '.feed:visible');

        // special case: folder selected
        if (current.hasClass('folder')) {
            var previousFolder = current.prev('.folder');

            while (previousFolder.length > 0) {
                var subfeeds = previousFolder.find('.feed:visible');
                if (subfeeds.length > 0) {
                    activateNavigationEntry($(subfeeds[subfeeds.length-1]),
                        navigationArea);
                    return;
                }
                previousFolder = previousFolder.prev('.folder');
            }

            // no subfeed found try visible feeds
            var feeds = current.siblings('.feed');

            if (feeds.length > 0) {
                activateNavigationEntry($(feeds[feeds.length-1]),
                    navigationArea);
                return;
            }


            // no feed found, go to starred
            var starred = $('.starred-feed:visible');
            if (starred.length > 0) {
                activateNavigationEntry(starred, navigationArea);
            }

            return;
        }

        // FIXME: O(n) runtime. If someone creates a nice and not fugly solution
        // please create a PR
        for (var i=elements.length-1; i>0; i-=1) {
            var element = elements[i];

            if (element === current[0]) {
                var previous = elements[i-1];
                activateNavigationEntry($(previous), navigationArea);
                break;
            }
        }
    };

    var onActiveItem = function (scrollArea, callback) {
        var items = scrollArea.find('.item');

        items.each(function (index, item) {
            item = $(item);

            // 130px of the item should be visible
            if ((item.height() + item.position().top) > 30) {
                callback(item);

                return false;
            }
        });

    };

    var toggleUnread = function (scrollArea) {
        onActiveItem(scrollArea, function (item) {
            item.find('.toggle-keep-unread').trigger('click');
        });
    };

    var toggleStar = function (scrollArea) {
        onActiveItem(scrollArea, function (item) {
            item.find('.star').trigger('click');
        });
    };

    var expandItem = function (scrollArea) {
        onActiveItem(scrollArea, function (item) {
            item.find('.utils').trigger('click');
        });
    };

    var openLink = function (scrollArea) {
        onActiveItem(scrollArea, function (item) {
            item.trigger('click');  // mark read
            window.open(item.find('.external:visible').attr('href'), '_blank');
        });
    };

    var scrollToItem = function (scrollArea, item, expandItemInCompact) {
        // if you go to the next article in compact view, it should
        // expand the current one
        scrollArea.scrollTop(
            item.offset().top - scrollArea.offset().top + scrollArea.scrollTop()
        );

        if (expandItemInCompact) {
            onActiveItem(scrollArea, function (item) {
                if (!item.hasClass('open')) {
                    item.find('.utils').trigger('click');
                }
            });
        }
    };

    var scrollToNextItem = function (scrollArea, expandItemInCompact) {
        var items = scrollArea.find('.item');
        var jumped = false;

        items.each(function (index, item) {
            item = $(item);

            // special treatment for items that have expand enabled:
            // if you click next and the first item has not been expaned and
            // is on the top, it should be expanded instead of the next one
            if ((item.position().top === 0 && expandItemInCompact &&
                 !item.hasClass('open')) ||
                item.position().top > 10) {
                scrollToItem(scrollArea, item, expandItemInCompact);

                jumped = true;

                return false;
            }
        });

        // in case this is the last item it should still scroll below the top
        if (!jumped) {
            scrollArea.scrollTop(scrollArea.prop('scrollHeight'));
        }

    };

    var scrollToPreviousItem = function (navigationArea, scrollArea,
                                         expandItemInCompact) {
        var items = scrollArea.find('.item');
        var jumped = false;

        items.each(function (index, item) {
            item = $(item);

            if (item.position().top >= 0) {
                var previous = item.prev();

                // if there are no items before the current one
                if (previous.length > 0) {
                    scrollToItem(scrollArea, previous, expandItemInCompact);
                } else {
                    tryReload(navigationArea, scrollArea);
                    scrollArea.scrollTop(0);
                }

                jumped = true;

                return false;
            }
        });

        // if there was no jump jump to the last element
        if (!jumped && items.length > 0) {
            scrollToItem(scrollArea, items.last());
        }
    };


    $(document).keyup(function (event) {
        var keyCode = event.keyCode;
        var scrollArea = $('#app-content');
        var navigationArea = $('#app-navigation');
        var isCompactView = $('#articles.compact').length > 0;
        var isExpandItem = $('#articles')
            .attr('news-compact-expand') === 'true';
        var expandItemInCompact = isCompactView && isExpandItem;

        if (noInputFocused($(':focus')) && noModifierKey(event)) {
            // j, n, right arrow
            if ([74, 78, 39].indexOf(keyCode) >= 0) {

                event.preventDefault();
                scrollToNextItem(scrollArea, expandItemInCompact);

            // k, p, left arrow
            } else if ([75, 80, 37].indexOf(keyCode) >= 0) {

                event.preventDefault();
                scrollToPreviousItem(navigationArea, scrollArea,
                                     expandItemInCompact);

            // u
            } else if ([85].indexOf(keyCode) >= 0) {

                event.preventDefault();
                toggleUnread(scrollArea);

            // e
            } else if ([69].indexOf(keyCode) >= 0) {

                event.preventDefault();
                expandItem(scrollArea);

            // s, i, l
            } else if ([73, 83, 76].indexOf(keyCode) >= 0) {

                event.preventDefault();
                toggleStar(scrollArea);

            // h
            } else if ([72].indexOf(keyCode) >= 0) {

                event.preventDefault();
                toggleStar(scrollArea);
                scrollToNextItem(scrollArea);

            // o
            } else if ([79].indexOf(keyCode) >= 0) {

                event.preventDefault();
                openLink(scrollArea);

            // r
            } else if ([82].indexOf(keyCode) >= 0) {

                event.preventDefault();
                reloadFeed(navigationArea);

            // f
            } else if ([70].indexOf(keyCode) >= 0) {

                event.preventDefault();
                nextFeed(navigationArea);

            // d
            } else if ([68].indexOf(keyCode) >= 0) {

                event.preventDefault();
                previousFeed(navigationArea);

            // c
            } else if ([67].indexOf(keyCode) >= 0) {

                event.preventDefault();
                previousFolder(navigationArea);

            // a
            } else if ([65].indexOf(keyCode) >= 0) {

                event.preventDefault();
                scrollToActiveNavigationEntry(navigationArea);

            // v
            } else if ([86].indexOf(keyCode) >= 0) {

                event.preventDefault();
                nextFolder(navigationArea);

            // q
            } else if ([81].indexOf(keyCode) >= 0) {

                event.preventDefault();
                $('#searchbox').focus();

            // page up
            } else if ([33].indexOf(keyCode) >= 0) {

                tryReload(navigationArea, scrollArea);

            }

        // everything with shift
        } else if (noInputFocused($(':focus')) && event.shiftKey) {

            // shift + a
            if ([65].indexOf(keyCode) >= 0) {

                event.preventDefault();
                markAllRead(navigationArea);

            }
        }
    });

}(window, document, $));
