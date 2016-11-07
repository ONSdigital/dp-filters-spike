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
    bindPaginationClick();
});

/* State - store what is active in each layer and what url's data is being displayed */
var defaultState = {
    displayedDataUrl: "",
    displayedDataTitle: "",
    noOfPagesOfData: 0,
    currentDataListPage: 1,
    numberOfResults: 0,
    query: "",
    taxonomy: []
};
var state = JSON.parse(JSON.stringify(defaultState));

/* Bind search */
function bindSearch() {
    $search.submit(function(event) {
        event.preventDefault();
        state.query = $('#search-input').val();
        state.currentDataListPage = 1;
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

    bindFilterClicks();
}

/* Bind click events */
function bindFilterClicks() {
    main.addEventListener('click', function (event) {
        if (!event.target) {
            return;
        }

        if (event.target.matches("a")) {
            state.displayedDataUrl = (event.target.getAttribute('href')).replace('#', '/');
            state.displayedDataTitle = event.target.textContent;

            state.currentDataListPage = 1;

            setActiveLinks(event.target);
            displayDataForActive();

            $('#filter-clear').show();
        }

        if (event.target.matches("button")) {
            state.displayedDataUrl = defaultState.displayedDataUrl;
            state.displayedDataTitle = defaultState.displayedDataTitle;
            state.currentDataListPage = defaultState.currentDataListPage;

            $('.active').removeClass('active');
            $('#filter-clear').hide();
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
}

function displayDataForActive() {
    var dataList = document.getElementById('data-list'),
        loadingAnimation = document.createElement('div');

    loadingAnimation.className = 'loading';
    emptyDataList();
    dataList.appendChild(loadingAnimation);

    fetch('https://www.ons.gov.uk' + state.displayedDataUrl + '/dataList/data?size=10' + '&query=' + state.query + '&page=' + state.currentDataListPage).then(function (response) {
        return response.json();
    }).then(function (responseJSON) {
        state.numberOfResults = responseJSON.result.numberOfResults;
        var listHTML = buildListOfData(responseJSON),
            paginationHTML = (responseJSON.result.paginator) ? buildPaginationHTML(responseJSON) : document.createElement('span');

        state.noOfPagesOfData = responseJSON.result.paginator ? responseJSON.result.paginator.numberOfPages : 1;
        emptyDataList();
        dataList.appendChild(listHTML);
        dataList.appendChild(paginationHTML);
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
        HTML.setAttribute('id', 'results-text');
        HTML.innerHTML = "No results available";
        return HTML;
    }

    var listHTML = document.createElement('ul'),
        tempHTMLArray = [],
        query = (state.query !== "") ? " containing <strong>'" + state.query + "'</strong>" : "",
        topic = (state.displayedDataUrl !== "") ? " in <strong>'" + state.displayedDataTitle + "'</strong>" : "",
        resultsNumber = state.numberOfResults ? "<strong>" + state.numberOfResults + "</strong>" : "Sorry, there are no";

    $(listJSON.result.results).each(function () {
        var id = (Math.floor(Math.random() * 90000) + 10000) + this.uri,
            metadata = this.description;

        // Build metadata
        var thisReleaseDate = new Date(metadata.releaseDate);
        thisReleaseDate = thisReleaseDate.getDate() + "/" + thisReleaseDate.getMonth().toString() + "/" + thisReleaseDate.getFullYear();
        var thisLink = '<h3 class="search-results__title"><a target="_blank" class="icon--hide" href="https://www.ons.gov.uk' + this.uri + '">' + metadata.title + '</a></h3>';
        thisReleaseDate = '<span class="search-results__meta">Released on ' + thisReleaseDate + '</span>';
        var thisDescription = metadata.summary ? '<p class="search-results__summary flush">' + metadata.summary + '</p>' : "";
        var metadataHTML = thisLink + thisReleaseDate + thisDescription;

        // Build whole list item
        var itemHTML = '<li class="search-results__item" data-id="' + id + '">' + metadataHTML + '</li>';
        tempHTMLArray.push(itemHTML);
    });


    tempHTMLArray.unshift("<p id='results-text'>" + resultsNumber + " results" + topic + query + "</p>");

    listHTML.className = "list--neutral flush";
    listHTML.innerHTML = tempHTMLArray.join('');
    return listHTML;
}

/* Pagination */
function buildPaginationHTML(listJSON) {
    var paginationArray = listJSON.result.paginator,
        paginationLength = paginationArray.pages.length,
        paginationHTML = document.createElement("ul"),
        tempHTMLArray = [],
        i;

    paginationHTML.className = "list--neutral list--inline";

    for (i = 0; i < paginationLength; i++) {
        var thisLink = (paginationArray.pages[i] === paginationArray.currentPage) ? '<span class="page-link btn btn--plain btn--plain-active">' + paginationArray.pages[i] + '</span>' : '<a href="'+ paginationArray.pages[i] + '" class="page-link btn btn--plain">' + paginationArray.pages[i] + '</a>',
            thisHTML = "<li class='margin-top--0'>" + thisLink + "</li>";

        if (!paginationArray.pages[i]) {
            debugger;
        }

        tempHTMLArray.push(thisHTML);
    }

    if (state.currentDataListPage > 1) {
        tempHTMLArray.unshift('<li><a href="' + parseInt(paginationArray.currentPage - 1) + '" class="page-link btn btn--plain">Back</a></li>');
    }

    tempHTMLArray.push('<li><a href="' + parseInt(paginationArray.currentPage + 1) + '" class="page-link btn btn--plain">Next</a></li>');

    paginationHTML.innerHTML = tempHTMLArray.join("");

    return paginationHTML;
}

function bindPaginationClick() {

    $('#data-list').on('click', '.page-link', function(event) {
        event.preventDefault();
        state.currentDataListPage = parseInt(event.target.getAttribute('href'));
        displayDataForActive();
    });
}

// function renderNextPageOnScroll() {
//     var win = $(window),
//         hasRan = false,
//         $dataList = $('#data-list');
//
//     // Each time the user scrolls
//     win.scroll(function() {
//         if (hasRan) {
//             return false;
//         }
//
//         // End of the document reached?
//         if ($(document).height() - win.height() == win.scrollTop()) {
//             win.off('scroll');
//             if (state.currentDataListPage == state.noOfPagesOfData) {
//                 console.log('last page');
//                 $dataList.append('<p style="font-weight: bold; margin-left: 8px;">-- End of results --</p>');
//                 win.off('scroll');
//                 return false;
//             }
//
//             hasRan = true;
//             $dataList.append('<div class="loading"></div>');
//
//             fetch('https://www.ons.gov.uk' + state.displayedDataUrl + '/dataList/data?size=25&page=' + (state.currentDataListPage+1)).then(function(response) {
//                 return response.json();
//             }).then(function(responseJSON) {
//                 var listHTML = buildListOfData(responseJSON);
//                 state.currentDataListPage++;
//                 $('.loading').remove();
//                 $dataList.append(listHTML);
//                 renderNextPageOnScroll();
//             });
//
//         }
//     });
// }
