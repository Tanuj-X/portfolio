
const recentRequests = new Map();

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      error: "Method not allowed."
    });
  }

  const ip = (
    req.headers["x-forwarded-for"] || "unknown"
  ).toString().split(",")[0].trim();

  // Best-effort rate limit. Use Vercel Firewall for stronger protection.
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 15;
  const previous = recentRequests.get(ip) || [];
  const recent = previous.filter(
    timestamp => now - timestamp < windowMs
  );

  if (recent.length >= maxRequests) {
    return res.status(429).json({
      error: "Too many requests. Please wait a minute."
    });
  }

  recent.push(now);
  recentRequests.set(ip, recent);

  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error("GROQ_API_KEY is not configured.");
    return res.status(503).json({
      error: "The AI assistant is not configured yet."
    });
  }

  const body = req.body || {};
  const question =
    typeof body.question === "string"
      ? body.question.trim()
      : "";

  if (!question) {
    return res.status(400).json({
      error: "Please enter a question."
    });
  }

  if (question.length > 1000) {
    return res.status(400).json({
      error: "Please keep your question under 1000 characters."
    });
  }

  const portfolioContext = `
You are the AI assistant for Tanuj Dangi's personal portfolio.

Identity:
- Name: Tanuj Dangi
- University: JECRC University
- He is a university student interested in AI and machine learning.
- GitHub profile: https://github.com/Tanuj-X
- Portfolio website: https://tanuj-x.github.io/portfolio/

Rules:
- Answer questions about Tanuj and his portfolio in a friendly,
  concise, professional manner.
- Use only information actually available on the portfolio or
  explicitly provided in this system prompt.
- Do not reuse information about Piyush Jaroli or any other
  person from the original template.
- Do not invent skills, degrees, grades, internships, employment,
  achievements, contact details, or project features.
- If a detail is unavailable, say that it is not currently listed
  in Tanuj's portfolio.
- If asked about a project, describe it only if its details are
  verified in the available portfolio information.
- Do not claim to have read private files or accessed information
  that was not provided.
- Keep answers concise, ideally under 100 words.
`;

  try {
    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "openai/gpt-oss-20b",
          temperature: 0.3,
          max_tokens: 250,
          messages: [
            {
              role: "system",
              content: portfolioContext
            },
            {
              role: "user",
              content: question
            }
          ]
        }),
        signal: AbortSignal.timeout(20000)
      }
    );

    if (response.status === 429) {
      return res.status(429).json({
        error: "The AI service is busy. Please try again shortly."
      });
    }

    if (!response.ok) {
      // Keep upstream error details out of public responses.
      console.error("Groq API returned status:", response.status);

      return res.status(502).json({
        error: "The AI service is temporarily unavailable.",
        status: response.status
      });
    }

    const data = await response.json();
    const answer = data.choices?.[0]?.message?.content;

    if (typeof answer !== "string" || !answer.trim()) {
      return res.status(502).json({
        error: "The AI service returned an invalid response."
      });
    }

    return res.status(200).json({
      answer: answer.trim()
    });
  } catch (error) {
    console.error("Chat endpoint error:", error.message);

    return res.status(502).json({
      error: "Unable to contact the AI service. Please try again."
    });
  }
};
