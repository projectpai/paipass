import React, { Component } from 'react';

import Review from './review';
import { DataManager, Notification } from '../../common';

const DEFAULT_STATUS = 'UNSURE';
const EMPTY_REVIEW = {
  fetching: true,
  noVideo: true,
  urlVideo: undefined,
  uuid: undefined,
  gender: undefined,
  submissionDate: '',
  expectedSentence: '',
  birthDate: '',
  firstName: '',
  lastName: '',
  status: DEFAULT_STATUS,
  rejectReason: ''
};

class ReviewContainer extends Component {
  constructor(props) {
    super(props);

    this.state = {
      rotated: false,
      review: EMPTY_REVIEW
    };

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleRotate = this.handleRotate.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleReviewClose = this.handleReviewClose.bind(this);
  }

  componentDidMount() {
    const {
      match: { params }
    } = this.props;

    DataManager.instance.getReview([], params.id).then(review => {
      this.setState({
        review: { ...this.state.review, ...review }
      });
    });
  }

  handleRotate() {
    this.setState({ rotated: !this.state.rotated });
  }

  handleSubmit() {
    this.setState({ review: { ...this.state.review, fetching: true } }, () => {
      DataManager.instance
        .postReview(this.state.review)
        .then(success => {
          if (success instanceof Error) {
            Notification.showError(success.message);
            this.setState({
              review: { ...this.state.review, fetching: false }
            });
          } else if (success.hasOwnProperty('errors')) {
            Notification.showError(success.errors[0]);
            this.setState({
              review: { ...this.state.review, fetching: false }
            });
          } else {
            this.setState({
              review: { ...this.state.review, fetching: false }
            });
            Notification.showSuccess('Success');
          }
        })
        .catch(err => Notification.showError(`${err}`));
    });
  }

  handleInputChange(event) {
    this.setState({
      review: {
        ...this.state.review,
        [event.target.name]: event.target.value
      }
    });
  }

  handleReviewClose() {
    this.props.history.push(`/home/reviews/`);
  }

  componentWillReceiveProps({ match: { params } }) {
    if (!this.state.review.fetching && parseInt(params.id) !== this.state.review.uuid) {
      this.setState({ review: { ...this.state.review, fetching: true } }, () => {
        DataManager.instance.getReview([], params.id).then(review => {
          this.setState({
            review: { ...this.state.review, ...review }
          });
        });
      });
    }
  }

  render() {
    const { rotated, review } = this.state;

    return (
      <Review
        handleSubmit={this.handleSubmit}
        handleInputChange={this.handleInputChange}
        handleRotate={this.handleRotate}
        handleReviewClose={this.handleReviewClose}
        rotated={rotated}
        review={review}
      />
    );
  }
}

export default ReviewContainer;
export { Review };
