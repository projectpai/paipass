import React, { Component } from 'react';
import { Button } from '@blueprintjs/core';

const CONFIRM_STATUS = {
    LEVEL_0: 0,
    LEVEL_1: 1,
    LEVEL_2: 2,
};

const DEFAULT_BUTTON_TEXT = [ 'Submit', 'Wait...', 'Confirm' ];

class FormConfirm extends Component {
    constructor(props) {
        super(props)

        this.state = { status: CONFIRM_STATUS.LEVEL_0 };

        this.handleConfirm = this.handleConfirm.bind(this);
    }

    handleConfirm(e) {
        e.preventDefault();
        this.props.onSubmit(e);
    }

    setWaitingForConfirm() {        
        this.confirmWaitingTimeout = setTimeout(() => {
            this.setState({ status: CONFIRM_STATUS.LEVEL_2 });
        }, 1000);
    }

    componentWillUnmount() {
        clearTimeout(this.confirmWaitingTimeout);
    }

    render() {
        const { submit = {}, children, className } = this.props;
        const { status } =  this.state;
        
        const submitTextStatus = submit.loading ? CONFIRM_STATUS.LEVEL_1 : status;
        const submitText = submit.text ? submit.text[submitTextStatus] : DEFAULT_BUTTON_TEXT[submitTextStatus];

        return (
            <form className={className} onSubmit={this.handleConfirm}>
                {children}

                <div>
                    <Button
                        className={submit.className}
                        type="submit"
                        intent={status === CONFIRM_STATUS.LEVEL_1 ? 'warning' : submit.intent }
                        loading={submit.loading}
                        text={submitText}
                    />
                </div>
            </form>
        );
    }
}

export default FormConfirm;
