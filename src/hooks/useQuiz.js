// --- src/hooks/useQuiz.js ---
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { db } from "@/lib/db";

const MAX_QUIZ_QUESTIONS = 10;

function shuffleArray(array) {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

export function useQuiz() {
  const [questions, setQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const [score, setScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);

  const startQuiz = useCallback(async (selectedDeckId = null) => {
    setIsLoading(true);
    setIsReady(false);
    setIsFinished(false);
    setCurrentIndex(0);
    setScore(0);
    setCorrectCount(0);
    setWrongCount(0);
    setCurrentStreak(0);
    setBestStreak(0);

    try {
      // Vì đang Offline, ta lấy từ local
      let cards = await db.flashcards.filter(f => !f.is_deleted && Array.isArray(f.quiz_questions) && f.quiz_questions.length > 0).toArray();

      if (selectedDeckId !== null) {
        if (selectedDeckId === "root") {
          cards = cards.filter(c => c.deck_id === null);
        } else {
          // Lấy tất cả decks phân cấp
          const allDecks = await db.decks.filter(d => !d.is_deleted).toArray();
          let targetDeckIds = [selectedDeckId];
          
          if (allDecks) {
            const getDescendants = (parentId) => {
              const children = allDecks.filter(d => d.parent_id === parentId).map(d => d.id);
              let descendants = [...children];
              children.forEach(childId => {
                descendants = descendants.concat(getDescendants(childId));
              });
              return descendants;
            };
            targetDeckIds = targetDeckIds.concat(getDescendants(selectedDeckId));
          }
          cards = cards.filter(c => targetDeckIds.includes(c.deck_id));
        }
      }

      if (!cards || cards.length === 0) {
        toast.error("Thư viện của bạn chưa có bộ câu hỏi trắc nghiệm nào. Hãy tạo thêm từ vựng mới bằng AI!");
        setQuestions([]);
        setIsReady(true);
        setIsLoading(false);
        return;
      }

      let allQuestions = [];
      cards.forEach(card => {
        if (Array.isArray(card.quiz_questions)) {
          card.quiz_questions.forEach(q => {
            if (q.question && Array.isArray(q.options) && q.answer) {
              allQuestions.push({
                ...q,
                flashcard_id: card.id,
                word: card.word
              });
            }
          });
        }
      });

      allQuestions = shuffleArray(allQuestions);
      const finalQuestions = allQuestions.slice(0, MAX_QUIZ_QUESTIONS);
      
      setQuestions(finalQuestions);
      setIsReady(true);
    } catch (err) {
      console.error("Lỗi khi load quiz:", err);
      toast.error(err.message || "Có lỗi xảy ra khi chuẩn bị câu hỏi.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const answerQuestion = useCallback((isCorrect) => {
    if (isCorrect) {
      setCorrectCount(prev => prev + 1);
      setCurrentStreak(prev => {
        const newStreak = prev + 1;
        setBestStreak(b => Math.max(b, newStreak));
        return newStreak;
      });
      setScore(prev => prev + 10 + (currentStreak * 2));
    } else {
      setWrongCount(prev => prev + 1);
      setCurrentStreak(0);
    }

    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
    } else {
      setIsFinished(true);
    }
  }, [currentIndex, questions.length, currentStreak]);

  return {
    questions,
    isLoading,
    isReady,
    currentIndex,
    isFinished,
    score,
    correctCount,
    wrongCount,
    currentStreak,
    bestStreak,
    startQuiz,
    answerQuestion,
    currentQuestion: questions[currentIndex] || null
  };
}
