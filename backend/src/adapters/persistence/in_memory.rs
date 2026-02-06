use crate::domain::{errors::PersistenceError, ids::ScoreId, score::Score};
use crate::ports::persistence::ScoreRepository;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

/// In-memory implementation of ScoreRepository using HashMap with thread-safe access
#[derive(Clone)]
pub struct InMemoryScoreRepository {
    scores: Arc<Mutex<HashMap<ScoreId, Score>>>,
}

impl InMemoryScoreRepository {
    pub fn new() -> Self {
        Self {
            scores: Arc::new(Mutex::new(HashMap::new())),
        }
    }
}

impl Default for InMemoryScoreRepository {
    fn default() -> Self {
        Self::new()
    }
}

impl ScoreRepository for InMemoryScoreRepository {
    fn save(&self, score: Score) -> Result<(), PersistenceError> {
        let mut scores = self.scores.lock()
            .map_err(|e| PersistenceError::StorageError(format!("Lock error: {}", e)))?;
        scores.insert(score.id, score);
        Ok(())
    }

    fn find_by_id(&self, id: ScoreId) -> Result<Option<Score>, PersistenceError> {
        let scores = self.scores.lock()
            .map_err(|e| PersistenceError::StorageError(format!("Lock error: {}", e)))?;
        Ok(scores.get(&id).cloned())
    }

    fn delete(&self, id: ScoreId) -> Result<(), PersistenceError> {
        let mut scores = self.scores.lock()
            .map_err(|e| PersistenceError::StorageError(format!("Lock error: {}", e)))?;
        scores.remove(&id);
        Ok(())
    }

    fn list_all(&self) -> Result<Vec<Score>, PersistenceError> {
        let scores = self.scores.lock()
            .map_err(|e| PersistenceError::StorageError(format!("Lock error: {}", e)))?;
        Ok(scores.values().cloned().collect())
    }
}
