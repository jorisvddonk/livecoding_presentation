const webworkify = require("webworkify");
const chromagramWorker = new webworkify(require("./worker.js"));

const THRESHOLD = 28;
const LOWER_THRESHOLD = 5;
const audioCtx = new AudioContext();
const scriptNode = audioCtx.createScriptProcessor(1024, 1, 1);
scriptNode.onaudioprocess = function(event) {
  var audioData = event.inputBuffer.getChannelData(0);
  chromagramWorker.postMessage({
    audioData: audioData,
    sentAt: performance.now()
  });
};
scriptNode.connect(audioCtx.destination);

navigator.getUserMedia(
  { audio: true },
  function(source) {
    const stream = audioCtx.createMediaStreamSource(source);
    stream.connect(scriptNode);
  },
  function(e) {
    alert("Error capturing audio.");
  }
);
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

let n = 0;
function dbg(ev) {
  n += 1;
  if (n > 30) {
    console.clear();
    n = 0;
  }
  const currentChroma = ev.data.currentChroma;
  console.log(
    "Is it " +
      ev.data.rootNote +
      " " +
      ev.data.quality +
      " " +
      ev.data.intervals +
      "?"
  );
  currentChroma.forEach((x, i) => {
    console.log(
      i + "(" + NOTES[i] + ") - " + Array(Math.floor(x * 2)).join("#")
    );
  });
}

const addBars = element => {
  const newElem = document.createElement("div");
  newElem.classList.add("chromaBars");
  newElem.style.textAlign = "center";
  newElem.innerHTML = `
  <div>
  <div class="chromaBar">C</div>
  <div class="chromaBar">C#</div>
  <div class="chromaBar">D</div>
  <div class="chromaBar">D#</div>
  <div class="chromaBar">E</div>
  <div class="chromaBar">F</div>
  <div class="chromaBar">F#</div>
  <div class="chromaBar">G</div>
  <div class="chromaBar">G#</div>
  <div class="chromaBar">A</div>
  <div class="chromaBar">A#</div>
  <div class="chromaBar">B</div>
  </div>
  `;
  element.appendChild(newElem);

  element.addEventListener("chromaData", chroma => {
    const barsContainer = element.querySelector(".chromaBars");
    const bars = element.querySelectorAll(".chromaBar");
    if (chroma.muted === false) {
      barsContainer.classList.add("notMuted");
      barsContainer.classList.remove("hasMuted");
    } else {
      barsContainer.classList.add("hasMuted");
      barsContainer.classList.remove("notMuted");
    }
    for (var i = 0; i < chroma.detectedNotes.length; i++) {
      const bar = bars[i];
      bar.style.height = (chroma.detectedNotes[i].value * 50) / THRESHOLD + "%";
      if (chroma.detectedNotes[i].isAboveThreshold) {
        if (chroma.detectedNotes[i].isRequired) {
          bar.style.backgroundColor = "#FF0";
        } else {
          bar.style.backgroundColor = "#29F";
        }
      } else {
        if (chroma.detectedNotes[i].isRequired) {
          bar.style.backgroundColor = "#F23";
        } else {
          bar.style.backgroundColor = "#05F";
        }
      }
    }
  });
};

module.exports = function() {
  // If you want options, they should be passed in here.
  // https://github.com/markdalgleish/bespoke.js#plugins-with-options
  return function(deck) {
    // Use the 'deck' instance to interact with the presentation.
    // https://github.com/markdalgleish/bespoke.js#deck-instances

    let eventListeners = {};
    let numConseq = 0;
    let muted = false;

    deck.on("deactivate", event => {
      const bars = event.slide.querySelector(".chromaBars");
      if (bars) {
        bars.remove();
      }
    });

    deck.on("activate", function(event) {
      // event.index contains the index of the slide, event.slide contains a ref to the DOM element.

      numConseq = 0;
      muted = false;

      Object.keys(eventListeners).forEach(key => {
        chromagramWorker.removeEventListener("message", eventListeners[key]);
        delete eventListeners[key];
      });

      if (event.slide.hasAttribute("data-rockslide-next")) {
        addBars(event.slide);

        const toDetectNotes = (
          event.slide.getAttribute("data-rockslide-next") || ""
        ).split(" ");
        let eventListener = function(ev) {
          //dbg(ev);

          const noteDetection = [];
          ev.data.currentChroma.forEach((value, index) => {
            const noteName = NOTES[index];
            noteDetection.push({
              index: index,
              value: value,
              isAboveThreshold: muted === true && value >= THRESHOLD,
              noteName: noteName,
              isRequired:
                toDetectNotes.findIndex(
                  toDetectMaybe => toDetectMaybe === noteName
                ) === -1
                  ? false
                  : true
            });
          });

          const evt = new Event("chromaData");
          evt.chromaData = ev.data.currentChroma;
          evt.threshold = THRESHOLD;
          evt.detectedNotes = noteDetection;
          evt.muted = muted;
          event.slide.dispatchEvent(evt);
          if (toDetectNotes === 0) {
            return;
          }

          const detectedAll = noteDetection.reduce(
            (memo, detectedNote, index) => {
              if (memo === false) {
                return false;
              }
              if (detectedNote.isRequired) {
                return detectedNote.isAboveThreshold;
              } else {
                return memo;
              }
            },
            true
          );

          const mutedAll = noteDetection.reduce((memo, detectedNote, index) => {
            if (memo === false) {
              return false;
            }
            if (detectedNote.value > LOWER_THRESHOLD) {
              return false;
            }
            return memo;
          }, true);

          if (mutedAll) {
            muted = true;
          }

          if (detectedAll) {
            numConseq += 1;
          } else {
            numConseq = 0;
          }

          if (numConseq > 10) {
            deck.next();
          }
        };
        eventListeners[event.index] = eventListener;

        chromagramWorker.addEventListener("message", eventListener);
        console.log(event.slide.getAttribute("data-rockslide-next"));
      }
    });
  };
};
