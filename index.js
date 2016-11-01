var main = document.getElementById('main'),
    children = document.getElementById('children');
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
});

/* State - store what is active in each layer and what url's data is being displayed */
var state = {
    displayedDataUrl: "",
    displayedDataTitle: "",
    taxonomy: []
};

/* Build taxonomy into page and bind all events and view logic */
function buildTaxonomy(taxonomy) {
    var taxonomyLength = taxonomy.length,
        i,
        taxonomyHtml = ['<ul id="first-layer">'];

    state.taxonomy = taxonomy;

    for (i = 0; i < taxonomyLength; i++) {
        // Push top layer of taxonomy into array
        var thisBranch = '<li><a data-url="' + taxonomy[i].uri + '" href="#' + (taxonomy[i].uri).substr(1) + '">' + taxonomy[i].description.title + '</a>';
        taxonomyHtml.push(thisBranch)

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

function setActiveLink(link, activeLayer, childLayer) {
    var activeTaxonomyNode = getTaxonomyNode((link.getAttribute('href')).replace('#', '/'), state.taxonomy),
        oldActiveLink = activeLayer.querySelector('a.active');

    if (oldActiveLink) {
        oldActiveLink.className = "";
    }

    link.className = "active";

    /* Toggle children of active node */
    if (childLayer) {
        displayChildren(activeTaxonomyNode, childLayer);
    }
}

function displayChildren(nodeData, layer) {
    for (i = 0; i < nodeData.children.length; i++) {
        layer.innerHTML += '<a href="#' + (nodeData.children[i].uri).substr(1) + '">' + nodeData.children[i].description.title + '</a>';
    }
}

/* Bind click events */
function bindClicks() {
    main.addEventListener('click', function (event) {
        if (event.target && event.target.matches("a")) {
            state.displayedDataUrl = (event.target.getAttribute('href')).replace('#', '/');
            state.displayedDataTitle = event.target.textContent;

            setActiveLinks(event.target);

            displayDataForActive();
        }
    });

    function displayDataForActive() {
        var dataList = document.getElementById('data-list'),
            loadingAnimation = document.createElement('div');

        loadingAnimation.className = 'loading';
        emptyDataList();
        dataList.appendChild(loadingAnimation);

        fetch('https://www.ons.gov.uk' + state.displayedDataUrl + '/dataList/data?size=25').then(function (response) {
            return response.json();
        }).then(function (responseJSON) {
            var listHTML = buildListOfData(responseJSON);
            emptyDataList();
            dataList.appendChild(listHTML);
        });

        function buildListOfData(listJSON) {
            if (!listJSON.result.results) {
                var HTML = document.createElement('p');
                HTML.innerHTML = "This topic has no datasets";
                return HTML;
            }

            var listHTML = document.createElement('ul'),
                tempHTMLArray = [];

            $(listJSON.result.results).each(function (index) {
                var id = (Math.floor(Math.random() * 90000) + 10000) + this.uri;
                resolveDataMetadata(this.uri, success = function (metadata) {
                    var thisReleaseDate = new Date(metadata.releaseDate);
                    thisReleaseDate = thisReleaseDate.getDate() + "/" + thisReleaseDate.getMonth().toString() + "/" + thisReleaseDate.getFullYear();
                    var thisHTML = $('<a target="_blank" href="https://www.ons.gov.uk' + metadata.uri + '">' + metadata.title + '</a><span class="data__date">' + thisReleaseDate + '</span>');
                    // console.log("Resolved: ", id);
                    $('li[data-id="' + id + '"]').html(thisHTML);
                });
                var itemHTML = '<li class="data__item" data-id="' + id + '"></li>';
                tempHTMLArray.push(itemHTML);
            });

            tempHTMLArray.unshift("<h2>Data available for '" + state.displayedDataTitle + "'</h2>");
            listHTML.innerHTML = tempHTMLArray.join('');
            return listHTML;
        }

        function resolveDataMetadata(uri, success) {
            $.ajax({
                url: "https://www.ons.gov.uk" + uri + "/data",
                success: function (response) {
                    var metadataObject = {};
                    metadataObject.title = response.description.title;
                    metadataObject.releaseDate = response.description.releaseDate;
                    metadataObject.uri = response.uri;
                    success(metadataObject);
                }
            })
        }

        function emptyDataList() {
            while (dataList.firstChild) {
                dataList.removeChild(dataList.firstChild);
            }
        }
    }

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

function findByURI(URI, taxonomyNode) {
    function findURI(array) {
        return array.uri === URI;
    }

    return taxonomyNode.find(findURI);
}

/* Find by URI taxonomy - if 'taxonomyNode' passed in then it searches the children in that specific node */
function getTaxonomyNode(uri, taxonomyNode) {
    var activeNode;

    // Attempt to find in first layer on taxonomy to save lots of unneccessary work delving into branches
    activeNode = findByURI(uri, state.taxonomy);

    // Not in first layer of taxonomy start doing some looping through each branch
    if (!activeNode) {
        (state.taxonomy).some(function (value, index, array) {
            activeNode = findByURI(uri, value.children);
            return activeNode;
        });
    }

    if (!activeNode) {
        (state.taxonomy).some(function (value, index, array) {
            if (value.children && value.children.length > 0) {
                (value.children).some(function (childValue, childIndex, childArray) {
                    if (childValue.children) {
                        activeNode = findByURI(uri, childValue.children);
                    }
                    return activeNode;
                })
            }
        });
    }

    return activeNode;
}
