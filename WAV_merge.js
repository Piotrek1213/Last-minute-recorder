function audioBufferToWavBlob(buffer) {
  const wav = audioBufferToWav(buffer);
  return new Blob([new DataView(wav)], { type: 'audio/wav' });
}

function audioBufferToWav(buffer) {
  const numOfChan = buffer.numberOfChannels,
    length = buffer.length * numOfChan * 2 + 44,
    bufferOut = new ArrayBuffer(length),
    view = new DataView(bufferOut),
    channels = [],
    sampleRate = buffer.sampleRate;

  let offset = 0;

  function writeString(str) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
    offset += str.length;
  }

  writeString("RIFF");
  view.setUint32(offset, length - 8, true);
  offset += 4;
  writeString("WAVE");
  writeString("fmt ");
  view.setUint32(offset, 16, true);
  offset += 4;
  view.setUint16(offset, 1, true);
  offset += 2;
  view.setUint16(offset, numOfChan, true);
  offset += 2;
  view.setUint32(offset, sampleRate, true);
  offset += 4;
  view.setUint32(offset, sampleRate * 2 * numOfChan, true);
  offset += 4;
  view.setUint16(offset, numOfChan * 2, true);
  offset += 2;
  view.setUint16(offset, 16, true);
  offset += 2;
  writeString("data");
  view.setUint32(offset, length - offset - 4, true);
  offset += 4;

  for (let i = 0; i < numOfChan; i++) {
    channels.push(buffer.getChannelData(i));
  }

  let sample = 0;
  while (sample < buffer.length) {
    for (let i = 0; i < numOfChan; i++) {
      let s = Math.max(-1, Math.min(1, channels[i][sample]));
      s = s < 0 ? s * 0x8000 : s * 0x7FFF;
      view.setInt16(offset, s, true);
      offset += 2;
    }
    sample++;
  }

  return bufferOut;
}


async function mergeAudioBlobs(blobsArray) {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const audioBuffers = [];

  // Decode each blob into AudioBuffer
  for (const blob of blobsArray) {
    const arrayBuffer = await blob.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    audioBuffers.push(audioBuffer);
  }

  // Determine output properties
  const numberOfChannels = Math.max(...audioBuffers.map(b => b.numberOfChannels));
  const sampleRate = audioContext.sampleRate;
  const totalLength = audioBuffers.reduce((acc, b) => acc + b.length, 0);

  // Create an empty AudioBuffer for the final mix
  const outputBuffer = audioContext.createBuffer(numberOfChannels, totalLength, sampleRate);

  // Copy each buffer into the output
  let offset = 0;
  for (const buffer of audioBuffers) {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const outputData = outputBuffer.getChannelData(channel);
      const inputData = buffer.getChannelData(channel % buffer.numberOfChannels);
      outputData.set(inputData, offset);
    }
    offset += buffer.length;
  }

  // Convert to WAV Blob
  return audioBufferToWavBlob(outputBuffer);
}