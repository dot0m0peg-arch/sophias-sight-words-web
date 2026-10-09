export function resolveClipTexts(text, indexKeys) {
    if (indexKeys.has(text)) return [text];

    const removingFinalPeriod = (t) => t.endsWith('.') ? t.slice(0, -1) : t;
    const asciiLetterKey = (t) => {
        if (t.length !== 1) return null;
        const upper = t.toUpperCase();
        if (!/^[A-Z]$/.test(upper)) return null;
        return `letter:${upper}`;
    };

    let result;

    if (text.startsWith("Let's look again. The letter is ")) {
        const rest = text.slice("Let's look again. The letter is ".length);
        const dotIndex = rest.indexOf('. ');
        const letter = dotIndex >= 0 ? rest.slice(0, dotIndex) : rest;
        const key = asciiLetterKey(letter);
        if (!key || rest !== `${letter}. ${letter}.`) return null;
        result = ["Let's look again.", "The letter is", key, key];
    } else if (text.startsWith("Great job! The letter is ")) {
        const rest = removingFinalPeriod(text.slice("Great job! The letter is ".length));
        const key = asciiLetterKey(rest);
        if (!key) return null;
        result = ["Great job!", "The letter is", key];
    } else if (["Find the big letter ", "Find the little letter ", "The letter is "]
        .some(p => text.startsWith(p))) {
        const prefixes = ["Find the big letter ", "Find the little letter ", "The letter is "];
        const prefix = prefixes.find(p => text.startsWith(p));
        if (!prefix) return null;
        const rest = removingFinalPeriod(text.slice(prefix.length));
        const key = asciiLetterKey(rest);
        if (!key) return null;
        result = [prefix.slice(0, -1), key];
    } else if (text.startsWith("Let's look again. This is ")) {
        const rest = text.slice("Let's look again. This is ".length);
        const dotIndex = rest.indexOf('. ');
        const word = dotIndex >= 0 ? rest.slice(0, dotIndex) : rest;
        if (rest !== `${word}. ${word}.`) return null;
        result = ["Let's look again.", "This is", word, word];
    } else {
        const prefixes = ["Find two copies of the word,", "Find the word,", "Great job!", "The word is"];
        const prefix = prefixes.find(p => text.startsWith(p + " "));
        if (!prefix) return null;
        const word = removingFinalPeriod(text.slice(prefix.length + 1));
        result = [prefix, word];
    }

    return result.every(k => indexKeys.has(k)) ? result : null;
}

