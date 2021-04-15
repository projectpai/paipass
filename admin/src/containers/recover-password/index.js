import React, { Component } from 'react';

import RecoverPassword from './recover-password';
import { DataManager } from '../../common';

class RecoverPasswordContainer extends Component {
    constructor(props) {
        super(props);

        this.state = { processing: false };

        this.handleSubmit = this.handleSubmit.bind(this);
    }

    componentWillReceiveProps(nextProps) {
        this.setState({ processing: nextProps.processing });
    }

    handleSubmit(event) {
        event.preventDefault();
        this.setState({ processing: true });
        DataManager.instance.resetPassword(event.target.elements.email.value)
            .then(response => { this.setState({ processing: false }); })
            .then(() => { this.props.history.push('/login'); })
            .catch(response => { this.setState({ processing: false }); });
    }

    render() {
        return (
            <RecoverPassword 
                handleSubmit={this.handleSubmit}
                {...this.state}
            />
        )
    }
}

export default RecoverPasswordContainer;
