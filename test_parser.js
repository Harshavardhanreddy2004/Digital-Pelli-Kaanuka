const { parseSpeech } = require('./parser.js');

const tests = [
  { text: "హర్షవర్ధన్ రెడ్డి పోచంపల్లి మూడు వేల రూపాయలు", lang: "te" },
  { text: "పోచంపల్లి రమేష్ వెయ్యి రూపాయలు", lang: "te" },
  { text: "Harshavardhan Reddy from Pochampally 3000 rupees", lang: "en" },
  { text: "RajiReddy s/o Sammi Reddy from pochampalli 2000 rupees", lang: "en" }
];

console.log("Starting parser tests...\n");

tests.forEach((t, i) => {
  const result = parseSpeech(t.text, t.lang);
  console.log(`Test ${i + 1}: "${t.text}" (${t.lang})`);
  console.log(JSON.stringify(result, null, 2));
  console.log("------------------------------------------");
});
