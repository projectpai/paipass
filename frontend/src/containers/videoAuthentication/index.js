import React from 'react';
import { connect } from 'react-redux';
import Step1 from './step-1.template';
import Step2 from './step-2.template';
import { actionUpdateUser, actionUpdateUserError } from 'store/User';
const STEP = {
  FIRST: 'first',
  SECOND: 'second',
};
const actions = { actionUpdateUser, actionUpdateUserError };
class VideoAuthentication extends React.Component {
  mediaRecorder = undefined;
  camera = undefined;
  stream = undefined;
  recordedChunks = [];

  constructor(props) {
    super(props);
    this.state = {
      step: STEP.FIRST,
      errorMessage: undefined,
      loading: false,
      video: undefined,
      isRecording: false,
    };

    this.handleCamera = this.handleCamera.bind(this);
    this.handleUserMedia = this.handleUserMedia.bind(this);
    this.handleUserMediaError = this.handleUserMediaError.bind(this);
    this.handleStartRecording = this.handleStartRecording.bind(this);
    this.handleStopRecording = this.handleStopRecording.bind(this);
    this.handleRecordAgain = this.handleRecordAgain.bind(this);
    this.handleVideoSubmit = this.handleVideoSubmit.bind(this);
  }

  handleCamera(event) {
    this.camera = event;
  }

  handleStartRecording() {
    if (this.mediaRecorder) {
      this.setState({ isRecording: true });
      this.mediaRecorder.start();
    }
  }

  handleStopRecording() {
    if (this.mediaRecorder && this.state.isRecording) {
      this.mediaRecorder.stop();
    }
  }

  handleRecordAgain() {
    this.mediaRecorder = undefined;
    this.recordedChunks = [];
    this.camera = undefined;
    this.stream = undefined;
    this.setState({ step: STEP.FIRST, isRecording: false });
  }

  handleUserMedia() {
    if (this.camera) {
      const stream = this.camera.stream;
      const options = { mimeType: 'video/webm' };
      this.recordedChunks = [];

      this.mediaRecorder = new MediaRecorder(stream, options);
      this.mediaRecorder.onstop = video => {
        const tracks = stream.getTracks();
        tracks.forEach(function(track) {
          track.stop();
        });
        video.srcObject = null;
        this.setState({
          step: STEP.SECOND,
          video: URL.createObjectURL(new Blob(this.recordedChunks)),
        });
      };

      this.mediaRecorder.ondataavailable = e => {
        this.recordedChunks.push(e.data);
      };
    }
  }

  handleUserMediaError() {
    this.setState({
      errorMessage: `PAI Pass was not able to access your web camera. Please verify that you have a camera connected, 
         are using an up-to-date version of a supported browser (Chrome, Firefox, or Safari), 
         and have granted PAI Pass permission to access your camera and microphone.`,
    });
  }

  handleVideoSubmit() {
    this.setState({ loading: true, errorMessage: undefined });
    try {
      this.props.accountService
        .videoSetup({
          requestId: this.props.VideoAuthentication.requestId,
          video: new Blob(this.recordedChunks),
        })
        .then(response => {
          if (response instanceof Error) {
            this.setState({
              errorMessage: response.message,
              loading: false,
            });
          } else if (response) {
            this.setState({ errorMessage: undefined, loading: false });
            this.props.accountService.profile().then(profile => {
              if (profile.hasOwnProperty('email')) {
                this.props.actionUpdateUser(profile);
                this.props.history.push('/auth-complete');
              } else {
                this.props.actionUpdateUserError();
              }
            });
          } else {
            this.setState({
              errorMessage: 'unexpected error occurred.',
              loading: false,
            });
          }
        });
    } catch (err) {
      this.setState({
        errorMessage: 'unexpected error occurred.',
        loading: false,
      });
    }
  }

  render() {
    const { words = [] } = this.props.VideoAuthentication;

    if (!words.length) {
      this.props.history.push('/dashboard');
    }

    switch (this.state.step) {
      case STEP.FIRST:
        return (
          <Step1
            {...this.state}
            words={words}
            handleCamera={this.handleCamera}
            handleUserMedia={this.handleUserMedia}
            handleUserMediaError={this.handleUserMediaError}
            handleStartRecording={this.handleStartRecording}
            handleStopRecording={this.handleStopRecording}
          />
        );
      case STEP.SECOND:
        return (
          <Step2
            {...this.state}
            words={words}
            handleRecordAgain={this.handleRecordAgain}
            handleVideoSubmit={this.handleVideoSubmit}
          />
        );
      default:
        return (
          <Step1
            {...this.state}
            handleStartRecording={this.handleStartRecording}
          />
        );
    }
  }
}

const mapStateToProps = ({ User, VideoAuthentication }) => ({
  User,
  VideoAuthentication,
});

export default connect(
  mapStateToProps,
  actions,
)(VideoAuthentication);
