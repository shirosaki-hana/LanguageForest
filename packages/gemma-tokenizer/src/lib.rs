use std::path::{Path, PathBuf};
use std::str::FromStr;

use anyhow::{anyhow, bail, Result};
use once_cell::sync::OnceCell;
use tokenizers::Tokenizer;
use wasm_bindgen::prelude::*;

/// Global tokenizer instance loaded once at startup.
static TOKENIZER: OnceCell<Tokenizer> = OnceCell::new();

/// Try to resolve a usable `tokenizer.json` path from the given input path.
/// - If `path` is a directory, returns `path/tokenizer.json` if it exists.
/// - If `path` is a file ending with `.json`, returns it as-is.
enum ModelPathKind {
    Json(PathBuf),
}

fn resolve_model_path<P: AsRef<Path>>(path: P) -> Result<ModelPathKind> {
    let p = path.as_ref();
    if p.is_dir() {
        let json = p.join("tokenizer.json");
        if json.is_file() {
            return Ok(ModelPathKind::Json(json));
        }

        bail!("No tokenizer.json found in directory: {}. Convert .model to tokenizer.json first.", p.display());
    }

    if p.is_file() {
        let is_json = p
            .extension()
            .and_then(|e| e.to_str())
            .map(|ext| ext.eq_ignore_ascii_case("json"))
            .unwrap_or(false);
        if is_json {
            return Ok(ModelPathKind::Json(p.to_path_buf()));
        }

        bail!("Provided file is not tokenizer.json: {}", p.display());
    }

    bail!("Path does not exist: {}", p.display());
}

/// Initialize the global tokenizer from a directory containing `tokenizer.json`,
/// or a direct path to `tokenizer.json`.
pub fn init<P: AsRef<Path>>(path: P) -> Result<()> {
    let model_kind = resolve_model_path(path)?;
    let tokenizer = match model_kind {
        ModelPathKind::Json(json_path) => Tokenizer::from_file(&json_path)
            .map_err(|e| anyhow!("Failed to load tokenizer from {}: {}", json_path.display(), e))?,
    };

    TOKENIZER
        .set(tokenizer)
        .map_err(|_| anyhow!("Tokenizer already initialized"))?;
    Ok(())
}

fn get_tokenizer() -> Result<&'static Tokenizer> {
    TOKENIZER
        .get()
        .ok_or_else(|| anyhow!("Tokenizer is not initialized. Call init(path) first."))
}

/// Internal count implementation
fn count_internal(text: &str) -> Result<usize> {
    let tok = get_tokenizer()?;
    let encoding = tok
        .encode(text, false)
        .map_err(|e| anyhow!("Failed to encode text: {}", e))?;
    Ok(encoding.len())
}

/// Encode to token ids (useful for deeper validation or debugging).
pub fn encode(text: &str) -> Result<Vec<u32>> {
    let tok = get_tokenizer()?;
    let encoding = tok
        .encode(text, false)
        .map_err(|e| anyhow!("Failed to encode text: {}", e))?;
    Ok(encoding.get_ids().to_vec())
}

// ===== WASM exports =====
#[wasm_bindgen]
pub fn init_from_json(json: String) -> Result<(), JsValue> {
    let tokenizer = Tokenizer::from_str(&json).map_err(|e| JsValue::from_str(&e.to_string()))?;
    TOKENIZER
        .set(tokenizer)
        .map_err(|_| JsValue::from_str("Tokenizer already initialized"))?;
    Ok(())
}

#[wasm_bindgen]
pub fn count(text: String) -> u32 {
    match count_internal(&text) {
        Ok(n) => u32::try_from(n).unwrap_or(u32::MAX),
        Err(_) => 0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn init_missing_path_yields_error() {
        let err = init("./not-exists").unwrap_err();
        assert!(err.to_string().contains("not exist"));
    }
}
