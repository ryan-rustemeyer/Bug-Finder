const popup = document.getElementById("info-popup");
const closePopup = document.getElementById("close-popup");

closePopup.addEventListener("click", function () {
    popup.style.display = "none";
});

popup.addEventListener("click", function (event) {
    if (event.target === popup) {
        popup.style.display = "none";
    }
});

let currentPage = 1; //current inaturalist page

//retrieve insects from inaturalist
async function getInsects(latitude, longitude, page = 1) {
    const swlat = latitude - 0.1; //make area to find insects
    const swlng = longitude - 0.1;
    const nelat = latitude + 0.1;
    const nelng = longitude + 0.1;

    const url =
        `https://api.inaturalist.org/v1/observations` +
        `?swlat=${swlat}` +
        `&swlng=${swlng}` +
        `&nelat=${nelat}` +
        `&nelng=${nelng}` +
        `&has[]=photos` +
        `&taxon_id=47158` +
        `&per_page=20` +
        `&page=${page}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Could not fetch insects");
    }

    const data = await response.json();

    return data.results;
}

async function displayInsects(insectsArray) {
    //retrieve and clear out bug results already there (for refreshing)
    const bugResults = document.getElementById("bug-results");
    bugResults.innerHTML = "";

    const seenSpecies = new Set();

    const uniqueInsects = insectsArray
    .filter(function (insect) {
        const name = insect.species_guess;

        if (!name || seenSpecies.has(name) || insect.species_guess.toLowerCase() === "question mark") {
            return false;
        }

        seenSpecies.add(name);
        return true;
    })
    .slice(0, 9);

    const params = new URLSearchParams(window.location.search);
    const postalCode = params.get("zip");

    if (!document.querySelector(".loc-area")) {
        const bugLoc = document.createElement("h2");
        bugLoc.classList.add("loc-area");
        bugLoc.textContent = `Insects near: ${postalCode}`;
        document.getElementById("bug-container").prepend(bugLoc);
    }

    const wikiResults = await Promise.all(
        uniqueInsects.map(function (insect) {
            return getWiki(insect.species_guess);
        })
    );

    for (let i = 0; i < uniqueInsects.length; i++) {
        const insect = uniqueInsects[i];
        const sumKey = wikiResults[i];

        const card = document.createElement("div");
        card.classList.add("bug-card");

        const bugHeader = document.createElement("div");
        bugHeader.classList.add("bug-header");

        const bugName = document.createElement("h3");

        const wikiLink = document.createElement("a");
        wikiLink.textContent = insect.species_guess;

        const key = sumKey.key;

        //link to the wikipedia page for the user to learn more
        wikiLink.href = `https://en.wikipedia.org/wiki/${encodeURIComponent(key)}`;
        wikiLink.target = "_blank";

        bugName.appendChild(wikiLink);

        //the original images are small and pixelated, make them bigger
        const image = document.createElement("img");
        image.src = insect.photos[0].url.replace("square.jpg", "medium.jpg");
        image.alt = insect.species_guess;

        bugHeader.appendChild(image);
        bugHeader.appendChild(bugName);

        const Wiki = sumKey.summary;

        const summary = document.createElement("div");
        summary.classList.add("bug-info");

        const smallSum = document.createElement("p");
        smallSum.textContent = Wiki;

        summary.appendChild(smallSum);
        card.appendChild(bugHeader);
        card.appendChild(summary);

        document.getElementById("bug-results").appendChild(card);
    }
}

async function getWiki(speciesName) {
    //search for a wikipedia page about the insect
    let url = "https://en.wikipedia.org/w/rest.php/v1/search/page";
    let headers = {
        "Api-User-Agent": "Bug Finder",
    };
    let params = {
        q: `${speciesName}`,
        limit: "1",
    };
    let query = Object.keys(params)
    .map((k) => k + "=" + encodeURIComponent(params[k]))
    .join("&");
    url = url + "?" + query;

    const response = await fetch(url, headers);
    const data = await response.json();

    const page = data.pages[0];
    const key = page.key;

    const Wiki = await getSummary(key);

    //the key is to the actual wikipedia page about the insect
    return {
        summary: Wiki,
        key: key,
    };
}

async function getSummary(key) {
    //get the summary about the insect from the wikipedia page
    let url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(key)}`;

    const response = await fetch(url);
    const data = await response.json();

    const fullSummary = data.extract;

    /* segmenter doesn't know how to handle bullet points,
    cut off at : so there isn't weird spacing or structure */
    const intro = fullSummary.split(":")[0];

    const segmenter = new Intl.Segmenter("en", {
        granularity: "sentence",
    });
    const sentences = [...segmenter.segment(intro)];

    const smallSummary = sentences
    .slice(0, 2)
    .map((sentence) => sentence.segment)
    .join(" ");

    return smallSummary;
}

async function loadResults() {
    const params = new URLSearchParams(window.location.search);
    const latitude = Number(params.get("lat"));
    const longitude = Number(params.get("lon"));
    const insectsArray = await getInsects(latitude, longitude);

    displayInsects(insectsArray);
}

async function handleRefresh() {
    //next page of bugs
    currentPage++;
    const params = new URLSearchParams(window.location.search);
    const latitude = Number(params.get("lat"));
    const longitude = Number(params.get("lon"));
    //new retrieval
    const moreInsects = await getInsects(latitude, longitude, currentPage);
    //new display
    displayInsects(moreInsects);
}

loadResults();
const element = document.getElementById("refresh-bugs");
element.addEventListener("click", handleRefresh);
