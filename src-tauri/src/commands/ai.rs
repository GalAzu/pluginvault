use tauri::State;

use crate::ai;
use crate::db::connection::Database;
use crate::db::models::{
    AICategorization, CleanupSuggestion, DuplicateGroup, PluginFilter, PluginSummary,
};
use crate::db::queries;

#[tauri::command]
pub async fn auto_categorize(
    db: State<'_, Database>,
    use_ai: Option<bool>,
) -> Result<Vec<AICategorization>, String> {
    // Scope the MutexGuard so it's dropped before any .await
    let (plugins, settings) = {
        let conn = db.conn();
        let plugins = queries::get_plugins_for_ai(&conn, true).map_err(|e| e.to_string())?;
        let settings = queries::get_all_settings(&conn).map_err(|e| e.to_string())?;
        (plugins, settings)
    };

    if plugins.is_empty() {
        return Ok(Vec::new());
    }

    let mut results: Vec<AICategorization> = Vec::new();

    // First pass: local heuristics
    for plugin in &plugins {
        let suggestion = ai::local::categorize_by_heuristics(
            &plugin.name,
            &plugin.vendor,
            &None,
        );

        if suggestion.confidence > 0.5 {
            results.push(AICategorization {
                plugin_id: plugin.id.clone(),
                category: suggestion.category,
                subcategory: suggestion.subcategory,
                confidence: suggestion.confidence,
                source: "heuristic".to_string(),
            });
        }
    }

    // Apply heuristic results to DB
    {
        let conn = db.conn();
        for r in &results {
            let update = crate::db::models::PluginUpdate {
                category: Some(r.category.clone()),
                subcategory: r.subcategory.clone(),
                ..Default::default()
            };
            let _ = queries::update_plugin(&conn, &r.plugin_id, &update);
        }
    }

    // Second pass: OpenAI for remaining uncategorized (if enabled)
    if use_ai.unwrap_or(false) {
        let categorized_ids: std::collections::HashSet<String> =
            results.iter().map(|r| r.plugin_id.clone()).collect();

        let remaining: Vec<PluginSummary> = plugins
            .iter()
            .filter(|p| !categorized_ids.contains(&p.id))
            .map(|p| PluginSummary {
                name: p.name.clone(),
                vendor: p.vendor.clone(),
                format: p.format.clone(),
            })
            .collect();

        if !remaining.is_empty() && !settings.ai_api_key.is_empty() {
            // Process in batches of 20 — no MutexGuard held across await
            for batch in remaining.chunks(20) {
                match ai::openai::categorize_batch(
                    batch,
                    &settings.ai_api_key,
                    &settings.ai_model,
                )
                .await
                {
                    Ok(suggestions) => {
                        let conn = db.conn();
                        for suggestion in suggestions {
                            if let Some(plugin) = plugins.iter().find(|p| {
                                p.name.to_lowercase() == suggestion.name.to_lowercase()
                            }) {
                                let update = crate::db::models::PluginUpdate {
                                    category: Some(suggestion.category.clone()),
                                    subcategory: suggestion.subcategory.clone(),
                                    ..Default::default()
                                };
                                let _ = queries::update_plugin(&conn, &plugin.id, &update);

                                results.push(AICategorization {
                                    plugin_id: plugin.id.clone(),
                                    category: suggestion.category,
                                    subcategory: suggestion.subcategory,
                                    confidence: suggestion.confidence,
                                    source: "openai".to_string(),
                                });
                            }
                        }
                    }
                    Err(e) => {
                        log::warn!("AI categorization batch failed: {}", e);
                    }
                }
            }
        }
    }

    Ok(results)
}

#[tauri::command]
pub fn detect_duplicates(db: State<'_, Database>) -> Result<Vec<DuplicateGroup>, String> {
    let conn = db.conn();
    let plugins =
        queries::get_all_plugins(&conn, &PluginFilter::default()).map_err(|e| e.to_string())?;
    Ok(ai::duplicates::detect_duplicates(&plugins))
}

#[tauri::command]
pub fn suggest_cleanup(db: State<'_, Database>) -> Result<Vec<CleanupSuggestion>, String> {
    let conn = db.conn();
    let plugins =
        queries::get_all_plugins(&conn, &PluginFilter::default()).map_err(|e| e.to_string())?;
    Ok(ai::suggestions::suggest_cleanup(&plugins))
}
