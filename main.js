let cache = new Map();
let allCoins, liveReportsList, liveData;
let searchBox = document.getElementById("search-box");
let searchBtn = document.getElementById("search-btn");
searchBtn.addEventListener("click", searchCoin);


// ------------- ON LOAD ------------- //
$(() => {
    if (localStorage.getItem("allCoins")) {
        allCoins = JSON.parse(localStorage.getItem("allCoins"));
        showAllCoins();

    } else {
        showLoadingGif($("body"))
        $.ajax({
            type: "GET",
            dataType: "json",
            url: "https://api.coingecko.com/api/v3/coins",
            data: "data",
            success: response => {
                allCoins = response;
                showAllCoins();
                $(".loading-gif").remove()
                localStorage.setItem("allCoins", JSON.stringify(allCoins));
            },
            error: (status, request) => {
                console.error(`Status: ${status} \nCoins not found`);
                alert(`${request} \n Coins not found`);
            }
        });
    }
})

function showAllCoins() {
    $("main").html("").hide().fadeIn(500);
    for (let coin of allCoins) createCards(coin, $("main"));
    // allCoins.map(coin => createCards(coin, $("main")));
    reloadToggleCheck();
}

function createCards(coin, container) {
    // Create cards
    let card = document.createElement("div");
    card.classList.add("card");
    card.id = `card-${coin.symbol}`;
    container.append(card);
    let cardBody = document.createElement("div");
    cardBody.classList.add("card-body");
    card.append(cardBody)

    // Fill card's body with coin's details
    let cardTitle = document.createElement("h5");
    cardTitle.classList.add("card-title");
    cardTitle.innerHTML = coin.symbol.toUpperCase();
    let cardText = document.createElement("p");
    cardText.classList.add("card-text");
    cardText.innerHTML = coin.id;

    // Create toggler
    let toggleSwitchBtn = document.createElement("label");
    toggleSwitchBtn.classList.add("switch");
    let checkbox = document.createElement("input");
    checkbox.setAttribute("type", "checkbox");
    checkbox.id = `switch-${coin.symbol}`;
    let slider = document.createElement("span");
    slider.classList.add("slider", "round");
    toggleSwitchBtn.append(checkbox, slider);
    onToggleCoins(checkbox, coin);

    // Create more/less info buttons
    let showMoreInfoBtn = document.createElement("a");
    showMoreInfoBtn.id = "show-info-btn";
    showMoreInfoBtn.classList.add("btn", "btn-sm");
    showMoreInfoBtn.style.display = "inline-block";
    showMoreInfoBtn.innerHTML = 'More Info <i class="fas fa-angle-double-right"></i>';
    let hideMoreInfoBtn = document.createElement("a");
    hideMoreInfoBtn.id = "hide-info-btn";
    hideMoreInfoBtn.classList.add("btn", "btn-dark", "btn-sm");
    hideMoreInfoBtn.style.display = "none";
    hideMoreInfoBtn.innerHTML = "<i class=\"fas fa-angle-double-left\"></i>";

    cardBody.append(cardTitle, cardText, toggleSwitchBtn, showMoreInfoBtn, hideMoreInfoBtn);
    onMoreInfoClicked(coin, cardBody, showMoreInfoBtn, hideMoreInfoBtn);
}

function reloadToggleCheck() {
    if (localStorage.liveReportsList) {
        liveReportsList = new Map(JSON.parse(localStorage.liveReportsList));
        for (let [symbol, value] of liveReportsList) {
            let currentCard = document.getElementById("card-" + symbol);
            currentCard.querySelector("#switch-" + symbol).checked = true;
        }
    };
}


// ------------- NAVIGATION ------------- //
function backHome() {
    clearContentSection()
    onShowAllClick();
}

function moveToAbout() {
    clearContentSection();
    $(".about").delay(200).fadeIn();
}

function moveToLiveReports() {
    if (!localStorage.liveReportsList || (JSON.parse(localStorage.liveReportsList)).length == 0) {
        alert("You must select at least one coin first.");
        return;
    }

    clearContentSection();
    $(".live-reports").fadeIn();
    $(".alert").show()
    showLoadingGif($(".alert"))

    let liveReportsList = new Map(JSON.parse(localStorage.liveReportsList));
    let coinSymbolsArray = [...liveReportsList.keys()];
    createChart(coinSymbolsArray);
}

function clearContentSection() {
    resetSearchInput();
    $("#show-all-coins-btn").fadeOut("linear");
    $("main").fadeOut("fast");
    $(".about").fadeOut();
    $(".live-reports").fadeOut();
}


// ------------- LIVE CHART ------------- //
function createChart(coinSymbolsArray) {
    let chart = new CanvasJS.Chart("chartContainer", {
        theme: "light2",
        backgroundColor: "rgba(255, 255, 255, 0.9)",
        animationEnabled: true,
        title: { text: "Coins to USD" },
        subtitles: [{ text: coinSymbolsArray }],
        axisY: { title: "Coin Value" },
        toolTip: { shared: "true" },
        legend: { cursor: "pointer" },
        data: [],
    });

    chart.render();
    addFixedData(chart, coinSymbolsArray);
    setInterval(() => getLiveDataFromServer(chart, coinSymbolsArray), 2000);
}

function addFixedData(chart, coinSymbolsArray) {
    coinSymbolsArray.forEach(symbol => {
        chartData = {
            type: "spline",
            name: symbol,
            showInLegend: true,
            yValueFormatString: "##.00mn",
            dataPoints: []
        };
        chart.addTo("data", chartData);
    })
}

function getLiveDataFromServer(chart, coinSymbolsArray) {
    $.ajax({
        type: "GET",
        url: `https://min-api.cryptocompare.com/data/pricemulti?fsyms=${coinSymbolsArray}&tsyms=USD`,
        data: "data",
        dataType: "json",
        success: (response => {
            liveData = response;
            $(".alert").hide()
            $("#chartContainer").fadeIn();
            updateChartData(chart)
        })
    });
}

function updateChartData(chart) {
    let date = new Date();
    let time = date.getMinutes() + ": " + date.getSeconds();

    chart.data.forEach(coin => {
        let coinName = coin.name.toUpperCase();
        let newData = { label: time, y: liveData[coinName].USD };
        coin.dataPoints.push(newData);
    })
    chart.render();
}


// ------------- SEARCH FORM ------------- //
function searchCoin(event) {
    event.preventDefault();
    let userInput = searchBox.value.toUpperCase().trim();

    // Make sure the user is searching while in home page
    if ($("main").css("display") == "none") {
        let userConfirmed = confirm(`You can't search for coins on this page.\n Press "OK" to navigate to HOME PAGE.`);
        userConfirmed ? backHome() : resetSearchInput();
        return;
    }
    // Error if input is empty
    else if (userInput == "") {
        searchBox.placeholder = "WHY U DO THIS?";
        searchBox.classList.add("error-input");
        return;
    }
    // Else, Search!
    let found = false;
    allCoins.map(coin => {
        if (userInput == coin.id.toUpperCase() ||
            userInput == coin.symbol.toUpperCase()) {
            whenCoinFound(coin);
            found = true;
        }
    });
    if (!found) {
        alert(`"${userInput}" is not found`);
        // resetSearchInput()
    }
}

function whenCoinFound(coin) {
    // Change main div content
    $("#show-all-coins-btn").fadeIn().css("display", "flex");
    $("main").hide().html("").fadeIn("linear").html(createCards(coin, $("main")));
    // Toggle button if it was checked
    if (localStorage.liveReportsList && liveReportsList.has(coin.symbol)) {
        let thisCard = document.getElementById(`card-${coin.symbol}`);
        thisCard.querySelector(`#switch-${coin.symbol}`).checked = true;
    }
    resetSearchInput();
}

function onShowAllClick() {
    resetSearchInput();
    $("#show-all-coins-btn").fadeOut("linear");
    showAllCoins();
}

function resetSearchInput() {
    searchBox.value = "";
    searchBox.placeholder = "Search for a coin..";
    searchBox.classList.remove("error-input");
}


// ------------- MORE INFO FUNCTIONALITIES ------------- //
function onMoreInfoClicked(coin, cardBody, showMoreInfoBtn, hideMoreInfoBtn) {
    showMoreInfoBtn.addEventListener("click", () => {

        if (cache.has(coin.id)) {
            let coinInfo = cache.get(coin.id);
            showCoinMoreInfo(coinInfo, cardBody, showMoreInfoBtn, hideMoreInfoBtn);
            return;
        }

        showLoadingGif(cardBody);
        $.ajax({
            type: "GET",
            url: "https://api.coingecko.com/api/v3/coins/" + coin.id,
            data: "data",
            dataType: "json",
            success: coin => {
                $(".loading-gif").remove()
                showCoinMoreInfo(coin, cardBody, showMoreInfoBtn, hideMoreInfoBtn);
                handleCoinInCache(coin, cache);
            },
            error: (status, request) => {
                console.error(`${request} : Info not found`);
                alert(`${request} \n Info not found`);
            }
        });
    });
}

function showLoadingGif(container) {
    let loadingGif = document.createElement("img");
    loadingGif.src = "Source Files/loading.gif";
    loadingGif.classList = "loading-gif";
    container.append(loadingGif);
    $(".loading-gif").show()
}

function showCoinMoreInfo(coinInfo, cardBody, showMoreInfoBtn, hideMoreInfoBtn) {
    // Create
    let coinImage = document.createElement("img");
    coinImage.classList.add("coin-image");
    coinImage.src = coinInfo.image.thumb;
    let moreInfoSection = document.createElement("p");
    moreInfoSection.classList.add("more-info-section");
    moreInfoSection.innerHTML =
        `<i class="fas fa-dollar-sign"></i> : ${coinInfo.market_data.current_price.usd} <br>
    <i class="fas fa-euro-sign"></i> : " ${coinInfo.market_data.current_price.eur} <br>
    <i class="fas fa-shekel-sign"></i> : ${coinInfo.market_data.current_price.ils}`;
    cardBody.append(coinImage, moreInfoSection);

    // Display
    showMoreInfoBtn.style.display = "none";
    hideMoreInfoBtn.style.display = "inline-block";
    moreInfoSection.style.display = "block";
    coinImage.style.display = "inline";
    moreInfoSection.classList.remove("hide-info-animation");

    hideMoreInfo(showMoreInfoBtn, hideMoreInfoBtn, coinImage, moreInfoSection)
}

function hideMoreInfo(showMoreInfoBtn, hideMoreInfoBtn, coinImage, moreInfoSection) {
    hideMoreInfoBtn.addEventListener("click", () => {
        moreInfoSection.classList.add("hide-info-animation");
        moreInfoSection.addEventListener('transitionend', () => {
            showMoreInfoBtn.style.display = "inline-block";
            hideMoreInfoBtn.style.display = "none";
            moreInfoSection.style.display = "none";
            coinImage.style.display = "none";
        });
    });
}

function handleCoinInCache(coin, cache) {
    cache.set(coin.id, coin);
    setTimeout(() => cache.delete(coin.id), 120000);
}


// ------------- TOGGLE COINS ------------- //
function onToggleCoins(checkbox, coin) {
    checkbox.addEventListener('change', () =>
        checkbox.checked ? saveToLiveReports(coin, checkbox) : removeFromLiveReports(coin));
}

function saveToLiveReports(coin, checkbox) {
    if (localStorage.getItem("liveReportsList")) {
        liveReportsList = new Map(JSON.parse(localStorage.liveReportsList));

        if (liveReportsList.size == 5) {
            checkbox.display = true;
            checkbox.checked = false;
            displayModal(liveReportsList);

        } else {
            liveReportsList.set(coin.symbol, coin);
            localStorage.setItem("liveReportsList", JSON.stringify([...liveReportsList]));
        }

    } else {
        let liveReportsList = new Map();
        liveReportsList.set(coin.symbol, coin);
        localStorage.setItem("liveReportsList", JSON.stringify([...liveReportsList]));
    }
}

function removeFromLiveReports(coin) {
    liveReportsList = new Map(JSON.parse(localStorage.liveReportsList));

    for (let [symbol, value] of liveReportsList) {
        if (symbol == coin.symbol) {
            liveReportsList.delete(symbol);
            localStorage.setItem("liveReportsList", JSON.stringify([...liveReportsList]));
            return;
        }
    }
}

function displayModal(liveReportsList) {
    let modal = document.getElementById("modal");
    modal.style.display = "block";
    let modalLiveReportsList = document.getElementById("modal-checked-coins");
    $("#modal-checked-coins").children(".card").detach();

    for (let [symbol, coin] of liveReportsList) {
        createCards(coin, modalLiveReportsList);
        let currentCard = modalLiveReportsList.querySelector(`#card-${symbol}`);
        currentCard.querySelector(`#switch-${symbol}`).checked = true;
    }
}

function onModalDone() {
    modal.style.display = "none";
    $("#modal-checked-coins").children(".card").detach();
    location.reload();
}