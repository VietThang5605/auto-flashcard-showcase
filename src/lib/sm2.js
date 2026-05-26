// --- lib/sm2.js ---
// Thuật toán Anki SM-2 Variant chạy offline ở Client.
// Đồng bộ 100% logic với SQL Function process_review (Migration 005)

export function calculateSM2(quality, repetitions, previousInterval, previousEaseFactor) {
  let v_ef = previousEaseFactor;
  let v_reps = repetitions;
  let v_interval = previousInterval;
  
  // Tính toán thời gian nhảy thêm để quy đổi ra Next Review Date
  // Đơn vị: Phút
  let addedMinutes = 0;

  // LEARNING PHASE / NEW CARDS (reps = 0 hoặc reps = 1)
  if (v_reps < 2) {
    if (quality === 0) { // Again
      v_reps = 0;
      v_interval = 0;
      addedMinutes = 1;
    } else if (quality === 1) { // Hard
      v_reps = 0;
      v_interval = 0;
      addedMinutes = 6;
    } else if (quality === 2) { // Good
      if (v_reps === 0) {
        v_reps = 1;
        v_interval = 0;
        addedMinutes = 10;
      } else {
        v_reps = 2;
        v_interval = 1; 
        addedMinutes = 12 * 60; // 12 hours
      }
    } else if (quality === 3) { // Easy
      v_reps = 2;
      v_interval = 4;
      addedMinutes = 4 * 24 * 60; // 4 days
    }
  } 
  // REVIEW PHASE / GRADUATED CARDS (reps >= 2)
  else {
    if (quality === 0) { // Again
      v_reps = 0;
      v_interval = 0;
      v_ef = Math.max(1.3, v_ef - 0.20);
      addedMinutes = 10;
    } else if (quality === 1) { // Hard
      v_reps = v_reps + 1;
      v_interval = Math.max(1, Math.ceil(v_interval * 1.2));
      v_ef = Math.max(1.3, v_ef - 0.15);
      addedMinutes = v_interval * 24 * 60;
    } else if (quality === 2) { // Good
      v_reps = v_reps + 1;
      v_interval = Math.max(1, Math.ceil(v_interval * v_ef));
      addedMinutes = v_interval * 24 * 60;
    } else if (quality === 3) { // Easy
      v_reps = v_reps + 1;
      v_interval = Math.max(1, Math.ceil(v_interval * v_ef * 1.3));
      v_ef = v_ef + 0.15;
      addedMinutes = v_interval * 24 * 60;
    }
  }

  // Chuyển đổi thành ISO string thay vì tự cộng ngày bên ngoài
  // Tính tại đây luôn để tiện cho các hook
  const nextDate = new Date();
  nextDate.setMinutes(nextDate.getMinutes() + addedMinutes);

  return {
    interval: v_interval,
    repetitions: v_reps,
    easeFactor: v_ef,
    nextReviewDateOriginal: nextDate.toISOString() 
  };
}
