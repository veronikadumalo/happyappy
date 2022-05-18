import { useEffect, useRef, useState, createRef, useCallback } from "react";
import "./App.css";
import { Image as KonvaImage, Layer, Stage } from "react-konva";
import { stickersData } from "./stickers.data.js";
import { IndividualSticker } from "./IndividualSticker";
import useImage from "use-image";

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
  const WIDTH = 400;
  const HEIGHT = 300;
  const [isRenderClicked, setIsRenderClicked] = useState(false);

  const [background] = useImage("example-image.jpg");
  const [images, setImages] = useState([]);
  console.log(images);

  const addStickerToPanel = ({ src, width, x, y }) => {
    setImages((currentImages) => [
      ...currentImages,
      {
        width,
        x,
        y,
        src,
        resetButtonRef: createRef(),
      },
    ]);
  };

  const resetAllButtons = useCallback(() => {
    images.forEach((image) => {
      if (image.resetButtonRef.current) {
        image.resetButtonRef.current();
      }
    });
  }, [images]);

  const handleCanvasClick = useCallback(
    (event) => {
      if (event.target.attrs.id === "backgroundImage") {
        resetAllButtons();
      }
    },
    [resetAllButtons]
  );

  async function getMedia(constraints) {
    let stream = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      audioRef.current = stream.getAudioTracks()[0];
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      videoRef.current.onloadedmetadata = function (e) {
        this.play();
      };
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.onstop = () => {
        var blob = new Blob(chunksRef.current, {
          type: "video/webm; codecs=vp9",
        });
        // chunksRef.current = [];
        var videoURL = URL.createObjectURL(blob);
        videoRef.current.srcObject = null;
        videoRef.current.src = videoURL;
        videoRef.current.play();
        videoRef.current.loop = true;
        videoRef.current.addEventListener("play", function () {
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
    const ctx = canvas.getContext("2d");
    ctxRef.current = ctx;

    getMedia({
      audio: true,
      video: {
        width: WIDTH,
        height: HEIGHT,
        facingMode: isFrontCamera ? "user" : "environment",
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
    requestAnimationFrame(() => renderVideoOnCanvas(video));
  };

  const renderImageOnCanvas = (image, i) => {
    ctxRef.current.drawImage(
      image,
      images[i].x,
      images[i].y,
      images[i].width,
      150
    );
    requestAnimationFrame(() => renderImageOnCanvas(image, i));
  };

  function allowDrop(ev) {
    console.log("allowDrop");
    ev.preventDefault();
    const dropDiv = document.getElementById("dropDiv");
    const top = ev.clientY - dropDiv.offsetTop;
    setYPosition(top);
    const left = ev.clientX - dropDiv.offsetLeft;
    setXPosition(left);
  }

  function drag(ev) {
    console.log("drag");
    ev.dataTransfer.setData("text", ev.target.id);
  }

  function drop(ev) {
    console.log("drop");
    ev.preventDefault();
    const data = ev.dataTransfer.getData("text");
    const sticker = document.getElementById(data);
    sticker.style.position = "absolute";
    sticker.style.left = `${xPosition}px`;
    sticker.style.top = `${yPosition}px`;
    sticker.style.transform = "translate(-50%, -50%)";
    canvasContainerRef.current.appendChild(sticker);
  }
  const render = () => {
    const videoDuration = videoRef.current.duration * 1000;
    audioRef.current.currentTime = 0;
    videoRef.current.currentTime = 0;
    setIsRenderClicked(true);
    images.map((image, i) => {
      const canvasImage = new Image();
      canvasImage.src = image.src;
      canvasImage.onload = function () {
        renderImageOnCanvas(canvasImage, i);
      };
    });

    const chunks = [];
    const stream = canvasRef.current.captureStream(30);

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm; codecs=vp9",
    });

    mediaRecorder.ondataavailable = function (e) {
      chunks.push(e.data);
    };
    mediaRecorder.onstop = function () {
      var blob = new Blob(chunks, {
        type: "video/webm",
      });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      document.body.appendChild(a);
      a.style = "display: none";
      a.href = url;
      a.download = "test.webm";
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
    <div className="App">
      <video ref={videoRef} className="video"></video>

      <div
        ref={canvasContainerRef}
        id="dropDiv"
        onDrop={(e) => drop(e)}
        onDragOver={(e) => allowDrop(e)}
      >
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          id="viewport"
        ></canvas>
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
      {/* <div>test</div>
      <br></br>
      <div>
        <img
          src="sticker-1.png"
          width="30px"
          height="50px"
          alt=""
          id="drag1"
          draggable="true"
          onDragStart={(e) => drag(e)}
        />
      </div> */}
      <div>
        <div className="kanvaContainer">
          <Stage
            width={WIDTH}
            height={HEIGHT}
            onClick={handleCanvasClick}
            onTap={handleCanvasClick}
          >
            <Layer>
              <KonvaImage
                image={""}
                height={HEIGHT}
                width={WIDTH}
                id="backgroundImage"
              />
              {images.map((image, i) => {
                return (
                  <IndividualSticker
                    onDelete={() => {
                      const newImages = [...images];
                      newImages.splice(i, 1);
                      setImages(newImages);
                    }}
                    onDragEnd={(event) => {
                      image.x = event.target.x();
                      image.y = event.target.y();
                    }}
                    key={i}
                    image={image}
                  />
                );
              })}
            </Layer>
          </Stage>
        </div>
        <h4 className="heading">Click/Tap to add sticker to photo!</h4>
        {stickersData.map((sticker) => {
          return (
            <button
              className="button"
              onMouseDown={() => {
                addStickerToPanel({
                  src: sticker.url,
                  width: sticker.width,
                  x: 100,
                  y: 100,
                });
              }}
            >
              <img alt={sticker.alt} src={sticker.url} width={sticker.width} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default App;
