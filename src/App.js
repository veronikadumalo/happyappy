import { useEffect, useRef, useState } from 'react';
import './App.css';

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isVideoRecording, setIsVideoRecording] = useState(null);
  const WIDTH = 400;
  const HEIGHT = 300;

  async function getMedia(constraints) {
    let stream = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = function (e) {
        this.play();
      };
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.onstop = () => {
        var blob = new Blob(chunksRef.current, {
          type: 'video/webm',
        });
        chunksRef.current = [];
        var videoURL = URL.createObjectURL(blob);
        videoRef.current.srcObject = null;
        videoRef.current.src = videoURL;
        videoRef.current.play();
        videoRef.current.loop = true;
        videoRef.current.addEventListener('play', function () {
          renderVideoOnCanvas(this);
        });
      };
      mediaRecorderRef.current.ondataavailable = function (e) {
        chunksRef.current.push(e.data);
      };
    } catch (err) {
      alert(err);
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctxRef.current = ctx;

    getMedia({
      audio: false,
      video: {
        width: WIDTH,
        height: HEIGHT,
        facingMode: isFrontCamera ? 'user' : 'environment',
        frameRate: { ideal: 30, max: 60 },
      },
    });
  }, []);

  const handleFlipCamera = () => setIsFrontCamera(!isFrontCamera);

  const handlePhotoCapture = () => {
    ctxRef.current.drawImage(videoRef.current, 0, 0, WIDTH, HEIGHT);
  };

  const renderVideoOnCanvas = (video) => {
    ctxRef.current.drawImage(video, 0, 0, WIDTH, HEIGHT);
    setTimeout(renderVideoOnCanvas, 10, video);
  };

  const handleVideoRecord = () => {
    console.log(this);
    renderVideoOnCanvas();

    const stream = canvasRef.current.captureStream(30);
    var recordedChunks = [];

    var options = { mimeType: 'video/webm; codecs=vp9' };
    const mediaRecorder = new MediaRecorder(stream, options);

    if (isVideoRecording) {
      mediaRecorder.stop();
    } else {
      mediaRecorder.start();
    }

    mediaRecorder.onstart = () => setIsVideoRecording(true);
    mediaRecorder.onstop = () => setIsVideoRecording(false);
    mediaRecorder.ondataavailable = handleDataAvailable;

    function handleDataAvailable(event) {
      if (event.data.size > 0) {
        recordedChunks.push(event.data);

        download();
      }
    }
    function download() {
      var blob = new Blob(recordedChunks, {
        type: 'video/webm',
      });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      document.body.appendChild(a);
      a.style = 'display: none';
      a.href = url;
      a.download = 'test.webm';
      a.click();
      window.URL.revokeObjectURL(url);
    }
  };

  return (
    <div className='App'>
      <video ref={videoRef}></video>
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT}></canvas>
      <button onClick={handleFlipCamera}>Flip camera</button>
      <button onClick={handlePhotoCapture}>Take photo</button>
      <button onClick={() => mediaRecorderRef.current?.start()}>
        Start recording
      </button>
      <button onClick={() => mediaRecorderRef.current?.stop()}>
        Stop recording
      </button>
    </div>
  );
}

export default App;
