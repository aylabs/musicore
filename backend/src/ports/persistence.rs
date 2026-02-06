use crate::domain::{errors::PersistenceError, ids::ScoreId, score::Score};

/// Port trait for score persistence (uses interior mutability for thread-safe shared access)
pub trait ScoreRepository {
    /// Save a score to storage
    fn save(&self, score: Score) -> Result<(), PersistenceError>;

    /// Find a score by ID
    fn find_by_id(&self, id: ScoreId) -> Result<Option<Score>, PersistenceError>;

    /// Delete a score by ID
    fn delete(&self, id: ScoreId) -> Result<(), PersistenceError>;

    /// List all scores
    fn list_all(&self) -> Result<Vec<Score>, PersistenceError>;
}
