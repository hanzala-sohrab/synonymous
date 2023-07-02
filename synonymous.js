const getSelectionText = async () => {
  var text = "";
  if (window.getSelection) {
    text = window.getSelection().toString();
  } else if (document.selection && document.selection.type != "Control") {
    text = document.selection.createRange().text;
  }
  return text;
}

const displaySynonym = async (synonym) => {
  // Create a dialog element
  const dialog = document.createElement('dialog');
  dialog.textContent = synonym; // Set the content of the dialog

  // Append the dialog to the document
  document.body.appendChild(dialog);

  // Close the dialog when the user clicks anywhere
  document.addEventListener('click', () => {
    if (dialog.open) {
      dialog.close();
    }
  });

  // Open the dialog
  dialog.showModal();
}

async function getMeaning() {
  const text = (await getSelectionText())?.toLowerCase();

  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${text}`;

  const response = await fetch(url, { method: "GET", mode: "no-cors" }).then(data => data.text()).then(data => JSON.parse(data));

  const meaning = response?.[0]?.meanings?.[0].definitions?.[0]?.definition;

  console.log(`Meaning of ${text} is ${meaning}`);

  await displaySynonym(meaning);
}

document.addEventListener("keydown", async (e) => {
  if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'm') {
    await getMeaning();
  }
})
