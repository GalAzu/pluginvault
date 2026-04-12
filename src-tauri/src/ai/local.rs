use crate::db::models::CategorySuggestion;

/// Categorize a plugin using local heuristics (no API calls)
pub fn categorize_by_heuristics(
    name: &str,
    vendor: &Option<String>,
    _format_metadata: &Option<String>,
) -> CategorySuggestion {
    let lower_name = name.to_lowercase();
    let lower_vendor = vendor.as_deref().unwrap_or("").to_lowercase();

    // 1. Known plugin lookup (exact matches for popular plugins)
    if let Some(result) = lookup_known_plugin(&lower_name) {
        return result;
    }

    // 2. Known vendor defaults
    if let Some(result) = lookup_known_vendor(&lower_vendor, name) {
        return result;
    }

    // 3. Keyword matching in plugin name
    keyword_categorize(&lower_name, name)
}

fn lookup_known_plugin(name: &str) -> Option<CategorySuggestion> {
    let (category, subcategory, confidence) = match name {
        // Synths
        n if n.contains("serum") => ("Instrument", Some("Synthesizer"), 0.95),
        n if n.contains("massive") => ("Instrument", Some("Synthesizer"), 0.95),
        n if n.contains("vital") && !n.contains("revital") => ("Instrument", Some("Synthesizer"), 0.90),
        n if n.contains("omnisphere") => ("Instrument", Some("Synthesizer"), 0.95),
        n if n.contains("sylenth") => ("Instrument", Some("Synthesizer"), 0.95),
        n if n.contains("diva") => ("Instrument", Some("Synthesizer"), 0.90),
        n if n.contains("pigments") => ("Instrument", Some("Synthesizer"), 0.95),
        n if n.contains("phase plant") => ("Instrument", Some("Synthesizer"), 0.95),
        n if n.contains("hive") => ("Instrument", Some("Synthesizer"), 0.85),
        n if n.contains("spire") => ("Instrument", Some("Synthesizer"), 0.90),
        n if n.contains("zebra") => ("Instrument", Some("Synthesizer"), 0.90),
        n if n.contains("repro") => ("Instrument", Some("Synthesizer"), 0.90),
        n if n.contains("reaktor") => ("Instrument", Some("Synthesizer"), 0.90),
        n if n.contains("fm8") => ("Instrument", Some("Synthesizer"), 0.95),
        n if n.contains("absynth") => ("Instrument", Some("Synthesizer"), 0.95),
        n if n.contains("alchemy") => ("Instrument", Some("Synthesizer"), 0.85),
        n if n.contains("surge") => ("Instrument", Some("Synthesizer"), 0.85),
        n if n.contains("analog lab") => ("Instrument", Some("Synthesizer"), 0.90),

        // Samplers
        n if n.contains("kontakt") => ("Instrument", Some("Sampler"), 0.95),
        n if n.contains("battery") => ("Instrument", Some("Drum Machine"), 0.95),
        n if n.contains("play") && n.contains("east west") => ("Instrument", Some("Sampler"), 0.90),
        n if n.contains("halion") => ("Instrument", Some("Sampler"), 0.90),

        // EQ
        n if n.contains("pro-q") || n.contains("proq") => ("Effect", Some("EQ"), 0.95),
        n if n.contains("equilibrium") => ("Effect", Some("EQ"), 0.90),
        n if n.contains("gullfoss") => ("Effect", Some("EQ"), 0.90),
        n if n.contains("soothe") => ("Effect", Some("EQ"), 0.90),

        // Compressors
        n if n.contains("pro-c") || n.contains("proc") => ("Effect", Some("Compressor"), 0.95),
        n if n.contains("ssl comp") => ("Effect", Some("Compressor"), 0.95),
        n if n.contains("1176") => ("Effect", Some("Compressor"), 0.95),
        n if n.contains("la-2a") || n.contains("la2a") => ("Effect", Some("Compressor"), 0.95),
        n if n.contains("opto") && n.contains("comp") => ("Effect", Some("Compressor"), 0.90),

        // Reverb
        n if n.contains("valhalla") && n.contains("room") => ("Effect", Some("Reverb"), 0.95),
        n if n.contains("valhalla") && n.contains("vintage") => ("Effect", Some("Reverb"), 0.95),
        n if n.contains("valhalla") && n.contains("shimmer") => ("Effect", Some("Reverb"), 0.95),
        n if n.contains("pro-r") || n.contains("pror") => ("Effect", Some("Reverb"), 0.95),
        n if n.contains("rc-20") => ("Effect", Some("Reverb"), 0.80),
        n if n.contains("plate") && n.contains("reverb") => ("Effect", Some("Reverb"), 0.90),

        // Delay
        n if n.contains("echoboy") => ("Effect", Some("Delay"), 0.95),
        n if n.contains("valhalla") && n.contains("delay") => ("Effect", Some("Delay"), 0.95),
        n if n.contains("timeless") => ("Effect", Some("Delay"), 0.85),
        n if n.contains("replika") => ("Effect", Some("Delay"), 0.90),

        // Limiter
        n if n.contains("pro-l") || n.contains("prol") => ("Effect", Some("Limiter"), 0.95),
        n if n.contains("ozone") => ("Effect", Some("Mastering"), 0.90),
        n if n.contains("l2") && n.contains("waves") => ("Effect", Some("Limiter"), 0.90),

        // Distortion / Saturation
        n if n.contains("saturn") => ("Effect", Some("Saturation"), 0.90),
        n if n.contains("decapitator") => ("Effect", Some("Saturation"), 0.95),
        n if n.contains("trash") => ("Effect", Some("Distortion"), 0.85),

        // Analyzers
        n if n.contains("span") => ("Utility", Some("Analyzer"), 0.90),
        n if n.contains("insight") => ("Utility", Some("Analyzer"), 0.85),
        n if n.contains("youlean") => ("Utility", Some("Meter"), 0.90),

        _ => return None,
    };

    Some(CategorySuggestion {
        name: name.to_string(),
        category: category.to_string(),
        subcategory: subcategory.map(|s| s.to_string()),
        confidence,
    })
}

fn lookup_known_vendor(vendor: &str, name: &str) -> Option<CategorySuggestion> {
    let default_category = match vendor {
        v if v.contains("fabfilter") => Some(("Effect", 0.70)),
        v if v.contains("waves") => Some(("Effect", 0.65)),
        v if v.contains("izotope") => Some(("Effect", 0.65)),
        v if v.contains("soundtoys") => Some(("Effect", 0.80)),
        v if v.contains("plugin alliance") => Some(("Effect", 0.65)),
        v if v.contains("universal audio") || v.contains("uad") => Some(("Effect", 0.65)),
        v if v.contains("native instruments") || v.contains("ni") => None, // mixed
        v if v.contains("arturia") => None, // mixed instruments + effects
        v if v.contains("u-he") => ("Instrument", 0.70).into(),
        v if v.contains("spectrasonics") => Some(("Instrument", 0.85)),
        v if v.contains("xfer") => None, // serum (instrument) + OTT (effect)
        v if v.contains("valhalla") || v.contains("valhalladsp") => Some(("Effect", 0.85)),
        v if v.contains("slate digital") => Some(("Effect", 0.75)),
        v if v.contains("softube") => Some(("Effect", 0.70)),
        v if v.contains("ssl") => Some(("Effect", 0.75)),
        v if v.contains("kilohearts") => Some(("Effect", 0.70)),
        v if v.contains("eventide") => Some(("Effect", 0.75)),
        v if v.contains("boz digital") => Some(("Effect", 0.70)),
        v if v.contains("tokyo dawn") || v.contains("tdr") => Some(("Effect", 0.80)),
        v if v.contains("meldaproduction") => Some(("Effect", 0.65)),
        v if v.contains("goodhertz") => Some(("Effect", 0.80)),
        v if v.contains("analog obsession") => Some(("Effect", 0.80)),
        v if v.contains("airwindows") => Some(("Effect", 0.85)),
        _ => None,
    };

    default_category.map(|(cat, conf)| CategorySuggestion {
        name: name.to_string(),
        category: cat.to_string(),
        subcategory: None,
        confidence: conf,
    })
}

fn keyword_categorize(lower_name: &str, original_name: &str) -> CategorySuggestion {
    // Instruments
    if lower_name.contains("synth")
        || lower_name.contains("keys")
        || lower_name.contains("piano")
        || lower_name.contains("organ")
        || lower_name.contains("bass") && lower_name.contains("synth")
    {
        return CategorySuggestion {
            name: original_name.to_string(),
            category: "Instrument".to_string(),
            subcategory: Some("Synthesizer".to_string()),
            confidence: 0.60,
        };
    }
    if lower_name.contains("drum") || lower_name.contains("percussion") || lower_name.contains("beat") {
        return CategorySuggestion {
            name: original_name.to_string(),
            category: "Instrument".to_string(),
            subcategory: Some("Drums".to_string()),
            confidence: 0.55,
        };
    }
    if lower_name.contains("sampler") || lower_name.contains("sample") {
        return CategorySuggestion {
            name: original_name.to_string(),
            category: "Instrument".to_string(),
            subcategory: Some("Sampler".to_string()),
            confidence: 0.50,
        };
    }

    // Effects
    if lower_name.contains("reverb") || lower_name.contains("verb") || lower_name.contains("room") && lower_name.contains("plate") {
        return CategorySuggestion {
            name: original_name.to_string(),
            category: "Effect".to_string(),
            subcategory: Some("Reverb".to_string()),
            confidence: 0.70,
        };
    }
    if lower_name.contains("delay") || lower_name.contains("echo") {
        return CategorySuggestion {
            name: original_name.to_string(),
            category: "Effect".to_string(),
            subcategory: Some("Delay".to_string()),
            confidence: 0.70,
        };
    }
    if lower_name.contains("compressor") || lower_name.contains("comp") && !lower_name.contains("component") {
        return CategorySuggestion {
            name: original_name.to_string(),
            category: "Effect".to_string(),
            subcategory: Some("Compressor".to_string()),
            confidence: 0.65,
        };
    }
    if lower_name.contains("equalizer") || lower_name.contains(" eq") || lower_name.starts_with("eq") {
        return CategorySuggestion {
            name: original_name.to_string(),
            category: "Effect".to_string(),
            subcategory: Some("EQ".to_string()),
            confidence: 0.70,
        };
    }
    if lower_name.contains("limiter") || lower_name.contains("limit") {
        return CategorySuggestion {
            name: original_name.to_string(),
            category: "Effect".to_string(),
            subcategory: Some("Limiter".to_string()),
            confidence: 0.70,
        };
    }
    if lower_name.contains("distort") || lower_name.contains("saturat") || lower_name.contains("overdrive") {
        return CategorySuggestion {
            name: original_name.to_string(),
            category: "Effect".to_string(),
            subcategory: Some("Distortion".to_string()),
            confidence: 0.65,
        };
    }
    if lower_name.contains("chorus") || lower_name.contains("flanger") || lower_name.contains("phaser") {
        return CategorySuggestion {
            name: original_name.to_string(),
            category: "Effect".to_string(),
            subcategory: Some("Modulation".to_string()),
            confidence: 0.70,
        };
    }
    if lower_name.contains("gate") && !lower_name.contains("sidechain") {
        return CategorySuggestion {
            name: original_name.to_string(),
            category: "Effect".to_string(),
            subcategory: Some("Gate".to_string()),
            confidence: 0.65,
        };
    }
    if lower_name.contains("meter") || lower_name.contains("analyzer") || lower_name.contains("analyser") {
        return CategorySuggestion {
            name: original_name.to_string(),
            category: "Utility".to_string(),
            subcategory: Some("Analyzer".to_string()),
            confidence: 0.70,
        };
    }
    if lower_name.contains("filter") {
        return CategorySuggestion {
            name: original_name.to_string(),
            category: "Effect".to_string(),
            subcategory: Some("Filter".to_string()),
            confidence: 0.55,
        };
    }
    if lower_name.contains("pitch") || lower_name.contains("autotune") || lower_name.contains("tune") {
        return CategorySuggestion {
            name: original_name.to_string(),
            category: "Effect".to_string(),
            subcategory: Some("Pitch".to_string()),
            confidence: 0.55,
        };
    }

    // Default: unknown
    CategorySuggestion {
        name: original_name.to_string(),
        category: "Uncategorized".to_string(),
        subcategory: None,
        confidence: 0.0,
    }
}
