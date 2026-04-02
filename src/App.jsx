import React, { useState, useEffect, useRef } from 'react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function App() {
  const [isListening, setIsListening] = useState(false);
  const [pastTranscripts, setPastTranscripts] = useState('');
  const [currentSessionTranscript, setCurrentSessionTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef(null);
  const isIntentionalStopRef = useRef(false);

  useEffect(() => {
    if (!SpeechRecognition) {
      alert('Your browser does not support Speech Recognition. Please use Chrome or Safari.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalForSession = '';
      let interim = '';

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
      if (event.error === 'not-allowed') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // Session ended, so commit the current session's final text to pastTranscripts
      setCurrentSessionTranscript((currentText) => {
        if (currentText) {
          setPastTranscripts((prev) => prev + currentText);
        }
        return ''; // Clear session transcript
      });

      if (isListening && !isIntentionalStopRef.current) {
        try {
          recognition.start();
        } catch (error) {
          console.error("Could not restart automatically.", error);
          setIsListening(false);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      isIntentionalStopRef.current = true;
      recognition.stop();
    };
  }, [isListening]); // Added isListening to dependency array because onend uses it directly

  useEffect(() => {
    if (!recognitionRef.current) return;

    if (isListening) {
      isIntentionalStopRef.current = false;
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.error("Could not start. May already be started.", e);
      }
    } else {
      isIntentionalStopRef.current = true;
      recognitionRef.current.stop();
    }
  }, [isListening]);

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
