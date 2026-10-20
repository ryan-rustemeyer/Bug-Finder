async function getCoordinates(countryCode, postalCode) {
    if (countryCode === "ca") {
        postalCode = postalCode.substring(0, 3);
    }
    const url = `https://api.zippopotam.us/${countryCode}/${encodeURIComponent(postalCode)}`;
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("Postal code not found");
    }

    const data = await response.json();

    return {
        latitude: Number(data.places[0].latitude),
        longitude: Number(data.places[0].longitude),
    };
}

async function handleFind() {
    const country = document.getElementById("country").value; 
    const postalCode = document.getElementById("postalCode").value;
    try {
        const location = await getCoordinates(country, postalCode);
        window.location.href = `results.html?lat=${location.latitude}&lon=${location.longitude}&zip=${postalCode}`;
    } catch (error) {
        alert("Invalid postal code! Try again.");
    }
}

const element = document.getElementById("find-bugs");
element.addEventListener("click", handleFind);
