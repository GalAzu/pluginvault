use crate::db::models::{CategorySuggestion, PluginSummary};
use crate::utils::errors::AppError;

/// Send a batch of plugins to OpenAI for categorization
pub async fn categorize_batch(
    plugins: &[PluginSummary],
    api_key: &str,
    model: &str,
) -> Result<Vec<CategorySuggestion>, AppError> {
    if api_key.is_empty() {
        return Err(AppError::Ai("OpenAI API key not configured".to_string()));
    }

    if plugins.is_empty() {
        return Ok(Vec::new());
    }

    // Build the plugin list for the prompt
    let plugin_list: Vec<String> = plugins
        .iter()
        .enumerate()
        .map(|(i, p)| {
            let vendor = p.vendor.as_deref().unwrap_or("Unknown");
            format!("{}. {} (vendor: {}, format: {})", i + 1, p.name, vendor, p.format)
        })
        .collect();

    let prompt = format!(
        r#"You are an audio plugin categorization expert. Categorize each plugin below into one category and optional subcategory.

Categories: Instrument, Effect, Utility, MIDI
Subcategories for Instrument: Synthesizer, Sampler, Drum Machine, Piano, Organ, Bass, Strings, Brass, Woodwind, Guitar, Vocal, Orchestral, Other
Subcategories for Effect: EQ, Compressor, Limiter, Gate, Reverb, Delay, Distortion, Saturation, Modulation, Filter, Pitch, Stereo, De-Esser, Noise Reduction, Mastering, Channel Strip, Amp Sim, Other
Subcategories for Utility: Analyzer, Meter, Routing, Test Tone, Other
Subcategories for MIDI: Arpeggiator, Chord, Sequencer, Other

Respond with a JSON array, one entry per plugin:
[{{"name":"plugin name","category":"Category","subcategory":"Subcategory","confidence":0.85}}]

Plugins:
{}"#,
        plugin_list.join("\n")
    );

    let client = reqwest::Client::new();
    let response = client
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", api_key))
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({
            "model": model,
            "messages": [
                {
                    "role": "system",
                    "content": "You are an expert at categorizing audio plugins (VST, AU, AAX, CLAP). Always respond with valid JSON only."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            "temperature": 0.1,
            "response_format": { "type": "json_object" }
        }))
        .send()
        .await
        .map_err(|e| AppError::Ai(format!("OpenAI request failed: {}", e)))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(AppError::Ai(format!(
            "OpenAI API error ({}): {}",
            status, body
        )));
    }

    let body: serde_json::Value = response
        .json()
        .await
        .map_err(|e| AppError::Ai(format!("Failed to parse OpenAI response: {}", e)))?;

    // Extract content from the response
    let content = body
        .get("choices")
        .and_then(|c| c.get(0))
        .and_then(|c| c.get("message"))
        .and_then(|m| m.get("content"))
        .and_then(|c| c.as_str())
        .ok_or_else(|| AppError::Ai("Unexpected OpenAI response format".to_string()))?;

    // Parse the JSON array from the content
    let parsed: serde_json::Value = serde_json::from_str(content)
        .map_err(|e| AppError::Ai(format!("Failed to parse AI categorization JSON: {}", e)))?;

    // Handle both direct array and object with "results" or "plugins" key
    let results_array = if let Some(arr) = parsed.as_array() {
        arr.clone()
    } else if let Some(arr) = parsed.get("results").and_then(|v| v.as_array()) {
        arr.clone()
    } else if let Some(arr) = parsed.get("plugins").and_then(|v| v.as_array()) {
        arr.clone()
    } else {
        return Err(AppError::Ai("AI response is not an array".to_string()));
    };

    let suggestions: Vec<CategorySuggestion> = results_array
        .iter()
        .filter_map(|item| {
            Some(CategorySuggestion {
                name: item.get("name")?.as_str()?.to_string(),
                category: item.get("category")?.as_str()?.to_string(),
                subcategory: item.get("subcategory").and_then(|v| v.as_str()).map(|s| s.to_string()),
                confidence: item
                    .get("confidence")
                    .and_then(|v| v.as_f64())
                    .unwrap_or(0.8) as f32,
            })
        })
        .collect();

    Ok(suggestions)
}
