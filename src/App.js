import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import './App.css';
import { useWindowSize } from './hooks/useWindowSize';

function App() {
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const canvasContainerRef = useRef(null);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [isVideoRecording, setIsVideoRecording] = useState(null);
  const [xPosition, setXPosition] = useState();
  const [yPosition, setYPosition] = useState();
  const [isRenderClicked, setIsRenderClicked] = useState(false);
  const [cameraResolution, setCameraResolution] = useState({
    width: null,
    height: null,
  });
  const [cameraDimensions, setCameraDimensions] = useState({
    width: null,
    height: null,
  });
  const { width, height } = useWindowSize();

  useEffect(() => {
    if (!width) return;
    const height = width * (16 / 9);
    setCameraDimensions({ width, height });
  }, [width]);

  if (navigator.mediaDevices === undefined) {
    navigator.mediaDevices = {};
  }

  if (navigator.mediaDevices.getUserMedia === undefined) {
    navigator.mediaDevices.getUserMedia = function (constraints) {
      var getUserMedia =
        navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

      if (!getUserMedia) {
        return Promise.reject(
          new Error('getUserMedia is not implemented in this browser')
        );
      }

      return new Promise(function (resolve, reject) {
        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    };
  }

  // navigator.permissions
  //   .query({ name: 'camera' })
  //   .then((res) => console.log(res));

  async function getMedia(constraints) {
    let stream = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      setCameraResolution({
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
      });
      audioRef.current = stream.getAudioTracks()[0];
      if ('srcObject' in videoRef.current) {
        videoRef.current.srcObject = stream;
      } else {
        videoRef.current.src = window.URL.createObjectURL(stream);
      }
      videoRef.current.muted = true;
      videoRef.current.onloadedmetadata = function (e) {
        this.play();
      };
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.onstop = () => {
        var blob = new Blob(chunksRef.current, {
          type: 'video/webm; codecs=vp9',
        });
        // chunksRef.current = [];
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
      audio: true,
      video: {
        facingMode: 'user',
        frameRate: { ideal: 30, max: 60 },
      },
    });
  }, []);

  useEffect(() => {
    getMedia({
      audio: true,
      video: {
        facingMode: isFrontCamera ? 'user' : 'environment',
        frameRate: { ideal: 30, max: 60 },
      },
    });
  }, [isFrontCamera]);

  const handleFlipCamera = () => setIsFrontCamera(!isFrontCamera);

  const handlePhotoCapture = () => {
    ctxRef.current.drawImage(
      videoRef.current,
      0,
      0,
      videoRef.current.videoWidth,
      videoRef.current.videoHeight
    );
  };

  const renderVideoOnCanvas = (video) => {
    ctxRef.current.drawImage(
      video,
      0,
      0,
      cameraDimensions.width,
      cameraDimensions.height
    );
    requestAnimationFrame(() => renderVideoOnCanvas(video));
  };

  const renderImageOnCanvas = (image) => {
    ctxRef.current.drawImage(image, xPosition - 15, yPosition - 25, 30, 50);
    requestAnimationFrame(() => renderImageOnCanvas(image));
  };

  function allowDrop(ev) {
    console.log('allowDrop');
    ev.preventDefault();
    const dropDiv = document.getElementById('dropDiv');
    const top = ev.clientY - dropDiv.offsetTop;
    setYPosition(top);
    const left = ev.clientX - dropDiv.offsetLeft;
    setXPosition(left);
  }

  function drag(ev) {
    console.log('drag');
    ev.dataTransfer.setData('text', ev.target.id);
  }

  function drop(ev) {
    console.log('drop');
    ev.preventDefault();
    const data = ev.dataTransfer.getData('text');
    const sticker = document.getElementById(data);
    sticker.style.position = 'absolute';
    sticker.style.left = `${xPosition}px`;
    sticker.style.top = `${yPosition}px`;
    sticker.style.transform = 'translate(-50%, -50%)';
    canvasContainerRef.current.appendChild(sticker);
  }
  const render = () => {
    const videoDuration = videoRef.current.duration * 1000;
    audioRef.current.currentTime = 0;
    videoRef.current.currentTime = 0;
    setIsRenderClicked(true);
    const image = new Image();
    image.src = 'sticker-1.png';
    image.onload = function () {
      renderImageOnCanvas(image);
    };

    const chunks = [];
    const stream = canvasRef.current.captureStream(30);

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm; codecs=vp9',
    });

    mediaRecorder.ondataavailable = function (e) {
      chunks.push(e.data);
    };
    mediaRecorder.onstop = function () {
      var blob = new Blob(chunks, {
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
    };
    stream.addTrack(audioRef.current);
    mediaRecorder.start();
    setTimeout(() => {
      mediaRecorder.stop();
    }, videoDuration);
  };

  return (
    <div className='App'>
      <Helmet>
        <meta
          name='viewport'
          content='width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no'
        />
      </Helmet>
      <video
        className='video'
        ref={videoRef}
        autoPlay
        playsInline
        width={width}
        height={height}></video>
      <div
        ref={canvasContainerRef}
        id='dropDiv'
        style={{
          width: cameraDimensions.width,
          height: cameraDimensions.height,
        }}
        onDrop={(e) => drop(e)}
        onDragOver={(e) => allowDrop(e)}>
        <canvas
          className='canvas'
          ref={canvasRef}
          width={cameraResolution.width}
          height={cameraResolution.height}
          id='viewport'></canvas>
      </div>
      <button onClick={handleFlipCamera}>Flip camera</button>
      <button onClick={handlePhotoCapture}>Take photo</button>
      <button onClick={() => mediaRecorderRef.current?.start()}>
        Start recording
      </button>
      <button onClick={() => mediaRecorderRef.current?.stop()}>
        Stop recording
      </button>
      <button onClick={render}>Render</button>
      <br></br>
      <div>
        <img
          src='sticker-1.png'
          width='30px'
          height='50px'
          alt=''
          id='drag1'
          draggable='true'
          onDragStart={(e) => drag(e)}
        />
      </div>
    </div>
  );
}

export default App;
