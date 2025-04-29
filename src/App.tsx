import React, { useState, useEffect, useRef } from "react";

type VisualizerSettings = {
  colorPalette: string[];
  barCount: number;
  barWidth: number;
  barHeight: number;
  barSpacing: number;
  peakHoldTime: number;
  peakFallSpeed: number;
  dancingStyle: "bars" | "circle" | "spiral";
};

const AudioVisualizer: React.FC = () => {
  const [audioData, setAudioData] = useState<Uint8Array | null>(null);
  const [settings, setSettings] = useState<VisualizerSettings>({
    colorPalette: [
      "#A349A4",
      "#4FA4F5",
      "#FF4DA6",
      "#FFD966",
      "#3EDCB2",
      "#2D2D2D",
      "#F5F5F5",
      "#FF6F61",
      "#6A0572",
      "#0081A7",
    ],
    barCount: 128, // Increased for smoother animations
    barWidth: 3, // Slimmer bars for a modern look
    barHeight: 150, // Taller bars to emphasize amplitude
    barSpacing: 1, // Reduced spacing for a denser effect
    peakHoldTime: 1500, // Peaks hold slightly longer for impact
    peakFallSpeed: 0.3, // Slower fall for smoother transitions
    dancingStyle: "bars", // Changed from 'bars' to 'wave' for fluidity
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isMicOn, setIsMicOn] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files) return;
    const file = event.target.files[0];
    if (!file) return;
    const audioUrl = URL.createObjectURL(file);
    if (audioRef.current) {
      audioRef.current.src = audioUrl;
      audioRef.current.play();
    }

    setupAudioProcessing(audioUrl);
  };

  const handleToggleMic = async () => {
    if (isMicOn) {
      if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
        setIsMicOn(false);
        setAudioData(null);
      }
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }

      sourceRef.current =
        audioContextRef.current.createMediaStreamSource(stream);

      setupAudioAnalysis(sourceRef.current);

      setIsMicOn(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const setupAudioAnalysis = (
    source: MediaStreamAudioSourceNode | MediaElementAudioSourceNode
  ) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    if (!analyserRef.current) {
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
    }

    source.connect(analyserRef.current);
    analyserRef.current.connect(audioContextRef.current.destination);

    animate();
  };

  const setupAudioProcessing = (audioUrl: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    if (!analyserRef.current) {
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
    }

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    audioRef.current.src = audioUrl;

    audioRef.current.onloadeddata = () => {
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      sourceRef.current = audioContextRef.current!.createMediaElementSource(
        audioRef.current!
      );
      setupAudioAnalysis(sourceRef.current);
    };

    audioRef.current.play();
  };

  const animate = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    analyserRef.current.getByteFrequencyData(dataArray);
    setAudioData(dataArray);

    draw(dataArray);
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  const draw = (dataArray: Uint8Array) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    const barWidth = settings.barWidth;
    const barSpacing = settings.barSpacing;
    const barCount = settings.barCount;
    const colorPalette = settings.colorPalette;

    if (settings.dancingStyle === "bars") {
      const barWidthTotal = barWidth + barSpacing;
      const usableWidth = width - barWidthTotal;
      const startX = (width - (barCount * barWidthTotal - barSpacing)) / 2;
      const step = Math.floor(dataArray.length / barCount);
      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.min(i * step, dataArray.length - 1);
        const value = dataArray[dataIndex];

        const barHeight = (value / 255) * height;
        const x = startX + i * barWidthTotal;
        const colorIndex = Math.floor(
          (value / 255) * (colorPalette.length - 1)
        );
        ctx.fillStyle = colorPalette[colorIndex];
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
      }
    } else if (settings.dancingStyle === "circle") {
      ctx.save();
      ctx.translate(width / 2, height / 2);
      const radius = Math.min(width, height) / 2.5;
      const step = Math.floor(dataArray.length / barCount);
      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.min(i * step, dataArray.length - 1);
        const value = dataArray[dataIndex];
        const barHeight = (value / 255) * (radius / 2);
        const angle = (i / barCount) * 2 * Math.PI;
        const x = radius * Math.cos(angle);
        const y = radius * Math.sin(angle);
        const colorIndex = Math.floor(
          (value / 255) * (colorPalette.length - 1)
        );

        ctx.fillStyle = colorPalette[colorIndex];
        ctx.beginPath();
        ctx.arc(x, y, barWidth, 0, 2 * Math.PI);
        ctx.fill();

        ctx.beginPath();

        ctx.arc(x, y, barWidth + barHeight, 0, 2 * Math.PI);

        ctx.fillStyle = colorPalette[(colorIndex + 1) % colorPalette.length];

        ctx.fill();
      }

      ctx.restore();
    } else if (settings.dancingStyle === "spiral") {
      ctx.save();
      ctx.translate(width / 2, height / 2);
      const step = Math.floor(dataArray.length / barCount);
      const maxRadius = Math.min(width, height) / 2.5;
      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.min(i * step, dataArray.length - 1);
        const value = dataArray[dataIndex];

        const barHeight = (value / 255) * (maxRadius / 2);
        const angle = (i / barCount) * 10 * Math.PI;
        const currentRadius = (i / barCount) * maxRadius;
        const x = currentRadius * Math.cos(angle);
        const y = currentRadius * Math.sin(angle);

        const colorIndex = Math.floor(
          (value / 255) * (colorPalette.length - 1)
        );

        ctx.beginPath();
        ctx.arc(x, y, barWidth, 0, 2 * Math.PI);
        ctx.fillStyle = colorPalette[colorIndex];
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, barWidth + barHeight, 0, 2 * Math.PI);
        ctx.fillStyle = colorPalette[(colorIndex + 1) % colorPalette.length];
        ctx.fill();
      }

      ctx.restore();
    }
  };

  const handleSettingsChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    const parsedValue = type === "number" ? parseFloat(value) : value;

    setSettings((prevSettings) => ({
      ...prevSettings,
      [name]: parsedValue,
    }));
  };

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        if (analyserRef.current) {
          analyserRef.current.disconnect();
        }
        if (sourceRef.current) {
          sourceRef.current.disconnect();
        }

        audioContextRef.current.close();
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4 text-center">
          Audio Visualizer
        </h1>
        <div className="flex space-x-4">
          <label className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer">
            Upload Audio
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          <button
            className={`bg-${isMicOn ? "red" : "green"}-500 hover:bg-${
              isMicOn ? "red" : "green"
            }-700 text-white font-bold py-2 px-4 rounded`}
            onClick={handleToggleMic}
          >
            {isMicOn ? "Turn Off Mic" : "Turn On Mic"}
          </button>

          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="bg-yellow-500 hover:bg-yellow-700 text-gray-900 font-bold py-2 px-4 rounded"
          >
            {isSettingsOpen ? "Close Settings" : "Open Settings"}
          </button>
        </div>
      </div>

      <div className="relative ">
        <canvas
          ref={canvasRef}
          className="border-2 border-gray-700 rounded-lg"
          width={800}
          height={400}
        />
        {isSettingsOpen && (
          <div className="absolute top-0 left-0 p-4 bg-gray-800 border border-gray-700 rounded-md z-10">
            <h2 className="text-xl font-bold mb-4">Settings</h2>

            <div className="mb-2">
              <label
                className="block text-gray-300 text-sm font-bold mb-2"
                htmlFor="dancingStyle"
              >
                Dancing Style
              </label>
              <select
                id="dancingStyle"
                name="dancingStyle"
                value={settings.dancingStyle}
                onChange={handleSettingsChange}
                className="bg-gray-700 text-white border border-gray-600 rounded py-2 px-3 focus:outline-none focus:border-blue-500"
              >
                <option value="bars">Bars</option>
                <option value="circle">Circle</option>
                <option value="spiral">Spiral</option>
              </select>
            </div>

            <div className="mb-2">
              <label
                className="block text-gray-300 text-sm font-bold mb-2"
                htmlFor="colorPalette"
              >
                Color Palette (comma-separated)
              </label>
              <input
                type="text"
                id="colorPalette"
                name="colorPalette"
                value={settings.colorPalette.join(",")}
                onChange={(e) => {
                  const colors = e.target.value
                    .split(",")
                    .map((color) => color.trim());
                  setSettings((prevSettings) => ({
                    ...prevSettings,
                    colorPalette: colors,
                  }));
                }}
                className="bg-gray-700 text-white border border-gray-600 rounded py-2 px-3 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="mb-2">
              <label
                className="block text-gray-300 text-sm font-bold mb-2"
                htmlFor="barCount"
              >
                Bar Count
              </label>
              <input
                type="number"
                id="barCount"
                name="barCount"
                value={settings.barCount}
                onChange={handleSettingsChange}
                className="bg-gray-700 text-white border border-gray-600 rounded py-2 px-3 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="mb-2">
              <label
                className="block text-gray-300 text-sm font-bold mb-2"
                htmlFor="barWidth"
              >
                Bar Width
              </label>
              <input
                type="number"
                id="barWidth"
                name="barWidth"
                value={settings.barWidth}
                onChange={handleSettingsChange}
                className="bg-gray-700 text-white border border-gray-600 rounded py-2 px-3 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div className="mb-2">
              <label
                className="block text-gray-300 text-sm font-bold mb-2"
                htmlFor="barSpacing"
              >
                Bar Spacing
              </label>
              <input
                type="number"
                id="barSpacing"
                name="barSpacing"
                value={settings.barSpacing}
                onChange={handleSettingsChange}
                className="bg-gray-700 text-white border border-gray-600 rounded py-2 px-3 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioVisualizer;
