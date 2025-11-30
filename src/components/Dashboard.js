import React, { useState, useRef } from "react";
import Meyda from "meyda";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import Sidebar from "./Sidebar";
import "./Dashboard.css";

function Dashboard() {
  const navigate = useNavigate();

  // --- Sidebar state and toggle function ---
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  // --- Chord detection hooks ---
  const [listening, setListening] = useState(false); // is microphone active
  const [chordText, setChordText] = useState("🎸 Waiting..."); // currently displayed chord
  const [detectedChords, setDetectedChords] = useState([]); // array of detected chords with timestamps

  // --- References to persist mutable values across renders ---
  const audioContextRef = useRef(null);  // Web Audio API context
  const sourceRef = useRef(null);        // microphone audio source
  const meydaAnalyzerRef = useRef(null); // Meyda audio feature analyzer
  const startTimeRef = useRef(null);     // audio context start time
  const stableCandidateRef = useRef(null); // currently stable chord candidate
  const lastAcceptedRef = useRef(null);     // last chord officially displayed
  const CHROMA_FRAMES_REF = useRef([]);     // buffer of last chroma feature frames

  // --- Constants for chord detection ---
  const RMS_THRESHOLD = 0.005; // ignore very quiet frames
  const MAX_FRAMES = 15;       // buffer size for averaging chroma
  const STABLE_REQUIRED = 5;   // how many consistent frames to confirm chord
  const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  const TRIADS = { major: [0, 4, 7], minor: [0, 3, 7] };

  // --- Build chord templates for all roots and qualities ---
  const CHORD_TEMPLATES = [];
  (function buildTemplates() {
    for (let root = 0; root < 12; root++) {
      for (const quality of ["major", "minor"]) {
        const base = TRIADS[quality];
        const vec = new Array(12).fill(0);
        // Mark which notes are present in this chord template
        for (const interval of base) vec[(root + interval) % 12] = 1;
        const name = `${NOTE_NAMES[root]} ${quality === "major" ? "Major" : "Minor"}`;
        CHORD_TEMPLATES.push({ name, vec });
      }
    }
  })();

  // --- Utility functions ---

  // Normalize a 12-element chroma vector
  function normalize(v) {
    const sumSq = v.reduce((s, x) => s + x * x, 0); // sum of squares
    if (sumSq === 0) return v.slice();             // avoid division by zero
    const norm = Math.sqrt(sumSq);                // Euclidean norm
    return v.map((x) => x / norm);                // normalize vector
  }

  // Cosine similarity between two vectors
  function cosine(a, b) {
    let dot = 0;
    for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
    const norma = Math.sqrt(a.reduce((s, x) => s + x * x, 0));
    const normb = Math.sqrt(b.reduce((s, x) => s + x * x, 0));
    if (norma === 0 || normb === 0) return 0;
    return dot / (norma * normb);
  }

  // Compute average chroma vector over the buffer
  function averageChroma() {
    const frames = CHROMA_FRAMES_REF.current;
    if (frames.length === 0) return null;
    const avg = new Array(12).fill(0);
    for (const frame of frames) {
      for (let i = 0; i < 12; i++) avg[i] += frame[i];
    }
    for (let i = 0; i < 12; i++) avg[i] /= frames.length;
    return avg;
  }

  // Match the averaged chroma to the best chord template
  function detectChordFromAvgChroma(avgChroma) {
    if (!avgChroma) return null;
    const normChroma = normalize(avgChroma);
    let best = { name: null, score: 0 };
    for (const t of CHORD_TEMPLATES) {
      const tpl = normalize(t.vec);
      const score = cosine(normChroma, tpl); // similarity score
      if (score > best.score) best = { name: t.name, score };
    }
    // Only accept chords above a similarity threshold
    return best.score >= 0.45 ? best : null;
  }

  // Return elapsed time since listening started
  function getElapsedTime() {
    return ((audioContextRef.current.currentTime - startTimeRef.current) || 0).toFixed(1);
  }

  // --- Main microphone and chord detection logic ---
  const toggleListening = async () => {
    if (!listening) {
      // --- Start listening ---
      setListening(true);
      CHROMA_FRAMES_REF.current = [];
      stableCandidateRef.current = null;
      lastAcceptedRef.current = null;
      setChordText("🎧 Listening...");

      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      startTimeRef.current = audioContextRef.current.currentTime;

      try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);

        // Initialize Meyda analyzer
        meydaAnalyzerRef.current = Meyda.createMeydaAnalyzer({
          audioContext: audioContextRef.current,
          source: sourceRef.current,
          bufferSize: 4096,
          featureExtractors: ["chroma", "rms"],
          callback: (features) => {
            const { chroma, rms } = features;

            // Ignore quiet frames
            if (typeof rms === "number" && rms < RMS_THRESHOLD) {
              stableCandidateRef.current = null;
              return; // do not overwrite last chord
            }

            if (!chroma) return;

            // Maintain chroma buffer
            CHROMA_FRAMES_REF.current.push(chroma.slice());
            if (CHROMA_FRAMES_REF.current.length > MAX_FRAMES)
              CHROMA_FRAMES_REF.current.shift();

            // Compute average chroma
            const avg = averageChroma();
            if (!avg) return;

            // Detect best matching chord
            const best = detectChordFromAvgChroma(avg);
            const timestamp = getElapsedTime();

            if (best) {
              // Initialize new stable candidate or increment count
              if (!stableCandidateRef.current || stableCandidateRef.current.name !== best.name) {
                stableCandidateRef.current = { name: best.name, score: best.score, count: 1 };
              } else {
                stableCandidateRef.current.count++;
                // Commit chord once it has appeared consistently
                if (
                  stableCandidateRef.current.count >= STABLE_REQUIRED &&
                  (!lastAcceptedRef.current ||
                    lastAcceptedRef.current.name !== stableCandidateRef.current.name ||
                    timestamp - lastAcceptedRef.current.time > 1.5)
                ) {
                  setDetectedChords((p) => [...p, { chord: best.name, time: timestamp }]);
                  lastAcceptedRef.current = { name: best.name, time: timestamp };
                  setChordText(`🎸 ${best.name}`);
                } else {
                  setChordText(`🎸 ...${best.name}`);
                }
              }
            } else {
              stableCandidateRef.current = null;
              setChordText("🎧 Listening...");
            }
          },
        });

        meydaAnalyzerRef.current.start();
      } catch (err) {
        console.error("Microphone access denied:", err);
        setChordText("Microphone access required");
        setListening(false);
      }
    } else {
      // --- Stop listening ---
      setListening(false);
      setChordText("🎸 Stopped.");
      if (meydaAnalyzerRef.current) meydaAnalyzerRef.current.stop();
    }
  };

  // --- Logout handler ---
  const handleLogout = () => {
    toast.info("Logged out!");
    navigate("/login");
  };

  // --- JSX Rendering ---
  return (
    <div className="dashboard-container">

      {/* Sidebar component */}
      <Sidebar isOpen={isSidebarOpen} toggleSidebar={toggleSidebar} />

      {/* Menu button (hidden when sidebar open) */}
      {!isSidebarOpen && (
        <button className="sidebar-toggle-btn" onClick={toggleSidebar}>☰</button>
      )}

      {/* Logout button */}
      <button className="logout-button" onClick={handleLogout}>Logout</button>

      {/* Welcome text */}
      <h2 style={{ marginTop: "0", paddingTop: "60px" }}>
        Welcome to the Chord Analyser!
      </h2>

      <div className="container" style={{ marginTop: "2rem" }}>
        <div className="circle">
          {/* Button to start/stop chord detection */}
          <button onClick={toggleListening}>
            {listening ? "Stop Listening" : "Start Listening"}
          </button>
        </div>

        {/* Display the current chord or listening status */}
        <div id="chordDisplay" style={{ marginTop: "1rem", fontSize: "1.5rem", color: "#58a6ff" }}>
          {chordText}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
