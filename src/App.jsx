import React, { useState, useEffect, useRef } from 'react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function App() {
  const [isListening, setIsListening] = useState(false);
  const [sessionKey, setSessionKey] = useState(0); 
  const [pastTranscripts, setPastTranscripts] = useState('');
  const [currentSessionTranscript, setCurrentSessionTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  
  const audioStreamRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!SpeechRecognition) {
      alert('Your browser does not support Speech Recognition. Please use Chrome or Safari.');
      return;
    }

    if (!isListening) {
       // Deep cleanup when user stops recording
       if (recognitionRef.current) {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
       }
       if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach(t => t.stop());
          audioStreamRef.current = null;
       }
       return;
    }

    let isEffectActive = true;

    const startSession = async () => {
      // Important: Android and iOS browsers exclusively lock the microphone!
      // If we attempt the `getUserMedia` hack on mobile, SpeechRecognition gets entirely blocked.
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

      if (!isMobile && !audioStreamRef.current) {
         try {
           audioStreamRef.current = await navigator.mediaDevices.getUserMedia({
             audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
           });
         } catch (e) {
           console.warn("Raw audio request failed", e);
         }
      }

      if (!isEffectActive) return;

      // Create a COMPLETELY FRESH SpeechRecognition instance.
      // This is the critical fix for the mobile browser bug where it caches memory 
      // of previous sentences across restarts and prints multiple lines for a single speech.
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let finalForSession = '';
        let interim = '';
        // Because the instance is fresh, iterating from 0 will ONLY fetch
        // text from the current active spoken sentence without duplicating history.
        for (let i = 0; i < event.results.length; i++) {
          const transcriptSegment = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalForSession += transcriptSegment + ' ';
          } else {
            interim += transcriptSegment;
          }
        }
        setCurrentSessionTranscript(finalForSession);
        setInterimTranscript(interim);
      };

      recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setIsListening(false);
          
          // Brave browser specific help message
          if (navigator.brave && navigator.brave.isBrave) {
             navigator.brave.isBrave().then(isBrave => {
                 if (isBrave) {
                     alert("Brave browser blocks Speech Recognition by default. Please go to Brave Settings -> Privacy and security -> Enable 'Use Google services for Push Messaging' to allow speech to text.");
                 }
             });
          }
        }
      };

      recognition.onend = () => {
        // When it ends (mobile does this after every sentence), commit safely.
        setCurrentSessionTranscript((currentText) => {
          if (currentText) {
            setPastTranscripts((prev) => prev + currentText);
          }
          return ''; // wipe session
        });

        if (isListening && isEffectActive) {
          // Incrementing sessionKey causes a React unmount/remount of this effect,
          // creating a brand new SpeechRecognition object and shedding the duplicate bug!
          setSessionKey(k => k + 1);
        }
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch (e) {
        console.error("recognition.start error", e);
      }
    };

    startSession();

    return () => {
      isEffectActive = false;
      if (recognitionRef.current) {
        recognitionRef.current.onend = null; // Prevent restart loops
        recognitionRef.current.stop();
      }
    };
  }, [isListening, sessionKey]);

  const toggleListening = () => {
    setIsListening((prev) => !prev);
  };

  const clearTranscript = () => {
    setPastTranscripts('');
    setCurrentSessionTranscript('');
    setInterimTranscript('');
  };

  const displayTranscript = pastTranscripts + currentSessionTranscript;

  return (
    <>
      <div className="main-container">
        <div className="container">
          <header>
            <h1>Voice Notes</h1>
            <p className="subtitle">Minimalist Speech to Text</p>
          </header>

          <main>
            <div className={`status-indicator ${isListening ? 'active' : ''}`}>
              <div className="pulsating-dot"></div>
              <span>{isListening ? 'Listening...' : 'Microphone Off'}</span>
            </div>

            <div className="controls">
              <button
                className={`btn-primary ${isListening ? 'recording' : ''}`}
                onClick={toggleListening}
              >
                {isListening ? 'Stop Recording' : 'Start Recording'}
              </button>

              <button className="btn-secondary" onClick={clearTranscript}>
                Clear
              </button>
            </div>

            <div className="transcript-box">
              {!displayTranscript && !interimTranscript && (
                <div className="placeholder-text">
                  Press "Start Recording" and begin speaking.<br />Your transcript will appear here...
                </div>
              )}
              <span className="final-transcript">{displayTranscript}</span>
              <span className="interim-transcript">{interimTranscript}</span>
            </div>
          </main>

          <footer className="footer-credit">
            made with ❤️ by <a href="https://chaitanyalonarkar.netlify.app/" target="_blank" rel="noopener noreferrer">Chaitanya Lonarkar</a>
          </footer>
        </div>
      </div>
    </>
  );
}

export default App;
