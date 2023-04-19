function getSelectionText() {
  var text = "";
  if (window.getSelection) {
    text = window.getSelection().toString();
  } else if (document.selection && document.selection.type != "Control") {
    text = document.selection.createRange().text;
  }
  return text;
}

async function getMeaning() {
  const text = getSelectionText().toLowerCase();
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${text}`;
  // console.log('URL = ', url);
  const response = await fetch(url, { method: "GET", mode: "no-cors" }).then(data => data.text()).then(data => JSON.parse(data));
  const meaning = response?.[0].meanings?.[0].definitions?.[0]?.definition;
  // console.log('DATA = ', response);
  console.log(`Meaning of ${text} is ${meaning}`);
}

document.addEventListener("keydown", async (e) => {
  console.log(`Key pressed = ${e.key}`);
  if (e.ctrlKey && e.key.toLowerCase() === 'm') {
    await getMeaning();
  }
})
