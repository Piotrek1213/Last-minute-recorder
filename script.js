let time = 60;
let nagrywaj = false;
const timeDispl = document.getElementById('timeDispl');
const timeSlid = document.getElementById('timeSlid');

function time_format(seconds) {
    const s = seconds % 60;
    const m = (seconds - s) / 60;
    return m.toString().padStart(2, '0') + ':' + s.toString().padStart(2, '0');
}

timeSlid.addEventListener('input', () => {
    time = timeSlid.value;
    timeDispl.textContent = time_format(time);
});


let audioChunks = new Queue();

let stream; let mediaRecorder;
window.onload = async () => {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = async event => audioChunks.push(event.data);

    nagrywaj = true;
}

let backgr_recorder = setInterval(() => {
    if(nagrywaj == false) return;
    mediaRecorder.stop();
    mediaRecorder.start();
}, 1000);

let backgr_durr_checker = setInterval(() => {
    while(audioChunks.size > time) audioChunks.pop();
}, 1000);

const capture = document.getElementById('capture');
const controls = document.getElementById('aud_cont');

capture.onclick = async () => {
    const mergedBlob = await mergeAudioBlobs(audioChunks.toArr());
    const audioUrl = await URL.createObjectURL(mergedBlob);

    controls.src = audioUrl;
}