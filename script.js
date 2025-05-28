let time = 60;
let nagrywaj = false;
const timeDispl = document.getElementById('timeDispl');
const timeSlid = document.getElementById('timeSlid');

function time_format(seconds) {
    const s = seconds % 60;
    const m = (seconds - s) / 60;
    return m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
}

timeDispl.value = time_format(time);
timeSlid.value = time;

timeDispl.addEventListener('input', () => {
    const [min, sek] = timeDispl.value.split(':');
    time = parseInt(min)*60 + parseInt(sek);
    timeSlid.value = time;
})

timeSlid.addEventListener('input', () => {
    time = timeSlid.value;
    timeDispl.value = time_format(time);
});


let audioChunks = new Queue();

let stream; let mediaRecorder;
window.onload = async () => {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = async event => audioChunks.push(event.data);

    nagrywaj = true;
    startVisualizer();
}

let backgr_recorder = setInterval(() => {
    if(nagrywaj == false) return;
    mediaRecorder.stop();
    mediaRecorder.start();
}, 1000);

let backgr_durr_checker = setInterval(() => {
    while(0.961*audioChunks.size > time) audioChunks.pop(); //0.961 * 1s - czas nagrywania probki - zaleznosc rownez od czasu nagrywania probki
}, 1000);

const capture = document.getElementById('capture');
const controls = document.getElementById('aud_cont');
let audioURL ;//= URL.createObjectURL(null);
let last_refreshed_URL = new Date();

async function refrURL() {
    if(audioURL) URL.revokeObjectURL(audioURL);
    const mergedBlob = await mergeAudioBlobs(audioChunks.toArr());
    audioURL = await URL.createObjectURL(mergedBlob);

    controls.src = audioURL;
}

controls.on = event => { 
    console.log('aaa');
}

capture.onclick = async () => {
    refrURL();
}

const downButt = document.getElementById('download');
const downLink = document.getElementById('downLink');

function data_i_czas() {
    let date = new Date();
    return date.getFullYear().toString() + date.getMonth().toString().padStart(2, '0') + date.getDay().toString().padStart(2, '0') +
    '_' + date.getHours().toString().padStart(2, '0') + date.getMinutes().toString().padStart(2, '0') + date.getSeconds().toString().padStart(2, '0');
}

downButt.onclick = async () => {
    await refrURL();
    downLink.href = audioURL;
    downLink.download = data_i_czas() + '.wav';
    downLink.click();
}

async function startVisualizer() {
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  const analyser = audioContext.createAnalyser();

  analyser.fftSize = 2048;
  const bufferLength = analyser.fftSize;
  const dataArray = new Uint8Array(bufferLength);

  source.connect(analyser);

  const canvas = document.getElementById('oscilloscope');
  const ctx = canvas.getContext('2d');

  // Parametry dostosowujące wygląd:
  const DOWNSAMPLE = 4; // co ile punktów rysować (większa liczba = bardziej skondensowany)
  const FPS = 60;       // maksymalna liczba klatek na sekundę (wolniejsze przesuwanie)

  let lastTime = 0;

  function draw(now) {
    requestAnimationFrame(draw);

    if (now - lastTime < 1000 / FPS) return;
    lastTime = now;

    analyser.getByteTimeDomainData(dataArray);

    ctx.fillStyle = getComputedStyle(canvas.parentElement).backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#005b96';
    ctx.beginPath();

    const sliceWidth = canvas.width / (bufferLength / DOWNSAMPLE);
    let x = 0;

    for (let i = 0; i < bufferLength; i += DOWNSAMPLE) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  }

  requestAnimationFrame(draw);
}