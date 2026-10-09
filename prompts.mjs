const examples = ['apple','ball','cat','dog','egg','fish','goat','hat','igloo','jump','kite','lion','moon','nest','octopus','pig','queen','rabbit','sun','turtle','up','van','web','fox','yellow','zebra'];
export function letterExample(letter) {
  const index = typeof letter === 'string' ? letter.toLowerCase().charCodeAt(0)-97 : -1;
  return examples[index] ?? 'apple';
}
export function questionSkill(game, letterTrial=0) {
  return game === 'letters' ? ['upper','lower','sound'][letterTrial%3] : 'word';
}
export function questionPrompt(game, target, letterTrial=0) {
  if (game === 'letters') {
    const skill = questionSkill(game,letterTrial);
    if (skill === 'sound') {
      const example = letterExample(target);
      const sound = target.toLowerCase() === 'x' ? 'last two sounds' : 'first sound';
      return `Listen to ${example}. Find the letter for the ${sound} in ${example}.`;
    }
    return `Find the ${skill === 'upper' ? 'big' : 'little'} letter ${target.toUpperCase()}.`;
  }
  return game === 'twins' ? `Find two copies of the word, ${target}.` : `Find the word, ${target}.`;
}
export function isIndependentAnswer({usedVisualHelp,muted,voiceReady,game,choices}) {
  return !usedVisualHelp && !muted && !!voiceReady && game !== 'twins' && new Set(choices).size > 1;
}
