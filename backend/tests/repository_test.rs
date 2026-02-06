use musicore_backend::{
    adapters::persistence::in_memory::InMemoryScoreRepository,
    domain::{
        instrument::Instrument,
        score::Score,
    },
    ports::persistence::ScoreRepository,
};

#[test]
fn test_repository_save_and_find() {
    let mut repo = InMemoryScoreRepository::new();
    let score = Score::new();
    let score_id = score.id;
    
    let result = repo.save(score);
    assert!(result.is_ok());
    
    let found = repo.find_by_id(score_id);
    assert!(found.is_ok());
    assert!(found.unwrap().is_some());
}

#[test]
fn test_repository_find_nonexistent() {
    let repo = InMemoryScoreRepository::new();
    let score = Score::new();
    
    let found = repo.find_by_id(score.id);
    assert!(found.is_ok());
    assert!(found.unwrap().is_none());
}

#[test]
fn test_repository_save_overwrites() {
    let mut repo = InMemoryScoreRepository::new();
    let mut score = Score::new();
    let score_id = score.id;
    
    repo.save(score.clone()).unwrap();
    
    // Modify and save again
    score.add_instrument(Instrument::new("Piano".to_string()));
    repo.save(score).unwrap();
    
    let found = repo.find_by_id(score_id).unwrap().unwrap();
    assert_eq!(found.instruments.len(), 1);
}

#[test]
fn test_repository_delete() {
    let mut repo = InMemoryScoreRepository::new();
    let score = Score::new();
    let score_id = score.id;
    
    repo.save(score).unwrap();
    let result = repo.delete(score_id);
    assert!(result.is_ok());
    
    let found = repo.find_by_id(score_id).unwrap();
    assert!(found.is_none());
}

#[test]
fn test_repository_list_all() {
    let mut repo = InMemoryScoreRepository::new();
    
    repo.save(Score::new()).unwrap();
    repo.save(Score::new()).unwrap();
    repo.save(Score::new()).unwrap();
    
    let scores = repo.list_all().unwrap();
    assert_eq!(scores.len(), 3);
}

#[test]
fn test_repository_list_all_empty() {
    let repo = InMemoryScoreRepository::new();
    
    let scores = repo.list_all().unwrap();
    assert_eq!(scores.len(), 0);
}
