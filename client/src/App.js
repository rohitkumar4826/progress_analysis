import React, { useState } from "react";
import VideoPlayer from "./progress";

function App() {
  const [videoUrl, setVideoUrl] = useState("");

  const handleChange = (e) => {
    setVideoUrl(e.target.value);
  };

  return (
    <div className="App" style={{ padding: "20px", maxWidth: "800px", margin: "auto" }}>
      <input
        type="text"
        value={videoUrl}
        onChange={handleChange}
        placeholder="Enter YouTube or video URL"
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "20px",
          fontSize: "16px",
          borderRadius: "8px",
          border: "1px solid #ccc"
        }}
      />
      <VideoPlayer url={videoUrl} />
    </div>
  );
}

export default App;
