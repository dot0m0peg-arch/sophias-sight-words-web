const games = [
  {id:'find',title:'Find the Word',mark:'✦'},
  {id:'race',title:'Unicorn Race',mark:'★'},
  {id:'twins',title:'Match Twins',mark:'♥'},
  {id:'pop',title:'Word Pop',mark:'○'},
  {id:'train',title:'Word Train',mark:'▰'},
  {id:'letters',title:'Letter Garden',mark:'Aa'}
];
export const availableGames = lettersEnabled => games.filter(g => lettersEnabled || g.id !== 'letters').map(g => ({...g}));
export const gameTitle = id => games.find(g => g.id === id)?.title ?? "Let's play";
export const gameMark = id => games.find(g => g.id === id)?.mark ?? '';
