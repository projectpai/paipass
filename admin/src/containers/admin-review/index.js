import React, { Component } from 'react';

import AdminReview from './admin-review';
import { DataManager, Notification } from '../../common';

const EMPTY_REVIEW = {
  fetching: true,
  uuid: undefined,
  email: '',
  phone: '',
  firstName: '',
  lastName: '',
};

class AdminReviewContainer extends Component {
  constructor(props) {
    super(props);

    this.state = {
      review: EMPTY_REVIEW
    };

    this.handleInputChange = this.handleInputChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleReviewClose = this.handleReviewClose.bind(this);
  }

  componentDidMount() {
    const {
      match: { params }
    } = this.props;

    DataManager.instance.getAccountInfo(params.id).then(review => {
      this.setState({
        review: { ...this.state.review, ...review }
      });
    }).catch(err => Notification.showError(`${err}`));
  }
  componentWillReceiveProps({ match: { params } }) {
    if (!this.state.review.fetching && parseInt(params.id) !== this.state.review.uuid) {
      this.setState({ review: { ...this.state.review, fetching: true } }, () => {
        DataManager.instance.getAccountInfo(params.id).then(review => {
          this.setState({
            review: { ...this.state.review, ...review }
          });
        });
      });
    }
  }
  handleSubmit() {
    this.setState({ review: { ...this.state.review, fetching: true } }, () => {
      DataManager.instance
        .postAdminAccountChange(this.state.review)
        .then(success => {
          if (success instanceof Error) {
            Notification.showError(success.message);
            this.setState({
              review: { ...this.state.review, fetching: false }
            });
          } else if (success.hasOwnProperty('errors')) {
            Notification.showError( ...success.errors );
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
        .catch(err => Notification.showError(` Admin review error ${err}`));
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
    this.props.history.push(`/home/users/`);
  }



  render() {
    const { rotated, review } = this.state;

    return (
      <AdminReview
        handleSubmit={this.handleSubmit}
        handleInputChange={this.handleInputChange}
        handleReviewClose={this.handleReviewClose}
        review={review}
      />
    );
  }
}

export default AdminReviewContainer;
export { AdminReview };
