export function freshData(schoolSets) {
  return {
    sets: schoolSets.map(({id,name,words}) => ({id,name,words:[...words],active:id==='september'})),
    progress: {}, choices: 4, lettersEnabled: true, muted: false,
    trial: 0, letterProgress: {}, letterTrial: 0, growthPoints: 0,
    gardenFlowers: [], gardenTotal: 0
  };
}
