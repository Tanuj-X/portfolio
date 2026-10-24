
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return res.status(503).json({
      error: "Weather service is not configured yet."
    });
  }

  const city =
    typeof req.query.city === "string"
      ? req.query.city.trim()
      : "";

  if (
    !city ||
    city.length > 80 ||
    !/^[\p{L}\p{M}\p{N} .,'-]+$/u.test(city)
  ) {
    return res.status(400).json({
      error: "Enter a valid city name."
    });
  }

  const url = new URL(
    "https://api.openweathermap.org/data/2.5/weather"
  );

  url.searchParams.set("q", city);
  url.searchParams.set("appid", apiKey);
  url.searchParams.set("units", "metric");

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000)
    });

    if (response.status === 404) {
      return res.status(404).json({
        error: "City not found. Check the spelling and try again."
      });
    }

    if (!response.ok) {
      console.error("Weather provider returned HTTP", response.status);
      return res.status(502).json({
        error: "Weather service is temporarily unavailable."
      });
    }

    const data = await response.json();
    const current = data.weather?.[0] || {};

    return res.status(200).json({
      city: data.name,
      country: data.sys?.country || "",
      temperature: data.main.temp,
      feelsLike: data.main.feels_like,
      humidity: data.main.humidity,
      windSpeed: data.wind.speed,
      condition: current.description || "Unavailable",
      icon: current.icon || "01d"
    });
  } catch (error) {
    console.error("Weather endpoint error:", error.message);

    return res.status(502).json({
      error: "Unable to fetch weather. Please try again."
    });
  }
};
