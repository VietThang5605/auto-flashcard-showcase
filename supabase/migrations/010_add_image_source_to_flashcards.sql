-- Add image_source column to flashcards table
-- Stores the original source of the image (e.g., 'unsplash', 'pixabay')

ALTER TABLE flashcards
ADD COLUMN image_source TEXT;

-- Update description for the new column
COMMENT ON COLUMN flashcards.image_source IS 'Source of the flashcard image (unsplash or pixabay)';
