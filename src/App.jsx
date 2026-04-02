import React, { useState, useEffect, useRef } from 'react';

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function App() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const recognitionRef = useRef(null);
  const isIntentionalStopRef = useRef(false);

  useEffect(() => {
    if (!SpeechRecognition) {
      alert('Your browser does not support Speech Recognition. Please use Chrome or Safari.');
      return;
    }
    
    // We recreate the recognition instance only once
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let final = '';
      let interim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptSegment = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcriptSegment + ' ';
        } else {
          interim += transcriptSegment;
        }
      }

      if (final) {
        setTranscript((prev) => prev + final);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setIsListening(false);
      }
    };

    recognition.onend = () => {
      // If we are still supposed to be listening and it ends unexpectedly, restart.
      // Browsers often stop it after a certain period of silence.
      if (isListening && !isIntentionalStopRef.current) {
        try {
          recognition.start();
        } catch (error) {
          console.error("Could not restart automatically. User might need to restart.", error);
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
  }, []);

  // Sync listening state with recognition api
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
    setTranscript('');
    setInterimTranscript('');
  };

  return (
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
          {!transcript && !interimTranscript && (
            <div className="placeholder-text">
              Press "Start Recording" and begin speaking.<br/>Your transcript will appear here...
            </div>
          )}
          <span className="final-transcript">{transcript}</span>
          <span className="interim-transcript">{interimTranscript}</span>
        </div>
      </main>
    </div>
  );
}

export default App;
