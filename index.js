var main = document.getElementById('main'),
    $search = $('#search'),
    $searchClear = $('#search-clear'),
    parents = document.getElementById('parents');

// Remove existing hash on load if present
if (window.location.hash) {
    window.location = '';
}

// Get taxonomy data from local JSON file
fetch('taxonomy.json').then(function (response) {
    return response.json();
}).then(function (responseJSON) {
    buildTaxonomy(responseJSON);
    displayDataForActive();
    bindSearch();
});

/* State - store what is active in each layer and what url's data is being displayed */
var state = {
    displayedDataUrl: "",
    displayedDataTitle: "all topics",
    noOfPagesOfData: 0,
    currentDataListPage: 0,
    numberOfResults: 0,
    query: "",
    taxonomy: []
};

/* Bind search */
function bindSearch() {
    $search.submit(function(event) {
        event.preventDefault();
        state.query = $('#search-input').val();
        displayDataForActive();
        toggleClearButton();
        bindSearchClear()
    });

    function toggleClearButton() {
        if (state.query !== "") {
            $searchClear.show();
        } else {
            $searchClear.hide();
        }
    }

    function bindSearchClear() {
        $searchClear.click(function() {
            $("#search-input").val("");
            state.query = "";
        })
    }
}

/* Build taxonomy into page and bind all events and view logic */
function buildTaxonomy(taxonomy) {
    var taxonomyLength = taxonomy.length,
        i,
        taxonomyHtml = ['<ul id="first-layer">'];

    state.taxonomy = taxonomy;

    for (i = 0; i < taxonomyLength; i++) {
        // Push top layer of taxonomy into array
        var thisBranch = '<li><a data-url="' + taxonomy[i].uri + '" href="#' + (taxonomy[i].uri).substr(1) + '">' + taxonomy[i].description.title + '</a>';
        taxonomyHtml.push(thisBranch);

        // Push children into array
        if (taxonomy[i].children) {
            var secondTaxonomyLayer = ['<ul class="children second-layer">'],
                secondBranches = taxonomy[i].children;

            for (var secondIndex = 0; secondIndex < secondBranches.length; secondIndex++) {
                var secondLayerBranch = '<li><a data-url="' + secondBranches[secondIndex].uri + '" href="#' + (secondBranches[secondIndex].uri).substr(1) + '">' + secondBranches[secondIndex].description.title + '</a>';
                secondTaxonomyLayer.push(secondLayerBranch);

                // Push children's children into children's array
                if (secondBranches[secondIndex].children) {
                    var thirdBranches = secondBranches[secondIndex].children,
                        thirdTaxonomyLayer = ['<ul class="children third-layer">'];
                    for (var thirdIndex = 0; thirdIndex < thirdBranches.length; thirdIndex++) {
                        var thirdLayerBranch = '<li><a data-url="' + thirdBranches[thirdIndex].uri + '" href="#' + (thirdBranches[thirdIndex].uri).substr(1) + '">' + thirdBranches[thirdIndex].description.title + '</a></li>';
                        thirdTaxonomyLayer.push(thirdLayerBranch);
                    }
                    thirdTaxonomyLayer.push('</ul>');
                    secondTaxonomyLayer.push(thirdTaxonomyLayer.join(''));
                    secondTaxonomyLayer.push('</li>');
                }
            }

            secondTaxonomyLayer.push('</ul>');
            taxonomyHtml.push(secondTaxonomyLayer.join(''));
        }

        taxonomyHtml.push('</li>');
    }

    taxonomyHtml.push("</ul>");
    parents.innerHTML = taxonomyHtml.join('');

    bindClicks();
}

/* Bind click events */
function bindClicks() {
    main.addEventListener('click', function (event) {
        if (event.target && event.target.matches("a")) {
            state.displayedDataUrl = (event.target.getAttribute('href')).replace('#', '/');
            state.displayedDataTitle = event.target.textContent;

            setActiveLinks(event.target);
            setActiveTopicOnSearch();
            displayDataForActive();
        }
    });

    function setActiveLinks(activeLink) {
        var $oldActive = $('.active'),
            $activeLink = $(activeLink),
            $activeItem = $activeLink.closest('li');

        $oldActive.removeClass('active');
        $activeLink.toggleClass('active');
        $activeItem.find('.children:first').toggleClass('active');

        if ($activeItem.parents('li').length) {
            $activeItem.parents('li').find('a:first').addClass('active');
            $activeItem.parents('ul').addClass('active');
        }
    }

    function setActiveTopicOnSearch() {
        var $searchTopic = $search.find('#search-topic');
        $searchTopic.html("'" + state.displayedDataTitle + "'");
    }
}

function displayDataForActive() {
    var dataList = document.getElementById('data-list'),
        loadingAnimation = document.createElement('div');

    loadingAnimation.className = 'loading';
    emptyDataList();
    dataList.appendChild(loadingAnimation);

    fetch('https://www.ons.gov.uk' + state.displayedDataUrl + '/dataList/data?size=25' + '&query=' + state.query).then(function (response) {
        return response.json();
    }).then(function (responseJSON) {
        state.numberOfResults = responseJSON.result.numberOfResults;
        state.currentDataListPage = 1;
        var listHTML = buildListOfData(responseJSON);
        state.noOfPagesOfData = responseJSON.result.paginator ? responseJSON.result.paginator.numberOfPages : 1;
        emptyDataList();
        dataList.appendChild(listHTML);
    });

    function emptyDataList() {
        while (dataList.firstChild) {
            dataList.removeChild(dataList.firstChild);
        }
    }
}

function buildListOfData(listJSON) {
    if (!listJSON.result.results) {
        var HTML = document.createElement('p');
        HTML.innerHTML = "This topic has no datasets";
        return HTML;
    }

    var listHTML = document.createElement('ul'),
        tempHTMLArray = [];

    if (listJSON.result.results.length === 0) {
        listHTML.innerHTML = "No results available for '" + state.query + "' in " + state.displayedDataTitle;
        return listHTML
    }

    $(listJSON.result.results).each(function () {
        var id = (Math.floor(Math.random() * 90000) + 10000) + this.uri,
            metadata = this.description;

        // Build metadata
        var thisReleaseDate = new Date(metadata.releaseDate);
        thisReleaseDate = thisReleaseDate.getDate() + "/" + thisReleaseDate.getMonth().toString() + "/" + thisReleaseDate.getFullYear();
        var thisLink = '<a target="_blank" href="https://www.ons.gov.uk' + this.uri + '">' + metadata.title + '</a>';
        thisReleaseDate = '<span class="data__date">' + thisReleaseDate + '</span>';
        var thisDescription = '<span class="data__description">' + metadata.summary + '</span>';
        var metadataHTML = thisLink + thisReleaseDate + thisDescription;

        // Build whole list item
        var itemHTML = '<li class="data__item" data-id="' + id + '">' + metadataHTML + '</li>';
        tempHTMLArray.push(itemHTML);
    });

    renderNextPageOnScroll();

    if (!($('.data__heading').length)) {
        var query = (state.query !== "") ? " containing '" + state.query + "'" : "";
        tempHTMLArray.unshift("<h2 class='data__heading'>Data available for '" + state.displayedDataTitle + "'</h2><p class='data__count'>" + state.numberOfResults + " results" + query + "</p>");
    }

    listHTML.className = "data__list";
    listHTML.innerHTML = tempHTMLArray.join('');
    return listHTML;
}

function renderNextPageOnScroll() {
    var win = $(window),
        hasRan = false,
        $dataList = $('#data-list');

    // Each time the user scrolls
    win.scroll(function() {
        if (hasRan) {
            return false;
        }

        // End of the document reached?
        if ($(document).height() - win.height() == win.scrollTop()) {
            win.off('scroll');
            if (state.currentDataListPage == state.noOfPagesOfData) {
                console.log('last page');
                $dataList.append('<p style="font-weight: bold; margin-left: 8px;">-- End of results --</p>');
                win.off('scroll');
                return false;
            }

            hasRan = true;
            $dataList.append('<div class="loading"></div>');

            fetch('https://www.ons.gov.uk' + state.displayedDataUrl + '/dataList/data?size=25&page=' + (state.currentDataListPage+1)).then(function(response) {
                return response.json();
            }).then(function(responseJSON) {
                var listHTML = buildListOfData(responseJSON);
                state.currentDataListPage++;
                $('.loading').remove();
                $dataList.append(listHTML);
                renderNextPageOnScroll();
            });

        }
    });
}
