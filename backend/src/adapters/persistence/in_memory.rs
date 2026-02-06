use crate::domain::{errors::PersistenceError, ids::ScoreId, score::Score};
use crate::ports::persistence::ScoreRepository;
use std::collections::HashMap;

/// In-memory implementation of ScoreRepository using HashMap
pub struct InMemoryScoreRepository {
    scores: HashMap<ScoreId, Score>,
}

impl InMemoryScoreRepository {
    pub fn new() -> Self {
        Self {
            scores: HashMap::new(),
        }
    }
}

impl Default for InMemoryScoreRepository {
    fn default() -> Self {
        Self::new()
    }
}

impl ScoreRepository for InMemoryScoreRepository {
    fn save(&mut self, score: Score) -> Result<(), PersistenceError> {
        self.scores.insert(score.id, score);
        Ok(())
    }

    fn find_by_id(&self, id: ScoreId) -> Result<Option<Score>, PersistenceError> {
        Ok(self.scores.get(&id).cloned())
    }

    fn delete(&mut self, id: ScoreId) -> Result<(), PersistenceError> {
        self.scores.remove(&id);
        Ok(())
    }

    fn list_all(&self) -> Result<Vec<Score>, PersistenceError> {
        Ok(self.scores.values().cloned().collect())
    }
}
