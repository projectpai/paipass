import React from 'react';
import Button from '@material-ui/core/Button';
import classnames from 'classnames';
import LinearProgress from '@material-ui/core/LinearProgress';
import { Link } from 'react-router-dom';

import PaiPassLogo from '../../assets/logo.png';
import { Camera } from '../../common';
import styles from './videoAuthentication.module.scss';

const videoConstraints = {
  width: 640,
  height: 480,
  facingMode: 'user',
};

const Step1 = props => {
  const {
    words,
    loading,
    isRecording,
    errorMessage,
    handleCamera,
    handleUserMedia,
    handleUserMediaError,
    handleStartRecording,
    handleStopRecording,
  } = props;

  if (words && words.lenght) {
    return (
      <div className="error-message p-3 text-center show">
        <span>Session expired!</span>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <LinearProgress className="loading" hidden={!loading} />
      <div className="row justify-content-center align-items-center">
        <div className="col-xl-4 col-sm-8">
          <img
            className="paipass-logo d-block"
            src={PaiPassLogo}
            alt="PaiPass Logo"
          />
          <div className="container-fluid">
            {isRecording ? (
              <>
                <h2>Repeat the following words:</h2>
                <div className={`text-center ${styles.words}`}>
                  {words.map((word, i) => (
                    <span key={word + i}>{word}</span>
                  ))}
                </div>
              </>
            ) : (
              <h2>Press the Record Button and Hold Up Your ID to Camera</h2>
            )}

            <Camera
              width="100%"
              height="100%"
              audio={true}
              videoConstraints={videoConstraints}
              ref={handleCamera}
              onUserMedia={handleUserMedia}
              onUserMediaError={handleUserMediaError}
              className={styles.video}
            />

            <div
              className={classnames('error-message', 'p-3', 'text-center', {
                show: !!errorMessage,
              })}
            >
              <span>{errorMessage}</span>
            </div>

            <div className="text-center mt-2">
              {isRecording ? (
                <Button
                  className="d-block primary mb-3"
                  size="large"
                  fullWidth
                  variant="contained"
                  color="primary"
                  onClick={handleStopRecording}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  className="d-block primary mb-3"
                  size="large"
                  fullWidth
                  variant="contained"
                  color="primary"
                  disabled={!!errorMessage}
                  onClick={handleStartRecording}
                >
                  Record
                </Button>
              )}

              <Link className="log-in" to="/dashboard">
                Cancel Authentication
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Step1;
