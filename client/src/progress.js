import React, { useState, useEffect, useRef } from "react";
import ReactPlayer from "react-player";

const ProgressBar = ({ duration, intervals }) => (
  <div
    style={{
      width: "100%",
      height: "12px",
      position: "relative",
      backgroundColor: "#ff000033",
      borderRadius: "6px",
      overflow: "hidden",
      marginTop: "16px",
      boxShadow: "inset 0 2px 4px rgba(0,0,0,0.1)",
    }}
  >
    {intervals.map((interval, i) => {
      const left = (interval.start / duration) * 100;
      const width = ((interval.end - interval.start) / duration) * 100;
      return (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${left}%`,
            width: `${width}%`,
            height: "100%",
            backgroundColor: "#00ff00",
            transition: "all 0.3s ease",
          }}
        />
      );
    })}
  </div>
);

const VideoPlayer = ({ url }) => {
  const playerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSegment, setCurrentSegment] = useState(null);
  const [mergedIntervals, setMergedIntervals] = useState([]);
  const [duration, setDuration] = useState(0);
  const [isResetting, setIsResetting] = useState(false);
  const ws = useRef(null);

  useEffect(() => {
    fetchProgress();
    console.log("WebSocket URL:", process.env.REACT_APP_WS_URL); // Debug
    ws.current = new WebSocket(process.env.REACT_APP_WS_URL);

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "progress-update") {
        setMergedIntervals(data.intervals);
      }
    };

    return () => ws.current && ws.current.close();
  }, []);

  const fetchProgress = async () => {
    const response = await fetch(
      `${process.env.REACT_APP_LOCAL_URL}/progress/video1`
    );
    const data = await response.json();
    setMergedIntervals(data.intervals);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      if (
        isPlaying &&
        currentSegment &&
        playerRef.current &&
        typeof playerRef.current.getCurrentTime === "function"
      ) {
        const currentTime = playerRef.current.getCurrentTime();

        // Guard against invalid or negative timestamps
        if (
          typeof currentTime === "number" &&
          currentTime >= 0 &&
          currentSegment.start !== undefined &&
          currentTime >= currentSegment.start &&
          ws.current &&
          ws.current.readyState === WebSocket.OPEN
        ) {
          const segment = {
            start: currentSegment.start,
            end: currentTime,
          };

          ws.current.send(
            JSON.stringify({ videoId: "video1", interval: segment })
          );
          setCurrentSegment(segment);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, currentSegment]);

  const handlePlay = () => {
    setIsPlaying(true);
    setCurrentSegment({
      start: playerRef.current.getCurrentTime(),
      end: playerRef.current.getCurrentTime(),
    });
  };

  const handlePause = () => {
    setIsPlaying(false);
    if (currentSegment && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(
        JSON.stringify({ videoId: "video1", interval: currentSegment })
      );
      setCurrentSegment(null);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      console.log(process.env.REACT_APP_LOCAL_URL);
      await fetch(`${process.env.REACT_APP_LOCAL_URL}/progress/video1`, {
        method: "DELETE",
      });
      setMergedIntervals([]);
    } catch (error) {
      console.error("Failed to reset progress:", error);
    } finally {
      setIsResetting(false);
    }
  };

  // Calculate progress statistics
  const totalWatchedTime = mergedIntervals.reduce((total, interval) => {
    return total + (interval.end - interval.start);
  }, 0);

  const progressPercentage =
    duration > 0 ? (totalWatchedTime / duration) * 100 : 0;

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "24px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.12)",
          overflow: "hidden",
          border: "1px solid #e5e7eb",
        }}
      >
        {/* Video Container */}
        <div
          style={{
            position: "relative",
            backgroundColor: "#000000",
          }}
        >
          <ReactPlayer
            ref={playerRef}
            url={url}
            playing={isPlaying}
            onPlay={handlePlay}
            onPause={handlePause}
            onDuration={setDuration}
            controls
            width="100%"
            height="500px"
            style={{ display: "block" }}
          />
        </div>

        {/* Progress Section */}
        <div style={{ padding: "24px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "8px",
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: "20px",
                fontWeight: "700",
                color: "#1f2937",
                letterSpacing: "-0.025em",
              }}
            >
              Watch Progress
            </h3>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  backgroundColor:
                    progressPercentage === 100
                      ? "#dcfce7"
                      : progressPercentage > 0
                      ? "#fef3c7"
                      : "#f3f4f6",
                  color:
                    progressPercentage === 100
                      ? "#166534"
                      : progressPercentage > 0
                      ? "#92400e"
                      : "#6b7280",
                  padding: "8px 16px",
                  borderRadius: "24px",
                  fontSize: "14px",
                  fontWeight: "600",
                  border: `1px solid ${
                    progressPercentage === 100
                      ? "#bbf7d0"
                      : progressPercentage > 0
                      ? "#fde68a"
                      : "#e5e7eb"
                  }`,
                }}
              >
                {Math.round(progressPercentage)}% Complete
              </div>
              <button
                onClick={handleReset}
                disabled={isResetting}
                style={{
                  backgroundColor: isResetting ? "#f87171" : "#ef4444",
                  color: "white",
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "none",
                  fontSize: "14px",
                  fontWeight: "500",
                  cursor: isResetting ? "not-allowed" : "pointer",
                  opacity: isResetting ? 0.7 : 1,
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
                onMouseEnter={(e) => {
                  if (!isResetting) {
                    e.target.style.backgroundColor = "#dc2626";
                    e.target.style.transform = "translateY(-1px)";
                    e.target.style.boxShadow =
                      "0 4px 12px rgba(239, 68, 68, 0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isResetting) {
                    e.target.style.backgroundColor = "#ef4444";
                    e.target.style.transform = "translateY(0)";
                    e.target.style.boxShadow = "none";
                  }
                }}
              >
                {isResetting ? (
                  <>
                    <div
                      style={{
                        width: "14px",
                        height: "14px",
                        border: "2px solid transparent",
                        borderTop: "2px solid #ffffff",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    ></div>
                    Resetting...
                  </>
                ) : (
                  <>
                    <span style={{ fontSize: "16px" }}>↻</span>
                    Reset Progress
                  </>
                )}
              </button>
            </div>
          </div>

          <ProgressBar duration={duration} intervals={mergedIntervals} />

          {/* Statistics Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "20px",
              marginTop: "24px",
              padding: "20px",
              backgroundColor: "#f8fafc",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
            }}
          >
            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "8px",
                  fontWeight: "600",
                }}
              >
                Watched Time
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "800",
                  color: "#0f172a",
                  fontFamily: "monospace",
                }}
              >
                {Math.floor(totalWatchedTime / 60)}:
                {Math.floor(totalWatchedTime % 60)
                  .toString()
                  .padStart(2, "0")}
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "8px",
                  fontWeight: "600",
                }}
              >
                Total Duration
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "800",
                  color: "#0f172a",
                  fontFamily: "monospace",
                }}
              >
                {Math.floor(duration / 60)}:
                {Math.floor(duration % 60)
                  .toString()
                  .padStart(2, "0")}
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  marginBottom: "8px",
                  fontWeight: "600",
                }}
              >
                Segments
              </div>
              <div
                style={{
                  fontSize: "24px",
                  fontWeight: "800",
                  color: "#0f172a",
                }}
              >
                {mergedIntervals.length}
              </div>
            </div>
          </div>

          {/* Segments List */}
          {mergedIntervals.length > 0 && (
            <div style={{ marginTop: "24px" }}>
              <h4
                style={{
                  margin: "0 0 16px 0",
                  fontSize: "16px",
                  fontWeight: "600",
                  color: "#374151",
                }}
              >
                Watched Segments
              </h4>
              <div
                style={{
                  maxHeight: "200px",
                  overflowY: "auto",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                  backgroundColor: "#ffffff",
                }}
              >
                {mergedIntervals.map((interval, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "12px 20px",
                      borderBottom:
                        i < mergedIntervals.length - 1
                          ? "1px solid #f3f4f6"
                          : "none",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: "14px",
                      transition: "background-color 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.backgroundColor = "#f9fafb";
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.backgroundColor = "transparent";
                    }}
                  >
                    <span
                      style={{
                        color: "#6b7280",
                        fontWeight: "500",
                      }}
                    >
                      Segment {i + 1}
                    </span>
                    <span
                      style={{
                        fontFamily: "monospace",
                        color: "#1f2937",
                        fontWeight: "600",
                        backgroundColor: "#f3f4f6",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "13px",
                      }}
                    >
                      {Math.floor(interval.start / 60)}:
                      {Math.floor(interval.start % 60)
                        .toString()
                        .padStart(2, "0")}{" "}
                      - {Math.floor(interval.end / 60)}:
                      {Math.floor(interval.end % 60)
                        .toString()
                        .padStart(2, "0")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSS Animation for spinner */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default VideoPlayer;
