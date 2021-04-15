import React from 'react';
import Button from '@material-ui/core/Button';
import classnames from 'classnames';
import LinearProgress from '@material-ui/core/LinearProgress';
import { Link } from 'react-router-dom';

import PaiPassLogo from '../../assets/logo.png';
import styles from './videoAuthentication.module.scss';
import cameraStyles from 'common/components/camera/camera.module.scss';

const onTapVideo = () => {
  document.getElementById('player').play();
};

const Step2 = props => {
  const {
    video,
    words,
    loading,
    errorMessage,
    handleRecordAgain,
    handleVideoSubmit,
  } = props;

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
            <h2>Did you say:</h2>
            <div className={`text-center ${styles.words}`}>
              {words.map((word, i) => (
                <span key={word + i}>{word}</span>
              ))}
              <video
                id="player"
                src={video}
                className={`full-width ${styles.video} ${cameraStyles.video}`}
                onClick={onTapVideo}
                autoPlay
              />
              <div
                className={classnames('error-message', 'p-3', 'text-center', {
                  show: !!errorMessage,
                })}
              >
                <span>{errorMessage}</span>
              </div>
            </div>
            <div className="text-center mt-2">
              <Button
                className="d-block primary mb-2"
                size="large"
                fullWidth
                variant="contained"
                color="primary"
                onClick={handleVideoSubmit}
              >
                Submit
              </Button>
              <Button
                className="d-block primary mb-3"
                size="large"
                fullWidth
                variant="contained"
                color="primary"
                onClick={handleRecordAgain}
              >
                Record Again
              </Button>
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

export default Step2;
