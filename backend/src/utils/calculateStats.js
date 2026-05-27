export const computeStudentStats = (subjects) => {
  const totalObtained = subjects.reduce((sum, s) => sum + s.marksObtained, 0);
  const totalMax = subjects.reduce((sum, s) => sum + s.maxMarks, 0);
  const average = subjects.length ? totalObtained / subjects.length : 0;
  const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

  return {
    totalObtained: Math.round(totalObtained * 100) / 100,
    totalMax: Math.round(totalMax * 100) / 100,
    average: Math.round(average * 100) / 100,
    percentage: Math.round(percentage * 100) / 100,
  };
};

export const assignRanks = (results) => {
  const sorted = [...results].sort((a, b) => b.totalObtained - a.totalObtained);
  let currentRank = 0;
  let previousTotal = null;
  let skip = 0;

  return sorted.map((item, index) => {
    if (item.totalObtained !== previousTotal) {
      currentRank = index + 1;
      skip = 0;
    } else {
      skip += 1;
    }
    previousTotal = item.totalObtained;
    return { ...item, rank: currentRank };
  });
};
