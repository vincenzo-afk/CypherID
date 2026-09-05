# AI Model Directory

The Isolation Forest model is stored here as `isolation_forest.pkl`.

Behavior (docs/ai/01_AI_ARCHITECTURE.md):
- If `isolation_forest.pkl` exists at startup, it is loaded.
- If absent, a model is trained on synthetic access-log data
  (~95% normal / ~5% anomalous, contamination=0.05) and persisted here.

The file is generated at runtime; it is not committed. In a real deployment
the model is trained offline on production access patterns.