console.log("JavaScript connected");

// ===== Theme toggle =====


const themeButton = document.getElementById("themeToggle");

// Restore saved theme and keep the button label in sync.
if (themeButton) {
  try {
    const savedTheme = localStorage.getItem("tanuj-portfolio-theme");
    if (savedTheme === "dark") {
      document.body.classList.add("dark-mode");
    } else if (savedTheme === "light") {
      document.body.classList.remove("dark-mode");
    }
  } catch (error) {
    console.log("Theme preference storage unavailable.");
  }

  function updateThemeButton() {
    const isDark = document.body.classList.contains("dark-mode");
    themeButton.textContent = isDark
      ? "Switch to Light Mode"
      : "Switch to Dark Mode";
    themeButton.setAttribute("aria-pressed", String(isDark));
  }

  updateThemeButton();

  themeButton.addEventListener("click", function () {
    document.body.classList.toggle("dark-mode");

    const isDark = document.body.classList.contains("dark-mode");

    try {
      localStorage.setItem(
        "tanuj-portfolio-theme",
        isDark ? "dark" : "light"
      );
    } catch (error) {
      console.log("Could not save theme preference.");
    }

    updateThemeButton();
  });
}


 // ===== Weather widget =====

const cityInput = document.getElementById("cityInput");
const weatherButton = document.getElementById("weatherButton");
const weatherResult = document.getElementById("weatherResult");
const weatherCityChips = document.querySelectorAll(".weather-city-chip");

function createWeatherDetail(label, value) {
  const card = document.createElement("div");
  card.className = "weather-detail";

  const heading = document.createElement("span");
  heading.className = "weather-detail-label";
  heading.textContent = label;

  const content = document.createElement("span");
  content.className = "weather-detail-value";
  content.textContent = value;

  card.append(heading, content);
  return card;
}

async function getWeather() {
  if (!cityInput || !weatherButton || !weatherResult) return;

  const city = cityInput.value.trim();

  if (!city) {
    weatherResult.textContent = "Please enter a city.";
    cityInput.focus();
    return;
  }

  weatherButton.disabled = true;
  weatherButton.textContent = "Loading...";
  weatherResult.textContent = "Fetching live weather...";

  try {
    const response = await fetch(
      "/api/weather?city=" + encodeURIComponent(city)
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Unable to fetch weather.");
    }

    weatherResult.replaceChildren();

    const top = document.createElement("div");
    top.className = "weather-result-top";

    const locationBlock = document.createElement("div");

    const location = document.createElement("p");
    location.className = "weather-location";
    location.textContent = [data.city, data.country]
      .filter(Boolean)
      .join(", ");

    const condition = document.createElement("p");
    condition.className = "weather-condition";
    condition.textContent = data.condition || "Conditions unavailable";

    locationBlock.append(location, condition);

    if (data.icon) {
      const icon = document.createElement("img");
      icon.className = "weather-icon";
      icon.alt = data.condition || "Weather icon";
      icon.src = "https://openweathermap.org/img/wn/" +
        encodeURIComponent(data.icon) + "@2x.png";
      top.append(locationBlock, icon);
    } else {
      top.append(locationBlock);
    }

    const temperature = document.createElement("p");
    temperature.className = "weather-temperature";
    temperature.textContent = Math.round(Number(data.temperature)) + "°";

    const details = document.createElement("div");
    details.className = "weather-details";

    if (Number.isFinite(Number(data.feelsLike))) {
      details.append(
        createWeatherDetail(
          "FEELS LIKE",
          Math.round(Number(data.feelsLike)) + "°C"
        )
      );
    }

    if (Number.isFinite(Number(data.humidity))) {
      details.append(
        createWeatherDetail("HUMIDITY", data.humidity + "%")
      );
    }

    if (Number.isFinite(Number(data.windSpeed))) {
      details.append(
        createWeatherDetail(
          "WIND SPEED",
          Number(data.windSpeed).toFixed(1) + " m/s"
        )
      );
    }

    weatherResult.append(top, temperature, details);

    if (details.childElementCount === 0) {
      details.remove();
    }
  } catch (error) {
    console.error("Weather request failed:", error.message);
    weatherResult.textContent =
      error.message || "Unable to fetch weather. Please try again.";
  } finally {
    weatherButton.disabled = false;
    weatherButton.textContent = "Get Weather ↗";
  }
}

if (weatherButton && cityInput && weatherResult) {
  weatherButton.addEventListener("click", getWeather);

  cityInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") getWeather();
  });

  weatherCityChips.forEach(function (chip) {
    chip.addEventListener("click", function () {
      cityInput.value = chip.dataset.city || "";
      getWeather();
    });
  });
}



/* ===== Project search and filters ===== */
(function () {
  function initProjectFilters() {
    const searchInput = document.getElementById("projectSearch");
    const projectGrid = document.getElementById("projectGrid");
    const noResults = document.getElementById("noProjectsMessage");
    const filterButtons = document.querySelectorAll(".filter-button");

    if (!searchInput || !projectGrid || !noResults) {
      console.error("Search/filter elements missing.");
      return;
    }

    const cards = Array.from(
      projectGrid.querySelectorAll(".project-card")
    );

    let activeFilter = "all";

    function filterProjects() {
      const query = searchInput.value.trim().toLowerCase();
      let visibleCount = 0;

      cards.forEach(function (card) {
        const title = (card.dataset.title || "").toLowerCase();
        const tech = (card.dataset.tech || "").toLowerCase();
        const content = (card.textContent || "").toLowerCase();

        const matchesSearch =
          (title + " " + tech + " " + content).includes(query);

        const techList = tech.split(/\s+/).filter(Boolean);
        const matchesFilter =
          activeFilter === "all" || techList.includes(activeFilter);

        const show = matchesSearch && matchesFilter;
        card.hidden = !show;

        if (show) visibleCount++;
      });

      noResults.hidden = visibleCount > 0;
    }

    filterButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        activeFilter = (button.dataset.filter || "all").toLowerCase();

        filterButtons.forEach(function (item) {
          const selected = item === button;
          item.classList.toggle("active", selected);
          item.setAttribute("aria-pressed", String(selected));
        });

        filterProjects();
      });
    });

    searchInput.addEventListener("input", filterProjects);
    filterProjects();

    console.log("Project search ready. Cards found:", cards.length);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initProjectFilters);
  } else {
    initProjectFilters();
  }
})();
